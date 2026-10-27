// Area a10-east-quilting-fairstep-coral: data only.
// East side of Hamilton Road between the Orwell Hotel end and St Andrew's Road, four footprints:
//  - 506379227: the Edwardian three-storey brick range, KIS Quilting / Cancer Research UK / Sense (clay-tile roof, arched sashes
//    between brick pilasters, cream fascia band, gabled brick dormer with timber bargeboards, two chimney stacks). The OSM
//    outline also takes in the brick passage wall to the north and a big rear arm, so the first 6 m of street face are plain brick.
//  - 732472254: the 1960s flat-roofed block of The Original Factory Shop (glazed first floor with banners, white fascia).
//  - 732472255: the interwar three-storey brick block, Fairstep Solicitors / Look Sharp / Saxon Upholstery (stone cornice and
//    keystone panels, stone sills, white sashes).
//  - 732472256: the two-storey 1960s buff-brick corner block, Favorite Chicken and Coral, white fascia, turning into St Andrew's Road.
// Photos: docs/research/hamilton-road-streetview/f-quilting-cancer-research-sense.png, f-sense-original-factory-shop.png,
// f-fairstep-looksharp-saxon.png, f-saxon-favorite-coral.png, f-coral-corner-block.png. Heights, widths and window positions are
// scaled from the photos (a door and the pavement for scale), not surveyed. The walls are plain brick with windows: false; the
// feature code (world/features/a10-...) draws the windows, shopfronts, signs and roofs.
const SRC = ['User-supplied Street View capture, 2026 (docs/research/hamilton-road-streetview/f-*.png)'];

export const FRONTAGES = {
  506379227: {
    addr: '182-186 Hamilton Road (KIS Quilting, Cancer Research UK, Sense)',
    photo: 'f-quilting-cancer-research-sense.png',
    height: 6.6, force: true, roofShape: 'flat',
    style: { facade: 'brick_red', tint: [1.22, 1.04, 0.9], roof: 'flat', windows: false },
    details: [{ t: 'a10Edwardian' }],
  },
  732472254: {
    addr: 'The Original Factory Shop, Hamilton Road',
    photo: 'f-sense-original-factory-shop.png',
    height: 6.5, force: true, roofShape: 'flat',
    style: { facade: 'render', tint: [0.95, 0.95, 0.93], roof: 'flat', windows: false },
    details: [{ t: 'a10Factory' }],
  },
  732472255: {
    addr: 'Hamilton Road (Fairstep Solicitors, Look Sharp, Saxon Upholstery & Interiors)',
    photo: 'f-fairstep-looksharp-saxon.png',
    height: 8.6, force: true, roofShape: 'flat',
    style: { facade: 'brick_red', tint: [1.12, 0.9, 0.8], roof: 'flat', windows: false },
    details: [{ t: 'a10Fairstep' }],
  },
  732472256: {
    addr: '164 Hamilton Road (Favorite Chicken, Coral), corner of St Andrew\'s Road',
    photo: 'f-saxon-favorite-coral.png; f-coral-corner-block.png',
    height: 6.0, force: true, roofShape: 'flat',
    style: { facade: 'brick_yellow', tint: [1.0, 0.88, 0.7], roof: 'flat', windows: false },
    details: [{ t: 'a10Coral' }],
  },
};
export const SPLITS = {};      // none: the street faces are drawn by the feature code
export const AREAS = {};
export const FASCIAS = {
  'KIS Quilting': { fascia: '#8a5a3a', text: '#f4ece0', case: 'mixed', font: 'serif', weight: 'bold', sources: SRC },
  'Cancer Research UK': { fascia: '#2a2fa6', text: '#ffffff', case: 'upper', font: 'sans', weight: 'bold', sources: SRC },
  Sense: { fascia: '#f4f2ee', text: '#cf2f3a', case: 'mixed', font: 'sans', weight: 'bold', sources: SRC },
  'The Original Factory Shop': { fascia: '#1d3f96', text: '#ffffff', case: 'mixed', font: 'sans', weight: 'bold', sources: SRC },
  'Fairstep Solicitors': { fascia: '#f3f6f8', text: '#1f7fb6', case: 'upper', font: 'sans', weight: 'bold', sources: SRC },
  'Look Sharp': { fascia: '#141416', text: '#ffffff', case: 'mixed', font: 'sans', weight: 'bold', sources: SRC },
  'Saxon Upholstery & Interiors': { fascia: '#e9dfc4', text: '#33261b', case: 'mixed', font: 'serif', weight: 'regular', sources: SRC },
  Favorite: { fascia: '#f6f4f0', text: '#1d3e9e', case: 'upper', font: 'sans', weight: 'bold', sources: SRC },
  Coral: { fascia: '#1f3fbf', text: '#ffffff', case: 'upper', font: 'sans', weight: 'bold', sources: SRC },
};
export const OVERRIDES = {
  // the photo (2026) shows KIS Quilting where OSM still has the VapeStore at 186
  n6859058931: { name: 'KIS Quilting', kind: 'craft', status: 'replaced', was: 'VapeStore', evidence: ['User-supplied Street View capture, 2026 (docs/research/hamilton-road-streetview/f-quilting-cancer-research-sense.png)'], note: 'Photo: timber fascia lettered KIS Quilting; the OSM node still says VapeStore' },
  // the fascia reads FAVORITE, Britain's Tastiest Chicken
  n5842316485: { name: 'Favorite', kind: 'fast_food', status: 'replaced', was: 'Favourite Chicken & Ribs', evidence: ['User-supplied Street View capture, 2026 (docs/research/hamilton-road-streetview/f-saxon-favorite-coral.png)'], note: 'Photo: fascia spelt FAVORITE, Britain\'s Tastiest Chicken' },
};
export const ADDITIONS = [
  // not in OSM: Fairstep Solicitors (north unit of the interwar block) and The Original Factory Shop (the 1960s block), both named on their fascias in the photos
  { id: 'x-fairstep-166', name: 'Fairstep Solicitors', kind: 'office', addr: 'Hamilton Road (north unit of the interwar block)', lat: 51.966475, lon: 1.352886, evidence: ['docs/research/hamilton-road-streetview/f-fairstep-looksharp-saxon.png'] },
  { id: 'x-factory-shop-178', name: 'The Original Factory Shop', kind: 'clothes', addr: 'Hamilton Road (between Sense and Fairstep)', lat: 51.966573, lon: 1.352919, evidence: ['docs/research/hamilton-road-streetview/f-sense-original-factory-shop.png'] },
];
