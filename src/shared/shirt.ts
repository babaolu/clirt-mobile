/**
 * Copied from the Clirt web repo (github.com/babaolu/clirt) at src/lib/render/shirt.ts (commit 48a3d6b).
 * Keep in sync with the server: only the import paths have been changed.
 */
/**
 * Pure SVG renderer for a flat front-view T-shirt with an optional design.
 * No DOM access: runs in the browser (live preview) and on the server (order snapshots).
 */
import {
	FONTS,
	type Customization,
	type GraphicConfig,
	type TextStyleConfig
} from './customization';

export type Sleeve = 'short' | 'long';
export type Neck = 'round' | 'v' | 'collar';

export type RenderPreset = { slug: string; kind: 'text_style' | 'graphic'; config: unknown };

export type RenderShirtOptions = {
	sleeve: Sleeve;
	neck: Neck;
	shirtColorHex: string;
	design?: Customization['design'] | null;
	placement?: Customization['placement'];
	presets: readonly RenderPreset[];
	/** Prefix for every id in the SVG, so several SVGs on one page don't clash. */
	idPrefix: string;
	/** Draw a dashed outline of the printable area (customizer only). */
	showPrintArea?: boolean;
	/** Extra attributes for the root element, e.g. a class. */
	className?: string;
	title?: string;
};

export const VIEW_W = 400;
export const VIEW_H = 440;

/** Printable chest area in shirt coordinates. */
export const PRINT_AREA = { x: 135, y: 130, w: 130, h: 180 } as const;

const DEFAULT_PLACEMENT = { x: 0.5, y: 0.35, scale: 1 };

export function escapeXml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

/** Only accept #rrggbb; anything else falls back so it can't break out of an attribute. */
function safeHex(value: string | undefined, fallback: string): string {
	return value && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

function safeId(prefix: string): string {
	return prefix.replace(/[^A-Za-z0-9_-]/g, '') || 'shirt';
}

function mix(hex: string, target: string, amount: number): string {
	const a = parseInt(hex.slice(1), 16);
	const b = parseInt(target.slice(1), 16);
	const channel = (shift: number) => {
		const ca = (a >> shift) & 255;
		const cb = (b >> shift) & 255;
		return Math.round(ca + (cb - ca) * amount);
	};
	return '#' + [16, 8, 0].map((s) => channel(s).toString(16).padStart(2, '0')).join('');
}

function luminance(hex: string): number {
	const n = parseInt(hex.slice(1), 16);
	const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
		const s = c / 255;
		return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const n = (value: number) => Number(value.toFixed(2));

/** Mirror an "x y x y ..." point list around the shirt's vertical centre line. */
function mirrorPath(d: string): string {
	return d.replace(
		/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g,
		(_, x, y) => `${VIEW_W - Number(x)} ${y}`
	);
}

const BODY =
	'M160 46 L106 64 Q98 68 98 78 L102 150 L100 410 Q100 420 110 420 L290 420 Q300 420 300 410 L298 150 L302 78 Q302 68 294 64 L240 46';
const NECKLINE: Record<Neck, string> = {
	round: 'Q200 92 160 46 Z',
	v: 'L200 112 L160 46 Z',
	collar: 'Q200 80 160 46 Z'
};
const NECK_TRIM: Record<Neck, string> = {
	round: 'M160 46 Q200 92 240 46',
	v: 'M160 46 L200 112 L240 46',
	collar: 'M160 46 Q200 80 240 46'
};
const SLEEVE_LEFT: Record<Sleeve, string> = {
	short: 'M112 62 L58 112 Q48 122 56 132 L80 164 Q86 170 92 164 L104 150 Z',
	long: 'M112 62 L66 128 Q58 140 57 152 L40 376 Q40 384 48 384 L70 386 Q78 386 78 378 L94 198 L104 152 Z'
};
const CUFF_LEFT: Record<Sleeve, string> = {
	short: 'M60 136 L84 166',
	long: 'M41 366 L78 369'
};

function textElement(
	design: Extract<Customization['design'], { kind: 'text' }>,
	config: TextStyleConfig,
	cx: number,
	cy: number,
	scale: number,
	id: string
): string {
	const font = FONTS[design.font];
	const color = safeHex(design.textColor, '#111111');
	const fontSize = config.fontSize * PRINT_AREA.w * scale;
	const letterSpacing = config.letterSpacing * fontSize;
	const maxWidth = PRINT_AREA.w * 0.96;
	const common = `font-family="${escapeXml(font.family)}" font-weight="${font.weight}" font-size="${n(fontSize)}" letter-spacing="${n(letterSpacing)}"`;
	// Rough width estimate: squeeze long lines to fit the print area instead of clipping them.
	const fit = (line: string) => {
		const estimate = line.length * fontSize * 0.6 + line.length * letterSpacing;
		return estimate > maxWidth
			? ` textLength="${n(maxWidth)}" lengthAdjust="spacingAndGlyphs"`
			: '';
	};

	switch (config.effect) {
		case 'arc': {
			const r = config.radius * PRINT_AREA.w * scale;
			const half = (config.arcDegrees / 2) * (Math.PI / 180);
			const centreY = cy + fontSize * 0.35 + r;
			const x1 = cx - r * Math.sin(half);
			const x2 = cx + r * Math.sin(half);
			const y = centreY - r * Math.cos(half);
			const large = config.arcDegrees > 180 ? 1 : 0;
			const pathId = `${id}-arc`;
			return (
				`<path id="${pathId}" d="M${n(x1)} ${n(y)} A${n(r)} ${n(r)} 0 ${large} 1 ${n(x2)} ${n(y)}" fill="none"/>` +
				`<text ${common} fill="${color}"><textPath href="#${pathId}" startOffset="50%" text-anchor="middle">${escapeXml(design.text)}</textPath></text>`
			);
		}
		case 'outline': {
			const stroke = Math.max(1, config.strokeWidth * PRINT_AREA.w * scale);
			return `<text x="${n(cx)}" y="${n(cy)}" ${common} text-anchor="middle" dominant-baseline="central" fill="none" stroke="${color}" stroke-width="${n(stroke)}" stroke-linejoin="round"${fit(design.text)}>${escapeXml(design.text)}</text>`;
		}
		case 'stack': {
			const text = config.uppercase ? design.text.toUpperCase() : design.text;
			const words = text.split(/\s+/).filter(Boolean);
			const lineStep = fontSize * config.lineHeight;
			const top = cy - ((words.length - 1) * lineStep) / 2;
			const lines = words
				.map(
					(word, i) =>
						`<tspan x="${n(cx)}" y="${n(top + i * lineStep)}"${fit(word)}>${escapeXml(word)}</tspan>`
				)
				.join('');
			return `<text ${common} text-anchor="middle" dominant-baseline="central" fill="${color}">${lines}</text>`;
		}
		default:
			return `<text x="${n(cx)}" y="${n(cy)}" ${common} text-anchor="middle" dominant-baseline="central" fill="${color}"${fit(design.text)}>${escapeXml(design.text)}</text>`;
	}
}

function graphicElement(
	config: GraphicConfig,
	color: string,
	cx: number,
	cy: number,
	scale: number
): string {
	const [, , vbW = 100, vbH = 100] = config.viewBox.split(/[\s,]+/).map(Number);
	const size = PRINT_AREA.w * 0.75 * scale;
	const s = size / Math.max(vbW, vbH);
	const tx = cx - (vbW * s) / 2;
	const ty = cy - (vbH * s) / 2;
	const paths = config.paths
		.map(
			(p) =>
				`<path d="${escapeXml(p.d)}"${p.fillRule ? ` fill-rule="${p.fillRule === 'evenodd' ? 'evenodd' : 'nonzero'}"` : ''}/>`
		)
		.join('');
	return `<g transform="translate(${n(tx)} ${n(ty)}) scale(${n(s * 1000) / 1000})" fill="${safeHex(color, '#111111')}">${paths}</g>`;
}

export function renderShirtSvg(options: RenderShirtOptions): string {
	const id = safeId(options.idPrefix);
	const fill = safeHex(options.shirtColorHex, '#ffffff');
	const dark = luminance(fill) < 0.12;
	const outline = dark ? mix(fill, '#ffffff', 0.22) : mix(fill, '#000000', 0.28);
	const seam = dark ? mix(fill, '#ffffff', 0.12) : mix(fill, '#000000', 0.14);
	const inner = mix(fill, '#000000', dark ? 0.35 : 0.18);
	const stroke = `stroke="${outline}" stroke-width="2" stroke-linejoin="round"`;

	const sleeveL = SLEEVE_LEFT[options.sleeve];
	const sleeves = [sleeveL, mirrorPath(sleeveL)]
		.map(
			(d) => `<path d="${d}" fill="${fill}" ${stroke}/><path d="${d}" fill="url(#${id}-sleeve)"/>`
		)
		.join('');
	const cuffs = [CUFF_LEFT[options.sleeve], mirrorPath(CUFF_LEFT[options.sleeve])]
		.map((d) => `<path d="${d}" fill="none" stroke="${seam}" stroke-width="2"/>`)
		.join('');

	const body = `${BODY} ${NECKLINE[options.neck]}`;
	const neckTrim = `<path d="${NECK_TRIM[options.neck]}" fill="none" stroke="${seam}" stroke-width="7" stroke-linejoin="miter"/><path d="${NECK_TRIM[options.neck]}" fill="none" ${stroke}/>`;

	let collar = '';
	if (options.neck === 'collar') {
		const flapL = 'M158 40 L200 72 L184 100 Q182 104 178 101 L146 62 Z';
		collar =
			`<rect x="192" y="68" width="16" height="64" rx="2" fill="${fill}" ${stroke}/>` +
			`<circle cx="200" cy="90" r="3" fill="${seam}"/><circle cx="200" cy="114" r="3" fill="${seam}"/>` +
			`<path d="M158 40 Q200 28 242 40 L240 50 Q200 40 160 50 Z" fill="${inner}" ${stroke}/>` +
			[flapL, mirrorPath(flapL)].map((d) => `<path d="${d}" fill="${fill}" ${stroke}/>`).join('');
	}

	let designSvg = '';
	const design = options.design;
	if (design) {
		const placement = options.placement ?? DEFAULT_PLACEMENT;
		const clamp = (v: number, lo: number, hi: number) =>
			Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo));
		const cx = PRINT_AREA.x + clamp(placement.x, 0, 1) * PRINT_AREA.w;
		const cy = PRINT_AREA.y + clamp(placement.y, 0, 1) * PRINT_AREA.h;
		const scale = clamp(placement.scale, 0.4, 1.6);
		const preset = options.presets.find(
			(p) =>
				p.slug === design.presetSlug &&
				p.kind === (design.kind === 'text' ? 'text_style' : 'graphic')
		);
		let content = '';
		if (preset && design.kind === 'text' && design.font in FONTS) {
			content = textElement(design, preset.config as TextStyleConfig, cx, cy, scale, id);
		} else if (preset && design.kind === 'graphic') {
			content = graphicElement(preset.config as GraphicConfig, design.graphicColor, cx, cy, scale);
		}
		if (content) designSvg = `<g clip-path="url(#${id}-print)">${content}</g>`;
	}

	const printGuide = options.showPrintArea
		? `<rect x="${PRINT_AREA.x}" y="${PRINT_AREA.y}" width="${PRINT_AREA.w}" height="${PRINT_AREA.h}" fill="none" stroke="${dark ? '#ffffff' : '#000000'}" stroke-opacity="0.25" stroke-dasharray="4 4"/>`
		: '';

	return (
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEW_W} ${VIEW_H}" role="img"` +
		(options.className ? ` class="${escapeXml(options.className)}"` : '') +
		`>` +
		(options.title ? `<title>${escapeXml(options.title)}</title>` : '') +
		`<defs>` +
		`<linearGradient id="${id}-shade" x1="0" x2="1" y1="0" y2="0">` +
		`<stop offset="0" stop-color="#000" stop-opacity="0.12"/><stop offset="0.22" stop-color="#000" stop-opacity="0"/>` +
		`<stop offset="0.78" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.12"/>` +
		`</linearGradient>` +
		`<linearGradient id="${id}-sleeve" x1="0" x2="0" y1="0" y2="1">` +
		`<stop offset="0" stop-color="#fff" stop-opacity="0.06"/><stop offset="1" stop-color="#000" stop-opacity="0.1"/>` +
		`</linearGradient>` +
		`<clipPath id="${id}-print"><rect x="${PRINT_AREA.x}" y="${PRINT_AREA.y}" width="${PRINT_AREA.w}" height="${PRINT_AREA.h}"/></clipPath>` +
		`</defs>` +
		sleeves +
		cuffs +
		`<path d="M160 46 Q200 36 240 46 L240 116 L160 116 Z" fill="${inner}"/>` +
		`<path d="${body}" fill="${fill}" ${stroke}/>` +
		`<path d="${body}" fill="url(#${id}-shade)"/>` +
		`<path d="M104 404 L296 404" stroke="${seam}" stroke-width="2"/>` +
		neckTrim +
		collar +
		designSvg +
		printGuide +
		`</svg>`
	);
}

/** Small standalone icon for a graphic preset (customizer thumbnails). */
export function renderGraphicIcon(config: GraphicConfig, color: string): string {
	const paths = config.paths
		.map(
			(p) =>
				`<path d="${escapeXml(p.d)}"${p.fillRule === 'evenodd' ? ' fill-rule="evenodd"' : ''}/>`
		)
		.join('');
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${escapeXml(config.viewBox)}" fill="${safeHex(color, '#111111')}" aria-hidden="true">${paths}</svg>`;
}
