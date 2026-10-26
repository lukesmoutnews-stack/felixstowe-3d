// Undercliff Road West frontages, from the user's Google Street View captures (June 2022), supplied
// 12 Oct 2026 and kept in docs/research/undercliff-road-west (see the README there for each photo).
// force: use the photo's storey height even where LiDAR measured one (single-storey shops in front of the
// cliff, where the LiDAR footprint height is pulled down by the slope).
// Keys are OSM building way ids; the address or business mapping is from OSM addr:* tags and the
// business nodes inside each footprint. Heights are estimates from storey counts in the photos.
// style: overrides for buildings.js styleFor (facade texture kind, tint, roof material/tint, window style).
// details: street-side additions built by world/frontage-details.js.

import { BRAND_STYLES } from './shops.js';
import { PART_FRONTAGES, PART_SPLITS, PART_AREAS, PART_FASCIAS } from './frontage-parts/index.js';

const WHITE = [1, 1, 1], CREAM = [1, 0.96, 0.86], PALE_BLUE = [0.84, 0.91, 1.0], BLACK = [0.2, 0.2, 0.22], YELLOW = [1, 0.92, 0.55];

export const FRONTAGES = {
  // --- east of the Town Hall (photos 95 .. 123) ---
  960050351: { addr: '91', photo: '95-pinsa-town-hall.png', height: 7.4, roofShape: 'flat', style: { facade: 'render', tint: CREAM, roof: 'flat' }, details: [{ t: 'glassBalcony', level: 1 }, { t: 'roofRail' }, { t: 'terraceRail' }] },
  506378799: { addr: '97', photo: '101.png', height: 9.2, roofShape: 'hipped', style: { facade: 'render', tint: WHITE, roof: 'slate' }, details: [{ t: 'timberBalcony', level: 1 }] },
  1312601738: { addr: '99', photo: '101.png', height: 9.2, roofShape: 'hipped', style: { facade: 'render', tint: WHITE, roof: 'slate' }, details: [{ t: 'timberBalcony', level: 1 }, { t: 'lowBrickWall' }] },
  1017209823: { addr: '101 (terrace)', photo: '101.png', height: 9.0, roofShape: 'gabled', style: { facade: 'brick_yellow', roof: 'clay', winStyle: 0 }, details: [{ t: 'verandah2' }, { t: 'lowBrickWall' }] },
  1017209822: { addr: '103 (terrace)', photo: '107.png', height: 9.0, roofShape: 'gabled', style: { facade: 'brick_yellow', roof: 'clay', winStyle: 0 }, details: [{ t: 'verandah2' }, { t: 'lowBrickWall' }] },
  1017209824: { addr: '105 (terrace)', photo: '107.png', height: 9.0, roofShape: 'gabled', style: { facade: 'brick_yellow', roof: 'clay', winStyle: 0 }, details: [{ t: 'verandah2' }, { t: 'lowBrickWall' }] },
  506378802: { addr: '107 (weatherboarded)', photo: '107.png', height: 8.6, roofShape: 'gabled', style: { facade: 'timber', tint: BLACK, roof: 'slate' }, details: [] },
  1017209825: { addr: '111', photo: '113.png', height: 9.0, roofShape: 'hipped', style: { facade: 'render', tint: CREAM, roof: 'concrete_tile', winStyle: 0 }, details: [{ t: 'whiteBalcony', level: 1 }, { t: 'lowBrickWall' }] },
  1017209826: { addr: '113', photo: '113.png', height: 9.4, roofShape: 'hipped', style: { facade: 'render', tint: WHITE, roof: 'concrete_tile', winStyle: 1 }, details: [{ t: 'whiteBalcony', level: 1 }, { t: 'whiteBalcony', level: 0.35, valance: true }, { t: 'whiteFence' }] },
  506378803: { addr: '115', photo: '113.png', height: 9.4, roofShape: 'hipped', style: { facade: 'render', tint: WHITE, roof: 'concrete_tile', winStyle: 1 }, details: [{ t: 'whiteBalcony', level: 1 }, { t: 'whiteBalcony', level: 0.35, valance: true }, { t: 'whiteFence' }] },
  1017209828: { addr: '117', photo: '117.png', height: 9.6, roofShape: 'gabled', style: { facade: 'timber', tint: WHITE, roof: 'concrete_tile', winStyle: 0 }, details: [{ t: 'glazedVerandah' }, { t: 'ironBalcony', level: 0.35 }] },
  1017209827: { addr: '119-121', photo: '117.png', height: 9.6, roofShape: 'gabled', style: { facade: 'timber', tint: [0.97, 0.95, 0.9], roof: 'concrete_tile', winStyle: 0 }, details: [{ t: 'glazedVerandah' }] },
  1017209829: { addr: '123 (The Alex, brasserie)', photo: '123-brasserie-hamilton-house.png', height: 7.6, roofShape: 'flat', style: { facade: 'brick_red', roof: 'flat', winStyle: 1 }, details: [{ t: 'blueCanopy' }, { t: 'upperGlazing' }] },
  1017209831: { addr: 'Hamilton House', photo: '123-brasserie-hamilton-house.png', height: 9.0, roofShape: 'gabled', style: { facade: 'render', tint: PALE_BLUE, roof: 'concrete_tile', winStyle: 0 }, details: [{ t: 'glassBalcony', level: 1 }, { t: 'whiteFence' }] },
  1017209830: { addr: 'next to Hamilton House', photo: '123-brasserie-hamilton-house.png', height: 9.0, roofShape: 'hipped', style: { facade: 'render', tint: WHITE, roof: 'concrete_tile', winStyle: 0 }, details: [{ t: 'whiteBalcony', level: 1 }, { t: 'whiteFence' }] },
  // 129: OSM maps the bar row and The Grand as one footprint; the street face is the two-storey bar row (photo)
  506378806: { addr: '129 (One 29, The Cork Bar, Steak & Lobster Co)', photo: '129-cork-bar.png', height: 8.0, force: true, roofShape: 'hipped', style: { facade: 'render', tint: WHITE, roof: 'slate', winStyle: 1 }, details: [{ t: 'ironBalcony', level: 1.3, deep: 2.6 }] },
  // --- west of the Town Hall (photos 83 .. 47) ---
  1017204177: { addr: '79-83 (flats over K W Autos)', photo: '83-flats-kw-autos.png', height: 11.0, roofShape: 'flat', style: { facade: 'concrete', tint: [0.93, 0.93, 0.9], roof: 'flat', winStyle: 1 }, details: [{ t: 'slabBalconies', levels: [1, 2, 3] }] },
  1017204178: { addr: '77 (glazed shopfront)', photo: 'winnies.png', height: 3.8, force: true, roofShape: 'flat', style: { facade: 'render', tint: [0.92, 0.92, 0.92], roof: 'flat' }, details: [] },
  1017204176: { addr: '73 (Domino\'s)', photo: '77-dominos.png', height: 6.6, roofShape: 'flat', style: { facade: 'brick_yellow', roof: 'flat' }, details: [{ t: 'roofRail', black: true }] },
  1017204185: { addr: '67 (B.B.Q. Fish & Chips)', photo: '63-shops.png', height: 3.9, force: true, roofShape: 'flat', style: { facade: 'render', tint: WHITE, roof: 'flat' }, details: [] },
  1017204184: { addr: '65', photo: '63-shops.png', height: 3.9, force: true, roofShape: 'flat', style: { facade: 'render', tint: WHITE, roof: 'flat' }, details: [] },
  1017204183: { addr: '63 (Sweets & Treats)', photo: '63-shops.png', height: 3.9, force: true, roofShape: 'flat', style: { facade: 'render', tint: WHITE, roof: 'flat' }, details: [] },
  1017204182: { addr: '59-61 (The Little Ice Cream Co)', photo: '63-shops.png', height: 3.9, force: true, roofShape: 'flat', style: { facade: 'render', tint: WHITE, roof: 'flat' }, details: [] },
  1017204181: { addr: '55-57 (The Skye Lounge)', photo: '53-shops.png', height: 3.9, force: true, roofShape: 'flat', style: { facade: 'render', tint: [0.9, 0.9, 0.9], roof: 'flat' }, details: [] },
  1017204180: { addr: '51-53 (Nithin Express)', photo: '53-shops.png', height: 3.9, force: true, roofShape: 'flat', style: { facade: 'render', tint: [0.94, 0.94, 0.94], roof: 'flat' }, details: [] },
  1017204186: { addr: '49', photo: '53-shops.png', height: 3.9, force: true, roofShape: 'flat', style: { facade: 'render', tint: [0.94, 0.94, 0.94], roof: 'flat' }, details: [] },
  // --- B1082 near Wilco (photos 31-b1082-wilco, brick-house-by-wilco) ---
  1017338053: { addr: '31 B1082 (Wilco)', photo: '31-b1082-wilco.png', height: 6.8, force: true, roofShape: 'flat', style: { facade: 'render', tint: WHITE, roof: 'flat', winStyle: 1 }, details: [] },
  1017338054: { addr: 'red-brick house beside Wilco', photo: 'brick-house-by-wilco.png', height: 9.6, roofShape: 'gabled', style: { facade: 'brick_red', roof: 'clay', winStyle: 0 }, details: [{ t: 'whiteWall', gateToward: [-405, 190], extend: 6 }] }, // gate at the Wilco end; wall also fronts the single-storey wing
  // --- Seaton Road (photo 57-seaton-road.png, Street View, supplied 13 Oct 2026) ---
  // OSM has no house numbers here. Placed from the postcode (IP11 9BS centroid on the south, odd side),
  // numbering rising westward (91 is in IP11 9BT to the west) and a count of houses from the east end.
  '506411934:w': { addr: '55/57 Seaton Road (pair)', photo: '../seaton-road/57-seaton-road.png', height: 6.0, force: true, roofShape: 'hipped', style: { facade: 'brick_red', roof: 'clay', roofTint: [0.78, 0.6, 0.5], winStyle: 0 }, details: [{ t: 'bays', at: [0.32, 0.68], panelEast: 'cream', panelWest: 'panel' }, { t: 'porches', at: [0.09, 0.91] }, { t: 'resinDrive' }] },
  '506411934:e': { addr: 'pair east of 55/57 (left of the photo)', photo: '../seaton-road/57-seaton-road.png', height: 6.0, force: true, roofShape: 'hipped', style: { facade: 'brick_red', roof: 'clay', winStyle: 0 }, details: [{ t: 'lowBrickWall' }] },
  1017204189: { addr: '47 (café)', photo: '47-cafe.png', height: 3.7, force: true, roofShape: 'flat', style: { facade: 'render', tint: YELLOW, roof: 'flat' }, details: [{ t: 'cafeVerandah' }] },
  // --- Hamilton Road / Cobbold Road (Street View photos supplied 26 Oct 2026, docs/research/hamilton-road-streetview) ---
  // The Palace Cinema (the former Ritz, 1937): white ground floor, dark red-brown brick above, white stepped stripes
  // and pilasters, a white panel lettered BINGO | CINEMA. Height scaled from the photo (about 15 m to the parapet).
  354182171: { addr: 'Palace Cinema, Hamilton Road', photo: 'palace-cinema.png', height: 15.0, force: true, roofShape: 'flat', style: { facade: 'brick_red', tint: [0.78, 0.55, 0.47], roof: 'flat', windows: false }, details: [{ t: 'cinemaFront' }, { t: 'cinemaSide', at: [45.2, -452.1], from: [57.7, -442.9] }] },
  // Treasure Chest Books and the Mini Market: a two-storey red-brick corner with a dark tiled roof, white sash windows, dormers
  688756410: { addr: 'Treasure Chest Books / Felixstowe Mini Market (Cobbold Road and Crescent Road corner)', photo: 'treasure-chest-abbeygate.png', height: 6.9, force: true, roofShape: 'hipped', style: { facade: 'brick_red', tint: [1, 0.93, 0.88], roof: 'concrete_tile', roofTint: [0.46, 0.4, 0.38], winStyle: 0 }, details: [{ t: 'dormers', at: [0.28, 0.72] }, { t: 'chimneys', at: [0.12, 0.88] }] },
  // Abbeygate: red brick upper floor over a wide shopfront, dark slate roof, gable end to the east
  732472280: { addr: 'Abbeygate Lighting, Cobbold Road', photo: 'treasure-chest-abbeygate.png', height: 6.3, force: true, roofShape: 'gabled', style: { facade: 'brick_red', tint: [1, 0.95, 0.9], roof: 'slate', roofTint: [0.5, 0.5, 0.54], winStyle: 0 }, details: [] },
  // ---- south end of Hamilton Road, from the user's Street View photos (Sept 2026) ----
  492767243: { addr: 'Methodist (Trinity) church', photo: 'j-methodist-church-corner.png', height: 9.4, force: true, roofShape: 'gabled', style: { facade: 'flint', roof: 'slate', roofTint: [0.42, 0.43, 0.47], winStyle: 0 }, details: [] },
  506378835: { addr: 'Former post office, Victoria Street corner', photo: 'j-former-post-office-corner-oriel.png', height: 13.5, force: true, roofShape: 'hipped', style: { facade: 'brick_red', tint: [1, 0.86, 0.78], roof: 'clay', roofTint: [0.8, 0.5, 0.4], winStyle: 0 }, details: [{ t: 'dormers', at: [0.3, 0.7] }, { t: 'chimneys', at: [0.15, 0.85] }] },
  733112166: { addr: 'The Cafe on the Corner', photo: 'j-cafe-on-the-corner.png', height: 7.4, force: true, roofShape: 'hipped', style: { facade: 'render', tint: [1, 0.96, 0.84], roof: 'slate', roofTint: [0.3, 0.3, 0.34], winStyle: 0 }, details: [] },
  733112165: { addr: 'Vogue / GlowGetter', photo: 'j-vogue-glowgetter.png', height: 9.0, force: true, roofShape: 'flat', style: { facade: 'render', tint: [0.8, 0.82, 0.82], roof: 'flat', winStyle: 0 }, details: [] },
  733112164: { addr: "Tony's Nails & Spa / China China", photo: 'j-tonys-nails-china-china.png', height: 7.6, force: true, roofShape: 'hipped', style: { facade: 'render', tint: [1, 0.95, 0.8], roof: 'slate', roofTint: [0.3, 0.3, 0.34], winStyle: 0 }, details: [] },
  733112163: { addr: 'The Card Centre', photo: 'j-card-centre-coastal-taxis.png', height: 7.8, force: true, roofShape: 'flat', style: { facade: 'render', tint: [0.8, 0.82, 0.82], roof: 'flat', winStyle: 0 }, details: [] },
  506378826: { addr: 'A&B Glass Home Improvements', photo: 'j-abglass-corner-1.png', height: 9.6, force: true, roofShape: 'gabled', style: { facade: 'render', tint: [1, 0.98, 0.93], roof: 'slate', roofTint: [0.3, 0.32, 0.36], winStyle: 1 }, details: [] },
};

/**
 * Footprints that OSM draws as one block over several houses, split where a photo shows them (world.js
 * splitFootprint): 'at' is the split fraction from the west end; the parts are '<id>:w' and '<id>:e'.
 */
export const SPLITS = {
  // Seaton Road, south side: two semi-detached pairs in one footprint. The west pair is 55/57 (photo).
  506411934: { at: 0.5 },
};

/** Areas with photographed street edges (OSM area ids). */
export const FRONTAGE_AREAS = {
  91786047: { addr: '83 car park', photo: '83-car-park.png', details: [{ t: 'carParkWall' }] },
};

/** Shop fascia styles as photographed (merged into the researched brand styles). */
export const PHOTO_FASCIAS = {
  'The Little Ice Cream Co': { fascia: '#e8622c', text: '#ffffff', case: 'upper', font: 'sans', weight: 'bold' },
  'Sweets & Treats': { fascia: '#8ec5ec', text: '#e9b12c', case: 'mixed', font: 'serif', weight: 'bold' },
  'The Turtle & The Bear': { fascia: '#8b9198', text: '#ffffff', case: 'upper', font: 'sans', weight: 'regular' },
  'B.B.Q. Fish & Chips': { fascia: '#1f63c6', text: '#ffffff', case: 'upper', font: 'sans', weight: 'bold' },
  'Nithin Express': { fascia: '#f2c62e', text: '#1b1b1b', case: 'upper', font: 'sans', weight: 'bold' },
  'The Skye Lounge': { fascia: '#141414', text: '#ffffff', case: 'mixed', font: 'sans', weight: 'bold' },
  "Domino's": { fascia: '#3c4248', text: '#ffffff', case: 'mixed', font: 'sans', weight: 'bold' },
  'KW Autos': { fascia: '#2b2b2b', text: '#ffffff', case: 'upper', font: 'sans', weight: 'bold' },
  "Gulliver's Wife": { fascia: '#1e1e1e', text: '#f0c543', case: 'upper', font: 'sans', weight: 'bold' },
  'The Cork Bar': { fascia: '#1e1e1e', text: '#ffffff', case: 'upper', font: 'sans', weight: 'bold' },
  'One 29': { fascia: '#f4f4f2', text: '#3a3a3a', case: 'mixed', font: 'sans', weight: 'bold' },
  'Steak & Lobster Co': { fascia: '#1a1a1a', text: '#ffffff', case: 'upper', font: 'sans', weight: 'regular' },
  'The Alex': { fascia: '#1d4f91', text: '#ffffff', case: 'mixed', font: 'sans', weight: 'regular' },
  'Alba Chiara': { fascia: '#efe9dc', text: '#2b2b2b', case: 'mixed', font: 'serif', weight: 'regular' },
  'Wilco': { fascia: '#f3d36b', text: '#d62828', case: 'upper', font: 'sans', weight: 'bold' },
};
for (const v of Object.values(PHOTO_FASCIAS)) Object.assign(v, { confidence: 'photo', sources: ['User-supplied Street View capture, June 2022 (docs/research/undercliff-road-west)'] });
Object.assign(BRAND_STYLES, PHOTO_FASCIAS); // signs on these shops use the photographed fascia colours

// ---- per-area parts (content/frontage-parts/*.js) ----
Object.assign(FRONTAGES, PART_FRONTAGES);
Object.assign(SPLITS, PART_SPLITS);
Object.assign(FRONTAGE_AREAS, PART_AREAS);
for (const v of Object.values(PART_FASCIAS)) Object.assign(v, { confidence: v.confidence || 'photo', sources: v.sources || ['User-supplied Street View capture, 2026 (docs/research/hamilton-road-streetview)'] });
Object.assign(BRAND_STYLES, PART_FASCIAS);
