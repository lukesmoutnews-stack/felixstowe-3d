// Area a04-east-prezzo-postoffice: east side of Hamilton Road from Prezzo to the single-storey post office range and the arcade.
// From the supplied Street View photos (docs/research/hamilton-road-streetview: e-prezzo-hado, e-prezzo-127vintage,
// e-jenny-riddell-wine-boutique, e-postoffice-arched-single-storey). Heights and widths are estimates scaled from the photos.
// The terrace is built as flat-roofed blocks with a pitched slate roof, dormers and chimneys added by the a04 features
// (OSM draws Prezzo as a notched L, which the standard roof code turns into a flat roof).
export const FRONTAGES = {
  // Prezzo (3 storeys + attic): orange-red brick, white sashes, black fascia and awnings, a run of dormers
  506379197: { addr: 'Prezzo, Hamilton Road', photo: 'e-prezzo-hado.png', height: 9.6, force: true, roofShape: 'flat', style: { facade: 'brick_red', tint: [1.7, 1.3, 0.85], roof: 'flat', winStyle: 0 },
    details: [{ t: 'a04Roof', A: [115.2, -552.2], C: [119, -569.1], endS: true, dormers: [0.27, 0.46, 0.77, 0.91], chimneys: [0.03, 0.52] }, { t: 'a04Prezzo', A: [115.2, -552.2], C: [119, -569.1] }] },
  // Hado Pharmacy: same terrace, blue lower shopfront, pale fascia
  732472272: { addr: 'Hado Pharmacy, Hamilton Road', photo: 'e-prezzo-hado.png', height: 9.3, force: true, roofShape: 'flat', style: { facade: 'brick_red', tint: [1.7, 1.3, 0.85], roof: 'flat', winStyle: 0 },
    details: [{ t: 'a04Roof', A: [119, -569.1], C: [120.6, -576.8], dormers: [0.55], chimneys: [0.15] }, { t: 'a04Hado', A: [119, -569.1], C: [120.6, -576.8] }] },
  // Jenny Riddell-Carpenter MP office (south part) and the Wine Boutique (north part): one OSM footprint split in two
  '264469566:w': { addr: '137 Hamilton Road (Jenny Riddell-Carpenter MP)', photo: 'e-jenny-riddell-wine-boutique.png', height: 9.0, force: true, roofShape: 'flat', style: { facade: 'brick_red', tint: [1.7, 1.3, 0.85], roof: 'flat', winStyle: 0 },
    details: [{ t: 'a04Roof', A: [120.6, -576.8], C: [122.28, -585.3], dormers: [0.4, 0.88] }, { t: 'a04Mp', A: [120.6, -576.8], C: [122.28, -585.3] }] },
  '264469566:e': { addr: 'Wine Boutique, Hamilton Road', photo: 'e-jenny-riddell-wine-boutique.png', height: 9.0, force: true, roofShape: 'flat', style: { facade: 'brick_red', tint: [1.7, 1.3, 0.85], roof: 'flat', winStyle: 0 },
    details: [{ t: 'a04Roof', A: [122.28, -585.3], C: [123.5, -591.5], endN: true, dormers: [0.5], chimneys: [0.85] }, { t: 'a04Wine', A: [122.28, -585.3], C: [123.5, -591.5] }] },
  // Single-storey red-brick former post office range (south) and the roofed arcade with round arches (north), one OSM footprint
  492767239: { addr: 'single-storey range and arcade, Hamilton Road', photo: 'e-postoffice-arched-single-storey.png', height: 3.9, force: true, roofShape: 'flat', style: { facade: 'brick_red', tint: [1.7, 1.3, 0.85], roof: 'flat', windows: false },
    details: [{ t: 'a04PostOffice', A: [123.8, -593.2], C: [125.9, -606.1] }, { t: 'a04Arcade', A: [125.9, -606.1], C: [128.8, -623.9] }] },
};
export const SPLITS = { 264469566: { at: 0.58 } };   // Jenny Riddell-Carpenter MP office (south, 'w') | Wine Boutique (north, 'e')
export const AREAS = {};
export const FASCIAS = {
  // black fascia with white capitals (photo: PREZZO in large pale capitals)
  'Prezzo': { fascia: '#15161a', text: '#f3f1ec', case: 'upper', font: 'sans', weight: 'regular' },
  // pale board with navy lettering
  'Hado Pharmacy': { fascia: '#e4e7ea', text: '#1b2f78', case: 'mixed', font: 'sans', weight: 'bold' },
  // dark green fascia, white serif-ish lettering
  'Jenny Riddell-Carpenter MP': { fascia: '#1e4a35', text: '#f1f2ee', case: 'mixed', font: 'sans', weight: 'bold' },
  // timber-slat fascia with a small plum/pale sign
  'Wine Boutique': { fascia: '#8a5b3a', text: '#f0e6ee', case: 'upper', font: 'serif', weight: 'regular' },
};
export const OVERRIDES = {};
export const ADDITIONS = [
  // not in OSM: the MP's constituency office, 137 Hamilton Road (name on the shop front in the photo)
  { id: 'x-mp-office-137', name: 'Jenny Riddell-Carpenter MP', kind: 'office', addr: '137 Hamilton Road', lat: 51.965162, lon: 1.352082, evidence: ['docs/research/hamilton-road-streetview/e-jenny-riddell-wine-boutique.png'] },
];
