import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';
import { authClient } from '../lib/auth';
import { takeFlash } from '../lib/flash';
import { Button, Logo } from '../components/ui';
import { colors, fonts } from '../theme';

const GOOGLE_G = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>`;

export default function SignIn() {
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [notice] = useState(takeFlash); // e.g. "Your Clirt account has been deleted."

	async function continueWithGoogle() {
		setBusy(true);
		setError(null);
		try {
			// Opens Google in the system browser; the server returns to clirt:// with the session.
			const { error: signInError } = await authClient.signIn.social({ provider: 'google', callbackURL: '/' });
			if (signInError) setError(signInError.message ?? 'Google sign-in did not complete. Please try again.');
		} catch {
			setError("Couldn't reach Clirt. Check your connection and try again.");
		} finally {
			setBusy(false);
		}
	}

	return (
		<SafeAreaView style={s.screen}>
			<View style={s.top}>
				<Logo size={40} />
			</View>
			<View style={s.body}>
				{notice && (
					<View accessibilityRole="alert" style={s.notice}>
						<Text style={s.noticeText}>{notice}</Text>
					</View>
				)}
				<Text style={s.spec}>Custom tees · Printed in Nigeria</Text>
				<Text style={s.title}>Say it on a tee.</Text>
				<Text style={s.lead}>Sign in to design shirts and keep one cart across your phone and the web.</Text>
				{error && <Text style={s.error}>{error}</Text>}
				<Button
					title={busy ? 'Opening Google…' : 'Continue with Google'}
					variant="secondary"
					busy={busy}
					icon={busy ? undefined : <SvgXml xml={GOOGLE_G} width={20} height={20} />}
					onPress={continueWithGoogle}
					style={{ marginTop: 28 }}
				/>
				<Text style={s.small}>We only receive your name, email address and profile picture.</Text>
			</View>
		</SafeAreaView>
	);
}

const s = StyleSheet.create({
	screen: { flex: 1, backgroundColor: colors.paper, paddingHorizontal: 24 },
	top: { paddingTop: 16 },
	body: { flex: 1, justifyContent: 'center', paddingBottom: 48 },
	spec: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1, color: colors.slate, textTransform: 'uppercase' },
	title: {
		fontFamily: fonts.display,
		fontWeight: '800',
		fontSize: 44,
		lineHeight: 48,
		color: colors.indigo,
		marginTop: 10,
		textShadowColor: colors.marigold,
		textShadowOffset: { width: 3, height: 3 },
		textShadowRadius: 0.1
	},
	lead: { fontFamily: fonts.body, fontSize: 17, lineHeight: 25, color: colors.slate, marginTop: 14 },
	notice: { backgroundColor: colors.leafSoft, borderRadius: 12, padding: 14, marginBottom: 24 },
	noticeText: { fontFamily: fonts.body, fontWeight: '600', fontSize: 15, color: colors.leaf },
	error: { fontFamily: fonts.body, color: colors.alert, marginTop: 18, fontSize: 15 },
	small: { fontFamily: fonts.body, color: colors.slate, fontSize: 13, marginTop: 16, textAlign: 'center' }
});
