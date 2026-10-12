// Bridge elevation profiles (pure maths, no three.js, so it runs in Node tests). See bridges.js.
import { distToSegment } from '../geo/polygon.js';

export const BRIDGE = {
  grade: 0.06,                                           // max ramp gradient (6 %) where a road deck must be raised
  grades: { road: 0.06, rail: 0.02, foot: 0.083, steps: 0.5 }, // per kind: 1:50 rail, 1:12 ramp, stairs
  depth: { road: 1.1, rail: 1.5, foot: 0.55 },           // structure depth under the running surface (m)
  clearance: { road: 5.1, rail: 4.9, foot: 2.6 },        // headroom wanted over what is crossed (UK: 16'6" ≈ 5.03 m signed limit)
  parapet: { road: 1.15, rail: 1.5, foot: 1.15 },
  signBelow: 5.03,                                       // sign the headroom on the fascia below 16'6"
  step: 1.5,                                             // how far above its current height a mover may "find" a deck
};
const FOOT = /^(footway|path|steps|bridleway|cycleway|pedestrian|track)$/;

/** What kind of deck a way needs. */
export function bridgeKind(w) { if (w.kind === 'rail' || w.tags?.railway) return 'rail'; return FOOT.test(w.kind) ? 'foot' : 'road'; }

function densify(pts, step) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const [x0, z0] = pts[i - 1], [x1, z1] = pts[i], L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.ceil(L / step));
    for (let k = 1; k <= n; k++) out.push([x0 + ((x1 - x0) * k) / n, z0 + ((z1 - z0) * k) / n]);
  }
  return out;
}
function segX(p, q, a, b) { // intersection parameter t on p->q, or null
  const r = [q[0] - p[0], q[1] - p[1]], s = [b[0] - a[0], b[1] - a[1]], d = r[0] * s[1] - r[1] * s[0];
  if (Math.abs(d) < 1e-9) return null;
  const t = ((a[0] - p[0]) * s[1] - (a[1] - p[1]) * s[0]) / d, u = ((a[0] - p[0]) * r[1] - (a[1] - p[1]) * r[0]) / d;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? t : null;
}

/**
 * Elevation profile of one bridge way (whole way, so neighbouring tiles agree).
 * @param way    {id, pts, kind, width, sidewalk, tags?, name}
 * @param ground (x,z) => terrain height
 * @param crossers [{id, pts, kind, width, bridge}] candidate features underneath
 */
export function profileBridge(way, ground, crossers) {
  const kind = bridgeKind(way), depth = BRIDGE.depth[kind];
  const pts = densify(way.pts, 2);
  const s = [0]; for (let i = 1; i < pts.length; i++) s.push(s[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const L = s[s.length - 1];
  const outward = (i, j) => { const dx = pts[i][0] - pts[j][0], dz = pts[i][1] - pts[j][1], l = Math.hypot(dx, dz) || 1; return [dx / l, dz / l]; };
  // The DTM fills the gap under a deck from the ground below, often a few metres past the deck ends,
  // so look up to 14 m outward along the approach for the real embankment/abutment top.
  const endH = (i, j) => { const [ux, uz] = outward(i, j); let h = ground(pts[i][0], pts[i][1]); for (let d = 1; d <= 14; d += 1) h = Math.max(h, ground(pts[i][0] + ux * d, pts[i][1] + uz * d) - 0.02 * d); return h; };
  const hA = endH(0, 1), hB = endH(pts.length - 1, pts.length - 2);
  // what it crosses (from the map data, never invented)
  const crossings = [];
  for (const c of crossers) {
    if (c.id === way.id || c.bridge) continue;
    const ck = c.kind === 'rail' ? 'rail' : FOOT.test(c.kind) ? 'foot' : 'road';
    for (let i = 1; i < pts.length; i++) for (let k = 1; k < c.pts.length; k++) {
      const t = segX(pts[i - 1], pts[i], c.pts[k - 1], c.pts[k]); if (t == null) continue;
      const x = pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, z = pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t;
      const si = s[i - 1] + (s[i] - s[i - 1]) * t;
      if (si < 1 || si > L - 1) continue; // touching at the abutment: a junction, not something underneath
      if (crossings.some((q) => q.id === c.id && Math.abs(q.s - si) < 1.5)) continue; // same crossing hit at a shared vertex
      crossings.push({ s: si, x, z, id: c.id, kind: ck, name: c.name || null, width: c.width || (ck === 'rail' ? 4 : 6), ground: ground(x, z), want: BRIDGE.clearance[ck] });
    }
  }
  // deck top: straight between the real abutment heights, a slight hog on longer road decks,
  // then raised (at the ramp gradient) only where a crossing needs more headroom
  const y = s.map((si) => { const t = L ? si / L : 0; return hA + (hB - hA) * t + (kind !== 'foot' && L > 15 ? 0.22 * Math.sin(Math.PI * t) : 0); });
  const g = way.grade || BRIDGE.grades[kind] || BRIDGE.grade;
  // Railways run on graded embankments that the DTM already holds, so a rail deck is never raised
  // above its measured abutments (the headroom under it is reported as measured instead).
  if (kind !== 'rail') for (const c of crossings) { const need = c.ground + c.want + depth; for (let i = 0; i < y.length; i++) y[i] = Math.max(y[i], need - g * Math.abs(s[i] - c.s)); }
  const prof = { id: way.id, kind, name: way.name || null, pts, s, y, L, depth, crossings, rise: [y[0] - hA, y[y.length - 1] - hB] };
  prof.yAtS = (si) => { si = Math.max(0, Math.min(L, si)); let i = 1; while (i < s.length - 1 && s[i] < si) i++; const t = (si - s[i - 1]) / ((s[i] - s[i - 1]) || 1); return y[i - 1] + (y[i] - y[i - 1]) * t; };
  /** Project (x,z) on the centre line: {y, s, d} */
  prof.project = (x, z) => {
    let best = null;
    for (let i = 1; i < pts.length; i++) { const r = distToSegment(x, z, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]); if (!best || r.d < best.d) best = { d: r.d, s: s[i - 1] + (s[i] - s[i - 1]) * r.t, i }; }
    best.y = prof.yAtS(best.s); return best;
  };
  prof.heightAt = (x, z) => prof.project(x, z).y;
  for (const c of crossings) { c.clearance = prof.yAtS(c.s) - depth - c.ground; }
  return prof;
}

/** Deck half-width: carriageway + pavements + parapet. */
export function deckHalfWidth(way, kind) {
  if (kind === 'rail') return Math.max(2.4, (way.width || 4) / 2 + 0.6);
  if (kind === 'foot') return Math.max(1.0, (way.width || 2) / 2 + 0.2);
  const pw = way.sidewalk && way.sidewalk !== 'no' ? 1.9 : 0.6;
  return way.width / 2 + pw + 0.35;
}


/** Approach ramp on a way that joins a raised deck end: descends from `topY` at the ramp gradient until it meets the ground. */
export function profileApproach(way, fromStart, topY, grade, ground) {
  const src = fromStart ? way.pts : way.pts.slice().reverse();
  const pts = densify(src, 2); const s = [0], y = [];
  for (let i = 1; i < pts.length; i++) s.push(s[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  let n = pts.length;
  for (let i = 0; i < pts.length; i++) { const gy = ground(pts[i][0], pts[i][1]), ry = topY - grade * s[i]; y.push(Math.max(gy, ry)); if (ry <= gy) { n = i + 1; break; } }
  const P = pts.slice(0, n), S = s.slice(0, n), Yv = y.slice(0, n);
  const ap = { id: way.id, ramp: true, kind: bridgeKind(way), pts: P, s: S, y: Yv, L: S[S.length - 1] || 0, topY, grade, full: n === pts.length };
  ap.project = (x, z) => { let best = null; for (let i = 1; i < P.length; i++) { const r = distToSegment(x, z, P[i - 1][0], P[i - 1][1], P[i][0], P[i][1]); if (!best || r.d < best.d) best = { d: r.d, s: S[i - 1] + (S[i] - S[i - 1]) * r.t, i, t: r.t }; } return best; };
  ap.heightAt = (x, z) => { const g = ground(x, z); if (P.length < 2) return g; const b = ap.project(x, z); const i = b.i, ry = Yv[i - 1] + (Yv[i] - Yv[i - 1]) * b.t; return Math.max(g, ry - (ground(P[i][0], P[i][1]) * b.t + ground(P[i - 1][0], P[i - 1][1]) * (1 - b.t)) + g); };
  return ap;
}

/**
 * Profiles for every bridge in a set of ways (roads + railways with OSM node ids).
 * Bridge ways joined end to end (one deck split into several OSM ways, e.g. at a junction on the
 * bridge) are profiled as one chain. Deck ends that must sit above the ground get approach ramps on
 * the ways joining them. Returns Map(wayId -> profile) holding both decks and approaches.
 */
export function profileNetwork(ways, ground) {
  const out = new Map();
  const cls = (w) => (bridgeKind(w) === 'rail' ? 'rail' : 'other');
  const bridges = ways.filter((w) => w.bridge && !w.tunnel && w.pts.length >= 2);
  const ends = new Map(); // nodeId -> bridge ways ending there
  const nid = (w, end) => (w.nodeIds ? (end ? w.nodeIds[w.nodeIds.length - 1] : w.nodeIds[0]) : `${w.pts[end ? w.pts.length - 1 : 0].map((v) => v.toFixed(1))}`);
  for (const w of bridges) for (const e of [0, 1]) { const k = nid(w, e); if (!ends.has(k)) ends.set(k, []); ends.get(k).push(w); }
  const done = new Set();
  for (const w0 of bridges) {
    if (done.has(w0.id)) continue;
    // walk the chain both ways from w0 (only through nodes where exactly two bridge ways of the same class meet)
    let chain = [{ w: w0, fwd: true }]; done.add(w0.id);
    for (const dir of [1, 0]) {
      let cur = chain[dir ? chain.length - 1 : 0];
      for (;;) {
        const node = nid(cur.w, dir ? (cur.fwd ? 1 : 0) : (cur.fwd ? 0 : 1));
        const nb = (ends.get(node) || []).filter((x) => x !== cur.w && !done.has(x.id) && cls(x) === cls(w0));
        if ((ends.get(node) || []).length !== 2 || nb.length !== 1) break;
        const x = nb[0]; const fwd = dir ? nid(x, 0) === node : nid(x, 1) === node;
        const item = { w: x, fwd }; done.add(x.id); if (dir) chain.push(item); else chain.unshift(item); cur = item;
      }
    }
    const pts = []; for (const { w, fwd } of chain) { const p = fwd ? w.pts : w.pts.slice().reverse(); pts.push(...(pts.length ? p.slice(1) : p)); }
    const kinds = chain.map((c) => c.w.kind), main = chain.reduce((a, c) => (c.w.width > a.width ? c.w : a), chain[0].w);
    const grade = kinds.includes('steps') ? BRIDGE.grades.steps : undefined;
    const first = chain[0], last = chain[chain.length - 1];
    const chainWay = { ...main, id: main.id, pts, grade, name: chain.map((c) => c.w.name).find(Boolean) || null };
    const prof = profileBridge(chainWay, ground, ways);
    prof.members = chain.map((c) => c.w.id); prof.way = chainWay;
    prof.endNodes = [nid(first.w, first.fwd ? 0 : 1), nid(last.w, last.fwd ? 1 : 0)];
    for (const c of chain) out.set(c.w.id, prof);
    // approach ramps where the deck end has to sit above the ground
    prof.endNodes.forEach((node, e) => {
      const rise = prof.rise[e]; if (rise < 0.3) return;
      const topY = e ? prof.y[prof.y.length - 1] : prof.y[0];
      // a long ramp carries on along the next way(s) until it meets the ground
      const ramp = (node, topY, depth) => {
        for (const w of ways) {
          if (w.bridge || out.has(w.id) || cls(w) !== cls(w0) || !w.pts.length) continue;
          const atStart = nid(w, 0) === node, atEnd = nid(w, 1) === node; if (!atStart && !atEnd) continue;
          const g = w.kind === 'steps' ? BRIDGE.grades.steps : BRIDGE.grades[bridgeKind(w)];
          const ap = profileApproach(w, atStart, topY, g, ground); out.set(w.id, ap);
          const last = ap.pts[ap.pts.length - 1], yl = ap.y[ap.y.length - 1];
          if (depth < 4 && ap.full && yl > ground(last[0], last[1]) + 0.05) ramp(nid(w, atStart ? 1 : 0), yl, depth + 1);
        }
      };
      ramp(node, topY, 0);
    });
  }
  return out;
}
