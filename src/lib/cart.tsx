import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import Pusher from 'pusher-js/react-native';
import { API_BASE, PUSHER_CLUSTER, PUSHER_KEY } from '../config';
import { api } from './api';
import { authClient } from './auth';
import type { Cart, CartItem } from './types';

type AddInput = { styleSlug: string; size: string; quantity: number; customization: unknown };

type CartState = {
	cart: Cart | null;
	/** Shown in the tab badge; updated instantly from live events, then from the refetched cart. */
	itemCount: number;
	loading: boolean;
	error: string | null;
	refresh: () => Promise<void>;
	add: (input: AddInput) => Promise<CartItem | null>;
	setQuantity: (id: number, quantity: number) => Promise<void>;
	remove: (id: number) => Promise<void>;
};

const CartContext = createContext<CartState | null>(null);

/**
 * Cart state for the signed-in user, kept in sync live:
 * - subscribes to Pusher "private-user-<id>" and refetches on "cart-updated"
 * - refetches when the app returns to the foreground (and screens refetch on focus)
 * - unsubscribes when the user signs out (userId becomes null)
 */
export function CartProvider({ userId, children }: { userId: string | null; children: ReactNode }) {
	const [cart, setCart] = useState<Cart | null>(null);
	const [itemCount, setItemCount] = useState(0);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const latest = useRef(0);

	const apply = useCallback((next: Cart) => {
		setCart(next);
		setItemCount(next.itemCount);
	}, []);

	const refresh = useCallback(async () => {
		if (!userId) return;
		const ticket = ++latest.current;
		setLoading(true);
		try {
			const next = await api<Cart>('/api/v1/cart');
			if (ticket === latest.current) {
				apply(next);
				setError(null);
			}
		} catch (err) {
			if (ticket === latest.current) setError(err instanceof Error ? err.message : 'Could not load your cart.');
		} finally {
			if (ticket === latest.current) setLoading(false);
		}
	}, [userId, apply]);

	useEffect(() => {
		if (!userId) {
			setCart(null);
			setItemCount(0);
			return;
		}
		refresh();

		const pusher = new Pusher(PUSHER_KEY, {
			cluster: PUSHER_CLUSTER,
			channelAuthorization: {
				endpoint: `${API_BASE}/api/v1/realtime/auth`,
				transport: 'ajax',
				// Form-encoded socket_id + channel_name with the session cookie (no Origin header on native).
				customHandler: async ({ socketId, channelName }, callback) => {
					try {
						const cookie = await authClient.getCookie();
						const res = await fetch(`${API_BASE}/api/v1/realtime/auth`, {
							method: 'POST',
							headers: {
								'Content-Type': 'application/x-www-form-urlencoded',
								Accept: 'application/json',
								...(cookie ? { Cookie: cookie } : {})
							},
							body: `socket_id=${encodeURIComponent(socketId)}&channel_name=${encodeURIComponent(channelName)}`,
							credentials: 'omit'
						});
						if (!res.ok) throw new Error(`realtime auth failed (${res.status})`);
						callback(null, await res.json());
					} catch (err) {
						callback(err instanceof Error ? err : new Error(String(err)), null);
					}
				}
			}
		});
		const channelName = `private-user-${userId}`;
		const channel = pusher.subscribe(channelName);
		channel.bind('cart-updated', (event: { itemCount?: number }) => {
			if (typeof event?.itemCount === 'number') setItemCount(event.itemCount);
			refresh();
		});

		const appState = AppState.addEventListener('change', (state) => {
			if (state === 'active') refresh();
		});

		return () => {
			appState.remove();
			channel.unbind_all();
			pusher.unsubscribe(channelName);
			pusher.disconnect();
		};
	}, [userId, refresh]);

	const add = useCallback(
		async (input: AddInput) => {
			const res = await api<{ item: CartItem | null; cart: Cart }>('/api/v1/cart/items', { method: 'POST', body: input });
			apply(res.cart);
			return res.item;
		},
		[apply]
	);

	const setQuantity = useCallback(
		async (id: number, quantity: number) => {
			const res = await api<{ cart: Cart }>(`/api/v1/cart/items/${id}`, { method: 'PATCH', body: { quantity } });
			apply(res.cart);
		},
		[apply]
	);

	const remove = useCallback(
		async (id: number) => {
			const res = await api<{ cart: Cart }>(`/api/v1/cart/items/${id}`, { method: 'DELETE' });
			apply(res.cart);
		},
		[apply]
	);

	return (
		<CartContext.Provider value={{ cart, itemCount, loading, error, refresh, add, setQuantity, remove }}>
			{children}
		</CartContext.Provider>
	);
}

export function useCart() {
	const ctx = useContext(CartContext);
	if (!ctx) throw new Error('useCart must be used inside CartProvider');
	return ctx;
}
