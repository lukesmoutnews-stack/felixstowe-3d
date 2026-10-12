// Smooth road centre lines.
//
// OSM draws a road as straight segments between nodes, so every bend is a corner. Here each
// bend that is not a junction is replaced by a circular arc (a fillet) whose radius depends on
// the road class. Junction nodes (shared with another way) and way ends stay exactly where OSM
// puts them, so connected roads still meet and the road graph keeps its topology. Inserted
// points have no OSM node id (null).

/** Design radius (m) for bends on each road class: a few times the turning circle on minor roads, larger on main roads. */
export const BEND_RADIUS = {
  motorway: 120, trunk: 80, motorway_link: 40, trunk_link: 35, primary: 45, primary_link: 25, secondary: 40, secondary_link: 22,
  tertiary: 28, tertiary_link: 18, unclassified: 18, residential: 15, road: 15, living_street: 9, service: 8, track: 10,
  pedestrian: 6, footway: 5, cycleway: 8, path: 5, bridleway: 6, corridor: 3,
};

const SAG = 0.025; // max gap between the arc and its chords (m)

/**
 * @param {number[][]} pts [x,z] polyline
 * @param {Array|null} ids OSM node ids aligned with pts
 * @param {(i:number)=>boolean} fixed true for vertices that must not move (junctions)
 * @param {number} R bend radius
 * @returns {{pts:number[][], nodeIds:Array|null}}
 */
export function filletPolyline(pts, ids, fixed, R) {
  const n = pts.length; if (n < 3 || !(R > 0)) return { pts, nodeIds: ids };
  const out = [pts[0]], oid = [ids ? ids[0] : null];
  for (let i = 1; i < n - 1; i++) {
    const a = pts[i - 1], p = pts[i], c = pts[i + 1];
    const l1 = Math.hypot(p[0] - a[0], p[1] - a[1]), l2 = Math.hypot(c[0] - p[0], c[1] - p[1]);
    const keep = () => { out.push(p); oid.push(ids ? ids[i] : null); };
    if (fixed(i) || l1 < 0.05 || l2 < 0.05) { keep(); continue; }
    const u1 = [(p[0] - a[0]) / l1, (p[1] - a[1]) / l1], u2 = [(c[0] - p[0]) / l2, (c[1] - p[1]) / l2];
    const cross = u1[0] * u2[1] - u1[1] * u2[0], dot = u1[0] * u2[0] + u1[1] * u2[1];
    const th = Math.atan2(Math.abs(cross), dot); // turn angle
    if (th < 0.03 || th > 2.97) { keep(); continue; } // straight, or a hairpin spike (leave as drawn)
    const tan = Math.tan(th / 2);
    // tangent length: limited to half of each neighbouring segment so neighbouring fillets never overlap
    const t = Math.min(R * tan, 0.5 * l1, 0.5 * l2); const r = t / tan;
    if (t < 0.1) { keep(); continue; }
    const s = Math.sign(cross); // +1: turning towards +90deg of u1 in (x,z)
    const nx = -u1[1] * s, nz = u1[0] * s; // from the first tangent point towards the arc centre
    const T1 = [p[0] - u1[0] * t, p[1] - u1[1] * t];
    const C = [T1[0] + nx * r, T1[1] + nz * r];
    const a0 = Math.atan2(T1[1] - C[1], T1[0] - C[0]);
    const step = Math.max(2 * Math.acos(Math.max(-1, 1 - SAG / r)), Math.min(th, 0.6 / r));
    const k = Math.min(32, Math.max(1, Math.ceil(th / step)));
    out.push(T1); oid.push(null);
    for (let j = 1; j < k; j++) { const ang = a0 + s * th * (j / k); out.push([C[0] + Math.cos(ang) * r, C[1] + Math.sin(ang) * r]); oid.push(null); }
    out.push([p[0] + u2[0] * t, p[1] + u2[1] * t]); oid.push(null);
  }
  out.push(pts[n - 1]); oid.push(ids ? ids[n - 1] : null);
  return { pts: out, nodeIds: ids ? oid : null };
}

/**
 * Smooth every road in a feature set in place. Nodes shared between ways (or repeated in one way,
 * or shared with a railway or other line) are junctions and stay fixed; steps are left as drawn.
 */
export function smoothRoads(roads, lines = [], keepIds = []) {
  const use = new Map();
  const count = (ids) => { if (ids) for (const id of ids) use.set(id, (use.get(id) || 0) + 1); };
  for (const r of roads) count(r.nodeIds);
  for (const l of lines) count(l.nodeIds);
  for (const id of keepIds) use.set(id, (use.get(id) || 0) + 2);
  for (const r of roads) {
    if (r.kind === 'steps' || r.pts.length < 3 || r.smoothed) continue;
    const R = BEND_RADIUS[r.kind] ?? 10;
    const ids = r.nodeIds;
    const fixed = (i) => !ids || use.get(ids[i]) > 1;
    const s = filletPolyline(r.pts, ids, fixed, R);
    r.pts = s.pts; r.nodeIds = s.nodeIds; r.smoothed = true;
  }
  return roads;
}
