// Camera: third-person orbit (default), first-person / driver's seat, and an elevated overview.
//
// Drag with the mouse (either button) or one finger to orbit around the player or the vehicle;
// scroll, pinch or +/- to zoom. Input moves a *target* yaw, pitch and distance, and the camera
// eases towards them every frame, so there is no jitter or jerk however the input arrives
// (mouse events, touch, gamepad or test code). The focus point follows the player or vehicle
// through a critically damped spring (heavier vertically, so suspension and kerbs don't shake
// the view), which also gives smooth transitions when you get in or out of a vehicle.
//
// Collision: the camera is pulled in front of anything between it and the focus (buildings,
// bridge decks and parapets, abutments, ramp walls, interior walls and ceilings), using a
// centre ray plus two side rays the width of the near plane; it snaps in immediately (no
// clipping) and eases back out. It never goes below the ground or a deck it is over.

import * as THREE from 'three';
import { pointInRing, distToSegment } from '../geo/polygon.js';

export const MODES = ['third', 'first', 'overview'];
const PITCH = { third: [-1.3, 0.42], first: [-1.25, 1.2], overview: [-1.45, -0.25] };
const ZOOM = [1.8, 34];
const damp = (rate, dt) => 1 - Math.exp(-rate * dt);
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export class CameraRig {
  constructor(camera, world, settings = {}) {
    this.camera = camera; this.world = world; this.settings = settings;
    this.mode = 'third';
    // targets (input and external code set these) and the eased values the camera actually uses
    this.yaw = 0; this.pitch = -0.28; this.dist = 6; this.overDist = 420;
    this._yaw = 0; this._pitch = -0.28; this._dist = 6; this._over = 420; this._free = 6;
    this.focus = new THREE.Vector3(); this.cur = new THREE.Vector3(); this.look = new THREE.Vector3();
    this.initialised = false; this.transition = 0; this.lastLook = -1e9;
    this.stats = { blocked: 0 };
  }
  cycle() {
    this.mode = MODES[(MODES.indexOf(this.mode) + 1) % MODES.length]; this.transition = 1;
    if (this.mode === 'overview') this.pitch = -0.95; else if (this.pitch < -0.6) this.pitch = -0.25;
  }
  /** Yaw the player moves relative to (what you see). */
  get moveYaw() { return this._yaw; }

  _blocked(x, y, z) {
    const room = this._room; // inside an enterable building: stay within its walls and under its ceiling
    if (room) return !pointInRing(x, z, room.ring) || y > room.ceilingAt(x, z) - 0.25;
    // bridge decks, abutments, parapets and ramp walls
    for (const s of this.world.surfaces || []) if (s.bridge && pointInRing(x, z, s.ring)) { const top = s.heightAt(x, z); if (y > top - s.depth - 0.3 && y < top + 0.2) return true; }
    for (const c of this.world.edgeGrid.query(x - 0.5, z - 0.5, x + 0.5, z + 0.5)) {
      if (!(c.kind === 'abutment' || c.kind === 'ramp-wall' || c.kind === 'parapet') || y < c.y0 - 0.2 || y > c.top + 0.2) continue;
      if (distToSegment(x, z, c.a[0], c.a[1], c.b[0], c.b[1]).d < 0.5) return true;
    }
    for (const b of this.world.buildingGrid.query(x, z, x, z)) {
      if (b.b.enterable && this.world.interiorAt(x, z, y)) continue;
      if (!pointInRing(x, z, b.outer)) continue;
      const top = this.world.ground(b.b.cx, b.b.cz) + b.b.height + 3;
      if (y < top) return true;
    }
    return false;
  }
  /** Free distance from `head` back along -dir, up to D (centre ray + two side rays). */
  _freeDistance(head, dir, D) {
    const side = new THREE.Vector3(dir.z, 0, -dir.x).normalize().multiplyScalar(0.28);
    let free = D;
    for (let s = 0.5; s <= D; s += 0.3) {
      const x = head.x - dir.x * s, y = head.y - dir.y * s, z = head.z - dir.z * s;
      if (this._blocked(x, y, z) || (s % 0.9 < 0.3 && (this._blocked(x + side.x, y, z + side.z) || this._blocked(x - side.x, y, z - side.z)))) { free = Math.max(0.7, s - 0.45); this.stats.blocked++; break; }
    }
    return free;
  }

  update(dt, input, target, opts = {}) {
    const { driving = false, heading = 0, speed = 0, vehicle = null } = opts;
    const st = this.settings || {}, sens = 0.0042 * (st.cameraSensitivity || 1), inv = st.invertY ? -1 : 1;
    const now = performance.now();
    if (input.mouseDX || input.mouseDY) { this.lastLook = now; this.yaw -= input.mouseDX * sens; this.pitch -= input.mouseDY * sens * inv; }
    const [p0, p1] = PITCH[this.mode]; this.pitch = THREE.MathUtils.clamp(this.pitch, p0, p1);
    const zoom = (input.wheel || 0) + (input.zoomKeys || 0) * dt * 4 - Math.log(input.pinch || 1) * 4;
    if (zoom) {
      if (this.mode === 'overview') this.overDist = THREE.MathUtils.clamp(this.overDist * Math.exp(zoom * 0.14), 60, 2600);
      else this.dist = THREE.MathUtils.clamp(this.dist * Math.exp(zoom * 0.12), ZOOM[0], ZOOM[1]);
    }
    // chase / driver's seat: drift back behind the vehicle once you stop looking around
    if (driving && this.mode !== 'overview' && !input.dragging && now - this.lastLook > 1500) {
      const behind = this.mode === 'first' ? heading - Math.PI : heading + Math.PI;
      const k = this.mode === 'first' ? damp(4, dt) : damp(0.8 + Math.min(Math.abs(speed), 20) * 0.12, dt) * (Math.abs(speed) > 0.5 ? 1 : 0);
      this.yaw += wrap(behind - this.yaw) * k;
    }
    // focus point (head height of the player, or the vehicle's roof line)
    const head = new THREE.Vector3(target.x, target.y + (driving ? (vehicle ? Math.max(1.5, vehicle.s.hgt * 0.85) : 1.5) : 1.55), target.z);
    if (!this.initialised) {
      this._yaw = this.yaw; this._pitch = this.pitch; this._dist = this.dist; this._over = this.overDist; this.focus.copy(head); this._wasDriving = driving; this._glide = 0;
    } else {
      this._yaw += wrap(this.yaw - this._yaw) * damp(18, dt);
      this._pitch += (this.pitch - this._pitch) * damp(18, dt);
      this._over += (this.overDist - this._over) * damp(8, dt);
      // getting in or out: the focus glides from the player to the vehicle (or back) over about a second
      if (this._wasDriving !== driving) { this._glide = 1; this._wasDriving = driving; }
      this._glide = Math.max(0, (this._glide || 0) - dt);
      const g = this._glide > 0 ? 3.5 : 0;
      const kh = damp(g || (driving ? 22 : 16), dt), kv = damp(g || (driving ? 7 : 10), dt);
      this.focus.x += (head.x - this.focus.x) * kh; this.focus.z += (head.z - this.focus.z) * kh; this.focus.y += (head.y - this.focus.y) * kv;
      // never let the eased focus trail so far behind a fast vehicle that it leaves the screen centre
      const lag = Math.hypot(head.x - this.focus.x, head.z - this.focus.z); if (driving && Math.abs(speed) > 4 && lag > 1.2) { const f = 1.2 / lag; this.focus.x = head.x + (this.focus.x - head.x) * f; this.focus.z = head.z + (this.focus.z - head.z) * f; }
    }
    // a vehicle sets the minimum chase distance (bigger for buses and artics); eased so getting in or out glides
    const minD = driving && vehicle ? vehicle.s.len * 0.9 + 4 + (vehicle.trailer ? 9 : 0) : driving ? 7.5 : 0;
    const wantD = Math.max(this.dist, minD);
    this._dist += (wantD - this._dist) * damp(this.initialised ? 4 : 1e9, dt);
    const dir = new THREE.Vector3(-Math.sin(this._yaw) * Math.cos(this._pitch), Math.sin(this._pitch), -Math.cos(this._yaw) * Math.cos(this._pitch));
    let eye, look;
    const F = this.focus;
    if (this.mode === 'first') {
      eye = new THREE.Vector3(target.x, target.y + (driving ? 1.3 : 1.62), target.z);
      if (driving && vehicle) { const [sx, sz] = vehicle.local(vehicle.seat.x, vehicle.seat.z + 0.05); eye.set(sx, (vehicle.visY ?? vehicle.pos.y) + vehicle.seat.eye, sz); }
      look = eye.clone().add(dir);
    } else if (this.mode === 'overview') {
      eye = F.clone().addScaledVector(dir, -this._over); look = F.clone();
    } else {
      this._room = !driving ? this.world.interiorAt?.(F.x, F.z, F.y) : null;
      const free = this._freeDistance(F, dir, this._dist);
      // snap in (never clip), ease back out
      this._free = !this.initialised || free < this._free ? free : this._free + (free - this._free) * damp(3, dt);
      const d = Math.min(this._dist, this._free);
      eye = F.clone().addScaledVector(dir, -d);
      const g = this.world.surfaceAt(eye.x, eye.z, eye.y) + 0.35; if (eye.y < g) eye.y = g;
      look = F.clone();
    }
    if (!this.initialised) { this.cur.copy(eye); this.look.copy(look); this.initialised = true; }
    // mode switches blend over half a second; otherwise the eased parameters already make motion smooth
    const k = this.transition > 0 ? damp(7, dt) : 1;
    this.transition = Math.max(0, this.transition - dt * 1.6);
    this.cur.lerp(eye, k); this.look.lerp(look, k);
    this.camera.position.copy(this.cur); this.camera.lookAt(this.look);
  }
}
