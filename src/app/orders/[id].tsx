import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge, Button, Card, ErrorState, Skeleton, Spec } from '../../components/ui';
import { ApiError, api } from '../../lib/api';
import { EMAIL_STATUS, ORDER_STATUS, formatOrderDate } from '../../lib/orders';
import { ShirtSvg } from '../../lib/svg';
import type { EmailStatus, Order } from '../../lib/types';
import { formatNaira } from '../../shared/money';
import { colors, fonts } from '../../theme';

export default function OrderDetail() {
	const { id, placed } = useLocalSearchParams<{ id: string; placed?: string }>();
	const [order, setOrder] = useState<Order | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [pulling, setPulling] = useState(false);
	const [resending, setResending] = useState(false);
	const [resendMessage, setResendMessage] = useState<{ ok: boolean; text: string } | null>(null);
	const [showDetails, setShowDetails] = useState(false);

	const load = useCallback(async () => {
		try {
			const res = await api<{ order: Order }>(`/api/v1/orders/${encodeURIComponent(id)}`);
			setOrder(res.order);
			setError(null);
		} catch (err) {
			if (err instanceof ApiError && err.status === 401) return;
			setError(err instanceof ApiError && err.status === 404 ? "We couldn't find that order." : err instanceof Error ? err.message : 'Could not load the order.');
		}
	}, [id]);

	useEffect(() => {
		load();
	}, [load]);

	async function resend() {
		setResending(true);
		setResendMessage(null);
		try {
			await api<{ emailStatus: EmailStatus }>(`/api/v1/orders/${encodeURIComponent(id)}/resend-email`, { method: 'POST' });
			setResendMessage({ ok: true, text: `Confirmation sent to ${order?.contactEmail}.` });
		} catch (err) {
			if (err instanceof ApiError && err.status === 401) return;
			setResendMessage({
				ok: err instanceof ApiError && err.code === 'already_sent',
				text: err instanceof Error ? err.message : 'The email could not be sent.'
			});
		} finally {
			setResending(false);
			load(); // pick up the new email status (and error)
		}
	}

	const title = order ? `Order #${order.number}` : 'Order';

	return (
		<SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }} edges={['bottom']}>
			<Stack.Screen options={{ title }} />
			<ScrollView
				contentContainerStyle={{ padding: 16, gap: 14 }}
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
			>
				{!order && error && <ErrorState message={error} onRetry={load} />}
				{!order && !error && <DetailSkeleton />}
				{order && (
					<>
						{placed === '1' && (
							<View accessibilityRole="alert" style={[s.banner, order.emailStatus === 'sent' ? s.bannerOk : s.bannerWarn]}>
								<Text style={s.bannerTitle}>Order placed</Text>
								<Text style={s.bannerText}>
									{order.emailStatus === 'sent'
										? `Confirmation sent to ${order.contactEmail}.`
										: "We couldn't send the confirmation email. You can resend it below."}
								</Text>
							</View>
						)}

						<View style={{ gap: 6 }}>
							<Spec>Order</Spec>
							<Text style={s.number}>#{order.number}</Text>
							<Text style={s.muted}>Placed {formatOrderDate(order.createdAt)}</Text>
							<View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
								<Badge label={ORDER_STATUS[order.status].label} tone={ORDER_STATUS[order.status].tone} />
								<Badge label={EMAIL_STATUS[order.emailStatus].label} tone={EMAIL_STATUS[order.emailStatus].tone} />
							</View>
						</View>

						{order.emailStatus !== 'sent' && (
							<Card style={{ gap: 10 }}>
								<Text style={s.body}>The confirmation email hasn't been sent.</Text>
								<Button title={resending ? 'Sending…' : 'Resend confirmation email'} variant="secondary" busy={resending} onPress={resend} />
								{order.emailError && (
									<View>
										<Pressable
											accessibilityRole="button"
											accessibilityState={{ expanded: showDetails }}
											onPress={() => setShowDetails((v) => !v)}
											hitSlop={8}
										>
											<Text style={s.link}>{showDetails ? '▾' : '▸'} Details</Text>
										</Pressable>
										{showDetails && <Text style={s.code}>{order.emailError}</Text>}
									</View>
								)}
							</Card>
						)}
						{resendMessage && <Text style={[s.body, { color: resendMessage.ok ? colors.leaf : colors.alert }]}>{resendMessage.text}</Text>}

						<Card style={{ padding: 0 }}>
							{order.items.map((item, i) => (
								<View key={item.id} style={[s.item, i > 0 && { borderTopWidth: 1, borderTopColor: colors.mist }]}>
									<View style={s.thumb}>
										<ShirtSvg svg={item.previewSvg} width={88} />
									</View>
									<View style={{ flex: 1, gap: 3 }}>
										<View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
											<Text style={s.itemName}>{item.styleName}</Text>
											<Text style={s.bodyBold}>{formatNaira(item.lineTotalKobo)}</Text>
										</View>
										<Spec>
											{item.colorName} · Size {item.size} · ×{item.quantity}
										</Spec>
										<Text style={s.muted}>{formatNaira(item.unitPriceKobo)} each</Text>
										<Text style={s.muted}>{item.designSummary}</Text>
									</View>
								</View>
							))}
						</Card>

						<Card style={{ gap: 8 }}>
							<Row label="Subtotal" value={formatNaira(order.subtotalKobo)} />
							<Row label="Delivery" value="Free" />
							<View style={[s.row, { borderTopWidth: 1, borderTopColor: colors.mist, paddingTop: 10 }]}>
								<Text style={s.total}>Total</Text>
								<Text style={s.total}>{formatNaira(order.totalKobo)}</Text>
							</View>
							<View style={s.note}>
								<Text style={s.bodyBold}>Pay on delivery</Text>
							</View>
						</Card>

						<Card style={{ gap: 14 }}>
							<View style={{ gap: 4 }}>
								<Text style={s.section}>Delivering to</Text>
								<Text style={s.body}>
									{order.shippingName}
									{'\n'}
									{order.address}
									{'\n'}
									{order.city}, {order.state}
									{'\n'}
									{order.phone}
								</Text>
							</View>
							<View style={{ gap: 4 }}>
								<Text style={s.section}>Contact</Text>
								<Text style={s.body}>{order.contactEmail}</Text>
							</View>
							{order.notes && (
								<View style={{ gap: 4 }}>
									<Text style={s.section}>Notes</Text>
									<Text style={s.body}>{order.notes}</Text>
								</View>
							)}
						</Card>
					</>
				)}
			</ScrollView>
		</SafeAreaView>
	);
}

function Row({ label, value }: { label: string; value: string }) {
	return (
		<View style={s.row}>
			<Text style={s.muted}>{label}</Text>
			<Text style={s.bodyBold}>{value}</Text>
		</View>
	);
}

function DetailSkeleton() {
	return (
		<View style={{ gap: 14 }}>
			<Skeleton style={{ width: 120, height: 14 }} />
			<Skeleton style={{ width: 200, height: 32 }} />
			<Skeleton style={{ width: 180, height: 14 }} />
			<Skeleton style={{ height: 120, borderRadius: 16 }} />
			<Skeleton style={{ height: 120, borderRadius: 16 }} />
		</View>
	);
}

const s = StyleSheet.create({
	banner: { borderRadius: 12, padding: 14, gap: 4 },
	bannerOk: { backgroundColor: colors.leafSoft },
	bannerWarn: { backgroundColor: colors.marigoldSoft },
	bannerTitle: { fontFamily: fonts.display, fontWeight: '800', fontSize: 18, color: colors.ink },
	bannerText: { fontFamily: fonts.body, fontSize: 15, color: colors.ink },
	number: { fontFamily: fonts.mono, fontWeight: '700', fontSize: 30, color: colors.indigo },
	section: { fontFamily: fonts.display, fontWeight: '800', fontSize: 16, color: colors.indigo },
	body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.ink },
	bodyBold: { fontFamily: fonts.body, fontWeight: '600', fontSize: 15, color: colors.ink },
	muted: { fontFamily: fonts.body, fontSize: 14, color: colors.slate },
	link: { fontFamily: fonts.body, fontWeight: '600', fontSize: 14, color: colors.slate },
	code: { marginTop: 8, fontFamily: fonts.mono, fontSize: 12, color: colors.slate, backgroundColor: colors.fog, borderRadius: 8, borderWidth: 1, borderColor: colors.mist, padding: 10 },
	item: { flexDirection: 'row', gap: 12, padding: 14 },
	thumb: { backgroundColor: colors.fog, borderRadius: 12, padding: 4, alignSelf: 'flex-start' },
	itemName: { fontFamily: fonts.display, fontWeight: '800', fontSize: 16, color: colors.indigo, flexShrink: 1 },
	row: { flexDirection: 'row', justifyContent: 'space-between' },
	total: { fontFamily: fonts.body, fontWeight: '600', fontSize: 17, color: colors.ink },
	note: { backgroundColor: colors.marigoldSoft, borderRadius: 10, padding: 10, marginTop: 4 }
});
