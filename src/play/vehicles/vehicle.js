// Drivable vehicle: bicycle-model steering with grip-limited cornering, engine/brake/drag/slope
// longitudinal dynamics, spring-damper body motion, per-wheel suspension travel, trailer
// articulation (kingpin kinematics) and layered-surface ground following, so a vehicle on a
// bridge stays on the deck and one underneath stays on the road below.
//
// Collision is a chain of circles along the body with a vertical extent equal to the vehicle's
// height, tested against walls, posts, parapets and bridge slabs (too-tall vehicles are stopped
// by the slab edge) and against other vehicles.

import * as THREE from 'three';
import { VEHICLES, driverSeat, doorPoint } from './specs.js';
import { buildModel, trailerModel } from './models.js';

const G = 9.81;
let NEXT = 1;

export class Vehicle {
  constructor(scene, world, collision, type = 'hatchback', opts = {}) {
    this.id = NEXT++; this.type = type; this.s = VEHICLES[type]; this.world = world; this.collision = collision; this.scene = scene;
    this.colour = opts.colour ?? this.s.colours[Math.floor((opts.seed ?? Math.random()) * this.s.colours.length) % this.s.colours.length];
    this.owner = opts.owner || 'parked'; // player | parked | traffic | yours
    const m = buildModel(this.s, this.colour); this.mesh = m.group; this.parts = m.parts; this.mesh.rotation.order = 'YXZ'; scene.add(this.mesh);
    this.mesh.userData.vehicle = this;
    this.pos = new THREE.Vector3(); this.heading = 0; this.speed = 0; this.steer = 0; this.yawRate = 0; this.accel = 0; this.latAcc = 0;
    this.wheelSpin = 0; this.offRoad = false; this.bumps = 0; this.impacts = 0; this.lastImpact = 0;
    this.sus = { p: 0, vp: 0, r: 0, vr: 0 }; this.groundPitch = 0; this.groundRoll = 0;
    this.doorT = 0; this.doorTarget = 0; this.braking = false; this.reversing = false; this.headOn = false; this.blocked = 0;
    this.seat = driverSeat(this.s); this.door = doorPoint(this.s);
    if (this.s.trailer) { const t = trailerModel(this.s.trailer, opts.containerColour ?? [0x9c2a22, 0x1f4e8c, 0x2f6b3a, 0x7a7d80][this.id % 4]); this.trailer = { ...this.s.trailer, mesh: t.group, parts: t.parts, heading: 0, pos: new THREE.Vector3() }; t.group.rotation.order = 'YXZ'; scene.add(t.group); }
    this.radius = this.s.wid / 2;
  }
  get height() { return this.trailer ? Math.max(this.s.hgt, this.trailer.hgt) : this.s.hgt; }
  forward() { return [Math.sin(this.heading), Math.cos(this.heading)]; }
  /** World point from local (x right-hand -x is driver side, z forward). */
  local(x, z, h = this.heading) { const c = Math.cos(h), s = Math.sin(h); return [this.pos.x + x * c + z * s, this.pos.z - x * s + z * c]; }
  hitch() { return this.local(0, -this.s.len / 2 + 1.5); }

  place(x, z, heading, y = null) {
    this.pos.set(x, this.world.surfaceAt(x, z, y), z); this.heading = heading; this.speed = 0; this.steer = 0; this.visY = null;
    if (this.trailer) { this.trailer.heading = heading; const [hx, hz] = this.hitch(); this.trailer.pos.set(hx, this.pos.y, hz); }
    this.syncMesh(0);
  }
  remove() { this.scene.remove(this.mesh); if (this.trailer) this.scene.remove(this.trailer.mesh); }
  setVisible(v) { this.mesh.visible = v; if (this.trailer) this.trailer.mesh.visible = v; }

  /** Controls from keyboard, on-screen joystick or gamepad. */
  static controls(input, active) {
    if (!active) return { throttle: 0, steer: 0, handbrake: false };
    const a = input.axis(); let throttle = a.f, steer = -a.s, handbrake = input.down('Space');
    const pad = input.pad?.(); if (pad) { throttle = (pad.rt - pad.lt) || throttle; steer = -pad.lx || steer; handbrake ||= pad.a; }
    return { throttle, steer, handbrake };
  }

  /** Circles (world) covering the body, and the trailer if any. */
  circles() {
    const out = [], n = Math.max(2, Math.ceil(this.s.len / this.s.wid)), r = this.radius;
    for (let i = 0; i < n; i++) { const z = -this.s.len / 2 + r + (i * (this.s.len - 2 * r)) / (n - 1); const [x, zz] = this.local(0, z); out.push({ x, z: zz, r, y0: this.pos.y, y1: this.pos.y + this.s.hgt, v: this }); }
    if (this.trailer) { const t = this.trailer, tn = Math.ceil(t.len / t.wid); for (let i = 0; i < tn; i++) { const z = t.kingpin - t.wid / 2 - (i * (t.len - t.wid)) / Math.max(1, tn - 1); const c = Math.cos(t.heading), s = Math.sin(t.heading); out.push({ x: t.pos.x + z * s, z: t.pos.z + z * c, r: t.wid / 2, y0: t.pos.y, y1: t.pos.y + t.hgt, v: this, trailer: true }); } }
    return out;
  }

  update(dt, ctrl, others = []) {
    const s = this.s, { throttle = 0, steer: st = 0, handbrake = false } = ctrl;
    const road = this.world.nearestRoad(this.pos.x, this.pos.z, 14, (r) => !r.footOnly || r.kind === 'pedestrian');
    this.offRoad = !road || road.d > road.road.width / 2 + 1.2;
    const vmax = s.vmax * (this.offRoad ? 0.45 : 1);
    // --- longitudinal ---
    let a = 0; this.braking = false; this.reversing = false;
    if (throttle > 0.02) { if (this.speed < -0.3) { a = s.brake * throttle; this.braking = true; } else a = s.accel * throttle * Math.max(0, 1 - Math.max(0, this.speed) / vmax); }
    else if (throttle < -0.02) { if (this.speed > 0.3) { a = -s.brake * -throttle; this.braking = true; } else { a = s.accel * 0.6 * throttle * Math.max(0, 1 - Math.max(0, -this.speed) / (vmax * 0.22)); this.reversing = true; } }
    const heavy = Math.max(1, s.mass / 1500);
    const resist = (0.13 + (this.offRoad ? 1.6 : 0)) + (0.38 / heavy) * this.speed * this.speed * 0.012 * (s.cat === 'car' ? 1 : 1.9);
    if (Math.abs(this.speed) > 0.05) a -= Math.sign(this.speed) * resist;
    if (handbrake) { a -= Math.sign(this.speed) * 7; this.braking = true; }
    a -= G * Math.sin(this.groundPitch) * 0.85; // gravity on slopes and bridge ramps
    const before = this.speed; this.speed += a * dt;
    if ((throttle === 0 || handbrake) && Math.sign(before) !== Math.sign(this.speed) && Math.abs(before) < 1.5) this.speed = 0;
    if (Math.abs(this.speed) < 0.04 && Math.abs(throttle) < 0.02) this.speed = 0;
    this.speed = THREE.MathUtils.clamp(this.speed, -vmax * 0.25, vmax + 0.5); this.accel = (this.speed - before) / Math.max(dt, 1e-4);
    // --- steering: speed-sensitive, limited by available grip ---
    const v = Math.abs(this.speed);
    let target = st * s.steer / (1 + v * 0.045);
    if (v > 3) target = THREE.MathUtils.clamp(target, -Math.atan((s.grip * s.wb) / (v * v)), Math.atan((s.grip * s.wb) / (v * v)));
    const rate = (s.cat === 'car' ? 2.2 : 1.3) * dt;
    this.steer += THREE.MathUtils.clamp(target - this.steer, -rate, rate);
    this.yawRate = (this.speed / s.wb) * Math.tan(this.steer) * (handbrake && v > 4 ? 1.35 : 1);
    this.latAcc = this.speed * this.yawRate;
    // --- integrate with collision in small steps ---
    const steps = Math.max(1, Math.ceil(Math.abs(this.speed * dt) / 0.25));
    for (let i = 0; i < steps; i++) {
      const h = dt / steps, nh = this.heading + this.yawRate * h;
      const fx = Math.sin(nh), fz = Math.cos(nh);
      let nx = this.pos.x + fx * this.speed * h, nz = this.pos.z + fz * this.speed * h;
      const half = s.len / 2 - 0.3, front = [nx + fx * half, nz + fz * half], rear = [nx - fx * half, nz - fz * half];
      const lead = this.speed >= 0 ? front : rear;
      const dy = this.world.surfaceAt(lead[0], lead[1], this.pos.y) - this.pos.y;
      if (!this.world.isWalkable(...front, this.pos.y) || !this.world.isWalkable(...rear, this.pos.y) || dy > 0.6) { this._impact(this.speed * 0.85); this.speed *= -0.12; this.bumps++; break; }
      const save = { x: this.pos.x, z: this.pos.z, h: this.heading };
      this.pos.x = nx; this.pos.z = nz; this.heading = nh;
      let pushX = 0, pushZ = 0, hit = false, nrm = [0, 0];
      for (const c of this.circles()) {
        if (c.trailer) continue;
        const r = this.collision.resolve(c.x, c.z, c.r, c.y0 + 0.35, c.y1, 2);
        if (r.hit) { pushX += r.x - c.x; pushZ += r.z - c.z; hit = true; nrm = r.normal; }
      }
      if (hit) {
        const into = Math.abs(fx * nrm[0] + fz * nrm[1]);
        this.pos.x += pushX; this.pos.z += pushZ; this._impact(this.speed * into); this.speed *= 1 - 0.75 * into; if (Math.abs(this.speed) > 3) this.bumps++;
        if (this.collision.insideBuilding(this.pos.x, this.pos.z, this.pos.y + 0.5)) { this.pos.x = save.x; this.pos.z = save.z; this.heading = save.h; this.speed = 0; break; }
      }
      this._trailerStep(h);
    }
    // --- other vehicles ---
    for (const o of others) {
      if (o === this || Math.hypot(o.pos.x - this.pos.x, o.pos.z - this.pos.z) > (this.s.len + o.s.len) / 2 + (this.trailer ? 14 : 0) + (o.trailer ? 14 : 0)) continue;
      if (Math.abs(o.pos.y - this.pos.y) > 3) continue; // different level (bridge above / road below)
      for (const a1 of this.circles()) for (const b1 of o.circles()) {
        const dx = a1.x - b1.x, dz = a1.z - b1.z, d = Math.hypot(dx, dz), min = a1.r + b1.r;
        if (d >= min || d < 1e-6) continue;
        const push = min - d, wa = o.s.mass / (o.s.mass + this.s.mass), wb = 1 - wa;
        this.pos.x += (dx / d) * push * wa; this.pos.z += (dz / d) * push * wa; o.pos.x -= (dx / d) * push * wb; o.pos.z -= (dz / d) * push * wb;
        const rel = Math.abs(this.speed - o.speed); this._impact(rel, o); o._impact(rel, this);
        const vm = (this.speed * this.s.mass + o.speed * o.s.mass) / (this.s.mass + o.s.mass); this.speed = vm * 0.6; o.speed = vm * 0.6;
      }
    }
    // --- doors, lights ---
    this.doorT += THREE.MathUtils.clamp(this.doorTarget - this.doorT, -dt * 3.2, dt * 3.2);
    this.syncMesh(dt);
  }
  _impact(v, other = null) { const sp = Math.abs(v); if (sp > 2.5) { this.impacts++; this.lastImpact = { speed: sp, other: other?.id || null, t: performance.now() }; this.onImpact?.(sp, other); } }

  _trailerStep(h) {
    const t = this.trailer; if (!t) return;
    const s = this.s, rearAxleZ = s.len / 2 - 1.15 - s.wb, hitchZ = -s.len / 2 + 1.5, d = rearAxleZ - hitchZ; // hitch offset from the drive axle
    const rel = this.heading - t.heading, Lt = t.axleBack - t.kingpin * 0;
    t.heading += ((this.speed * Math.sin(rel) - d * this.yawRate * Math.cos(rel)) / Lt) * h;
    let r2 = Math.atan2(Math.sin(this.heading - t.heading), Math.cos(this.heading - t.heading));
    if (Math.abs(r2) > 1.25) { t.heading = this.heading - Math.sign(r2) * 1.25; this.speed *= 0.6; } // jackknife limit
    const [hx, hz] = this.hitch(); t.pos.x = hx; t.pos.z = hz;
    // trailer against the world: stop the rig if the trailer hits something solid
    const c = Math.cos(t.heading), sn = Math.sin(t.heading);
    for (let k = 1; k <= 3; k++) { const zl = -k * (t.len / 3.2); const x = hx + zl * sn, z = hz + zl * c; const r = this.collision.resolve(x, z, t.wid / 2 - 0.1, t.pos.y + 0.4, t.pos.y + t.hgt, 1); if (r.hit) { this.speed *= 0.5; this._impact(this.speed); break; } }
  }

  syncMesh(dt) {
    const s = this.s, [fx, fz] = this.forward(), rx = fz, rz = -fx;
    const W = this.world, y0 = this.pos.y;
    const gyAt = (x, z) => W.surfaceAt(x, z, y0);
    // wheel contact heights -> body plane
    const wh = this.parts.wheels.map((w) => { const [x, z] = this.local(w.x, w.z); return gyAt(x, z); });
    const fr = this.parts.wheels.map((w, i) => ({ w, y: wh[i] }));
    const avg = (f) => { const a = fr.filter(f); return a.length ? a.reduce((t, q) => t + q.y, 0) / a.length : y0; };
    const yF = avg((q) => q.w.front), yR = avg((q) => !q.w.front), yL = avg((q) => q.w.x > 0), yRt = avg((q) => q.w.x < 0);
    const zF = this.parts.wheels.find((w) => w.front)?.z ?? s.wb / 2, zR = Math.min(...this.parts.wheels.filter((w) => !w.front).map((w) => w.z));
    this.groundPitch = Math.atan2(yF - yR, zF - zR); this.groundRoll = Math.atan2(yL - yRt, s.track);
    this.pos.y = Math.max((yF + yR) / 2, gyAt(this.pos.x, this.pos.z) - 0.05);
    // spring-damper body motion from acceleration and cornering
    if (dt) {
      const tp = THREE.MathUtils.clamp(this.accel * 0.006, -0.05, 0.05), tr = THREE.MathUtils.clamp(-this.latAcc * 0.007, -0.06, 0.06);
      const k = 60, c = 9; const S = this.sus;
      S.vp += (k * (tp - S.p) - c * S.vp) * dt; S.p += S.vp * dt; S.vr += (k * (tr - S.r) - c * S.vr) * dt; S.r += S.vr * dt;
    }
    // sprung body: the body follows the ground through a damped spring, the wheels stay on the road
    if (this.visY == null || !dt) { this.visY = this.pos.y; this.visV = 0; }
    else { const k = 110, c = 2 * Math.sqrt(k) * 0.75; this.visV += (k * (this.pos.y - this.visY) - c * this.visV) * dt; this.visY += this.visV * dt; this.visY = THREE.MathUtils.clamp(this.visY, this.pos.y - 0.1, this.pos.y + 0.1); }
    this.mesh.position.set(this.pos.x, this.visY, this.pos.z);
    this.mesh.rotation.set(-this.groundPitch, this.heading, this.groundRoll);
    this.parts.body.rotation.set(-this.sus.p, 0, this.sus.r);
    this.wheelSpin += (this.speed * (dt || 0));
    for (const [i, w] of this.parts.wheels.entries()) {
      const plane = this.visY + Math.tan(this.groundPitch) * w.z + Math.tan(this.groundRoll) * w.x;
      w.pivot.position.y = w.rest + THREE.MathUtils.clamp(wh[i] - plane, -0.14, 0.14);
      w.spin.rotation.x = this.wheelSpin / w.r; if (w.front) w.pivot.rotation.y = this.steer;
    }
    if (this.parts.steering) this.parts.steering.rotation.z = -this.steer * 7;
    for (const d of this.parts.doors) d.g.rotation.y = d.open * this.doorT;
    const tailI = this.braking ? 2.2 : this.headOn ? 0.6 : 0.2;
    for (const l of this.parts.tail) l.material.emissiveIntensity = tailI;
    for (const l of this.parts.reverse) l.material.emissiveIntensity = this.reversing ? 1.4 : 0;
    for (const l of this.parts.head) l.material.emissiveIntensity = this.headOn ? 1.6 : 0.15;
    if (this.parts.beacons.length) { const on = (performance.now() / 400) % 1 < 0.5; this.parts.beacons.forEach((b, i) => { b.material.emissiveIntensity = (on ? i === 0 : i === 1) ? 2 : 0.1; }); }
    // trailer follows its kingpin and its own wheels
    if (this.trailer) {
      const t = this.trailer, c = Math.cos(t.heading), sn = Math.sin(t.heading);
      const back = [t.pos.x - (t.axleBack - 1.3) * sn, t.pos.z - (t.axleBack - 1.3) * c];
      const yb = W.surfaceAt(back[0], back[1], y0), yk = this.pos.y + Math.tan(this.groundPitch) * (-s.len / 2 + 1.5);
      t.pos.y = yk; const pitch = Math.atan2(yk - yb, t.axleBack - 1.3);
      t.mesh.position.copy(t.pos); t.mesh.rotation.set(-pitch, t.heading, 0);
      for (const w of t.parts.wheels) w.spin.rotation.x = this.wheelSpin / w.r;
      for (const l of t.parts.tail) l.material.emissiveIntensity = tailI;
    }
  }
}
