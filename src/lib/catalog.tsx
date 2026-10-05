import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { publicApi } from './api';
import type { Catalog } from './types';

type CatalogState = { catalog: Catalog | null; error: string | null; reload: () => void };
const CatalogContext = createContext<CatalogState>({ catalog: null, error: null, reload: () => {} });

/** GET /api/v1/catalog once (public); styles, presets and surcharges for every screen. */
export function CatalogProvider({ children }: { children: ReactNode }) {
	const [catalog, setCatalog] = useState<Catalog | null>(null);
	const [error, setError] = useState<string | null>(null);

	const reload = useCallback(() => {
		setError(null);
		publicApi<Catalog>('/api/v1/catalog')
			.then(setCatalog)
			.catch(() => setError("Couldn't load the shop. Check your connection."));
	}, []);

	useEffect(reload, [reload]);
	return <CatalogContext.Provider value={{ catalog, error, reload }}>{children}</CatalogContext.Provider>;
}

export const useCatalog = () => useContext(CatalogContext);
