import type { EmailStatus, OrderStatus } from './types';

/** Badge labels and tones for order and email statuses (the web's src/lib/order-status.ts). */
export const ORDER_STATUS = {
	pending: { label: 'Pending', tone: 'warning' },
	confirmed: { label: 'Confirmed', tone: 'success' },
	cancelled: { label: 'Cancelled', tone: 'neutral' }
} as const satisfies Record<OrderStatus, { label: string; tone: string }>;

export const EMAIL_STATUS = {
	pending: { label: 'Email pending', tone: 'neutral' },
	sent: { label: 'Email sent', tone: 'success' },
	failed: { label: 'Email failed', tone: 'danger' }
} as const satisfies Record<EmailStatus, { label: string; tone: string }>;

/** Same format as the website: medium date, short time, Lagos time. */
export function formatOrderDate(iso: string) {
	try {
		return new Date(iso).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Lagos' });
	} catch {
		return new Date(iso).toLocaleString();
	}
}
