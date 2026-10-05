import { ActivityIndicator, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { authClient } from '../lib/auth';
import { CartProvider } from '../lib/cart';
import { CatalogProvider } from '../lib/catalog';
import { colors, fonts } from '../theme';

export default function RootLayout() {
	const { data: session, isPending } = authClient.useSession();
	const user = session?.user ?? null;

	if (isPending) {
		return (
			<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper }}>
				<ActivityIndicator color={colors.indigo} size="large" />
			</View>
		);
	}

	return (
		<SafeAreaProvider>
			<CatalogProvider>
				<CartProvider userId={user?.id ?? null}>
					<StatusBar style="dark" />
					<Stack
						screenOptions={{
							headerShown: false,
							contentStyle: { backgroundColor: colors.paper },
							headerStyle: { backgroundColor: colors.paper },
							headerTintColor: colors.indigo,
							headerTitleStyle: { fontFamily: fonts.display, fontWeight: '800' },
							headerShadowVisible: false
						}}
					>
						<Stack.Protected guard={!!user}>
							<Stack.Screen name="(tabs)" />
							<Stack.Screen name="design/[slug]" options={{ headerShown: true, title: 'Design' }} />
						</Stack.Protected>
						<Stack.Protected guard={!user}>
							<Stack.Screen name="sign-in" />
						</Stack.Protected>
					</Stack>
				</CartProvider>
			</CatalogProvider>
		</SafeAreaProvider>
	);
}
