/** Clirt brand tokens, from the website's src/routes/layout.css (@theme). */
export const colors = {
	paper: '#f5f7fb',
	mist: '#dde3ef',
	fog: '#eef1f7',
	indigo: '#1f2a5c',
	indigoSoft: '#3a4a8c',
	marigold: '#f2b230',
	marigoldSoft: '#fbe7b5',
	ink: '#12131a',
	slate: '#545a70',
	leaf: '#1e7a55',
	leafSoft: '#dcf1e7',
	alert: '#c2352b',
	alertSoft: '#fbe3e0',
	white: '#ffffff'
} as const;

/** Embedded with the expo-font config plugin (see app.json). */
export const fonts = {
	display: 'Bricolage Grotesque', // weight 800
	body: 'Instrument Sans', // weights 400, 600
	mono: 'Space Mono' // weights 400, 700
} as const;

export const type = {
	display: { fontFamily: fonts.display, fontWeight: '800' as const, color: colors.indigo },
	body: { fontFamily: fonts.body, fontWeight: '400' as const, color: colors.ink },
	bodyBold: { fontFamily: fonts.body, fontWeight: '600' as const, color: colors.ink },
	spec: { fontFamily: fonts.mono, fontWeight: '400' as const, fontSize: 11, letterSpacing: 1, color: colors.slate, textTransform: 'uppercase' as const }
};
