import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Path, Svg } from 'react-native-svg';
import { useCart } from '../../lib/cart';
import { colors, fonts } from '../../theme';

const icon = (d: string) =>
	function TabIcon({ color }: { color: ColorValue }) {
		return (
			<Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color as string} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round">
				<Path d={d} />
			</Svg>
		);
	};

const ShopIcon = icon('M8 4 L4 6 L2 11 L5 12 L5 20 L19 20 L19 12 L22 11 L20 6 L16 4 Q12 7 8 4 Z');
const CartIcon = icon('M5 8h14l-1.2 11.1a1 1 0 0 1-1 .9H7.2a1 1 0 0 1-1-.9L5 8Z M9 8V7a3 3 0 0 1 6 0v1');
const OrdersIcon = icon('M7 3h10a1 1 0 0 1 1 1v17l-3-2-3 2-3-2-3 2V4a1 1 0 0 1 1-1Z M9 8h6 M9 12h6');
const AccountIcon = icon('M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z M4 21a8 8 0 0 1 16 0');

export default function TabsLayout() {
	const { itemCount } = useCart();
	// Edge-to-edge: the bar has a fixed height, so add the system navigation bar's inset to it.
	const { bottom } = useSafeAreaInsets();
	return (
		<Tabs
			screenOptions={{
				headerShown: false,
				tabBarActiveTintColor: colors.indigo,
				tabBarInactiveTintColor: colors.slate,
				tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.mist, height: 64 + bottom, paddingTop: 6, paddingBottom: bottom },
				tabBarLabelStyle: { fontFamily: fonts.body, fontWeight: '600', fontSize: 12 },
				tabBarBadgeStyle: { backgroundColor: colors.marigold, color: colors.ink, fontFamily: fonts.mono, fontWeight: '700' }
			}}
		>
			<Tabs.Screen name="index" options={{ title: 'Shop', tabBarIcon: ShopIcon }} />
			<Tabs.Screen
				name="cart"
				options={{ title: 'Cart', tabBarIcon: CartIcon, tabBarBadge: itemCount > 0 ? itemCount : undefined }}
			/>
			<Tabs.Screen name="orders" options={{ title: 'Orders', tabBarIcon: OrdersIcon }} />
			<Tabs.Screen name="account" options={{ title: 'Account', tabBarIcon: AccountIcon }} />
		</Tabs>
	);
}
