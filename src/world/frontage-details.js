// Street-side details for the photographed Undercliff Road West frontages (content/frontages.js):
// fretwork verandahs, balconies (white balustrade, glass, timber, cast iron), glazed verandahs and
// canopies, café verandah, slab balconies, roof and terrace rails, low brick walls and picket fences.
// Each is laid along the building edge that faces the road. Dimensions are estimates from the photos.

import * as THREE from 'three';
import { Geo } from './seafront.js';
import { Textures } from './textures.js';
import { ensureCCW, pointInRing } from '../geo/polygon.js';

let M = null;
function mats() {
  if (M) return M;
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const brick = Textures.facadeTexture('brick_red', false, 61, 0);
  M = {
    white: std({ color: 0xf4f2ec, roughness: 0.6 }), black: std({ color: 0x1c1d20, roughness: 0.45, metalness: 0.5 }),
    glass: std({ color: 0xa9c3cf, roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false }),
    blue: std({ color: 0x1d4f91, roughness: 0.45, metalness: 0.4 }), timber: std({ color: 0x6e4a2f, roughness: 0.8 }),
    steel: std({ color: 0xb8bcc0, roughness: 0.35, metalness: 0.7 }), deck: std({ color: 0xdedbd2, roughness: 0.9 }),
    brick: std({ map: brick.map, normalMap: brick.normalMap, roughness: 1 }), coping: std({ color: 0xcfcac0, roughness: 0.9 }),
    yellowWall: std({ color: 0xe9d46a, roughness: 0.8 }),
  };
  return M;
}

/** The footprint edge that faces the nearest road: endpoints, along/out unit vectors, length. */
export function streetEdge(b, nearestRoad) {
  const R = ensureCCW(b.outer); let best = null;
  for (let i = 0; i < R.length; i++) {
    const a = R[i], c = R[(i + 1) % R.length], L = Math.hypot(c[0] - a[0], c[1] - a[1]); if (L < 2.5) continue;
    const ux = (c[0] - a[0]) / L, uz = (c[1] - a[1]) / L, mx = (a[0] + c[0]) / 2, mz = (a[1] + c[1]) / 2;
    let nx = uz, nz = -ux; if (pointInRing(mx + nx * 0.3, mz + nz * 0.3, R)) { nx = -nx; nz = -nz; } // outward, whatever the ring's handedness
    const out = nearestRoad(mx + nx * 6, mz + nz * 6, 40, (r) => !r.footOnly), inn = nearestRoad(mx - nx * 6, mz - nz * 6, 40, (r) => !r.footOnly);
    if (!out || (inn && inn.d < out.d)) continue;
    const fd = nearestRoad(mx, mz, 60, (r) => !r.footOnly); const front = fd ? fd.d - fd.road.width / 2 - 2.3 : 6; // facade to the back of the pavement
    const score = out.d - L * 0.15; if (!best || score < best.score) best = { a, c, L, ux, uz, nx, nz, score, roadD: out.d, front };
  }
  return best;
}

/**
 * @param b building (with b.frontage from FRONTAGES)
 * @param ctx { nearestRoad, ground(x,z) }
 */
export function buildFrontageDetails(b, ctx) {
  const fr = b.frontage; if (!fr?.details?.length) return null;
  const e = streetEdge(b, ctx.nearestRoad); if (!e) return null;
  const m = mats(); const G = { white: new Geo(), black: new Geo(), glass: new Geo(), blue: new Geo(), timber: new Geo(), steel: new Geo(), deck: new Geo(), brick: new Geo(), coping: new Geo(), yellowWall: new Geo() };
  let g = Infinity; for (let t = 0; t <= 1; t += 0.25) g = Math.min(g, ctx.ground(e.a[0] + (e.c[0] - e.a[0]) * t, e.a[1] + (e.c[1] - e.a[1]) * t));
  const H = b.height, storey = Math.max(2.6, Math.min(3.2, H / Math.max(1, Math.round(H / 3)))), colliders = [];
  // local frame: s along the edge (0..L), d out from the facade, y above the ground at the edge
  const P = (s, d, y) => [e.a[0] + e.ux * s + e.nx * d, g + y, e.a[1] + e.uz * s + e.nz * d];
  const box = (k, s, d, y, hs, hd, hy) => { const p = P(s, d, y); G[k].box(p[0], p[1], p[2], e.ux, e.uz, hs, hy, hd); };
  const s0 = 0.25, s1 = e.L - 0.25, L = s1 - s0, sm = (s0 + s1) / 2;
  const posts = (d, y0, y1, k = 'white', w = 0.07, step = 2.4) => { const n = Math.max(1, Math.round(L / step)); for (let i = 0; i <= n; i++) box(k, s0 + (L * i) / n, d, (y0 + y1) / 2, w, w, (y1 - y0) / 2); return n; };
  const balustrade = (d, y, k = 'white', slat = 0.16) => { box(k, sm, d, y + 0.98, L / 2, 0.05, 0.03); box(k, sm, d, y + 0.08, L / 2, 0.04, 0.03); for (let s = s0 + 0.08; s < s1; s += slat) box(k, s, d, y + 0.53, 0.018, 0.018, 0.42); };
  const sideRails = (d, y, k = 'white') => { for (const s of [s0, s1]) { const q = P(s, d / 2, y + 0.53); G[k].box(q[0], q[1], q[2], e.nx, e.nz, d / 2, 0.45, 0.02); } };
  const valance = (d, y, k = 'white') => { // scalloped fretwork board hanging under a deck or roof edge
    box(k, sm, d, y - 0.08, L / 2, 0.02, 0.08);
    for (let s = s0 + 0.15; s < s1 - 0.1; s += 0.3) { const p = P(s, d, y - 0.2); G[k].tri([p[0] - e.ux * 0.15, p[1] + 0.04, p[2] - e.uz * 0.15], [p[0] + e.ux * 0.15, p[1] + 0.04, p[2] + e.uz * 0.15], [p[0], p[1] - 0.09, p[2]]); }
  };
  const deck = (d, y) => box('deck', sm, d / 2, y, L / 2, d / 2, 0.08);
  const lim = Math.max(1.0, e.front - 0.2); // never out over the pavement or road
  const D = (d) => Math.min(d, lim);
  for (const it of fr.details) {
    if (it.t === 'verandah2') { // two tiers of white fretwork verandahs (raised ground floor + first floor)
      const d = D(1.7), y0 = 0.9, y1 = y0 + storey, top = y1 + storey - 0.2;
      deck(d, y0); deck(d, y1); posts(d, 0, top);
      balustrade(d, y0); balustrade(d, y1); sideRails(d, y0); sideRails(d, y1);
      valance(d, y1 - 0.1); valance(d, top); box('white', sm, d / 2, top + 0.05, L / 2, d / 2 + 0.1, 0.05);
      for (let k = 0; k < 6; k++) box('white', s0 + 0.5, d + 0.3 + k * 0.28, y0 - 0.12 - k * 0.15, 0.55, 0.14, 0.04); // front steps
    } else if (it.t === 'whiteBalcony' || it.t === 'glassBalcony' || it.t === 'timberBalcony' || it.t === 'ironBalcony') {
      const y = it.level >= 1 ? 0.15 + storey * it.level : it.level || 0.35, d = D(it.deep || (it.level >= 1 ? 1.2 : 1.8));
      deck(d, y);
      if (it.t === 'whiteBalcony') { balustrade(d, y); sideRails(d, y); if (it.valance) valance(d, y + storey - 0.2); }
      else if (it.t === 'timberBalcony') { balustrade(d, y, 'timber', 0.12); box('timber', sm, d, y + 1.0, L / 2, 0.06, 0.04); }
      else if (it.t === 'glassBalcony') { const q0 = P(s0, d, y + 0.12), q1 = P(s1, d, y + 0.12), q2 = P(s1, d, y + 1.05), q3 = P(s0, d, y + 1.05); G.glass.quad(q0, q1, q2, q3); box('steel', sm, d, y + 1.06, L / 2, 0.025, 0.025); posts(d, y, y + 1.05, 'steel', 0.025, 1.6); }
      else { // cast iron: black bars, top rail and scroll brackets under the deck
        box('black', sm, d, y + 1.0, L / 2, 0.035, 0.025); for (let s = s0; s < s1; s += 0.12) box('black', s, d, y + 0.52, 0.012, 0.012, 0.46);
        const n = Math.max(1, Math.round(L / 2.4)); for (let i = 0; i <= n; i++) { const s = s0 + (L * i) / n; box('black', s, d, y / 2, 0.06, 0.06, y / 2); for (let k = 1; k <= 4; k++) box('black', s, d * (k / 5), y - 0.12 - k * 0.12, 0.02, d / 10, 0.02); }
      }
    } else if (it.t === 'glazedVerandah') { // glass lean-to on slim posts with a scalloped white valance
      const d = D(1.9), yb = 2.8, yt = 3.25;
      posts(d, 0, yb, 'black', 0.04, 2.0);
      const q0 = P(s0, 0, yt), q1 = P(s1, 0, yt), q2 = P(s1, d, yb), q3 = P(s0, d, yb); G.glass.quad(q0, q1, q2, q3);
      for (let s = s0; s <= s1 + 1e-6; s += Math.max(0.8, L / Math.round(L / 0.9))) { const a = P(s, 0, yt), c = P(s, d, yb); const mx = (a[0] + c[0]) / 2, my = (a[1] + c[1]) / 2, mz = (a[2] + c[2]) / 2; G.white.box(mx, my, mz, e.nx, e.nz, d / 2, 0.025, 0.025); }
      valance(d, yb);
    } else if (it.t === 'blueCanopy') { // brasserie: blue steel glazed canopy on blue columns over the terrace
      const d = D(4.2), yb = 3.1, yt = 3.55;
      const n = Math.max(1, Math.round(L / 3.6)); for (let i = 0; i <= n; i++) { const s = s0 + (L * i) / n; box('blue', s, d, yb / 2, 0.11, 0.11, yb / 2); const p = P(s, d, 0); colliders.push({ type: 'circle', x: p[0], z: p[2], r: 0.15, y0: g - 0.5, top: g + yb, kind: 'post' }); }
      box('blue', sm, d, yb, L / 2, 0.09, 0.09);
      const q0 = P(s0, 0, yt), q1 = P(s1, 0, yt), q2 = P(s1, d + 0.2, yb), q3 = P(s0, d + 0.2, yb); G.glass.quad(q0, q1, q2, q3);
      for (let s = s0; s <= s1 + 1e-6; s += L / Math.max(1, Math.round(L / 0.9))) { const a = P(s, 0, yt), c = P(s, d + 0.2, yb); G.blue.box((a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2, e.nx, e.nz, (d + 0.2) / 2, 0.03, 0.03); }
    } else if (it.t === 'upperGlazing') { // big blue-framed first-floor glazing in the middle of the facade, grey cladding above
      const w = L * 0.55, y0 = storey + 0.25, y1 = H - 1.4;
      const q0 = P(sm - w / 2, 0.06, y0), q1 = P(sm + w / 2, 0.06, y0), q2 = P(sm + w / 2, 0.06, y1), q3 = P(sm - w / 2, 0.06, y1);
      G.glass.quad(q0, q1, q2, q3); for (let k = 0; k <= 4; k++) box('blue', sm - w / 2 + (w * k) / 4, 0.08, (y0 + y1) / 2, 0.05, 0.05, (y1 - y0) / 2);
      box('blue', sm, 0.08, y0, w / 2, 0.06, 0.06); box('blue', sm, 0.08, y1, w / 2, 0.06, 0.06);
      box('steel', sm, 0.1, (y1 + H) / 2, w / 2 + 0.1, 0.08, (H - y1) / 2);
    } else if (it.t === 'cafeVerandah') { // café: glazed verandah on a low brick wall with black rail panels
      const d = D(3.6), yb = 2.55, yt = 2.95;
      box('brick', sm, d, 0.3, L / 2, 0.15, 0.3); box('coping', sm, d, 0.63, L / 2 + 0.03, 0.18, 0.03);
      posts(d, 0.6, yb, 'white', 0.06, 2.2); box('white', sm, d, yb, L / 2, 0.08, 0.08);
      for (let s = s0; s < s1; s += 0.14) box('black', s, d, 0.66 + 0.45, 0.012, 0.012, 0.45); box('black', sm, d, 1.56, L / 2, 0.03, 0.02);
      const q0 = P(s0, 0, yt), q1 = P(s1, 0, yt), q2 = P(s1, d, yb), q3 = P(s0, d, yb); G.glass.quad(q0, q1, q2, q3);
      for (const s of [s0, s1]) { const q = P(s, d / 2, 0.6 + (yb - 0.6) / 2); G.glass.quad(P(s, 0, 0.62), P(s, d, 0.62), P(s, d, yb), P(s, 0, yt)); void q; }
      const a = P(s0, d, 0), c = P(s1, d, 0); colliders.push({ type: 'segment', a: [a[0], a[2]], b: [c[0], c[2]], r: 0.15, y0: g - 0.5, top: g + 0.7, kind: 'wall' });
    } else if (it.t === 'slabBalconies') { // 1960s flats: projecting slab balconies with glass rails on every floor
      for (const lv of it.levels || [1, 2]) { const y = storey * lv; box('white', sm, 0.75, y, L / 2 + 0.2, 0.75, 0.1); const q0 = P(s0, 1.45, y + 0.1), q1 = P(s1, 1.45, y + 0.1), q2 = P(s1, 1.45, y + 1.05), q3 = P(s0, 1.45, y + 1.05); G.glass.quad(q0, q1, q2, q3); box('steel', sm, 1.45, y + 1.06, L / 2, 0.03, 0.025); }
      posts(1.45, 0, storey * Math.max(...(it.levels || [1, 2])) + 1.05, 'white', 0.08, 3.2);
    } else if (it.t === 'roofRail') { // railing round a roof terrace
      const k = it.black ? 'black' : 'steel', y = H;
      box(k, sm, -0.1, y + 1.0, L / 2, 0.03, 0.025); for (let s = s0; s < s1; s += it.black ? 0.14 : 1.4) box(k, s, -0.1, y + 0.5, it.black ? 0.012 : 0.025, 0.012, 0.5);
      if (!it.black) G.glass.quad(P(s0, -0.1, y + 0.05), P(s1, -0.1, y + 0.05), P(s1, -0.1, y + 0.98), P(s0, -0.1, y + 0.98));
    } else if (it.t === 'terraceRail') { // steel rail round a ground-floor terrace
      const d = D(3.2); posts(d, 0, 1.0, 'steel', 0.025, 1.8); box('steel', sm, d, 1.0, L / 2, 0.025, 0.025); box('steel', sm, d, 0.5, L / 2, 0.015, 0.015);
    } else if (it.t === 'lowBrickWall' || it.t === 'whiteFence') { // front boundary at the back of the pavement
      const d = Math.max(1.2, Math.min(e.front - 0.15, 6));
      if (it.t === 'lowBrickWall') { box('brick', sm, d, 0.38, L / 2 + 0.25, 0.12, 0.38); box('coping', sm, d, 0.79, L / 2 + 0.28, 0.15, 0.03); }
      else { box('white', sm, d, 0.55, L / 2 + 0.25, 0.03, 0.03); box('white', sm, d, 0.25, L / 2 + 0.25, 0.03, 0.03); for (let s = s0 - 0.25; s < s1 + 0.25; s += 0.13) box('white', s, d + 0.04, 0.45, 0.03, 0.012, 0.45); }
      const a = P(s0 - 0.25, d, 0), c = P(s1 + 0.25, d, 0); colliders.push({ type: 'segment', a: [a[0], a[2]], b: [c[0], c[2]], r: 0.12, y0: g - 0.5, top: g + 0.9, kind: 'wall' });
    }
  }
  const meshes = []; for (const [k, geo] of Object.entries(G)) { const me = geo.mesh(m[k]); if (me) { me.name = 'frontage:' + k; meshes.push(me); } }
  const group = new THREE.Group(); group.name = 'frontage:' + b.id; for (const me of meshes) group.add(me);
  return { group, colliders };
}
