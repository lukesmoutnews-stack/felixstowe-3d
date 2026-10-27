// Area a08-station-building: Great Eastern Square, from the user's Street View photos (docs/research/hamilton-road-streetview:
// e-ges-station-building-1/2, e-ges-station-busshelter, e-ges-hoarding-pine). Heights are scaled from the photos (door about 2.2 m),
// not surveyed. Building ids are OSM way ids.
//   357281655  the Edwardian former station building (OSM calls it "Great Eastern Square", with Chuffers / Co-op Travel / Suffolk
//              Building Society inside the footprint): red brick, dark clay-tile hipped roof, two Dutch gables with stone dressings,
//              copper-roofed cupola, glazed entrance canopy. Its eaves are about 4.5 m. The footprint is a plain box at that height; the
//              roof, gables, cupola, chimneys, canopy, bollards, bus shelter, totem sign, blue hoarding and the pine are all built
//              by the a08Station feature (world/features/a08-station-building.js).
export const FRONTAGES = {
  357281655: { addr: 'Great Eastern Square, former station building', photo: 'e-ges-station-building-2.png', height: 4.5, force: true, roofShape: 'flat',
    style: { facade: 'brick_red', tint: [1.5, 1.14, 0.86], roof: 'flat', windows: false },
    details: [{ t: 'a08Station' }] },
};
export const SPLITS = {};      // keyed by OSM building way id: { at: 0.5 } etc. (same format as content/frontages.js SPLITS)
export const AREAS = {};       // keyed by OSM area id (same format as FRONTAGE_AREAS)
export const FASCIAS = {};     // shop sign styles by shop name (same fields as BRAND_STYLES entries)
export const OVERRIDES = {};   // business overrides by OSM node id, e.g. n123 (same format as shops.js OVERRIDES)
export const ADDITIONS = [];   // businesses missing from OSM (same format as shops.js ADDITIONS)
