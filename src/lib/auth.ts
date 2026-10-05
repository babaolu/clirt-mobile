import { createAuthClient } from 'better-auth/react';
import { expoClient } from '@better-auth/expo/client';
import * as SecureStore from 'expo-secure-store';
import { API_BASE } from '../config';

/**
 * Better Auth client for the Clirt server (same accounts as the website).
 * Google sign-in runs in the system browser and returns to clirt://; the session cookie is kept in SecureStore.
 */
export const authClient = createAuthClient({
	baseURL: API_BASE,
	plugins: [
		expoClient({
			scheme: 'clirt',
			storagePrefix: 'clirt',
			storage: SecureStore
		})
	]
});

/** Sign out locally even if the server call fails (e.g. the session already expired). */
export async function signOutEverywhere() {
	try {
		await authClient.signOut();
	} catch {
		// ignore: local state is cleared below
	}
	authClient.$store.notify('$sessionSignal');
}
