import { memo } from 'react';
import { SvgXml } from 'react-native-svg';
import { VIEW_H, VIEW_W } from '../shared/shirt';

/**
 * Adapts SVG from the shared renderer (and stored server previews) for react-native-svg on Android:
 * Android resolves a single family name, so "'Montserrat', sans-serif" becomes "Montserrat"
 * (the name the font is embedded under in app.json). <title> and role are dropped.
 *
 * Two text attributes react-native-svg handles differently from browsers:
 * - `dominant-baseline` isn't parsed, so "central" becomes the supported `alignment-baseline` (inherited
 *   by tspans), which vertically centres text on its y the way the web does.
 * - `text-anchor` on a <textPath> is ignored (the anchor comes from the parent <text>), so it is moved
 *   to the <text>; otherwise arched text starts at the arc's midpoint instead of centring on it.
 */
export function toNativeSvg(svg: string): string {
	return svg
		.replace(/font-family="([^"]*)"/g, (_, value: string) => {
			const first = value.replace(/&apos;|&quot;|'|"/g, '').split(',')[0].trim();
			return `font-family="${first}"`;
		})
		.replace(/dominant-baseline="/g, 'alignment-baseline="')
		.replace(/<text([^>]*)><textPath([^>]*?) text-anchor="([a-z]+)"/g, '<text$1 text-anchor="$3"><textPath$2')
		.replace(/<title>[\s\S]*?<\/title>/g, '')
		.replace(/ role="img"/g, '');
}

/** A shirt SVG string (from renderShirtSvg or an API previewSvg) at the renderer's aspect ratio. */
export const ShirtSvg = memo(function ShirtSvg({ svg, width }: { svg: string; width: number }) {
	return <SvgXml xml={toNativeSvg(svg)} width={width} height={(width * VIEW_H) / VIEW_W} />;
});
