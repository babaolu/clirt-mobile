/**
 * Copied from the Clirt web repo (github.com/babaolu/clirt) at src/lib/money.ts (commit 9306083).
 * Keep in sync with the server: only the import paths have been changed.
 */
/** Formats an integer amount of kobo as Naira, e.g. 1250000 -> "₦12,500" (kobo shown only when non-zero). */
export function formatNaira(kobo: number): string {
	if (!Number.isInteger(kobo)) throw new Error(`Money must be integer kobo, got ${kobo}`);
	const sign = kobo < 0 ? '-' : '';
	const abs = Math.abs(kobo);
	const naira = (abs - (abs % 100)) / 100;
	const rest = abs % 100;
	const whole = naira.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
	return `${sign}₦${whole}${rest ? '.' + rest.toString().padStart(2, '0') : ''}`;
}
