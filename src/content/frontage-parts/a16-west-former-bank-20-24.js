// Area a16-west-former-bank-20-24: the former bank (Barclays) at 20/24 Hamilton Road, corner of Orwell Road, from the Street View
// photos former-bank-24-front / former-bank-24-corner / former-barclays-20-side (supplied 26 Oct 2026). OSM way 688756416 is the
// whole bank; its north neighbour (Greggs, 733112155) belongs to a15. Heights and positions are scaled from the photos, not surveyed.
// The stepped gables, terracotta dressings, windows and the corner tower are drawn by the `bankFront` feature
// (world/features/a16-west-former-bank-20-24.js), so the generic window texture is switched off for this building.
export const FRONTAGES = {   // keyed by OSM building way id (same format as content/frontages.js FRONTAGES)
  688756416: {
    addr: 'Former bank (Barclays), 20-24 Hamilton Road, Orwell Road corner', photo: 'former-bank-24-front.png; former-bank-24-corner.png; former-barclays-20-side.png',
    height: 7.6, force: true, roofShape: 'hipped-inset',
    style: { facade: 'brick_red', tint: [1, 0.86, 0.72], roof: 'clay', roofTint: [0.62, 0.36, 0.28], windows: false },
    details: [{ t: 'bankFront' }],
  },
};
export const SPLITS = {};      // keyed by OSM building way id: { at: 0.5 } etc. (same format as content/frontages.js SPLITS)
export const AREAS = {};       // keyed by OSM area id (same format as FRONTAGE_AREAS)
export const FASCIAS = {};     // shop sign styles by shop name (same fields as BRAND_STYLES entries)
export const OVERRIDES = {};   // business overrides by OSM node id, e.g. n123 (same format as shops.js OVERRIDES)
export const ADDITIONS = [];     // businesses missing from OSM (same format as shops.js ADDITIONS)
