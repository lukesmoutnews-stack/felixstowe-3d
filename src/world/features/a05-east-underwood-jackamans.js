// Area a05-east-underwood-jackamans: custom building features. Export functions keyed by the `t` name used in your FRONTAGES details.
// Signature: (K, it, ctx) where K is the frame object from frontage-details.js and ctx = { b, ring, pointInRing, sideFrame }.
//
// Hamilton Road, west side of the road in world x (the "east side" of the town centre brief): 151 Underwood Hardware & DIY, Phillips
// Mobility and Phoenix Fruiterers in a three-storey Edwardian block (red brick, buff stone cornice, bands and sills), then
// Scarborows Opticians (navy) and Jackamans Solicitors 167-171 (white arched frontage, red logo stripe) in a lower red-brick
// pair under a slate roof with dormers. Everything is drawn as colour-batched boxes on the street wall (the building itself is
// built with windows:false so the window rhythm and shopfronts come from here). Positions are metres along the facade (s, from
// the south end) read off the Street View photos; measurements are estimates, not surveyed.

import * as THREE from 'three';

const STONE = 0xd2c5a6, STONE_DK = 0xbdb08f, WHITE = 0xf3f1ea, BLACK = 0x1d1e21, GLASS = 0x56677a, NET = 0xc9ccc8;
const GLOSSY = new Set([GLASS]);
const matCache = new Map();
function matFor(color) {
  let m = matCache.get(color);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: GLOSSY.has(color) ? 0.15 : 0.85, metalness: GLOSSY.has(color) ? 0.25 : 0, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    matCache.set(color, m);
  }
  return m;
}

/** Colour-batched box / polygon builder in the facade frame (s along, d out, y up). */
function builder(K) {
  const e = K.e, U = [e.ux, 0, e.uz], N = [e.nx, 0, e.nz];
  const parts = new Map();
  const geo = (c) => { let g = parts.get(c); if (!g) { g = { p: [], n: [], i: [] }; parts.set(c, g); } return g; };
  const face = (g, pts, nrm) => { const b = g.p.length / 3; for (const p of pts) { g.p.push(p[0], p[1], p[2]); g.n.push(nrm[0], nrm[1], nrm[2]); } g.i.push(b, b + 1, b + 2, b, b + 2, b + 3); };
  const neg = (v) => [-v[0], -v[1], -v[2]];
  const box = (c, s, d, y, hs, hd, hy) => {
    const g = geo(c), o = K.P(s, d, y);
    const v = (a, b, h) => [o[0] + U[0] * a * hs + N[0] * b * hd, o[1] + h * hy, o[2] + U[2] * a * hs + N[2] * b * hd];
    face(g, [v(-1, 1, -1), v(1, 1, -1), v(1, 1, 1), v(-1, 1, 1)], N);
    face(g, [v(-1, -1, -1), v(1, -1, -1), v(1, -1, 1), v(-1, -1, 1)], neg(N));
    face(g, [v(1, -1, -1), v(1, 1, -1), v(1, 1, 1), v(1, -1, 1)], U);
    face(g, [v(-1, -1, -1), v(-1, 1, -1), v(-1, 1, 1), v(-1, -1, 1)], neg(U));
    face(g, [v(-1, -1, 1), v(1, -1, 1), v(1, 1, 1), v(-1, 1, 1)], [0, 1, 0]);
  };
  /** convex polygon, points given as [s, d, y]; drawn as a fan facing out */
  const poly = (c, pts) => {
    const g = geo(c), b = g.p.length / 3;
    for (const q of pts) { const w = K.P(q[0], q[1], q[2]); g.p.push(w[0], w[1], w[2]); g.n.push(N[0], N[1], N[2]); }
    for (let k = 1; k < pts.length - 1; k++) g.i.push(b, b + k, b + k + 1);
  };
  /** quad of four [s,d,y] points with its own normal (canopies) */
  const slab = (c, a, b2, c2, d2) => {
    const g = geo(c), A = K.P(...a), B = K.P(...b2), C = K.P(...c2), D = K.P(...d2);
    const ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2], vx = D[0] - A[0], vy = D[1] - A[1], vz = D[2] - A[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1;
    face(g, [A, B, C, D], [nx / l, ny / l, nz / l]);
  };
  const disc = (c, s, d, y, r) => { const pts = []; for (let k = 0; k < 14; k++) { const a = (k / 14) * Math.PI * 2; pts.push([s + Math.cos(a) * r, d, y + Math.sin(a) * r]); } poly(c, pts); };
  const flush = () => {
    for (const [c, g] of parts) {
      const bg = new THREE.BufferGeometry();
      bg.setAttribute('position', new THREE.Float32BufferAttribute(g.p, 3));
      bg.setAttribute('normal', new THREE.Float32BufferAttribute(g.n, 3));
      bg.setIndex(g.i);
      const mesh = new THREE.Mesh(bg, matFor(c)); mesh.name = 'frontage:a05:' + c.toString(16); K.extra.push(mesh);
    }
  };
  return { box, poly, slab, disc, flush };
}

/** A white-framed sash window: frame, glass, glazing bars, stone sill, optional head. */
function win(B, s, y0, w, h, o = {}) {
  const hw = w / 2, d = o.d ?? 0.05, fr = 0.055, glass = o.glass ?? GLASS, white = o.frame ?? WHITE;
  B.box(white, s, d, y0 + h / 2, hw, 0.04, h / 2);                       // frame block
  B.box(glass, s, d + 0.045, y0 + h / 2, hw - fr, 0.02, h / 2 - fr);     // glass
  B.box(white, s, d + 0.07, y0 + h * 0.5, hw - fr * 0.5, 0.015, 0.03);   // meeting rail
  if (o.bars) { for (const f of [-1, 1]) B.box(white, s + f * (hw - fr) / 3, d + 0.07, y0 + h / 2, 0.015, 0.015, h / 2 - fr); B.box(white, s, d + 0.07, y0 + h * 0.75, hw - fr, 0.012, 0.015); B.box(white, s, d + 0.07, y0 + h * 0.25, hw - fr, 0.012, 0.015); }
  else B.box(white, s, d + 0.07, y0 + h / 2, 0.025, 0.015, h / 2 - fr);
  B.box(o.sill ?? STONE, s, d + 0.08, y0 - 0.06, hw + 0.12, 0.12, 0.06);   // sill
  if (o.head) B.box(o.head, s, d + 0.04, y0 + h + (o.headH ?? 0.1), hw + (o.headW ?? 0.14), 0.07, o.headH ?? 0.1);
}

// facade layout, metres along the street wall from its south end (Gainsborough Road side)
const X = { under: [0, 13.4], phil: [13.4, 20.4], phoe: [20.4, 27.0], scar: [27.0, 33.0], jack: [33.0, 41.0] };
const WALL_TOP = 9.6;       // the building's wall height (the Edwardian front is raised above it by the feature)
const TOP_ED = 12.2;        // parapet top of the Edwardian block
const UW = [1.4, 3.9, 7.1, 9.5, 11.9], PW = [14.6, 16.9, 19.2], FW = [21.6, 23.7, 25.8];

export const FEATURES = {
  /** the three-storey Edwardian block: Underwood (151), Phillips Mobility, Phoenix Fruiterers */
  edwardianBlock(K, it, ctx) {
    const B = builder(K), S0 = 0, S1 = X.phoe[1], sm = (S0 + S1) / 2, hs = (S1 - S0) / 2;
    // raised brick front above the wall (so the cornice and parapet read as the photo's 3-storey block)
    K.box('brick', sm, -0.03, (WALL_TOP + 10.45) / 2, hs, 0.05, (10.45 - WALL_TOP) / 2);
    // stone: ground-floor entablature, first and second floor bands, frieze, cornice, parapet
    B.box(STONE, sm, 0.10, 5.02, hs, 0.10, 0.18);                  // over the shopfronts
    B.box(STONE, sm, 0.06, 7.65, hs, 0.07, 0.17);                  // band between first and second floors
    B.box(STONE, sm, 0.10, 10.65, hs, 0.10, 0.28);                 // frieze
    B.box(STONE_DK, sm, 0.30, 11.12, hs + 0.15, 0.35, 0.24);       // cornice (deep, projecting)
    B.box(STONE, sm, 0.12, 11.78, hs + 0.1, 0.12, 0.38);           // parapet
    for (const c of [3.2, 13.4, 20.6, 26.2]) B.box(STONE, c, 0.12, 12.2, 1.1, 0.14, 0.18); // raised parapet blocks
    for (const c of [2.7, 8.3, 20.4]) B.disc(STONE, c, 0.12, 10.05, 0.36);                 // stone roundels between the top windows
    // windows: first floor tall, second floor shorter (photo), white sashes with glazing bars, stone sills and heads
    const cols = [...UW, ...PW, ...FW];
    cols.forEach((s, i) => {
      win(B, s, 5.62, 1.4, 1.85, { bars: s > 13.4, glass: i % 3 === 0 ? NET : GLASS, head: STONE, headH: 0.07 });
      win(B, s, 8.95, 1.4, 1.3, { bars: s > 13.4, glass: i % 4 === 1 ? NET : GLASS, head: STONE, headH: 0.07 });
    });
    // ---- Underwood Hardware & D.I.Y. (151): maroon fascia head, red canopy with arrow-lattice frame, goods outside ----
    const [u0, u1] = X.under;
    B.box(0xd8cfae, 0.45, 0.14, 2.5, 0.45, 0.14, 2.5);                    // stone end pier
    B.box(0xd8cfae, u1 - 0.4, 0.14, 2.5, 0.4, 0.14, 2.5);
    B.box(0x6b1a26, (u0 + u1) / 2, 0.08, 4.2, (u1 - u0) / 2 - 0.9, 0.07, 0.65); // fascia head (stock lettering board sits at its foot)
    B.box(0x3a434b, 5.2, 0.05, 1.5, 4.5, 0.02, 1.2);                     // shop glazing and interior behind the goods
    const stock = [0xd8b04a, 0xc8503a, 0x4f8a58, 0x4466a8, 0xe8e0c8, 0xb07a4a, 0xd4d0c4, 0xa83a50];   // shelves of hardware and DIY goods
    for (let k = 0; k < 16; k++) { const sx = 1.4 + k * 0.52 + (k % 3) * 0.04, hh = 0.5 + ((k * 37) % 7) * 0.13; B.box(stock[k % stock.length], sx, 0.09, 0.45 + hh / 2 + (k % 2) * 0.9, 0.2, 0.03, hh / 2); }
    B.box(0x5d1626, 11.2, 0.07, 1.2, 0.55, 0.05, 1.2);                   // maroon door
    B.box(GLASS, 11.2, 0.12, 1.5, 0.35, 0.01, 0.8);
    const cd = K.D(2.1);
    B.slab(0x99202c, [u0 + 0.9, 0.1, 2.95], [u1 - 0.9, 0.1, 2.95], [u1 - 0.9, cd, 2.45], [u0 + 0.9, cd, 2.45]); // red canopy slope
    B.box(0x99202c, (u0 + u1) / 2, cd, 2.3, (u1 - u0) / 2 - 0.9, 0.02, 0.17);   // valance
    for (const s of [1.2, 6.2, 12.2]) B.box(0xa5242f, s, cd - 0.05, 1.2, 0.04, 0.04, 1.2);  // red posts
    for (const [s, c, w, h] of [[2.3, 0xf0d63c, 0.7, 1.2], [3.5, 0x4a9a4a, 0.5, 1.0], [4.4, 0xd24a2a, 0.5, 1.0], [7.3, 0x8a6a3a, 0.9, 0.6], [8.7, 0xb08850, 0.8, 0.7], [9.7, 0x3e5fa8, 0.5, 0.9]])
      B.box(c, s, 0.6, h / 2, w / 2, 0.3, h / 2);                          // stock and goods on the pavement edge
    // ---- Phillips Mobility: black stallriser, orange-red frames round two shop windows and a central door, salmon head ----
    const [p0, p1] = X.phil, OR = 0xe2481a;
    B.box(BLACK, p0 + 0.3, 0.14, 2.5, 0.3, 0.14, 2.5); B.box(BLACK, p1 - 0.3, 0.14, 2.5, 0.3, 0.14, 2.5);
    B.box(0xe6a395, (p0 + p1) / 2, 0.08, 4.2, (p1 - p0) / 2 - 0.55, 0.07, 0.65);
    B.box(0x2f3a44, (p0 + p1) / 2, 0.05, 1.5, 2.9, 0.02, 1.2);           // glazing
    B.box(0xc8d3d8, (p0 + p1) / 2, 0.07, 1.6, 2.6, 0.01, 0.9);           // display (pale goods)
    B.box(BLACK, (p0 + p1) / 2, 0.08, 0.3, 3.0, 0.06, 0.3);              // stallriser
    for (const s of [p0 + 0.7, p0 + 2.7, p0 + 3.6, p0 + 4.5, p1 - 0.7]) B.box(OR, s, 0.1, 1.5, 0.05, 0.04, 1.5);
    B.box(OR, (p0 + p1) / 2, 0.1, 2.88, 2.95, 0.04, 0.05); B.box(OR, (p0 + p1) / 2, 0.1, 0.62, 2.95, 0.04, 0.04);
    B.box(OR, p0 + 3.15, 0.11, 1.0, 0.45, 0.03, 1.0);                      // door
    // ---- Phoenix Fruiterers: teal-green piers, dark head, grey roller shutter, dark green door ----
    const [f0, f1] = X.phoe, TEAL = 0x1f6a63;
    B.box(TEAL, f0 + 0.35, 0.14, 2.5, 0.35, 0.14, 2.5); B.box(TEAL, f1 - 0.4, 0.14, 2.5, 0.4, 0.14, 2.5);
    B.box(0x1c2d22, (f0 + f1) / 2, 0.08, 4.2, (f1 - f0) / 2 - 0.75, 0.07, 0.65);
    B.box(0x8d9195, f0 + 2.4, 0.07, 1.5, 1.95, 0.04, 1.5);                // roller shutter
    for (let y = 0.15; y < 3.0; y += 0.2) B.box(0x6e7276, f0 + 2.4, 0.115, y, 1.95, 0.01, 0.015);
    B.box(0x23403c, f0 + 5.0, 0.08, 1.15, 0.5, 0.05, 1.15);               // door
    B.box(0x23403c, f0 + 4.35, 0.07, 1.5, 0.12, 0.05, 1.5);
    // pilasters between the shops and the down-pipes
    for (const s of [p0, f0]) B.box(STONE_DK, s, 0.15, 2.5, 0.12, 0.15, 2.5);
    B.box(BLACK, S1 + 0.08, 0.1, 5.0, 0.05, 0.05, 5.0);
    // blank south gable end above Gainsborough Road side: a cream rendered wall carried up to the block's parapet
    if (ctx?.sideFrame) {
      try {
        const sf = ctx.sideFrame({ at: [123.3, -624.7], from: [128.8, -623.9] }), sb = builder(sf);
        const w = sf.L - 0.5; sb.box(0xdcd2b8, sf.L / 2, 0.02, (WALL_TOP + TOP_ED) / 2, w / 2, 0.05, (TOP_ED - WALL_TOP) / 2);
        sb.box(STONE, sf.L / 2, 0.08, TOP_ED + 0.05, w / 2 + 0.1, 0.1, 0.1);
        sb.flush();
      } catch (err) { console.warn('a05 gable end failed', err); }
    }
    B.flush();
  },

  /** Scarborows Opticians (163) and Jackamans Solicitors (167-171): lower red-brick pair under a dormered slate roof */
  scarborowsJackamans(K) {
    const B = builder(K), [a0, a1] = X.scar, [j0, j1] = X.jack, s1 = K.s1;
    const RED_LINTEL = 0xb8522f, NAVY = 0x27355a, J = Math.min(j1, s1);
    B.box(0xc9c5bb, (a0 + J) / 2, 0.1, 5.0, (J - a0) / 2, 0.1, 0.12);                    // plain cornice over both shopfronts
    // first-floor windows: white boxed casements / sashes with orange-red flat-arch lintels
    [[28.3, 1], [29.9, 1], [32.0, 1], [34.0, 2], [36.2, 2], [38.3, 2]].forEach(([s, k], i) => {
      win(B, s, 5.6, 1.35, 1.9, { glass: i % 2 ? NET : GLASS, bars: k === 2 && i > 3, sill: WHITE });
      B.box(RED_LINTEL, s, 0.06, 5.6 + 1.9 + 0.2, 0.95, 0.04, 0.17);
    });
    // ---- Scarborows Opticians: navy surround and fascia, glazed front with warm lights, white door with a grey transom ----
    B.box(NAVY, a0 + 0.35, 0.14, 2.5, 0.35, 0.14, 2.5);
    B.box(NAVY, 29.4, 0.08, 4.2, 2.15, 0.07, 0.65);
    B.box(0x35405f, 29.4, 0.04, 1.5, 2.1, 0.02, 1.25);                                 // glazing
    B.box(0xa89878, 28.6, 0.07, 1.3, 0.7, 0.01, 0.6); B.box(0xa89878, 30.6, 0.07, 1.3, 0.7, 0.01, 0.6); // warm display lighting
    B.box(NAVY, 29.4, 0.08, 0.3, 2.1, 0.06, 0.3);                                       // stallriser
    B.box(0x2c3a5e, 31.5, 0.1, 1.4, 0.1, 0.06, 1.4);
    B.box(WHITE, 32.35, 0.08, 1.2, 0.5, 0.05, 1.2);                                     // white front door (163)
    B.box(0xd6dadd, 32.35, 0.08, 4.0, 0.62, 0.06, 0.85);                                // pale panel above the door
    B.box(NAVY, 32.95, 0.14, 2.5, 0.14, 0.14, 2.5);
    // ---- Jackamans Solicitors: white frontage with three arched openings, brick wall beside, red logo stripe on the fascia ----
    B.box(WHITE, 38.2, 0.07, 1.6, 2.8, 0.09, 1.6);                                      // white face of the arcade
    B.box(WHITE, 38.2, 0.1, 3.18, 2.85, 0.1, 0.12);
    B.box(WHITE, (j0 + J) / 2, 0.08, 4.1, (J - j0) / 2 - 0.1, 0.06, 0.62);              // white fascia head (stock board at its foot)
    for (const f of [0, 1, 2]) B.box(0xca1f3a, J - 2.15 + f * 0.42, 0.14, 4.1, 0.13, 0.03, 0.55); // red logo stripes
    const arch = (c, wd, top, col) => { // arched opening: rectangle + semicircular head
      const pts = [[c - wd / 2, 0.19, 0.05], [c + wd / 2, 0.19, 0.05], [c + wd / 2, 0.19, top - wd / 2]];
      for (let k = 1; k < 8; k++) { const a = (k / 8) * Math.PI; pts.push([c + Math.cos(a) * wd / 2, 0.19, top - wd / 2 + Math.sin(a) * wd / 2]); }
      pts.push([c - wd / 2, 0.19, top - wd / 2]); B.poly(col, pts);
    };
    B.box(0x8e4a3a, (j0 + 34.5) / 2, 0.06, 1.55, (34.5 - j0) / 2 - 0.05, 0.05, 1.55);   // brick panel (left of the arcade)
    arch(35.85, 1.45, 2.95, 0x40444a); arch(39.5, 1.5, 2.95, 0x40444a);                  // glazed arches (dark)
    arch(37.45, 1.1, 2.75, 0x17191b);                                                      // black door arch
    B.box(0xb9a58e, 34.0, 0.1, 1.7, 0.15, 0.03, 0.15);                                    // small plaque
    // down-pipes either side of the pair and a white pier cap at the far end
    B.box(BLACK, a0 - 0.1, 0.1, 4.8, 0.05, 0.05, 4.8); B.box(BLACK, a1 + 0.02, 0.1, 4.8, 0.05, 0.05, 4.8); B.box(WHITE, J - 0.1, 0.12, 2.0, 0.18, 0.12, 2.0);
    B.flush();
  },
};
