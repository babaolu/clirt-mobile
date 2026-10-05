import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, ToastAndroid, View, useWindowDimensions } from 'react-native';
import Slider from '@react-native-community/slider';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';
import { Button, Card, Chip, Spec, Swatch } from '../../components/ui';
import { ApiError } from '../../lib/api';
import { useCart } from '../../lib/cart';
import { useCatalog } from '../../lib/catalog';
import { ShirtSvg } from '../../lib/svg';
import {
	DEFAULT_PLACEMENT,
	FONTS,
	SHIRT_COLORS,
	SIZES,
	customizationSchema,
	type Customization,
	type FontKey,
	type GraphicPresetSlug,
	type ShirtColor,
	type Size,
	type TextPresetSlug
} from '../../shared/customization';
import { formatNaira } from '../../shared/money';
import { renderGraphicIcon, renderShirtSvg } from '../../shared/shirt';
import { colors, fonts } from '../../theme';

const INK_SWATCHES = [
	{ hex: '#111111', name: 'Black' },
	{ hex: '#ffffff', name: 'White' },
	{ hex: '#1f2a5c', name: 'Indigo' },
	{ hex: '#f2b230', name: 'Marigold' },
	{ hex: '#c62828', name: 'Red' },
	{ hex: '#2e5e3e', name: 'Forest' },
	{ hex: '#db2777', name: 'Pink' },
	{ hex: '#7c3aed', name: 'Violet' }
];
const SLEEVES = [
	{ value: 'short', label: 'Short' },
	{ value: 'long', label: 'Long' }
] as const;
const NECKS = [
	{ value: 'round', label: 'Round' },
	{ value: 'v', label: 'V-neck' },
	{ value: 'collar', label: 'Collar' }
] as const;
/** First family name from FONTS (the name the font is embedded under on Android). */
const familyOf = (key: FontKey) => FONTS[key].family.split(',')[0].replace(/'/g, '').trim();

export default function Design() {
	const params = useLocalSearchParams<{ slug: string }>();
	const { catalog } = useCatalog();
	const { add } = useCart();
	const { width } = useWindowDimensions();
	const insets = useSafeAreaInsets();

	const [styleSlug, setStyleSlug] = useState(params.slug);
	const [shirtColor, setShirtColor] = useState<ShirtColor>('white');
	const [size, setSize] = useState<Size>('M');
	const [quantity, setQuantity] = useState(1);
	const [tab, setTab] = useState<'text' | 'graphic'>('text');
	const [text, setText] = useState('Your text');
	const [font, setFont] = useState<FontKey>('montserrat');
	const [textColor, setTextColor] = useState('#111111');
	const [textPreset, setTextPreset] = useState<TextPresetSlug>('plain');
	const [graphicPreset, setGraphicPreset] = useState<GraphicPresetSlug>('star');
	const [graphicColor, setGraphicColor] = useState('#c62828');
	const [placement, setPlacement] = useState({ ...DEFAULT_PLACEMENT });
	const [adding, setAdding] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const style = catalog?.styles.find((s) => s.slug === styleSlug) ?? null;
	const presets = catalog?.presets ?? [];

	const design: Customization['design'] =
		tab === 'text'
			? { kind: 'text', text: text.trim(), font, textColor, presetSlug: textPreset }
			: { kind: 'graphic', presetSlug: graphicPreset, graphicColor };
	const customization: Customization = { shirtColor, design, placement };
	const validation = customizationSchema.safeParse(customization);

	const preview = useMemo(
		() =>
			style
				? renderShirtSvg({
						sleeve: style.sleeve,
						neck: style.neck,
						shirtColorHex: SHIRT_COLORS[shirtColor].hex,
						design: design.kind === 'text' && !design.text ? null : design,
						placement,
						presets,
						idPrefix: 'design',
						showPrintArea: true
					})
				: '',
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[style, shirtColor, JSON.stringify(design), placement, presets]
	);

	if (!catalog || !style) {
		return (
			<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
				{catalog ? <Text style={s.muted}>That style isn't available.</Text> : <ActivityIndicator color={colors.indigo} />}
			</View>
		);
	}

	const unitKobo = style.basePriceKobo + (design.kind === 'text' ? catalog.surcharges.text : catalog.surcharges.graphic);
	const selectStyle = (sleeve: 'short' | 'long', neck: 'round' | 'v' | 'collar') => {
		const next = catalog.styles.find((s) => s.sleeve === sleeve && s.neck === neck);
		if (next) setStyleSlug(next.slug);
	};

	async function addToCart() {
		if (!validation.success || !style) {
			setError(tab === 'text' && !text.trim() ? 'Enter some text, or switch to a graphic.' : 'Check your design and try again.');
			return;
		}
		setAdding(true);
		setError(null);
		try {
			await add({ styleSlug: style.slug, size, quantity, customization: validation.data });
			ToastAndroid.show('Added to cart', ToastAndroid.SHORT);
			router.navigate('/cart');
		} catch (err) {
			if (!(err instanceof ApiError && err.status === 401)) {
				setError(err instanceof Error ? err.message : 'Could not add to cart.');
			}
		} finally {
			setAdding(false);
		}
	}

	const previewWidth = Math.min(width - 32, 340) * 0.78;

	return (
		<View style={{ flex: 1, backgroundColor: colors.paper }}>
			<Stack.Screen options={{ title: style.name }} />
			<ScrollView stickyHeaderIndices={[0]} contentContainerStyle={{ paddingBottom: 120 + insets.bottom }} keyboardShouldPersistTaps="handled">
				{/* Live preview, kept visible while scrolling the controls */}
				<View style={s.previewWrap}>
					<View style={s.plate}>
						<ShirtSvg svg={preview} width={previewWidth} />
					</View>
				</View>

				<View style={{ padding: 16, gap: 14 }}>
					<Card style={{ gap: 14 }}>
						<Text style={s.section}>Shirt</Text>
						<Row label="Sleeve">
							{SLEEVES.map((o) => (
								<Chip key={o.value} label={o.label} selected={style.sleeve === o.value} onPress={() => selectStyle(o.value, style.neck)} style={{ flex: 1 }} />
							))}
						</Row>
						<Row label="Neck">
							{NECKS.map((o) => (
								<Chip key={o.value} label={o.label} selected={style.neck === o.value} onPress={() => selectStyle(style.sleeve, o.value)} style={{ flex: 1 }} />
							))}
						</Row>
						<Row label={`Colour · ${SHIRT_COLORS[shirtColor].name}`} wrap>
							{(Object.keys(SHIRT_COLORS) as ShirtColor[]).map((key) => (
								<Swatch key={key} label={SHIRT_COLORS[key].name} color={SHIRT_COLORS[key].hex} selected={shirtColor === key} onPress={() => setShirtColor(key)} />
							))}
						</Row>
						<Row label="Size">
							{SIZES.map((sz) => (
								<Chip key={sz} label={sz} selected={size === sz} onPress={() => setSize(sz)} style={{ flex: 1, paddingHorizontal: 4 }} />
							))}
						</Row>
						<Row label="Quantity">
							<View style={s.stepper}>
								<Pressable accessibilityLabel="Decrease quantity" disabled={quantity <= 1} onPress={() => setQuantity((q) => Math.max(1, q - 1))} style={s.stepBtn}>
									<Text style={[s.stepText, quantity <= 1 && { opacity: 0.4 }]}>−</Text>
								</Pressable>
								<Text style={s.qty}>{quantity}</Text>
								<Pressable accessibilityLabel="Increase quantity" disabled={quantity >= 20} onPress={() => setQuantity((q) => Math.min(20, q + 1))} style={s.stepBtn}>
									<Text style={[s.stepText, quantity >= 20 && { opacity: 0.4 }]}>+</Text>
								</Pressable>
							</View>
						</Row>
					</Card>

					<Card style={{ gap: 14 }}>
						<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
							<Text style={s.section}>Design</Text>
							<View style={s.tabs}>
								{(['text', 'graphic'] as const).map((t) => (
									<Pressable key={t} accessibilityRole="tab" accessibilityState={{ selected: tab === t }} onPress={() => setTab(t)} style={[s.tab, tab === t && s.tabOn]}>
										<Text style={[s.tabText, tab === t && { color: colors.indigo }]}>{t === 'text' ? 'Text' : 'Graphic'}</Text>
									</Pressable>
								))}
							</View>
						</View>

						{tab === 'text' ? (
							<>
								<View>
									<View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
										<Text style={s.label}>Your text</Text>
										<Text style={s.count}>{text.length}/40</Text>
									</View>
									<TextInput value={text} onChangeText={setText} maxLength={40} style={s.input} placeholder="Your text" placeholderTextColor={colors.slate} />
								</View>
								<Row label="Font" wrap>
									{(Object.keys(FONTS) as FontKey[]).map((key) => (
										<Chip
											key={key}
											label={FONTS[key].name}
											selected={font === key}
											onPress={() => setFont(key)}
											style={{ width: '48%' }}
											labelStyle={{ fontFamily: familyOf(key), fontWeight: String(FONTS[key].weight), fontSize: 16 }}
										/>
									))}
								</Row>
								<Row label="Text colour" wrap>
									{INK_SWATCHES.map((ink) => (
										<Swatch key={ink.hex} label={`Text colour ${ink.name}`} color={ink.hex} size={28} selected={textColor === ink.hex} onPress={() => setTextColor(ink.hex)} />
									))}
								</Row>
								<Row label="Style" wrap>
									{presets
										.filter((p) => p.kind === 'text_style')
										.map((p) => (
											<Chip key={p.slug} label={p.name} selected={textPreset === p.slug} onPress={() => setTextPreset(p.slug as TextPresetSlug)} style={{ width: '48%' }} />
										))}
								</Row>
							</>
						) : (
							<>
								<Row label="Graphic" wrap>
									{presets
										.filter((p) => p.kind === 'graphic')
										.map((p) => (
											<Pressable
												key={p.slug}
												accessibilityRole="button"
												accessibilityLabel={p.name}
												accessibilityState={{ selected: graphicPreset === p.slug }}
												onPress={() => setGraphicPreset(p.slug as GraphicPresetSlug)}
												style={[s.graphic, graphicPreset === p.slug && s.graphicOn]}
											>
												{p.kind === 'graphic' && <SvgXml xml={renderGraphicIcon(p.config, colors.indigo)} width={36} height={36} />}
											</Pressable>
										))}
								</Row>
								<Row label="Graphic colour" wrap>
									{INK_SWATCHES.map((ink) => (
										<Swatch key={ink.hex} label={`Graphic colour ${ink.name}`} color={ink.hex} size={28} selected={graphicColor === ink.hex} onPress={() => setGraphicColor(ink.hex)} />
									))}
								</Row>
							</>
						)}
					</Card>

					<Card style={{ gap: 6 }}>
						<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
							<Text style={s.section}>Position</Text>
							<Pressable onPress={() => setPlacement({ ...DEFAULT_PLACEMENT })} hitSlop={8}>
								<Text style={s.link}>Reset position</Text>
							</Pressable>
						</View>
						<SliderRow label={`Design size · ${Math.round(placement.scale * 100)}%`} min={0.4} max={1.6} value={placement.scale} onChange={(v) => setPlacement((p) => ({ ...p, scale: v }))} />
						<SliderRow label="Left ↔ right" min={0} max={1} value={placement.x} onChange={(v) => setPlacement((p) => ({ ...p, x: v }))} />
						<SliderRow label="Up ↕ down" min={0} max={1} value={placement.y} onChange={(v) => setPlacement((p) => ({ ...p, y: v }))} />
					</Card>
				</View>
			</ScrollView>

			<View style={[s.bar, { paddingBottom: 12 + insets.bottom }]}>
				{error && <Text style={s.error}>{error}</Text>}
				<View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
					<View style={{ flex: 1 }}>
						<Text style={s.price}>{formatNaira(unitKobo)} each</Text>
						<Text style={s.muted}>
							{formatNaira(unitKobo * quantity)} total · {quantity} × {size}
						</Text>
					</View>
					<Button title={adding ? 'Adding…' : 'Add to cart'} busy={adding} disabled={!validation.success} onPress={addToCart} />
				</View>
			</View>
		</View>
	);
}

function Row({ label, children, wrap }: { label: string; children: React.ReactNode; wrap?: boolean }) {
	return (
		<View style={{ gap: 8 }}>
			<Text style={s.label}>{label}</Text>
			<View style={{ flexDirection: 'row', flexWrap: wrap ? 'wrap' : 'nowrap', gap: 8 }}>{children}</View>
		</View>
	);
}

function SliderRow({ label, min, max, value, onChange }: { label: string; min: number; max: number; value: number; onChange: (v: number) => void }) {
	return (
		<View>
			<Text style={s.label}>{label}</Text>
			<Slider
				accessibilityLabel={label}
				minimumValue={min}
				maximumValue={max}
				step={0.01}
				value={value}
				onValueChange={(v) => onChange(Math.round(v * 100) / 100)}
				minimumTrackTintColor={colors.indigo}
				maximumTrackTintColor={colors.mist}
				thumbTintColor={colors.indigo}
			/>
		</View>
	);
}

const s = StyleSheet.create({
	previewWrap: { backgroundColor: colors.paper, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
	plate: { backgroundColor: colors.fog, borderRadius: 16, borderWidth: 1, borderColor: colors.mist, alignItems: 'center', paddingVertical: 10 },
	section: { fontFamily: fonts.display, fontWeight: '800', fontSize: 18, color: colors.indigo },
	label: { fontFamily: fonts.body, fontWeight: '600', fontSize: 14, color: colors.indigo },
	count: { fontFamily: fonts.mono, fontSize: 12, color: colors.slate },
	muted: { fontFamily: fonts.body, fontSize: 13, color: colors.slate },
	link: { fontFamily: fonts.body, fontWeight: '600', fontSize: 14, color: colors.slate },
	input: { marginTop: 6, borderWidth: 1, borderColor: colors.mist, borderRadius: 10, backgroundColor: colors.white, paddingHorizontal: 12, paddingVertical: 10, fontFamily: fonts.body, fontSize: 16, color: colors.ink },
	tabs: { flexDirection: 'row', backgroundColor: colors.fog, borderRadius: 10, padding: 3 },
	tab: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: 8 },
	tabOn: { backgroundColor: colors.white },
	tabText: { fontFamily: fonts.body, fontWeight: '600', fontSize: 14, color: colors.slate },
	graphic: { width: 56, height: 56, borderRadius: 12, borderWidth: 1, borderColor: colors.mist, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
	graphicOn: { borderColor: colors.indigo, borderWidth: 2, backgroundColor: colors.marigoldSoft },
	stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.mist, borderRadius: 10, backgroundColor: colors.white },
	stepBtn: { width: 44, height: 40, alignItems: 'center', justifyContent: 'center' },
	stepText: { fontFamily: fonts.body, fontWeight: '600', fontSize: 20, color: colors.indigo },
	qty: { minWidth: 32, textAlign: 'center', fontFamily: fonts.body, fontWeight: '600', fontSize: 16, color: colors.ink },
	bar: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.paper, borderTopWidth: 1, borderTopColor: colors.mist, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20, gap: 8 },
	price: { fontFamily: fonts.body, fontWeight: '600', fontSize: 18, color: colors.ink },
	error: { fontFamily: fonts.body, fontSize: 14, color: colors.alert }
});
