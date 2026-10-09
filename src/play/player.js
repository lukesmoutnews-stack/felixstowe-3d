// Walking character: smooth acceleration, ground following (terrain, pier decks),
// step limit, collision with buildings/barriers, and no walking into the sea.

import * as THREE from 'three';

const WALK = 2.0, RUN = 5.2, ACCEL = 14, DECEL = 18, GRAVITY = 18, STEP = 0.45, RADIUS = 0.33, HEIGHT = 1.75;

function personMesh() {
  const g = new THREE.Group();
  const mat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 });
  const coat = mat(0x2f4f6f), trousers = mat(0x2b2b30), skin = mat(0xd9a989), shoe = mat(0x1a1a1a), hair = mat(0x4a3424);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.45, 4, 10), coat); torso.position.y = 1.18; g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 10), skin); head.position.y = 1.62; g.add(head);
  const hairM = new THREE.Mesh(new THREE.SphereGeometry(0.125, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), hair); hairM.position.y = 1.64; g.add(hairM);
  const legs = [], arms = [];
  for (const s of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(0.1 * s, 0.88, 0);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.68, 4, 8), trousers); leg.position.y = -0.42; hip.add(leg);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.07, 0.25), shoe); foot.position.set(0, -0.84, 0.05); hip.add(foot);
    g.add(hip); legs.push(hip);
    const sh = new THREE.Group(); sh.position.set(0.26 * s, 1.4, 0);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.52, 4, 8), coat); arm.position.y = -0.3; sh.add(arm);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), skin); hand.position.y = -0.62; sh.add(hand);
    g.add(sh); arms.push(sh);
  }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.userData = { legs, arms };
  return g;
}

export class Player {
  constructor(scene, world, collision) {
    this.world = world; this.collision = collision;
    this.pos = new THREE.Vector3(); this.vel = new THREE.Vector2(); this.vy = 0; this.heading = 0;
    this.mesh = personMesh(); scene.add(this.mesh);
    this.phase = 0; this.onGround = true; this.distance = 0; this.stepEvents = 0; this.lastStepPhase = 0;
    this.blockedBySea = false;
  }
  get radius() { return RADIUS; }
  get eye() { return this.pos.y + 1.62; }

  place(x, z) {
    this.pos.set(x, this.world.surfaceAt(x, z), z); this.vel.set(0, 0); this.vy = 0;
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
      const gy = this.world.surfaceAt(nx, nz);
      const climb = gy - this.pos.y;
      if (!this.world.isWalkable(nx, nz) || climb > STEP) {
        // try sliding along each axis
        if (this.world.isWalkable(nx, z) && this.world.surfaceAt(nx, z) - this.pos.y <= STEP) nz = z;
        else if (this.world.isWalkable(x, nz) && this.world.surfaceAt(x, nz) - this.pos.y <= STEP) nx = x;
        else { nx = x; nz = z; this.vel.multiplyScalar(0.5); }
        if (!this.world.isWalkable(nx, nz)) { nx = x; nz = z; }
        this.blockedBySea = true;
      }
      const r = this.collision.resolve(nx, nz, RADIUS, this.pos.y, this.pos.y + HEIGHT);
      if (r.hit) { const vn = this.vel.x * r.normal[0] + this.vel.y * r.normal[1]; if (vn < 0) { this.vel.x -= vn * r.normal[0]; this.vel.y -= vn * r.normal[1]; } }
      if (this.collision.insideBuilding(r.x, r.z, this.pos.y + 0.5)) { nx = x; nz = z; } else { nx = r.x; nz = r.z; }
      this.distance += Math.hypot(nx - x, nz - z);
      x = nx; z = nz;
    }
    // vertical
    const ground = this.world.surfaceAt(x, z);
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
    const swing = Math.sin(this.phase) * Math.min(0.75, hs * 0.2);
    const { legs, arms } = this.mesh.userData;
    legs[0].rotation.x = swing; legs[1].rotation.x = -swing; arms[0].rotation.x = -swing * 0.8; arms[1].rotation.x = swing * 0.8;
    this.mesh.position.set(x, y + Math.abs(Math.cos(this.phase)) * Math.min(0.04, hs * 0.01), z);
    const cur = this.mesh.rotation.y; let d = this.heading - cur; d = Math.atan2(Math.sin(d), Math.cos(d));
    this.mesh.rotation.y = cur + d * Math.min(1, dt * 12);
    const stepPhase = Math.floor(this.phase / Math.PI);
    if (stepPhase !== this.lastStepPhase && hs > 0.5 && this.onGround) { this.stepEvents++; this.lastStepPhase = stepPhase; this.onStep?.(hs); }
  }
}
