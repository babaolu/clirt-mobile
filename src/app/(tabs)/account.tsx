import { useEffect, useState } from 'react';
import { Image, KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Input, Spec } from '../../components/ui';
import { API_BASE } from '../../config';
import { ApiError, api } from '../../lib/api';
import { authClient, signOutEverywhere } from '../../lib/auth';
import { setFlash } from '../../lib/flash';
import type { User } from '../../lib/types';
import { colors, fonts } from '../../theme';

const PRIVACY_URL = `${API_BASE}/privacy`;

export default function Account() {
	const { data: session } = authClient.useSession();
	const [me, setMe] = useState<User | null>(null);
	const [signingOut, setSigningOut] = useState(false);
	const [confirmingDelete, setConfirmingDelete] = useState(false);

	useEffect(() => {
		api<{ user: User }>('/api/v1/me')
			.then((r) => setMe(r.user))
			.catch(() => {});
	}, []);

	const user = me ?? (session?.user ? { ...session.user, image: session.user.image ?? null } : null);
	const initials = (user?.name || user?.email || '?')
		.split(/\s+/)
		.map((p) => p[0])
		.slice(0, 2)
		.join('')
		.toUpperCase();

	return (
		<SafeAreaView style={s.screen} edges={['top']}>
			<ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
				<Text style={s.title}>Account</Text>
				<Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
					{user?.image ? (
						<Image source={{ uri: user.image }} style={s.avatar} accessibilityIgnoresInvertColors />
					) : (
						<View style={[s.avatar, s.initials]}>
							<Text style={s.initialsText}>{initials}</Text>
						</View>
					)}
					<View style={{ flex: 1, gap: 2 }}>
						<Text style={s.name}>{user?.name ?? ''}</Text>
						<Text style={s.email} numberOfLines={1}>
							{user?.email ?? ''}
						</Text>
						<Spec>Signed in with Google</Spec>
					</View>
				</Card>
				<Text style={s.note}>Your cart and orders stay in sync with the Clirt website while you're signed in on both.</Text>

				<Card style={{ padding: 0 }}>
					<Pressable
						accessibilityRole="link"
						onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL).catch(() => {})}
						style={({ pressed }) => [s.linkRow, pressed && { backgroundColor: colors.fog }]}
					>
						<Text style={s.linkText}>Privacy policy</Text>
						<Text style={s.linkHint}>Opens in browser ↗</Text>
					</Pressable>
				</Card>

				<Button
					title={signingOut ? 'Signing out…' : 'Sign out'}
					variant="secondary"
					busy={signingOut}
					onPress={async () => {
						setSigningOut(true);
						await signOutEverywhere(); // CartProvider then unsubscribes from live updates
					}}
				/>

				<View style={s.danger}>
					<Text style={s.dangerTitle}>Danger zone</Text>
					<Text style={s.body}>
						Deleting your account removes your profile, cart and order history from Clirt, on the website too. This can't be undone.
					</Text>
					<Button title="Delete my account" variant="dangerSolid" onPress={() => setConfirmingDelete(true)} style={{ alignSelf: 'flex-start' }} />
				</View>
			</ScrollView>

			<DeleteAccountDialog visible={confirmingDelete} email={user?.email ?? ''} onClose={() => setConfirmingDelete(false)} />
		</SafeAreaView>
	);
}

/** Type DELETE to confirm → DELETE /api/v1/me → sign out locally (which also unsubscribes Pusher). */
function DeleteAccountDialog({ visible, email, onClose }: { visible: boolean; email: string; onClose: () => void }) {
	const [typed, setTyped] = useState('');
	const [deleting, setDeleting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const confirmed = typed.trim() === 'DELETE';

	function close() {
		if (deleting) return;
		setTyped('');
		setError(null);
		onClose();
	}

	async function deleteAccount() {
		if (!confirmed || deleting) return;
		setDeleting(true);
		setError(null);
		try {
			await api<{ deleted: boolean }>('/api/v1/me', { method: 'DELETE' });
			setFlash('Your Clirt account has been deleted.');
			await signOutEverywhere(); // clears the stored session; the guard returns to sign-in
		} catch (err) {
			if (err instanceof ApiError && err.status === 401) return;
			setError(err instanceof Error ? err.message : 'Your account was not deleted. Please try again.');
			setDeleting(false);
		}
	}

	return (
		<Modal visible={visible} transparent animationType="fade" onRequestClose={close} statusBarTranslucent navigationBarTranslucent>
			<KeyboardAvoidingView behavior="padding" style={s.scrim}>
				<View style={s.dialog} accessibilityViewIsModal>
					<Text style={s.dialogTitle}>Delete your account?</Text>
					<Text style={s.body}>
						This permanently deletes {email ? <Text style={{ fontWeight: '600' }}>{email}</Text> : 'your account'} and everything tied to it:
						your cart, orders and sign-in. Type DELETE to confirm.
					</Text>
					<Input
						value={typed}
						onChangeText={setTyped}
						autoCapitalize="characters"
						autoCorrect={false}
						placeholder="DELETE"
						accessibilityLabel="Type DELETE to confirm"
						editable={!deleting}
						style={s.input}
					/>
					{error && <Text style={s.error}>{error}</Text>}
					<View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
						<Button title="Cancel" variant="ghost" onPress={close} disabled={deleting} />
						<Button title={deleting ? 'Deleting…' : 'Delete account'} variant="dangerSolid" busy={deleting} disabled={!confirmed} onPress={deleteAccount} />
					</View>
				</View>
			</KeyboardAvoidingView>
		</Modal>
	);
}

const s = StyleSheet.create({
	screen: { flex: 1, backgroundColor: colors.paper },
	title: { fontFamily: fonts.display, fontWeight: '800', fontSize: 30, color: colors.indigo },
	avatar: { width: 56, height: 56, borderRadius: 28 },
	initials: { backgroundColor: colors.indigo, alignItems: 'center', justifyContent: 'center' },
	initialsText: { fontFamily: fonts.mono, fontWeight: '700', color: colors.paper, fontSize: 18 },
	name: { fontFamily: fonts.display, fontWeight: '800', fontSize: 18, color: colors.indigo },
	email: { fontFamily: fonts.body, fontSize: 14, color: colors.slate },
	note: { fontFamily: fonts.body, fontSize: 14, color: colors.slate },
	body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.ink },
	linkRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, borderRadius: 16 },
	linkText: { fontFamily: fonts.body, fontWeight: '600', fontSize: 16, color: colors.indigo },
	linkHint: { fontFamily: fonts.body, fontSize: 13, color: colors.slate },
	danger: { borderWidth: 1, borderColor: colors.alert, borderRadius: 16, padding: 16, gap: 12, backgroundColor: colors.alertSoft, marginTop: 8 },
	dangerTitle: { fontFamily: fonts.display, fontWeight: '800', fontSize: 18, color: colors.alert },
	scrim: { flex: 1, backgroundColor: 'rgba(18,19,26,0.5)', justifyContent: 'center', padding: 20 },
	dialog: { backgroundColor: colors.white, borderRadius: 18, padding: 20, gap: 14 },
	dialogTitle: { fontFamily: fonts.display, fontWeight: '800', fontSize: 22, color: colors.ink },
	input: { borderWidth: 1.5, borderColor: colors.alert, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontFamily: fonts.mono, fontSize: 18, letterSpacing: 2, color: colors.ink },
	error: { fontFamily: fonts.body, fontSize: 14, color: colors.alert }
});
