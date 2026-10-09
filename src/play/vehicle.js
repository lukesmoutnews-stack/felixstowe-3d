// Simple, stable car: kinematic bicycle model with speed-dependent steering, drag,
// braking and handbrake. Collides as two circles; follows the ground/deck surface.
// Limitations (documented): no suspension or tyre slip simulation.

import * as THREE from 'three';

const WHEELBASE = 2.65, MAX_FWD = 22, MAX_REV = 5, ACC = 3.6, BRAKE = 9, DRAG = 0.35, ROLL = 0.6, MAX_STEER = 0.55, R = 0.95;

function carMesh(color = 0x8a1c22) {
  const g = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.5 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x1d2a33, roughness: 0.1, metalness: 0.6 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
  const light = new THREE.MeshStandardMaterial({ color: 0xfff6dc, emissive: 0x332a10, roughness: 0.3 });
  const red = new THREE.MeshStandardMaterial({ color: 0x8a0f0f, emissive: 0x220000, roughness: 0.3 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.62, 4.1), paint); body.position.y = 0.62; g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.55, 2.1), glass); cabin.position.set(0, 1.18, -0.15); g.add(cabin);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.06, 1.8), paint); roof.position.set(0, 1.47, -0.2); g.add(roof);
  for (const s of [-0.6, 0.6]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.14, 0.05), light); l.position.set(s, 0.72, 2.06); g.add(l); const t = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.14, 0.05), red); t.position.set(s, 0.75, -2.06); g.add(t); }
  const wheels = [];
  for (const [x, z] of [[-0.82, 1.32], [0.82, 1.32], [-0.82, -1.32], [0.82, -1.32]]) {
    const pivot = new THREE.Group(); pivot.position.set(x, 0.33, z);
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.22, 16).rotateZ(Math.PI / 2), dark); pivot.add(w);
    g.add(pivot); wheels.push({ pivot, w, front: z > 0 });
  }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.userData.wheels = wheels;
  return g;
}

export class Vehicle {
  constructor(scene, world, collision) {
    this.world = world; this.collision = collision;
    this.mesh = carMesh(); scene.add(this.mesh);
    this.pos = new THREE.Vector3(); this.heading = 0; this.speed = 0; this.steer = 0; this.wheelSpin = 0;
    this.offRoad = false; this.pitch = 0; this.roll = 0; this.bumps = 0;
  }
  place(x, z, heading) { this.pos.set(x, this.world.surfaceAt(x, z), z); this.heading = heading; this.speed = 0; this.syncMesh(0); }
  forward() { return [Math.sin(this.heading), Math.cos(this.heading)]; }

  update(dt, input, active) {
    const thr = active ? (input.down('KeyW') || input.down('ArrowUp') ? 1 : 0) : 0;
    const rev = active ? (input.down('KeyS') || input.down('ArrowDown') ? 1 : 0) : 0;
    const st = active ? (input.down('KeyA') || input.down('ArrowLeft') ? 1 : 0) - (input.down('KeyD') || input.down('ArrowRight') ? 1 : 0) : 0;
    const hb = active && input.down('Space');
    const road = this.world.nearestRoad(this.pos.x, this.pos.z, 12, (r) => !r.footOnly || r.kind === 'pedestrian');
    this.offRoad = !road || road.d > road.road.width / 2 + 1.0;
    const maxF = this.offRoad ? 8 : MAX_FWD;
    if (thr) this.speed += (this.speed < -0.1 ? BRAKE : ACC * (1 - Math.max(0, this.speed) / maxF)) * dt;
    if (rev) this.speed -= (this.speed > 0.1 ? BRAKE : ACC * 0.7) * dt;
    if (hb) this.speed -= Math.sign(this.speed) * Math.min(Math.abs(this.speed), 12 * dt);
    const drag = DRAG * this.speed * Math.abs(this.speed) * 0.01 + Math.sign(this.speed) * (this.offRoad ? 2.2 : ROLL);
    if (!thr && !rev) this.speed -= Math.sign(this.speed) * Math.min(Math.abs(this.speed), Math.abs(drag) * dt);
    this.speed = THREE.MathUtils.clamp(this.speed, -MAX_REV, maxF + 0.5);
    const steerMax = MAX_STEER / (1 + Math.abs(this.speed) * 0.09);
    this.steer += THREE.MathUtils.clamp(st * steerMax - this.steer, -2.5 * dt, 2.5 * dt);

    const steps = Math.max(1, Math.ceil(Math.abs(this.speed * dt) / 0.25));
    for (let i = 0; i < steps; i++) {
      const h = dt / steps;
      const nh = this.heading + (this.speed / WHEELBASE) * Math.tan(this.steer) * h;
      const [fx, fz] = [Math.sin(nh), Math.cos(nh)];
      let nx = this.pos.x + fx * this.speed * h, nz = this.pos.z + fz * this.speed * h;
      // keep both axles on walkable ground and not climbing walls
      const front = [nx + fx * 1.3, nz + fz * 1.3], rear = [nx - fx * 1.3, nz - fz * 1.3];
      const dy = this.world.surfaceAt(nx, nz) - this.pos.y;
      if (!this.world.isWalkable(...front) || !this.world.isWalkable(...rear) || dy > 0.6) { this.speed *= -0.15; this.bumps++; break; }
      let hit = false;
      for (const s of [1.3, -1.3]) {
        const cx = nx + fx * s, cz = nz + fz * s;
        const r = this.collision.resolve(cx, cz, R, this.pos.y + 0.2, this.pos.y + 1.5, 2);
        if (r.hit) { nx += r.x - cx; nz += r.z - cz; hit = true; }
      }
      if (hit) { this.speed *= 0.55; if (Math.abs(this.speed) > 3) this.bumps++; }
      if (this.collision.insideBuilding(nx, nz, this.pos.y + 0.5)) { this.speed = 0; break; }
      this.heading = nh; this.pos.x = nx; this.pos.z = nz;
    }
    this.syncMesh(dt);
  }
  syncMesh(dt) {
    const [fx, fz] = this.forward();
    const yc = this.world.surfaceAt(this.pos.x, this.pos.z);
    const yf = this.world.surfaceAt(this.pos.x + fx * 1.3, this.pos.z + fz * 1.3), yr = this.world.surfaceAt(this.pos.x - fx * 1.3, this.pos.z - fz * 1.3);
    const yl = this.world.surfaceAt(this.pos.x - fz * 0.8, this.pos.z + fx * 0.8), yrr = this.world.surfaceAt(this.pos.x + fz * 0.8, this.pos.z - fx * 0.8);
    this.pos.y = Math.max(yc, (yf + yr) / 2);
    const tp = Math.atan2(yf - yr, 2.6), tr = Math.atan2(yl - yrr, 1.6);
    const k = dt ? Math.min(1, dt * 8) : 1;
    this.pitch += (tp - this.pitch) * k; this.roll += (tr - this.roll) * k;
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.set(0, 0, 0); this.mesh.rotation.order = 'YXZ';
    this.mesh.rotation.y = this.heading; this.mesh.rotation.x = -this.pitch; this.mesh.rotation.z = this.roll;
    this.wheelSpin += (this.speed * (dt || 0)) / 0.33;
    for (const w of this.mesh.userData.wheels) { w.w.rotation.x = this.wheelSpin; if (w.front) w.pivot.rotation.y = this.steer; }
  }
}
