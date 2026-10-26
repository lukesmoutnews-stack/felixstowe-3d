// Felixstowe seafront: the brick flood wall along the promenade, its blue steel flood gates, and
// the Victorian seafront shelters.
//
// Sources: OSM — the promenade is the chain of highway=pedestrian ways named "The Promenade" and
// the pedestrian ways joined to it along the shore; shelters are OSM amenity=shelter buildings
// next to it. The user (who knows the town) described the rest (Oct 2026): a waist-high (~1 m)
// brick wall runs along the landward side of the whole promenade, with blue metal flood gates
// wherever a path or street crosses it onto the prom, which you can walk through; the shelters
// follow the user's photo (cream timber frame, fretwork arches, benches, pale green metal roof
// with front gables and finials). Exact wall height, gate leaf design and shelter dimensions are
// approximations fitted to OSM footprints.

import * as THREE from 'three';
import { Textures } from './textures.js';
import { orientedBox, pointInRing } from '../geo/polygon.js';

export const PROM = { wallH: 1.0, wallT: 0.34, coping: 0.44, copingH: 0.08, pierW: 0.56, pierH: 1.14 };
const BLUE = 0x1d4f91;

let MATS = null;
function mats() {
  if (MATS) return MATS;
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const brickTex = Textures.facadeTexture('brick_red', false, 61, 0);
  MATS = {
    brick: std({ map: brickTex.map, normalMap: brickTex.normalMap, roughnessMap: brickTex.roughnessMap, roughness: 1 }),
    coping: std({ color: 0xcfcac0, roughness: 0.9 }),
    steel: std({ color: BLUE, roughness: 0.45, metalness: 0.55 }),
    seal: std({ color: 0x1a1a1a, roughness: 0.9 }),
    cream: std({ color: 0xeee5c6, roughness: 0.7 }),
    roof: std({ color: 0x95b9a4, roughness: 0.55, metalness: 0.35, side: THREE.DoubleSide }),
    plinth: std({ color: 0xb9b4aa, roughness: 0.95 }),
    bench: std({ color: 0x86684a, roughness: 0.8 }),
    glass: std({ color: 0x9fb8c4, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.35, side: THREE.DoubleSide }),
  };
  return MATS;
}

/** Geometry builder: quads with explicit UVs, merged into one mesh per material. */
export class Geo {
  constructor() { this.p = []; this.uv = []; this.idx = []; }
  quad(a, b, c, d, uv = [[0, 0], [1, 0], [1, 1], [0, 1]]) { const n = this.p.length / 3; this.p.push(...a, ...b, ...c, ...d); for (const t of uv) this.uv.push(...t); this.idx.push(n, n + 1, n + 2, n, n + 2, n + 3); }
  tri(a, b, c) { const n = this.p.length / 3; this.p.push(...a, ...b, ...c); this.uv.push(0, 0, 1, 0, 0.5, 1); this.idx.push(n, n + 1, n + 2); }
  /** Oriented box: centre, half sizes along unit axis u (x,z), up and the perpendicular. */
  box(cx, cy, cz, ux, uz, hl, hh, hw) {
    const vx = -uz, vz = ux; const P = (a, b, c) => [cx + ux * a * hl + vx * c * hw, cy + b * hh, cz + uz * a * hl + vz * c * hw];
    const f = [[[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]], [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]], [[1, -1, 1], [1, -1, -1], [1, 1, -1], [1, 1, 1]], [[-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1]], [[-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, -1]], [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]]];
    for (const q of f) this.quad(...q.map(([a, b, c]) => P(a, b, c)));
  }
  mesh(mat) {
    if (!this.idx.length) return null;
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2)); g.setIndex(this.idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; return m;
  }
}

const dseg = (x, z, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], L = dx * dx + dz * dz || 1; let t = ((x - a[0]) * dx + (z - a[1]) * dz) / L; t = Math.max(0, Math.min(1, t)); return Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz); };

/**
 * The promenade: OSM ways named "The Promenade", grown along joined pedestrian ways that stay
 * within 40 m of the coastline. Returns a Set of way ids.
 */
export function promenadeWays(roads, coastLines) {
  const near = (r) => coastLines.length && r.pts.every(([x, z]) => coastLines.some((c) => { for (let i = 1; i < c.length; i++) if (dseg(x, z, c[i - 1], c[i]) < 40) return true; return false; }));
  const chain = new Set(roads.filter((r) => r.name === 'The Promenade').map((r) => r.id));
  const ends = (r) => r.nodeIds ? [r.nodeIds[0], r.nodeIds[r.nodeIds.length - 1]] : [];
  let grew = true;
  while (grew) {
    grew = false; const endIds = new Set(roads.filter((r) => chain.has(r.id)).flatMap(ends));
    for (const r of roads) if (!chain.has(r.id) && r.kind === 'pedestrian' && r.width >= 4 && ends(r).some((n) => endIds.has(n)) && near(r)) { chain.add(r.id); grew = true; }
  }
  return chain;
}

/**
 * Build the flood wall and gates for the parts of the promenade inside `rect`.
 * @returns {{ meshes, colliders, gates }}
 */
export function buildSeafrontWall(chainIds, ctx) {
  const { net, rect, coastLines = [] } = ctx; const m = mats();
  const brick = new Geo(), coping = new Geo(), steel = new Geo(), seal = new Geo();
  const colliders = [], gates = [];
  const inR = (x, z) => x >= rect.minX && x < rect.maxX && z >= rect.minZ && z < rect.maxZ;
  const coastD = (x, z) => { let d = Infinity; for (const c of coastLines) for (let i = 1; i < c.length; i++) d = Math.min(d, dseg(x, z, c[i - 1], c[i])); return d; };
  const T = PROM.wallT, seenGate = new Set();
  for (const id of chainIds) {
    const W = net.ways.get(id); if (!W) continue;
    // landward side: the side further from the coastline (or uphill when no coastline is loaded)
    const mid = W.pointAt(W.L / 2), lx = mid.uz, lz = -mid.ux;
    const dl = coastD(mid.x + lx * 12, mid.z + lz * 12), dr = coastD(mid.x - lx * 12, mid.z - lz * 12);
    const side = dl === Infinity ? (net.base(mid.x + lx * 12, mid.z + lz * 12) >= net.base(mid.x - lx * 12, mid.z - lz * 12) ? 1 : -1) : dl >= dr ? 1 : -1;
    const o0 = side * (W.hw + 0.02), o1 = side * (W.hw + 0.02 + T); // prom face and landward face
    // openings where a path or street joins from the landward side
    const opens = [];
    for (const nd of W.nodes) {
      for (const e of net.nodeIndex.get(nd.id) || []) {
        if (e.W === W || chainIds.has(e.W.id)) continue;
        const O = e.W, so = O.cum[e.i], dir = so < O.L / 2 ? 1 : -1, q = O.pointAt(so + dir * Math.min(4, dir > 0 ? O.L - so : so));
        const P = W.pointAt(nd.s), lat = (q.x - P.x) * P.uz - (q.z - P.z) * P.ux;
        if (lat * side <= 0.5) continue; // goes down to the beach, not through the wall
        const w = Math.min(5, Math.max(1.5, O.hw * 2 + (O.car ? 1.0 : 0.5)));
        opens.push({ s: nd.s, w, by: O.road.name || O.kind });
      }
    }
    for (const g of ctx.gaps || []) { // gaps for flights of steps down to the promenade wall (pier building)
      let s0 = null, s1 = null; for (let s = 0; s <= W.L; s += 0.5) { const q = W.pointAt(s); const hit = g.ring ? (pointInRing(q.x, q.z, g.ring) || g.ring.some((p, i) => dseg(q.x, q.z, p, g.ring[(i + 1) % g.ring.length]) < g.r)) : dseg(q.x, q.z, g.a, g.b) < g.r; if (hit) { if (s0 == null) s0 = s; s1 = s; } }
      if (s0 != null) opens.push({ s: (s0 + s1) / 2, w: s1 - s0 + 0.5, by: 'steps', noGate: true });
    }
    opens.sort((a, b) => a.s - b.s);
    for (let i = 1; i < opens.length; i++) if (opens[i].s - opens[i].w / 2 < opens[i - 1].s + opens[i - 1].w / 2 + 1) { opens[i - 1].w = Math.max(opens[i - 1].w, opens[i].s + opens[i].w / 2 - (opens[i - 1].s - opens[i - 1].w / 2)); opens[i - 1].s = (opens[i - 1].s + opens[i].s) / 2; opens.splice(i--, 1); }
    // wall runs between openings (piers at each opening)
    const cuts = opens.map((o) => [o.s - o.w / 2 - PROM.pierW, o.s + o.w / 2 + PROM.pierW]);
    let runs = [[0, W.L]]; // joins the next promenade way's wall at the shared node
    for (const [a, b] of cuts) { const nx = []; for (const [p, q] of runs) { if (b <= p || a >= q) { nx.push([p, q]); continue; } if (a > p) nx.push([p, a]); if (b < q) nx.push([b, q]); } runs = nx; }
    const y = (s) => W.hc(s);
    const P = (s, o, yy) => { const p = W.pointAt(s); return [p.x + p.uz * o, yy, p.z - p.ux * o]; };
    const base = (s) => Math.min(y(s), net.base(...P(s, o1 + side * 0.4, 0).filter((_, i) => i !== 1))) - 0.4;
    for (const [a, b] of runs) {
      if (b - a < 0.3) continue;
      const S = []; for (let s = a; s < b; s += 1.5) S.push(s); S.push(b);
      const own = S.filter((s) => { const p = W.pointAt(s); return inR(p.x, p.z); }); if (own.length < 1) continue;
      const s0 = Math.max(a, own[0] - 1.5), s1 = Math.min(b, own[own.length - 1] + 1.5);
      const st = S.filter((s) => s >= s0 - 1e-6 && s <= s1 + 1e-6); if (st[0] > s0) st.unshift(s0); if (st[st.length - 1] < s1) st.push(s1);
      for (let k = 0; k < st.length - 1; k++) {
        const sa = st[k], sb = st[k + 1], ta = y(sa) + PROM.wallH, tb = y(sb) + PROM.wallH;
        const uvF = (o) => [[sa / 3.2, 0], [sb / 3.2, 0], [sb / 3.2, PROM.wallH / 2.9], [sa / 3.2, PROM.wallH / 2.9]];
        // prom face and landward face (the landward face goes down to the ground)
        brick.quad(P(sa, o0, y(sa) - 0.1), P(sb, o0, y(sb) - 0.1), P(sb, o0, tb), P(sa, o0, ta), uvF());
        brick.quad(P(sb, o1, base(sb)), P(sa, o1, base(sa)), P(sa, o1, ta), P(sb, o1, tb), [[sb / 3.2, (base(sb) - ta) / 2.9], [sa / 3.2, (base(sa) - ta) / 2.9], [sa / 3.2, 0], [sb / 3.2, 0]]);
        // coping: a slab a little wider than the wall
        const c0 = o0 - side * (PROM.coping - T) / 2, c1 = o1 + side * (PROM.coping - T) / 2, ch = PROM.copingH;
        coping.quad(P(sa, c0, ta + ch), P(sb, c0, tb + ch), P(sb, c1, tb + ch), P(sa, c1, ta + ch));
        coping.quad(P(sa, c0, ta), P(sb, c0, tb), P(sb, c0, tb + ch), P(sa, c0, ta + ch));
        coping.quad(P(sb, c1, tb), P(sa, c1, ta), P(sa, c1, ta + ch), P(sb, c1, tb + ch));
        const A = P(sa, (o0 + o1) / 2, 0), B = P(sb, (o0 + o1) / 2, 0);
        colliders.push({ type: 'segment', a: [A[0], A[2]], b: [B[0], B[2]], r: T / 2, y0: Math.min(y(sa), y(sb)) - 0.5, top: Math.max(ta, tb), kind: 'wall' });
      }
      // end faces
      for (const s of [a, b]) { const t = y(s) + PROM.wallH; brick.quad(P(s, o0, y(s) - 0.1), P(s, o1, base(s)), P(s, o1, t), P(s, o0, t)); }
    }
    // piers and blue steel flood gates at each opening (gates stand open against the wall's landward face)
    for (const op of opens) {
      const pc = W.pointAt(op.s); if (!inR(pc.x, pc.z)) continue;
      const ux = pc.ux, uz = pc.uz, om = (o0 + o1) / 2, half = op.w / 2;
      for (const sg of [-1, 1]) {
        const s = op.s + sg * (half + PROM.pierW / 2); if (s < 0 || s > W.L) continue; // that pier belongs to the next promenade way
        const [px, , pz] = P(s, om, 0), yb = y(s);
        brick.box(px, yb - 0.25 + (PROM.pierH + 0.25) / 2, pz, ux, uz, PROM.pierW / 2, (PROM.pierH + 0.25) / 2, (T + 0.2) / 2);
        coping.box(px, yb + PROM.pierH + 0.05, pz, ux, uz, PROM.pierW / 2 + 0.05, 0.05, (T + 0.2) / 2 + 0.05);
        // steel channel in the jamb, where the gate seals when shut
        const [jx, , jz] = P(op.s + sg * (half - 0.03), om, 0); steel.box(jx, yb + PROM.wallH / 2, jz, ux, uz, 0.05, PROM.wallH / 2, T / 2 + 0.03);
        colliders.push({ type: 'circle', x: px, z: pz, r: PROM.pierW * 0.6, y0: yb - 0.5, top: yb + PROM.pierH, kind: 'wall' });
      }
      if (op.noGate) continue; // an open forecourt or flight of steps: just brick piers at the ends, no flood gate
      const gk = Math.round(pc.x) + ',' + Math.round(pc.z); if (seenGate.has(gk)) continue; seenGate.add(gk); // one gate where two promenade ways meet
      // sill plate flush with the path
      { const [sx, , sz] = P(op.s, om, 0); steel.box(sx, y(op.s) + 0.01, sz, ux, uz, half, 0.012, T / 2 + 0.05); }
      // leaves: one per side for wide openings, otherwise one, standing open at right angles on the landward side
      const leaves = op.w > 3 ? [[-1, half], [1, half]] : [[-1, op.w]];
      const nx = pc.uz * side, nz = -pc.ux * side; // landward unit normal
      for (const [sg, lw] of leaves) {
        const [hx, , hz] = P(op.s + sg * (half - 0.08), o1 + side * 0.06, 0), yb = y(op.s);
        const cx = hx + nx * lw / 2, cz = hz + nz * lw / 2;
        steel.box(cx, yb + 0.06 + 0.47, cz, nx, nz, lw / 2, 0.47, 0.035);                                   // plate
        for (const hy of [0.25, 0.55, 0.85]) steel.box(cx - sg * ux * 0.05, yb + 0.06 + hy, cz - sg * uz * 0.05, nx, nz, lw / 2, 0.035, 0.03); // stiffeners
        seal.box(cx, yb + 0.04, cz, nx, nz, lw / 2, 0.03, 0.04);
        for (const hy of [0.2, 0.55, 0.9]) steel.box(hx, yb + hy, hz, nx, nz, 0.05, 0.06, 0.05);                // hinges
        colliders.push({ type: 'segment', a: [hx, hz], b: [hx + nx * lw, hz + nz * lw], r: 0.06, y0: yb - 0.3, top: yb + 1.05, kind: 'gate' });
      }
      gates.push({ x: pc.x, z: pc.z, w: op.w, by: op.by });
    }
  }
  const meshes = [brick.mesh(m.brick), coping.mesh(m.coping), steel.mesh(m.steel), seal.mesh(m.seal)].filter(Boolean);
  for (const me of meshes) me.name = 'seafront-wall';
  return { meshes, colliders, gates };
}

/** OSM amenity=shelter buildings beside the promenade. */
export function isSeafrontShelter(b, net, chainIds) {
  if (b.amenity !== 'shelter' || b.isPart || b.area > 140) return false;
  for (const id of chainIds) { const W = net.ways.get(id); if (!W) continue; for (const sg of W.segs || []) { const d = Math.abs(net.constructor.proj(sg, b.cx, b.cz).d); if (d < 30) return true; } }
  return false;
}

/**
 * Victorian seafront shelter on its OSM footprint: plinth, cream posts with fretwork arches,
 * a central glazed screen with benches on both sides, lattice end panels and a pale green
 * hipped metal roof with a pair of gables on each long side, bargeboards and finials.
 */
export function buildShelter(b, ctx) {
  const m = mats(); const obb = orientedBox(b.outer); if (!obb) return null;
  const L = obb.length, Wd = obb.width, ux = obb.ux, uz = obb.uz, vx = -uz, vz = ux;
  let g = Infinity; for (const [x, z] of b.outer) g = Math.min(g, ctx.surfaceAt(x, z));
  const P = (a, h, c) => [obb.cx + ux * a + vx * c, g + h, obb.cz + uz * a + vz * c];
  const cream = new Geo(), roof = new Geo(), plinth = new Geo(), bench = new Geo(), glass = new Geo();
  const box = (G, a, h, c, hl, hh, hw) => { const p = P(a, h, c); G.box(p[0], p[1], p[2], ux, uz, hl, hh, hw); };
  const hl = L / 2, hw = Wd / 2, H = 2.6, colliders = [];
  box(plinth, 0, -0.2, 0, hl + 0.15, 0.35, hw + 0.15);
  // posts: corners, along the long sides about every 1.9 m, and the middle of each end
  const nL = Math.max(2, Math.round(L / 1.9)); const posts = [];
  for (let i = 0; i <= nL; i++) for (const c of [-hw, hw]) posts.push([-hl + (L * i) / nL, c]);
  for (const a of [-hl, hl]) posts.push([a, 0]);
  for (const [a, c] of posts) { box(cream, a, 0.15 + H / 2, c, 0.07, H / 2, 0.07); const p = P(a, 0, c); colliders.push({ type: 'circle', x: p[0], z: p[2], r: 0.12, y0: g - 0.5, top: g + H, kind: 'post' }); }
  // eaves beam and fretwork arch spandrels between posts on the long sides
  for (const c of [-hw, hw]) {
    box(cream, 0, 0.15 + H - 0.06, c, hl + 0.08, 0.08, 0.08);
    for (let i = 0; i < nL; i++) {
      const a0 = -hl + (L * i) / nL, a1 = -hl + (L * (i + 1)) / nL, span = a1 - a0, n = 7;
      for (let k = 0; k < n; k++) { // a quarter-ellipse spandrel each side, as thin stepped boards
        const f = (k + 0.5) / n, drop = 0.55 * (1 - Math.sqrt(1 - (1 - f) * (1 - f)));
        for (const [s, sgn] of [[a0, 1], [a1, -1]]) box(cream, s + sgn * (f * span / 2), 0.15 + H - 0.14 - drop / 2, c, span / (2 * n) * 0.5, drop / 2 + 0.01, 0.025);
      }
    }
  }
  // ends: lattice panels below rail height, open above
  for (const a of [-hl, hl]) { box(cream, a, 0.15 + 0.85, 0, 0.03, 0.04, hw); box(cream, a, 0.15 + 0.06, 0, 0.03, 0.04, hw); for (let c = -hw + 0.18; c < hw; c += 0.18) box(cream, a, 0.15 + 0.45, c, 0.02, 0.4, 0.02); }
  // central glazed screen with benches on both sides
  box(cream, 0, 0.15 + 0.5, 0, hl - 0.1, 0.5, 0.04);
  { const p0 = P(-hl + 0.1, 1.15, 0), p1 = P(hl - 0.1, 1.15, 0), p2 = P(hl - 0.1, H - 0.1, 0), p3 = P(-hl + 0.1, H - 0.1, 0); glass.quad(p0, p1, p2, p3); }
  for (let i = 1; i < nL; i++) box(cream, -hl + (L * i) / nL, 0.15 + H / 2, 0, 0.05, H / 2, 0.05);
  for (const sg of [-1, 1]) { box(bench, 0, 0.15 + 0.43, sg * 0.32, hl - 0.25, 0.03, 0.2); box(bench, 0, 0.15 + 0.66, sg * 0.1, hl - 0.25, 0.12, 0.02); for (let a = -hl + 0.6; a < hl - 0.4; a += 1.4) box(cream, a, 0.15 + 0.2, sg * 0.32, 0.03, 0.2, 0.18); }
  { const a = P(-hl, 0, 0), c = P(hl, 0, 0); colliders.push({ type: 'segment', a: [a[0], a[2]], b: [c[0], c[2]], r: 0.6, y0: g - 0.5, top: g + 1.0, kind: 'bench' }); }
  // roof: hipped, pitched 30 degrees, 0.45 m eaves
  const e = 0.45, RL = hl + e, RW = hw + e, y0 = 0.15 + H, rise = RW * Math.tan(Math.PI / 6), rh = Math.max(0, RL - RW);
  const r = (a, h, c) => P(a, y0 + h, c);
  roof.quad(r(-RL, 0, -RW), r(RL, 0, -RW), r(rh, rise, 0), r(-rh, rise, 0));
  roof.quad(r(RL, 0, RW), r(-RL, 0, RW), r(-rh, rise, 0), r(rh, rise, 0));
  roof.tri(r(RL, 0, -RW), r(RL, 0, RW), r(rh, rise, 0));
  roof.tri(r(-RL, 0, RW), r(-RL, 0, -RW), r(-rh, rise, 0));
  roof.quad(r(-RL, -0.01, -RW), r(-RL, -0.01, RW), r(RL, -0.01, RW), r(RL, -0.01, -RW)); // soffit
  // gables: two on each long side, towards the ends (as in the photo), with bargeboards and finials
  const gw = Math.min(2.4, L * 0.28), gr = gw / 2, depth = gr / Math.tan(Math.PI / 6);
  for (const c of [-1, 1]) for (const a of [-hl + gw * 0.75, hl - gw * 0.75]) {
    const F = (da, h, dc) => r(a + da, h, c * (RW - dc));
    roof.quad(F(-gr, 0, 0), F(0, gr, 0), F(0, gr, depth), F(-gr, 0, depth));
    roof.quad(F(0, gr, 0), F(gr, 0, 0), F(gr, 0, depth), F(0, gr, depth));
    cream.tri(F(-gr + 0.05, 0.02, 0.06), F(gr - 0.05, 0.02, 0.06), F(0, gr - 0.05, 0.06));       // gable face
    for (const sgn of [-1, 1]) { // bargeboard along each slope, with a scalloped lower edge
      const n = 6; for (let k = 0; k < n; k++) { const f0 = k / n, f1 = (k + 1) / n; const a0 = sgn * gr * (1 - f0), a1 = sgn * gr * (1 - f1); cream.quad(F(a0, gr * f0 - 0.02, -0.02), F(a1, gr * f1 - 0.02, -0.02), F(a1, gr * f1 - 0.2, -0.02), F(a0, gr * f0 - 0.14, -0.02)); }
    }
    const tip = F(0, gr, -0.02); cream.box(tip[0], tip[1] + 0.32, tip[2], ux, uz, 0.035, 0.32, 0.035); cream.box(tip[0], tip[1] + 0.68, tip[2], ux, uz, 0.06, 0.06, 0.06);
  }
  // ridge finials
  for (const a of [-rh, rh]) { const t = r(a, rise, 0); cream.box(t[0], t[1] + 0.3, t[2], ux, uz, 0.04, 0.3, 0.04); }
  const meshes = [cream.mesh(m.cream), roof.mesh(m.roof), plinth.mesh(m.plinth), bench.mesh(m.bench), glass.mesh(m.glass)].filter(Boolean);
  const group = new THREE.Group(); group.name = 'landmark:seafront-shelter'; for (const me of meshes) group.add(me);
  return { group, colliders, surface: { id: 'shelter:' + b.id, kind: 'terrace', ring: b.outer.map((p) => p.slice()), heightAt: () => g + 0.15, meshes: [] } };
}
