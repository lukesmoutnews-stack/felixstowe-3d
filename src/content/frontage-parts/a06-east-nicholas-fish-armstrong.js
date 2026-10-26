// Area a06-east-nicholas-fish-armstrong: data only.
// Hamilton Road at the St Andrew's Road corner (east side of the street, odd numbers 175-183):
//  - 732472257: Nicholas Estates, a two-storey 1980s red-brick corner block south of St Andrew's Road
//    (low hipped slate roof, cross gable over the south bay, cream window surrounds, navy fascias).
//  - 732472258: the block north of St Andrew's Road, one 381 m2 footprint in OSM: Hamilton Fish & Chips (blue
//    shopfront on the corner, brick gable on the St Andrew's Road side), Spice Hut, Armstrong & North (three
//    storeys, two white oriel bays, blue fascia) and the East of England Co-op Funeral Services (white, two big
//    white bay windows under a brown tiled hipped roof). A 12-point outline cannot be split, so it is styled as one
//    building and world/features/a06-... draws the separate units and roofs.
// Photos: docs/research/hamilton-road-streetview/e-nicholas-estates-corner-hamilton.png, e-nicholas-estates-standrews.png,
// e-hamilton-fish-chips-corner.png, e-armstrong-north-coop-funeral.png. Heights and positions are estimates scaled from
// those photos (a door and the pavement for scale), not surveyed. Roofs, windows and shopfronts are all drawn by the
// feature code, so the base walls are plain brick (windows: false) with a flat deck hidden under the drawn roofs.
const SRC = ['User-supplied Street View capture, 2026 (docs/research/hamilton-road-streetview/e-hamilton-fish-chips-corner.png, e-armstrong-north-coop-funeral.png)'];

export const FRONTAGES = {
  732472257: {
    addr: 'Nicholas Estates, 179 Hamilton Road (corner of St Andrew\'s Road)',
    photo: 'e-nicholas-estates-corner-hamilton.png',
    height: 5.85, force: true, roofShape: 'flat',
    style: { facade: 'brick_red', tint: [1.22, 1.04, 0.9], roof: 'flat', windows: false },
    details: [{ t: 'a06Nicholas' }],
  },
  732472258: {
    addr: '175-183 Hamilton Road (Hamilton Fish & Chips, Spice Hut, Armstrong & North, East of England Co-op Funeral Services)',
    photo: 'e-hamilton-fish-chips-corner.png',
    height: 6.2, force: true, roofShape: 'flat',
    style: { facade: 'brick_red', tint: [1.22, 1.04, 0.9], roof: 'flat', windows: false },
    details: [{ t: 'a06Block' }],
  },
};
export const SPLITS = {};      // none: the 12-point outline cannot be split
export const AREAS = {};
export const FASCIAS = {
  'Hamilton Fish & Chips': { fascia: '#1d4fd1', text: '#ffffff', case: 'upper', font: 'sans', weight: 'bold', sources: SRC },
  'Spice Hut': { fascia: '#f6f2e8', text: '#c4202b', case: 'mixed', font: 'serif', weight: 'bold', sources: SRC },
  'Armstrong & North': { fascia: '#2a3ccf', text: '#ffffff', case: 'mixed', font: 'sans', weight: 'bold', sources: SRC },
  'East of England Co-op Funeral Services': { fascia: '#f3f3f0', text: '#2a3568', case: 'mixed', font: 'serif', weight: 'regular', sources: SRC },
};
export const OVERRIDES = {
  // OSM still has Maharaja here; the photo (2026) shows Spice Hut at 177
  n6859058963: { name: 'Spice Hut', kind: 'fast_food', status: 'replaced', was: 'Maharaja', evidence: ['User-supplied Street View capture, 2026 (docs/research/hamilton-road-streetview/e-armstrong-north-coop-funeral.png)'], note: 'The photo shows a Spice Hut fascia over number 177; the OSM node still says Maharaja' },
  // the Co-op funeral director's fascia reads East of England Co-op, Funeral Services
  n6859058961: { name: 'East of England Co-op Funeral Services', kind: 'funeral_directors', status: 'replaced', was: 'The Co-operative Funeralcare', evidence: ['User-supplied Street View capture, 2026 (docs/research/hamilton-road-streetview/e-armstrong-north-coop-funeral.png)'], note: 'Photo: white fascia lettered East of England Co-op Funeral Services' },
};
export const ADDITIONS = [];
