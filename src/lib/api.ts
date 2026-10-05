import { API_BASE } from '../config';
import { authClient, signOutEverywhere } from './auth';

/** The API's error envelope: { error: { code, message, fields? } }. */
export class ApiError extends Error {
	constructor(
		readonly status: number,
		readonly code: string,
		message: string,
		readonly fields?: Record<string, string>
	) {
		super(message);
		this.name = 'ApiError';
	}
}

type Options = { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; body?: unknown };

/**
 * Authed fetch for /api/v1/*: sends the Better Auth session cookie as the Cookie header
 * (credentials: 'omit' per the Better Auth Expo docs). A 401 signs the user out, which sends them
 * back to the sign-in screen.
 */
export async function api<T>(path: string, { method = 'GET', body }: Options = {}): Promise<T> {
	const cookie = await authClient.getCookie();
	const headers: Record<string, string> = { Accept: 'application/json' };
	if (cookie) headers.Cookie = cookie;
	if (body !== undefined) headers['Content-Type'] = 'application/json';

	let res: Response;
	try {
		res = await fetch(API_BASE + path, {
			method,
			headers,
			body: body === undefined ? undefined : JSON.stringify(body),
			credentials: 'omit'
		});
	} catch {
		throw new ApiError(0, 'network', "Couldn't reach Clirt. Check your connection and try again.");
	}

	const json = (await res.json().catch(() => null)) as
		| (T & { error?: { code: string; message: string; fields?: Record<string, string> } })
		| null;

	if (res.status === 401) {
		await signOutEverywhere();
		throw new ApiError(401, 'unauthorized', 'Please sign in again.');
	}
	if (!res.ok) {
		const err = json?.error;
		throw new ApiError(res.status, err?.code ?? 'http_error', err?.message ?? `Request failed (${res.status}).`, err?.fields);
	}
	return json as T;
}

/** Public endpoints (no cookie). */
export async function publicApi<T>(path: string): Promise<T> {
	const res = await fetch(API_BASE + path, { headers: { Accept: 'application/json' } });
	if (!res.ok) throw new ApiError(res.status, 'http_error', `Request failed (${res.status}).`);
	return (await res.json()) as T;
}
