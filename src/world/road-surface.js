// One smooth, shared road surface for drawing, driving and walking.
//
// Why: OSM gives centre lines only. The old renderer draped each road ribbon on the raw LiDAR
// terrain at every 4 m vertex and each edge separately, so the surface copied every lump in
// the 1 m terrain model, tilted sideways with it, and showed seams where pieces met. Vehicles
// drove on the raw terrain rather than on the mesh they appeared to be on, and the 5 m terrain
// mesh poked through the road wherever the two disagreed.
//
// Here every road gets a long profile sampled from the terrain across its width, smoothed along
// its length (Gaussian, a few metres) and pinned to one shared height at every junction node, so
// joining roads meet exactly. A carriageway has a 2.5 % crown (faded out near junctions), a
// 110 mm kerb and raised pavements; pavement kerbs drop at mapped crossings. The ground under and
// beside roads is graded a little below the road and blended back into the terrain, so the
// terrain mesh never pokes through. Junctions are filled with a polygon that follows the kerb
// corners (real corner radii), and the same polygon answers height queries for physics.
//
// Bridge decks are not part of this surface (they are layered surfaces from bridges.js); their
// approach ramps use the bridge profile heights, so bridges keep their real elevation.

export const ROAD = { camber: 0.025, kerb: 0.12, kerbW: 0.15, pave: 1.9, drop: 0.22, blend: 7, footDrop: 0.1, footBlend: 2.2, dropKerb: 0.02 };
const DS = 2;           // profile sample spacing (m)
const CELL = 16;        // query grid cell (m)
const EMPTY = [];

export const smooth01 = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
export const leftOf = (ux, uz) => [uz, -ux]; // EN-left in world x/z (z = south)
const RANK = { motorway: 9, trunk: 8, primary: 7, secondary: 6, tertiary: 5, motorway_link: 6, trunk_link: 6, primary_link: 5, secondary_link: 5, tertiary_link: 4, unclassified: 3, residential: 3, road: 3, living_street: 2, service: 1, track: 0 };

class Grid {
  constructor(cell) { this.c = cell; this.m = new Map(); }
  _k(i, j) { return i * 73856093 ^ j * 19349663; }
  add(x0, z0, x1, z1, it) {
    const c = this.c; it._cells = [];
    for (let i = Math.floor(x0 / c); i <= Math.floor(x1 / c); i++) for (let j = Math.floor(z0 / c); j <= Math.floor(z1 / c); j++) {
      const k = this._k(i, j); let a = this.m.get(k); if (!a) { a = []; this.m.set(k, a); } a.push(it); it._cells.push(k);
    }
  }
  at(x, z) { return this.m.get(this._k(Math.floor(x / this.c), Math.floor(z / this.c))) || EMPTY; }
  remove(it) { for (const k of it._cells || []) { const a = this.m.get(k); if (!a) continue; const i = a.indexOf(it); if (i >= 0) a.splice(i, 1); if (!a.length) this.m.delete(k); } }
}

/** A road (whole OSM way) with its smoothed profile. */
export class RoadWay {
  constructor(r, net, prof) {
    this.id = r.id; this.road = r; this.pts = r.pts; this.ids = r.nodeIds || null; this.net = net;
    this.car = !r.footOnly; this.hw = r.width / 2; this.kind = r.kind; this.rank = RANK[r.kind] ?? 2;
    this.pl = this.car && (r.sidewalk === 'both' || r.sidewalk === 'left') ? ROAD.pave : 0; // pavement on the way's left
    this.pr = this.car && (r.sidewalk === 'both' || r.sidewalk === 'right') ? ROAD.pave : 0;
    this.ramp = prof && prof.ramp ? prof : null;
    this.crown = this.car && !this.ramp && r.width >= 4 && r.kind !== 'track' ? ROAD.camber : 0;
    const n = this.pts.length; this.cum = new Float64Array(n);
    for (let i = 1; i < n; i++) this.cum[i] = this.cum[i - 1] + Math.hypot(this.pts[i][0] - this.pts[i - 1][0], this.pts[i][1] - this.pts[i - 1][1]);
    this.L = this.cum[n - 1];
    this.nodes = []; if (this.ids) this.ids.forEach((id, i) => { if (id != null) this.nodes.push({ id, i, s: this.cum[i] }); });
    this.crossS = [];
    this._profile();
  }
  /** Point, unit tangent and segment index at arc length s. */
  pointAt(s) {
    const c = this.cum, n = c.length; s = Math.max(0, Math.min(this.L, s));
    let lo = 0, hi = n - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (c[m] <= s) lo = m; else hi = m; }
    const a = this.pts[lo], b = this.pts[hi], L = c[hi] - c[lo] || 1, t = (s - c[lo]) / L;
    return { x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t, ux: (b[0] - a[0]) / L, uz: (b[1] - a[1]) / L, i: lo };
  }
  _profile() {
    const net = this.net, base = net.base;
    // sample stations: a regular grid plus every node (so pinned heights are exact)
    const S = new Set(); for (let s = 0; s < this.L; s += DS) S.add(+s.toFixed(3)); S.add(+this.L.toFixed(3));
    for (const nd of this.nodes) S.add(+nd.s.toFixed(3));
    const sArr = Float64Array.from([...S].sort((a, b) => a - b)); const m = sArr.length;
    const h = new Float64Array(m);
    if (this.ramp) { for (let k = 0; k < m; k++) { const p = this.pointAt(sArr[k]); h[k] = this.ramp.heightAt(p.x, p.z); } }
    else {
      const raw = new Float64Array(m), half = this.car ? this.hw * 0.5 : 0;
      for (let k = 0; k < m; k++) {
        const p = this.pointAt(sArr[k]);
        if (half) { const lx = p.uz * half, lz = -p.ux * half; raw[k] = (base(p.x, p.z) * 2 + base(p.x + lx, p.z + lz) + base(p.x - lx, p.z - lz)) / 4; }
        else raw[k] = base(p.x, p.z);
      }
      const sigma = this.car ? Math.min(10, Math.max(4, this.hw * 1.6)) : 2.5;
      // Gaussian along s (weights renormalised at the ends, so no extrapolation)
      for (let k = 0, j0 = 0; k < m; k++) {
        let sw = 0, sh = 0; while (sArr[j0] < sArr[k] - 3 * sigma) j0++;
        for (let j = j0; j < m && sArr[j] <= sArr[k] + 3 * sigma; j++) { const d = (sArr[j] - sArr[k]) / sigma, w = Math.exp(-0.5 * d * d); sw += w; sh += w * raw[j]; }
        h[k] = sh / sw;
      }
      // pin every node (junctions, crossings, ends) to its shared height; spread the correction linearly between pins
      const pins = this.nodes.map((nd) => ({ s: nd.s, r: net.nodeH(nd.id, this.pts[nd.i][0], this.pts[nd.i][1]) }));
      if (pins.length) {
        const idx = (s) => { let lo = 0, hi = m - 1; while (lo < hi) { const md = (lo + hi) >> 1; if (sArr[md] < s - 1e-6) lo = md + 1; else hi = md; } return lo; };
        for (const p of pins) p.r -= h[idx(p.s)];
        const corr = new Float64Array(m);
        for (let k = 0, q = 0; k < m; k++) {
          const s = sArr[k]; while (q < pins.length - 1 && pins[q + 1].s <= s) q++;
          const a = pins[q], b = pins[Math.min(pins.length - 1, q + 1)];
          corr[k] = s <= pins[0].s ? pins[0].r : s >= pins[pins.length - 1].s ? pins[pins.length - 1].r : a.r + (b.r - a.r) * ((s - a.s) / ((b.s - a.s) || 1));
        }
        for (let k = 0; k < m; k++) h[k] += corr[k];
      }
    }
    // camber fades to flat within a junction-sized zone around every node
    const cam = new Float64Array(m); const Z0 = Math.max(6, this.hw * 1.6);
    for (let k = 0; k < m; k++) {
      let d = Infinity; for (const nd of this.nodes) d = Math.min(d, Math.abs(nd.s - sArr[k]));
      cam[k] = this.crown * smooth01((d - Z0) / 8);
    }
    this.sArr = sArr; this.hArr = h; this.cArr = cam;
  }
  _k(s) { const a = this.sArr; let lo = 0, hi = a.length - 1; if (s <= a[0]) return [0, 0]; if (s >= a[hi]) return [hi, 0]; while (hi - lo > 1) { const md = (lo + hi) >> 1; if (a[md] <= s) lo = md; else hi = md; } return [lo, (s - a[lo]) / (a[hi] - a[lo])]; }
  /** Centre-line height. */
  hc(s) { const [k, t] = this._k(s); return t ? this.hArr[k] + (this.hArr[k + 1] - this.hArr[k]) * t : this.hArr[k]; }
  camber(s) { if (!this.crown) return 0; const [k, t] = this._k(s); return t ? this.cArr[k] + (this.cArr[k + 1] - this.cArr[k]) * t : this.cArr[k]; }
  /** Carriageway height at arc length s and lateral offset o (m, + left). */
  carriageY(s, o) { return this.hc(s) - this.camber(s) * Math.min(Math.abs(o), this.hw); }
  edgeY(s) { return this.hc(s) - this.camber(s) * this.hw; }
  /** Kerb height at s (dropped at mapped crossings). */
  kerbH(s) {
    let k = ROAD.kerb;
    for (const c of this.crossS) { const d = Math.abs(s - c); if (d < 2.4) k = Math.min(k, ROAD.dropKerb + (ROAD.kerb - ROAD.dropKerb) * smooth01((d - 1.2) / 1.2)); }
    return k;
  }
  paveY(s) { return this.edgeY(s) + this.kerbH(s); }
  side(o) { return o >= 0 ? this.pl : this.pr; }
}

export class RoadNetwork {
  /** @param base terrain height without road grading */
  constructor(base) {
    this.base = base; this.ways = new Map(); this.grid = new Grid(CELL); this.coreGrid = new Grid(CELL);
    this.nodeIndex = new Map(); this.override = new Map(); this.nodeCache = new Map(); this.crossIds = new Set();
    this.cores = new Map(); this.junctions = new Map(); this.version = 0;
  }
  /** Shared height for an OSM node: a bridge/ramp end if there is one, else the local terrain mean. */
  nodeH(id, x, z) {
    if (this.override.has(id)) return this.override.get(id);
    let v = this.nodeCache.get(id);
    if (v == null) { v = 0; for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) v += this.base(x + i * 2.5, z + j * 2.5); v /= 9; this.nodeCache.set(id, v); }
    return v;
  }
  addPoints(points) {
    for (const p of points || []) if (p.kind === 'crossing' && !this.crossIds.has(p.id)) {
      this.crossIds.add(p.id);
      for (const e of this.nodeIndex.get(p.id) || []) if (e.W.car && !e.W.crossS.includes(e.W.cum[e.i])) e.W.crossS.push(e.W.cum[e.i]);
    }
  }
  /** Register whole ways (from tile features). Bridge decks and tunnels are skipped; ramps follow their profile. */
  addWays(roads, profiles, tileKey) {
    // bridge decks and ramps: their end nodes are pinned to the profile, so joining roads meet them exactly
    for (const r of roads) {
      const prof = profiles?.get(r.id); if (!prof || !r.nodeIds || r.tunnel) continue;
      for (const i of [0, r.pts.length - 1]) { const id = r.nodeIds[i]; if (id != null && !this.override.has(id)) this.override.set(id, prof.heightAt(r.pts[i][0], r.pts[i][1])); }
    }
    for (const r of roads) {
      if (r.tunnel || r.kind === 'steps' || r.pts.length < 2) continue;
      const prof = profiles?.get(r.id);
      if (prof && !prof.ramp) continue; // bridge deck: drawn and walked on as a layered surface (bridges.js)
      let W = this.ways.get(r.id);
      if (W && !!W.ramp !== !!(prof && prof.ramp)) { this._remove(W); W = null; }
      if (W) { W.tiles.add(tileKey); continue; }
      W = new RoadWay(r, this, prof); W.tiles = new Set([tileKey]);
      this.ways.set(r.id, W);
      for (const nd of W.nodes) { this.junctions.delete(nd.id); let a = this.nodeIndex.get(nd.id); if (!a) { a = []; this.nodeIndex.set(nd.id, a); } a.push({ W, i: nd.i }); if (this.crossIds.has(nd.id) && W.car) W.crossS.push(nd.s); }
      const pad = W.car ? W.hw + ROAD.kerbW + ROAD.pave + ROAD.blend + 1 : W.hw + ROAD.footBlend + 1;
      W.segs = [];
      for (let i = 1; i < W.pts.length; i++) {
        const a = W.pts[i - 1], b = W.pts[i], L = W.cum[i] - W.cum[i - 1]; if (L < 1e-4) continue;
        const sg = { W, i: i - 1, ax: a[0], az: a[1], ux: (b[0] - a[0]) / L, uz: (b[1] - a[1]) / L, len: L, s0: W.cum[i - 1] };
        this.grid.add(Math.min(a[0], b[0]) - pad, Math.min(a[1], b[1]) - pad, Math.max(a[0], b[0]) + pad, Math.max(a[1], b[1]) + pad, sg); W.segs.push(sg);
      }
    }
    this.version++;
  }
  dropTile(tileKey) {
    for (const W of [...this.ways.values()]) { W.tiles?.delete(tileKey); if (W.tiles && !W.tiles.size) this._remove(W); }
    for (const [id, c] of this.cores) if (c.tile === tileKey) { this.coreGrid.remove(c); this.cores.delete(id); }
  }
  _remove(W) {
    for (const s of W.segs || []) this.grid.remove(s);
    this.ways.delete(W.id);
    for (const nd of W.nodes) { const a = this.nodeIndex.get(nd.id); if (a) { const f = a.filter((e) => e.W !== W); if (f.length) this.nodeIndex.set(nd.id, f); else this.nodeIndex.delete(nd.id); } this.junctions.delete(nd.id); }
    this.version++;
  }

  /** Project (x,z) on a segment: arc length, signed lateral offset (+ left) and distance. */
  static proj(sg, x, z) {
    const dx = x - sg.ax, dz = z - sg.az; let t = dx * sg.ux + dz * sg.uz; const tc = t < 0 ? 0 : t > sg.len ? sg.len : t;
    const px = sg.ax + sg.ux * tc, pz = sg.az + sg.uz * tc, ex = x - px, ez = z - pz;
    const lat = ex * sg.uz - ez * sg.ux; const d = Math.hypot(ex, ez);
    return { s: sg.s0 + tc, o: lat >= 0 ? d : -d, d };
  }

  /**
   * What you stand on at (x,z) on the road network: {y, kind:'road'|'pavement'|'path', way} or null.
   * Junction polygons first, then carriageways (blended where two overlap), pavements, footpaths.
   */
  surface(x, z) {
    const cores = this.coreGrid.at(x, z);
    for (const c of cores) { const y = c.heightAt(x, z); if (y != null) return { y, kind: 'road', way: null, core: c }; }
    const segs = this.grid.at(x, z); if (!segs.length) return null;
    let sw = 0, sy = 0, wayC = null, pave = null, path = null;
    for (const sg of segs) {
      const W = sg.W, p = RoadNetwork.proj(sg, x, z);
      if (W.car) {
        if (p.d <= W.hw) { const w = (1.0001 - p.d / W.hw) ** 2; sw += w; sy += w * W.carriageY(p.s, p.o); if (!wayC || w > wayC.w) wayC = { W, w }; }
        else { const pw = W.side(p.o); if (pw && p.d <= W.hw + ROAD.kerbW + pw && (!pave || p.d - W.hw < pave.d)) pave = { y: W.paveY(p.s), d: p.d - W.hw, W }; }
      } else if (p.d <= W.hw + 0.05 && (!path || p.d < path.d)) path = { y: W.hc(p.s), d: p.d, W };
    }
    if (sw > 0) return { y: sy / sw, kind: 'road', way: wayC.W };
    for (const c of cores) { const y = c.sectorAt(x, z); if (y != null) return { y, kind: 'pavement', way: null, core: c }; }
    if (pave) return { y: pave.y, kind: 'pavement', way: pave.W };
    if (path) return { y: path.y, kind: 'path', way: path.W };
    return null;
  }

  /** Terrain grading: pull the ground a little below roads and paths, blended back over a few metres. */
  grade(x, z, h) {
    const segs = this.grid.at(x, z); if (!segs.length) return h;
    let wMax = 0, st = 0, sw = 0, inner = Infinity;
    for (const c of this.coreGrid.at(x, z)) {
      const y = c.heightAt(x, z); if (y != null) inner = Math.min(inner, y - ROAD.drop);
      const yp = c.sectorAt(x, z); if (yp != null) inner = Math.min(inner, yp - 0.17);
    }
    for (const sg of segs) {
      const W = sg.W; if (W.ramp) continue;
      const p = RoadNetwork.proj(sg, x, z); let F, B, target;
      // under the carriageway the ground sits well below the road (the terrain mesh can never show through);
      // under a pavement just below its top; beside the road a level 1 m verge only a few cm down, so
      // walking or driving off the edge is a small step, not a drop
      if (W.car) {
        const pw = W.side(p.o), e = W.edgeY(p.s), outer = W.hw + (pw ? ROAD.kerbW + pw : 0);
        F = outer + 1.0; B = ROAD.blend;
        target = p.d <= W.hw ? e - ROAD.drop : pw && p.d <= outer ? e + W.kerbH(p.s) - 0.17 : (pw ? e + W.kerbH(p.s) : e) - 0.04;
      } else { F = W.hw + 0.6; B = ROAD.footBlend; target = W.hc(p.s) - (p.d <= W.hw ? ROAD.footDrop : 0.04); }
      if (p.d <= F) { inner = Math.min(inner, target); continue; }
      const w = smooth01(1 - (p.d - F) / B); if (w <= 0) continue;
      const w4 = w * w * w * w; st += w4 * target; sw += w4; if (w > wMax) wMax = w;
    }
    // inside a footprint: the lowest of the targets there (so the ground is below every paved surface);
    // outside: a blend back to the terrain
    if (inner < Infinity) return inner;
    if (!sw) return h;
    return h + (st / sw - h) * wMax;
  }

  /**
   * Junction geometry at a node shared by two or more car ways: arms sorted by angle, kerb corner
   * arcs, carriageway and pavement trims per arm, and the junction polygon. Cached per node.
   */
  junction(id) {
    if (this.junctions.has(id)) return this.junctions.get(id);
    const entries = (this.nodeIndex.get(id) || []).filter((e) => e.W.car && !e.W.ramp);
    if (entries.length < 2) { this.junctions.set(id, null); return null; } // a crossing or signals node inside one road
    const arms = [];
    for (const { W, i } of entries) {
      const s = W.cum[i];
      for (const dir of [-1, 1]) {
        if ((dir < 0 && i === 0) || (dir > 0 && i === W.pts.length - 1)) continue;
        const avail = dir > 0 ? W.L - s : s; const q = W.pointAt(s + dir * Math.min(3, avail));
        const J = W.pts[i]; let ux = q.x - J[0], uz = q.z - J[1]; const l = Math.hypot(ux, uz) || 1; ux /= l; uz /= l;
        // sides as seen looking out along the arm: prev = its left, next = its right
        const wayLeftIsPrev = dir > 0;
        arms.push({ W, i, s, dir, ux, uz, ang: Math.atan2(uz, ux), hw: W.hw, len: avail, pPrev: wayLeftIsPrev ? W.pl : W.pr, pNext: wayLeftIsPrev ? W.pr : W.pl,
          oPrev: wayLeftIsPrev ? W.hw : -W.hw, oNext: wayLeftIsPrev ? -W.hw : W.hw, cw: 0, tPrev: 0, tNext: 0, kPrev: 0, kNext: 0 });
      }
    }
    if (arms.length < 2) { this.junctions.set(id, null); return null; }
    const J0 = entries[0].W.pts[entries[0].i]; const Jx = J0[0], Jz = J0[1];
    arms.sort((a, b) => a.ang - b.ang);
    const corners = [];
    for (let k = 0; k < arms.length; k++) {
      const A = arms[k], B = arms[(k + 1) % arms.length];
      let th = B.ang - A.ang; if (k === arms.length - 1) th += Math.PI * 2; if (th <= 0) th += Math.PI * 2;
      const nA = [-A.uz, A.ux], nB = [B.uz, -B.ux]; // A's right (facing B), B's left (facing A)
      const cap = Math.min(0.45 * A.len, 0.45 * B.len, 30);
      const c = { A, B, th, type: 'none' };
      if (th >= 2.79) { c.type = th > 3.32 ? 'wedge' : 'none'; }
      else if (th < 0.61) { // a fork: kerbs and pavements only start once the two carriageways separate
        const sep = Math.min(cap, (A.hw + B.hw + 2 * ROAD.kerbW) / (2 * Math.sin(th / 2)));
        A.kNext = Math.max(A.kNext, sep); B.kPrev = Math.max(B.kPrev, sep); c.type = 'fork';
      } else {
        const PA = [Jx + nA[0] * A.hw, Jz + nA[1] * A.hw], PB = [Jx + nB[0] * B.hw, Jz + nB[1] * B.hw];
        const den = A.ux * B.uz - A.uz * B.ux, wx = PB[0] - PA[0], wz = PB[1] - PA[1];
        const t = (wx * B.uz - wz * B.ux) / den, s = (wx * A.uz - wz * A.ux) / den;
        const major = Math.min(A.W.rank, B.W.rank) >= 5;
        let rc = major ? 10 : A.W.rank <= 1 || B.W.rank <= 1 ? 4 : 6.5;
        const tan2 = Math.tan(th / 2); let d = rc / tan2;
        if (t + d > cap || s + d > cap) { d = Math.max(0, Math.min(cap - t, cap - s)); rc = d * tan2; }
        const tA = Math.max(0, t + d), tB = Math.max(0, s + d);
        A.tNext = Math.max(A.tNext, tA); B.tPrev = Math.max(B.tPrev, tB); A.kNext = Math.max(A.kNext, tA); B.kPrev = Math.max(B.kPrev, tB);
        const TA = [PA[0] + A.ux * (t + d), PA[1] + A.uz * (t + d)], TB = [PB[0] + B.ux * (s + d), PB[1] + B.uz * (s + d)];
        if (rc > 0.3 && t + d >= 0 && s + d >= 0) {
          const C = [TA[0] + nA[0] * rc, TA[1] + nA[1] * rc];
          const a0 = Math.atan2(TA[1] - C[1], TA[0] - C[0]); let a1 = Math.atan2(TB[1] - C[1], TB[0] - C[0]);
          let sweep = a1 - a0; sweep = Math.atan2(Math.sin(sweep), Math.cos(sweep));
          Object.assign(c, { type: 'arc', C, rc, a0, sweep, TA, TB, tA, tB });
        } else Object.assign(c, { type: 'sharp', TA, TB, tA, tB });
      }
      corners.push(c);
    }
    for (const a of arms) a.cw = Math.max(a.tPrev, a.tNext);
    // heights: arm surfaces at the perimeter, the shared node height at the centre
    const yArm = (a, dist, o) => a.W.carriageY(a.s + a.dir * dist, o);
    const Jy = arms[0].W.hc(arms[0].s);
    const P = []; // perimeter [x,z,y] counter-clockwise (increasing angle)
    for (let k = 0; k < arms.length; k++) {
      const A = arms[k], c = corners[k];
      const L = [A.uz, -A.ux], R = [-A.uz, A.ux];
      const pt = (dist, n, o) => [Jx + A.ux * dist + n[0] * A.hw, Jz + A.uz * dist + n[1] * A.hw, yArm(A, dist, o)];
      P.push(pt(A.tPrev, L, A.oPrev), pt(A.cw, L, A.oPrev), pt(A.cw, R, A.oNext), pt(A.tNext, R, A.oNext));
      const yA = yArm(A, A.tNext, A.oNext), B = c.B, yB = yArm(B, B.tPrev, B.oPrev);
      if (c.type === 'arc') {
        const n = Math.max(2, Math.ceil(Math.abs(c.sweep) / 0.12));
        for (let j = 1; j < n; j++) { const f = j / n, an = c.a0 + c.sweep * f; P.push([c.C[0] + Math.cos(an) * c.rc, c.C[1] + Math.sin(an) * c.rc, yA + (yB - yA) * f]); }
        c.yA = yA; c.yB = yB;
      } else if (c.type === 'wedge') {
        const a0 = Math.atan2(A.ux, -A.uz) /* angle of A's right normal */, sweep = c.th - Math.PI, r = (A.hw + B.hw) / 2;
        const n = Math.max(2, Math.ceil(sweep / 0.15));
        for (let j = 1; j < n; j++) { const f = j / n, an = a0 + sweep * f; P.push([Jx + Math.cos(an) * r, Jz + Math.sin(an) * r, yA + (yB - yA) * f]); }
        Object.assign(c, { a0w: a0, sweepW: sweep, rw: r, yA, yB });
      } else { c.yA = yA; c.yB = yB; }
    }
    // corner pavements (kerb top + footway) as ring sectors, so walkers and the ground grading know about them
    const sectors = [];
    for (const k of corners) {
      const pw = Math.max(k.A.pNext, k.B.pPrev); if (!pw) continue;
      k.kh = Math.min(k.A.W.kerbH(k.A.s + k.A.dir * k.A.kNext), k.B.W.kerbH(k.B.s + k.B.dir * k.B.kPrev));
      if (k.type === 'arc') sectors.push({ cx: k.C[0], cz: k.C[1], r0: Math.max(0, k.rc - ROAD.kerbW - pw), r1: k.rc, a0: k.a0, sweep: k.sweep, yA: k.yA, yB: k.yB, kh: k.kh });
      else if (k.type === 'wedge') sectors.push({ cx: Jx, cz: Jz, r0: k.rw, r1: k.rw + ROAD.kerbW + pw, a0: k.a0w, sweep: k.sweepW, yA: k.yA, yB: k.yB, kh: k.kh });
    }
    const core = new JunctionCore(id, Jx, Jz, Jy, P, arms, corners, sectors);
    this.junctions.set(id, core);
    return core;
  }
  /** Make a junction polygon answer height queries (called by the tile that draws it). */
  addCore(core, tileKey) {
    if (this.cores.has(core.id)) return; core.tile = tileKey; this.cores.set(core.id, core);
    const b = core.outer; this.coreGrid.add(b[0], b[1], b[2], b[3], core);
  }
  /** Build (and register) every junction whose node lies in the rect: before the ground mesh, so grading sees them. */
  prepareCores(rect, tileKey) {
    for (const [id, entries] of this.nodeIndex) {
      if (this.cores.has(id) || entries.length < 2) continue;
      const p = entries[0].W.pts[entries[0].i]; if (p[0] < rect.minX || p[0] >= rect.maxX || p[1] < rect.minZ || p[1] >= rect.maxZ) continue;
      const c = this.junction(id); if (c) this.addCore(c, tileKey);
    }
  }
  /** Dead end: a way end whose node no other car way uses. */
  isDeadEnd(W, end) {
    if (!W.ids) return false; const id = W.ids[end ? W.ids.length - 1 : 0]; if (id == null) return false;
    const e = this.nodeIndex.get(id) || []; return e.filter((x) => x.W.car).length === 1 && !(W.ids[0] === W.ids[W.ids.length - 1]);
  }
}

/** Ear-clipping triangulation of a simple polygon given as [x,z,...] points; returns index triples (or null). */
export function earClip(P) {
  const n = P.length; if (n < 3) return null;
  let area = 0; for (let i = 0; i < n; i++) { const a = P[i], b = P[(i + 1) % n]; area += a[0] * b[1] - b[0] * a[1]; }
  const idx = [...Array(n).keys()]; if (area < 0) idx.reverse();
  const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const inside = (p, a, b, c) => cross(a, b, p) >= -1e-9 && cross(b, c, p) >= -1e-9 && cross(c, a, p) >= -1e-9;
  const out = []; let guard = 0;
  while (idx.length > 3 && guard++ < 4 * n * n) {
    let cut = false;
    for (let i = 0; i < idx.length; i++) {
      const i0 = idx[(i + idx.length - 1) % idx.length], i1 = idx[i], i2 = idx[(i + 1) % idx.length];
      const a = P[i0], b = P[i1], c = P[i2]; const cr = cross(a, b, c);
      if (cr <= 1e-9) { if (Math.abs(cr) <= 1e-9) { idx.splice(i, 1); cut = true; break; } continue; } // reflex (or collinear: drop)
      let ok = true; for (const j of idx) { if (j === i0 || j === i1 || j === i2) continue; if (inside(P[j], a, b, c)) { ok = false; break; } }
      if (!ok) continue;
      out.push([i0, i1, i2]); idx.splice(i, 1); cut = true; break;
    }
    if (!cut) return null; // not simple (e.g. overlapping fork arms)
  }
  if (idx.length === 3) out.push([idx[0], idx[1], idx[2]]);
  return out;
}

/** Junction polygon: the perimeter follows the kerb corners; triangulated (ear clipping, or a fan from the node as a fallback). */
export class JunctionCore {
  constructor(id, x, z, y, P, arms, corners, sectors = []) {
    this.id = id; this.x = x; this.z = z; this.y = y; this.arms = arms; this.corners = corners; this.sectors = sectors;
    const Q = []; for (const p of P) { const q = Q[Q.length - 1]; if (!q || Math.hypot(p[0] - q[0], p[1] - q[1]) > 0.02) Q.push(p); }
    if (Q.length > 2 && Math.hypot(Q[0][0] - Q[Q.length - 1][0], Q[0][1] - Q[Q.length - 1][1]) <= 0.02) Q.pop();
    this.P = Q;
    const tri = earClip(Q);
    if (tri) this.tris = tri.map(([a, b, c]) => [Q[a], Q[b], Q[c]]);
    else { const C = [x, z, y]; this.tris = []; for (let i = 0; i < Q.length; i++) { const p = Q[i], q = Q[(i + 1) % Q.length]; if ((p[0] - x) * (q[1] - z) - (q[0] - x) * (p[1] - z) > 1e-9) this.tris.push([C, p, q]); } }
    let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity; for (const p of Q) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); }
    this.bounds = [x0, z0, x1, z1];
    const o = [x0, z0, x1, z1]; for (const c of sectors) { o[0] = Math.min(o[0], c.cx - c.r1); o[1] = Math.min(o[1], c.cz - c.r1); o[2] = Math.max(o[2], c.cx + c.r1); o[3] = Math.max(o[3], c.cz + c.r1); }
    this.outer = o;
  }
  /** Corner pavement height at (x,z), else null. */
  sectorAt(x, z) {
    for (const c of this.sectors) {
      const dx = x - c.cx, dz = z - c.cz, r = Math.hypot(dx, dz); if (r < c.r0 - 1e-6 || r > c.r1 + 1e-6) continue;
      let rel = Math.atan2(dz, dx) - c.a0; rel = Math.atan2(Math.sin(rel), Math.cos(rel));
      const f = rel / c.sweep; if (f < -1e-6 || f > 1 + 1e-6) continue;
      return c.yA + (c.yB - c.yA) * f + c.kh;
    }
    return null;
  }
  /** Height inside the polygon (interpolated on the same triangles that are drawn), else null. */
  heightAt(x, z) {
    const b = this.bounds; if (x < b[0] || x > b[2] || z < b[1] || z > b[3]) return null;
    for (const [p, q, r] of this.tris) {
      const v0x = q[0] - p[0], v0z = q[1] - p[1], v1x = r[0] - p[0], v1z = r[1] - p[1], v2x = x - p[0], v2z = z - p[1];
      const den = v0x * v1z - v1x * v0z; if (Math.abs(den) < 1e-12) continue;
      const a = (v2x * v1z - v1x * v2z) / den, c = (v0x * v2z - v2x * v0z) / den;
      if (a >= -1e-6 && c >= -1e-6 && a + c <= 1 + 1e-6) return p[2] + a * (q[2] - p[2]) + c * (r[2] - p[2]);
    }
    return null;
  }
}
