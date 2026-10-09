// Camera modes: third-person orbit, first-person, elevated overview; chase/driver in cars.
// The third-person camera is pulled in when a building wall is between it and the player.

import * as THREE from 'three';
import { pointInRing } from '../geo/polygon.js';

export const MODES = ['third', 'first', 'overview'];

export class CameraRig {
  constructor(camera, world) {
    this.camera = camera; this.world = world;
    this.mode = 'third'; this.yaw = 0; this.pitch = -0.28; this.dist = 6; this.overDist = 420;
    this.cur = new THREE.Vector3(); this.look = new THREE.Vector3(); this.initialised = false;
    this.transition = 0;
  }
  cycle() { this.mode = MODES[(MODES.indexOf(this.mode) + 1) % MODES.length]; this.transition = 1; if (this.mode === 'overview') this.pitch = -0.95; else if (this.pitch < -0.6) this.pitch = -0.25; }

  _blocked(x, y, z) {
    for (const b of this.world.buildingGrid.query(x, z, x, z)) {
      if (!pointInRing(x, z, b.outer)) continue;
      const top = this.world.ground(b.b.cx, b.b.cz) + b.b.height + 3;
      if (y < top) return true;
    }
    return false;
  }

  update(dt, input, target, opts = {}) {
    const { driving = false, heading = 0, speed = 0 } = opts;
    const sens = 0.0042;
    this.yaw -= input.mouseDX * sens;
    this.pitch = THREE.MathUtils.clamp(this.pitch - input.mouseDY * sens, this.mode === 'overview' ? -1.45 : -1.3, this.mode === 'first' ? 1.2 : 0.45);
    if (input.wheel) {
      if (this.mode === 'overview') this.overDist = THREE.MathUtils.clamp(this.overDist * (1 + input.wheel * 0.15), 60, 2600);
      else this.dist = THREE.MathUtils.clamp(this.dist + input.wheel * 0.9, 2.2, 30);
    }
    if (driving && this.mode !== 'overview' && !input.dragging) {
      // chase cam drifts behind the car when the mouse is idle
      const behind = heading + Math.PI;
      let d = behind - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
      this.yaw += d * Math.min(1, dt * (1.5 + Math.abs(speed) * 0.12));
    }
    let eye, look;
    const head = target.clone(); head.y += driving ? 1.5 : 1.55;
    const dir = new THREE.Vector3(-Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), -Math.cos(this.yaw) * Math.cos(this.pitch));
    if (this.mode === 'first') {
      eye = head.clone(); if (driving) { eye.x += Math.sin(heading) * 0.2 - Math.cos(heading) * 0.35; eye.z += Math.cos(heading) * 0.2 + Math.sin(heading) * 0.35; eye.y -= 0.25; }
      look = eye.clone().add(dir);
    } else {
      const D = this.mode === 'overview' ? this.overDist : (driving ? Math.max(this.dist, 7.5) : this.dist);
      let d = D;
      if (this.mode !== 'overview') {
        // pull camera in front of walls
        for (let s = 0.6; s <= D; s += 0.4) {
          const p = head.clone().addScaledVector(dir, -s);
          if (this._blocked(p.x, p.y, p.z)) { d = Math.max(0.8, s - 0.5); break; }
        }
      }
      eye = head.clone().addScaledVector(dir, -d);
      const g = this.world.surfaceAt(eye.x, eye.z) + 0.4; if (eye.y < g) eye.y = g;
      look = head;
    }
    if (!this.initialised) { this.cur.copy(eye); this.look.copy(look); this.initialised = true; }
    const k = this.transition > 0 ? Math.min(1, dt * 4) : 1;
    this.transition = Math.max(0, this.transition - dt * 1.2);
    this.cur.lerp(eye, k); this.look.lerp(look, k);
    this.camera.position.copy(this.cur); this.camera.lookAt(this.look);
  }
  /** Yaw the player moves relative to. */
  get moveYaw() { return this.yaw; }
}
