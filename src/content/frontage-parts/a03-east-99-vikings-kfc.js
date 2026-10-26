// Area a03-east-99-vikings-kfc: the west side of upper Hamilton Road (the photo set calls it the "east" side because it is the
// side of the road the viewer faces), from GSK News & Booze and No. 99 up to 127 Vintage.
// Source: the user's Street View photos e-palace-side-busstop, e-99-terrace-bays, e-gsk-news-corner, e-99-101-bluefront,
// e-fruit-flowers-blueberry-arcadian, e-blueberry-arcadian-randoms, e-randoms-wands-vikings, e-vaping-vikings-diamond,
// e-diamond-mills-kfc, e-kfc-nailsspa-127vintage (docs/research/hamilton-road-streetview, supplied 26 Oct 2026).
// Every building is a two-storey red-brick Edwardian shop terrace with a slate roof and, in most plots, gabled dormers. The roof,
// windows, bays, dormers, chimneys and shopfronts are drawn by world/features/a03-east-99-vikings-kfc.js from the specs below
// (s values are metres from the south end of the street edge, measured against `ref`, the edge length they were scaled on).
// Heights and positions are estimates scaled from the photos, not surveyed. The OSM footprints do not line up exactly with the
// real shop units, so shop boundaries inside a footprint are approximate.

const BRICK_TINT = [1.28, 0.97, 0.84];
const SLATE = 'slate:#ffffff:1.45', AGED = 'slate:#d9cdc3:1.3';

export const FRONTAGES = {
  // GSK News & Booze on the corner (a brick flank wall runs back along the Palace Cinema's north side) and No. 99 with the blue
  // shopfront and exposed fascia joists. 4 windows, an oriel bay, 3 dormers, aged brown-grey tiles.
  732472279: { addr: 'GSK News & Booze and 99 Hamilton Road', photo: 'e-99-101-bluefront.png', height: 6.25, force: true, roofShape: 'flat',
    style: { facade: 'brick_red', tint: BRICK_TINT, roof: 'flat', windows: false },
    details: [{ t: 'a03', ref: 13.19, roofMat: AGED, run: 3.5,
      win: [{ s: 3.5, c: true }, { s: 4.7, c: true }, { s: 5.95, c: true }, { s: 7.3 }, { s: 9.0, c: true }],
      bays: [{ s: 1.7, w: 2.0 }, { s: 11.3, w: 2.2 }],
      quoin: [4.1, 5.3, 6.65, 8.1, 10.0],
      dorm: [{ s: 1.7, w: 2.0, n: 2, cheek: '#4b4f55', roofCol: '#4a4640' }, { s: 6.0, w: 2.6, n: 3, cheek: WHITEISH(), roofCol: '#4a4640' }, { s: 9.7, w: 2.1, n: 2, cheek: WHITEISH(), roofCol: '#4a4640' }],
      chim: [{ s: 0.9, pots: 2 }, { s: 3.3, pots: 2 }, { s: 12.4, pots: 3 }],
      joists: [3.95, 13.0],
      shop: { riser: '#6f3a2e', parts: [
        { k: 'pier', a: 0.05, b: 0.4, col: '#f1efe8' },
        { k: 'win', a: 0.5, b: 1.55, n: 1 }, { k: 'door', a: 1.6, b: 2.55, leaf: DARK() }, { k: 'win', a: 2.6, b: 3.6, n: 1 },
        { k: 'pier', a: 3.6, b: 3.95, col: '#f1efe8' },
        { k: 'door', a: 4.4, b: 5.25, frame: '#f1efe8', leaf: '#16171a' },
        { k: 'win', a: 5.55, b: 7.05, n: 1, frame: '#1f4fc4', riser: '#5d2f26' }, { k: 'door', a: 7.35, b: 8.15, frame: '#1f4fc4' },
        { k: 'win', a: 8.5, b: 12.6, n: 3, frame: '#1f4fc4', riser: '#5d2f26' },
        { k: 'pier', a: 12.7, b: 13.19, col: '#4a2c26' } ] } }] },

  // 101 Fruit & Flowers: white-framed shop, dark-green fascia, green lower panels, apple and pear window art.
  732472277: { addr: '101 Hamilton Road (Fruit & Flowers)', photo: 'e-fruit-flowers-blueberry-arcadian.png', height: 6.15, force: true, roofShape: 'flat',
    style: { facade: 'brick_red', tint: BRICK_TINT, roof: 'flat', windows: false },
    details: [{ t: 'a03', ref: 8.93, roofMat: SLATE, run: 3.6,
      win: [{ s: 2.25, w: 1.5, k: 'three', lintel: '#e4dfd0' }, { s: 6.5, w: 1.5, k: 'three', lintel: '#e4dfd0' }],
      dorm: [{ s: 2.5, w: 1.9, n: 2, cheek: '#3a3e44', roofCol: '#3d4046' }, { s: 6.5, w: 1.9, n: 2, cheek: '#3a3e44', roofCol: '#3d4046' }],
      chim: [{ s: 8.2, pots: 3 }],
      shop: { riser: '#9aa5b3', parts: [
        { k: 'pier', a: 0.0, b: 0.25, col: '#4a2c26' },
        { k: 'door', a: 0.3, b: 1.15, frame: '#26282c', leaf: '#1c1e21' },
        { k: 'win', a: 1.3, b: 3.7, n: 1, panel: '#2e7d4f', py0: 0.72, py1: 1.2, deco: [{ s0: 0.3, s1: 0.5, y0: 1.7, y1: 2.15, col: '#c8232c' }] },
        { k: 'door', a: 3.8, b: 5.75, frame: '#f4f3ee', leaf: '#eceae4', glassLeaf: '#8ea3b3!g' },
        { k: 'win', a: 5.85, b: 8.3, n: 1, panel: '#2e7d4f', py0: 0.72, py1: 1.2, deco: [{ s0: 0.4, s1: 0.58, y0: 1.65, y1: 2.2, col: '#dfc43a' }] },
        { k: 'pier', a: 8.3, b: 8.93, col: '#4a2c26' } ] } }] },

  // 103-105 blue & berry: cream fascia, dark awning, tall white-framed shop window, brown timber door.
  732472278: { addr: '103-105 Hamilton Road (blue & berry)', photo: 'e-fruit-flowers-blueberry-arcadian.png', height: 6.25, force: true, roofShape: 'flat',
    style: { facade: 'brick_red', tint: BRICK_TINT, roof: 'flat', windows: false },
    details: [{ t: 'a03', ref: 8.09, roofMat: SLATE, run: 3.6,
      win: [{ s: 1.8, w: 1.55, k: 'two', c: true }, { s: 5.8, w: 1.55, k: 'two' }],
      dorm: [{ s: 1.25, w: 1.8, n: 2, roof: 'hip', cheek: '#ecebe4', cheekSide: '#ecebe4', roofCol: '#4a4e54' }, { s: 4.3, w: 1.9, n: 2, cheek: '#ecebe4', roofCol: '#33363b' }],
      chim: [{ s: 7.3, pots: 2 }],
      shop: { riser: '#2f3236', parts: [
        { k: 'pier', a: 0.0, b: 0.2, col: '#ecebe4' },
        { k: 'door', a: 0.25, b: 1.2, frame: '#2b2d30', leaf: '#15171a' },
        { k: 'win', a: 1.3, b: 5.85, n: 3, frame: '#2b2d30', riser: '#3a3c40', glass: '#3c4e5a!g' },
        { k: 'door', a: 6.05, b: 6.95, frame: '#5b351f', leaf: '#8a4b2a' },
        { k: 'pier', a: 7.0, b: 8.09, col: '#ecebe4' },
        { k: 'awning', a: 0.3, b: 5.9, col: '#34373b' } ] } }] },

  // 107 Arcadian Slots and 109 Random's: navy shopfront over a brick riser, SunTrap banner, oriel bay on the join.
  732472276: { addr: '107-109 Hamilton Road (Arcadian Slots, Random\'s)', photo: 'e-blueberry-arcadian-randoms.png', height: 6.25, force: true, roofShape: 'flat',
    style: { facade: 'brick_red', tint: BRICK_TINT, roof: 'flat', windows: false },
    details: [{ t: 'a03', ref: 12.47, roofMat: SLATE, run: 3.6,
      win: [{ s: 2.6, w: 1.3, k: 'one' }, { s: 10.6, w: 1.2, k: 'one' }],
      bays: [{ s: 7.2, w: 2.4, under: '#262a38' }],
      dorm: [{ s: 1.9, w: 1.9, n: 2, cheek: '#e8e6df', roofCol: '#2f3238' }, { s: 6.1, w: 1.8, n: 2, cheek: '#e8e6df', roofCol: '#2f3238' }, { s: 9.5, w: 1.8, n: 2, cheek: '#e8e6df', roofCol: '#2f3238' }],
      chim: [{ s: 12.0, pots: 3 }],
      shop: { riser: '#8a4538', parts: [
        { k: 'pier', a: 0.0, b: 0.5, col: '#1c1d2c' },
        { k: 'win', a: 0.55, b: 6.9, n: 4, frame: '#1c1d2c', riser: '#8a4538', glass: '#34454f!g' },
        { k: 'pier', a: 6.9, b: 7.5, col: '#1c1d2c' },
        { k: 'win', a: 7.55, b: 11.0, n: 2, frame: '#26282c', riser: '#8a4538', glass: '#4c5e66!g', deco: [{ s0: 0.18, s1: 0.82, y0: 1.2, y1: 1.7, col: '#d6262a' }] },
        { k: 'door', a: 11.1, b: 11.95, frame: '#f1efe8', leaf: '#e9e8e2' },
        { k: 'pier', a: 12.0, b: 12.47, col: '#8a8f94' } ] } }] },

  // Wands Crystal Emporium and The Vaping Emporium: plain lower hipped roof, one bay, big chimneys, black art-deco vape shopfront.
  732472275: { addr: '111-113 Hamilton Road (Wands Crystal Emporium, The Vaping Emporium)', photo: 'e-vaping-vikings-diamond.png', height: 5.75, force: true, roofShape: 'flat',
    style: { facade: 'brick_red', tint: BRICK_TINT, roof: 'flat', windows: false },
    details: [{ t: 'a03', ref: 11.78, roofMat: SLATE, run: 3.2,
      win: [{ s: 3.0, w: 1.15, k: 'one' }, { s: 7.0, w: 1.15, k: 'one' }],
      bays: [{ s: 10.7, w: 2.2, under: CREAMISH(), roof: '#8b8e92' }],
      chim: [{ s: 0.5, pots: 4 }, { s: 11.2, pots: 4 }],
      shop: { riser: '#3b2a26', parts: [
        { k: 'pier', a: 0.0, b: 0.4, col: '#5d2f26' },
        { k: 'win', a: 0.5, b: 2.5, n: 1, frame: '#f4f2ee', glass: '#6b8191!g' }, { k: 'door', a: 2.55, b: 3.75, frame: '#f4f2ee', leaf: '#6b8191!g' },
        { k: 'canopy', a: 0.4, b: 4.1, col: '#e9e1cf' },
        { k: 'pier', a: 4.1, b: 4.6, col: '#17181a' },
        { k: 'win', a: 4.7, b: 5.9, n: 1, frame: '#17181a', riser: '#17181a', glass: '#2a3138!g' },
        { k: 'win', a: 6.1, b: 9.8, n: 1, frame: '#17181a', riser: '#17181a', glass: '#323b42!g', deco: [{ s0: 0.25, s1: 0.75, y0: 1.7, y1: 2.15, col: '#e8e6e0' }] },
        { k: 'pier', a: 9.85, b: 10.7, col: '#17181a' } ] } }] },

  // Vikings (estate agents, dark green) and its upper floor.
  732472274: { addr: '115 Hamilton Road (Vikings)', photo: 'e-vaping-vikings-diamond.png', height: 5.75, force: true, roofShape: 'flat',
    style: { facade: 'brick_red', tint: BRICK_TINT, roof: 'flat', windows: false },
    details: [{ t: 'a03', ref: 7.64, roofMat: SLATE, run: 3.2,
      win: [{ s: 2.6, w: 1.1, k: 'one' }, { s: 5.7, w: 1.1, k: 'one' }],
      chim: [{ s: 7.3, pots: 3 }],
      shop: { riser: '#1f3626', parts: [
        { k: 'pier', a: 0.0, b: 0.35, col: '#17181a' },
        { k: 'door', a: 0.4, b: 1.4, frame: '#17181a', leaf: '#1d1a19' },
        { k: 'pier', a: 1.4, b: 1.9, col: '#243b2b' },
        { k: 'win', a: 1.95, b: 6.3, n: 3, frame: '#243b2b', riser: '#243b2b', glass: '#7e8f8a!g', deco: [{ s0: 0.08, s1: 0.28, y0: 1.0, y1: 1.9, col: '#d8d9d4' }, { s0: 0.36, s1: 0.56, y0: 1.0, y1: 1.9, col: '#d8d9d4' }, { s0: 0.64, s1: 0.84, y0: 1.0, y1: 1.9, col: '#d8d9d4' }] },
        { k: 'fascia', a: 4.3, b: 7.64, col: '#243b2b' }, // continues the Vikings fascia over the interpolated Deben Butcher board (shops.js ADDITIONS x-deben-115)
        { k: 'pier', a: 6.3, b: 7.64, col: '#243b2b' } ] } }] },

  // The to-let unit with a white fascia, Diamond & Mills (yellow) and KFC (red hoardings, black front) in the long KFC footprint.
  506379194: { addr: '117-121 Hamilton Road (to let, Diamond & Mills, KFC)', photo: 'e-diamond-mills-kfc.png', height: 6.15, force: true, roofShape: 'flat',
    style: { facade: 'brick_red', tint: BRICK_TINT, roof: 'flat', windows: false },
    details: [{ t: 'a03', ref: 17.59, roofMat: SLATE, run: 3.6,
      win: [{ s: 1.0, w: 0.95 }, { s: 2.7, w: 0.95 }, { s: 4.2, w: 0.95 }, { s: 6.1, w: 0.95 }, { s: 7.8, w: 0.95 }, { s: 10.6, w: 1.25, k: 'two' }, { s: 15.5, w: 1.3, k: 'two' }],
      bays: [{ s: 13.0, w: 2.4 }],
      dorm: [{ s: 2.4, w: 1.9, n: 2, cheek: '#e6e4de', roofCol: '#3d4046' }, { s: 11.9, w: 1.35, n: 1, cheek: '#e6e4de', roofCol: '#3d4046' }, { s: 15.1, w: 1.3, n: 1, cheek: '#e6e4de', roofCol: '#3d4046' }],
      chim: [{ s: 9.3, pots: 2 }, { s: 16.9, pots: 4 }],
      shop: { riser: '#3d4046', parts: [
        { k: 'pier', a: 0.0, b: 0.4, col: '#4a2c26' },
        { k: 'win', a: 0.5, b: 3.6, n: 3, frame: '#b9bbbd', riser: '#8b8f93', glass: '#59676f!g' },
        { k: 'pier', a: 3.7, b: 4.2, col: '#f0b429' },
        { k: 'win', a: 4.3, b: 8.0, n: 4, frame: '#f2b526', riser: '#2a2a2c', glass: '#7e8d95!g', deco: [{ s0: 0.08, s1: 0.92, y0: 1.0, y1: 2.0, col: '#c9d4dc' }] },
        { k: 'door', a: 8.1, b: 9.1, frame: '#f2b526', leaf: '#d9a21e', glassLeaf: '#6f7d84!g' },
        { k: 'board', a: 9.15, b: 9.55, col: '#f3dd4a', y0: 0.6, y1: 2.3 },
        { k: 'pier', a: 9.55, b: 9.75, col: '#141416' },
        { k: 'door', a: 9.8, b: 10.85, frame: '#141416', leaf: '#1b1b1d' },
        { k: 'win', a: 11.0, b: 14.7, n: 2, frame: '#141416', riser: '#141416', glass: '#e4282d', deco: [{ s0: 0.06, s1: 0.3, y0: 0.9, y1: 2.2, col: '#f4f1ec' }, { s0: 0.55, s1: 0.9, y0: 1.0, y1: 1.9, col: '#d8a25a' }] },
        { k: 'door', a: 15.0, b: 16.4, frame: '#e0262b', leaf: '#e0262b', glassLeaf: '#f2f0ea' },
        { k: 'pier', a: 16.4, b: 17.59, col: '#141416' } ] } }] },

  // Felixstowe Nails Spa (cream) and 127 Vintage (dark teal), a bay over each.
  732472273: { addr: '123-127 Hamilton Road (Felixstowe Nails Spa, 127 Vintage)', photo: 'e-kfc-nailsspa-127vintage.png', height: 5.95, force: true, roofShape: 'flat',
    style: { facade: 'brick_red', tint: BRICK_TINT, roof: 'flat', windows: false },
    details: [{ t: 'a03', ref: 8.38, roofMat: SLATE, run: 3.2,
      bays: [{ s: 2.1, w: 2.1 }, { s: 6.3, w: 2.2 }],
      chim: [{ s: 0.5, pots: 2 }, { s: 5.0, pots: 5 }],
      shop: { riser: '#2d3736', parts: [
        { k: 'pier', a: 0.0, b: 0.25, col: '#f2eee4' },
        { k: 'win', a: 0.3, b: 3.0, n: 1, frame: '#f2eee4', riser: '#ece8de', glass: '#9aa8ae!g' }, { k: 'door', a: 3.1, b: 3.95, frame: '#f2eee4', leaf: '#8e9ca2!g' },
        { k: 'pier', a: 4.0, b: 4.35, col: '#2d3736' },
        { k: 'win', a: 4.4, b: 8.1, n: 3, frame: '#2d3736', riser: '#2d3736', glass: '#566a6d!g' },
        { k: 'pier', a: 8.1, b: 8.38, col: '#2d3736' } ] } }] },
};

function WHITEISH() { return '#ecebe4'; }
function CREAMISH() { return '#ece8dc'; }
function DARK() { return '#1b1d20'; }

export const SPLITS = {};
export const AREAS = {};

// Shop signs (fascia colour, text colour, case, font, weight), read from the photos.
export const FASCIAS = {
  'GSK News & Booze': { fascia: '#1c1e22', text: '#f4f4f2', case: 'upper', font: 'sans', weight: 'bold' },
  'No. 99 (fascia removed)': { fascia: '#4a3426', text: '#4a3426', case: 'mixed', font: 'sans', weight: 'regular' },
  'Fruit & Flowers': { fascia: '#1f4a34', text: '#f1ecda', case: 'mixed', font: 'serif', weight: 'regular' },
  'blue & berry': { fascia: '#ebe8e1', text: '#6a6a68', case: 'mixed', font: 'sans', weight: 'regular' },
  'Arcadian Slots': { fascia: '#1b1c28', text: '#f4a93b', case: 'mixed', font: 'sans', weight: 'bold' },
  "Random's": { fascia: '#f2d03a', text: '#1d3f90', case: 'upper', font: 'sans', weight: 'bold' },
  'Wands Crystal Emporium': { fascia: '#f2eee6', text: '#7a2d8c', case: 'mixed', font: 'serif', weight: 'regular' },
  'The Vaping Emporium': { fascia: '#17181a', text: '#f1efe9', case: 'upper', font: 'sans', weight: 'regular' },
  'Vikings': { fascia: '#243b2b', text: '#e2b84a', case: 'upper', font: 'serif', weight: 'bold' },
  'To Let': { fascia: '#ebe9e3', text: '#b8322a', case: 'upper', font: 'sans', weight: 'bold' },
  'Diamond & Mills': { fascia: '#f2b526', text: '#1b1b1b', case: 'upper', font: 'serif', weight: 'bold' },
  'KFC': { fascia: '#1f1f21', text: '#f4f1ec', case: 'upper', font: 'sans', weight: 'bold' },
  'Felixstowe Nails Spa': { fascia: '#f3efe4', text: '#1b1b1b', case: 'upper', font: 'serif', weight: 'bold' },
  '127 Vintage': { fascia: '#2d3736', text: '#d9d9d2', case: 'upper', font: 'sans', weight: 'regular' },
};

// OSM has stale names here: the GSK node sits where Felixstowe Nails Spa trades, Morgan's is now Random's, and a few names differ in the photos.
const EV = ['User-supplied Google Street View, Oct 2026 (docs/research/hamilton-road-streetview/e-*.png)'];
export const OVERRIDES = {
  n6859083233: { name: 'Felixstowe Nails Spa', kind: 'beauty', status: 'replaced', was: 'GSK News & Booze', evidence: EV, note: 'The OSM GSK node (123) is on the shop that is now Felixstowe Nails Spa; GSK News & Booze is photographed at the corner by the bus stop (added below).' },
  n6859083249: { name: "Random's", kind: 'shop', status: 'replaced', was: "Morgan's", evidence: EV, note: "Photo shows Random's (liquidated stock) with a SunTrap sunbed banner at 109." },
  n6859083250: { name: 'Arcadian Slots', kind: 'gambling', status: 'replaced', was: 'Arcadian Casino', evidence: EV, note: 'Fascia reads arcadian Slots.' },
  n1957118151: { name: 'Fruit & Flowers', kind: 'greengrocer', status: 'replaced', was: 'Fruits & Flowers', evidence: EV, note: 'Fascia reads Fruit & Flowers, 101.' },
  n6859083257: { name: 'blue & berry', kind: 'cafe', status: 'replaced', was: 'Blue & Berry', evidence: EV, note: 'Fascia reads blue & berry.' },
};

// Businesses in the photos that OSM lacks, placed on the facade of their footprint (lat/lon from world coordinates).
export const ADDITIONS = [
  { id: 'x-a03-gsk', name: 'GSK News & Booze', kind: 'convenience', addr: '97 Hamilton Road (corner by the bus stop)', lat: 51.964203, lon: 1.351466, evidence: EV },
  { id: 'x-a03-99', name: 'No. 99 (fascia removed)', kind: 'vacant', addr: '99 Hamilton Road', lat: 51.964259, lon: 1.351523, evidence: EV },
  { id: 'x-a03-wands', name: 'Wands Crystal Emporium', kind: 'gift', addr: '111 Hamilton Road', lat: 51.964541, lon: 1.35179, evidence: EV },
  { id: 'x-a03-vikings', name: 'Vikings', kind: 'estate_agent', addr: '115 Hamilton Road', lat: 51.964651, lon: 1.35187, evidence: EV },
  { id: 'x-a03-tolet', name: 'To Let', kind: 'vacant', addr: '117 Hamilton Road', lat: 51.964698, lon: 1.351903, evidence: EV },
  { id: 'x-a03-diamond', name: 'Diamond & Mills', kind: 'estate_agent', addr: '117-119 Hamilton Road', lat: 51.964736, lon: 1.351928, evidence: EV },
];
