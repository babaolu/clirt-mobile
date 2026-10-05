import { useEffect, useRef, type ReactNode, type Ref } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle } from 'react-native';
import { useNetworkState } from 'expo-network';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';
import { colors, fonts, type } from '../theme';

const TEE = 'M24 15 L14 20 L10 31 L18 34 L19 50 L47 50 L48 34 L56 31 L52 20 L42 15 Q35 22 24 15 Z';
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${colors.indigo}"/><path d="${TEE}" fill="${colors.marigold}" transform="translate(3 3)"/><path d="${TEE}" fill="${colors.paper}"/></svg>`;

/** The website's mark + "clirt" wordmark with the marigold overprint. */
export function Logo({ size = 28 }: { size?: number }) {
	return (
		<View style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.3 }}>
			<SvgXml xml={LOGO_SVG} width={size} height={size} />
			<Text style={[styles.wordmark, { fontSize: size * 0.9 }]}>clirt</Text>
		</View>
	);
}

type ButtonProps = {
	title: string;
	onPress: () => void;
	variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'dangerSolid';
	disabled?: boolean;
	busy?: boolean;
	icon?: ReactNode;
	style?: StyleProp<ViewStyle>;
};

export function Button({ title, onPress, variant = 'primary', disabled, busy, icon, style }: ButtonProps) {
	const v = buttonVariants[variant];
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityState={{ disabled: disabled || busy, busy }}
			onPress={onPress}
			disabled={disabled || busy}
			style={({ pressed }) => [
				styles.button,
				v.container,
				pressed && { opacity: 0.85, transform: [{ translateX: 1 }, { translateY: 1 }] },
				(disabled || busy) && { opacity: 0.5 },
				style
			]}
		>
			{busy ? <ActivityIndicator color={v.text.color} /> : icon}
			<Text style={[styles.buttonText, v.text]}>{title}</Text>
		</Pressable>
	);
}

const buttonVariants = {
	primary: StyleSheet.create({
		container: { backgroundColor: colors.indigo, shadowColor: colors.marigold, borderRightWidth: 3, borderBottomWidth: 3, borderColor: colors.marigold },
		text: { color: colors.paper }
	}),
	secondary: StyleSheet.create({
		container: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.mist },
		text: { color: colors.indigo }
	}),
	ghost: StyleSheet.create({ container: { backgroundColor: 'transparent' }, text: { color: colors.slate } }),
	danger: StyleSheet.create({ container: { backgroundColor: 'transparent' }, text: { color: colors.alert } }),
	dangerSolid: StyleSheet.create({ container: { backgroundColor: colors.alert }, text: { color: colors.white } })
};

/** Selectable chip (sleeve, neck, size, presets, fonts). */
export function Chip({ label, selected, onPress, labelStyle, style }: { label: string; selected: boolean; onPress: () => void; labelStyle?: object; style?: StyleProp<ViewStyle> }) {
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityState={{ selected }}
			onPress={onPress}
			style={[styles.chip, selected && styles.chipSelected, style]}
		>
			<Text numberOfLines={1} style={[styles.chipText, selected && styles.chipTextSelected, labelStyle]}>
				{label}
			</Text>
		</Pressable>
	);
}

export function Swatch({ color, selected, onPress, label, size = 34 }: { color: string; selected: boolean; onPress: () => void; label: string; size?: number }) {
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={label}
			accessibilityState={{ selected }}
			onPress={onPress}
			style={[styles.swatchRing, selected && { borderColor: colors.indigo }]}
		>
			<View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, borderWidth: 1, borderColor: 'rgba(0,0,0,0.15)' }} />
		</Pressable>
	);
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
	return <View style={[styles.card, style]}>{children}</View>;
}

export function Spec({ children }: { children: ReactNode }) {
	return <Text style={type.spec}>{children}</Text>;
}

type InputProps = TextInputProps & { ref?: Ref<TextInput>; containerStyle?: StyleProp<ViewStyle> };

/**
 * Text input for forms inside a ScrollView. Two Android workarounds:
 * - A single-line EditText always reports that it can scroll horizontally, so a drag that starts on it
 *   never reaches the parent ScrollView. Single-line inputs are therefore rendered `multiline`, with
 *   Enter submitting instead of adding a line, and newlines (e.g. pasted) replaced by spaces. They get a
 *   little more height than one line needs, or the EditText still claims the drag.
 * - The native hint ignores the app font (it falls back to the system font, which some phones replace),
 *   so the placeholder is drawn as an overlay Text in the input's font.
 */
export function Input({ ref, multiline, placeholder, value, onChangeText, submitBehavior, style, containerStyle, ...rest }: InputProps) {
	const flat = StyleSheet.flatten([styles.input, style]) as TextStyle;
	return (
		<View style={containerStyle}>
			<TextInput
				ref={ref}
				multiline
				submitBehavior={multiline ? submitBehavior : (submitBehavior ?? 'blurAndSubmit')}
				value={value}
				onChangeText={multiline || !onChangeText ? onChangeText : (text) => onChangeText(text.replace(/\r?\n/g, ' '))}
				accessibilityHint={placeholder}
				{...rest}
				style={[styles.input, !multiline && styles.singleLine, style]}
			/>
			{!value && placeholder ? (
				<View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.placeholderBox, { justifyContent: multiline ? 'flex-start' : 'center' }, multiline && { paddingTop: (typeof flat.paddingVertical === 'number' ? flat.paddingVertical : 10) + 1 }]}>
					<Text numberOfLines={1} style={[styles.placeholder, { fontSize: flat.fontSize, letterSpacing: flat.letterSpacing, fontFamily: flat.fontFamily }]}>
						{placeholder}
					</Text>
				</View>
			) : null}
		</View>
	);
}

/** Labelled text input with the API's per-field error underneath. */
export function Field({
	label,
	optional,
	error,
	style,
	ref,
	...input
}: InputProps & { label: string; optional?: boolean; error?: string }) {
	return (
		<View style={{ gap: 6 }}>
			<Text style={styles.fieldLabel}>
				{label}
				{optional && <Text style={styles.fieldOptional}> (optional)</Text>}
			</Text>
			<Input ref={ref} accessibilityLabel={label} {...input} style={[error ? styles.inputInvalid : null, style]} />
			{error ? <Text style={styles.fieldError}>{error}</Text> : null}
		</View>
	);
}

const BADGE_TONES = {
	neutral: { backgroundColor: colors.fog, color: colors.slate },
	warning: { backgroundColor: colors.marigoldSoft, color: colors.ink },
	success: { backgroundColor: colors.leafSoft, color: colors.leaf },
	danger: { backgroundColor: colors.alertSoft, color: colors.alert }
} as const;

export function Badge({ label, tone }: { label: string; tone: keyof typeof BADGE_TONES }) {
	const t = BADGE_TONES[tone];
	return (
		<View style={[styles.badge, { backgroundColor: t.backgroundColor }]}>
			<Text style={[styles.badgeText, { color: t.color }]}>{label}</Text>
		</View>
	);
}

/** A pulsing placeholder block for loading states. */
export function Skeleton({ style }: { style?: StyleProp<ViewStyle> }) {
	const opacity = useRef(new Animated.Value(0.5)).current;
	useEffect(() => {
		const loop = Animated.loop(
			Animated.sequence([
				Animated.timing(opacity, { toValue: 1, duration: 650, useNativeDriver: true }),
				Animated.timing(opacity, { toValue: 0.5, duration: 650, useNativeDriver: true })
			])
		);
		loop.start();
		return () => loop.stop();
	}, [opacity]);
	return <Animated.View style={[{ backgroundColor: colors.mist, borderRadius: 8 }, style, { opacity }]} />;
}

/** Message + Retry, for a screen whose data failed to load. */
export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
	return (
		<Card style={{ gap: 14, alignItems: 'flex-start' }}>
			<Text style={styles.errorText}>{message}</Text>
			<Button title="Retry" variant="secondary" onPress={onRetry} />
		</Card>
	);
}

/** A pill under the status bar while the phone has no connection (shown over every screen). */
export function OfflineNotice() {
	const { isConnected, isInternetReachable } = useNetworkState();
	const { top } = useSafeAreaInsets();
	if (isConnected !== false && isInternetReachable !== false) return null;
	return (
		<View pointerEvents="none" style={[styles.offlineWrap, { top: top + 6 }]}>
			<Text accessibilityRole="alert" style={styles.offline}>
				You're offline. Changes will fail until you reconnect.
			</Text>
		</View>
	);
}

export const styles = StyleSheet.create({
	wordmark: {
		fontFamily: fonts.display,
		fontWeight: '800',
		color: colors.indigo,
		textShadowColor: colors.marigold,
		textShadowOffset: { width: 2, height: 2 },
		textShadowRadius: 0.1
	},
	button: { minHeight: 48, borderRadius: 10, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
	buttonText: { fontFamily: fonts.body, fontWeight: '600', fontSize: 16 },
	chip: { paddingVertical: 9, paddingHorizontal: 12, borderRadius: 9, borderWidth: 1, borderColor: colors.mist, backgroundColor: colors.white, alignItems: 'center' },
	chipSelected: { backgroundColor: colors.indigo, borderColor: colors.indigo },
	chipText: { fontFamily: fonts.body, fontWeight: '600', fontSize: 14, color: colors.ink },
	chipTextSelected: { color: colors.paper },
	swatchRing: { padding: 3, borderRadius: 999, borderWidth: 2, borderColor: 'transparent' },
	card: { backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.mist, padding: 16 },
	fieldLabel: { fontFamily: fonts.body, fontWeight: '600', fontSize: 14, color: colors.indigo },
	fieldOptional: { fontWeight: '400', color: colors.slate },
	input: { borderWidth: 1, borderColor: colors.mist, borderRadius: 10, backgroundColor: colors.white, paddingHorizontal: 12, paddingVertical: 10, fontFamily: fonts.body, fontSize: 16, color: colors.ink },
	inputInvalid: { borderColor: colors.alert, borderWidth: 1.5 },
	placeholderBox: { paddingHorizontal: 13 },
	// A one-row multiline EditText can measure a pixel taller than its view and then claims the drag;
	// a little spare height keeps the text inside it.
	singleLine: { minHeight: 50, textAlignVertical: 'center' },
	placeholder: { color: colors.slate, opacity: 0.8 },
	fieldError: { fontFamily: fonts.body, fontSize: 13, color: colors.alert },
	badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' },
	badgeText: { fontFamily: fonts.body, fontWeight: '600', fontSize: 12 },
	errorText: { fontFamily: fonts.body, fontSize: 15, color: colors.ink },
	offlineWrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center', zIndex: 10 },
	offline: { backgroundColor: colors.ink, color: colors.paper, fontFamily: fonts.body, fontWeight: '600', fontSize: 13, textAlign: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 14, overflow: 'hidden' }
});
