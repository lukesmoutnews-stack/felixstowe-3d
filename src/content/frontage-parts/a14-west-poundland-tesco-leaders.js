// Area a14-west-poundland-tesco-leaders: the block between the Triangle and the Cobbold Road corner, from the user's
// Street View photos (docs/research/hamilton-road-streetview: poundland-block-corner, poundland-shopfront,
// leaders-poundland-row, evolved-cake-close, specsavers-90-row, tesco-express-front/-corner, cobbold-road-crossing-tesco).
// Heights are scaled from the photos (not surveyed). Building ids are OSM way ids.
//   732472261  the north end of the 1960s block at the York Road corner (the empty black unit, "To let" offices over)
//   732472260  Poundland (96-96A): three-storey 1960s block, red-brick bands under cream window strips
//   688756407  Leaders and Evolved Cake & Desserts: Edwardian red-brick terrace pair (OSM still says Felixstowe Funeralcare)
//   732472259  Specsavers (90): the Edwardian building dated 1905, bay window, arched doorways either side of the shop
//   206145280  Tesco Express (88) on the Cobbold Road corner: same 1960s block, blue fascia

const BLOCK_BRICK = [0.98, 0.68, 0.6];   // 1960s block: dark red-brown facing brick

export const FRONTAGES = {
  732472261: { addr: '1960s block, north end (empty unit)', photo: 'poundland-block-corner.png', height: 11.0, force: true, roofShape: 'flat', style: { facade: 'brick_red', tint: BLOCK_BRICK, roof: 'flat', windows: false },
    details: [{ t: 'modernBlock', edges: [
      { at: [124.95, -498.4], from: [125.6, -501.8], ground: 'black' },
      { at: [138.5, -499.4], from: [125.6, -501.8], ground: 'none' }] }] },
  732472260: { addr: '96-96A Poundland', photo: 'poundland-shopfront.png', height: 11.0, force: true, roofShape: 'flat', style: { facade: 'brick_red', tint: BLOCK_BRICK, roof: 'flat', windows: false },
    details: [{ t: 'modernBlock', edges: [{ at: [121.55, -480.7], from: [124.3, -495.0], ground: 'poundland', units: 4 }] }] },
  688756407: { addr: '92-94 Leaders and Evolved Cake & Desserts', photo: 'evolved-cake-close.png', height: 10.8, force: true, roofShape: 'flat', style: { facade: 'brick_red', tint: [1.0, 0.8, 0.68], roof: 'flat', windows: false },
    details: [{ t: 'leadersEvolved', at: [117.9, -461.5], from: [118.8, -466.4] }] },
  732472259: { addr: '90 Specsavers (dated 1905)', photo: 'specsavers-90-row.png', height: 11.8, force: true, roofShape: 'flat', style: { facade: 'brick_red', tint: [0.93, 0.68, 0.58], roof: 'flat', windows: false },
    details: [{ t: 'specsavers90', at: [116.15, -451.0], from: [117.0, -456.5] }] },
  206145280: { addr: '88 Tesco Express (Cobbold Road corner)', photo: 'tesco-express-corner.png', height: 11.0, force: true, roofShape: 'flat', style: { facade: 'brick_red', tint: BLOCK_BRICK, roof: 'flat', windows: false },
    details: [{ t: 'modernBlock', roofPlant: true, edges: [
      { at: [113.25, -433.15], from: [115.3, -445.4], ground: 'tesco', atm: true },
      { at: [124.9, -417.5], from: [111.2, -420.9], ground: 'tesco', cobbold: true }] }] },
};
export const SPLITS = {};
export const AREAS = {};
// Sign colours read from the photos (the sign board is drawn over each shop by shopfronts.js)
const SRC = ['User-supplied Street View capture, Sept 2026 (docs/research/hamilton-road-streetview)'];
export const FASCIAS = {
  'Poundland': { fascia: '#0a88a6', text: '#ffffff', case: 'mixed', font: 'sans', weight: 'bold', confidence: 'photo', sources: SRC },
  'Specsavers': { fascia: '#17a05a', text: '#ffffff', case: 'mixed', font: 'sans', weight: 'bold', confidence: 'photo', sources: SRC },
  'Leaders': { fascia: '#26309e', text: '#ffffff', case: 'upper', font: 'sans', weight: 'bold', confidence: 'photo', sources: SRC },
  'Evolved Cake & Desserts': { fascia: '#16161a', text: '#ffffff', case: 'upper', font: 'serif', weight: 'bold', confidence: 'photo', sources: SRC },
};
// OSM still has Felixstowe Funeralcare (92) at the south half of the Leaders/Evolved pair; the photos show Evolved Cake & Desserts.
export const OVERRIDES = {
  n6859058979: { name: 'Evolved Cake & Desserts', kind: 'bakery', status: 'replaced', was: 'Felixstowe Funeralcare', evidence: ['User-supplied Google Street View, Sept 2026 (docs/research/hamilton-road-streetview/evolved-cake-close.png)'], note: 'Cake and dessert shop between Leaders and Specsavers; the OSM node still says Felixstowe Funeralcare' },
};
// Leaders (estate agents) is missing from OSM; it is the north half of the same pair, beside Poundland.
export const ADDITIONS = [
  { id: 'x-leaders-94', name: 'Leaders', brand: 'Leaders', kind: 'estate_agent', addr: '94 Hamilton Road', lat: 51.96411518, lon: 1.35204860, evidence: ['User-supplied Google Street View, Sept 2026 (docs/research/hamilton-road-streetview/leaders-poundland-row.png)'] },
];
