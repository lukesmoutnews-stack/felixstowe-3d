// Area a13-east-spudhut-kings-conkers-bank: east side of Hamilton Road at the York Road end, from the Street View photos supplied
// 26 Oct 2026 (docs/research/hamilton-road-streetview: f-fennwright-spudhut-bakery-kings, f-kings-conkers,
// f-conkers-busshelter-1930s-block, g-corner-bank-park-road-1/2). Heights are scaled against doors and people (estimates, not surveyed).
// Every footprint is built with windows: false: the features (world/features/a13-...) draw windows, shopfronts, gables and signs themselves,
// each on its own street face (it.edge = [start, end] of the footprint edge, s running to the viewer's right).
const PHOTO = 'f-fennwright-spudhut-bakery-kings.png';
const BRICK_TINT = [1.4, 1.2, 1.05];          // warm orange-red brick of the four gables
const DARK_BRICK = [1.3, 1.0, 0.9];       // darker red-brown brick of Conkers and the 1930s block
const BANK_BRICK = [1.25, 1.0, 0.88];
const TILE = [0.62, 0.34, 0.26];

const gable = (addr, height, edge, extra) => ({
  addr, photo: PHOTO, height, force: true, roofShape: 'flat',
  style: { facade: 'brick_red', tint: BRICK_TINT, roof: 'flat', windows: false },
  details: [{ t: 'a13Gable', edge, tint: '1.4,1.2,1.05', ...extra }],
});

export const FRONTAGES = {
  // four shaped brick gables, left to right in the photo (north to south): FennWright (120), Madison Boutique + Spud Hut (118), The Bakery (116), Kings (114)
  732472265: gable('120 (FennWright estate agents)', 8.0, [[134.9, -566.1], [133.6, -559.9]], { shop: 'fennwright' }),
  733839494: gable('118 (Madison Boutique, Spud Hut)', 8.0, [[133.6, -559.9], [132.4, -553.7]], { shop: 'spud' }),
  733839495: gable('116 (The Bakery)', 8.0, [[132.4, -553.7], [131.2, -547.4]], { shop: 'bakery' }),
  732472266: gable('114 (Kings)', 8.0, [[131.2, -547.4], [130.1, -541.2]], { shop: 'kings' }),
  // Conkers Pets & Plants (110-112): red-brick two-storey front, four windows, grey fascia, low concrete-tile roof
  506379172: { addr: '110-112 (Conkers Pets & Plants)', photo: 'f-kings-conkers.png; f-conkers-busshelter-1930s-block.png', height: 7.0, force: true, roofShape: 'flat',
    style: { facade: 'brick_red', tint: DARK_BRICK, roof: 'flat', windows: false },
    details: [{ t: 'a13Conkers', edge: [[130.1, -541.2], [128.1, -531.3]] }] },
  // the 1930s neo-Georgian block over EACH: three storeys, stone quoins and cornice, pedimented first-floor window, hipped clay-tile roof
  732472262: { addr: '(EACH) 1930s brick block', photo: 'f-conkers-busshelter-1930s-block.png', height: 10.2, force: true, roofShape: 'hipped',
    style: { facade: 'brick_red', tint: DARK_BRICK, roof: 'clay', roofTint: TILE, windows: false },
    details: [{ t: 'a13Block', edge: [[128.1, -531.3], [126.2, -518.3]] }, { t: 'a13BlockSouth', edge: [[126.2, -518.3], [143, -515.7]] }] },
  // NOTE: the corner bank of the g-corner-bank photos is NOT building 732472261 (that is the north end of the Poundland block, see a14); its real position is unknown, so it is not built.
};
export const SPLITS = {};
export const AREAS = {};
// sign colours read from the photos
const SRC = ['User-supplied Street View capture, Sept 2026 (docs/research/hamilton-road-streetview)'];
export const FASCIAS = {
  'The Bakery': { fascia: '#1d9a96', text: '#2a1f66', case: 'mixed', font: 'serif', weight: 'bold', confidence: 'photo', sources: SRC },
  "King's": { fascia: '#34383d', text: '#f1f1f1', case: 'upper', font: 'sans', weight: 'bold', confidence: 'photo', sources: SRC },
  'Spud Hut': { fascia: '#e8cfd0', text: '#b4535f', case: 'upper', font: 'sans', weight: 'bold', confidence: 'photo', sources: SRC },
  'Cake Away': { fascia: '#e8cfd0', text: '#b4535f', case: 'mixed', font: 'sans', weight: 'regular', confidence: 'photo', sources: SRC },
  'EACH': { fascia: '#c8283a', text: '#ffffff', case: 'mixed', font: 'sans', weight: 'bold', confidence: 'photo', sources: SRC },
};
// The OSM point for Conkers sits 55 m north in the New Barber Shop / P and K building; the shop is at 110-112 beside Kings (photos).
export const OVERRIDES = {};
export const ADDITIONS = [];
