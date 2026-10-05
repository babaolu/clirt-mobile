import { useCallback, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge, Button, Card, ErrorState, Skeleton, Spec } from '../../components/ui';
import { ApiError, api } from '../../lib/api';
import { EMAIL_STATUS, ORDER_STATUS, formatOrderDate } from '../../lib/orders';
import type { OrderSummary } from '../../lib/types';
import { formatNaira } from '../../shared/money';
import { colors, fonts } from '../../theme';

export default function Orders() {
	const [orders, setOrders] = useState<OrderSummary[] | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [pulling, setPulling] = useState(false);
	const latest = useRef(0);

	const load = useCallback(async () => {
		const ticket = ++latest.current;
		try {
			const res = await api<{ orders: OrderSummary[] }>('/api/v1/orders');
			if (ticket !== latest.current) return;
			setOrders(res.orders);
			setError(null);
		} catch (err) {
			if (ticket !== latest.current || (err instanceof ApiError && err.status === 401)) return;
			setError(err instanceof Error ? err.message : 'Could not load your orders.');
		}
	}, []);

	// Refetch whenever the tab gains focus (e.g. after placing an order).
	useFocusEffect(
		useCallback(() => {
			load();
		}, [load])
	);

	return (
		<SafeAreaView style={s.screen} edges={['top']}>
			<FlatList
				data={orders ?? []}
				keyExtractor={(o) => o.id}
				contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1 }}
				refreshControl={
					<RefreshControl
						refreshing={pulling}
						colors={[colors.indigo]}
						onRefresh={async () => {
							setPulling(true);
							await load();
							setPulling(false);
						}}
					/>
				}
				ListHeaderComponent={
					<View style={{ gap: 12 }}>
						<Text style={s.title}>Your orders</Text>
						{orders && error && <Text style={s.inlineError}>{error}</Text>}
					</View>
				}
				ListEmptyComponent={
					!orders && error ? (
						<ErrorState message={error} onRetry={load} />
					) : !orders ? (
						<ListSkeleton />
					) : (
						<Card style={{ gap: 14, alignItems: 'flex-start' }}>
							<Text style={s.emptyTitle}>No orders yet</Text>
							<Text style={s.muted}>Design a tee and check out. Your orders from the website show up here too.</Text>
							<Button title="Start designing" onPress={() => router.navigate('/')} />
						</Card>
					)
				}
				renderItem={({ item }) => (
					<Pressable
						accessibilityRole="button"
						accessibilityLabel={`Order ${item.number}, ${formatNaira(item.totalKobo)}`}
						onPress={() => router.push({ pathname: '/orders/[id]', params: { id: item.id } })}
						style={({ pressed }) => [s.card, pressed && { borderColor: colors.indigoSoft }]}
					>
						<View style={s.row}>
							<Text style={s.number}>#{item.number}</Text>
							<Text style={s.total}>{formatNaira(item.totalKobo)}</Text>
						</View>
						<View style={s.row}>
							<Text style={s.muted}>{formatOrderDate(item.createdAt)}</Text>
							<Spec>
								{item.itemCount} {item.itemCount === 1 ? 'item' : 'items'}
							</Spec>
						</View>
						<View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
							<Badge label={ORDER_STATUS[item.status].label} tone={ORDER_STATUS[item.status].tone} />
							<Badge label={EMAIL_STATUS[item.emailStatus].label} tone={EMAIL_STATUS[item.emailStatus].tone} />
						</View>
					</Pressable>
				)}
			/>
		</SafeAreaView>
	);
}

function ListSkeleton() {
	return (
		<View style={{ gap: 12 }}>
			{[0, 1, 2].map((i) => (
				<View key={i} style={[s.card, { gap: 10 }]}>
					<View style={s.row}>
						<Skeleton style={{ width: 110, height: 20 }} />
						<Skeleton style={{ width: 80, height: 20 }} />
					</View>
					<Skeleton style={{ width: 170, height: 14 }} />
					<View style={{ flexDirection: 'row', gap: 8 }}>
						<Skeleton style={{ width: 70, height: 22, borderRadius: 999 }} />
						<Skeleton style={{ width: 90, height: 22, borderRadius: 999 }} />
					</View>
				</View>
			))}
		</View>
	);
}

const s = StyleSheet.create({
	screen: { flex: 1, backgroundColor: colors.paper },
	title: { fontFamily: fonts.display, fontWeight: '800', fontSize: 30, color: colors.indigo, marginBottom: 4 },
	card: { backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.mist, padding: 16, gap: 6 },
	row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
	number: { fontFamily: fonts.mono, fontWeight: '700', fontSize: 17, color: colors.indigo },
	total: { fontFamily: fonts.body, fontWeight: '600', fontSize: 16, color: colors.ink },
	muted: { fontFamily: fonts.body, fontSize: 14, color: colors.slate },
	emptyTitle: { fontFamily: fonts.display, fontWeight: '800', fontSize: 18, color: colors.indigo },
	inlineError: { fontFamily: fonts.body, fontSize: 14, color: colors.alert }
});
