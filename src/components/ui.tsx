import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
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
	variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
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
	danger: StyleSheet.create({ container: { backgroundColor: 'transparent' }, text: { color: colors.alert } })
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
	card: { backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.mist, padding: 16 }
});
