/** A one-shot notice for the sign-in screen, e.g. after the account is deleted (it can't take route params:
 * the protected-route guard sends the user there when the session ends). */
let pending: string | null = null;

export function setFlash(message: string) {
	pending = message;
}

export function takeFlash() {
	const message = pending;
	pending = null;
	return message;
}
