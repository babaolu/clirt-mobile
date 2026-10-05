import { useEffect, useRef, useState } from 'react';
import {
	FlatList,
	Modal,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	ToastAndroid,
	View,
	type TextInput
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Field, Spec } from '../components/ui';
import { ApiError, api } from '../lib/api';
import { useCart } from '../lib/cart';
import { useKeyboardAwareScroll } from '../lib/keyboard';
import { ShirtSvg } from '../lib/svg';
import type { CheckoutInput, EmailStatus, User } from '../lib/types';
import { shirtColorName } from '../shared/customization';
import { formatNaira } from '../shared/money';
import { NIGERIAN_STATES } from '../shared/nigeria';
import { colors, fonts } from '../theme';

type FieldName = keyof CheckoutInput;
const EMPTY: CheckoutInput = { contactEmail: '', shippingName: '', phone: '', address: '', city: '', state: '', notes: '' };

export default function Checkout() {
	const { cart, refresh } = useCart();
	const [values, setValues] = useState<CheckoutInput>(EMPTY);
	const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
	const [formError, setFormError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [pickingState, setPickingState] = useState(false);
	const placed = useRef(false);
	const inFlight = useRef(false);
	const { scrollRef: scroll, keyboardHeight, onScroll, onInputFocus } = useKeyboardAwareScroll();
	const refs = {
		phone: useRef<TextInput>(null),
		shippingName: useRef<TextInput>(null),
		address: useRef<TextInput>(null),
		city: useRef<TextInput>(null),
		notes: useRef<TextInput>(null)
	};

	// Prefill contact email and name from the account, without overwriting anything already typed.
	useEffect(() => {
		refresh();
		api<{ user: User }>('/api/v1/me')
			.then(({ user }) =>
				setValues((v) => ({ ...v, contactEmail: v.contactEmail || user.email, shippingName: v.shippingName || user.name }))
			)
			.catch(() => {});
	}, [refresh]);

	// Nothing to check out: go back to the cart (but not after this screen just placed the order).
	const empty = cart !== null && cart.items.length === 0;
	useEffect(() => {
		if (empty && !placed.current && !inFlight.current) {
			ToastAndroid.show('Your cart is empty.', ToastAndroid.SHORT);
			router.back();
		}
	}, [empty]);

	const set = (field: FieldName) => (value: string) => {
		setValues((v) => ({ ...v, [field]: value }));
		if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
	};

	const items = cart?.items ?? [];
	const hasProblems = items.some((i) => i.problem);
	const subtotal = cart?.subtotalKobo ?? 0;

	async function placeOrder() {
		if (inFlight.current) return; // no double orders
		inFlight.current = true;
		setSubmitting(true);
		setFormError(null);
		try {
			const res = await api<{ orderId: string; emailStatus: EmailStatus }>('/api/v1/checkout', {
				method: 'POST',
				body: { ...values, notes: values.notes.trim() || null }
			});
			placed.current = true;
			refresh(); // the order emptied the cart; the badge clears now (the Pusher event follows)
			router.navigate('/orders');
			router.push({ pathname: '/orders/[id]', params: { id: res.orderId, placed: '1' } });
		} catch (err) {
			if (err instanceof ApiError && err.status === 401) return;
			const fields = err instanceof ApiError ? (err.fields as Partial<Record<FieldName, string>> | undefined) : undefined;
			setErrors(fields ?? {});
			setFormError(err instanceof Error ? err.message : 'Your order was not placed. Please try again.');
			scroll.current?.scrollTo({ y: 0, animated: true });
			if (err instanceof ApiError && (err.code === 'cart_empty' || err.code === 'cart_unavailable')) refresh();
		} finally {
			inFlight.current = false;
			setSubmitting(false);
		}
	}

	return (
		<SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }} edges={['bottom']}>
			<ScrollView
				ref={scroll}
				onScroll={onScroll}
				scrollEventThrottle={32}
				contentContainerStyle={{ padding: 16, paddingBottom: 16 + keyboardHeight, gap: 14 }}
				keyboardShouldPersistTaps="handled"
			>
				{formError && (
					<View accessibilityRole="alert" style={s.alert}>
						<Text style={s.alertText}>{formError}</Text>
					</View>
				)}

				<Card style={{ gap: 14 }}>
					<Text style={s.section}>Contact</Text>
					<Field
						onFocus={onInputFocus}
						label="Email"
						value={values.contactEmail}
						onChangeText={set('contactEmail')}
						error={errors.contactEmail}
						keyboardType="email-address"
						autoCapitalize="none"
						autoComplete="email"
						returnKeyType="next"
						onSubmitEditing={() => refs.phone.current?.focus()}
						submitBehavior="submit"
					/>
					<Field
						onFocus={onInputFocus}
						ref={refs.phone}
						label="Phone"
						value={values.phone}
						onChangeText={set('phone')}
						error={errors.phone}
						placeholder="0803 123 4567"
						keyboardType="phone-pad"
						autoComplete="tel"
						returnKeyType="next"
						onSubmitEditing={() => refs.shippingName.current?.focus()}
						submitBehavior="submit"
					/>
				</Card>

				<Card style={{ gap: 14 }}>
					<Text style={s.section}>Delivery address</Text>
					<Field
						onFocus={onInputFocus}
						ref={refs.shippingName}
						label="Full name"
						value={values.shippingName}
						onChangeText={set('shippingName')}
						error={errors.shippingName}
						autoComplete="name"
						autoCapitalize="words"
						returnKeyType="next"
						onSubmitEditing={() => refs.address.current?.focus()}
						submitBehavior="submit"
					/>
					<Field
						onFocus={onInputFocus}
						ref={refs.address}
						label="Address"
						value={values.address}
						onChangeText={set('address')}
						error={errors.address}
						placeholder="House number, street, area"
						autoComplete="street-address"
						returnKeyType="next"
						onSubmitEditing={() => refs.city.current?.focus()}
						submitBehavior="submit"
					/>
					<Field
						onFocus={onInputFocus}
						ref={refs.city}
						label="City"
						value={values.city}
						onChangeText={set('city')}
						error={errors.city}
						autoComplete="postal-address-locality"
						autoCapitalize="words"
						returnKeyType="next"
						onSubmitEditing={() => setPickingState(true)}
					/>
					<View style={{ gap: 6 }}>
						<Text style={s.label}>State</Text>
						<Pressable
							accessibilityRole="button"
							accessibilityLabel={`State: ${values.state || 'not chosen'}`}
							onPress={() => setPickingState(true)}
							style={[s.select, errors.state ? { borderColor: colors.alert, borderWidth: 1.5 } : null]}
						>
							<Text style={[s.selectText, !values.state && { color: colors.slate }]}>{values.state || 'Choose a state'}</Text>
							<Text style={s.chevron}>▾</Text>
						</Pressable>
						{errors.state ? <Text style={s.fieldError}>{errors.state}</Text> : null}
					</View>
					<Field
						onFocus={onInputFocus}
						ref={refs.notes}
						label="Notes"
						optional
						value={values.notes}
						onChangeText={set('notes')}
						error={errors.notes}
						placeholder="Landmark, best time to call…"
						multiline
						maxLength={500}
						style={{ minHeight: 84, textAlignVertical: 'top' }}
					/>
				</Card>

				<Card style={{ gap: 12 }}>
					<Text style={s.section}>Order summary</Text>
					{items.map((item) => (
						<View key={item.id} style={{ flexDirection: 'row', gap: 10 }}>
							<View style={s.thumb}>
								<ShirtSvg svg={item.previewSvg} width={56} />
							</View>
							<View style={{ flex: 1, gap: 2 }}>
								<Text style={s.itemName}>{item.styleName}</Text>
								<Spec>
									{shirtColorName(item.customization.shirtColor)} · {item.size} · ×{item.quantity}
								</Spec>
								<Text style={s.muted} numberOfLines={1}>
									{item.designSummary}
								</Text>
								{item.problem && <Text style={s.fieldError}>{item.problem}</Text>}
							</View>
							<Text style={s.bodyBold}>{formatNaira(item.lineTotalKobo)}</Text>
						</View>
					))}
					<View style={s.totals}>
						<Row label="Subtotal" value={formatNaira(subtotal)} />
						<Row label="Delivery" value="Free" />
						<View style={[s.row, { borderTopWidth: 1, borderTopColor: colors.mist, paddingTop: 10 }]}>
							<Text style={s.total}>Total</Text>
							<Text style={s.total}>{formatNaira(subtotal)}</Text>
						</View>
					</View>
				</Card>

				<View style={s.note}>
					<Text style={s.noteText}>Pay on delivery — no payment is taken in the app.</Text>
				</View>
				{hasProblems && <Text style={s.fieldError}>Some items can no longer be ordered. Remove them from your cart to check out.</Text>}

				<Button
					title={submitting ? 'Placing order…' : `Place order · ${formatNaira(subtotal)}`}
					busy={submitting}
					disabled={hasProblems || items.length === 0}
					onPress={placeOrder}
				/>
			</ScrollView>

			<StatePicker
				visible={pickingState}
				selected={values.state}
				onClose={() => setPickingState(false)}
				onSelect={(state) => {
					set('state')(state);
					setPickingState(false);
				}}
			/>
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

/** The 36 states + FCT in a bottom sheet (Android back closes it). */
function StatePicker({ visible, selected, onClose, onSelect }: { visible: boolean; selected: string; onClose: () => void; onSelect: (s: string) => void }) {
	return (
		<Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
			<Pressable style={s.scrim} onPress={onClose} accessibilityLabel="Close" />
			<SafeAreaView edges={['bottom']} style={s.sheet}>
				<Text style={[s.section, { paddingHorizontal: 20, paddingVertical: 14 }]}>Choose a state</Text>
				<FlatList
					data={NIGERIAN_STATES}
					keyExtractor={(st) => st}
					initialScrollIndex={Math.max(0, NIGERIAN_STATES.indexOf(selected as (typeof NIGERIAN_STATES)[number]) - 3)}
					getItemLayout={(_, index) => ({ length: 52, offset: 52 * index, index })}
					renderItem={({ item }) => (
						<Pressable
							accessibilityRole="button"
							accessibilityState={{ selected: item === selected }}
							onPress={() => onSelect(item)}
							style={({ pressed }) => [s.option, item === selected && s.optionOn, pressed && { backgroundColor: colors.fog }]}
						>
							<Text style={[s.optionText, item === selected && { color: colors.indigo, fontWeight: '600' }]}>{item}</Text>
							{item === selected && <Text style={s.optionText}>✓</Text>}
						</Pressable>
					)}
				/>
			</SafeAreaView>
		</Modal>
	);
}

const s = StyleSheet.create({
	section: { fontFamily: fonts.display, fontWeight: '800', fontSize: 18, color: colors.indigo },
	label: { fontFamily: fonts.body, fontWeight: '600', fontSize: 14, color: colors.indigo },
	muted: { fontFamily: fonts.body, fontSize: 13, color: colors.slate },
	bodyBold: { fontFamily: fonts.body, fontWeight: '600', fontSize: 14, color: colors.ink },
	fieldError: { fontFamily: fonts.body, fontSize: 13, color: colors.alert },
	alert: { backgroundColor: colors.alertSoft, borderRadius: 12, padding: 14 },
	alertText: { fontFamily: fonts.body, fontWeight: '600', fontSize: 15, color: colors.alert },
	select: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: colors.mist, borderRadius: 10, backgroundColor: colors.white, paddingHorizontal: 12, paddingVertical: 12 },
	selectText: { fontFamily: fonts.body, fontSize: 16, color: colors.ink },
	chevron: { fontSize: 16, color: colors.slate },
	thumb: { backgroundColor: colors.fog, borderRadius: 10, padding: 2, alignSelf: 'flex-start' },
	itemName: { fontFamily: fonts.body, fontWeight: '600', fontSize: 15, color: colors.ink },
	totals: { borderTopWidth: 1, borderTopColor: colors.mist, paddingTop: 10, gap: 6 },
	row: { flexDirection: 'row', justifyContent: 'space-between' },
	total: { fontFamily: fonts.body, fontWeight: '600', fontSize: 17, color: colors.ink },
	note: { backgroundColor: colors.marigoldSoft, borderRadius: 12, padding: 14 },
	noteText: { fontFamily: fonts.body, fontWeight: '600', fontSize: 15, color: colors.ink },
	scrim: { flex: 1, backgroundColor: 'rgba(18,19,26,0.4)' },
	sheet: { maxHeight: '70%', backgroundColor: colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
	option: { height: 52, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
	optionOn: { backgroundColor: colors.marigoldSoft },
	optionText: { fontFamily: fonts.body, fontSize: 16, color: colors.ink }
});
