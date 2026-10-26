// Street-side details for the photographed Undercliff Road West frontages (content/frontages.js):
// fretwork verandahs, balconies (white balustrade, glass, timber, cast iron), glazed verandahs and
// canopies, café verandah, slab balconies, roof and terrace rails, low brick walls and picket fences.
// Each is laid along the building edge that faces the road. Dimensions are estimates from the photos.

import * as THREE from 'three';
import { Geo } from './seafront.js';
import { Textures } from './textures.js';
import { ensureCCW, pointInRing } from '../geo/polygon.js';
import { cinemaFront, cinemaSide, sideFrame, dormers, chimneys } from './frontage-features.js';
import { FEATURES } from './features/index.js';

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
    pane: std({ color: 0x5f7480, roughness: 0.12, metalness: 0.35, side: THREE.DoubleSide }), // opaque window glass (bays are not hollow)
    tile: std({ color: 0x8a5a44, roughness: 0.85, side: THREE.DoubleSide }), cream: std({ color: 0xe8dcb8, roughness: 0.8, side: THREE.DoubleSide }),
    gw: std({ color: 0xe8e5dc, roughness: 0.75, side: THREE.DoubleSide }), red: std({ color: 0x9c1426, roughness: 0.45, side: THREE.DoubleSide }),
    slate: std({ color: 0x45484e, roughness: 0.8, side: THREE.DoubleSide }),
    panel: std({ color: 0xf2f0ea, roughness: 0.7, side: THREE.DoubleSide }), resin: std({ color: 0xb48f72, roughness: 0.95, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
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
    const street = (r) => r.car && r.kind !== 'service' && r.kind !== 'track'; // the street, not a car park aisle or lane behind
    const out = nearestRoad(mx + nx * 6, mz + nz * 6, 40, street), inn = nearestRoad(mx - nx * 6, mz - nz * 6, 40, street);
    if (!out || (inn && inn.d < out.d)) continue;
    const fd = nearestRoad(mx, mz, 60, street); const front = fd ? fd.d - fd.road.width / 2 - 2.3 : 6; // facade to the back of the pavement
    const score = out.d - L * 0.4; // prefer the long wall facing the street
    if (!best || score < best.score) best = { a, c, L, ux, uz, nx, nz, score, roadD: out.d, front };
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
  const m = mats(); const G = { gw: new Geo(), red: new Geo(), slate: new Geo(), white: new Geo(), black: new Geo(), glass: new Geo(), blue: new Geo(), timber: new Geo(), steel: new Geo(), deck: new Geo(), brick: new Geo(), coping: new Geo(), yellowWall: new Geo(), pane: new Geo(), tile: new Geo(), cream: new Geo(), panel: new Geo(), resin: new Geo() };
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
  const extra = [], K = { P, box, G, L, s0, s1, sm, H, D: null, e, colliders, g, extra, m };
  const lim = Math.max(1.0, e.front - 0.2); // never out over the pavement or road
  const D = (d) => Math.min(d, lim); K.D = D;
  for (let it of fr.details) {
    if (FEATURES[it.t]) { try { FEATURES[it.t](K, it, { b, ring: ensureCCW(b.outer), pointInRing, sideFrame: (o) => sideFrame(b, o || it, K, ensureCCW(b.outer), pointInRing) }); } catch (err) { console.warn('frontage feature failed', it.t, b.id, err); } continue; }
    if (it.t === 'cinemaFront') cinemaFront(K); else if (it.t === 'dormers') dormers(K, it); else if (it.t === 'chimneys') chimneys(K, it); else if (it.t === 'cinemaSide') cinemaSide(sideFrame(b, it, K, ensureCCW(b.outer), pointInRing));
    else if (it.t === 'verandah2') { // two tiers of white fretwork verandahs (raised ground floor + first floor)
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
    } else if (it.t === 'whiteWall') { // rendered white boundary wall (~1.15 m) with an iron gate between piers
      // photo: the wall runs past the facade across the whole plot; the gate is at one end (it.gate 'start'|'end')
      const d = Math.max(1.2, Math.min(e.front - 0.15, 6)), gap = 1.1, ext = it.extend ?? 0, H = 0.58;
      if (it.gateToward) { const A = P(s0, d, 0), B = P(s1, d, 0), [tx, tz] = it.gateToward; it = { ...it, gate: Math.hypot(A[0] - tx, A[2] - tz) < Math.hypot(B[0] - tx, B[2] - tz) ? 'start' : 'end' }; }
      const w0 = s0 - 0.25 - (it.gate === 'start' ? 0 : ext), w1 = s1 + 0.25 + (it.gate === 'end' ? 0 : ext);
      const gc = it.gate === 'start' ? w0 + 1.6 : it.gate === 'end' ? w1 - 1.6 : sm;
      for (const [a0, a1] of [[w0, gc - gap / 2], [gc + gap / 2, w1]]) { if (a1 - a0 < 0.2) continue; const mid = (a0 + a1) / 2, h = (a1 - a0) / 2; box('white', mid, d, H, h, 0.15, H); const a = P(a0, d, 0), c = P(a1, d, 0); colliders.push({ type: 'segment', a: [a[0], a[2]], b: [c[0], c[2]], r: 0.15, y0: g - 0.5, top: g + 1.2, kind: 'wall' }); }
      for (const sg of [-1, 1]) box('white', gc + sg * (gap / 2 + 0.17), d, 0.68, 0.17, 0.2, 0.68); // gate piers
      for (let k = 0; k <= 8; k++) box('black', gc - gap / 2 + 0.05 + k * (gap - 0.1) / 8, d, 0.5, 0.012, 0.012, 0.5); // railings
      box('black', gc, d, 0.98, gap / 2, 0.02, 0.02); box('black', gc, d, 0.12, gap / 2, 0.02, 0.02);
    } else if (it.t === 'bays') { // two-storey canted bay windows (1930s semis): brick plinth, glazing, a panel between floors, tiled cap
      const w = it.width || 2.4, dd = D(it.deep || 0.75), side = 0.45;
      for (const f of it.at) {
        const sc = s0 + L * f, west = P(sc, 0, 0)[0] < P(sc + 1, 0, 0)[0] ? e.ux > 0 : e.ux < 0;
        const C = [[sc - w / 2 - side, 0.02], [sc - w / 2, dd], [sc + w / 2, dd], [sc + w / 2 + side, 0.02]];
        const pnl = (P(sc, 0, 0)[0] < (P(s0, 0, 0)[0] + P(s1, 0, 0)[0]) / 2 ? it.panelWest : it.panelEast) || 'panel';
        for (let k = 0; k < 3; k++) {
          const [sa, da] = C[k], [sb, db] = C[k + 1];
          const band = (mat, y0, y1) => G[mat].quad(P(sa, da, y0), P(sb, db, y0), P(sb, db, y1), P(sa, da, y1));
          band('brick', 0, 0.42); band('pane', 0.42, 2.3); band(pnl, 2.3, 3.0); band('pane', 3.0, 4.85); band('white', 4.85, 5.1);
          for (const y of [0.42, 1.85, 2.3, 3.0, 4.45]) { const pa = P(sa, da + 0.02, y), pb = P(sb, db + 0.02, y); G.white.quad(pa, pb, [pb[0], pb[1] + 0.06, pb[2]], [pa[0], pa[1] + 0.06, pa[2]]); } // sills, transoms
        }
        for (const [cs, cd] of C) box('white', cs, cd + 0.02, 2.63, 0.05, 0.05, 2.22); // corner posts
        for (const q of [1 / 3, 2 / 3]) for (const [y0, y1] of [[0.42, 2.3], [3.0, 4.85]]) box('white', sc - w / 2 + w * q, dd + 0.03, (y0 + y1) / 2, 0.035, 0.03, (y1 - y0) / 2); // mullions
        const cap = (y, i0, i1) => P(C[i0][0], C[i0][1] + (i0 === 1 || i0 === 2 ? 0.08 : 0), y);
        G.tile.quad(cap(5.1, 0), cap(5.1, 1), cap(5.1, 2), cap(5.1, 3)); // flat-ish tiled cap
        G.tile.quad(P(C[0][0], 0.02, 5.1), P(C[1][0], dd + 0.08, 5.1), P(C[1][0] + 0.3, 0.02, 5.55), P(C[0][0], 0.02, 5.55));
        G.tile.quad(P(C[1][0], dd + 0.08, 5.1), P(C[2][0], dd + 0.08, 5.1), P(C[2][0] - 0.3, 0.02, 5.55), P(C[1][0] + 0.3, 0.02, 5.55));
        G.tile.quad(P(C[2][0], dd + 0.08, 5.1), P(C[3][0], 0.02, 5.1), P(C[3][0], 0.02, 5.55), P(C[2][0] - 0.3, 0.02, 5.55));
        void west;
      }
    } else if (it.t === 'porches') { // small tiled lean-to canopies over the front doors, on white brackets
      const d = D(it.deep || 0.95), w = it.width || 2.1;
      for (const f of it.at) {
        const sc = s0 + L * f;
        G.tile.quad(P(sc - w / 2, 0.02, 2.95), P(sc + w / 2, 0.02, 2.95), P(sc + w / 2, d, 2.6), P(sc - w / 2, d, 2.6));
        box('white', sc, d, 2.55, w / 2, 0.03, 0.08);
        for (const sg of [-1, 1]) box('black', sc + sg * (w / 2 - 0.15), d / 2, 2.5, 0.03, d / 2, 0.03);
        box('black', sc, 0.03, 1.08, 0.48, 0.03, 1.05); // door
      }
    } else if (it.t === 'resinDrive') { // resin-bound driveway across the front garden
      const d = Math.max(1.5, e.front - 0.1), q = (ss, dd) => { const r = P(ss, dd, 0); r[1] = ctx.ground(r[0], r[2]) + 0.14; return r; };
      const n = Math.max(1, Math.ceil(d / 2)), m2 = Math.max(1, Math.ceil(L / 2)); // small cells so it follows the ground
      for (let i = 0; i < m2; i++) for (let j = 0; j < n; j++) { const sa = s0 - 0.25 + (L + 0.5) * i / m2, sb = s0 - 0.25 + (L + 0.5) * (i + 1) / m2, da = 0.05 + (d - 0.05) * j / n, db = 0.05 + (d - 0.05) * (j + 1) / n; G.resin.quad(q(sa, da), q(sb, da), q(sb, db), q(sa, db)); }
    } else if (it.t === 'lowBrickWall' || it.t === 'whiteFence') { // front boundary at the back of the pavement
      const d = Math.max(1.2, Math.min(e.front - 0.15, 6));
      if (it.t === 'lowBrickWall') { box('brick', sm, d, 0.38, L / 2 + 0.25, 0.12, 0.38); box('coping', sm, d, 0.79, L / 2 + 0.28, 0.15, 0.03); }
      else { box('white', sm, d, 0.55, L / 2 + 0.25, 0.03, 0.03); box('white', sm, d, 0.25, L / 2 + 0.25, 0.03, 0.03); for (let s = s0 - 0.25; s < s1 + 0.25; s += 0.13) box('white', s, d + 0.04, 0.45, 0.03, 0.012, 0.45); }
      const a = P(s0 - 0.25, d, 0), c = P(s1 + 0.25, d, 0); colliders.push({ type: 'segment', a: [a[0], a[2]], b: [c[0], c[2]], r: 0.12, y0: g - 0.5, top: g + 0.9, kind: 'wall' });
    }
  }
  const meshes = []; for (const [k, geo] of Object.entries(G)) { const me = geo.mesh(m[k]); if (me) { me.name = 'frontage:' + k; meshes.push(me); } }
  const group = new THREE.Group(); group.name = 'frontage:' + b.id; for (const me of meshes) group.add(me); for (const me of extra) group.add(me);
  return { group, colliders };
}

/**
 * Car park street edge (photo 83): a low red-brick wall with a brick-coped end, and blue bollards across
 * the entrance where the access road crosses it.
 * @param area OSM area {id, outer}
 * @param ctx { nearestRoad, ground, roads }
 */
export function buildAreaFrontage(area, ctx) {
  const m = mats(); const brick = new Geo(), coping = new Geo(), blue = new Geo(); const colliders = [];
  const R = area.outer, street = (r) => r.car && r.kind !== 'service' && r.kind !== 'track';
  for (let i = 0; i < R.length; i++) {
    const a = R[i], c = R[(i + 1) % R.length], L = Math.hypot(c[0] - a[0], c[1] - a[1]); if (L < 2) continue;
    const ux = (c[0] - a[0]) / L, uz = (c[1] - a[1]) / L, mx = (a[0] + c[0]) / 2, mz = (a[1] + c[1]) / 2;
    let nx = uz, nz = -ux; if (pointInRing(mx + nx * 0.3, mz + nz * 0.3, R)) { nx = -nx; nz = -nz; }
    const out = ctx.nearestRoad(mx + nx * 3, mz + nz * 3, 16, street), inn = ctx.nearestRoad(mx - nx * 3, mz - nz * 3, 16, street);
    if (!out || (inn && inn.d < out.d) || out.d > 12) continue; // only edges along the street
    // entrances: where an access road crosses this edge
    const gaps = [];
    // every segment of the tile's ways (not the road grid, which only holds segments whose midpoint is in a
    // loaded tile, so an access road mapped mostly in the next tile would be missed)
    const bx0 = Math.min(a[0], c[0]) - 6, bz0 = Math.min(a[1], c[1]) - 6, bx1 = Math.max(a[0], c[0]) + 6, bz1 = Math.max(a[1], c[1]) + 6;
    const segs = []; for (const rd of ctx.roads) { if (rd.footOnly) continue; for (let k = 1; k < rd.pts.length; k++) { const p = rd.pts[k - 1], q = rd.pts[k]; if (Math.max(p[0], q[0]) < bx0 || Math.min(p[0], q[0]) > bx1 || Math.max(p[1], q[1]) < bz0 || Math.min(p[1], q[1]) > bz1) continue; segs.push({ a: p, b: q, road: rd }); } }
    for (const sg of segs) {
      const p = sg.a, q = sg.b;
      const sl = Math.hypot(q[0] - p[0], q[1] - p[1]), den = (q[0] - p[0]) * uz - (q[1] - p[1]) * ux;
      if (sl < 1e-6 || Math.abs(den) / sl < 0.5) continue; // only roads meeting the edge at > 30 degrees
      // an access road that stops just short of (or just past) the mapped edge still makes an entrance
      const t = ((a[0] - p[0]) * uz - (a[1] - p[1]) * ux) / den, sAlong = ((p[0] + (q[0] - p[0]) * t) - a[0]) * ux + ((p[1] + (q[1] - p[1]) * t) - a[1]) * uz, tol = 4 / sl;
      if (t >= -tol && t <= 1 + tol && sAlong > 0 && sAlong < L) gaps.push([sAlong - sg.road.width / 2 - 0.6, sAlong + sg.road.width / 2 + 0.6]);
    }
    let runs = [[0, L]]; for (const [g0, g1] of gaps) { const nxr = []; for (const [p0, p1] of runs) { if (g1 <= p0 || g0 >= p1) { nxr.push([p0, p1]); continue; } if (g0 > p0) nxr.push([p0, g0]); if (g1 < p1) nxr.push([g1, p1]); } runs = nxr; }
    const P = (s, d, y) => [a[0] + ux * s - nx * d, y, a[1] + uz * s - nz * d];
    for (const [r0, r1] of runs) {
      if (r1 - r0 < 0.4) continue;
      for (let s = r0; s < r1 - 0.01; s += 1.5) {
        const sb = Math.min(r1, s + 1.5), g0 = ctx.ground(...P(s, 0.2, 0).filter((_, k) => k !== 1)), g1 = ctx.ground(...P(sb, 0.2, 0).filter((_, k) => k !== 1)), gg = Math.min(g0, g1);
        const mid = P((s + sb) / 2, 0.2, gg - 0.2 + 0.47); brick.box(mid[0], mid[1], mid[2], ux, uz, (sb - s) / 2, 0.47, 0.12);
        const cp = P((s + sb) / 2, 0.2, gg + 0.79); coping.box(cp[0], cp[1], cp[2], ux, uz, (sb - s) / 2 + 0.01, 0.04, 0.16);
      }
      const A = P(r0, 0.2, 0), C = P(r1, 0.2, 0); colliders.push({ type: 'segment', a: [A[0], A[2]], b: [C[0], C[2]], r: 0.15, y0: -1e3, top: 1e3, kind: 'wall' });
    }
    for (const [g0, g1] of gaps) for (const s of [g0 + 0.3, g1 - 0.3]) { if (s < 0 || s > L) continue; const p = P(s, 0.2, 0); const gy = ctx.ground(p[0], p[2]); blue.box(p[0], gy + 0.45, p[2], ux, uz, 0.07, 0.45, 0.07); colliders.push({ type: 'circle', x: p[0], z: p[2], r: 0.12, y0: gy - 0.5, top: gy + 0.9, kind: 'post' }); }
  }
  const group = new THREE.Group(); group.name = 'frontage-area:' + area.id;
  for (const [geo, mat] of [[brick, m.brick], [coping, m.coping], [blue, m.blue]]) { const me = geo.mesh(mat); if (me) group.add(me); }
  return group.children.length ? { group, colliders } : null;
}
