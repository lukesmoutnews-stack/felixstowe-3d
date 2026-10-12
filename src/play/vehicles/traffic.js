// Ambient traffic on the OSM road graph.
//
// The graph joins ways only where OSM says they share a node, so two roads crossing at different
// levels (a bridge over a road) never form a false junction. Each AI vehicle follows its lane (UK:
// drive on the left) along the way's centre line, taking its height from the bridge/ramp profile
// when the way has one, so it stays on the deck or the road below. AI slows for vehicles ahead,
// stops for people in the road, keeps to road-class speed limits and avoids routes whose headroom
// is too low for its height.

import { VEHICLES } from './specs.js';
import { Vehicle } from './vehicle.js';

const LIMIT = { motorway: 31, trunk: 26, primary: 13.4, secondary: 13.4, tertiary: 13.4, unclassified: 11, residential: 8.9, living_street: 4.5, service: 6.7, road: 8.9,
  motorway_link: 18, trunk_link: 18, primary_link: 13, secondary_link: 13, tertiary_link: 11 }; // m/s (20/30 mph in town, 60 on the A14)
const MIX = [['hatchback', 20], ['saloon', 14], ['family', 12], ['suv', 10], ['taxi', 4], ['sports', 2], ['van', 10], ['parcel', 5], ['boxtruck', 4], ['flatbed', 2], ['refuse', 1], ['roadworks', 1], ['bus', 4], ['doubledecker', 3], ['artic', 4]];
const BIG_ROADS = new Set(['trunk', 'primary', 'secondary', 'trunk_link', 'primary_link', 'motorway', 'motorway_link']);

export class RoadGraph {
  constructor(world) { this.world = world; this.nodes = new Map(); this.edges = []; this.wayIds = new Set(); }
  /** Rebuild from every loaded tile (whole ways, de-duplicated). */
  rebuild() {
    const ways = new Map();
    for (const t of this.world.tiles.values()) for (const r of t.features?.roads || []) if (r.car && !r.footOnly && r.nodeIds && r.kind !== 'track' && !r.tunnel && !ways.has(r.id)) ways.set(r.id, r);
    const deg = new Map(); for (const w of ways.values()) w.nodeIds.forEach((n, i) => { if (n != null) deg.set(n, (deg.get(n) || 0) + (i === 0 || i === w.nodeIds.length - 1 ? 1 : 2)); }); // null: a point added when the bend was smoothed
    this.nodes = new Map(); this.edges = [];
    const node = (id, p) => { if (!this.nodes.has(id)) this.nodes.set(id, { id, x: p[0], z: p[1], out: [] }); return this.nodes.get(id); };
    for (const w of ways.values()) {
      let start = 0;
      for (let i = 1; i < w.nodeIds.length; i++) {
        if (i < w.nodeIds.length - 1 && (w.nodeIds[i] == null || deg.get(w.nodeIds[i]) <= 2)) continue;
        const pts = w.pts.slice(start, i + 1); if (pts.length < 2) { start = i; continue; }
        let len = 0; const cum = [0]; for (let k = 1; k < pts.length; k++) { len += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]); cum.push(len); }
        const a = node(w.nodeIds[start], pts[0]), b = node(w.nodeIds[i], pts[pts.length - 1]);
        const e = { id: this.edges.length, way: w, a, b, pts, cum, len, oneway: w.oneway, limit: LIMIT[w.kind] || 8.9, big: BIG_ROADS.has(w.kind), headroom: Infinity };
        this.edges.push(e); a.out.push({ e, dir: 1 }); if (!w.oneway) b.out.push({ e, dir: -1 });
        start = i;
      }
    }
    // headroom where an edge passes under a bridge deck (from the bridge profiles)
    for (const c of this.world.clearances || []) for (const e of this.edges) if (e.way.id === c.under) e.headroom = Math.min(e.headroom, c.clearance);
    this.wayIds = new Set(ways.keys());
    return this;
  }
  /** Point, tangent and height at distance s along an edge (dir: 1 a->b, -1 b->a), offset to the left lane. */
  sample(e, s, dir, lane) {
    const d = dir > 0 ? s : e.len - s; let k = 1; while (k < e.cum.length - 1 && e.cum[k] < d) k++;
    const t = (d - e.cum[k - 1]) / ((e.cum[k] - e.cum[k - 1]) || 1), p = e.pts[k - 1], q = e.pts[k];
    let ux = q[0] - p[0], uz = q[1] - p[1]; const L = Math.hypot(ux, uz) || 1; ux /= L; uz /= L; if (dir < 0) { ux = -ux; uz = -uz; }
    const x = p[0] + (q[0] - p[0]) * t + uz * lane, z = p[1] + (q[1] - p[1]) * t - ux * lane;
    const prof = this.world.profiles?.get(e.way.id);
    return { x, z, ux, uz, heading: Math.atan2(ux, uz), y: prof ? prof.heightAt(x, z) : this.world.surfaceAt(x, z) };
  }
}

export class Traffic {
  constructor(app, fleet) { this.app = app; this.fleet = fleet; this.graph = new RoadGraph(app.world); this.agents = []; this.dirty = true; this.max = 10; this.timer = 0; this.rng = mulberry(1234); this.enabled = true;
    app.world.addEventListener('tileloaded', () => { this.dirty = true; }); app.world.addEventListener('tileunloaded', () => { this.dirty = true; }); }
  pickType(edge) {
    const pool = MIX.filter(([t]) => edge.big || !['artic', 'refuse'].includes(t)).filter(([t]) => edge.headroom > VEHICLES[t].hgt + (VEHICLES[t].trailer ? 0.3 : 0) + 0.2);
    let r = this.rng() * pool.reduce((s, [, w]) => s + w, 0); for (const [t, w] of pool) if ((r -= w) <= 0) return t; return 'hatchback';
  }
  spawnOne(focus) {
    const g = this.graph; if (!g.edges.length) return;
    for (let tries = 0; tries < 12; tries++) {
      const e = g.edges[Math.floor(this.rng() * g.edges.length)]; if (e.len < 12) continue;
      const mid = e.pts[Math.floor(e.pts.length / 2)], d = Math.hypot(mid[0] - focus.x, mid[1] - focus.z);
      if (d < 70 || d > 260) continue;
      const type = this.pickType(e), dir = e.oneway || this.rng() < 0.5 ? 1 : -1, s = 4 + this.rng() * (e.len - 8);
      const lane = e.oneway ? 0 : Math.min(e.way.width / 4, 1.9);
      const p = g.sample(e, s, dir, lane);
      if (this.fleet.vehicles.some((v) => Math.hypot(v.pos.x - p.x, v.pos.z - p.z) < 14)) continue;
      if (this.app.collision.insideBuilding(p.x, p.z)) continue;
      const v = this.fleet.spawn(type, p.x, p.z, p.heading, { owner: 'traffic', seed: this.rng(), y: p.y + 0.5 });
      this.agents.push({ v, e, dir, s, lane, speed: Math.min(e.limit, VEHICLES[type].vmax) * 0.7, wait: 0 });
      return;
    }
  }
  nextEdge(ag) {
    const node = ag.dir > 0 ? ag.e.b : ag.e.a, h = VEHICLES[ag.v.type].hgt + (ag.v.trailer ? 0.3 : 0);
    let opts = node.out.filter((o) => o.e !== ag.e && o.e.headroom > h + 0.2 && (o.e.big || !['artic'].includes(ag.v.type) || ag.e.big));
    if (!opts.length) opts = node.out.filter((o) => o.e === ag.e); // dead end: turn round
    if (!opts.length) return null;
    // prefer going roughly straight on, but take turns too
    const cur = this.graph.sample(ag.e, ag.e.len - 0.1, ag.dir, 0);
    const score = (o) => { const p = this.graph.sample(o.e, 0.1, o.dir, 0); const dot = p.ux * cur.ux + p.uz * cur.uz; return dot + this.rng() * 1.2; };
    return opts.sort((a, b) => score(b) - score(a))[0];
  }
  update(dt, focus, pedestrians = []) {
    if (!this.enabled) return;
    if (this.dirty) { this.graph.rebuild(); this.dirty = false; for (const a of this.agents.slice()) if (!this.graph.wayIds.has(a.e.way.id)) this.despawn(a); }
    this.timer += dt;
    if (this.timer > 0.6) { this.timer = 0; if (this.agents.length < this.max) this.spawnOne(focus); for (const a of this.agents.slice()) if (Math.hypot(a.v.pos.x - focus.x, a.v.pos.z - focus.z) > 330) this.despawn(a); }
    const all = this.fleet.vehicles;
    for (const ag of this.agents) {
      const v = ag.v, s = VEHICLES[v.type], [fx, fz] = v.forward();
      // look ahead: vehicles and people in our lane, on our level
      let want = Math.min(ag.e.limit, s.vmax), gap = Infinity;
      const look = 6 + ag.speed * ag.speed / (2 * s.brake) + s.len;
      for (const o of all) {
        if (o === v || Math.abs(o.pos.y - v.pos.y) > 2.5) continue;
        const dx = o.pos.x - v.pos.x, dz = o.pos.z - v.pos.z, along = dx * fx + dz * fz, side = Math.abs(dx * fz - dz * fx);
        if (along > 0 && along < look + o.s.len && side < 2.2) gap = Math.min(gap, along - (s.len + o.s.len) / 2);
      }
      for (const p of pedestrians) {
        if (Math.abs(p.y - v.pos.y) > 2.5) continue;
        const dx = p.x - v.pos.x, dz = p.z - v.pos.z, along = dx * fx + dz * fz, side = Math.abs(dx * fz - dz * fx);
        if (along > 0 && along < look + 4 && side < 2.6) gap = Math.min(gap, along - s.len / 2 - 2);
      }
      if (gap < Infinity) want = Math.min(want, Math.max(0, (gap - 3) * 0.6));
      const remain = ag.e.len - ag.s; if (remain < 18) want = Math.min(want, 6 + remain * 0.4); // ease off into junctions
      const acc = want > ag.speed ? s.accel : -s.brake;
      ag.speed = Math.max(0, Math.min(want, ag.speed + acc * dt));
      if (ag.speed > want) ag.speed = want;
      ag.s += ag.speed * dt;
      if (ag.turn) ag.turn.d += ag.speed * dt;
      // plan the next edge before the junction, and drive a smooth curve from lane to lane through it
      const TR = (e) => Math.min(9, e.len * 0.45);
      if (!ag.next && !ag.turn && ag.e.len - ag.s < TR(ag.e)) {
        ag.next = this.nextEdge(ag);
        if (ag.next) {
          const g = this.graph, n = ag.next, lane2 = n.e.oneway ? 0 : Math.min(n.e.way.width / 4, 1.9), t1 = TR(ag.e), t2 = TR(n.e);
          const P0 = g.sample(ag.e, ag.e.len - t1, ag.dir, ag.lane), A = g.sample(ag.e, ag.e.len, ag.dir, ag.lane), B = g.sample(n.e, 0, n.dir, lane2), P2 = g.sample(n.e, t2, n.dir, lane2);
          const C = { x: (A.x + B.x) / 2, z: (A.z + B.z) / 2 };
          const L = Math.hypot(C.x - P0.x, C.z - P0.z) + Math.hypot(P2.x - C.x, P2.z - C.z);
          ag.turn = { P0, C, P2, L: Math.max(L, 1), d: Math.max(0, ag.s - (ag.e.len - t1)) };
        }
      }
      while (ag.s > ag.e.len) {
        const n = ag.next || this.nextEdge(ag); ag.next = null; if (!n) { ag.s = ag.e.len; ag.speed = 0; break; }
        ag.s -= ag.e.len; ag.e = n.e; ag.dir = n.dir; ag.lane = n.e.oneway ? 0 : Math.min(n.e.way.width / 4, 1.9);
      }
      let p;
      if (ag.turn && ag.turn.d < ag.turn.L) {
        const { P0, C, P2 } = ag.turn, u = ag.turn.d / ag.turn.L, a = (1 - u) * (1 - u), b = 2 * u * (1 - u), c = u * u;
        const x = a * P0.x + b * C.x + c * P2.x, z = a * P0.z + b * C.z + c * P2.z;
        let ux = 2 * (1 - u) * (C.x - P0.x) + 2 * u * (P2.x - C.x), uz = 2 * (1 - u) * (C.z - P0.z) + 2 * u * (P2.z - C.z); const l = Math.hypot(ux, uz) || 1; ux /= l; uz /= l;
        p = { x, z, ux, uz, heading: Math.atan2(ux, uz), y: this.app.world.surfaceAt(x, z, v.pos.y) };
      } else { ag.turn = null; p = this.graph.sample(ag.e, ag.s, ag.dir, ag.lane); }
      // smooth heading changes at corners
      let dh = Math.atan2(Math.sin(p.heading - v.heading), Math.cos(p.heading - v.heading));
      const prevSpeed = v.speed;
      v.heading += dh * Math.min(1, dt * 6); v.speed = ag.speed; v.accel = (ag.speed - prevSpeed) / Math.max(dt, 1e-4); v.yawRate = dh * 6; v.latAcc = v.speed * v.yawRate * 0.3;
      v.steer = Math.max(-s.steer, Math.min(s.steer, Math.atan(dh * 6 * s.wb / Math.max(1, v.speed))));
      v.pos.set(p.x, p.y, p.z); v.braking = acc < 0 && ag.speed > 0.2; v.reversing = false;
      if (v.trailer) v._trailerStep(dt);
      v.syncMesh(dt);
    }
  }
  despawn(a) { this.agents.splice(this.agents.indexOf(a), 1); this.fleet.remove(a.v); }
  clear() { for (const a of this.agents.slice()) this.despawn(a); }
}

function mulberry(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
