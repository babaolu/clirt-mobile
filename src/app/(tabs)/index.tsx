import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ErrorState, Logo, Skeleton, Spec } from '../../components/ui';
import { useCatalog } from '../../lib/catalog';
import { ShirtSvg } from '../../lib/svg';
import { formatNaira } from '../../shared/money';
import { renderShirtSvg } from '../../shared/shirt';
import { colors, fonts } from '../../theme';

const SLEEVE = { short: 'Short sleeve', long: 'Long sleeve' } as const;
const NECK = { round: 'Round neck', v: 'V-neck', collar: 'Collar' } as const;

export default function Shop() {
	const { catalog, error, reload } = useCatalog();
	const { width } = useWindowDimensions();
	const [pulling, setPulling] = useState(false);
	const cardWidth = (width - 16 * 2 - 12) / 2;

	const plainShirts = useMemo(
		() =>
			Object.fromEntries(
				(catalog?.styles ?? []).map((s) => [
					s.slug,
					renderShirtSvg({ sleeve: s.sleeve, neck: s.neck, shirtColorHex: '#ffffff', presets: [], idPrefix: `shop-${s.slug}` })
				])
			),
		[catalog]
	);

	return (
		<SafeAreaView style={s.screen} edges={['top']}>
			<FlatList
				data={catalog?.styles ?? []}
				keyExtractor={(item) => item.slug}
				numColumns={2}
				columnWrapperStyle={{ gap: 12 }}
				contentContainerStyle={{ padding: 16, gap: 12 }}
				refreshControl={
					<RefreshControl
						refreshing={pulling}
						colors={[colors.indigo]}
						onRefresh={async () => {
							setPulling(true);
							await reload();
							setPulling(false);
						}}
					/>
				}
				ListHeaderComponent={
					<View style={{ marginBottom: 8 }}>
						<Logo />
						<Text style={s.title}>Choose your shirt</Text>
						{catalog && (
							<Text style={s.lead}>
								Base prices. Text adds {formatNaira(catalog.surcharges.text)}, a graphic {formatNaira(catalog.surcharges.graphic)}.
							</Text>
						)}
					</View>
				}
				ListEmptyComponent={
					error ? (
						<ErrorState message={error} onRetry={reload} />
					) : (
						<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
							{[0, 1, 2, 3].map((i) => (
								<View key={i} style={[s.card, { width: cardWidth }]}>
									<Skeleton style={{ height: cardWidth * 1.1, borderRadius: 0 }} />
									<View style={{ padding: 12, gap: 8 }}>
										<Skeleton style={{ width: '80%', height: 16 }} />
										<Skeleton style={{ width: '60%', height: 12 }} />
										<Skeleton style={{ width: '40%', height: 16 }} />
									</View>
								</View>
							))}
						</View>
					)
				}
				renderItem={({ item }) => (
					<Pressable
						accessibilityRole="button"
						accessibilityLabel={`Customize ${item.name}`}
						onPress={() => router.push(`/design/${item.slug}`)}
						style={({ pressed }) => [s.card, { width: cardWidth }, pressed && { borderColor: colors.indigoSoft }]}
					>
						<View style={s.plate}>
							<ShirtSvg svg={plainShirts[item.slug] ?? ''} width={cardWidth - 32} />
						</View>
						<View style={{ padding: 12, gap: 4 }}>
							<Text style={s.name}>{item.name}</Text>
							<Spec>
								{SLEEVE[item.sleeve]} · {NECK[item.neck]}
							</Spec>
							<Text style={s.price}>{formatNaira(item.basePriceKobo)}</Text>
						</View>
					</Pressable>
				)}
			/>
		</SafeAreaView>
	);
}

const s = StyleSheet.create({
	screen: { flex: 1, backgroundColor: colors.paper },
	title: { fontFamily: fonts.display, fontWeight: '800', fontSize: 28, color: colors.indigo, marginTop: 20 },
	lead: { fontFamily: fonts.body, fontSize: 14, color: colors.slate, marginTop: 4 },
	card: { backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.mist, overflow: 'hidden' },
	plate: { backgroundColor: colors.fog, padding: 16, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.mist },
	name: { fontFamily: fonts.display, fontWeight: '800', fontSize: 15, color: colors.indigo },
	price: { fontFamily: fonts.body, fontWeight: '600', fontSize: 15, color: colors.ink, marginTop: 4 }
});
