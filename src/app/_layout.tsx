import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { authClient } from '../lib/auth';
import { CartProvider } from '../lib/cart';
import { CatalogProvider } from '../lib/catalog';
import { OfflineNotice } from '../components/ui';
import { colors, fonts } from '../theme';

// Keep the splash screen up until the stored session has been read (no spinner flash on launch).
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
	const { data: session, isPending } = authClient.useSession();
	const user = session?.user ?? null;

	useEffect(() => {
		if (!isPending) SplashScreen.hideAsync().catch(() => {});
	}, [isPending]);

	if (isPending) return null;

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
							<Stack.Screen name="checkout" options={{ headerShown: true, title: 'Checkout' }} />
							<Stack.Screen name="orders/[id]" options={{ headerShown: true, title: 'Order' }} />
						</Stack.Protected>
						<Stack.Protected guard={!user}>
							<Stack.Screen name="sign-in" />
						</Stack.Protected>
					</Stack>
					<OfflineNotice />
				</CartProvider>
			</CatalogProvider>
		</SafeAreaProvider>
	);
}
