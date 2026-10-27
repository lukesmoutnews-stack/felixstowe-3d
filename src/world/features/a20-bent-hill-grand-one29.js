// Area a20-bent-hill-grand-one29: custom building features. Export functions keyed by the `t` name used in your FRONTAGES details.
// Signature: (K, it, ctx) where K is the frame object from frontage-details.js and ctx = { b, ring, pointInRing, sideFrame }.
//
// Bent Hill, the sloping shared-surface street at the south end of Hamilton Road: Ruby's, Architects, Smmash Burger Shack, Felixstowe
// Grill, The Grand (former nightclub) and One29, the little Hamilton MAS / yellow-brick pair, the cream villa, and the Undercliff Kiosk
// on the seafront lawn. From the Street View photos in docs/research/hamilton-road-streetview (the l-*.png files).
// Dimensions are estimates scaled from the photos (a door, a window, a car or a person for scale), not surveyed.
//
// The shared frame K picks the wrong wall on this shared-surface street and the ground falls steeply, so every feature here builds its own
// frames from footprint edges (world coordinates) and reads the ground from GRID, a 5 m sample of the LiDAR terrain (metres above datum,
// the same heights the world's ground() returns). The row shops (Ruby's, Architects, Smmash/Grill) are drawn as whole masses by the
// feature, because the one-height box the base building draws cannot follow a slope of 1 in 7; their base entries are 0.3 m high.
import * as THREE from 'three';
import { Geo } from '../seafront.js';
import { Textures } from '../textures.js';

// ---- ground: LiDAR terrain sampled every 5 m, x 30..110, z -55..40 (tenths of a metre) --------------------------------------------
const GRID = [
  [197,192,193,190,183,176,174,173,169,165,163,162,165,171,168,162,152],
  [193,186,185,182,179,177,174,171,165,156,157,158,156,155,153,150,149],
  [194,188,184,183,180,176,170,155,144,148,151,154,154,150,149,149,148],
  [190,188,186,183,178,163,142,134,137,142,146,146,151,147,142,140,141],
  [191,189,186,171,155,141,128,127,132,135,137,136,143,141,134,129,126],
  [191,186,167,151,132,118,117,120,104,111,115,115,114,124,121,105,95],
  [187,161,135,122,110,108,107,86,80,79,78,84,90,99,91,73,70],
  [166,138,116,102,100,100,81,71,69,69,69,70,70,70,68,68,64],
  [143,117,97,92,92,91,77,67,67,67,66,66,64,62,60,63,58],
  [112,91,88,87,85,81,73,67,66,66,64,62,60,55,51,54,53],
  [109,91,86,81,78,75,69,66,63,61,60,58,56,55,52,52,53],
  [101,85,80,75,72,70,66,62,59,57,56,55,53,53,54,54,53],
  [84,76,71,66,67,66,63,58,55,54,53,54,54,54,53,52,50],
  [72,66,62,62,60,61,60,56,55,54,54,54,53,52,50,48,45],
  [63,60,58,58,56,57,57,56,56,54,53,52,49,48,45,39,38],
  [59,57,54,54,55,56,56,55,54,51,49,48,44,39,38,35,30],
  [55,53,53,54,54,55,54,51,49,48,45,39,38,35,32,31,30],
  [53,54,54,53,52,50,49,45,42,39,38,35,30,28,26,24,22],
  [53,53,52,50,48,47,42,39,38,36,30,28,26,24,22,21,20],
  [51,49,49,47,41,39,38,34,30,28,26,24,23,20,18,17,17],
];
export function gr(x, z) {
  const fx = Math.max(0, Math.min(15.999, (x - 30) / 5)), fz = Math.max(0, Math.min(18.999, (z + 55) / 5));
  const i = Math.floor(fx), j = Math.floor(fz), tx = fx - i, tz = fz - j;
  return ((GRID[j][i] * (1 - tx) + GRID[j][i + 1] * tx) * (1 - tz) + (GRID[j + 1][i] * (1 - tx) + GRID[j + 1][i + 1] * tx) * tz) / 10;
}

// ---- small geometry helpers --------------------------------------------------------------------------------------------------------
const signedArea = (R) => { let s = 0; for (let i = 0; i < R.length; i++) { const a = R[i], c = R[(i + 1) % R.length]; s += a[0] * c[1] - c[0] * a[1]; } return s / 2; };
function earclip(pts) {
  const n = pts.length; const idx = [...Array(n).keys()]; if (signedArea(pts) < 0) idx.reverse();
  const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const inTri = (p, a, b, c) => cross(a, b, p) >= 0 && cross(b, c, p) >= 0 && cross(c, a, p) >= 0;
  const out = []; let guard = 0;
  while (idx.length > 3 && guard++ < 400) {
    let hit = false;
    for (let i = 0; i < idx.length; i++) {
      const a = idx[(i + idx.length - 1) % idx.length], b = idx[i], c = idx[(i + 1) % idx.length];
      if (cross(pts[a], pts[b], pts[c]) <= 1e-9) continue;
      let ok = true; for (const j of idx) { if (j === a || j === b || j === c) continue; if (inTri(pts[j], pts[a], pts[b], pts[c])) { ok = false; break; } }
      if (ok) { out.push([a, b, c]); idx.splice(i, 1); hit = true; break; }
    }
    if (!hit) break;
  }
  if (idx.length === 3) out.push([...idx]);
  return out;
}
/** Mitre-offset a polygon outward by o metres (any winding). */
function offsetRing(R, o) {
  const P = signedArea(R) < 0 ? R.slice().reverse() : R.slice(), n = P.length, out = [];
  for (let i = 0; i < n; i++) {
    const p0 = P[(i + n - 1) % n], p1 = P[i], p2 = P[(i + 1) % n];
    const e1 = [p1[0] - p0[0], p1[1] - p0[1]], e2 = [p2[0] - p1[0], p2[1] - p1[1]], l1 = Math.hypot(...e1) || 1, l2 = Math.hypot(...e2) || 1;
    const n1 = [e1[1] / l1, -e1[0] / l1], n2 = [e2[1] / l2, -e2[0] / l2], k = 1 + n1[0] * n2[0] + n1[1] * n2[1];
    const m = [(n1[0] + n2[0]) / Math.max(0.3, k), (n1[1] + n2[1]) / Math.max(0.3, k)];
    out.push([p1[0] + m[0] * o, p1[1] + m[1] * o]);
  }
  return out;
}
/** y = a x + b z + c through three [x, z, y] points. */
function plane(p, q, r) {
  const d = (q[0] - p[0]) * (r[1] - p[1]) - (r[0] - p[0]) * (q[1] - p[1]);
  const a = ((q[2] - p[2]) * (r[1] - p[1]) - (r[2] - p[2]) * (q[1] - p[1])) / d, b = ((r[2] - p[2]) * (q[0] - p[0]) - (q[2] - p[2]) * (r[0] - p[0])) / d;
  return (x, z) => p[2] + a * (x - p[0]) + b * (z - p[1]);
}

// ---- lettering ---------------------------------------------------------------------------------------------------------------------
const TEXC = new Map();
function textTexture(str, o) {
  if (typeof document === 'undefined') return null;
  const key = JSON.stringify([str, o.fg, o.bg, o.font, o.weight, o.ar, o.upper, o.logo, o.sub, o.fit]);
  if (TEXC.has(key)) return TEXC.get(key);
  const cw = 1024, ch = Math.max(64, Math.min(768, Math.round(cw / o.ar)));
  const c = document.createElement('canvas'); c.width = cw; c.height = ch; const x = c.getContext('2d');
  if (o.bg) { x.fillStyle = o.bg; x.fillRect(0, 0, cw, ch); }
  const fam = o.font === 'serif' ? 'Georgia, "Times New Roman", serif' : o.font === 'script' ? '"Brush Script MT", "Segoe Script", Georgia, cursive' : '"Arial Black", Impact, Arial, sans-serif';
  const wt = o.weight || (o.font === 'script' ? 'bold' : 'bold');
  let txt = o.upper ? str.toUpperCase() : str;
  x.fillStyle = o.fg || '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
  if (o.logo) { // The Grand: pixel equaliser bars above and below the lettering
    const cols = ['#e0508c', '#b44bd0', '#5a7be8', '#d65aa8', '#8a5ae0'];
    const bars = (y0, dir) => { const n = 22, w = cw / n; for (let i = 0; i < n; i++) { const h = ch * (0.07 + 0.11 * Math.abs(Math.sin(i * 1.7 + 0.4))); x.fillStyle = cols[i % cols.length]; x.fillRect(i * w + 3, dir > 0 ? y0 : y0 - h, w - 6, h); } };
    bars(ch * 0.08, 1); bars(ch * 0.92, -1); x.fillStyle = '#fff';
  }
  let fs = ch * (o.fit || 0.6); x.font = `${wt} ${fs}px ${fam}`; const w = x.measureText(txt).width; if (w > cw * 0.92) { fs = Math.floor(fs * cw * 0.92 / w); x.font = `${wt} ${fs}px ${fam}`; }
  x.fillText(txt, cw / 2, ch / 2 + fs * 0.04);
  if (o.sub) { x.font = `${wt} ${Math.floor(ch * 0.16)}px ${fam}`; x.fillText(o.sub, cw / 2, ch * 0.88); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; TEXC.set(key, t); return t;
}

// ---- the kit: world-coordinate frames over footprint edges, accumulating geometry by material key -------------------------------
function kit(K, ctx) {
  const geos = new Map(), ring = ctx.ring, inR = ctx.pointInRing;
  const G = (k) => { let g = geos.get(k); if (!g) { g = new Geo(); geos.set(k, g); } return g; };
  const tri = (k, a, b, c) => { const g = G(k), n = g.p.length / 3; g.p.push(...a, ...b, ...c); g.uv.push(0, 0, 1, 0, 0.5, 1); g.idx.push(n, n + 1, n + 2); };
  const quadA = (k, a, b, c, d) => G(k).quad(a, b, c, d);
  const poly = (k, pts3) => { // pts3 [[x,y,z]...] simple polygon, flat-ish: triangulate on x,z
    const t = earclip(pts3.map((p) => [p[0], p[2]])); for (const [a, b, c] of t) tri(k, pts3[a], pts3[b], pts3[c]);
  };
  function frame(A, C, o = {}) {
    const dx = C[0] - A[0], dz = C[1] - A[1], L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L; let nx = uz, nz = -ux;
    const mx = (A[0] + C[0]) / 2, mz = (A[1] + C[1]) / 2;
    if (o.out) { nx = o.out[0]; nz = o.out[1]; } else if (inR(mx + nx * 0.3, mz + nz * 0.3, ring)) { nx = -nx; nz = -nz; }
    const X = (s, d) => A[0] + ux * s + nx * d, Z = (s, d) => A[1] + uz * s + nz * d;
    const Y = (s) => (o.floor != null ? o.floor : gr(X(s, 0), Z(s, 0))) + (o.dy || 0);
    const F = { L, ux, uz, nx, nz, X, Z, Y, A, C };
    F.P = (s, d, y) => [X(s, d), Y(s) + y, Z(s, d)];
    F.PA = (s, d, y) => [X(s, d), y, Z(s, d)];
    /** oriented box, y relative to the ground (or the floor) at s; long boxes are cut so they follow a slope */
    F.box = (k, s, d, y0, y1, hs, hd) => {
      const n = Math.max(1, Math.ceil((hs * 2) / 1.3)), w = (hs * 2) / n;
      for (let i = 0; i < n; i++) { const sc = s - hs + (i + 0.5) * w; G(k).box(X(sc, d), Y(sc) + (y0 + y1) / 2, Z(sc, d), ux, uz, w / 2, (y1 - y0) / 2, hd); }
    };
    F.boxA = (k, s, d, ya0, ya1, hs, hd) => G(k).box(X(s, d), (ya0 + ya1) / 2, Z(s, d), ux, uz, hs, (ya1 - ya0) / 2, hd);
    F.q = (k, s0, s1, y0, y1, d) => quadA(k, F.P(s0, d, y0), F.P(s1, d, y0), F.P(s1, d, y1), F.P(s0, d, y1));          // follows the ground
    F.qa = (k, s0, s1, ya0, ya1, d) => quadA(k, F.PA(s0, d, ya0), F.PA(s1, d, ya0), F.PA(s1, d, ya1), F.PA(s0, d, ya1)); // level, absolute y
    F.qa4 = (k, s0, s1, ya0, ya1, yb0, yb1, d) => quadA(k, F.PA(s0, d, ya0), F.PA(s1, d, yb0), F.PA(s1, d, yb1), F.PA(s0, d, ya1)); // sloped
    F.tri = (k, a, b, c) => tri(k, F.PA(...a), F.PA(...b), F.PA(...c));                                                       // [s,d,yAbs]
    /** half disc (arch) standing on a level chord at absolute y */
    F.arch = (k, s, d, ya, r, n = 10) => { for (let i = 0; i < n; i++) { const a0 = Math.PI * i / n, a1 = Math.PI * (i + 1) / n; F.tri(k, [s, d, ya], [s + r * Math.cos(a0), d, ya + r * Math.sin(a0)], [s + r * Math.cos(a1), d, ya + r * Math.sin(a1)]); } };
    F.disc = (k, s, d, yc, r, n = 12) => { for (let i = 0; i < n; i++) { const a0 = 2 * Math.PI * i / n, a1 = 2 * Math.PI * (i + 1) / n; F.tri(k, [s, d, yc], [s + r * Math.cos(a0), d, yc + r * Math.sin(a0)], [s + r * Math.cos(a1), d, yc + r * Math.sin(a1)]); } };
    /** iron/timber railing: top rail, base rail and bars, following the ground */
    F.rail = (k, s0, s1, d, h, o2 = {}) => {
      const step = o2.step || 0.13, hw = o2.w || 0.012;
      F.box(k, (s0 + s1) / 2, d, h - 0.03, h + 0.03, (s1 - s0) / 2, 0.03); F.box(k, (s0 + s1) / 2, d, o2.base ?? 0.12, (o2.base ?? 0.12) + 0.04, (s1 - s0) / 2, 0.02);
      for (let s = s0; s <= s1 + 1e-6; s += step) F.box(k, s, d, o2.base ?? 0.1, h, hw, hw);
      for (const s of [s0, s1, ...(o2.posts || [])]) F.box(k, s, d, -0.1, h + 0.08, 0.035, 0.035);
    };
    /** lettering/board plane at absolute heights; bg optional (otherwise transparent) */
    F.text = (str, s0, s1, ya0, ya1, d, to = {}) => {
      const tex = textTexture(str, { ...to, ar: (s1 - s0) / (ya1 - ya0) }); if (!tex) return;
      const a = F.PA(s0, d, ya0), b = F.PA(s1, d, ya0), c = F.PA(s1, d, ya1), e = F.PA(s0, d, ya1);
      const flip = (ux * nz - uz * nx) > 0 ? 0 : 1, [u0, u1] = flip ? [1, 0] : [0, 1];
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c, ...e], 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute([u0, 0, u1, 0, u1, 1, u0, 1], 2)); g.setIndex([0, 1, 2, 0, 2, 3]); g.computeVertexNormals();
      const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5, side: THREE.DoubleSide, transparent: !to.bg, depthWrite: !!to.bg, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
      m.name = 'frontage:a20:text'; K.extra.push(m);
    };
    return F;
  }
  /** A solid mass over a footprint: walls from the ground up to top(x, z), flat or sloping roof, mitred out by o.out so it hides the base box. */
  function mass(pts, o) {
    let R = pts.map((p) => [p[0], p[1]]); if (signedArea(R) < 0) R.reverse(); R = offsetRing(R, o.out ?? 0.05); const n = R.length;
    for (let i = 0; i < n; i++) {
      const a = R[i], c = R[(i + 1) % n], k = o.wallFor ? o.wallFor(i, a, c) : o.wall;
      quadA(k, [a[0], gr(a[0], a[1]) - 0.6, a[1]], [c[0], gr(c[0], c[1]) - 0.6, c[1]], [c[0], o.top(c[0], c[1]), c[1]], [a[0], o.top(a[0], a[1]), a[1]]);
      if (o.collide !== false) K.colliders.push({ type: 'segment', a: [a[0], a[1]], b: [c[0], c[1]], r: 0.15, y0: gr(a[0], a[1]) - 0.5, top: o.top(a[0], a[1]), kind: 'wall' });
    }
    for (const [a, b, c] of earclip(R)) tri(o.roof, [R[a][0], o.top(R[a][0], R[a][1]), R[a][1]], [R[b][0], o.top(R[b][0], R[b][1]), R[b][1]], [R[c][0], o.top(R[c][0], R[c][1]), R[c][1]]);
    return R;
  }
  function flush() {
    for (const [key, geo] of geos) {
      const [kind, col] = key.split('|'); let mat;
      if (kind === 'glass') mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.38, side: THREE.DoubleSide, depthWrite: false });
      else if (kind === 'pane') mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.14, metalness: 0.3, side: THREE.DoubleSide });
      else if (kind === 'metal') mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.45, metalness: 0.5, side: THREE.DoubleSide });
      else if (kind === 'brick') mat = new THREE.MeshStandardMaterial({ map: K.m.brick.map, normalMap: K.m.brick.normalMap, color: col, roughness: 1, side: THREE.DoubleSide });
      else if (kind === 'stock') { const t = Textures.facadeTexture('brick_yellow', false, 62, 0); mat = new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normalMap, color: col, roughness: 1, side: THREE.DoubleSide }); }
      else mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.8, side: THREE.DoubleSide });
      const me = geo.mesh(mat); if (me) { me.name = 'frontage:a20:' + key; K.extra.push(me); }
    }
  }
  return { G, tri, quadA, poly, frame, mass, flush };
}

// colours read from the photos
const C = {
  white: 'flat|#f1eee6', white2: 'flat|#e6e2d8', cream: 'flat|#e9dfc3', blue: 'flat|#1f3f93', blueD: 'flat|#183070', slate: 'flat|#3d4249', slateL: 'flat|#4b5159',
  iron: 'metal|#1a1b1e', black: 'flat|#16171a', grey: 'flat|#5a626b', greyD: 'flat|#3c4147', glass: 'pane|#55636d', glassW: 'pane|#d9ccae', glassT: 'glass|#cfe2e8',
  timber: 'flat|#4b3626', brick: 'flat|#a4533f', stock: 'flat|#cdb982', tile: 'flat|#9a4f3b', tileD: 'flat|#7f3e30', gold: 'flat|#d2a647', coping: 'flat|#d6d0c2',
  aub: 'flat|#4b2a47', aubD: 'flat|#3a1f37', green: 'flat|#183a2e', greenT: 'flat|#2d5a3d', orange: 'flat|#ee8a5e', paving: 'flat|#b9b5ab',
};

// ---- the features ----------------------------------------------------------------------------------------------------------------------
export const FEATURES = {
  /** The Grand (former nightclub): Dutch parapet wall with the arched logo window, blue-and-white wings, the tall white gable with its doors and canopy sign. */
  a20Grand(K, it, ctx) {
    const t = kit(K, ctx), ring = ctx.ring; const gs = ring.map((p) => gr(p[0], p[1]));
    const TOP = Math.min(gs.reduce((a, b) => a + b, 0) / gs.length, Math.min(...gs) + 0.12) + K.H; // where the base box ends
    // blue-painted lower walls along Bent Hill
    for (const [A, Cc] of [[[64, -29.5], [60.3, -25.2]], [[60.3, -25.2], [58.3, -21.3]], [[58.3, -21.3], [57.5, -13.4]]]) { const F = t.frame(A, Cc); F.q(C.blue, 0.02, F.L - 0.02, -0.4, 1.4, 0.07); }
    // Dutch / shaped parapet along the north-west wall
    const chain = [[64, -29.5], [60.3, -25.2], [58.3, -21.3]], seg = [], tot = chain.slice(1).reduce((a, p, i) => a + Math.hypot(p[0] - chain[i][0], p[1] - chain[i][1]), 0);
    for (let i = 0; i + 1 < chain.length; i++) { const F = t.frame(chain[i], chain[i + 1]); seg.push({ F, s0: seg.length ? seg[seg.length - 1].s1 : 0, s1: (seg.length ? seg[seg.length - 1].s1 : 0) + F.L }); }
    const prof = (u) => { const x = Math.abs(u - 0.5); if (x < 0.2) return 0.75 + 0.6 * Math.sqrt(1 - (x / 0.2) * (x / 0.2)); if (x < 0.27) return 0.75; if (x < 0.34) return 0.75 - (x - 0.27) * 6; return 0.3 + (u < 0.5 ? 0.0 : 0.0); };
    const N = 26;
    for (let i = 0; i < N; i++) {
      const d0 = tot * i / N, d1 = tot * (i + 1) / N, find = (d) => seg.find((q) => d <= q.s1 + 1e-6) || seg[seg.length - 1];
      const q0 = find(d0 + 1e-6), q1 = find(d1 - 1e-6), F = q0, a = q0.F.P(d0 - q0.s0, 0.06, 0), c = q1.F.P(d1 - q1.s0, 0.06, 0), h0 = prof(d0 / tot), h1 = prof(d1 / tot); void F;
      t.quadA(C.white, [a[0], TOP - 1.4, a[2]], [c[0], TOP - 1.4, c[2]], [c[0], TOP + h1, c[2]], [a[0], TOP + h0, a[2]]);
      const a2 = q0.F.P(d0 - q0.s0, -0.3, 0), c2 = q1.F.P(d1 - q1.s0, -0.3, 0);
      t.quadA(C.coping, [a[0], TOP + h0 + 0.02, a[2]], [c[0], TOP + h1 + 0.02, c[2]], [c2[0], TOP + h1 + 0.02, c2[2]], [a2[0], TOP + h0 + 0.02, a2[2]]);
    }
    // arched window with the logo, and two boarded blue doors, on the first (north) segment
    const F1 = seg[0].F, wy0 = TOP - 2.6, wy1 = TOP - 1.35;
    F1.qa(C.white, 0.45, F1.L - 0.45, wy0 - 0.12, wy1 + 0.12, 0.09); F1.arch(C.white, F1.L / 2, 0.09, wy1 + 0.12, 1.55, 12);
    F1.qa(C.black, 0.6, F1.L - 0.6, wy0, wy1, 0.14); F1.arch(C.black, F1.L / 2, 0.14, wy1, 1.4, 12);
    F1.text('the GRAND', F1.L / 2 - 1.55, F1.L / 2 + 1.55, wy0 + 0.15, wy1 + 1.28, 0.2, { fg: '#ffffff', font: 'sans', logo: true, fit: 0.42 });
    for (const s of [0.8, 2.15]) F1.q('flat|#2b4fa6', s, s + 1.2, 0.15, 2.3, 0.1);
    // railings round the sunken entrance, following the hill
    for (const [A, Cc] of [[[65.0, -31.0], [61.0, -26.6]], [[61.0, -26.6], [58.9, -22.2]]]) { const F = t.frame(A, Cc); F.rail(C.iron, 0, F.L, 1.3, 1.05, { step: 0.14, posts: [F.L / 2] }); }
    // the tall white gable (west wall at the foot of the hill) with big upper windows, the canopy sign over blue double doors
    const Fw = t.frame([58.3, -21.3], [57.5, -13.4]);
    for (const s of [1.5, 3.7]) { Fw.q('flat|#5a4a3c', s - 0.62, s + 0.62, 3.0, 5.2, 0.1); Fw.q(C.glass, s - 0.5, s + 0.5, 3.12, 5.08, 0.14); Fw.q(C.white, s - 0.03, s + 0.03, 3.12, 5.08, 0.16); Fw.q('flat|#5a4a3c', s - 0.5, s + 0.5, 4.08, 4.14, 0.17); }
    Fw.q('flat|#1c3f9a', 4.9, 7.4, -0.4, 3.0, 0.1);
    Fw.q('flat|#244aa8', 5.35, 7.05, 0.1, 2.5, 0.16); Fw.q(C.glass, 5.45, 6.1, 0.55, 2.2, 0.2); Fw.q(C.glass, 6.2, 6.95, 0.55, 2.2, 0.2); Fw.q('flat|#12306f', 6.1, 6.2, 0.1, 2.5, 0.21);
    const cy = Fw.Y(6.2) + 3.0; // canopy sign: blue board with an arched middle
    Fw.qa('flat|#1f46a0', 4.4, 8.0, cy, cy + 0.75, 0.55); Fw.arch('flat|#1f46a0', 6.2, 0.55, cy + 0.75, 1.5, 12); Fw.qa('flat|#183a88', 4.4, 8.0, cy - 0.12, cy, 0.5);
    Fw.text('the GRAND', 5.0, 7.4, cy + 0.15, cy + 1.45, 0.58, { fg: '#ffffff', logo: true, fit: 0.4 });
    // pitched slate roof over the tall gable: ridge east-west, white gable end, hipped at the east
    const PNW = [58.3, -21.3], PSW = [57.5, -13.4], PNE = [68.0, -21.2], PSE = [67.4, -13.5], RW = [57.9, -17.35], RE = [67.7, -17.35], RY = TOP + 3.5;
    const roof = (a, b, c, d) => t.quadA(C.slate, [a[0], TOP - 0.05, a[1]], [b[0], RY, b[1]], [c[0], RY, c[1]], [d[0], TOP - 0.05, d[1]]);
    roof(PNW, RW, RE, PNE); roof(PSW, RW, RE, PSE);
    t.tri(C.slate, [PNE[0], TOP - 0.05, PNE[1]], [PSE[0], TOP - 0.05, PSE[1]], [RE[0], RY, RE[1]]);
    t.tri(C.white, [PNW[0] - 0.04, TOP - 0.05, PNW[1]], [PSW[0] - 0.04, TOP - 0.05, PSW[1]], [RW[0] - 0.04, RY, RW[1]]);
    for (const P of [PNW, PSW]) t.quadA(C.black, [P[0] - 0.12, TOP - 0.08, P[1]], [RW[0] - 0.12, RY + 0.02, RW[1]], [RW[0] - 0.12, RY + 0.24, RW[1]], [P[0] - 0.12, TOP + 0.2, P[1]]); // scrolled bargeboards
    const chim = (x, z, y0, y1, k, w = 0.45) => { t.G(k).box(x, (y0 + y1) / 2, z, 1, 0, w, (y1 - y0) / 2, w); t.G(C.coping).box(x, y1 + 0.06, z, 1, 0, w + 0.08, 0.06, w + 0.08); t.G(C.tileD).box(x, y1 + 0.35, z, 1, 0, 0.1, 0.25, 0.1); };
    chim(62.0, -19.4, TOP + 0.5, TOP + 4.9, 'brick|#e9d7b8'); chim(67.5, -25.0, TOP - 0.2, TOP + 3.6, C.white2);
    t.flush();
  },

  /** One29: white upper floor, first-floor black wrought-iron balcony on iron columns over a railed terrace, banners, hanging lamps. */
  a20One29(K, it, ctx) {
    const t = kit(K, ctx), F = t.frame([57.5, -13.4], [60.7, -5.5]), L = F.L;
    // upper floor: two large dark-framed windows, a glazed canopy over the balcony
    for (const s of [2.2, 5.9]) { F.q('flat|#3a2c26', s - 0.8, s + 0.8, 3.95, 6.05, 0.1); F.q(C.glass, s - 0.68, s + 0.68, 4.07, 5.93, 0.14); F.q('flat|#3a2c26', s - 0.03, s + 0.03, 4.07, 5.93, 0.16); }
    F.q(C.glass, 3.6, 4.7, 0.5, 2.2, 0.1); F.q(C.white2, 3.5, 4.8, 2.2, 2.3, 0.12);
    // terrace: paved slab, railing with a gate gap, iron columns, balcony deck + balustrade
    const D = 2.5; F.box(C.paving, L / 2, D / 2 + 0.05, -0.05, 0.1, L / 2 + 0.2, D / 2 + 0.2);
    F.rail(C.iron, -0.2, L * 0.6, D + 0.15, 1.0, { step: 0.12, base: 0.08 }); F.rail(C.iron, L * 0.6 + 1.1, L + 0.2, D + 0.15, 1.0, { step: 0.12, base: 0.08 });
    for (const s of [0.5, 2.9, 5.4, 7.9]) { F.box(C.iron, s, D, -0.05, 3.2, 0.07, 0.07); for (let k = 1; k <= 5; k++) F.box(C.iron, s + 0.06 + k * 0.1, D - k * 0.17, 2.95 - k * 0.12 + 0.2 - 0.0, 0.04, 0.025, 0.03); F.box(C.iron, s, D - 1.0, 2.55, 2.62, 0.02, 1.0); }
    F.box(C.iron, L / 2, D / 2, 3.12, 3.46, L / 2 + 0.3, D / 2 + 0.25);           // deck and fascia beam
    F.box(C.iron, L / 2, D + 0.2, 3.46, 3.52, L / 2 + 0.3, 0.03); F.box(C.iron, L / 2, D + 0.2, 4.5, 4.56, L / 2 + 0.3, 0.03);
    for (let s = -0.2; s <= L + 0.4; s += 0.11) F.box(C.iron, s, D + 0.2, 3.5, 4.52, 0.011, 0.011);
    for (let s = 0.2; s < L; s += 0.9) F.box(C.iron, s + 0.45, D + 0.2, 3.85, 4.25, 0.16, 0.012); // scroll panels (read as ironwork)
    F.qa4(C.glassT, 0.0, L, F.Y(L / 2) + 6.4, F.Y(L / 2) + 6.4, F.Y(L / 2) + 5.5, F.Y(L / 2) + 5.5, D + 0.1);
    // banners (green and black) and hanging lamps
    for (const s of [-0.1, L + 0.3]) { F.box(C.iron, s, D + 0.9, 0, 3.4, 0.03, 0.03); F.q('flat|#b3c12d', s - 0.42, s + 0.42, 1.0, 3.3, D + 0.9); F.q(C.black, s - 0.42, s + 0.42, 0.45, 1.0, D + 0.9); }
    for (const s of [1.4, 3.2, 5.1, 6.9]) { F.box(C.iron, s, D * 0.5, 2.55, 3.1, 0.01, 0.01); t.G(C.iron).box(F.X(s, D * 0.5), F.Y(s) + 2.4, F.Z(s, D * 0.5), F.ux, F.uz, 0.14, 0.12, 0.14); }
    t.flush();
  },
};

/** Where the base box of the building ends (metres above datum), as the world builds it: shops stand on the low side of the footprint. */
function TOP_OF(K, ctx, shop = true) { const gs = ctx.ring.map((p) => gr(p[0], p[1])), avg = gs.reduce((a, b) => a + b, 0) / gs.length; return (shop ? Math.min(avg, Math.min(...gs) + 0.12) : avg) + K.H; }

/** Uvs for a brick/stock skin: 3.2 m x 2.9 m per tile (as the a15 skins). */
function skin(t, F, k, s0, s1, ya0, ya1, d) {
  const w = s1 - s0, h = ya1 - ya0, uv = [[0, 0], [w / 3.2, 0], [w / 3.2, h / 2.9], [0, h / 2.9]];
  t.G(k).quad(F.PA(s0, d, ya0), F.PA(s1, d, ya0), F.PA(s1, d, ya1), F.PA(s0, d, ya1), uv);
}
/** A row of small dentil blocks under a cornice. */
function dentils(F, k, s0, s1, ya, d) { for (let s = s0 + 0.08; s < s1 - 0.05; s += 0.2) F.boxA(k, s, d, ya - 0.1, ya, 0.05, 0.05); }

Object.assign(FEATURES, {
  /** Smmash Burger Shack (white painted brick, stepped Dutch gable, orange fascia) and Felixstowe Grill (charcoal front, grey wall with a shaped gable). */
  a20Row(K, it, ctx) {
    const t = kit(K, ctx), A = [78.4, -41.5], Cc = [67.6, -33], O = [[64.3, -29.9], [67.6, -33], [78.4, -41.5], [82.6, -31.3], [68.3, -25.1]];
    const gz = (p, h) => [p[0], p[1], gr(p[0], p[1]) + h];
    const top = plane(gz(A, 4.45), gz(Cc, 4.45), gz(O[3], 3.5));
    t.mass(O, { wall: C.grey, roof: C.slateL, top, out: 0.05 });
    const Fa = t.frame(A, Cc), fl1 = Fa.Y(2.3), fl2 = Fa.Y(8.2), Fs = t.frame(A, Cc, { floor: fl1 }), Fg = t.frame(A, Cc, { floor: fl2 });
    const eave = (F, s) => top(F.X(s, 0), F.Z(s, 0));
    // -- Smmash: s 0 .. 4.75
    const s1 = 4.75;
    Fs.qa4(C.white, 0, s1, fl1 - 0.8, eave(Fs, 0), fl1 - 0.8, eave(Fs, s1), 0.1);
    for (const s of [0.22, s1 - 0.22]) { Fs.boxA(C.white, s, 0.2, fl1 - 0.8, eave(Fs, s) + 0.15, 0.24, 0.12); Fs.boxA(C.white2, s, 0.3, fl1 + 0.05, fl1 + 0.55, 0.3, 0.05); for (let k = -1; k <= 1; k++) Fs.boxA(C.white2, s + k * 0.12, 0.33, fl1 + 0.7, eave(Fs, s) - 0.5, 0.025, 0.02); }
    Fs.qa(C.orange, 0.5, s1 - 0.5, fl1 + 2.95, fl1 + 3.85, 0.22);
    Fs.text('SMMASH - BURGER SHACK', 0.5, s1 - 0.5, fl1 + 2.97, fl1 + 3.83, 0.25, { bg: '#ee8a5e', fg: '#1d2a3f', fit: 0.55 });
    Fs.boxA(C.white, s1 / 2, 0.3, fl1 + 3.88, fl1 + 4.2, s1 / 2 - 0.1, 0.17); dentils(Fs, C.white2, 0.3, s1 - 0.3, fl1 + 3.86, 0.35);
    const G0 = fl1 + 4.2; // stepped, scalloped Dutch gable with a ball finial
    for (const [a, b, h] of [[0.45, s1 - 0.45, 0.45], [0.8, s1 - 0.8, 0.85], [1.2, s1 - 1.2, 1.25], [1.6, s1 - 1.6, 1.6]]) { Fs.boxA(C.white, (a + b) / 2, 0.1, G0, G0 + h, (b - a) / 2, 0.1); Fs.boxA(C.coping, (a + b) / 2, 0.1, G0 + h, G0 + h + 0.06, (b - a) / 2 + 0.06, 0.13); }
    Fs.boxA(C.coping, s1 / 2, 0.1, G0 + 1.65, G0 + 1.85, 0.2, 0.18); Fs.boxA(C.white, s1 / 2, 0.1, G0 + 1.85, G0 + 2.15, 0.15, 0.15);
    Fs.disc(C.greyD, s1 / 2, 0.21, G0 + 0.8, 0.2, 10); for (const a of [0, 1, 2, 3]) Fs.boxA(C.white2, s1 / 2 + Math.cos(a * Math.PI / 4) * 0.33, 0.22, G0 + 0.8 + Math.sin(a * Math.PI / 4) * 0.33, 0.03, 0.01, 0.0);
    Fs.q(C.white2, 1.5, 4.25, 0.45, 2.95, 0.2); Fs.q('pane|#9db9a9', 1.65, 2.8, 0.6, 2.85, 0.24); Fs.q('pane|#8fb0a0', 2.9, 4.1, 0.6, 2.85, 0.24); Fs.q(C.white2, 2.8, 2.9, 0.6, 2.85, 0.26);
    for (const [a, b] of [[1.7, 2.7], [3.0, 4.0]]) for (let k = 0; k < 4; k++) Fs.q('pane|#c4d6c8', a + 0.1 * k, a + 0.1 * k + 0.35, 0.9 + k * 0.45, 1.2 + k * 0.45, 0.26); // leaf wallpaper hint
    Fs.q('flat|#d8cdb8', 0.65, 1.3, 0.05, 2.35, 0.2); Fs.q(C.glass, 0.7, 1.25, 2.4, 2.75, 0.2);
    // -- Felixstowe Grill: s 4.95 .. 11.55
    const g0 = 4.95, g1 = 11.55;
    Fg.qa4('flat|#2d3035', g0, g1, fl2 - 0.8, eave(Fg, g0), fl2 - 0.8, eave(Fg, g1), 0.1);
    for (const s of [g0 + 0.2, g1 - 0.2]) { Fg.boxA(C.greyD, s, 0.2, fl2 - 0.8, eave(Fg, s) + 0.1, 0.23, 0.12); Fg.boxA(C.greyD, s, 0.28, eave(Fg, s) - 1.1, eave(Fg, s) - 0.1, 0.27, 0.1); }
    Fg.boxA(C.greyD, (g0 + g1) / 2, 0.2, fl2 - 0.8, fl2 + 0.6, (g1 - g0) / 2 - 0.4, 0.1);
    Fg.qa(C.black, g0 + 0.5, g1 - 0.5, fl2 + 3.1, fl2 + 4.3, 0.24);
    Fg.text('FELIXSTOWE GRILL', g0 + 0.95, g1 - 0.95, fl2 + 3.15, fl2 + 4.25, 0.27, { bg: '#16171a', fg: '#e2b24a', font: 'serif', fit: 0.62 });
    for (const s of [g0 + 0.72, g1 - 0.72]) { Fg.disc('flat|#d9a640', s, 0.27, fl2 + 3.7, 0.5, 12); Fg.disc('flat|#e8742a', s, 0.29, fl2 + 3.7, 0.4, 12); }
    Fg.boxA(C.greyD, (g0 + g1) / 2, 0.3, fl2 + 4.3, fl2 + 4.5, (g1 - g0) / 2, 0.14); dentils(Fg, C.black, g0 + 0.3, g1 - 0.3, fl2 + 4.3, 0.34);
    Fg.text('FELIXSTOWE GRILL', 6.7, 10.9, fl2 + 2.2, fl2 + 3.0, 0.22, { bg: '#18223f', fg: '#ee5a3a', fit: 0.5, sub: '01394 282228' });
    Fg.q('pane|#d8c7a2', 6.8, 11.0, 0.6, 2.15, 0.2); Fg.q(C.greyD, 8.85, 8.95, 0.6, 2.15, 0.23); Fg.q('flat|#e9e3d3', 6.85, 8.8, 0.65, 1.45, 0.24); Fg.q('flat|#c9843a', 7.1, 8.5, 0.7, 1.4, 0.26); Fg.q('flat|#d8b27a', 9.1, 10.9, 0.7, 1.45, 0.25);
    Fg.q('pane|#1d1f23', 5.35, 6.65, 0.05, 2.5, 0.2); Fg.q('pane|#7d8b92', 5.5, 6.5, 0.4, 2.3, 0.24);
    // -- the grey west wall and its shaped, scrolled gable
    const Fw = t.frame([64.3, -29.9], [68.3, -25.1]), Fw0 = t.frame([67.6, -33], [64.3, -29.9]);
    const hg = (u) => 0.2 + 1.9 * Math.pow(Math.sin(Math.PI * u), 1.1) * (0.8 + 0.2 * Math.cos(2 * Math.PI * u * 1.5)); const N = 18;
    for (let i = 0; i < N; i++) {
      const u0 = i / N, u1 = (i + 1) / N, a = Fw.P(u0 * Fw.L, 0.07, 0), c = Fw.P(u1 * Fw.L, 0.07, 0), ta = top(a[0], a[2]), tc = top(c[0], c[2]);
      t.quadA(C.grey, [a[0], ta - 0.9, a[2]], [c[0], tc - 0.9, c[2]], [c[0], tc + hg(u1), c[2]], [a[0], ta + hg(u0), a[2]]);
      const a2 = Fw.P(u0 * Fw.L, -0.3, 0), c2 = Fw.P(u1 * Fw.L, -0.3, 0); t.quadA(C.coping, [a[0], ta + hg(u0) + 0.02, a[2]], [c[0], tc + hg(u1) + 0.02, c[2]], [c2[0], tc + hg(u1) + 0.02, c2[2]], [a2[0], ta + hg(u0) + 0.02, a2[2]]);
    }
    Fw.q('flat|#2f3338', 0.2, Fw.L - 0.2, 1.1, 1.75, 0.1); Fw.q('flat|#3a3f45', 2.0, 3.9, 1.95, 3.15, 0.1); Fw.q('pane|#c9bf9f', 2.15, 3.75, 2.1, 3.0, 0.14); Fw.q('flat|#3a3f45', 2.93, 2.99, 2.1, 3.0, 0.16); Fw.q(C.coping, 1.9, 4.0, 1.85, 1.95, 0.2);
    const ch = (x, z, y0, y1) => { t.G('flat|#b0876a').box(x, (y0 + y1) / 2, z, 1, 0, 0.42, (y1 - y0) / 2, 0.42); t.G(C.greyD).box(x, y1 + 0.06, z, 1, 0, 0.5, 0.06, 0.5); t.G(C.coping).box(x, y1 + 0.5, z, 1, 0, 0.14, 0.4, 0.14); };
    ch(70.0, -29.4, top(70, -29.4), top(70, -29.4) + 2.4);
    t.flush();
  },

  /** Architects (bottle-green shopfront with glazed tile riser and arched door), red brick return. Footprint of The Leather Shop in OSM. */
  a20Architects(K, it, ctx) {
    const t = kit(K, ctx), O = [[87.1, -40.8], [89.8, -33.3], [83.9, -31.1], [79.6, -42.3], [85.1, -46.3]];
    const gz = (p, h) => [p[0], p[1], gr(p[0], p[1]) + h];
    const top = plane(gz(O[3], 4.7), gz(O[4], 4.7), gz(O[1], 3.7));
    t.mass(O, { wall: C.brick, roof: C.slateL, top, out: 0.05 });
    const Fa = t.frame(O[3], O[4]), L = Fa.L, fl = Fa.Y(L / 2), F = t.frame(O[3], O[4], { floor: fl }), eave = (s) => top(F.X(s, 0), F.Z(s, 0));
    F.qa4(C.green, 0, L, fl - 0.8, eave(0), fl - 0.8, eave(L), 0.1);
    for (const s of [0.2, L - 0.2]) F.boxA('flat|#1b4636', s, 0.2, fl - 0.8, eave(s) + 0.1, 0.22, 0.12);
    F.q(C.greenT, 0.4, L - 0.4, -0.8, 0.85, 0.16); for (let y = 0.1; y < 0.85; y += 0.21) F.boxA('flat|#0f2a20', L / 2, 0.17, fl + y, fl + y + 0.02, L / 2 - 0.4, 0.01);
    F.boxA('flat|#1e4a38', L / 2, 0.2, fl + 0.85, fl + 0.95, L / 2 - 0.4, 0.07);
    F.q('pane|#7f949c', 2.1, L - 0.5, 0.95, 2.55, 0.18); for (const s of [3.2, 4.3, 5.4]) F.q('flat|#1e4a38', s - 0.03, s + 0.03, 0.95, 2.55, 0.2);
    for (const [a, b] of [[2.4, 2.95], [3.35, 3.95], [4.5, 5.1], [5.55, 6.0]]) F.q('flat|#ecebe4', a, b, 1.3, 2.2, 0.22);
    F.q('pane|#24413a', 0.45, L - 0.4, 2.55, 3.05, 0.18); for (let s = 0.7; s < L - 0.4; s += 0.28) F.q('flat|#3f6b57', s, s + 0.03, 2.55, 3.05, 0.2);
    F.q('flat|#1e4a38', 0.4, 1.75, 0, 2.35, 0.16); F.arch('flat|#1e4a38', 1.075, 0.16, fl + 2.35, 0.675, 10); F.q('pane|#5d746e', 0.55, 1.6, 0.1, 2.3, 0.2); F.arch('pane|#5d746e', 1.075, 0.2, fl + 2.3, 0.52, 10); F.q('flat|#1e4a38', 1.04, 1.1, 0.1, 2.3, 0.22);
    F.qa(C.green, 0.45, L - 0.45, fl + 3.1, fl + 4.2, 0.22);
    F.text('ARCHITECTS', 1.4, L - 0.9, fl + 3.2, fl + 4.1, 0.25, { bg: '#183a2e', fg: '#f0f0ea', fit: 0.5 });
    F.boxA('flat|#1e4a38', L / 2, 0.3, fl + 4.2, fl + 4.4, L / 2, 0.14);
    t.flush();
  },

  /** Ruby's Cafe Bar Take Away: aubergine-purple timber shopfront, painted brick gable end with lettering, black timber fence. */
  a20Rubys(K, it, ctx) {
    const t = kit(K, ctx), O = [[85.1, -46.3], [89.3, -49], [90.3, -46.4], [94.9, -48.1], [98, -40], [93.5, -38.4], [92, -39.3], [89.4, -38.5], [88.5, -41.3], [87.1, -40.8]];
    const gz = (p, h) => [p[0], p[1], gr(p[0], p[1]) + h];
    const top = plane(gz(O[0], 4.5), gz(O[3], 4.5), gz(O[5], 3.9));
    t.mass(O, { wall: C.aub, roof: C.slateL, top, out: 0.05 });
    const Fa = t.frame(O[0], O[1]), L = Fa.L, fl = Fa.Y(L / 2), F = t.frame(O[0], O[1], { floor: fl }), eave = (s) => top(F.X(s, 0), F.Z(s, 0));
    F.qa4('flat|#552d52', 0, L, fl - 0.8, eave(0), fl - 0.8, eave(L), 0.1);
    for (const s of [0.18, L - 0.18]) F.boxA(C.aubD, s, 0.2, fl - 0.8, fl + 3.0, 0.2, 0.12);
    F.q(C.aubD, 0.3, L - 0.3, -0.8, 0.75, 0.16);
    for (const [a, b] of [[0.5, 2.3], [2.7, 4.5]]) { F.q('pane|#5b5560', a, b, 0.85, 2.25, 0.2); F.arch('pane|#5b5560', (a + b) / 2, 0.2, fl + 2.25, (b - a) / 2, 10); for (let k = 0; k < 3; k++) F.disc('flat|#f0eaf6', a + 0.5 + k * 0.4, 0.23, fl + 1.5 + (k % 2) * 0.4, 0.14, 8); }
    F.qa('flat|#5c3358', 0.35, L - 0.35, fl + 2.95, fl + 3.9, 0.22);
    F.text("Ruby's", 0.5, L - 0.5, fl + 3.0, fl + 3.85, 0.25, { bg: '#5c3358', fg: '#d9b45a', font: 'script', fit: 0.78 });
    F.boxA(C.aubD, L / 2, 0.3, fl + 3.9, fl + 4.15, L / 2, 0.14);
    // gable-end wall to the east with its lettering, and the black timber fence in front of it
    const Fg = t.frame(O[2], O[3]), gL = Fg.L, gy = Fg.Y(gL / 2);
    Fg.text("Ruby's", 1.2, gL - 0.5, gy + 2.45, gy + 3.55, 0.1, { fg: '#e8e2f0', font: 'script', fit: 0.8 }); Fg.text('CAFE  BAR  TAKE AWAY', 1.2, gL - 0.5, gy + 2.05, gy + 2.5, 0.1, { fg: '#e8e2f0', fit: 0.6 });
    Fg.qa('flat|#f3f0f8', 0.15, 1.0, gy + 2.75, gy + 3.5, 0.1);
    for (let s = 0.05; s < gL - 0.2; s += 0.19) Fg.box(C.black, s, 0.6, -0.1, 2.15, 0.085, 0.02);
    Fg.box(C.black, gL / 2, 0.58, 0.25, 0.32, gL / 2, 0.03); Fg.box(C.black, gL / 2, 0.58, 1.8, 1.87, gL / 2, 0.03); Fg.box('flat|#e3dccb', 1.6, 0.64, 0.9, 1.8, 0.4, 0.015);
    t.flush();
  },
});

Object.assign(FEATURES, {
  /** Hamilton MAS (white shopfront under tile-hung first floor, slate roof) and the yellow-stock-brick house with a canted two-storey bay and a green door. */
  a20Mas(K, it, ctx) {
    const t = kit(K, ctx), F = t.frame([49.7, -4], [44.7, -16]), L = F.L, TOP = TOP_OF(K, ctx, it.shop !== false);
    const hs = 6.1; // MAS 0..hs, house hs..L
    // house: stock brick skin with red-brick plinth, bands, a canted bay and the green door
    skin(t, F, 'stock|#ffffff', hs, L - 0.05, F.Y(hs) - 0.3, TOP + 0.02, 0.05);
    skin(t, F, 'brick|#ffffff', hs, L - 0.05, F.Y(hs) - 0.3, F.Y(L) + 0.75, 0.07);
    for (const [y0, y1] of [[2.95, 3.12], [5.0, 5.15]]) F.q('flat|#b25a40', hs, L - 0.05, y0, y1, 0.08);
    const bs = 7.1, bw = 1.8, bd = 0.9, P = [[bs, 0], [bs + 0.8, bd], [bs + 0.8 + bw, bd], [bs + 1.6 + bw, 0]], yb = F.Y(bs + 1.6), yt = yb + 5.2;
    for (let i = 0; i < 3; i++) {
      const [s0, d0] = P[i], [s1, d1] = P[i + 1], face = i === 1;
      t.quadA('stock|#ffffff', F.PA(s0, d0, yb - 0.4), F.PA(s1, d1, yb - 0.4), F.PA(s1, d1, yt), F.PA(s0, d0, yt));
      t.quadA('brick|#ffffff', F.PA(s0, d0 + 0.01, yb - 0.4), F.PA(s1, d1 + 0.01, yb - 0.4), F.PA(s1, d1 + 0.01, yb + 0.7), F.PA(s0, d0 + 0.01, yb + 0.7));
      const wm = (s0 + s1) / 2, dm = (d0 + d1) / 2, hw = face ? 0.62 : 0.2, dd = dm + 0.03;
      for (const [y0, y1] of [[yb + 1.0, yb + 2.5], [yb + 3.55, yb + 4.95]]) {
        t.quadA(C.white, F.PA(wm - hw - 0.07, dd, y0 - 0.07), F.PA(wm + hw + 0.07, dd, y0 - 0.07), F.PA(wm + hw + 0.07, dd, y1 + 0.07), F.PA(wm - hw - 0.07, dd, y1 + 0.07));
        t.quadA('pane|#46525a', F.PA(wm - hw, dd + 0.03, y0), F.PA(wm + hw, dd + 0.03, y0), F.PA(wm + hw, dd + 0.03, y1), F.PA(wm - hw, dd + 0.03, y1));
        F.boxA(C.white, wm, dd + 0.05, (y0 + y1) / 2 - 0.02, (y0 + y1) / 2 + 0.02, hw, 0.015); if (face) F.boxA(C.white, wm, dd + 0.05, y0, y1, 0.02, 0.015);
        F.boxA(C.white, wm, dd + 0.1, y0 - 0.12, y0 - 0.05, hw + 0.15, 0.1);
      }
    }
    t.quadA('flat|#3f4046', F.PA(P[0][0] - 0.1, 0, yt - 0.1), F.PA(P[1][0] - 0.1, bd + 0.15, yt - 0.1), F.PA(P[2][0] + 0.1, bd + 0.15, yt - 0.1), F.PA(P[3][0] + 0.1, 0, yt - 0.1)); // slate cap
    t.quadA('flat|#3f4046', F.PA(P[0][0] - 0.1, 0, yt - 0.1), F.PA(P[1][0] - 0.1, bd + 0.15, yt - 0.1), F.PA(P[1][0] + 0.2, bd + 0.15, yt + 0.4), F.PA(P[0][0], 0, yt + 0.5));
    t.quadA('flat|#3f4046', F.PA(P[1][0] - 0.1, bd + 0.15, yt - 0.1), F.PA(P[2][0] + 0.1, bd + 0.15, yt - 0.1), F.PA(P[2][0] - 0.2, bd + 0.15, yt + 0.4), F.PA(P[1][0] + 0.2, bd + 0.15, yt + 0.4));
    t.quadA('flat|#3f4046', F.PA(P[2][0] + 0.1, bd + 0.15, yt - 0.1), F.PA(P[3][0] + 0.1, 0, yt - 0.1), F.PA(P[3][0], 0, yt + 0.5), F.PA(P[2][0] - 0.2, bd + 0.15, yt + 0.4));
    const dx = 11.6, dy = F.Y(dx);
    F.q(C.white, dx - 0.7, dx + 0.7, 0, 2.7, 0.1); F.q('flat|#43b432', dx - 0.5, dx + 0.5, 0.05, 2.25, 0.14); F.q('pane|#7ccf6a', dx - 0.38, dx + 0.38, 1.2, 2.1, 0.17); F.q('pane|#e8efe8', dx - 0.5, dx + 0.5, 2.3, 2.62, 0.14); F.box('flat|#b9b3a5', dx, 0.25, -0.1, 0.12, 0.7, 0.25);
    F.q(C.white, dx - 0.55, dx + 0.55, 3.75, 5.55, 0.1); F.q('pane|#46525a', dx - 0.45, dx + 0.45, 3.85, 5.45, 0.13); F.q(C.white, dx - 0.02, dx + 0.02, 3.85, 5.45, 0.15); void dy;
    // MAS: tile-hung first floor (scalloped red tiles), white shopfront, slate roof, sash windows
    t.G(C.tile).quad(F.PA(0, 0.07, F.Y(0) + 3.4), F.PA(hs, 0.07, F.Y(hs) + 3.4), F.PA(hs, 0.07, TOP + 0.02), F.PA(0, 0.07, TOP + 0.02));
    for (let y = 3.55; TOP - F.Y(3) > y + 0.1; y += 0.16) F.qa(C.tileD, 0.0, hs, F.Y(3) + y, F.Y(3) + y + 0.025, 0.09);
    F.qa(C.white, 0, hs, F.Y(3) + 2.7, F.Y(3) + 3.4, 0.14); F.q(C.white, 0, hs, -0.3, 0.55, 0.12);
    F.q(C.white, 0, 0.35, 0, 3.4, 0.13); F.q(C.white, hs - 0.4, hs, 0, 3.4, 0.13);
    F.q('pane|#c8d3d6', 0.5, 2.6, 0.6, 2.7, 0.16); F.q('pane|#7d6a58', 3.65, hs - 0.5, 0.6, 2.7, 0.16); F.q(C.white, 2.55, 3.7, 0.0, 2.7, 0.14); F.q('pane|#aebcc2', 2.75, 3.5, 0.2, 2.5, 0.2); F.q(C.white, 3.1, 3.14, 0.2, 2.5, 0.22); F.box('flat|#b4482e', 3.1, 0.35, -0.1, 0.05, 0.5, 0.35);
    F.q(C.white, 2.55, 4.15, 4.0, 5.85, 0.1); F.q('pane|#3f4b55', 2.65, 4.05, 4.1, 5.75, 0.14); for (const s of [3.35]) F.q(C.white, s - 0.025, s + 0.025, 4.1, 5.75, 0.16); for (const y of [4.65, 5.2]) F.q(C.white, 2.65, 4.05, y, y + 0.03, 0.16);
    F.q(C.white, 0.5, 1.5, 4.05, 5.3, 0.1); F.q('pane|#3f4b55', 0.58, 1.42, 4.13, 5.22, 0.14);
    t.flush();
  },

  /** Cream-painted gabled villa: scalloped white bargeboards and finials, tiled roof, glazed balcony over a green-panelled timber oriel. */
  a20Villa(K, it, ctx) {
    const t = kit(K, ctx), TOP = TOP_OF(K, ctx, false);
    const NW = [38.6, 2.5], NE = [44.7, 0.0], SE = [48.8, 10.3], SW = [42.4, 12.5];
    const rm = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], RN = rm(NW, NE), RS = rm(SW, SE), RY = TOP + 2.8, tile = 'flat|#6b5c50';
    const roof = (a, b, c, d) => t.quadA(tile, [a[0], TOP - 0.1, a[1]], [b[0], RY, b[1]], [c[0], RY, c[1]], [d[0], TOP - 0.1, d[1]]);
    roof(NW, RN, RS, SW); roof(NE, RN, RS, SE);
    t.tri('flat|#bccbdc', [NW[0], TOP - 0.1, NW[1]], [NE[0], TOP - 0.1, NE[1]], [RN[0], RY, RN[1]]); t.tri('flat|#f1ead4', [SW[0], TOP - 0.1, SW[1]], [SE[0], TOP - 0.1, SE[1]], [RS[0], RY, RS[1]]);
    // scalloped bargeboards and finials on the south (sea) gable and the north gable
    for (const [a, b, r] of [[SW, SE, RS], [NW, NE, RN]]) {
      for (const [e, sg] of [[a, 1], [b, 1]]) {
        const L = Math.hypot(r[0] - e[0], r[1] - e[1]), n = Math.max(6, Math.round(L / 0.3)), ox = (r[0] - e[0]) / L, oz = (r[1] - e[1]) / L;
        for (let i = 0; i < n; i++) { const f0 = i / n, f1 = (i + 1) / n, x0 = e[0] + (r[0] - e[0]) * f0, z0 = e[1] + (r[1] - e[1]) * f0, x1 = e[0] + (r[0] - e[0]) * f1, z1 = e[1] + (r[1] - e[1]) * f1, y0 = TOP - 0.1 + (RY - TOP + 0.1) * f0, y1 = TOP - 0.1 + (RY - TOP + 0.1) * f1;
          t.quadA(C.white, [x0, y0, z0], [x1, y1, z1], [x1, y1 - 0.16, z1], [x0, y0 - 0.16, z0]); t.tri(C.white, [x0, y0 - 0.16, z0], [x1, y1 - 0.16, z1], [(x0 + x1) / 2, (y0 + y1) / 2 - 0.34, (z0 + z1) / 2]); }
        void ox; void oz; void sg;
      }
      t.G(C.white).box(r[0], RY + 0.4, r[1], 1, 0, 0.03, 0.4, 0.03); t.G(C.white).box(r[0], RY + 0.1, r[1], 1, 0, 0.1, 0.05, 0.1);
    }
    // south gable: glazed balcony over a green-panelled timber oriel
    const F = t.frame(SW, SE), L = F.L;
    F.q(C.white, 0, L, -0.4, 0.4, 0.04); F.q('pane|#556068', 1.3, 2.6, 3.35, 5.2, 0.08); F.q(C.white, 1.3 - 0.05, 2.7, 3.3, 3.37, 0.1);
    F.disc('pane|#f3efe0', L / 2 + 0.2, 0.08, TOP + 1.0, 0.18, 8);
    const oy = F.Y(L / 2);
    F.box('flat|#6a6b4e', L / 2, 0.45, 0.2, 1.3, L / 2 - 0.5, 0.45); F.box('flat|#e8e4d2', L / 2, 0.5, 1.3, 2.7, L / 2 - 0.5, 0.45);
    for (const s of [L / 2 - 1.8, L / 2 - 0.9, L / 2, L / 2 + 0.9, L / 2 + 1.8]) F.q('pane|#9fb1b8', s - 0.38, s + 0.38, 1.4, 2.6, 0.97);
    for (let s = 0.7; s < L - 0.5; s += 0.6) F.q('flat|#585a40', s, s + 0.4, 0.35, 1.2, 0.92);
    F.boxA('flat|#e8e4d2', L / 2, 0.55, oy + 2.75, oy + 2.95, L / 2 - 0.3, 0.55);
    t.quadA('glass|#d6e8ee', F.PA(0.2, 1.0, oy + 3.05), F.PA(L - 0.2, 1.0, oy + 3.05), F.PA(L - 0.2, 1.0, oy + 4.0), F.PA(0.2, 1.0, oy + 4.0)); F.boxA('metal|#aeb4b8', L / 2, 1.0, oy + 4.0, oy + 4.05, L / 2 - 0.2, 0.02);
    t.flush();
  },

  /** The Undercliff Kiosk: small white clapboard hut, black name board, shuttered hatch, door; green cafe chairs and tables, red planters. */
  a20Kiosk(K, it, ctx) {
    const t = kit(K, ctx), F = t.frame([76.7, 31.6], [79.7, 30.1]), L = F.L, gy = F.Y(L / 2), H = K.H;
    for (let y = 0.15; y < H - 0.2; y += 0.14) F.boxA('flat|#d3d2cc', L / 2, 0.02, gy + y, gy + y + 0.012, L / 2, 0.012);
    F.boxA(C.white, L / 2, 0.1, gy + H, gy + H + 0.1, L / 2 + 0.1, 0.2);
    F.q('flat|#c9c8c2', 1.2, 3.1, 0.6, 2.1, 0.06); F.q('flat|#e9e8e2', 1.28, 3.02, 0.72, 2.0, 0.08); for (let y = 0.85; y < 2.0; y += 0.1) F.q('flat|#bdbcb6', 1.28, 3.02, y, y + 0.015, 0.1);
    F.q(C.black, 1.2, 3.1, 0.35, 0.62, 0.12); F.text('The Undercliff Kiosk', 1.3, 3.0, gy + 0.37, gy + 0.6, 0.14, { bg: '#17181a', fg: '#f1efe8', fit: 0.62 });
    F.q('flat|#f4f3ee', 0.2, 1.0, 0.0, 2.15, 0.06); F.q('flat|#dcdbd5', 0.3, 0.9, 0.15, 1.0, 0.08); F.q('flat|#dcdbd5', 0.3, 0.9, 1.1, 2.0, 0.08);
    F.text('CAPPUCCINO  LATTE  ESPRESSO  ICE CREAM', 0.1, 3.0, gy + H - 0.2, gy + H - 0.03, 0.06, { fg: '#2a2a2a', fit: 0.7 });
    // chairs and tables on the lawn (world coordinates)
    const chair = (x, z, a) => { const y = gr(x, z), ux = Math.cos(a), uz = Math.sin(a); t.G('flat|#5f8a5b').box(x, y + 0.45, z, ux, uz, 0.21, 0.02, 0.21); t.G('flat|#5f8a5b').box(x - uz * 0.2, y + 0.75, z + ux * 0.2, ux, uz, 0.2, 0.28, 0.015); for (const [p, q] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) t.G('metal|#3b4c39').box(x + ux * p * 0.17 - uz * q * 0.17, y + 0.22, z + uz * p * 0.17 + ux * q * 0.17, ux, uz, 0.012, 0.22, 0.012); };
    for (const [x, z] of [[74.6, 27.2], [79.8, 26.0], [83.4, 27.6], [77.0, 23.8]]) {
      const y = gr(x, z); t.G('metal|#2b2c2e').box(x, y + 0.72, z, 1, 0, 0.36, 0.015, 0.36); t.G('metal|#2b2c2e').box(x, y + 0.36, z, 1, 0, 0.02, 0.36, 0.02);
      for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.3; chair(x + Math.cos(a) * 0.62, z + Math.sin(a) * 0.62, a + Math.PI / 2); }
    }
    for (const [x, z, a] of [[72.6, 30.0, 0.2], [84.8, 25.2, 0.0]]) { const y = gr(x, z), ux = Math.cos(a), uz = Math.sin(a); t.G('flat|#8b6b4a').box(x, y + 0.25, z, ux, uz, 0.75, 0.25, 0.28); t.G('flat|#d02a2a').box(x, y + 0.56, z, ux, uz, 0.7, 0.1, 0.24); }
    t.flush();
  },
});
