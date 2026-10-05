import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Spec } from '../../components/ui';
import { api } from '../../lib/api';
import { authClient, signOutEverywhere } from '../../lib/auth';
import type { User } from '../../lib/types';
import { colors, fonts } from '../../theme';

export default function Account() {
	const { data: session } = authClient.useSession();
	const [me, setMe] = useState<User | null>(null);
	const [signingOut, setSigningOut] = useState(false);

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
			<View style={{ padding: 16, gap: 16 }}>
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
				<Text style={s.note}>Your cart stays in sync with the Clirt website while you're signed in on both.</Text>
				<Button
					title={signingOut ? 'Signing out…' : 'Sign out'}
					variant="secondary"
					busy={signingOut}
					onPress={async () => {
						setSigningOut(true);
						await signOutEverywhere(); // CartProvider then unsubscribes from live updates
					}}
				/>
			</View>
		</SafeAreaView>
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
	note: { fontFamily: fonts.body, fontSize: 14, color: colors.slate }
});
