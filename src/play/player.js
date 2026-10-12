// Walking character: smooth acceleration, ground following (terrain, pier decks),
// step limit, collision with buildings/barriers, and no walking into the sea.

import * as THREE from 'three';

const WALK = 2.0, RUN = 5.2, ACCEL = 14, DECEL = 18, GRAVITY = 18, STEP = 0.45, RADIUS = 0.33, HEIGHT = 1.75;

import { buildHumanoid, animateHumanoid, DEFAULT_LOOK } from './people/humanoid.js';

const HAT_MAKERS = {
  sailor: (m) => { const g = new THREE.Group(); const c = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.125, 0.07, 18), m); c.position.y = 0.04; const p = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.012, 18), new THREE.MeshStandardMaterial({ color: 0x14202b })); p.position.set(0, 0.0, 0.05); p.scale.set(1, 1, 0.7); g.add(c, p); return g; },
  top: (m) => { const g = new THREE.Group(); const c = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.22, 18), m); c.position.y = 0.12; const b = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.015, 20), m); g.add(c, b); return g; },
};

export class Player {
  /** Rebuild the avatar from a look (see people/humanoid.js); keeps position and facing. */
  setLook(look) {
    const old = this.mesh, vis = old ? old.visible : true;
    this.look = look; this.model = buildHumanoid(look); this.mesh = this.model.group;
    if (old) { this.mesh.position.copy(old.position); this.mesh.rotation.copy(old.rotation); this.scene.remove(old); }
    this.mesh.visible = vis; this.scene.add(this.mesh); this.model.setExpression(this.mood?.expression || 'neutral'); this.model.setPosture(this.mood?.posture || 'upright');
    if (this.extraHat) this.setOutfit(this.extraHat);
  }
  /** Mood shown on the avatar: expression (happy, confident, embarrassed, suspicious, disappointed) and posture (upright, proud, slouch). */
  setMood(expression = 'neutral', posture = 'upright') { this.mood = { expression, posture }; this.model.setExpression(expression); this.model.setPosture(posture); }
  /** Older outfit API (coat colour, hat, chain) mapped onto the look. */
  setOutfit({ coat = null, hat = null, hatColor = 0x14202b, chain = false } = {}) {
    const look = { ...this.look }; if (coat != null) look.outerColour = coat; look.chain = chain || look.chain; look.hat = hat === 'bucket' ? 'bucket' : null;
    this.extraHat = null; if (JSON.stringify(look) !== JSON.stringify(this.look)) this.setLook(look);
    if (hat && HAT_MAKERS[hat]) { const h = HAT_MAKERS[hat](new THREE.MeshStandardMaterial({ color: hatColor, roughness: 0.7 })); h.position.y = 0.17; this.model.parts.head.add(h); this.extraHat = { coat, hat, hatColor, chain }; }
  }

  constructor(scene, world, collision) {
    this.world = world; this.collision = collision;
    this.pos = new THREE.Vector3(); this.vel = new THREE.Vector2(); this.vy = 0; this.heading = 0;
    this.scene = scene; this.mesh = null; this.setLook(DEFAULT_LOOK);
    this.phase = 0; this.onGround = true; this.distance = 0; this.stepEvents = 0; this.lastStepPhase = 0;
    this.blockedBySea = false;
  }
  get radius() { return RADIUS; }
  get eye() { return this.pos.y + 1.62; }

  place(x, z, y = null) {
    this.pos.set(x, this.world.surfaceAt(x, z, y), z); this.vel.set(0, 0); this.vy = 0;
    this.mesh.position.copy(this.pos);
  }

  update(dt, input, camYaw, active = true) {
    const { f, s } = active ? input.axis() : { f: 0, s: 0 };
    const run = input.down('ShiftLeft') || input.down('ShiftRight');
    const max = run ? RUN : WALK;
    // desired velocity in world xz relative to camera yaw (yaw 0 looks towards -z / north)
    const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw), rx = Math.cos(camYaw), rz = -Math.sin(camYaw);
    let dx = fx * f + rx * s, dz = fz * f + rz * s; const dl = Math.hypot(dx, dz);
    if (dl > 0) { dx /= dl; dz /= dl; }
    const tx = dx * max, tz = dz * max;
    const a = dl > 0 ? ACCEL : DECEL;
    this.vel.x += THREE.MathUtils.clamp(tx - this.vel.x, -a * dt, a * dt);
    this.vel.y += THREE.MathUtils.clamp(tz - this.vel.y, -a * dt, a * dt);

    // move in sub-steps
    const speed = this.vel.length();
    const steps = Math.max(1, Math.ceil((speed * dt) / 0.2));
    let { x, z } = this.pos;
    this.blockedBySea = false;
    for (let i = 0; i < steps; i++) {
      let nx = x + (this.vel.x * dt) / steps, nz = z + (this.vel.y * dt) / steps;
      const gy = this.world.surfaceAt(nx, nz, this.pos.y);
      const climb = gy - this.pos.y;
      if (!this.world.isWalkable(nx, nz, this.pos.y) || climb > STEP) {
        // try sliding along each axis
        if (this.world.isWalkable(nx, z, this.pos.y) && this.world.surfaceAt(nx, z, this.pos.y) - this.pos.y <= STEP) nz = z;
        else if (this.world.isWalkable(x, nz, this.pos.y) && this.world.surfaceAt(x, nz, this.pos.y) - this.pos.y <= STEP) nx = x;
        else { nx = x; nz = z; this.vel.multiplyScalar(0.5); }
        if (!this.world.isWalkable(nx, nz, this.pos.y)) { nx = x; nz = z; }
        this.blockedBySea = true;
      }
      const r = this.collision.resolve(nx, nz, RADIUS, this.pos.y, this.pos.y + HEIGHT);
      if (r.hit) { const vn = this.vel.x * r.normal[0] + this.vel.y * r.normal[1]; if (vn < 0) { this.vel.x -= vn * r.normal[0]; this.vel.y -= vn * r.normal[1]; } }
      if (this.collision.insideBuilding(r.x, r.z, this.pos.y + 0.5)) { nx = x; nz = z; } else { nx = r.x; nz = r.z; }
      this.distance += Math.hypot(nx - x, nz - z);
      x = nx; z = nz;
    }
    // vertical
    const ground = this.world.surfaceAt(x, z, this.pos.y);
    if (active && input.hit('Space') && this.onGround) { this.vy = 4.6; this.onGround = false; }
    this.vy -= GRAVITY * dt;
    let y = this.pos.y + this.vy * dt;
    if (y <= ground) { y = ground; this.vy = 0; this.onGround = true; }
    else if (this.onGround && y - ground < 0.5 && this.vy <= 0) { y = ground; this.vy = 0; } // stick to downward slopes/steps
    else this.onGround = false;
    this.pos.set(x, y, z);

    // animation
    const hs = this.vel.length();
    if (hs > 0.15) this.heading = Math.atan2(this.vel.x, this.vel.y);
    this.phase += hs * dt * 2.6;
    animateHumanoid(this.model, this.phase, hs, dt);
    this.mesh.position.set(x, y, z);
    const cur = this.mesh.rotation.y; let d = this.heading - cur; d = Math.atan2(Math.sin(d), Math.cos(d));
    this.mesh.rotation.y = cur + d * Math.min(1, dt * 12);
    const stepPhase = Math.floor(this.phase / Math.PI);
    if (stepPhase !== this.lastStepPhase && hs > 0.5 && this.onGround) { this.stepEvents++; this.lastStepPhase = stepPhase; this.onStep?.(hs); }
  }
}
