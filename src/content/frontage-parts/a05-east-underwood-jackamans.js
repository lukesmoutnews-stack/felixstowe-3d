// Area a05-east-underwood-jackamans: data only. Add entries for your own buildings here and nowhere else.
// Hamilton Road, 151-171: Underwood Hardware & D.I.Y., Phillips Mobility and Phoenix Fruiterers in a three-storey Edwardian block
// (red brick, buff stone cornice and bands, roundels), then Scarborows Opticians (163) and Jackamans Solicitors (167-171) in a
// lower red-brick pair with dormers. OSM draws all five shops as one 41 m footprint (506379202); a 12-point outline cannot be
// split, so it is styled as one building and the features (world/features/a05-...) draw the two different fronts.
// Photos: docs/research/hamilton-road-streetview/e-underwood-hardware-corner.png, e-underwood-phillips-phoenix.png,
// e-scarborows-jackamans.png. Heights and positions are estimates scaled from those photos, not surveyed.
const SRC = ['User-supplied Street View capture, 2026 (docs/research/hamilton-road-streetview/e-underwood-phillips-phoenix.png, e-scarborows-jackamans.png)'];

export const FRONTAGES = {
  506379202: {
    addr: '151-171 Hamilton Road (Underwood Hardware, Phillips Mobility, Phoenix Fruiterers, Scarborows, Jackamans)',
    photo: 'e-underwood-phillips-phoenix.png',
    height: 9.6, force: true, roofShape: 'hipped-inset',
    style: { facade: 'brick_red', tint: [1, 0.96, 0.92], roof: 'slate', windows: false },
    details: [
      { t: 'edwardianBlock' },
      { t: 'scarborowsJackamans' },
      // slate roof dormers over Scarborows and Jackamans (photo: four, the third wider), and two brick stacks
      { t: 'dormers', at: [0.7184, 0.7829, 0.8421, 0.9193], width: 1.6 },
      { t: 'chimneys', at: [0.68, 0.955], inset: 2.4, rise: 1.5 },
    ],
  },
};
export const SPLITS = {};      // keyed by OSM building way id: { at: 0.5 } etc. (same format as content/frontages.js SPLITS)
export const AREAS = {};       // keyed by OSM area id (same format as FRONTAGE_AREAS)
export const FASCIAS = {       // shop sign styles by shop name (same fields as BRAND_STYLES entries)
  'Underwood Hardware & D.I.Y.': { fascia: '#6b1a26', text: '#e6d6a0', case: 'upper', font: 'serif', weight: 'bold', sources: SRC },
  'Phillips Mobility': { fascia: '#e6a395', text: '#5f1a35', case: 'mixed', font: 'serif', weight: 'bold', sources: SRC },
  'Phoenix Fruiterers': { fascia: '#1c2d22', text: '#e0c968', case: 'upper', font: 'serif', weight: 'bold', sources: SRC },
  'Scarborows Opticians': { fascia: '#27355a', text: '#ffffff', case: 'upper', font: 'sans', weight: 'regular', sources: SRC },
  'Jackamans Solicitors': { fascia: '#f3f1ea', text: '#2b2b2e', case: 'mixed', font: 'sans', weight: 'bold', sources: SRC },
};
export const OVERRIDES = {     // business overrides by OSM node id, e.g. n123 (same format as shops.js OVERRIDES)
  n1957116490: { name: 'Underwood Hardware & D.I.Y.', kind: 'doityourself', status: 'osm', evidence: ['User-supplied Street View, 2026 (e-underwood-phillips-phoenix.png): fascia reads UNDERWOOD HARDWARE & D.I.Y., 151'], note: 'OSM name "Underwoods"; the photographed fascia gives the full name' },
};
export const ADDITIONS = [     // businesses missing from OSM (same format as shops.js ADDITIONS)
  { id: 'x-scarborows-163', name: 'Scarborows Opticians', kind: 'optician', addr: '163 Hamilton Road', lat: 51.96581, lon: 1.352358, evidence: ['User-supplied Street View, 2026 (e-scarborows-jackamans.png): fascia reads SCARBOROWS OPTICIANS & HEARING CARE'] },
  { id: 'x-jackamans-167', name: 'Jackamans Solicitors', kind: 'solicitor', addr: '167-171 Hamilton Road', lat: 51.965875, lon: 1.352379, evidence: ['User-supplied Street View, 2026 (e-scarborows-jackamans.png): fascia reads Jackamans Solicitors 167-171'] },
];
