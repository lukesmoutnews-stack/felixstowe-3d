// Undercliff Road West frontages, from the user's Google Street View captures (June 2022), supplied
// 12 Oct 2026 and kept in docs/research/undercliff-road-west (see the README there for each photo).
// force: use the photo's storey height even where LiDAR measured one (single-storey shops in front of the
// cliff, where the LiDAR footprint height is pulled down by the slope).
// Keys are OSM building way ids; the address or business mapping is from OSM addr:* tags and the
// business nodes inside each footprint. Heights are estimates from storey counts in the photos.
// style: overrides for buildings.js styleFor (facade texture kind, tint, roof material/tint, window style).
// details: street-side additions built by world/frontage-details.js.

import { BRAND_STYLES } from './shops.js';

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
  506378806: { addr: '129 (One 29, The Cork Bar, Steak & Lobster Co)', photo: '129-cork-bar.png', height: 8.0, style: { facade: 'render', tint: WHITE, roof: 'slate', winStyle: 1 }, details: [{ t: 'ironBalcony', level: 1.3, deep: 2.6 }] },
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
  1017204189: { addr: '47 (café)', photo: '47-cafe.png', height: 3.7, force: true, roofShape: 'flat', style: { facade: 'render', tint: YELLOW, roof: 'flat' }, details: [{ t: 'cafeVerandah' }] },
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
