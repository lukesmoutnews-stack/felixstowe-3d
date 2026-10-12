// People in the 3D town: a few named residents with homes and routines (registered by the game
// layer), plus ambient passers-by near the player. Everyone keeps to walkable ground off the
// carriageway, avoids buildings, vehicles and each other, and stops to face you when you talk.
// The active count is capped for performance; people far from the player are culled.

import * as THREE from 'three';
import { buildHumanoid, animateHumanoid, SKIN, HAIR, HAIR_COLOURS } from './humanoid.js';

const RADIUS = 0.3, WALK = 1.25;

function randomLook(rnd) {
  const pick = (a) => a[Math.floor(rnd() * a.length) % a.length];
  const outer = rnd() < 0.55 ? pick(['raincoat', 'peacoat', null]) : null;
  return { body: pick(['a', 'b', 'c']), height: 0.92 + rnd() * 0.14, build: 0.9 + rnd() * 0.25, skin: Math.floor(rnd() * SKIN.length), hair: pick(HAIR), hairColour: Math.floor(rnd() * 8),
    facial: rnd() < 0.18 ? pick(['stubble', 'beard', 'moustache']) : 'none', glasses: rnd() < 0.22, top: rnd() < 0.3 ? 'breton' : 'tee',
    topColour: pick([0x24395c, 0xb3262b, 0x2e8a57, 0xe9e6df, 0x7a5c99, 0x2b2d31, 0xf2b632]), outer, outerColour: pick([0x24395c, 0x3d5a40, 0x8a8f96, 0xe0604f, 0x5c4033, 0x0e7c7b]),
    legs: pick(['jeans', 'trousers', 'trousers', 'skirt', 'shorts']), legsColour: pick([0x3a4f6b, 0x2b2b30, 0x6b5b45, 0x8a8f96]), shoes: pick([0x1a1a1a, 0xf4f2ee, 0x5c4033]), bag: rnd() < 0.25 };
}

export class Person {
  constructor(app, look, opts = {}) {
    this.app = app; this.model = buildHumanoid(look); this.mesh = this.model.group; app.scene.add(this.mesh);
    this.pos = new THREE.Vector3(); this.heading = 0; this.speed = 0; this.phase = Math.random() * 6; this.target = null; this.wait = 0;
    this.home = opts.home || null; this.roam = opts.roam ?? 18; this.def = opts.def || null; this.name = opts.name || null; this.talkable = !!opts.def; this.talking = false;
    this.mesh.userData.person = this;
  }
  place(x, z) { this.pos.set(x, this.app.world.surfaceAt(x, z), z); this.mesh.position.copy(this.pos); }
  remove() { this.app.scene.remove(this.mesh); }
}

export class Crowd {
  constructor(app) {
    this.app = app; this.people = []; this.named = new Map(); this.ambientMax = app.settings?.viewDistance < 1000 ? 6 : 10; this.timer = 0; this.seed = 99; this.enabled = true;
  }
  rnd() { this.seed = (this.seed * 16807) % 2147483647; return this.seed / 2147483647; }
  /** Is this a sensible place to stand or walk? (walkable, not in a building, not on a carriageway) */
  ok(x, z, y = null) {
    const W = this.app.world;
    if (!W.isWalkable(x, z, y)) return false;
    if (this.app.collision.insideBuilding(x, z)) return false;
    const r = W.nearestRoad(x, z, 12, (rd) => rd.car && !rd.footOnly);
    if (r && r.d < r.road.width / 2 + 0.25) return false;
    return !this.app.collision.resolve(x, z, RADIUS, y ?? W.ground(x, z), (y ?? W.ground(x, z)) + 1.7).hit;
  }
  /** A pavement spot near (x,z). */
  spotNear(x, z, radius = 20) {
    for (let k = 0; k < 30; k++) { const a = this.rnd() * Math.PI * 2, d = 2 + this.rnd() * radius, px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d; if (this.ok(px, pz)) return [px, pz]; }
    const s = this.app.findStandingSpot(x, z); return s ? [s.x, s.z] : null;
  }
  /** A named resident who lives around (x,z). */
  addNamed(def, x, z) {
    if (this.named.has(def.id)) return this.named.get(def.id);
    const p = new Person(this.app, def.look, { def, name: def.name, home: [x, z], roam: def.roam ?? 10 });
    const s = this.spotNear(x, z, 8) || [x, z]; p.place(s[0], s[1]); this.people.push(p); this.named.set(def.id, p); return p;
  }
  removeNamed(id) { const p = this.named.get(id); if (!p) return; p.remove(); this.people.splice(this.people.indexOf(p), 1); this.named.delete(id); }
  positions() { return this.people.filter((p) => p.mesh.visible).map((p) => p.pos); }
  nearestTalkable(pos, range = 2.6) {
    let best = null; for (const p of this.people) { if (!p.talkable || !p.mesh.visible) continue; const d = Math.hypot(p.pos.x - pos.x, p.pos.z - pos.z); if (d < range && Math.abs(p.pos.y - pos.y) < 1.5 && (!best || d < best.d)) best = { p, d }; }
    return best?.p || null;
  }
  update(dt, focus) {
    if (!this.enabled) return;
    this.timer += dt;
    if (this.timer > 0.8) {
      this.timer = 0;
      const ambient = this.people.filter((p) => !p.def);
      if (ambient.length < this.ambientMax) { const s = this.spotNear(focus.x, focus.z, 70); if (s && Math.hypot(s[0] - focus.x, s[1] - focus.z) > 25) { const p = new Person(this.app, randomLook(() => this.rnd()), { roam: 40 }); p.home = s; p.place(s[0], s[1]); this.people.push(p); } }
      for (const p of ambient) if (Math.hypot(p.pos.x - focus.x, p.pos.z - focus.z) > 140) { p.remove(); this.people.splice(this.people.indexOf(p), 1); }
    }
    const vehicles = this.app.fleet?.vehicles || [];
    for (const p of this.people) {
      const far = Math.hypot(p.pos.x - focus.x, p.pos.z - focus.z); p.mesh.visible = far < 220; if (!p.mesh.visible) continue;
      if (p.talking) { // face the player and gesture
        const pl = this.app.player.pos; const want = Math.atan2(pl.x - p.pos.x, pl.z - p.pos.z); p.heading += Math.atan2(Math.sin(want - p.heading), Math.cos(want - p.heading)) * Math.min(1, dt * 6);
        p.speed = 0; animateHumanoid(p.model, p.phase, 0, dt, { talk: true }); p.mesh.rotation.y = p.heading; continue;
      }
      if (!p.target || p.wait > 0) { p.wait -= dt; if (p.wait <= 0 && (!p.target)) { const s = this.spotNear(p.home[0], p.home[1], p.roam); if (s) p.target = s; p.wait = 0; } }
      let sp = 0;
      if (p.target && p.wait <= 0) {
        const dx = p.target[0] - p.pos.x, dz = p.target[1] - p.pos.z, d = Math.hypot(dx, dz);
        if (d < 0.6) { p.target = null; p.wait = 2 + this.rnd() * (p.def ? 8 : 4); }
        else {
          let vx = dx / d, vz = dz / d;
          // keep clear of other people and of moving vehicles (stop and wait for traffic)
          for (const o of this.people) { if (o === p) continue; const ox = p.pos.x - o.pos.x, oz = p.pos.z - o.pos.z, od = Math.hypot(ox, oz); if (od < 1.2 && od > 1e-3) { vx += (ox / od) * (1.2 - od) * 1.5; vz += (oz / od) * (1.2 - od) * 1.5; } }
          let blocked = false; for (const v of vehicles) { if (Math.abs(v.pos.y - p.pos.y) > 2) continue; const vd = Math.hypot(v.pos.x - p.pos.x, v.pos.z - p.pos.z); if (vd < v.s.len / 2 + 2.5 && Math.abs(v.speed) > 0.3) blocked = true; }
          const L = Math.hypot(vx, vz) || 1; vx /= L; vz /= L; sp = blocked ? 0 : WALK * (p.def ? 0.85 : 1);
          const nx = p.pos.x + vx * sp * dt, nz = p.pos.z + vz * sp * dt;
          if (sp && this.app.world.isWalkable(nx, nz, p.pos.y) && !this.app.collision.insideBuilding(nx, nz)) {
            const r = this.app.collision.resolve(nx, nz, RADIUS, p.pos.y, p.pos.y + 1.7); const road = this.app.world.nearestRoad(r.x, r.z, 10, (rd) => rd.car && !rd.footOnly);
            if (road && road.d < road.road.width / 2 + 0.2) { p.target = null; p.wait = 1; } // never step into the carriageway
            else { p.pos.x = r.x; p.pos.z = r.z; p.heading = Math.atan2(vx, vz); }
          } else { p.target = null; p.wait = 1; }
        }
      }
      const gy = this.app.world.surfaceAt(p.pos.x, p.pos.z, p.pos.y); p.pos.y = gy;
      p.speed = sp; p.phase += sp * dt * 2.6;
      animateHumanoid(p.model, p.phase, sp, dt);
      p.mesh.position.copy(p.pos); p.mesh.rotation.y = p.heading;
    }
  }
}
