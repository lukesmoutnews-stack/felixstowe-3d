// Area a15-west-shops-37-91: the west side of Hamilton Road, house numbers 37 to 91, from the Street View photos
// supplied 26 Oct 2026 (docs/research/hamilton-road-streetview). Heights, widths and window positions are scaled from
// the photos (estimates, not surveyed). The `shopRow` feature (world/features/a15-west-shops-37-91.js) takes positions
// in metres from the SOUTH end of each building's street face.
const PHOTO = (note) => ({ confidence: 'photo', note });
const SLATE = [0.32, 0.33, 0.37], WHITEPT = '#f1eee6', CREAM = '#ebe0b9', STONE = '#cdbf98';
const EDGE = {
  733112155: [[72.9, -204.7], [71.9, -222.5]],
  733112150: [[71.9, -222.5], [71.8, -225.8]],
  733112154: [[71.8, -225.8], [71.6, -232.0]],
  733112151: [[72.1, -232.0], [71.8, -239.9]],
  733112152: [[71.8, -239.9], [71.4, -249.3]],
  733112153: [[71.4, -249.3], [70.8, -266.9]],
  733112149: [[73.7, -266.8], [74.9, -278.4]],
  506379060: [[74.9, -278.4], [76.6, -291.1]],
  733112147: [[76.6, -291.1], [77.4, -296.7]],
  733112148: [[77.9, -298.7], [78.9, -306.7]],
  688756415: [[78.9, -306.7], [81.0, -322.2]],
  506379097: [[81.5, -324.9], [84.5, -345.4]],
  733112146: [[87.0, -346.7], [89.0, -361.5]],
  506379103: [[90.9, -372.4], [97.1, -410.9]],
};
// street face (south end, north end) of each footprint, from the OSM outlines: the pedestrianised Hamilton Road is not a car road, so
// the shared street-edge finder picks a back wall and the feature needs its own edge
const sl = (id, o) => ({ t: 'shopRow', edge: EDGE[id], ...o });

export const FRONTAGES = {
  // 37 / Greggs: the south end is the white two-storey Greggs bay (sash windows, dentil cornice, chimney); the north end is the
  // derelict stock-brick block (No 37) with arched windows, two bays, a central gable, a grey fascia and a navy "to let" shop.
  // OSM draws both as one footprint, so the white bay is a skin over the stock-brick base. The split point is a guess.
  733112155: { addr: '35-37 (Greggs; derelict shop No 37)', photo: 'greggs-78.png; derelict-shopfront-37.png', height: 8.2, force: true, roofShape: 'hipped',
    style: { facade: 'brick_yellow', tint: [0.82, 0.78, 0.62], roof: 'slate', roofTint: SLATE },
    details: [
      sl(733112155, { dormers: [{ s: 12.9, w: 1.8 }], chimneys: [{ s: 2.2, inset: 2.4 }, { s: 17.0 }], cover: { mat: 'stock', tint: '#d6cca8' }, skins: [{ s0: 0.25, s1: 9.0, mat: WHITEPT, y0: 3.6 }],
        windows: [{ s: 3.1, w: 1.15, h: 1.9, y: 4.35 }, { s: 7.5, w: 1.15, h: 1.9, y: 4.35 },
          { s: 11.9, w: 0.7, h: 1.6, y: 4.4, arch: true, frame: STONE }, { s: 13.2, w: 0.7, h: 1.6, y: 4.4, arch: true, frame: STONE },
          { s: 12.55, w: 0.7, h: 0.9, y: 6.5, frame: STONE, bars: 1 }],
        cornices: [{ s0: 0.25, s1: 9.0 }, { s0: 9.0, s1: 17.7, col: '#3a3d44', dentils: false, out: 0.25, h: 0.3 }],
        bays: [{ s: 10.0, w: 1.9, y0: 4.2, y1: 6.9, cap: '#2b2d31' }, { s: 15.9, w: 2.5, y0: 4.2, y1: 6.9, frame: '#26282c', cap: '#2b2d31' }],
        fronts: [{ s0: 9.1, s1: 13.4, fascia: '#4b5058', door: 11.2 }, { s0: 13.5, s1: 17.7, fascia: '#1a2552', glass: '#1b232b', door: 16.0 }] }),
    ] },
  // Rickie's Bread & Beyond: a one-storey timber-boarded kiosk in the gap between two taller buildings
  733112150: { addr: "41 (Rickie's Bread & Beyond)", photo: 'rickies-grape-tree-41.png', height: 4.5, force: true, roofShape: 'flat', style: { facade: 'render', tint: [0.86, 0.7, 0.46], roof: 'flat' }, details: [] },
  // Grape Tree: red-brick two storeys, slate roof, a brick front gable and sash windows
  733112154: { addr: '41 (Grape Tree)', photo: 'rickies-grape-tree-41.png', height: 7.4, force: true, roofShape: 'hipped',
    style: { facade: 'brick_red', tint: [1, 0.93, 0.88], roof: 'slate', roofTint: SLATE },
    details: [sl(733112154, { chimneys: [{ s: 5.3 }], cover: { mat: 'brick', tint: '#ffeee0' }, windows: [{ s: 2.2, w: 1.2, h: 1.95, y: 4.3 }, { s: 4.9, w: 0.85, h: 1.7, y: 4.3 }, { s: 2.2, w: 0.8, h: 1.0, y: 7.55 }],
      cornices: [{ col: '#7a4a33', out: 0.22, h: 0.22 }], gables: [{ s: 2.2, w: 2.3, y0: 7.4, rise: 1.7, depth: 4, mat: 'brick', coping: '#2b2d31', roof: '#2b2d31' }] }),
    ] },
  // Bonmarche: red brick, cream string courses, three windows over a white shopfront
  733112151: { addr: '45 (Bonmarche)', photo: 'trespass-bonmarche-45.png', height: 7.0, force: true, roofShape: 'flat',
    style: { facade: 'brick_red', tint: [1, 0.9, 0.84], roof: 'flat' },
    details: [sl(733112151, { cover: { mat: 'brick', tint: '#ffe6d6' }, windows: [{ s: 1.1, w: 0.8, h: 1.45, y: 4.55 }, { s: 3.9, w: 1.6, h: 1.45, y: 4.55, mull2: true }, { s: 6.6, w: 0.9, h: 1.45, y: 4.55 }],
      bands: [{ y0: 3.95, y1: 4.2, col: '#ddd5c0' }, { y0: 6.2, y1: 6.4, col: '#ddd5c0' }], cornices: [{ col: '#ddd5c0', dentils: false, out: 0.22, h: 0.3 }] })] },
  // Trespass (OSM still says YMCA): red brick, three white-framed windows, a long blue fascia
  733112152: { addr: '47 (Trespass)', photo: 'trespass-bonmarche-45.png', height: 7.4, force: true, roofShape: 'flat',
    style: { facade: 'brick_red', tint: [0.98, 0.86, 0.8], roof: 'flat' },
    details: [sl(733112152, { cover: { mat: 'brick', tint: '#fad8c8' }, windows: [{ s: 1.6, w: 1.0, h: 1.6, y: 4.6 }, { s: 3.7, w: 1.2, h: 1.6, y: 4.6 }, { s: 6.0, w: 1.3, h: 1.6, y: 4.6 }],
      cornices: [{ col: '#d9d3c4', dentils: false, out: 0.18, h: 0.3 }] })] },
  // Peacocks: long red-brick block, white cladding band over the shopfront, eight small windows
  733112153: { addr: '44 (Peacocks)', photo: 'peacocks-44.png', height: 8.2, force: true, roofShape: 'flat',
    style: { facade: 'brick_red', tint: [0.98, 0.84, 0.78], roof: 'flat' },
    details: [sl(733112153, { cover: { mat: 'brick', tint: '#fad4c4' }, skins: [{ s0: 0.2, s1: 17.4, mat: '#e7e5df', y0: 3.5, y1: 4.55 }],
      windows: [2.7, 4.8, 6.5, 8.0, 9.7, 11.7, 13.5, 15.0].map((s, i) => ({ s, w: i === 1 || i === 5 ? 1.5 : 0.95, h: 1.55, y: 5.0, surround: 0.06, frame: '#e9e6dc' })),
      bands: [{ y0: 6.85, y1: 7.35, s0: 2.1, s1: 8.7, col: '#d9d3c4' }], cornices: [{ col: '#d9d3c4', dentils: false, out: 0.15, h: 0.3 }] })] },
  // Poundstretcher: white Art Deco upper floor with tall multi-pane windows, red fascia below
  506379060: { addr: '55 (Poundstretcher)', photo: 'poundstretcher-55.png', height: 8.8, force: true, roofShape: 'flat',
    style: { facade: 'render', tint: [1, 1, 0.98], roof: 'flat' },
    details: [sl(506379060, { cover: { mat: '#f4f2ea' }, windows: [1.4, 3.9, 6.4, 8.9, 11.4].map((s) => ({ s, w: 1.2, h: 2.5, y: 4.7, bars: 3, mull2: true, surround: 0.14, frame: '#e4e1d6' })),
      bands: [{ y0: 4.0, y1: 4.2, col: '#e4e1d6' }, { y0: 8.0, y1: 8.25, col: '#e4e1d6' }], cornices: [{ col: '#e4e1d6', dentils: false, out: 0.2, h: 0.35 }] })] },
  // Russell Smith (53): Edwardian red brick and stone, two shaped gables, canted bays, arched windows, corner turret
  733112149: { addr: '53 (Russell Smith)', photo: 'russell-smith-53.png', height: 11.0, force: true, roofShape: 'flat',
    style: { facade: 'brick_red', tint: [1, 0.88, 0.8], roof: 'flat' },
    details: [sl(733112149, { cover: { mat: 'brick', tint: '#ffe0cc' }, pilasters: [{ s: 0.6, col: STONE, y0: 4.1, y1: 11 }, { s: 5.7, col: STONE, y0: 4.1, y1: 11 }, { s: 11.0, col: STONE, y0: 4.1, y1: 11 }],
      bands: [{ y0: 3.95, y1: 4.35, col: STONE, out: 0.15 }, { y0: 7.55, y1: 8.05, col: STONE, out: 0.2 }],
      bays: [{ s: 3.2, w: 3.3, y0: 4.45, y1: 7.5, frame: STONE, panes: 4, cap: STONE }, { s: 8.4, w: 3.7, y0: 4.45, y1: 7.5, frame: STONE, panes: 4, cap: STONE }],
      windows: [{ s: 3.4, w: 1.1, h: 1.9, y: 8.7, arch: true, frame: STONE }, { s: 8.0, w: 1.4, h: 2.3, y: 8.4, arch: true, frame: STONE },
        { s: 5.1, w: 0.5, h: 1.6, y: 8.8, frame: STONE }, { s: 6.3, w: 0.5, h: 1.6, y: 8.8, frame: STONE }, { s: 9.9, w: 0.5, h: 1.6, y: 8.8, frame: STONE }, { s: 10.7, w: 0.5, h: 1.6, y: 8.8, frame: STONE }],
      cornices: [{ col: STONE, dentils: false, out: 0.35, h: 0.35 }],
      gables: [{ s: 3.4, w: 4.2, y0: 11.0, rise: 2.5, depth: 9, mat: 'brick', coping: STONE, roof: '#3d4046' }, { s: 8.0, w: 5.0, y0: 11.0, rise: 2.8, depth: 9, mat: 'brick', coping: STONE, roof: '#3d4046' }],
      turrets: [{ s: 0.95, w: 1.7, y0: 6.6, y1: 10.2, mat: STONE, cap: 2.4 }] })] },
  // Caffe Nero: cream-white painted two storeys, three small sash windows
  733112147: { addr: '59 (Caffe Nero)', photo: 'caffe-nero-max-spielmann-61.png', height: 6.4, force: true, roofShape: 'flat',
    style: { facade: 'render', tint: [0.95, 0.94, 0.9], roof: 'flat' },
    details: [sl(733112147, { cover: { mat: '#f1eee6' }, windows: [1.0, 2.9, 4.7].map((s) => ({ s, w: 0.8, h: 1.5, y: 4.5, surround: 0.07 })), cornices: [{ col: '#ddd9cd', dentils: false, out: 0.2, h: 0.3 }], bands: [{ y0: 3.9, y1: 4.05, col: '#ddd9cd' }] })] },
  // Max Spielmann (61): dark red-brown brick block with white casement windows over a white fascia band
  733112148: { addr: '61 (Max Spielmann, empty unit to its south)', photo: 'max-spielmann-61.png', height: 7.9, force: true, roofShape: 'flat',
    style: { facade: 'brick_red', tint: [0.8, 0.54, 0.47], roof: 'flat' },
    details: [sl(733112148, { cover: { mat: 'brick', tint: '#cc8a78' }, skins: [{ s0: 0.2, s1: 7.8, mat: '#ecebe5', y0: 3.5, y1: 4.35 }], windows: [{ s: 2.0, w: 1.0, h: 1.5, y: 4.9, surround: 0.07 }, { s: 5.8, w: 1.1, h: 1.5, y: 4.9, surround: 0.07 }],
      cornices: [{ col: '#c9c5bb', dentils: false, out: 0.15, h: 0.3 }] })] },
  // EE / Phone Galaxy (69-71): Phone Galaxy's red-brick bay (south) beside white-painted brick, slate roof, two dormers
  688756415: { addr: '69-71 (Phone Galaxy, empty unit, EE/BT)', photo: 'phone-galaxy-69.png; ee-bt-71.png', height: 7.8, force: true, roofShape: 'hipped',
    style: { facade: 'render', tint: [1, 0.96, 0.9], roof: 'slate', roofTint: SLATE },
    details: [sl(688756415, { dormers: [{ s: 2.6, w: 1.6 }, { s: 12.3, w: 1.6 }], chimneys: [{ s: 6.8 }], cover: { mat: '#f1eee6' }, skins: [{ s0: 0.2, s1: 4.9, mat: 'brick', y0: 3.6 }],
      windows: [{ s: 1.3, w: 0.65, h: 1.9, y: 4.5, frame: '#e9e3d3' }, { s: 3.4, w: 1.2, h: 2.0, y: 4.4, frame: '#e9e3d3' },
        { s: 7.0, w: 1.2, h: 1.8, y: 4.6 }, { s: 9.6, w: 0.9, h: 1.8, y: 4.6 }, { s: 12.6, w: 1.3, h: 2.1, y: 4.4 }, { s: 14.6, w: 0.8, h: 1.7, y: 4.5 }],
      cornices: [{ s0: 0.2, s1: 4.9, col: '#cdb89a', dentils: false, out: 0.2, h: 0.3 }, { s0: 4.9, s1: 15.3 }] }),
    ] },
  // Wimpy / Card Factory / Clarks (about 63-67): white-painted brick (Clarks), cream (Card Factory), grey-blue (Wimpy), slate roof;
  // the first 5 m to the south are the white bay-windowed building beside EE (Hughes)
  506379097: { addr: '63-67 (Clarks, Card Factory, Wimpy)', photo: 'clarks-card-factory.png; all-things-nice-wimpy.png', height: 7.0, force: true, roofShape: 'hipped',
    style: { facade: 'render', tint: [0.97, 0.96, 0.93], roof: 'slate', roofTint: SLATE },
    details: [sl(506379097, { chimneys: [{ s: 1.5 }, { s: 12.0 }], cover: { mat: '#f1eee6' }, skins: [{ s0: 12.2, s1: 17.8, mat: CREAM, y0: 3.6 }, { s0: 17.8, s1: 20.6, mat: '#8d96a2', y0: 3.6 }],
      bays: [{ s: 2.6, w: 4.6, y0: 4.2, y1: 6.7, panes: 6, frame: '#efede6', cap: '#2b2d31' }],
      windows: [{ s: 8.4, w: 0.85, h: 1.6, y: 4.45, frame: '#2f4a36' }, { s: 14.9, w: 0.75, h: 1.6, y: 4.45 }, { s: 17.0, w: 0.6, h: 1.5, y: 4.5 }, { s: 19.4, w: 1.0, h: 1.5, y: 4.5 }] }),
      sl(733112146, { H: 8.4, cover: { mat: 'brick', tint: '#ffe0cc' }, skins: [{ s0: 0.25, s1: 7.6, mat: CREAM, y0: 3.6 }, { s0: 7.7, s1: 14.7, mat: '#f3f1ec', y0: 3.5, y1: 4.35 }],
      windows: [{ s: 2.3, w: 0.95, h: 2.25, y: 4.4, bars: 2 }, { s: 5.3, w: 0.95, h: 2.25, y: 4.4, bars: 2 }, { s: 10.1, w: 1.3, h: 2.3, y: 4.8, bars: 1, mull: true }, { s: 13.0, w: 1.3, h: 2.3, y: 4.8, bars: 1, mull: true }],
      balconies: [{ s0: 0.4, s1: 7.4, y: 3.95, depth: 0.7 }],
      cornices: [{ s0: 0.25, s1: 7.6, col: '#e9e3d6', dentils: false, out: 0.25, h: 0.3 }, { s0: 7.7, s1: 14.7, col: '#c9c1ac', dentils: false, out: 0.2, h: 0.3 }] }),
    ] },
  // Superdrug (83) and All Things Nice (81): red brick over Superdrug with French windows; cream upper with a white balcony over the cafe
  733112146: { addr: '81-83 (All Things Nice Cafe, Superdrug)', photo: 'clinton-cards-superdrug-83.png; all-things-nice-wimpy.png', height: 8.4, force: true, roofShape: 'flat',
    style: { facade: 'brick_red', tint: [1, 0.88, 0.8], roof: 'flat' },
    details: [] },
  // Savers / Holland & Barrett / Felixstowe Computers (91 and neighbours): a long white-painted two-storey terrace with an
  // eaves cornice and dentils, sash windows with moulded surrounds, pilasters at the party walls, tall chimneys
  506379103: { addr: '85-91 (Clinton Cards, Savers, Holland & Barrett, Felixstowe Computers)', photo: 'savers-91.png; felixstowe-computers-holland-barrett.png; clinton-cards-superdrug-83.png', height: 7.2, force: true, roofShape: 'hipped',
    style: { facade: 'render', tint: [1, 0.98, 0.94], roof: 'slate', roofTint: SLATE },
    details: [sl(506379103, { chimneys: [{ s: 12.0, inset: 1.4, pitch: 0 }, { s: 27.0, inset: 1.4, pitch: 0 }], cover: { mat: '#f2efe7' }, windows: [2.2, 5.4, 8.6, 11.8, 14.4, 17.9, 22.3, 28.4, 33.5, 37.2].map((s) => ({ s, w: 1.05, h: 1.9, y: 4.45, surround: 0.14 })),
      pilasters: [{ s: 16.0 }, { s: 24.8 }, { s: 31.6 }] }),
    ] },
};

export const SPLITS = {};      // none: the shared footprints are not four-cornered, so they are styled as one block each
export const AREAS = {};
export const FASCIAS = {
  // sign colours read from the photos (Sept 2026)
  'Felixstowe Computers': { fascia: '#1f3fb0', text: '#ffffff', case: 'upper', font: 'sans', weight: 'bold' },
  'Holland & Barrett': { fascia: '#0b6a43', text: '#ffffff', case: 'mixed', font: 'sans', weight: 'bold' },
  'Savers': { fascia: '#f4f5f7', text: '#2a63c4', case: 'lower', font: 'sans', weight: 'bold' },
  'Greggs': { fascia: '#2e3439', text: '#ffffff', case: 'upper', font: 'sans', weight: 'bold' },
  'Clinton Cards': { fascia: '#f5f1e6', text: '#e2511c', case: 'upper', font: 'sans', weight: 'bold' },
  'Superdrug': { fascia: '#141414', text: '#ffffff', case: 'lower', font: 'sans', weight: 'bold' },
  'All Things Nice Cafe': { fascia: '#2b1c12', text: '#e9a53b', case: 'upper', font: 'sans', weight: 'regular' },
  'Wimpy': { fascia: '#f2f1ee', text: '#d6121f', case: 'upper', font: 'sans', weight: 'bold' },
  'Card Factory': { fascia: '#1731a8', text: '#f6b800', case: 'mixed', font: 'sans', weight: 'bold' },
  'Clarks': { fascia: '#1f4630', text: '#ffffff', case: 'mixed', font: 'sans', weight: 'regular' },
  'EE': { fascia: '#1d6fb3', text: '#f9df2f', case: 'upper', font: 'sans', weight: 'bold' },
  'Phone Galaxy': { fascia: '#163fb4', text: '#ffffff', case: 'upper', font: 'sans', weight: 'bold' },
  'Max Spielmann': { fascia: '#1d3fb0', text: '#ffffff', case: 'mixed', font: 'sans', weight: 'bold' },
  'Caffè Nero': { fascia: '#a9c3e8', text: '#262626', case: 'upper', font: 'sans', weight: 'regular' },
  'Poundstretcher': { fascia: '#e32724', text: '#ffffff', case: 'mixed', font: 'sans', weight: 'bold' },
  'Russell Smith': { fascia: '#16241d', text: '#d3b768', case: 'upper', font: 'serif', weight: 'regular' },
  'Peacocks': { fascia: '#14151a', text: '#ffffff', case: 'upper', font: 'sans', weight: 'regular' },
  'Trespass': { fascia: '#0b3fd0', text: '#ffffff', case: 'upper', font: 'sans', weight: 'bold' },
  'Bonmarché': { fascia: '#f4f4f2', text: '#1a1a1a', case: 'mixed', font: 'serif', weight: 'regular' },
  "Rickie's Bread & Beyond": { fascia: '#c29b63', text: '#1a3b9a', case: 'mixed', font: 'sans', weight: 'bold' },
  'Grape Tree': { fascia: '#eef0ee', text: '#4a9a3a', case: 'mixed', font: 'sans', weight: 'regular' },
};
export const OVERRIDES = {
  n2678564732: { name: 'Felixstowe Computers', kind: 'computer', status: 'replaced', was: 'Felixstowe Mobiles', evidence: ['User-supplied Street View, Sept 2026 (felixstowe-computers-holland-barrett.png)'], note: 'Blue FELIXSTOWE COMPUTERS fascia beside Holland & Barrett' },
  n6865112051: { name: 'Clinton Cards', kind: 'gift', status: 'replaced', was: 'Clintons', evidence: ['User-supplied Street View, Sept 2026 (clinton-cards-superdrug-83.png)'], note: 'Cream fascia, orange CLINTON CARDS lettering' },
  n6865114887: { name: 'Trespass', kind: 'clothes', status: 'replaced', was: 'YMCA', evidence: ['User-supplied Street View, Sept 2026 (trespass-bonmarche-45.png)'], note: 'Blue TRESPASS fascia between Bonmarche and Peacocks' },
  w733112150: { name: "Rickie's Bread & Beyond", kind: 'sandwich', status: 'replaced', was: 'The Sandwich Shop', evidence: ['User-supplied Street View, Sept 2026 (rickies-grape-tree-41.png)'], note: "Rickie's Bread & Beyond, 'Sandwich Shop' on the board below" },
};
export const ADDITIONS = [];
