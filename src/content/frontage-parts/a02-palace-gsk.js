// Area a02-palace-gsk: the Palace Cinema (OSM way 354182171) at the Triangle end of Hamilton Road.
// Source: user's Street View photos palace-cinema, palace-cinema-side-gsk, palace-cinema-side-led-screen and
// i-palace-rear-led-tower / i-palace-rear-fire-escape-canopy / i-palace-rear-auditorium-wall (docs/research/hamilton-road-streetview).
// The footprint is extruded only to the low annexe height (4.4 m) with cream render; world/features/a02-palace-gsk.js builds the
// real massing on top of it: the 15 m brick front block with the LED screen on its car-park side, the cream stair tower, the lower
// auditorium with a corrugated roof, and the tall stage-house at the back, plus the fire escape, white canopy, blue doors and the
// low white GSK-side wall with posters. Heights and positions are scaled from the photos, not surveyed.
// The GSK News & Booze shop on the corner (732472279) belongs to the a03 part. The small gabled building 506379220 at the north end
// of the car park (Penfold Road) is not in any of the photos, so it is left as OSM/LiDAR have it.

export const FRONTAGES = {
  354182171: {
    addr: 'Palace Cinema, Hamilton Road', photo: 'palace-cinema.png', height: 4.4, force: true, roofShape: 'flat',
    style: { facade: 'render', tint: [0.9, 0.86, 0.74], roof: 'flat', windows: false },
    details: [{ t: 'a02Front' }, { t: 'a02Mass' }],
  },
};
export const SPLITS = {};      // keyed by OSM building way id: { at: 0.5 } etc. (same format as content/frontages.js SPLITS)
export const AREAS = {};       // keyed by OSM area id (same format as FRONTAGE_AREAS)
export const FASCIAS = {};     // shop sign styles by shop name (same fields as BRAND_STYLES entries)
export const OVERRIDES = {};   // business overrides by OSM node id, e.g. n123 (same format as shops.js OVERRIDES)
export const ADDITIONS = [];   // businesses missing from OSM (same format as shops.js ADDITIONS)
