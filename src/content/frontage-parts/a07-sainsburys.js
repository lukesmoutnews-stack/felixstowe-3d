// Area a07-sainsburys: data only. Add entries for your own buildings here and nowhere else.
export const FRONTAGES = {};   // keyed by OSM building way id (same format as content/frontages.js FRONTAGES)
export const SPLITS = {};      // keyed by OSM building way id: { at: 0.5 } etc. (same format as content/frontages.js SPLITS)
export const AREAS = {};       // keyed by OSM area id (same format as FRONTAGE_AREAS)
export const FASCIAS = {};     // shop sign styles by shop name (same fields as BRAND_STYLES entries)
export const OVERRIDES = {};   // business overrides by OSM node id, e.g. n123 (same format as shops.js OVERRIDES)
export const ADDITIONS = [];     // businesses missing from OSM (same format as shops.js ADDITIONS)
