import type { Customization, GraphicConfig, TextStyleConfig } from '../shared/customization';

export type Style = {
	slug: string;
	name: string;
	sleeve: 'short' | 'long';
	neck: 'round' | 'v' | 'collar';
	basePriceKobo: number;
};

export type Preset =
	| { slug: string; name: string; kind: 'text_style'; config: TextStyleConfig }
	| { slug: string; name: string; kind: 'graphic'; config: GraphicConfig };

export type Catalog = {
	styles: Style[];
	presets: Preset[];
	sizes: string[];
	surcharges: { text: number; graphic: number };
};

export type CartItem = {
	id: number;
	styleSlug: string;
	styleName: string;
	size: string;
	quantity: number;
	customization: Customization;
	designSummary: string;
	unitPriceKobo: number;
	lineTotalKobo: number;
	previewSvg: string;
	problem: string | null;
};

export type Cart = { items: CartItem[]; itemCount: number; subtotalKobo: number };

export type User = { id: string; name: string; email: string; image: string | null };

export type OrderStatus = 'pending' | 'confirmed' | 'cancelled';
export type EmailStatus = 'pending' | 'sent' | 'failed';

export type OrderSummary = {
	id: string;
	number: string;
	createdAt: string;
	status: OrderStatus;
	emailStatus: EmailStatus;
	totalKobo: number;
	itemCount: number;
};

export type OrderItem = {
	id: number;
	styleName: string;
	size: string;
	quantity: number;
	unitPriceKobo: number;
	lineTotalKobo: number;
	customization: Customization;
	colorName: string;
	designSummary: string;
	previewSvg: string;
};

export type Order = Omit<OrderSummary, 'itemCount'> & {
	subtotalKobo: number;
	contactEmail: string;
	shippingName: string;
	phone: string;
	address: string;
	city: string;
	state: string;
	notes: string | null;
	emailError: string | null;
	items: OrderItem[];
};

export type CheckoutInput = {
	contactEmail: string;
	shippingName: string;
	phone: string;
	address: string;
	city: string;
	state: string;
	notes: string;
};
