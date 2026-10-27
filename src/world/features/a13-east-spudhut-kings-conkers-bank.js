// Area a13-east-spudhut-kings-conkers-bank: custom building features. Export functions keyed by the `t` name used in your FRONTAGES details.
// Signature: (K, it, ctx) where K is the frame object from frontage-details.js and ctx = { b, ring, pointInRing, sideFrame }.
//
// East side of Hamilton Road at the York Road end, from the Street View photos in docs/research/hamilton-road-streetview
// (f-fennwright-spudhut-bakery-kings, f-kings-conkers, f-conkers-busshelter-1930s-block, g-corner-bank-park-road-1/2).
// Pedestrianised Hamilton Road is not a car road, so the shared street-edge frame picks a back wall; every call carries its own
// street face as it.edge = [[x, z] start, [x, z] end]. The edge is chosen so that s runs to the viewer's RIGHT when looking at the
// wall from the street (north to south for the west faces, west to east for the York Road faces) and d is out from the wall.
// Dimensions are scaled from the photos against a door (2.1 m) or a person; estimates, not surveyed.

import * as THREE from 'three';
import { Geo } from '../seafront.js';

const WHITE = '#efece4', STONE = '#d9cdb0', SLATE = '#4d5159', GLASS = '#34414b', GLASSD = '#1d252b';

function kit(K, it, edge) {
  const [A, C] = edge || it.edge, dx = C[0] - A[0], dz = C[1] - A[1], L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L, nx = -uz, nz = ux, g = K.g;
  const geos = new Map();
  const G = (key) => { if (!geos.has(key)) geos.set(key, new Geo()); return geos.get(key); };
  const P = (s, d, y) => [A[0] + ux * s + nx * d, g + y, A[1] + uz * s + nz * d];
  const box = (key, s, d, y0, y1, hs, hd) => { const p = P(s, d, (y0 + y1) / 2); G(key).box(p[0], p[1], p[2], ux, uz, hs, (y1 - y0) / 2, hd); };
  const quad = (key, s0, s1, y0, y1, d, uvm = 0) => {
    const uv = uvm ? [[0, 0], [(s1 - s0) / uvm[0], 0], [(s1 - s0) / uvm[0], (y1 - y0) / uvm[1]], [0, (y1 - y0) / uvm[1]]] : undefined;
    G(key).quad(P(s0, d, y0), P(s1, d, y0), P(s1, d, y1), P(s0, d, y1), uv);
  };
  const tri = (key, a, b, c) => G(key).tri(a, b, c);
  const quadW = (key, a, b, c, d) => G(key).quad(a, b, c, d);
  // a straight bar between two points on the wall plane (s, y) with a width, at depth d
  const bar = (key, s0, y0, s1, y1, w, d) => {
    const l = Math.hypot(s1 - s0, y1 - y0) || 1, ox = (-(y1 - y0) / l) * (w / 2), oy = ((s1 - s0) / l) * (w / 2);
    G(key).quad(P(s0 - ox, d, y0 - oy), P(s1 - ox, d, y1 - oy), P(s1 + ox, d, y1 + oy), P(s0 + ox, d, y0 + oy));
  };
  const flush = () => {
    for (const [key, geo] of geos) {
      const [kind, col] = key.split('|'); let mat;
      if (kind === 'glass') mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.12, metalness: 0.35, side: THREE.DoubleSide });
      else if (kind === 'brick') { const c = new THREE.Color(); if (col.includes(',')) c.setRGB(...col.split(',').map(Number)); else c.set(col); mat = new THREE.MeshStandardMaterial({ map: K.m.brick.map, normalMap: K.m.brick.normalMap, color: c, roughness: 1, side: THREE.DoubleSide }); }
      else mat = new THREE.MeshStandardMaterial({ color: col, roughness: kind === 'metal' ? 0.4 : 0.8, metalness: kind === 'metal' ? 0.5 : 0, side: THREE.DoubleSide });
      const me = geo.mesh(mat); if (me) { me.name = 'frontage:a13:' + key; K.extra.push(me); }
    }
  };
  return { L, P, box, quad, tri, quadW, bar, flush, K, G };
}

/** Arch fan (half disc) facing out at depth d, centre (s, yc), radius r. */
function archFan(k, key, s, yc, r, d, n = 10) {
  for (let i = 0; i < n; i++) {
    const a0 = Math.PI * (i / n), a1 = Math.PI * ((i + 1) / n);
    k.tri(key, k.P(s, d, yc), k.P(s + r * Math.cos(a0), d, yc + r * Math.sin(a0)), k.P(s + r * Math.cos(a1), d, yc + r * Math.sin(a1)));
  }
}

/** Lettering board (own canvas texture). spec = { bg, lines: [{ t, x, y, size, fg, font, italic, bold, align }] } */
const TEX = new Map();
function board(k, s0, s1, y0, y1, d, spec) {
  if (typeof document === 'undefined') return;
  const key = JSON.stringify([spec, +(s1 - s0).toFixed(2), +(y1 - y0).toFixed(2)]); let tex = TEX.get(key);
  if (!tex) {
    const W = 1024, H = Math.max(48, Math.min(512, Math.round((W * (y1 - y0)) / (s1 - s0))));
    const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
    x.fillStyle = spec.bg; x.fillRect(0, 0, W, H);
    for (const ln of spec.lines || []) {
      const fam = ln.font === 'serif' ? 'Georgia, "Times New Roman", serif' : '"Helvetica Neue", Arial, sans-serif';
      let px = Math.round(H * (ln.size ?? 0.6)); x.font = `${ln.italic ? 'italic ' : ''}${ln.bold === false ? '' : 'bold '}${px}px ${fam}`;
      const maxW = W * (ln.maxW ?? 0.92); const tw = x.measureText(ln.t).width; if (tw > maxW) { px = Math.floor((px * maxW) / tw); x.font = `${ln.italic ? 'italic ' : ''}${ln.bold === false ? '' : 'bold '}${px}px ${fam}`; }
      x.fillStyle = ln.fg || '#fff'; x.textAlign = ln.align || 'center'; x.textBaseline = 'middle'; x.fillText(ln.t, W * (ln.x ?? 0.5), H * (ln.y ?? 0.52));
    }
    tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; TEX.set(key, tex);
  }
  const a = k.P(s0, d, y0), b = k.P(s1, d, y0), c2 = k.P(s1, d, y1), e = k.P(s0, d, y1);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c2, ...e], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2)); g.setIndex([0, 1, 2, 0, 2, 3]); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  m.name = 'a13:board'; k.K.extra.push(m);
}

/** A sash window: white frame, dark glass, glazing bars, projecting sill, optional pediment/lintel. */
function sash(k, w) {
  const s = w.s, hw = w.w / 2, y0 = w.y, y1 = w.y + w.h, d = w.d ?? 0.06, fr = 'flat|' + (w.frame || WHITE), gl = 'glass|' + (w.glass || GLASS), sur = w.sur ?? 0.08;
  if (sur) k.quad(fr, s - hw - sur, s + hw + sur, y0 - sur, y1 + sur, d);
  k.quad(gl, s - hw, s + hw, y0, y1, d + 0.03);
  const rows = w.rows ?? 2, cols = w.cols ?? Math.max(1, Math.round(w.w / 0.55));
  for (let i = 1; i < rows; i++) k.box(fr, s, d + 0.04, y0 + ((y1 - y0) * i) / rows - 0.02, y0 + ((y1 - y0) * i) / rows + 0.02, hw, 0.015);
  for (let i = 1; i < cols; i++) k.box(fr, s - hw + ((2 * hw) * i) / cols, d + 0.04, y0, y1, 0.015, 0.015);
  if (w.sill !== false) k.box('flat|' + (w.sillCol || STONE), s, d + 0.06, y0 - sur - 0.07, y0 - sur + 0.02, hw + sur + 0.07, 0.1);
  if (w.lintel) k.box('flat|' + (w.lintelCol || STONE), s, d + 0.03, y1 + sur, y1 + sur + 0.22, hw + sur + 0.1, 0.05);
  if (w.pediment) { // triangular pediment over the window
    const pw = hw + sur + 0.2, yb = y1 + sur + 0.05; k.box('flat|' + STONE, s, d + 0.05, yb, yb + 0.14, pw, 0.09);
    k.tri('flat|' + STONE, k.P(s - pw, d + 0.05, yb + 0.14), k.P(s + pw, d + 0.05, yb + 0.14), k.P(s, d + 0.05, yb + 0.14 + pw * 0.42));
  }
}

/** Shopfront below the first floor: plinth, glazing in a frame, optional doors, fascia board with lettering. */
function shopfront(k, o) {
  const { s0, s1 } = o, w = s1 - s0, fr = 'flat|' + (o.frame || WHITE), rs = 'flat|' + (o.riser || o.frame || WHITE), gl = 'glass|' + (o.glass || GLASSD);
  const rh = o.riserH ?? 0.45, fy0 = o.fy0 ?? 3.2, fy1 = o.fy1 ?? 3.9, step = o.step ?? 0;
  // recessed or flush glazing
  k.quad(gl, s0 + 0.05, s1 - 0.05, rh, fy0, 0.1 - (o.recess ?? 0));
  k.box(rs, (s0 + s1) / 2, step / 2 + 0.07, 0, rh, w / 2, step / 2 + 0.05);
  if (o.sillCap) k.box('flat|' + o.sillCap, (s0 + s1) / 2, step / 2 + 0.07, rh, rh + 0.05, w / 2 + 0.02, step / 2 + 0.07);
  // frame posts, transom and mullions
  for (const s of [s0 + 0.05, s1 - 0.05]) k.box(fr, s, 0.1, 0, fy0, 0.05, 0.07);
  k.box(fr, (s0 + s1) / 2, 0.1, fy0 - 0.08, fy0, w / 2, 0.07);
  for (const m of o.mullions || []) k.box(fr, m, 0.1, rh, fy0, 0.035, 0.05);
  for (const dr of o.doors || []) {
    k.quad('glass|' + (o.doorGlass || '#161c20'), dr[0], dr[1], 0.08, 2.15, 0.14 - (o.recess ?? 0));
    for (const s of [dr[0], dr[1]]) k.box(o.doorFrame ? 'flat|' + o.doorFrame : fr, s, 0.14 - (o.recess ?? 0), 0.05, 2.2, 0.04, 0.04);
    k.box(o.doorFrame ? 'flat|' + o.doorFrame : fr, (dr[0] + dr[1]) / 2, 0.14 - (o.recess ?? 0), 2.12, 2.2, (dr[1] - dr[0]) / 2, 0.04);
  }
  // second band under the sign (FennWright style) and the main fascia
  if (o.band) { k.box('flat|' + o.band.col, (s0 + s1) / 2, 0.1, o.band.y0, o.band.y1, w / 2 - 0.1, 0.07); if (o.band.spec) board(k, s0 + 0.12, s1 - 0.12, o.band.y0, o.band.y1, 0.18, o.band.spec); }
  k.box('flat|' + (o.fascia || '#222'), (s0 + s1) / 2, 0.14, Math.min(fy0, 2.82), fy1, w / 2, 0.12); // reaches down over the shared sign board (2.9 to 3.6 m)
  k.box('flat|' + (o.cap || o.fascia || '#222'), (s0 + s1) / 2, 0.2, fy1, fy1 + 0.08, w / 2 + 0.03, 0.17);
  if (o.sign) board(k, s0 + 0.08, s1 - 0.08, fy0 + 0.04, fy1 - 0.04, 0.27, o.sign);
}

/** Canted first-floor oriel with a hood. */
function oriel(k, o) {
  const s = o.s, hw = o.w / 2, cw = o.cw ?? 0.45, D = o.depth ?? 0.7, y0 = o.y0, y1 = o.y1, fr = 'flat|' + WHITE, gl = 'glass|' + GLASS;
  const pts = [[s - hw, 0.05], [s - hw + cw, D], [s + hw - cw, D], [s + hw, 0.05]];
  for (let i = 0; i < 3; i++) {
    const [a, da] = pts[i], [b, db] = pts[i + 1];
    k.quadW(fr, k.P(a, da, y0), k.P(b, db, y0), k.P(b, db, y0 + 0.5), k.P(a, da, y0 + 0.5));            // apron panel
    k.quadW(gl, k.P(a, da, y0 + 0.5), k.P(b, db, y0 + 0.5), k.P(b, db, y1 - 0.2), k.P(a, da, y1 - 0.2)); // glazing
    k.quadW(fr, k.P(a, da, y1 - 0.2), k.P(b, db, y1 - 0.2), k.P(b, db, y1), k.P(a, da, y1));             // frieze
    const nb = i === 1 ? 3 : 1;
    for (let j = 0; j <= nb; j++) { const t = j / nb, ss = a + (b - a) * t, dd = da + (db - da) * t; k.box(fr, ss, dd + 0.02, y0 + 0.5, y1 - 0.2, 0.03, 0.03); }
    const mm = 0.5 * (y0 + 0.5 + y1 - 0.2), ma = k.P(a, da + 0.02, mm), mb = k.P(b, db + 0.02, mm); k.quadW(fr, ma, mb, [mb[0], mb[1] + 0.05, mb[2]], [ma[0], ma[1] + 0.05, ma[2]]);
  }
  // underside corbel taper and slate hood
  k.quadW(fr, k.P(pts[0][0], 0.05, y0 - 0.35), k.P(pts[3][0], 0.05, y0 - 0.35), k.P(pts[2][0], D, y0), k.P(pts[1][0], D, y0));
  const ho = 0.12, hy = y1 + 0.45, sl = 'flat|' + SLATE;
  k.quadW(sl, k.P(pts[1][0] - ho, D + ho, y1), k.P(pts[2][0] + ho, D + ho, y1), k.P(pts[3][0] + ho, 0.05, hy), k.P(pts[0][0] - ho, 0.05, hy));
  k.quadW(sl, k.P(pts[0][0] - ho, 0.05, hy), k.P(pts[1][0] - ho, D + ho, y1), k.P(pts[0][0] - ho, D * 0.45, y1 + 0.02), k.P(pts[0][0] - ho, 0.05, y1 + 0.02));
  k.tri(sl, k.P(pts[0][0] - ho, 0.05, hy), k.P(pts[1][0] - ho, D + ho, y1), k.P(pts[0][0] - ho, 0.05, y1));
  k.tri(sl, k.P(pts[3][0] + ho, 0.05, hy), k.P(pts[2][0] + ho, D + ho, y1), k.P(pts[3][0] + ho, 0.05, y1));
  k.box(fr, s, 0.1, y1 - 0.02, y1 + 0.04, hw + 0.1, 0.1);
}

/** The shaped brick gable over a 6 m shop front: curved crest with a stone coping and a half-round attic window. */
function shapedGable(k, o) {
  const H = k.K.H, L = k.L, rise = o.rise ?? 1.15, tint = o.tint || '#ffffff', n = 18, cop = 'flat|' + STONE;
  const yAt = (t) => H + 0.28 + (rise - 0.28) * Math.pow(Math.sin(Math.PI * t), 0.85);
  const s0 = 0.05, s1 = L - 0.05;
  for (let i = 0; i < n; i++) {
    const ta = i / n, tb = (i + 1) / n, sa = s0 + (s1 - s0) * ta, sb = s0 + (s1 - s0) * tb, ya = yAt(ta), yb = yAt(tb);
    const uv = [[sa / 3.2, (H - 0.1) / 2.9], [sb / 3.2, (H - 0.1) / 2.9], [sb / 3.2, yb / 2.9], [sa / 3.2, ya / 2.9]];
    k.G('brick|' + tint).quad(k.P(sa, 0.05, H - 0.1), k.P(sb, 0.05, H - 0.1), k.P(sb, 0.05, yb), k.P(sa, 0.05, ya), uv);
    // coping: thick slab following the curve, and a flat top
    k.quadW(cop, k.P(sa, 0.2, ya - 0.02), k.P(sb, 0.2, yb - 0.02), k.P(sb, 0.2, yb + 0.14), k.P(sa, 0.2, ya + 0.14));
    k.quadW(cop, k.P(sa, 0.2, ya + 0.14), k.P(sb, 0.2, yb + 0.14), k.P(sb, -0.1, yb + 0.14), k.P(sa, -0.1, ya + 0.14));
    k.quadW(cop, k.P(sa, -0.1, ya - 0.02), k.P(sb, -0.1, yb - 0.02), k.P(sb, -0.1, yb + 0.14), k.P(sa, -0.1, ya + 0.14));
  }
  // end blocks (little stone pier caps at each shoulder)
  for (const s of [0.18, L - 0.18]) { k.box(cop, s, 0.1, H - 0.3, H + 0.55, 0.2, 0.2); k.box(cop, s, 0.1, H + 0.55, H + 0.7, 0.26, 0.26); }
  // eaves cornice along the shoulders
  k.box(cop, 0.4, 0.16, H - 0.15, H + 0.02, 0.4, 0.16); k.box(cop, L - 0.4, 0.16, H - 0.15, H + 0.02, 0.4, 0.16);
  // half-round attic window with a gauged-brick ring and white glazing bars
  if (o.arch !== false) {
    const s = o.archS ?? L / 2, r = o.archR ?? 1.1, sp = o.archY ?? 7.05;
    archFan(k, 'flat|#b9694c', s, sp, r + 0.32, 0.06); k.quad('flat|#b9694c', s - r - 0.32, s + r + 0.32, sp - 0.02, sp + 0.02, 0.06);
    archFan(k, 'flat|' + WHITE, s, sp, r + 0.08, 0.08); k.quad('flat|' + WHITE, s - r - 0.08, s + r + 0.08, sp - 0.12, sp + 0.0, 0.08);
    archFan(k, 'glass|' + GLASS, s, sp, r - 0.04, 0.1);
    k.box('flat|' + WHITE, s, 0.11, sp - 0.02, sp + 0.03, r, 0.02); k.box('flat|' + WHITE, s, 0.11, sp, sp + r - 0.05, 0.02, 0.02);
    for (const a of [Math.PI / 4, (3 * Math.PI) / 4]) k.bar('flat|' + WHITE, s, sp, s + (r - 0.06) * Math.cos(a), sp + (r - 0.06) * Math.sin(a), 0.04, 0.11);
    for (const f of [-0.5, 0.5]) k.box('flat|' + WHITE, s + r * f, 0.11, sp, sp + Math.sqrt(Math.max(0, r * r - r * r * f * f)) - 0.05, 0.02, 0.02);
    k.box('flat|' + STONE, s, 0.12, sp - 0.2, sp - 0.1, r + 0.25, 0.1);
  }
}

/** White painted pier strips on both party walls and the console at their head. */
function piers(k, o = {}) {
  const L = k.L, top = o.top ?? 7.0, col = 'flat|' + (o.col || WHITE);
  for (const s of [0.14, L - 0.14]) { k.box(col, s, 0.09, 0, top, 0.14, 0.09); k.box(col, s, 0.12, top - 0.1, top + 0.2, 0.19, 0.12); }
}

// shop front definitions (s from the north end, L is about 6.3 m)
const SHOPS = {
  fennwright: (L) => ({
    s0: 0.4, s1: L - 0.4, frame: WHITE, riser: '#232a44', riserH: 0.45, fy0: 3.25, fy1: 3.9, fascia: '#f4f2ec', cap: '#f4f2ec', glass: '#2b3844', mullions: [2.3, 3.9],
    doors: [[2.35, 3.45]], doorGlass: '#3a4650',
    sign: { bg: '#f4f2ec', lines: [{ t: 'FennWright', x: 0.3, size: 0.86, fg: '#3f8a2a', font: 'sans', maxW: 0.58 }, { t: '01394 548700', x: 0.83, y: 0.3, size: 0.28, fg: '#ffffff', maxW: 0.28 }, { t: 'fennwright.co.uk', x: 0.83, y: 0.7, size: 0.26, fg: '#ffffff', maxW: 0.28 }] },
    band: { y0: 2.2, y1: 3.25, col: '#f2f0ea', spec: { bg: '#f2f0ea', lines: [{ t: 'Local independent estate agents', x: 0.3, y: 0.33, size: 0.2, fg: '#6a6f75', bold: false, maxW: 0.55 }, { t: '120', x: 0.5, y: 0.5, size: 0.32, fg: '#9aa0a6', bold: false, maxW: 0.2 }, { t: 'Established 1768', x: 0.8, y: 0.33, size: 0.2, fg: '#6a6f75', bold: false, maxW: 0.3 }] } },
  }),
  spud: (L) => ({
    s0: 0.4, s1: L - 0.4, frame: '#26231f', riser: '#2b2824', riserH: 0.4, fy0: 3.2, fy1: 3.9, fascia: '#e8cfd0', cap: '#e8cfd0', glass: '#3a2f2a', mullions: [2.3],
    doors: [[2.55, 3.45]], doorGlass: '#0f1113', recess: 0.5, doorFrame: '#26231f',
    sign: { bg: '#e8cfd0', lines: [{ t: 'SPUD HUT', x: 0.5, size: 0.6, fg: '#b4535f', font: 'sans', maxW: 0.7 }] },
    extra: true,
  }),
  bakery: (L) => ({
    s0: 0.3, s1: L - 0.3, frame: '#2aa59f', riser: '#2aa59f', riserH: 0.7, fy0: 3.1, fy1: 4.0, step: 0.3, fascia: '#1d9a96', cap: '#1d9a96', glass: '#4c5f5c', mullions: [2.35, 3.5],
    doors: [[2.45, 3.4]], doorGlass: '#2a6f6c', doorFrame: '#2aa59f',
    sign: { bg: '#1d9a96', lines: [{ t: 'The Bakery', x: 0.45, size: 0.62, fg: '#2a1f66', font: 'serif', italic: true, maxW: 0.6 }] },
  }),
  kings: (L) => ({
    s0: 0.45, s1: L - 0.45, frame: '#4b4f55', riser: '#e8e5de', riserH: 0.4, fy0: 3.1, fy1: 3.85, fascia: '#34383d', cap: '#34383d', glass: '#4b4a46', mullions: [1.75, 2.8],
    doors: [[0.75, 1.55]], doorGlass: '#bdb7aa', doorFrame: '#e8e5de',
    sign: { bg: '#34383d', lines: [{ t: "KING'S", x: 0.5, y: 0.4, size: 0.5, fg: '#f1f1f1', font: 'sans', maxW: 0.4 }, { t: 'KEYCUTTING · ENGRAVING · STATIONERY · GIFTS', x: 0.5, y: 0.8, size: 0.16, fg: '#c9ccd0', bold: false, maxW: 0.7 }] },
    extra: true,
  }),
};

export const FEATURES = {
  /** One of the four shaped-gable brick fronts (FennWright, Madison/Spud Hut, The Bakery, Kings). */
  a13Gable(K, it) {
    const k = kit(K, it), L = k.L, H = K.H;
    // brick face lettering strip under the eaves is not needed: the base wall is brick; draw everything over it
    piers(k, { top: it.pierTop ?? 7.0 });
    shapedGable(k, { rise: it.rise ?? 1.15, archS: L / 2 + (it.archOff ?? 0), archY: it.archY, archR: it.archR, tint: it.tint });
    // string course above the shop and a thin cornice over the fascia
    k.box('flat|' + STONE, L / 2, 0.1, 3.92, 4.02, L / 2 - 0.3, 0.1);
    oriel(k, { s: L / 2 + (it.orielOff ?? 0), w: it.orielW ?? 2.75, y0: 4.2, y1: 6.45, depth: 0.7 });
    const sh = SHOPS[it.shop]?.(L); if (sh) {
      shopfront(k, sh);
      if (it.shop === 'spud') { // Madison Boutique on the left: dark timber front, orange blooms; flat number plate over the entrance
        k.quad('flat|#7a3a1e', 0.55, 2.2, 0.5, 2.3, 0.095); for (let i = 0; i < 9; i++) k.box('flat|#d9692a', 0.8 + (i % 4) * 0.35, 0.14, 1.6 + (i % 3) * 0.2, 1.8 + (i % 3) * 0.2, 0.18, 0.06);
        k.box('flat|#16120f', 1.4, 0.12, 3.1, 3.2, 1.0, 0.08); board(k, 0.5, 2.3, 2.45, 3.1, 0.15, { bg: '#16120f', lines: [{ t: 'MADISON Boutique', x: 0.5, size: 0.5, fg: '#d9b25a', font: 'serif', italic: true }] });
        board(k, 2.55, 3.1, 3.3, 3.8, 0.15, { bg: '#f2f0ea', lines: [{ t: '118', size: 0.6, fg: '#222' }] });
      }
    }
    k.flush();
  },

  /** Conkers Pets & Plants: red-brick two-storey front with four windows, grey fascia, black posters, low tiled roof. */
  a13Conkers(K, it) {
    const k = kit(K, it), L = k.L, H = K.H;
    const tile = 'flat|#8b7667';
    // eaves: brick dentil band and the shallow concrete-tile roof (front slope + hips) behind it
    k.box('brick|1.15,0.9,0.8', L / 2, 0.08, H - 0.4, H - 0.1, L / 2, 0.08);
    for (let s = 0.2; s < L - 0.1; s += 0.3) k.box('brick|1.15,0.9,0.8', s, 0.12, H - 0.5, H - 0.4, 0.07, 0.05);
    const rise = 1.3, run = 4.2;
    k.quadW(tile, k.P(0, 0.35, H), k.P(L, 0.35, H), k.P(L, -run, H + rise), k.P(0, -run, H + rise));
    for (const [s0, s1] of [[0, 0]]) void s0, void s1;
    k.quadW(tile, k.P(0, 0.35, H), k.P(0, -run, H + rise), k.P(0, -run, H), k.P(0, 0.35, H));
    k.quadW(tile, k.P(L, 0.35, H), k.P(L, -run, H + rise), k.P(L, -run, H), k.P(L, 0.35, H));
    for (let i = 1; i < 14; i++) { const t = i / 14; k.box('flat|#6e5c4f', L / 2, 0.35 - (0.35 + run) * t, H + rise * t - 0.02, H + rise * t + 0.02, L / 2, 0.02); }
    // first-floor windows: four white casements with sills
    for (const s of [1.5, 3.95, 6.2, 8.6]) sash(k, { s, w: 1.15, h: 1.35, y: 4.5, rows: 2, cols: 2, glass: '#59666f', sur: 0.07 });
    // shopfront: grey fascia with white lettering, black panels with posters, brick pier, door
    const fy0 = 2.72, fy1 = 3.62;
    k.box('flat|#15161a', 4.6, 0.1, 0.35, fy0, 4.2, 0.07);
    k.box('flat|#2a2c30', 4.6, 0.1, 0, 0.35, 4.2, 0.07);
    k.box('flat|#6a6f76', 5.0, 0.16, fy0, fy1, 4.75, 0.13);
    board(k, 0.35, 9.65, fy0 + 0.04, fy1 - 0.04, 0.3, { bg: '#6a6f76', lines: [{ t: 'Conkers Pets & Plants', x: 0.55, y: 0.4, size: 0.5, fg: '#f4f4f4', font: 'sans', bold: false, maxW: 0.9 }, { t: '01394 286 124', x: 0.18, y: 0.82, size: 0.2, fg: '#e8e8e8', bold: false, maxW: 0.2 }] });
    const poster = (a, b) => { k.quad('flat|#f1efe8', a, b, 1.15, 2.55, 0.2); k.quad('flat|#e05a47', a, b, 1.15, 1.45, 0.21); k.quad('flat|#cfd6dc', a + 0.12, b - 0.12, 1.6, 2.35, 0.21); k.quad('flat|#8a6a3a', a + 0.4, b - 0.4, 1.75, 2.1, 0.22); };
    poster(0.45, 1.65); poster(1.8, 3.1); poster(3.25, 4.6); poster(7.1, 8.3); poster(8.45, 9.6);
    k.box('brick|1.3,1,0.9', 5.2, 0.12, 0, 2.7, 0.35, 0.09);                    // brick pier beside the door
    k.quad('glass|#1b2126', 5.7, 7.0, 0.05, 2.5, 0.12);                        // open door and dark entrance
    k.box('flat|#2a2c30', 6.35, 0.12, 2.5, 2.6, 0.7, 0.06);
    k.flush();
  },

  /** The 1930s brick block over EACH: stone quoins, string courses and cornice, three-storey front with a pedimented first-floor triple window. */
  a13Block(K, it) {
    const k = kit(K, it), L = k.L, H = K.H, stone = 'flat|' + STONE;
    // quoins: alternating long and short stone blocks up both corners
    for (const [s0, sgn] of [[0, 1], [L, -1]]) for (let y = 0.2, i = 0; y < H - 0.5; y += 0.42, i++) { const w = i % 2 ? 0.55 : 0.9; k.box(stone, s0 + (sgn * w) / 2, 0.06, y, y + 0.36, w / 2, 0.06); }
    // string courses over the ground floor and under the second floor, deep cornice and parapet
    k.box(stone, L / 2, 0.14, 3.72, 4.25, L / 2, 0.14);
    k.box(stone, L / 2, 0.08, 7.25, 7.4, L / 2, 0.08);
    k.box(stone, L / 2, 0.3, H - 0.8, H - 0.45, L / 2, 0.3); k.box(stone, L / 2, 0.22, H - 0.45, H, L / 2, 0.2);
    // ground floor: pilasters, EACH red fascia and tall sash windows with white frames; stone entrance at the south end
    const pil = [0.95, 3.7, 6.3, 8.9], fy0 = 2.82, fy1 = 3.68;
    for (const s of pil) k.box('flat|' + WHITE, s, 0.12, 0, 3.7, 0.2, 0.1);
    k.box('flat|#c8283a', 5.6, 0.15, fy0, fy1, 4.7, 0.07);
    board(k, 0.9, 10.3, fy0 + 0.03, fy1 - 0.03, 0.23, { bg: '#c8283a', lines: [{ t: "East Anglia's Children's Hospices", x: 0.5, size: 0.62, fg: '#ffffff', maxW: 0.8 }] });
    for (const [a, b] of [[1.2, 3.5], [3.9, 6.1], [6.5, 8.7]]) {
      k.quad('flat|#7a3a2a', a, b, 0, 0.9, 0.04);
      sash(k, { s: (a + b) / 2, w: b - a - 0.25, h: 1.7, y: 0.95, rows: 3, cols: 3, d: 0.05, glass: '#5b6670', sur: 0.06, sill: false });
    }
    // entrance with a stone surround at the south (right-hand) end
    const es = 11.1; k.box(stone, es - 0.85, 0.2, 0, 3.3, 0.18, 0.18); k.box(stone, es + 0.85, 0.2, 0, 3.3, 0.18, 0.18); k.box(stone, es, 0.22, 3.3, 3.7, 1.12, 0.2);
    k.quad('glass|#14191d', es - 0.65, es + 0.65, 0.2, 3.25, 0.1); k.box(stone, es, 0.5, 0, 0.2, 1.1, 0.4);
    // upper floors: single sashes at the ends and the pediment-topped triple window in the middle
    for (const [y, h] of [[4.95, 1.65], [7.75, 1.55]]) {
      for (const s of [1.95, L - 1.95]) sash(k, { s, w: 0.95, h, y, rows: 3, cols: 2, d: 0.05, lintel: true });
      for (const o of [-1.1, 0, 1.1]) sash(k, { s: L / 2 + o, w: 0.8, h, y, rows: 3, cols: 2, d: 0.05, lintel: false, pediment: false, sill: y < 6 });
    }
    k.box(stone, L / 2, 0.1, 4.6 + 0.0, 4.95 - 0.05, 1.8, 0.09);                 // first-floor triple window: stone sill band
    k.box(stone, L / 2, 0.1, 6.7, 6.9, 1.8, 0.1);
    k.tri(stone, k.P(L / 2 - 1.95, 0.1, 6.9), k.P(L / 2 + 1.95, 0.1, 6.9), k.P(L / 2, 0.1, 7.45));
    k.flush();
  },

  /** York Road (south) face of the 1930s block: tall narrow stair windows, banding, plain brick returning east. */
  a13BlockSouth(K, it) {
    const k = kit(K, it, it.edge), L = k.L, H = K.H, stone = 'flat|' + STONE;
    for (let y = 0.2, i = 0; y < H - 0.5; y += 0.42, i++) { const w = i % 2 ? 0.55 : 0.9; k.box(stone, w / 2, 0.06, y, y + 0.36, w / 2, 0.06); }
    k.box(stone, L / 2, 0.14, 4.15, 4.4, L / 2, 0.14); k.box(stone, L / 2, 0.08, 7.25, 7.4, L / 2, 0.08);
    k.box(stone, L / 2, 0.3, H - 0.8, H - 0.45, L / 2, 0.3); k.box(stone, L / 2, 0.22, H - 0.45, H, L / 2, 0.2);
    for (const s of [3.0, 6.6, 10.2, 13.8]) sash(k, { s, w: 0.9, h: 1.6, y: 5.0, rows: 3, cols: 2, d: 0.05, lintel: true });
    for (const s of [3.0, 6.6, 10.2, 13.8]) sash(k, { s, w: 0.9, h: 1.5, y: 7.8, rows: 3, cols: 2, d: 0.05, lintel: true });
    for (const s of [3.0, 6.6]) sash(k, { s, w: 1.0, h: 2.3, y: 1.1, rows: 3, cols: 2, d: 0.05, glass: '#5b6670' });
    k.flush();
  },

  /** Corner bank tower, west face (Hamilton Road): stone-banded brick, tall narrow windows, stone entrance surround. */
  a13Tower(K, it) {
    const k = kit(K, it), L = k.L, H = K.H, stone = 'flat|' + STONE;
    k.box(stone, L / 2, 0.14, 3.7, 4.1, L / 2, 0.14); k.box(stone, L / 2, 0.08, 7.0, 7.12, L / 2, 0.08); k.box(stone, L / 2, 0.3, H - 0.9, H - 0.45, L / 2 + 0.05, 0.3); k.box(stone, L / 2, 0.22, H - 0.45, H, L / 2 + 0.03, 0.2);
    k.box(stone, 0.3, 0.1, 0, H - 0.9, 0.3, 0.1);                       // stone return at the north end (quoin strip)
    // tall narrow windows, two per floor over a ground floor of stone-framed bays
    for (const s of [1.5, 3.2]) { sash(k, { s, w: 0.7, h: 2.1, y: 4.6, rows: 4, cols: 1, d: 0.05, lintel: true }); sash(k, { s, w: 0.7, h: 1.8, y: 7.5, rows: 3, cols: 1, d: 0.05, lintel: true }); sash(k, { s, w: 0.8, h: 2.3, y: 0.9, rows: 4, cols: 1, d: 0.05, glass: '#5b6670' }); }
    // stone entrance surround with columns and a deep lintel at the south end
    const es = L - 1.55;
    k.box(stone, es - 0.75, 0.3, 0, 3.4, 0.2, 0.2); k.box(stone, es + 0.75, 0.3, 0, 3.4, 0.2, 0.2); k.box(stone, es, 0.3, 3.4, 3.85, 1.0, 0.24);
    k.quad('glass|#14191d', es - 0.55, es + 0.55, 0.3, 3.35, 0.1); k.box(stone, es, 0.7, 0, 0.3, 1.0, 0.5);
    for (let i = 0; i <= 8; i++) k.box('flat|#16181b', es - 1.2 + i * 0.3, 1.2, 0.35, 1.3, 0.015, 0.015); k.box('flat|#16181b', es, 1.2, 1.3, 1.34, 1.25, 0.02);
    k.flush();
  },

  /** York Road (north) faces of the bank: tower return and the low single-storey wing with white pilasters and sashes. */
  a13TowerNorth(K, it) {
    const k = kit(K, it), L = k.L, H = K.H, stone = 'flat|' + STONE;
    k.box(stone, L / 2, 0.14, 3.7, 4.1, L / 2, 0.14); k.box(stone, L / 2, 0.08, 7.0, 7.12, L / 2, 0.08); k.box(stone, L / 2, 0.3, H - 0.9, H - 0.45, L / 2 + 0.05, 0.3); k.box(stone, L / 2, 0.22, H - 0.45, H, L / 2 + 0.03, 0.2);
    for (const s of [L - 1.2, L - 2.9]) { sash(k, { s, w: 0.7, h: 2.1, y: 4.6, rows: 4, cols: 1, d: 0.05, lintel: true }); sash(k, { s, w: 0.7, h: 1.8, y: 7.5, rows: 3, cols: 1, d: 0.05, lintel: true }); }
    k.flush();
  },
  a13Wing(K, it) {
    const k = kit(K, it), L = k.L, H = K.H, stone = 'flat|' + STONE;
    k.box(stone, L / 2, 0.14, H - 0.3, H, L / 2 + 0.05, 0.16); k.box(stone, L / 2, 0.06, 0, 0.35, L / 2, 0.08);
    const n = Math.max(3, Math.round(L / 3.2)), step = L / n;
    for (let i = 0; i <= n; i++) k.box('flat|' + WHITE, i * step === 0 ? 0.2 : i === n ? L - 0.2 : i * step, 0.1, 0, H - 0.3, 0.22, 0.09);
    for (let i = 0; i < n; i++) sash(k, { s: (i + 0.5) * step, w: Math.min(1.6, step - 1.0), h: 1.5, y: 1.05, rows: 2, cols: 3, d: 0.05, glass: '#5b6670' });
    k.flush();
  },
};
