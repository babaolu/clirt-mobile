/**
 * Copied from the Clirt web repo (github.com/babaolu/clirt) at src/lib/customization.ts (commit 623d2d4).
 * Keep in sync with the server: only the import paths have been changed.
 */
import { z } from 'zod';

/** Shared customization contract, imported by both client and server code. */

export const SIZES = ['S', 'M', 'L', 'XL', 'XXL'] as const;
export type Size = (typeof SIZES)[number];

export const SHIRT_COLORS = {
	white: { name: 'White', hex: '#ffffff' },
	black: { name: 'Black', hex: '#111111' },
	heather: { name: 'Heather Grey', hex: '#9ca3af' },
	navy: { name: 'Navy', hex: '#1e2a4a' },
	red: { name: 'Red', hex: '#c62828' },
	forest: { name: 'Forest Green', hex: '#2e5e3e' },
	royal: { name: 'Royal Blue', hex: '#2747b8' },
	mustard: { name: 'Mustard', hex: '#e0a526' }
} as const;
export type ShirtColor = keyof typeof SHIRT_COLORS;

/** Google Fonts offered for text designs. `google` is the family name as used in the Google Fonts CSS API. */
export const FONTS = {
	montserrat: {
		name: 'Montserrat',
		google: 'Montserrat:wght@800',
		family: "'Montserrat', sans-serif",
		weight: 800,
		personality: 'Bold sans'
	},
	playfair: {
		name: 'Playfair Display',
		google: 'Playfair+Display:wght@700',
		family: "'Playfair Display', serif",
		weight: 700,
		personality: 'Serif'
	},
	pacifico: {
		name: 'Pacifico',
		google: 'Pacifico',
		family: "'Pacifico', cursive",
		weight: 400,
		personality: 'Script'
	},
	bungee: {
		name: 'Bungee',
		google: 'Bungee',
		family: "'Bungee', sans-serif",
		weight: 400,
		personality: 'Display'
	},
	spaceMono: {
		name: 'Space Mono',
		google: 'Space+Mono:wght@700',
		family: "'Space Mono', monospace",
		weight: 700,
		personality: 'Mono'
	},
	oswald: {
		name: 'Oswald',
		google: 'Oswald:wght@600',
		family: "'Oswald', sans-serif",
		weight: 600,
		personality: 'Condensed'
	}
} as const;
export type FontKey = keyof typeof FONTS;

/** Slugs of the seeded design presets (rows in design_preset). */
export const TEXT_PRESET_SLUGS = ['plain', 'arched', 'outlined', 'stacked'] as const;
export const GRAPHIC_PRESET_SLUGS = ['star', 'heart', 'lightning', 'mountains', 'wave'] as const;

const keysOf = <T extends Record<string, unknown>>(obj: T) =>
	Object.keys(obj) as [keyof T & string, ...(keyof T & string)[]];

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a hex colour like #1a2b3c');

export const textDesignSchema = z.object({
	kind: z.literal('text'),
	text: z.string().trim().min(1).max(40),
	font: z.enum(keysOf(FONTS)),
	textColor: hexColor,
	presetSlug: z.enum(TEXT_PRESET_SLUGS)
});

export const graphicDesignSchema = z.object({
	kind: z.literal('graphic'),
	presetSlug: z.enum(GRAPHIC_PRESET_SLUGS),
	graphicColor: hexColor
});

export const customizationSchema = z.object({
	shirtColor: z.enum(keysOf(SHIRT_COLORS)),
	design: z.discriminatedUnion('kind', [textDesignSchema, graphicDesignSchema]),
	/** x/y: centre of the design within the printable chest area (0–1); scale: relative size. */
	placement: z.object({
		x: z.number().min(0).max(1),
		y: z.number().min(0).max(1),
		scale: z.number().min(0.4).max(1.6)
	})
});

export type Customization = z.infer<typeof customizationSchema>;
export type TextDesign = z.infer<typeof textDesignSchema>;
export type GraphicDesign = z.infer<typeof graphicDesignSchema>;

/** Config stored in design_preset.config, read by the SVG renderer. */
export type TextStyleConfig =
	| { effect: 'plain'; fontSize: number; letterSpacing: number }
	| { effect: 'arc'; fontSize: number; letterSpacing: number; arcDegrees: number; radius: number }
	| { effect: 'outline'; fontSize: number; letterSpacing: number; strokeWidth: number }
	| {
			effect: 'stack';
			fontSize: number;
			letterSpacing: number;
			lineHeight: number;
			uppercase: boolean;
	  };

export type GraphicConfig = {
	viewBox: string;
	paths: { d: string; fillRule?: 'nonzero' | 'evenodd' }[];
};

/** Display names for the seeded presets (the seed writes these into design_preset.name). */
export const PRESET_NAMES: Record<TextPresetSlug | GraphicPresetSlug, string> = {
	plain: 'Plain',
	arched: 'Arched',
	outlined: 'Outlined',
	stacked: 'Stacked',
	star: 'Star',
	heart: 'Heart',
	lightning: 'Lightning Bolt',
	mountains: 'Mountain Range',
	wave: 'Wave'
};
export type TextPresetSlug = (typeof TEXT_PRESET_SLUGS)[number];
export type GraphicPresetSlug = (typeof GRAPHIC_PRESET_SLUGS)[number];

export const DEFAULT_PLACEMENT: Customization['placement'] = { x: 0.5, y: 0.35, scale: 1 };

/** Short human summary, e.g. `Text "BABA" · Pacifico · Arched` or `Graphic: Lightning Bolt`. */
export function describeDesign(design: Customization['design']): string {
	if (design.kind === 'text') {
		return `Text "${design.text}" · ${FONTS[design.font].name} · ${PRESET_NAMES[design.presetSlug]}`;
	}
	return `Graphic: ${PRESET_NAMES[design.presetSlug]}`;
}

export function shirtColorName(key: string): string {
	return key in SHIRT_COLORS ? SHIRT_COLORS[key as ShirtColor].name : key;
}
