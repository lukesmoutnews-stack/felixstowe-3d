// Area a06-east-nicholas-fish-armstrong: custom building features. Export functions keyed by the `t` name used in your FRONTAGES details.
// Signature: (K, it, ctx) where K is the frame object from frontage-details.js and ctx = { b, ring, pointInRing, sideFrame }.
//
// Hamilton Road at the St Andrew's Road corner, from the supplied Street View photos
// (docs/research/hamilton-road-streetview/e-nicholas-estates-*.png, e-hamilton-fish-chips-corner.png, e-armstrong-north-coop-funeral.png).
// Everything here is drawn as extra meshes (own materials) in frames laid along each wall. Sizes are estimates scaled
// from the photos (door, pavement and storey heights for scale), not surveyed.
//
// Frames: mkFrame(p0, p1) lays a local frame along a wall: s runs to the viewer's RIGHT when looking at the wall from outside,
// d is out from the wall, y up from the ground. The base building is extruded plain brick to H plus a 0.45 m parapet (buildings.js),
// so walls end at H + 0.45 and the drawn roofs start there.

import * as THREE from 'three';
import { Geo } from '../seafront.js';
import { Textures } from '../textures.js';

const BAY = 3.2, STO = 2.9; // facade texture tile: 3.2 m wide, 2.9 m high
const TINT = [1.22, 1.04, 0.9]; // same as the style tint in the data file

let MM = null;
function mats(K) {
  if (MM) return MM;
  const std = (o) => new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.8, ...o });
  const bm = K.m.brick, tintC = (k) => new THREE.Color(TINT[0] * k, TINT[1] * k, TINT[2] * k);
  const roof = (kind, col) => { const t = Textures.roofTexture(kind, 5); return std({ map: t.map, normalMap: t.normalMap, roughnessMap: t.roughnessMap, roughness: 1, color: col }); };
  MM = {
    brick: std({ map: bm.map, normalMap: bm.normalMap, roughness: 1, color: tintC(1) }),
    brickDk: std({ map: bm.map, normalMap: bm.normalMap, roughness: 1, color: tintC(0.82) }),
    stone: std({ color: 0xd8d1bd }), cream: std({ color: 0xe6dab4 }), white: std({ color: 0xf2f0ea, roughness: 0.55 }),
    navy: std({ color: 0x18244a, roughness: 0.5 }), blue: std({ color: 0x1d4fd1, roughness: 0.45, metalness: 0.15 }),
    royal: std({ color: 0x2a3ccf, roughness: 0.5 }), teal: std({ color: 0x2b9a98, roughness: 0.5 }),
    brown: std({ color: 0x33251d, roughness: 0.6 }), black: std({ color: 0x1a1b1e, roughness: 0.45, metalness: 0.3 }),
    glass: std({ color: 0x586c78, roughness: 0.1, metalness: 0.35 }), glassShop: std({ color: 0x8c9fa9, roughness: 0.15, metalness: 0.2 }),
    dark: std({ color: 0x242a2e, roughness: 0.9 }), green: std({ color: 0x1f3a2c, roughness: 0.7 }), grey: std({ color: 0xa9abad, roughness: 0.9 }),
    deck: std({ color: 0x55585b, roughness: 0.95 }), red: std({ color: 0xc4202b, roughness: 0.6 }),
    slate: roof('slate', 0xb4b6a6), slateDk: roof('slate', 0x9ea092), tile: roof('concrete_tile', 0xc9906f),
    lead: std({ color: 0x6d7378, roughness: 0.6, metalness: 0.2 }),
  };
  return MM;
}

function makeKit(K) {
  const geos = {}, M = mats(K);
  return {
    geo: (k) => geos[k] || (geos[k] = new Geo()),
    flush() { for (const k of Object.keys(geos)) { const m = geos[k].mesh(M[k]); if (m) { m.name = 'a06:' + k; K.extra.push(m); } } },
  };
}

// ---------------------------------------------------------------- frames
function mkFrame(K, ctx, kit, p0, p1) {
  let L = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), ux = (p1[0] - p0[0]) / L, uz = (p1[1] - p0[1]) / L;
  const mx = (p0[0] + p1[0]) / 2, mz = (p0[1] + p1[1]) / 2;
  let nx = uz, nz = -ux;
  if (ctx.pointInRing(mx + nx * 0.4, mz + nz * 0.4, ctx.ring)) { nx = -nx; nz = -nz; }
  if (ux * nz - uz * nx < 0) { const t = p0; p0 = p1; p1 = t; ux = -ux; uz = -uz; } // s runs to the viewer's right
  const g = K.g;
  const P = (s, d, y) => [p0[0] + ux * s + nx * d, g + y, p0[1] + uz * s + nz * d];
  const F = { P, L, ux, uz, nx, nz, e: { ux, uz, nx, nz }, p0 };
  F.box = (k, s, d, y, hs, hd, hy) => { const p = P(s, d, y); kit.geo(k).box(p[0], p[1], p[2], ux, uz, hs, hy, hd); };
  F.rect = (k, s0, s1, d, y0, y1, uv) => kit.geo(k).quad(P(s0, d, y0), P(s1, d, y0), P(s1, d, y1), P(s0, d, y1), uv);
  F.brick = (k, s0, s1, d, y0, y1) => F.rect(k, s0, s1, d, y0, y1, [[s0 / BAY, y0 / STO], [s1 / BAY, y0 / STO], [s1 / BAY, y1 / STO], [s0 / BAY, y1 / STO]]);
  F.tri = (k, a, b, c) => kit.geo(k).tri(P(...a), P(...b), P(...c));
  /** window: frame, glass, bars, sill, lintel. s centre, yc centre height. */
  F.win = (s, yc, w, h, o = {}) => {
    const fk = o.frame || 'white', ft = o.ft || 0.06, gl = o.glass || 'glass', d = o.d || 0.05;
    F.rect(gl, s - w / 2, s + w / 2, d, yc - h / 2, yc + h / 2);
    F.box(fk, s, d + 0.025, yc + h / 2 - ft / 2, w / 2, 0.04, ft / 2); F.box(fk, s, d + 0.025, yc - h / 2 + ft / 2, w / 2, 0.04, ft / 2);
    F.box(fk, s - w / 2 + ft / 2, d + 0.025, yc, ft / 2, 0.04, h / 2); F.box(fk, s + w / 2 - ft / 2, d + 0.025, yc, ft / 2, 0.04, h / 2);
    const nv = o.v ?? 2; for (let i = 1; i < nv; i++) F.box(fk, s - w / 2 + (w * i) / nv, d + 0.03, yc, ft / 3, 0.04, h / 2);
    for (const f of o.hbar ?? [0.5]) F.box(fk, s, d + 0.03, yc - h / 2 + h * f, w / 2, 0.04, ft / 3);
    if (o.sill !== false) F.box(o.sill || 'stone', s, d + 0.06, yc - h / 2 - 0.04, w / 2 + 0.08, 0.1, 0.035);
    if (o.lintel) F.box(o.lintel, s, d + 0.02, yc + h / 2 + 0.11, w / 2 + 0.1, 0.05, 0.1);
    if (o.surround) { const sw = o.surround; // cream surround board round the opening
      F.box('cream', s, d + 0.0, yc + h / 2 + sw / 2, w / 2 + sw, 0.035, sw / 2); F.box('cream', s, d + 0.0, yc - h / 2 - sw / 2, w / 2 + sw, 0.035, sw / 2);
      F.box('cream', s - w / 2 - sw / 2, d, yc, sw / 2, 0.035, h / 2); F.box('cream', s + w / 2 + sw / 2, d, yc, sw / 2, 0.035, h / 2); }
  };
  /** shopfront bay: dark back panel (hides any generated door), glazing with mullions, plinth. */
  F.shopWin = (s0, s1, y0, y1, o = {}) => {
    const fk = o.frame || 'white', ft = o.ft || 0.07, w = s1 - s0, n = Math.max(1, Math.round(w / (o.pane || 1.2)));
    F.rect(o.back || 'dark', s0, s1, 0.06, 0.02, y1 + 0.05);
    F.rect(o.glass || 'glassShop', s0, s1, 0.075, y0, y1);
    for (let i = 0; i <= n; i++) F.box(fk, s0 + (w * i) / n, 0.1, (y0 + y1) / 2, ft / 2, 0.05, (y1 - y0) / 2 + ft / 2);
    F.box(fk, (s0 + s1) / 2, 0.1, y1, w / 2, 0.05, ft / 2); F.box(fk, (s0 + s1) / 2, 0.1, y0, w / 2, 0.05, ft / 2);
    if (o.transom) F.box(fk, (s0 + s1) / 2, 0.1, o.transom, w / 2, 0.04, ft / 3);
    if (o.bulk === 'brick') F.brick('brick', s0, s1, 0.09, 0.02, y0 - 0.02); else if (o.bulk) F.rect(o.bulk, s0, s1, 0.09, 0.02, y0 - 0.02);
  };
  /** painted sign board with lettering, as a separate textured mesh. spec: { bg, items: [{ t, x, y, size, color, weight, italic, font, align }] } */
  F.sign = (spec, s0, s1, d, y0, y1, depth = 0.14) => {
    F.box(spec.edge || 'navy', (s0 + s1) / 2, d - depth / 2, (y0 + y1) / 2, (s1 - s0) / 2, depth / 2, (y1 - y0) / 2);
    if (typeof document === 'undefined') return;
    const cw = 1024, ch = Math.max(64, Math.round(cw * (y1 - y0) / (s1 - s0)));
    const c = document.createElement('canvas'); c.width = cw; c.height = ch; const x = c.getContext('2d');
    x.fillStyle = spec.bg; x.fillRect(0, 0, cw, ch);
    for (const it of spec.items) {
      const px = Math.round(ch * it.size); x.font = `${it.italic ? 'italic ' : ''}${it.weight || 'bold'} ${px}px ${it.font || 'Georgia, "Times New Roman", serif'}`;
      x.fillStyle = it.color; x.textAlign = it.align || 'center'; x.textBaseline = 'middle'; x.fillText(it.t, it.x * cw, it.y * ch);
    }
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const q = kitQuad(P(s0, d + 0.005, y0), P(s1, d + 0.005, y0), P(s1, d + 0.005, y1), P(s0, d + 0.005, y1));
    const mesh = new THREE.Mesh(q, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    mesh.name = 'a06:sign'; K.extra.push(mesh);
  };
  /** canted oriel / bay window projecting from the wall: s centre, width w of the front face, sides angled out 0.45. */
  F.bay = (s, w, y0, y1, o = {}) => {
    const dp = o.depth || 0.55, a = o.splay ?? 0.45, fk = o.frame || 'white', g = kit.geo(o.body || 'white');
    const pts = [[s - w / 2 - a, 0.04], [s - w / 2, dp], [s + w / 2, dp], [s + w / 2 + a, 0.04]];
    const yb = y0 + (o.stall ?? 0.45), yt = y1 - 0.12;
    for (let i = 0; i < 3; i++) { // faces: stall panel, glass, mullions
      const [sa, da] = pts[i], [sb, db] = pts[i + 1], q = (ss, dd, y) => P(ss, dd, y);
      g.quad(q(sa, da, y0), q(sb, db, y0), q(sb, db, yb), q(sa, da, yb));
      kit.geo('glass').quad(q(sa, da + 0.01, yb), q(sb, db + 0.01, yb), q(sb, db + 0.01, yt), q(sa, da + 0.01, yt));
      const nm = i === 1 ? Math.max(1, Math.round(w / 0.9)) : 1;
      for (let k = 0; k <= nm; k++) { const t = k / nm, ss = sa + (sb - sa) * t, dd = da + (db - da) * t; const p = q(ss, dd + 0.02, (yb + yt) / 2); kit.geo(fk).box(p[0], p[1], p[2], ux, uz, 0.025, (yt - yb) / 2, 0.025); }
      const hb = o.hbar ?? 0.62; { const sm = (sa + sb) / 2, dm = (da + db) / 2, p = q(sm, dm + 0.02, yb + (yt - yb) * hb); const ln = Math.hypot(sb - sa, db - da); const ang = Math.atan2(db - da, sb - sa); kit.geo(fk).box(p[0], p[1], p[2], ux * Math.cos(ang) + nx * Math.sin(ang), uz * Math.cos(ang) + nz * Math.sin(ang), ln / 2, 0.022, 0.025); }
    }
    // bowl underside narrowing to a point under the bay, and the flat top slab
    const cs = s, cd = dp * 0.5;
    if (o.bowl !== false) for (let i = 0; i < 3; i++) { const [sa, da] = pts[i], [sb, db] = pts[i + 1]; g.quad(P(sa, da, y0), P(sb, db, y0), P(cs + (sb - cs) * 0.3, cd + (db - cd) * 0.3, y0 - 0.5), P(cs + (sa - cs) * 0.3, cd + (da - cd) * 0.3, y0 - 0.5)); }
    for (let i = 0; i < 3; i++) { const [sa, da] = pts[i], [sb, db] = pts[i + 1]; g.quad(P(sa, da, y1 - 0.12), P(sb, db, y1 - 0.12), P(sb, db, y1), P(sa, da, y1)); }
    g.quad(P(...pts[0], y1), P(...pts[1], y1), P(...pts[2], y1), P(...pts[3], y1));
    if (o.roof) { const rr = kit.geo(o.roof), hgt = o.rise ?? 0.5, r0 = [pts[0][0] + 0.1, 0.04], r1 = [pts[3][0] - 0.1, 0.04]; // slate pent over the bay
      const up = (p, h) => P(p[0], p[1], h); const e = 0.08;
      rr.quad(up([pts[1][0] - e, pts[1][1] + e], y1), up([pts[2][0] + e, pts[2][1] + e], y1), up(r1, y1 + hgt), up(r0, y1 + hgt));
      rr.tri(up([pts[0][0] - e, pts[0][1]], y1), up([pts[1][0] - e, pts[1][1] + e], y1), up(r0, y1 + hgt));
      rr.tri(up([pts[3][0] + e, pts[3][1]], y1), up([pts[2][0] + e, pts[2][1] + e], y1), up(r1, y1 + hgt));
    }
  };
  return F;
}
function kitQuad(a, b, c, d) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c, ...d], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
  g.setIndex([0, 1, 2, 0, 2, 3]); g.computeVertexNormals(); return g;
}

// ---------------------------------------------------------------- roof helpers (world x,z points; y absolute from ground K.g)
function offsetPoly(pts, dist) { // convex polygon offset: positive = outward
  const n = pts.length; let cx = 0, cz = 0; for (const p of pts) { cx += p[0]; cz += p[1]; } cx /= n; cz /= n;
  const lines = pts.map((p, i) => {
    const q = pts[(i + 1) % n], dx = q[0] - p[0], dz = q[1] - p[1], L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L; let nx = uz, nz = -ux;
    const mx = (p[0] + q[0]) / 2, mz = (p[1] + q[1]) / 2; if ((cx - mx) * nx + (cz - mz) * nz > 0) { nx = -nx; nz = -nz; }
    return { px: p[0] + nx * dist, pz: p[1] + nz * dist, ux, uz };
  });
  return pts.map((_, i) => {
    const a = lines[(i + n - 1) % n], b = lines[i], det = -a.ux * b.uz + b.ux * a.uz, rx = b.px - a.px, rz = b.pz - a.pz;
    const t = (rx * -b.uz + b.ux * rz) / det; return [a.px + a.ux * t, a.pz + a.uz * t];
  });
}
/** Hipped roof over a convex polygon: wall line at y0, eaves overhang o (dropping with the slope), inset d to the ridge/plateau. */
function hip(kit, K, key, pts, y0, slope, o, d, fascia = 'brown') {
  const out = offsetPoly(pts, o), inn = offsetPoly(pts, -d), n = pts.length, g = kit.geo(key), f = kit.geo(fascia), gy = K.g;
  const yE = gy + y0 - slope * o, yR = gy + y0 + slope * d, V = (p, y) => [p[0], y, p[1]], uv = (p) => [p[0] / 2, p[1] / 2];
  for (let i = 0; i < n; i++) {
    const a = out[i], b = out[(i + 1) % n], c = inn[(i + 1) % n], e = inn[i];
    g.quad(V(a, yE), V(b, yE), V(c, yR), V(e, yR), [uv(a), uv(b), uv(c), uv(e)]);
    f.quad(V(a, yE - 0.2), V(b, yE - 0.2), V(b, yE + 0.04), V(a, yE + 0.04));
  }
  for (let i = 1; i < n - 1; i++) g.quad(V(inn[0], yR), V(inn[i], yR), V(inn[i + 1], yR), V(inn[i + 1], yR), [uv(inn[0]), uv(inn[i]), uv(inn[i + 1]), uv(inn[i + 1])]);
}
/** Gabled roof: centre (cx,cz), ridge direction (ux,uz), half length hl, half width hw, eaves wall line y0; ol overhang at the gable ends. */
function gable(kit, K, key, cx, cz, ux, uz, hl, hw, y0, slope, o, ol, bargeKey = 'brown') {
  const vx = -uz, vz = ux, g = kit.geo(key), gy = K.g, yR = gy + y0 + slope * hw, yE = gy + y0 - slope * o;
  const R = (t) => [cx + ux * (hl + ol) * t, yR, cz + uz * (hl + ol) * t];
  const E = (t, sd) => [cx + ux * (hl + ol) * t + vx * (hw + o) * sd, yE, cz + uz * (hl + ol) * t + vz * (hw + o) * sd];
  const uv = (p) => [p[0] / 2, p[2] / 2];
  for (const sd of [-1, 1]) g.quad(E(-1, sd), E(1, sd), R(1), R(-1), [uv(E(-1, sd)), uv(E(1, sd)), uv(R(1)), uv(R(-1))]);
  const b = kit.geo(bargeKey); // bargeboards on both rakes of both ends
  for (const t of [-1, 1]) for (const sd of [-1, 1]) { const e = E(t, sd), r = R(t); b.quad(e, r, [r[0], r[1] - 0.26, r[2]], [e[0], e[1] - 0.26, e[2]]); }
}
/** Straight-walled prism (roof-top storey) over a convex ring of world points, brick-textured, with a flat top. */
function prism(kit, K, key, ring, y0, y1, topKey = 'deck', yTop = y1) {
  const g = kit.geo(key), gy = K.g, n = ring.length;
  for (let i = 0; i < n; i++) {
    const a = ring[i], b = ring[(i + 1) % n], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    g.quad([a[0], gy + y0, a[1]], [b[0], gy + y0, b[1]], [b[0], gy + y1, b[1]], [a[0], gy + y1, a[1]], [[0, y0 / STO], [L / BAY, y0 / STO], [L / BAY, y1 / STO], [0, y1 / STO]]);
  }
  if (!topKey) return;
  const t = kit.geo(topKey); for (let i = 1; i < n - 1; i++) t.quad([ring[0][0], gy + yTop, ring[0][1]], [ring[i][0], gy + yTop, ring[i][1]], [ring[i + 1][0], gy + yTop, ring[i + 1][1]], [ring[i + 1][0], gy + yTop, ring[i + 1][1]]);
}
/** Brick-textured triangle in a vertical plane (points [x,y,z], y absolute); u runs along (dx,dz). */
function brickTri(kit, key, a, b, c, dx, dz) {
  const uv = (p) => [(p[0] * dx + p[2] * dz) / BAY, p[1] / STO];
  kit.geo(key).quad(a, b, c, c, [uv(a), uv(b), uv(c), uv(c)]);
}
function chimney(kit, K, x, z, ux, uz, yBase, yTop) {
  const gy = K.g, g = kit.geo('brick'); g.box(x, gy + (yBase + yTop) / 2, z, ux, uz, 0.38, (yTop - yBase) / 2, 0.3);
  kit.geo('stone').box(x, gy + yTop + 0.04, z, ux, uz, 0.45, 0.05, 0.37);
  for (const o of [-0.17, 0.17]) kit.geo('tile').box(x + ux * o, gy + yTop + 0.34, z + uz * o, ux, uz, 0.07, 0.24, 0.07);
}

// ================================================================ Nicholas Estates (732472257)
function nicholas(K, it, ctx) {
  const kit = makeKit(K), WT = 5.85 + 0.45; // wall top (with the 0.45 m parapet)
  const A = [126.3, -665.7], B = [127.6, -674.1], C = [136.1, -675.5], D = [136.7, -672.2], E = [135.4, -664.3];
  const FE = mkFrame(K, ctx, kit, E, D), FD = mkFrame(K, ctx, kit, D, C), FN = mkFrame(K, ctx, kit, C, B), FW = mkFrame(K, ctx, kit, B, A);
  const brown = { frame: 'brown', ft: 0.07, v: 2, hbar: [0.72], surround: 0 };
  // string course at first-floor level, round the visible walls
  for (const F of [FE, FD, FN]) F.box('brickDk', F.L / 2, 0.03, 3.45, F.L / 2, 0.035, 0.07);
  // ---- east wall (Hamilton Road), s from the south end: Velura bay under the gable, Nicholas window, then the door in the angled corner bay
  FE.shopWin(0.15, 0.85, 0.15, 2.7, { frame: 'black', pane: 0.7, back: 'dark', glass: 'glassShop' });   // narrow glazed door left of the Velura window
  FE.shopWin(1.0, 2.95, 0.7, 2.7, { frame: 'black', pane: 2.0, back: 'green', glass: 'green', bulk: 'brick' });        // Velura: dark green display
  for (const [s0, s1] of [[0.0, 3.05]]) { // cream surround round door + Velura window
    FE.box('cream', (s0 + s1) / 2, 0.04, 2.85, (s1 - s0) / 2, 0.035, 0.09); FE.box('cream', s0 + 0.04, 0.04, 1.45, 0.05, 0.035, 1.45); FE.box('cream', s1 - 0.04, 0.04, 1.45, 0.05, 0.035, 1.45);
  }
  FE.box('cream', 3.55 + 1.7, 0.045, 0.62, 1.78, 0.035, 0.05);
  FE.shopWin(3.55, 6.95, 0.7, 2.62, { frame: 'cream', pane: 0.85, ft: 0.06, glass: 'glassShop', bulk: 'brick' });
  FE.box('cream', 3.45, 0.045, 1.65, 0.07, 0.035, 1.0); FE.box('cream', 7.05, 0.045, 1.65, 0.07, 0.035, 1.0); FE.box('cream', 5.25, 0.045, 2.7, 1.8, 0.035, 0.07);
  FE.sign({ bg: '#18244a', items: [{ t: 'NICHOLAS', x: 0.2, y: 0.4, size: 0.4, color: '#f4f1ea' }, { t: 'ESTATES', x: 0.2, y: 0.78, size: 0.17, color: '#e8e2d2', weight: 'normal' }, { t: 'Sales & Lettings', x: 0.74, y: 0.34, size: 0.24, color: '#f4f1ea', weight: 'normal', font: 'Arial, sans-serif' }, { t: '01394 282828', x: 0.74, y: 0.74, size: 0.24, color: '#f4f1ea', weight: 'normal', font: 'Arial, sans-serif' }] }, 3.45, 7.05, 0.1, 2.95, 3.65);
  // first-floor windows: pair in the gable, two main, one over the corner bay
  FE.win(0.95, 4.75, 0.72, 1.3, { ...brown, sill: 'stone' }); FE.win(1.95, 4.75, 0.72, 1.3, { ...brown, sill: 'stone' });
  FE.win(4.4, 4.75, 1.15, 1.45, { ...brown, sill: 'stone' }); FE.win(6.0, 4.75, 1.15, 1.45, { ...brown, sill: 'stone' });
  // ---- door in the corner bay (angled): cream surround, black door, small navy sign above
  FD.shopWin(0.7, 2.2, 0.15, 2.7, { frame: 'black', pane: 0.75, back: 'dark', glass: 'glassShop' });
  FD.box('cream', 1.45, 0.045, 2.8, 0.88, 0.035, 0.07); FD.box('cream', 0.62, 0.045, 1.4, 0.07, 0.035, 1.4); FD.box('cream', 2.28, 0.045, 1.4, 0.07, 0.035, 1.4);
  FD.sign({ bg: '#18244a', items: [{ t: 'NICHOLAS', x: 0.5, y: 0.4, size: 0.42, color: '#f4f1ea' }, { t: 'ESTATES', x: 0.5, y: 0.8, size: 0.19, color: '#e8e2d2', weight: 'normal' }] }, 0.6, 2.35, 0.1, 3.05, 3.65);
  FD.win(1.5, 4.75, 0.7, 1.3, { ...brown, sill: 'stone' });
  // ---- north wall (St Andrew's Road): big window + navy fascia, small window, two first-floor windows
  FN.shopWin(1.5, 4.6, 0.7, 2.62, { frame: 'cream', pane: 0.8, ft: 0.06, glass: 'glassShop', bulk: 'brick' });
  FN.shopWin(5.1, 6.3, 0.7, 2.62, { frame: 'cream', pane: 0.8, ft: 0.06, glass: 'glassShop', bulk: 'brick' });
  for (const [s0, s1] of [[1.4, 4.7], [5.0, 6.4]]) { FN.box('cream', s0 - 0.0, 0.045, 1.65, 0.07, 0.035, 1.0); FN.box('cream', s1, 0.045, 1.65, 0.07, 0.035, 1.0); FN.box('cream', (s0 + s1) / 2, 0.045, 2.7, (s1 - s0) / 2 + 0.07, 0.035, 0.07); FN.box('cream', (s0 + s1) / 2, 0.045, 0.62, (s1 - s0) / 2, 0.035, 0.05); }
  FN.sign({ bg: '#18244a', items: [{ t: 'NICHOLAS', x: 0.2, y: 0.4, size: 0.4, color: '#f4f1ea' }, { t: 'ESTATES', x: 0.2, y: 0.78, size: 0.17, color: '#e8e2d2', weight: 'normal' }, { t: 'Sales & Lettings', x: 0.74, y: 0.34, size: 0.24, color: '#f4f1ea', weight: 'normal', font: 'Arial, sans-serif' }, { t: '01394 282828', x: 0.74, y: 0.74, size: 0.24, color: '#f4f1ea', weight: 'normal', font: 'Arial, sans-serif' }] }, 1.4, 4.7, 0.1, 2.95, 3.65);
  FN.win(2.4, 4.75, 1.1, 1.45, { ...brown, sill: 'stone' }); FN.win(6.6, 4.75, 1.1, 1.45, { ...brown, sill: 'stone' });
  FN.rect('dark', 7.55, 8.1, 0.045, 1.5, 1.85); FN.rect('white', 7.62, 8.05, 0.05, 1.54, 1.8); // St Andrew's Road street-name plate
  for (let i = 0; i < 3; i++) FW.win(2.2 + i * 2.2, 4.75, 1.0, 1.4, { ...brown, sill: 'stone' });
  // ---- roof: low hip (rise ~1.3 m), slate, dark brown fascia; cross gable over the south bay of the east wall; brick stack
  const quad = [[126.3, -665.7], [127.6, -674.1], [136.4, -675.5], [135.9, -664.3]];
  hip(kit, K, 'slate', quad, WT, 0.31, 0.5, 4.1);
  const gc = FE.P(1.45, -2.3, 0); // gable on the east wall, ridge running back (west) along the wall normal
  gable(kit, K, 'slate', gc[0], gc[2], -FE.nx, -FE.nz, 2.3, 1.45, WT, 0.62, 0.15, 0.12);
  { const hw = 1.45, ap = WT + 0.62 * hw; // brick gable triangle on the east wall plane
    brickTri(kit, 'brick', FE.P(1.45 - hw, 0.02, WT - 0.02), FE.P(1.45 + hw, 0.02, WT - 0.02), FE.P(1.45, 0.02, ap), FE.ux, FE.uz); }
  chimney(kit, K, 133.0, -666.9, 0.99, 0.15, WT + 0.5, WT + 2.9);
  kit.flush();
}

// ================================================================ the block north of St Andrew's Road (732472258)
function block(K, it, ctx) {
  const kit = makeKit(K), WT = 6.2 + 0.45;
  const P1 = [140.1, -689.5], P0 = [145.2, -717.3], P2 = [123.1, -688.2], P3 = [121.8, -697.2], P11 = [137.5, -718.5], P10 = [135.6, -708.4];
  const FEa = mkFrame(K, ctx, kit, P1, P0);   // Hamilton Road face, s from the south (St Andrew's Road) end, 28.3 m
  const FS = mkFrame(K, ctx, kit, P2, P1);    // St Andrew's Road face, s from the west end, 17.05 m
  const FWe = mkFrame(K, ctx, kit, P3, P2);   // west gable-end wall of the Fish range
  const FNo = mkFrame(K, ctx, kit, P11, P0);  // north end wall
  const xe = (z) => 140.1 - 0.1835 * (z + 689.5); // east face x at z

  // ---------- Hamilton Fish & Chips: blue-framed shopfront wrapping the corner, fascia on both faces
  const blue = { frame: 'blue', ft: 0.08, glass: 'glassShop', back: 'dark' };
  FS.shopWin(8.1, 14.6, 0.85, 2.85, { ...blue, pane: 1.3, bulk: 'white', transom: 2.45 });
  FS.shopWin(15.0, 16.35, 0.1, 2.85, { ...blue, pane: 0.68, transom: 2.45 }); // glazed corner door
  FS.box('brickDk', 16.75, 0.05, 1.5, 0.3, 0.06, 1.5);                         // corner pier
  FS.shopWin(4.4, 5.45, 0.9, 2.5, { ...blue, pane: 1.1, bulk: 'white' });
  FS.shopWin(6.5, 7.55, 0.9, 2.5, { ...blue, pane: 1.1, bulk: 'white' });
  FS.rect('white', 8.1, 14.6, 0.11, 0.05, 0.85);
  FS.sign({ bg: '#1d4fd1', edge: 'blue', items: [{ t: 'HAMILTON', x: 0.25, y: 0.5, size: 0.46, color: '#ffffff', font: 'Arial, sans-serif' }, { t: 'Fish & Chips', x: 0.76, y: 0.52, size: 0.3, color: '#ffffff', italic: true, font: 'Arial, sans-serif' }] }, 7.9, 16.9, 0.28, 2.95, 3.95, 0.24);
  FS.box('white', 12.4, 0.2, 4.0, 4.55, 0.22, 0.05);
  // west end door (white) and first-floor sash windows
  FS.shopWin(0.9, 1.9, 0.0, 2.2, { frame: 'white', pane: 1.0, back: 'white', glass: 'white' });
  for (const s of [1.5, 6.8, 12.3]) FS.win(s, 5.15, 1.0, 1.55, { frame: 'white', sill: 'stone', v: 2, hbar: [0.5], lintel: 'brickDk' });
  FS.win(9.5, 5.15, 1.0, 1.55, { frame: 'white', sill: 'stone', lintel: 'brickDk' });
  for (const s of [2.4, 6.4]) FWe.win(s, 5.15, 1.0, 1.55, { frame: 'white', sill: 'stone', lintel: 'brickDk' });
  // east face of the Fish unit (s 0..5.3)
  FEa.shopWin(0.55, 4.85, 0.85, 2.85, { ...blue, pane: 1.1, bulk: 'white', transom: 2.45 });
  FEa.box('brickDk', 5.1, 0.05, 1.5, 0.22, 0.06, 1.5);
  FEa.sign({ bg: '#1d4fd1', edge: 'blue', items: [{ t: 'HAMILTON', x: 0.25, y: 0.5, size: 0.46, color: '#ffffff', font: 'Arial, sans-serif' }, { t: 'Fish & Chips', x: 0.76, y: 0.52, size: 0.3, color: '#ffffff', italic: true, font: 'Arial, sans-serif' }] }, 0.3, 5.15, 0.28, 2.95, 3.95, 0.24);
  FEa.win(2.7, 5.15, 1.0, 1.55, { frame: 'white', sill: 'stone', lintel: 'brickDk' });
  // ---------- Spice Hut (s 5.4..9.8): dark glazed shopfront on a brick bulkhead, two first-floor sashes
  FEa.brick('brickDk', 5.4, 9.8, 0.04, 0.0, 0.95);
  FEa.shopWin(5.75, 9.45, 0.95, 2.85, { frame: 'black', ft: 0.06, pane: 1.8, glass: 'glass', back: 'dark' });
  FEa.sign({ bg: '#f6f2e8', edge: 'white', items: [{ t: 'Spice Hut', x: 0.4, y: 0.5, size: 0.62, color: '#c4202b', italic: true }] }, 5.2, 10.9, 0.2, 2.85, 3.7, 0.17);
  for (const s of [6.8, 8.9]) FEa.win(s, 5.15, 1.0, 1.55, { frame: 'white', sill: 'stone', lintel: 'brickDk' });
  // ---------- Armstrong & North (s 9.8..18.2): white pilasters, glazed shopfront with teal door, blue fascia, two oriel bays, 3rd storey
  const a0 = 9.8;
  FEa.rect('white', a0, 18.2, 0.045, 0.0, 3.25); // white painted ground floor behind the glazing
  FEa.box('black', a0 + 0.35, 0.09, 0.15, 0.4, 0.06, 0.15); FEa.box('black', 17.9, 0.09, 0.15, 0.4, 0.06, 0.15);
  FEa.shopWin(10.5, 12.1, 0.55, 2.85, { frame: 'white', pane: 1.6, back: 'dark' });
  FEa.shopWin(12.15, 13.15, 0.15, 2.85, { frame: 'teal', ft: 0.08, pane: 0.9, back: 'dark', glass: 'glassShop' });
  FEa.shopWin(13.25, 14.75, 0.55, 2.85, { frame: 'white', pane: 1.5, back: 'dark' });
  FEa.shopWin(14.85, 15.9, 0.55, 2.85, { frame: 'white', pane: 1.05, back: 'dark' });
  FEa.shopWin(16.75, 17.65, 0.15, 3.0, { frame: 'white', pane: 0.9, back: 'dark' });                  // door to the flats
  FEa.sign({ bg: '#2a3ccf', edge: 'royal', items: [{ t: 'Armstrong & North', x: 0.28, y: 0.34, size: 0.4, color: '#ffffff', weight: 'bold', font: 'Arial, sans-serif' }, { t: 'OPTICIANS AND HEARING CARE', x: 0.28, y: 0.75, size: 0.17, color: '#ffffff', weight: 'normal', font: 'Arial, sans-serif' }, { t: 'Tel: 01394 277630', x: 0.8, y: 0.34, size: 0.17, color: '#ffffff', weight: 'normal', font: 'Arial, sans-serif' }, { t: 'armstrongandnorth.com', x: 0.8, y: 0.72, size: 0.17, color: '#cfe86a', weight: 'bold', font: 'Arial, sans-serif' }] }, a0, 18.55, 0.22, 2.85, 3.75, 0.19);
  FEa.bay(11.9, 1.5, 4.05, 6.2, { roof: 'slateDk', rise: 0.55, stall: 0.5 });
  FEa.bay(15.6, 1.5, 4.05, 6.2, { roof: 'slateDk', rise: 0.55, stall: 0.5 });
  { // brick third storey above the Spice/Co-op eaves, with cornice, flat roof and two sash windows
    const zS = -699.5, zN = -707.5, ring = [[xe(zS), zS], [xe(zN), zN], [132.7, zN], [132.8, zS]];
    prism(kit, K, 'brick', ring, 6.2, 9.6, 'deck', 9.2);                 // brick parapet to 9.6, roof deck inside at 9.2
    prism(kit, K, 'stone', offsetPoly(ring, 0.1), 8.85, 9.15, null);    // projecting cornice band under the parapet
    for (const s of [12.0, 15.4]) FEa.win(s, 7.75, 1.0, 1.55, { frame: 'white', sill: 'stone', lintel: 'stone', v: 2, hbar: [0.5] });
    FEa.box('stone', 14.0, 0.04, 6.68, 4.2, 0.05, 0.05);                  // string course at the eaves line
    chimney(kit, K, 135.2, -704.0, 1, 0, 9.3, 11.0);
    chimney(kit, K, 138.0, -704.0, 1, 0, 9.3, 11.0);
  }
  // ---------- East of England Co-op Funeral Services (s 18.2..28.3): white fascia, white-framed ground floor, two big white bay windows
  FEa.rect('white', 18.2, 28.3, 0.045, 0.0, 3.3);
  FEa.shopWin(18.7, 20.3, 0.6, 2.85, { frame: 'white', pane: 1.6, back: 'dark' });
  FEa.shopWin(20.55, 22.55, 0.05, 2.9, { frame: 'white', pane: 1.0, back: 'dark', glass: 'glassShop' });
  FEa.shopWin(22.75, 24.05, 0.6, 2.85, { frame: 'white', pane: 1.3, back: 'dark' });
  FEa.shopWin(24.7, 28.2, 0.6, 2.85, { frame: 'white', pane: 1.75, back: 'dark' });
  FEa.box('brickDk', 24.4, 0.05, 1.5, 0.28, 0.06, 1.5);
  FEa.sign({ bg: '#f3f3f0', edge: 'white', items: [{ t: 'EAST OF ENGLAND', x: 0.12, y: 0.3, size: 0.2, color: '#2a3568', weight: 'bold', font: 'Arial, sans-serif', align: 'left' }, { t: 'CO-OP', x: 0.12, y: 0.68, size: 0.3, color: '#2a3568', weight: 'bold', font: 'Arial, sans-serif', align: 'left' }, { t: 'Funeral Services', x: 0.62, y: 0.5, size: 0.52, color: '#2a3568', weight: 'normal' }] }, 18.55, 28.3, 0.2, 2.85, 3.95, 0.17);
  FEa.bay(21.4, 2.4, 3.95, 6.1, { roof: null, stall: 0.15, bowl: false, splay: 0.5, depth: 0.5, hbar: 0.62 });
  FEa.bay(26.2, 2.4, 3.95, 6.1, { roof: null, stall: 0.15, bowl: false, splay: 0.5, depth: 0.5, hbar: 0.62 });
  FNo.win(3.6, 5.1, 1.0, 1.5, { frame: 'white', sill: 'stone' });

  // ---------- roofs (eaves at the parapet top WT): T-shaped slate roof over the Fish range, low hip over Spice Hut, brown-tiled hip over the Co-op
  hip(kit, K, 'slate', [[125.9, -688.3], [140.2, -689.5], [140.2, -697.3], [125.9, -697.3]], WT, 0.55, 0.5, 4.1);
  gable(kit, K, 'slate', 125.9, -692.8, 0, -1, 4.55, 3.55, WT, 0.65, 0.5, 0.2);
  { const gy = K.g, zz = -688.45, hw = 3.55, cx = 125.9, ap = WT + 0.65 * hw; // south-facing brick gable (the 'corner with gable')
    brickTri(kit, 'brick', [cx - hw, gy + WT - 0.02, zz], [cx + hw, gy + WT - 0.02, zz], [cx, gy + ap, zz], 1, 0);
    FS.win(2.9 + 0, WT + 0.9, 0.9, 1.1, { frame: 'white', sill: 'stone', lintel: 'brickDk' }); } // small gable window
  hip(kit, K, 'slate', [[xe(-695.0), -695.0], [xe(-699.5), -699.5], [132.8, -699.5], [132.8, -695.0]], WT, 0.4, 0.45, 2.0);
  hip(kit, K, 'tile', [[xe(-707.7), -707.7], [145.2, -717.3], [137.5, -718.5], [135.6, -708.4]], WT, 0.42, 0.55, 3.5, 'brown');
  chimney(kit, K, 136.6, -697.0, 1, 0, WT + 1.5, WT + 3.6);
  kit.flush();
}

export const FEATURES = { a06Nicholas: nicholas, a06Block: block };
