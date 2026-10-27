// Area a19-south-church-postoffice-jobcentre: the south end of Hamilton Road around Victoria Street, from the Street View photos supplied
// 26 Oct 2026 (docs/research/hamilton-road-streetview: j-* and k-* rows). Heights, widths and window positions are scaled from the photos
// (a door, a window or a person for scale); they are estimates, not surveyed. The code is in world/features/a19-south-church-postoffice-jobcentre.js:
// `a19Row` skins, glazes and decorates one street face; `church` draws the Methodist church gable, rose window and porch. Positions are
// metres along each edge (see EDGE below: the edge normal is (-uz, ux), so the edge runs the way that makes the normal point at the street).

const SLATE = [0.3, 0.31, 0.35], WHITEPT = '#f1eee6', CREAM = '#ebe0c0', TERRA = '#b9573a', STONE = '#d8b88c', DARK = '#2b2d31';
const BRICKT = '#ffd9bf', CLAY = '#8a4d3b';
const row = (edge, o) => ({ t: 'a19Row', edge, ...o });
const photo = (note) => ({ confidence: 'photo', note });
void photo;

// ---- edges ----
const E = {
  church: [[87.6, -177.4], [90.9, -165.1]],            // west gable end, s from the north
  poH: [[84.7, -164.3], [85.7, -144.4]],               // post office, Hamilton Road face, s from the north (19.9 m)
  poC: [[85.7, -144.4], [88.1, -141.9]],               // the chamfered corner (oriel)
  poV: [[88.1, -141.9], [114.6, -143.2]],              // Victoria Street face, s from the west (26.5 m)
  jcH: [[73.6, -160.8], [73.3, -172.3]],               // former Job Centre Plus, Hamilton Road face, s from the south
  jcC: [[73.3, -172.3], [70.7, -173.3]],               // the turret corner
  jcO: [[70.7, -173.3], [46.3, -162.2]],               // Orwell Road face, s from the east
  block60: [[74.2, -145.4], [73.6, -160.8]],           // 1960s balcony block, s from the south
  cafeW: [[85.6, -130.5], [85.7, -123.5]], cafeC: [[88.5, -134.6], [85.6, -130.5]], cafeN: [[101.3, -135.3], [88.5, -134.6]],
  vogue: [[85.7, -123.5], [86.4, -111.3]],             // Vogue + GlowGetter, s from the north (12.2 m)
  tony: [[86.4, -111.3], [87.3, -96.9]],               // Tony's Nails + China China, s from the north (14.4 m)
  card: [[87.3, -96.9], [87.5, -89.4]],                // The Card Centre (7.5 m)
  taxi: [[87.5, -89.4], [87.7, -84.7]],                // Coastal Taxis (4.7 m)
  abW: [[87.7, -84.7], [88.0, -77.5]], abC: [[88.0, -77.5], [90.3, -75.3]], abS: [[90.3, -75.3], [101.7, -76.0]],
};

// the 1960s block's floor slabs, parapets and columns, shared by the data below
const SLAB = '#cbc8bf', PARA = '#c7977e';

export const FRONTAGES = {
  // Felixstowe Methodist (Trinity) church: flint walls with cream stone dressings, steep slate roof, gable end to Hamilton Road with a large rose
  // window over three lancets, and a gabled porch (bright blue double door with black strap hinges) at the south end. OSM's footprint also holds the
  // hall behind; the base roof is hipped-inset, a guess.
  492767243: { addr: 'Methodist (Trinity) church', photo: 'j-methodist-church-corner.png; j-methodist-church-door-rose.png', height: 6.8, force: true, roofShape: 'flat',
    style: { facade: 'flint', roof: 'flat', winStyle: 0, windows: false },
    details: [{ t: 'church', edge: E.church, porchS: 11.0, rs: 6.35, roseY: 8.2 },
      row(E.church, { H: 6.8, cornices: false, skins: [{ s0: 0, s1: 12.7, mat: 'flint', tint: '#d9d0bb', y0: 0, y1: 6.8, d: 0.03 }],
        gables: [{ s: 6.35, w: 12.7, y0: 6.8, rise: 5.4, depth: 19, mat: 'flint', tint: '#d9d0bb', coping: '#d9cdae', roof: '#474b52', finial: true }] })] },

  // Former post office, Victoria Street corner: red-brick Queen Anne style, three storeys and attic, terracotta and stone dressings, shaped gables,
  // arched ground-floor windows with moulded brick architraves, a corbelled two-storey stone oriel on the chamfered corner, tall chimneys.
  506378835: { addr: 'Former post office, Victoria Street corner', photo: 'j-former-post-office-victoria-st-front.png; j-former-post-office-corner-oriel.png; j-former-post-office-victoria-st-wide.png', height: 11.4, force: true, roofShape: 'hipped',
    style: { facade: 'brick_red', tint: [1, 0.86, 0.78], roof: 'clay', roofTint: [0.62, 0.36, 0.3], winStyle: 0 },
    details: [
      row(E.poH, { H: 11.4, cover: { mat: 'brick', tint: BRICKT, y0: 0, y1: 11.4, s0: 0, s1: 19.9 },
        windows: [
          { s: 3.6, w: 1.3, h: 1.4, y: 2.6, arch: true, ring: TERRA, bars: 1, glass: '#6d7f88' },
          { s: 7.0, w: 1.5, h: 3.0, y: 0.95, arch: true, ring: TERRA, bars: 3, mull: true, glass: '#8e9ca2' }, { s: 10.4, w: 1.5, h: 3.0, y: 0.95, arch: true, ring: TERRA, bars: 3, mull: true, glass: '#8e9ca2' },
          { s: 13.8, w: 1.5, h: 3.0, y: 0.95, arch: true, ring: TERRA, bars: 3, mull: true, glass: '#8e9ca2' },
          { s: 3.6, w: 1.25, h: 2.3, y: 5.15, hood: TERRA, bars: 2 }, { s: 7.0, w: 1.25, h: 2.3, y: 5.15, bars: 2 }, { s: 10.4, w: 1.25, h: 2.3, y: 5.15, bars: 2 }, { s: 13.8, w: 1.25, h: 2.3, y: 5.15, bars: 2 }, { s: 17.2, w: 1.25, h: 2.3, y: 5.15, bars: 2 },
          { s: 3.6, w: 1.15, h: 1.9, y: 8.85 }, { s: 7.0, w: 1.15, h: 1.9, y: 8.85 }, { s: 10.4, w: 1.15, h: 1.9, y: 8.85 }, { s: 13.8, w: 1.15, h: 1.9, y: 8.85 }, { s: 17.2, w: 1.15, h: 1.9, y: 8.85 }],
        quads: [{ mat: 'flat|#efece4', s0: 2.65, s1: 4.55, y0: 0, y1: 2.9, d: 0.06 }, { mat: 'flat|#1b1a19', s0: 2.95, s1: 4.25, y0: 0.12, y1: 2.6, d: 0.1 }],
        bands: [{ y0: 4.3, y1: 4.6, col: TERRA, out: 0.14 }, { y0: 8.05, y1: 8.35, col: TERRA, out: 0.14 }, { y0: 0, y1: 0.5, col: '#5b3a2f', out: 0.08 }],
        cornices: [{ col: TERRA, dentils: false, out: 0.4, h: 0.5 }],
        gables: [{ s: 3.6, w: 3.4, y0: 11.4, rise: 2.8, depth: 7, mat: 'brick', tint: BRICKT, coping: STONE, roof: CLAY, window: { w: 1.0, h: 1.2, y: 0.5, frame: WHITEPT } },
          { s: 15.6, w: 4.4, y0: 11.4, rise: 3.5, depth: 9, mat: 'brick', tint: BRICKT, coping: STONE, roof: CLAY, window: { w: 1.4, h: 1.6, y: 0.7, frame: WHITEPT, mull2: true } }],
        chimneys: [{ s: 9.4, inset: 3.0, rise: 2.3, tint: '#d0987f' }, { s: 18.8, inset: 3.0, rise: 2.3, tint: '#d0987f' }],
        extraBoxes: [] }),
      row(E.poC, { H: 11.4, cornices: false,
        windows: [{ s: 1.73, w: 1.9, h: 3.4, y: 0.8, arch: true, ring: TERRA, bars: 3, mull: true, glass: '#9aa6ab' }],
        bays: [{ s: 1.73, w: 2.3, y0: 4.7, y1: 8.7, depth: 0.85, frame: '#d8b88c', glass: '#7d8b92', cap: '#c9a279', panes: 4, rails: 2, corbel: '#c9a279' }],
        extraBoxes: [{ col: '#c8102e', s: 0.2, d: 1.9, y0: 0, y1: 1.5, hs: 0.28, hd: 0.28 }, { col: '#14181c', s: 0.2, d: 1.9, y0: 0, y1: 0.18, hs: 0.31, hd: 0.31 }] }),
      row(E.poV, { H: 11.4, cover: { mat: 'brick', tint: BRICKT, y0: 0, y1: 11.4, s0: 0, s1: 26.4 },
        windows: [
          { s: 3.6, w: 1.5, h: 3.0, y: 0.95, arch: true, ring: TERRA, bars: 3, mull: true, glass: '#8e9ca2' }, { s: 7.0, w: 1.5, h: 3.0, y: 0.95, arch: true, ring: TERRA, bars: 3, mull: true, glass: '#8e9ca2' },
          { s: 10.4, w: 1.1, h: 1.5, y: 2.5, arch: true, ring: TERRA, bars: 1, glass: '#6d7f88' },
          { s: 12.4, w: 0.8, h: 2.7, y: 0.9, arch: true, ring: TERRA, bars: 0, mull: false, glass: '#9fb8a8' }, { s: 14.0, w: 0.8, h: 2.7, y: 0.9, arch: true, ring: TERRA, bars: 0, mull: false, glass: '#9fb8a8' }, { s: 15.6, w: 0.8, h: 2.7, y: 0.9, arch: true, ring: TERRA, bars: 0, mull: false, glass: '#9fb8a8' },
          ...[3.6, 7.0, 10.4, 13.8, 17.2, 20.6, 24.0].flatMap((s) => [{ s, w: 1.25, h: 2.3, y: 5.15, bars: 2 }, { s, w: 1.15, h: 1.9, y: 8.85 }])],
        quads: [{ mat: 'flat|#efece4', s0: 9.45, s1: 11.35, y0: 0, y1: 2.9, d: 0.06 }, { mat: 'flat|#1b1a19', s0: 9.75, s1: 11.05, y0: 0.12, y1: 2.6, d: 0.1 }],
        bands: [{ y0: 4.3, y1: 4.6, col: TERRA, out: 0.14 }, { y0: 8.05, y1: 8.35, col: TERRA, out: 0.14 }, { y0: 0, y1: 0.5, col: '#5b3a2f', out: 0.08 }],
        cornices: [{ col: TERRA, dentils: false, out: 0.4, h: 0.5 }],
        gables: [{ s: 5.3, w: 4.0, y0: 11.4, rise: 3.0, depth: 8, mat: 'brick', tint: BRICKT, coping: STONE, roof: CLAY, window: { w: 1.2, h: 1.4, y: 0.6, frame: WHITEPT, mull2: false } }],
        dormers: [{ s: 14.5, w: 1.8, col: WHITEPT, roof: '#3d4046' }, { s: 21.5, w: 1.8, col: WHITEPT, roof: '#3d4046' }],
        chimneys: [{ s: 9.2, inset: 3.0, rise: 2.4, tint: '#d0987f' }, { s: 25.0, inset: 3.0, rise: 2.2, tint: '#d0987f' }] }),
    ] },

  // Former Job Centre Plus on the corner of Hamilton Road and Orwell Road: red brick, three storeys, white sashes, hipped clay-tile roof with dormers,
  // a decagonal corner turret with a clock and a conical clay-tile roof, green fascia with a navy cornice over the glazed ground floor.
  733112156: { addr: 'Former Job Centre Plus, Hamilton Road / Orwell Road corner', photo: 'k-jobcentre-corner-turret.png; k-jobcentre-corner-side.png', height: 9.6, force: true, roofShape: 'hipped',
    style: { facade: 'brick_red', tint: [1, 0.84, 0.74], roof: 'clay', roofTint: [0.62, 0.36, 0.3], winStyle: 0 },
    details: [
      row(E.jcH, { H: 9.6, cover: { mat: 'brick', tint: '#f6c8ae', y0: 0, y1: 9.6, s0: 0, s1: 11.4 },
        quads: [{ mat: 'flat|#35a53b', s0: 0, s1: 11.4, y0: 3.0, y1: 3.95, d: 0.05 }, { mat: 'flat|#1b2c4a', s0: 0, s1: 11.4, y0: 3.95, y1: 4.35, d: 0.3 }],
        windows: [{ s: 3.0, w: 0.75, h: 1.9, y: 0.85, frame: '#26332f', glass: '#b8c0bc', surround: 0.06 }, { s: 4.6, w: 0.75, h: 1.9, y: 0.85, frame: '#26332f', glass: '#b8c0bc', surround: 0.06 },
          { s: 3.0, w: 1.0, h: 2.1, y: 5.0 }, { s: 5.4, w: 1.0, h: 2.1, y: 5.0 }, { s: 9.0, w: 1.15, h: 2.1, y: 5.0 }, { s: 3.0, w: 0.95, h: 1.7, y: 7.75 }, { s: 5.4, w: 0.95, h: 1.7, y: 7.75 }, { s: 9.0, w: 0.95, h: 1.7, y: 7.75 }],
        pilasters: [{ s: 6.7, w: 0.4, y0: 0, y1: 3.0, cap: false }],
        bands: [{ y0: 7.1, y1: 7.3, col: '#c25a36', out: 0.1 }], cornices: [{ col: WHITEPT, dentils: true, out: 0.42, h: 0.35 }],
        dormers: [{ s: 4.2, w: 1.7, col: WHITEPT, roof: CLAY }, { s: 8.8, w: 1.7, col: WHITEPT, roof: CLAY }] }),
      row(E.jcC, { H: 9.6, cornices: false,
        drums: [{ s: 1.39, d: -0.15, r: 2.05, n: 10, y0: 3.0, y1: 9.9, mat: 'brick', tint: '#f6c8ae', cornice: '#d8d0bc',
          rings: [{ y0: 3.0, y1: 3.95, r: 2.12, col: '#35a53b' }, { y0: 3.95, y1: 4.35, r: 2.4, col: '#1b2c4a' }],
          windows: [{ faces: [1, 2, 3], y: 5.1, h: 1.9, w: 0.95 }, { faces: [1, 2, 3], y: 7.75, h: 1.55, w: 0.9 }] }],
        cones: [{ s: 1.39, d: -0.15, r: 2.05, n: 10, y0: 9.95, rise: 4.4, over: 0.4, col: CLAY, finial: true }],
        clocks: [{ s: 1.39, d: 1.95, y: 4.4, r: 0.32 }] }),
      row(E.jcO, { H: 9.6, cover: { mat: 'brick', tint: '#f6c8ae', y0: 0, y1: 9.6, s0: 0, s1: 26.7 },
        quads: [{ mat: 'flat|#35a53b', s0: 0, s1: 26.7, y0: 3.0, y1: 3.95, d: 0.05 }, { mat: 'flat|#1b2c4a', s0: 0, s1: 26.7, y0: 3.95, y1: 4.35, d: 0.3 },
          { mat: 'flat|#cfd5d2', s0: 2.0, s1: 9.6, y0: 0.5, y1: 2.9, d: 0.1 }, { mat: 'flat|#2b3a36', s0: 2.0, s1: 9.6, y0: 0.5, y1: 0.7, d: 0.11 }, { mat: 'flat|#35a53b', s0: 14.0, s1: 15.4, y0: 1.9, y1: 3.0, d: 0.35 }],
        windows: [{ s: 11.6, w: 0.8, h: 1.8, y: 0.9, frame: '#26332f', glass: '#8fa0a0', surround: 0.06 }, { s: 13.0, w: 0.8, h: 1.8, y: 0.9, frame: '#26332f', glass: '#8fa0a0', surround: 0.06 },
          ...[4.2, 6.2, 9.2, 12.0, 15.2, 18.6, 22.0, 25.0].flatMap((s) => [{ s, w: 1.2, h: 2.2, y: 5.0 }, { s, w: 1.0, h: 1.7, y: 7.75 }])],
        pilasters: [{ s: 10.3, w: 0.4, y0: 0, y1: 3.0, cap: false }, { s: 9.7, w: 0.2, y0: 0.4, y1: 2.9, cap: false, col: '#26332f' }, { s: 2.0, w: 0.2, y0: 0.4, y1: 2.9, cap: false, col: '#26332f' }, { s: 5.8, w: 0.12, y0: 0.5, y1: 2.9, cap: false, col: '#26332f' }],
        bands: [{ y0: 7.1, y1: 7.3, col: '#c25a36', out: 0.1 }], cornices: [{ col: WHITEPT, dentils: true, out: 0.42, h: 0.35 }],
        dormers: [{ s: 6.5, w: 1.7, col: WHITEPT, roof: CLAY }, { s: 15.2, w: 1.7, col: WHITEPT, roof: CLAY }, { s: 22.0, w: 1.7, col: WHITEPT, roof: CLAY }],
        chimneys: [{ s: 11.0, inset: 3.0, rise: 1.9, tint: '#d0987f' }] }),
    ] },

  // 1960s three-storey block on the west side between Scott Beckett and the Job Centre: brown brick balcony parapets, grey concrete floor slabs and
  // columns, recessed dark window ribbons, a vacant glazed shop (roller shutter, grey marble) at the foot.
  688756417: { addr: '1960s balcony block (vacant shop)', photo: 'k-scott-beckett-vacant-block.png; k-vacant-60s-block-jobcentre.png', height: 9.6, force: true, roofShape: 'flat',
    style: { facade: 'brick_dark', tint: [0.86, 0.7, 0.6], roof: 'flat', windows: false },
    details: [row(E.block60, { H: 9.6, cornices: false,
      quads: [{ mat: 'flat|#d3d3cf', s0: 0, s1: 15.3, y0: 0, y1: 3.2, d: 0.05 }, { mat: 'glass|#20282d', s0: 0.9, s1: 6.4, y0: 0.45, y1: 2.95, d: 0.09 }, { mat: 'flat|#c5c7c4', s0: 7.2, s1: 9.0, y0: 0, y1: 2.9, d: 0.1 }, { mat: 'glass|#20282d', s0: 9.5, s1: 14.0, y0: 0.45, y1: 2.95, d: 0.09 },
        { mat: 'glass|#1a2025', s0: 0.3, s1: 15.0, y0: 4.4, y1: 5.7, d: 0.06 }, { mat: 'glass|#1a2025', s0: 0.3, s1: 15.0, y0: 7.5, y1: 8.8, d: 0.06 }],
      skins: [{ s0: 0, s1: 15.3, mat: 'brick', tint: PARA, y0: 3.55, y1: 4.4, d: 0.5 }, { s0: 0, s1: 15.3, mat: 'brick', tint: PARA, y0: 6.65, y1: 7.5, d: 1.0 }],
      slabs: [{ s0: -0.1, s1: 15.4, y: 3.2, depth: 0.5, thick: 0.35, col: SLAB }, { s0: -0.1, s1: 15.4, y: 6.3, depth: 1.0, thick: 0.35, col: SLAB }, { s0: -0.1, s1: 15.4, y: 9.3, depth: 1.0, thick: 0.4, col: SLAB }],
      cols: [0.4, 5.1, 10.2, 14.9].map((s) => ({ s, d: 0.9, y0: 3.55, y1: 9.3, w: 0.4, col: SLAB })) })] },

  // The Cafe on the Corner: two-storey cream render with a hipped slate roof, a white bay window upstairs on the corner, dark eaves and plinth,
  // wine-red fascias and pilasters.
  733112166: { addr: 'The Cafe on the Corner', photo: 'j-cafe-on-the-corner.png; j-cafe-corner-vogue-row.png', height: 6.0, force: true, roofShape: 'hipped',
    style: { facade: 'render', tint: [1, 0.96, 0.84], roof: 'slate', roofTint: [0.3, 0.3, 0.34], winStyle: 0 },
    details: [
      row(E.cafeN, { H: 6.0, cover: { mat: CREAM, y0: 3.3, y1: 6.0, s0: 0, s1: 12.7 }, cornices: [{ col: DARK, dentils: false, out: 0.5, h: 0.55 }],
        windows: [{ s: 7.2, w: 0.95, h: 1.55, y: 3.95 }, { s: 9.5, w: 0.95, h: 1.55, y: 3.95 }],
        bands: [{ y0: 0, y1: 0.45, col: '#2a2d33', out: 0.06 }],
        pilasters: [{ s: 0.4, w: 0.35, y0: 0, y1: 3.3, col: '#8c1f2d', cap: false }, { s: 12.3, w: 0.35, y0: 0, y1: 3.3, col: '#8c1f2d', cap: false }],
        fronts: [{ s0: 2.0, s1: 12.0, frame: '#8c1f2d', glass: '#232a30', y0: 3.0, inset: 0.3, bay: 3.2, gy0: 0.9, bw: 0.05 }] }),
      row(E.cafeC, { H: 6.0, cover: { mat: CREAM, y0: 3.3, y1: 6.0, s0: 0, s1: 4.9 }, cornices: [{ col: DARK, dentils: false, out: 0.5, h: 0.55 }],
        bays: [{ s: 2.5, w: 1.9, y0: 3.55, y1: 5.8, depth: 0.7, frame: WHITEPT, glass: '#a8b4ba', cap: '#2a2d33', panes: 3, corbel: WHITEPT }],
        pilasters: [{ s: 0.25, w: 0.35, y0: 0, y1: 3.3, col: '#8c1f2d', cap: false }, { s: 4.7, w: 0.35, y0: 0, y1: 3.3, col: '#8c1f2d', cap: false }],
        quads: [{ mat: 'glass|#232a30', s0: 0.5, s1: 4.5, y0: 0.9, y1: 2.7, d: 0.1 }] }),
      row(E.cafeW, { H: 6.0, cover: { mat: CREAM, y0: 3.3, y1: 6.0, s0: 0, s1: 6.9 }, cornices: [{ col: DARK, dentils: false, out: 0.5, h: 0.55 }],
        windows: [{ s: 3.4, w: 0.95, h: 1.55, y: 3.95 }], bands: [{ y0: 0, y1: 0.45, col: '#2a2d33', out: 0.06 }],
        fronts: [{ s0: 0.6, s1: 6.8, frame: '#8c1f2d', glass: '#20272c', y0: 3.0, inset: 0.3, bay: 3.0, gy0: 0.9, bw: 0.05 }] }),
    ] },

  // Vogue (charcoal fascia, pink wedge) and GlowGetter Tanning Studio (black fascia, white-framed glazing): a grey-painted interwar front with a deep
  // cornice, two white sash windows over Vogue and a wide white-framed window band over GlowGetter.
  733112165: { addr: 'Vogue / GlowGetter', photo: 'j-vogue-glowgetter.png; j-cafe-corner-vogue-row.png', height: 8.2, force: true, roofShape: 'flat',
    style: { facade: 'render', tint: [0.78, 0.8, 0.8], roof: 'flat', winStyle: 0 },
    details: [row(E.vogue, { H: 8.2, cover: { mat: '#c3c6c4', y0: 3.3, y1: 8.2, s0: 0, s1: 12.0 }, cornices: [{ col: '#d3d5d2', dentils: false, out: 0.42, h: 0.6 }],
      windows: [{ s: 1.7, w: 1.8, h: 1.7, y: 4.5, mull: true, bars: 1 }, { s: 4.25, w: 1.6, h: 1.7, y: 4.5, mull: true, bars: 1 }],
      bands: [{ y0: 6.9, y1: 7.15, col: '#d3d5d2', out: 0.12 }],
      pilasters: [{ s: 5.45, w: 0.55, y0: 3.3, y1: 7.6, col: '#bfc2c0' }],
      bays: [{ s: 9.3, w: 4.6, y0: 4.45, y1: 6.85, depth: 0.2, frame: '#f0f0ee', glass: '#c4ccd0', panes: 6, rails: 1 }],
      quads: [{ mat: 'flat|#d8a3a8', s0: 5.2, s1: 5.9, y0: 3.0, y1: 3.95, d: 0.2 }],
      fronts: [{ s0: 0.3, s1: 5.7, frame: '#1c1e22', glass: '#2c363c', y0: 3.0, inset: 0.3, bay: 1.35, gy0: 0.2, bw: 0.04, door: 1.5 }, { s0: 6.4, s1: 11.9, frame: '#f2f2f0', glass: '#2a3338', y0: 3.0, inset: 0.3, bay: 1.35, gy0: 0.25, bw: 0.05 }] })] },

  // Tony's Nails & Spa (black fascia, pink glazing bars) and China China (bright red timber shopfront over a grey marble plinth): weathered cream render
  // above, white sash windows, slate roof.
  733112164: { addr: "Tony's Nails & Spa / China China", photo: 'j-tonys-nails-china-china.png; j-card-centre-coastal-taxis.png', height: 7.2, force: true, roofShape: 'hipped',
    style: { facade: 'render', tint: [1, 0.95, 0.8], roof: 'slate', roofTint: [0.3, 0.3, 0.34], winStyle: 0 },
    details: [row(E.tony, { H: 7.2, cover: { mat: '#e8dec2', y0: 3.3, y1: 7.2, s0: 0, s1: 14.2 }, cornices: [{ col: '#33363b', dentils: false, out: 0.4, h: 0.3 }],
      windows: [{ s: 1.9, w: 0.95, h: 1.55, y: 4.1, surround: 0.14 }, { s: 5.6, w: 0.95, h: 1.55, y: 4.1, surround: 0.14 }, { s: 9.0, w: 0.9, h: 1.5, y: 4.15 }, { s: 11.9, w: 0.9, h: 1.5, y: 4.15 }],
      chimneys: [{ s: 3.8, inset: 2.0, rise: 1.5, tint: '#c79a80' }],
      pilasters: [{ s: 7.45, w: 0.4, y0: 0, y1: 3.3, col: '#d3202a', cap: false }, { s: 13.4, w: 0.4, y0: 0, y1: 3.3, col: '#d3202a', cap: false }],
      quads: [{ mat: 'flat|#8b9096', s0: 7.7, s1: 13.2, y0: 0, y1: 1.0, d: 0.12 }, { mat: 'flat|#d3202a', s0: 7.7, s1: 13.2, y0: 2.45, y1: 3.0, d: 0.12 }],
      fronts: [{ s0: 0.4, s1: 7.2, frame: '#e0509a', glass: '#c9e3e7', y0: 3.0, inset: 0.2, bay: 1.15, gy0: 0.45, bw: 0.045 }, { s0: 7.7, s1: 13.3, frame: '#d3202a', glass: '#2a1a14', y0: 2.45, inset: 0.25, bay: 2.7, gy0: 1.0, bw: 0.07 }] })] },

  // The Card Centre: grey-painted front, one upper sash with a moulded surround, parapet cornice, navy fascia over a white-pilastered shopfront.
  733112163: { addr: 'The Card Centre (6 Hamilton Road)', photo: 'j-card-centre-coastal-taxis.png', height: 7.4, force: true, roofShape: 'flat',
    style: { facade: 'render', tint: [0.7, 0.72, 0.72], roof: 'flat', winStyle: 0 },
    details: [row(E.card, { H: 7.4, cover: { mat: '#a9acab', y0: 3.3, y1: 7.4, s0: 0, s1: 7.3 }, cornices: [{ col: '#bfc2c0', dentils: false, out: 0.42, h: 0.55 }],
      windows: [{ s: 3.7, w: 1.05, h: 1.75, y: 4.35, surround: 0.3, frame: '#c8cbc9', bars: 1, mull: true }],
      bands: [{ y0: 6.3, y1: 6.5, col: '#bfc2c0', out: 0.12 }],
      pilasters: [{ s: 0.5, w: 0.4, y0: 0, y1: 3.4, col: WHITEPT }, { s: 6.9, w: 0.4, y0: 0, y1: 3.4, col: WHITEPT }],
      quads: [{ mat: 'flat|#1b2a7a', s0: 1.6, s1: 5.9, y0: 0, y1: 0.55, d: 0.14 }, { mat: 'flat|#9a9d9c', s0: 6.15, s1: 6.8, y0: 0.15, y1: 2.5, d: 0.12 }],
      fronts: [{ s0: 0.9, s1: 6.0, frame: '#f2f0ea', glass: '#c98a3a', y0: 3.0, inset: 0.3, bay: 2.5, gy0: 0.55, bw: 0.06 }] })] },

  // Coastal Taxis: cream render with one window over a white front and a black plinth
  733112162: { addr: 'Coastal Taxis', photo: 'j-card-centre-coastal-taxis.png; j-coastal-taxis-abglass.png', height: 5.8, force: true, roofShape: 'hipped',
    style: { facade: 'render', tint: [1, 0.95, 0.82], roof: 'slate', roofTint: [0.3, 0.3, 0.34], winStyle: 0 },
    details: [row(E.taxi, { H: 5.8, cover: { mat: '#e8dfc4', y0: 3.2, y1: 5.8, s0: 0, s1: 4.6 }, cornices: [{ col: '#2f3237', dentils: false, out: 0.3, h: 0.25 }],
      windows: [{ s: 2.4, w: 0.95, h: 1.5, y: 3.85 }], bands: [{ y0: 0, y1: 0.5, col: '#17181a', out: 0.08 }],
      pilasters: [{ s: 0.3, w: 0.4, y0: 0, y1: 3.2, col: WHITEPT, cap: false }, { s: 4.4, w: 0.4, y0: 0, y1: 3.2, col: WHITEPT, cap: false }],
      fronts: [{ s0: 0.8, s1: 4.1, frame: '#f2f0ea', glass: '#98a5aa', y0: 3.0, inset: 0.2, bay: 1.6, gy0: 1.0, bw: 0.05 }] })] },

  // A&B Glass Home Improvements: new-build corner, dark glazed-brick ground floor with big shop windows, white render above, two steep slate gables
  // with glazed windows, a glass balcony across the first floor.
  506378826: { addr: 'A&B Glass Home Improvements', photo: 'j-abglass-corner-1.png; j-abglass-corner-2.png', height: 6.7, force: true, roofShape: 'flat',
    style: { facade: 'render', tint: [1, 0.99, 0.95], roof: 'flat', winStyle: 1 },
    details: [
      row(E.abS, { H: 6.7, cover: { mat: 'brick', tint: '#4b5566', y0: 0, y1: 3.4, s0: 0, s1: 11.4 }, cornices: false,
        quads: [{ mat: 'flat|#16191d', s0: 0, s1: 11.4, y0: 3.1, y1: 3.95, d: 0.1 }],
        fronts: [{ s0: 0.9, s1: 5.2, frame: '#2a2f35', glass: '#1a2026', y0: 3.1, inset: 0.15, bay: 1.4, gy0: 0.35, bw: 0.05 }, { s0: 6.2, s1: 10.8, frame: '#2a2f35', glass: '#1a2026', y0: 3.1, inset: 0.15, bay: 1.5, gy0: 0.35, bw: 0.05 }],
        windows: [{ s: 3.9, w: 2.9, h: 2.35, y: 4.15, frame: '#272b30', glass: '#566670', surround: 0.06, mull2: true, bars: 0, sill: false }, { s: 9.0, w: 2.9, h: 2.35, y: 4.15, frame: '#272b30', glass: '#566670', surround: 0.06, mull2: true, bars: 0, sill: false }],
        glassBalconies: [{ s0: 0.4, s1: 11.0, y: 3.9, depth: 1.1 }],
        gables: [{ s: 3.9, w: 4.9, y0: 6.7, rise: 3.1, depth: 8, mat: '#f4f1ea', coping: '#2b3036', roof: '#434a56', window: { w: 1.7, h: 1.5, y: 0.25, frame: '#272b30', glass: '#566670', surround: 0.05, bars: 0 } },
          { s: 8.9, w: 4.9, y0: 6.7, rise: 3.1, depth: 8, mat: '#f4f1ea', coping: '#2b3036', roof: '#434a56', window: { w: 1.7, h: 1.5, y: 0.25, frame: '#272b30', glass: '#566670', surround: 0.05, bars: 0 } }] }),
      row(E.abC, { H: 6.7, cover: { mat: 'brick', tint: '#4b5566', y0: 0, y1: 3.4, s0: 0, s1: 3.2 }, cornices: false, skins: [{ s0: 0, s1: 3.2, mat: '#f4f1ea', y0: 3.4, y1: 6.7 }],
        quads: [{ mat: 'flat|#16191d', s0: 0, s1: 3.2, y0: 3.1, y1: 3.95, d: 0.1 }, { mat: 'glass|#1a2026', s0: 0.8, s1: 2.4, y0: 0.15, y1: 2.8, d: 0.12 }, { mat: 'flat|#2a2f35', s0: 0.7, s1: 0.8, y0: 0.1, y1: 2.9, d: 0.13 }, { mat: 'flat|#2a2f35', s0: 2.4, s1: 2.5, y0: 0.1, y1: 2.9, d: 0.13 }] }),
      row(E.abW, { H: 6.7, cover: { mat: 'brick', tint: '#4b5566', y0: 0, y1: 3.4, s0: 0, s1: 7.2 }, cornices: false, skins: [{ s0: 0, s1: 7.2, mat: '#f4f1ea', y0: 3.4, y1: 6.7 }],
        quads: [{ mat: 'flat|#16191d', s0: 0, s1: 7.2, y0: 3.1, y1: 3.95, d: 0.1 }],
        fronts: [{ s0: 3.4, s1: 6.6, frame: '#2a2f35', glass: '#1a2026', y0: 3.1, inset: 0.15, bay: 0.9, gy0: 0.35, bw: 0.05 }] }),
    ] },
};
export const SPLITS = {};
export const AREAS = {};
const FASC = (fascia, text, o = {}) => ({ fascia, text, case: 'upper', font: 'sans', weight: 'bold', ...o });
export const FASCIAS = {
  'Vogue': FASC('#2c2e33', '#f4f1ea', { case: 'upper', weight: 'regular' }),
  'GlowGetter Tanning Studio': FASC('#15110e', '#f2773a', { case: 'mixed' }),
  "Tony's Nails & Spa": FASC('#1d1f23', '#f4f1ea'),
  'China China': FASC('#c8161e', '#f2d58a', { font: 'serif' }),
  'The Card Centre': FASC('#161f86', '#f4f1ea', { case: 'mixed', font: 'serif', weight: 'regular' }),
  'The Cafe on the Corner': FASC('#7a1f2e', '#ffffff', { font: 'serif' }),
  'Scott Beckett': FASC('#f26a1b', '#ffffff', { case: 'mixed', font: 'serif', weight: 'regular' }),
  'Job Centre Plus': FASC('#35a53b', '#ffffff', { case: 'mixed' }),
  'Coastal Taxis': FASC('#f1f1ee', '#6b6e70', { weight: 'regular' }),
  'A&B Glass Home Improvements': FASC('#16191d', '#f4f1ea', { weight: 'regular' }),
};
export const OVERRIDES = {
  n6865114970: { name: 'GlowGetter Tanning Studio', kind: 'beauty', status: 'replaced', was: 'The Thrifty Thistle', evidence: ['User-supplied Google Street View, Oct 2026 (docs/research/hamilton-road-streetview/j-vogue-glowgetter.png)'], note: 'Shown beside Vogue in the photo; the OSM node still says The Thrifty Thistle' },
};
export const ADDITIONS = [
  { id: 'x-scottbeckett', name: 'Scott Beckett', kind: 'estate_agent', addr: 'Hamilton Road', lat: 51.961233, lon: 1.351082, evidence: ['User-supplied Google Street View, Oct 2026 (k-basic-charity-scott-beckett.png)'] },
  { id: 'x-jobcentre', name: 'Job Centre Plus', kind: 'office', addr: 'Hamilton Road / Orwell Road (former)', lat: 51.96147, lon: 1.351129, evidence: ['User-supplied Google Street View, Oct 2026 (k-jobcentre-corner-turret.png)'] },
  { id: 'x-coastaltaxis', name: 'Coastal Taxis', kind: 'taxi', addr: 'Hamilton Road', lat: 51.960743, lon: 1.35137, evidence: ['User-supplied Google Street View, Oct 2026 (j-card-centre-coastal-taxis.png)'] },
  { id: 'x-abglass', name: 'A&B Glass Home Improvements', kind: 'doityourself', addr: 'Hamilton Road', lat: 51.960683, lon: 1.351441, evidence: ['User-supplied Google Street View, Oct 2026 (j-abglass-corner-1.png)'] },
];
