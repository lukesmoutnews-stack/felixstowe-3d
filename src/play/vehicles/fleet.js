// All vehicles in the town: the player's own, parked ones you can get into, and ambient traffic.

import { Vehicle } from './vehicle.js';
import { VEHICLES } from './specs.js';
import { Traffic } from './traffic.js';

export class Fleet {
  constructor(app) {
    this.app = app; this.vehicles = []; this.driving = null;
    this.traffic = new Traffic(app, this);
  }
  spawn(type, x, z, heading, opts = {}) {
    const v = new Vehicle(this.app.scene, this.app.world, this.app.collision, type, opts);
    v.place(x, z, heading, opts.y ?? null); this.vehicles.push(v);
    v.onImpact = (sp, other) => this.app.hooks?.onVehicleImpact?.(v, sp, other);
    return v;
  }
  remove(v) { const i = this.vehicles.indexOf(v); if (i >= 0) this.vehicles.splice(i, 1); v.remove(); if (this.driving === v) this.driving = null; }

  /** Park a vehicle at the kerb (UK: left-hand side) of the nearest suitable road. */
  parkNear(x, z, type, opts = {}) {
    const s = VEHICLES[type];
    const road = this.app.world.nearestRoad(x, z, 300, (r) => r.car && !r.footOnly && !r.bridge && r.width >= (s.cat === 'car' ? 4.5 : 6));
    if (!road) return null;
    const dx = road.b[0] - road.a[0], dz = road.b[1] - road.a[1], L = Math.hypot(dx, dz) || 1, ux = dx / L, uz = dz / L;
    const off = road.road.width / 2 - s.wid / 2 - 0.25;
    for (const along of [opts.along ?? 0, 10, -10, 20, -20, 30, -30]) {
      const px = road.cx + uz * off + ux * along, pz = road.cz - ux * off + uz * along;
      if (this.vehicles.some((v) => Math.hypot(v.pos.x - px, v.pos.z - pz) < (v.s.len + s.len) / 2 + 1)) continue;
      if (this.app.collision.insideBuilding(px, pz)) continue;
      return this.spawn(type, px, pz, Math.atan2(ux, uz), opts);
    }
    return null;
  }

  /** Vehicles you can get into: parked or your own, stationary, with the driver's door reachable. */
  nearestEnterable(p, range = 2.6) {
    let best = null;
    for (const v of this.vehicles) {
      if (v.owner === 'traffic' || Math.abs(v.speed) > 0.5 || Math.abs(v.pos.y - p.y) > 1.6) continue;
      const [dx, dz] = v.local(v.door.x, v.door.z); const d = Math.hypot(dx - p.x, dz - p.z);
      if (d < range + (v.s.cat === 'bus' ? 1 : 0) && (!best || d < best.d)) best = { v, d };
    }
    return best?.v || null;
  }

  update(dt, ctrl, focus, pedestrians) {
    for (const v of this.vehicles) {
      if (v.owner === 'traffic') continue;
      if (v === this.driving) v.update(dt, ctrl, this.vehicles);
      else if (Math.abs(v.speed) > 0.01 || v.doorT !== v.doorTarget) v.update(dt, { throttle: 0, steer: 0, handbrake: true }, this.vehicles);
    }
    this.traffic.update(dt, focus, pedestrians);
  }
}
