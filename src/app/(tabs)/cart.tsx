import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Spec } from '../../components/ui';
import { ApiError } from '../../lib/api';
import { useCart } from '../../lib/cart';
import { ShirtSvg } from '../../lib/svg';
import { shirtColorName } from '../../shared/customization';
import { formatNaira } from '../../shared/money';
import { colors, fonts } from '../../theme';

export default function CartScreen() {
	const { cart, loading, error, refresh, setQuantity, remove } = useCart();
	const [busyId, setBusyId] = useState<number | null>(null);
	const [pulling, setPulling] = useState(false);

	// Refetch whenever the Cart tab gains focus.
	useFocusEffect(
		useCallback(() => {
			refresh();
		}, [refresh])
	);

	async function run(id: number, action: () => Promise<void>) {
		setBusyId(id);
		try {
			await action();
		} catch (err) {
			if (!(err instanceof ApiError && err.status === 401)) {
				Alert.alert('Cart not updated', err instanceof Error ? err.message : 'Please try again.');
			}
			refresh();
		} finally {
			setBusyId(null);
		}
	}

	const items = cart?.items ?? [];

	return (
		<SafeAreaView style={s.screen} edges={['top']}>
			<FlatList
				data={items}
				keyExtractor={(item) => String(item.id)}
				contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1 }}
				refreshControl={
					<RefreshControl
						refreshing={pulling}
						colors={[colors.indigo]}
						onRefresh={async () => {
							setPulling(true);
							await refresh();
							setPulling(false);
						}}
					/>
				}
				ListHeaderComponent={<Text style={s.title}>Your cart</Text>}
				ListEmptyComponent={
					cart || error ? (
						<Card style={{ gap: 14, alignItems: 'flex-start' }}>
							<Text style={s.muted}>{error ?? 'Your cart is empty.'}</Text>
							<Button title={error ? 'Try again' : 'Start designing'} onPress={() => (error ? refresh() : router.navigate('/'))} />
						</Card>
					) : loading ? (
						<Text style={s.muted}>Loading your cart…</Text>
					) : null
				}
				renderItem={({ item }) => {
					const busy = busyId === item.id;
					return (
						<Card style={[s.row, busy && { opacity: 0.6 }]}>
							<View style={s.thumb}>
								<ShirtSvg svg={item.previewSvg} width={84} />
							</View>
							<View style={{ flex: 1, gap: 3 }}>
								<View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
									<Text style={s.name} numberOfLines={2}>
										{item.styleName}
									</Text>
									<Text style={s.line}>{formatNaira(item.lineTotalKobo)}</Text>
								</View>
								<Spec>
									{shirtColorName(item.customization.shirtColor)} · Size {item.size}
								</Spec>
								<Text style={s.muted} numberOfLines={1}>
									{item.designSummary}
								</Text>
								<Text style={s.muted}>{formatNaira(item.unitPriceKobo)} each</Text>
								{item.problem && <Text style={s.problem}>{item.problem} Remove it to check out.</Text>}
								<View style={s.controls}>
									<Stepper
										value={item.quantity}
										disabled={busy}
										onChange={(q) => run(item.id, () => setQuantity(item.id, q))}
									/>
									<Pressable accessibilityRole="button" disabled={busy} onPress={() => run(item.id, () => remove(item.id))} hitSlop={8}>
										<Text style={s.remove}>Remove</Text>
									</Pressable>
								</View>
							</View>
						</Card>
					);
				}}
				ListFooterComponent={
					items.length > 0 ? (
						<Card style={{ gap: 8 }}>
							<View style={s.totalRow}>
								<Text style={s.muted}>Items</Text>
								<Text style={s.bodyBold}>{cart?.itemCount}</Text>
							</View>
							<View style={s.totalRow}>
								<Text style={s.muted}>Delivery</Text>
								<Text style={s.bodyBold}>Free</Text>
							</View>
							<View style={[s.totalRow, { borderTopWidth: 1, borderTopColor: colors.mist, paddingTop: 10 }]}>
								<Text style={s.totalLabel}>Subtotal</Text>
								<Text style={s.totalLabel}>{formatNaira(cart?.subtotalKobo ?? 0)}</Text>
							</View>
							<Text style={[s.muted, { fontSize: 12 }]}>Check out on clirt-delta.vercel.app. You pay on delivery.</Text>
						</Card>
					) : null
				}
			/>
		</SafeAreaView>
	);
}

function Stepper({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled: boolean }) {
	return (
		<View style={s.stepper}>
			<Pressable accessibilityRole="button" accessibilityLabel="Decrease quantity" disabled={disabled || value <= 1} onPress={() => onChange(value - 1)} style={[s.stepBtn, (disabled || value <= 1) && { opacity: 0.4 }]}>
				<Text style={s.stepText}>−</Text>
			</Pressable>
			<Text style={s.qty}>{value}</Text>
			<Pressable accessibilityRole="button" accessibilityLabel="Increase quantity" disabled={disabled || value >= 20} onPress={() => onChange(value + 1)} style={[s.stepBtn, (disabled || value >= 20) && { opacity: 0.4 }]}>
				<Text style={s.stepText}>+</Text>
			</Pressable>
		</View>
	);
}

const s = StyleSheet.create({
	screen: { flex: 1, backgroundColor: colors.paper },
	title: { fontFamily: fonts.display, fontWeight: '800', fontSize: 30, color: colors.indigo, marginBottom: 4 },
	row: { flexDirection: 'row', gap: 12, padding: 12 },
	thumb: { backgroundColor: colors.fog, borderRadius: 12, padding: 4, alignSelf: 'flex-start' },
	name: { fontFamily: fonts.display, fontWeight: '800', fontSize: 16, color: colors.indigo, flexShrink: 1 },
	line: { fontFamily: fonts.body, fontWeight: '600', fontSize: 15, color: colors.ink },
	muted: { fontFamily: fonts.body, fontSize: 14, color: colors.slate },
	bodyBold: { fontFamily: fonts.body, fontWeight: '600', fontSize: 14, color: colors.ink },
	problem: { fontFamily: fonts.body, fontSize: 13, color: colors.alert },
	controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
	stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.mist, borderRadius: 10, backgroundColor: colors.white },
	stepBtn: { width: 40, height: 38, alignItems: 'center', justifyContent: 'center' },
	stepText: { fontFamily: fonts.body, fontWeight: '600', fontSize: 20, color: colors.indigo },
	qty: { minWidth: 28, textAlign: 'center', fontFamily: fonts.body, fontWeight: '600', fontSize: 16, color: colors.ink },
	remove: { fontFamily: fonts.body, fontWeight: '600', fontSize: 14, color: colors.alert },
	totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
	totalLabel: { fontFamily: fonts.body, fontWeight: '600', fontSize: 17, color: colors.ink }
});
