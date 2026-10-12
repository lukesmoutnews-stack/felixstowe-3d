// Procedural vehicle models (original designs, fictional liveries). Local axes: +z forward, +y up,
// UK right-hand drive (driver on local -x). Every model exposes the parts the simulation animates:
// wheels (spin/steer/suspension), body (pitch/roll), doors, steering wheel and lights.

import * as THREE from 'three';
import { driverSeat } from './specs.js';

const M = new Map();
const mat = (key, make) => { if (!M.has(key)) M.set(key, make()); return M.get(key); };
const std = (key, color, o = {}) => mat(key, () => new THREE.MeshStandardMaterial({ color, roughness: o.r ?? 0.6, metalness: o.m ?? 0, transparent: !!o.t, opacity: o.t ?? 1, side: o.side ?? THREE.FrontSide, emissive: o.e ?? 0x000000, emissiveIntensity: o.ei ?? 1 }));
export const MATS = {
  paint: (c) => std('paint' + c, c, { r: 0.32, m: 0.45 }),
  glass: () => std('glass', 0x1b2630, { r: 0.08, m: 0.6, t: 0.55, side: THREE.DoubleSide }),
  tyre: () => std('tyre', 0x161616, { r: 0.9 }),
  rim: () => std('rim', 0xb9bcc0, { r: 0.3, m: 0.85 }),
  trim: () => std('trim', 0x1e1f22, { r: 0.75 }),
  chrome: () => std('chrome', 0xd8dadd, { r: 0.18, m: 0.95 }),
  seat: () => std('seat', 0x2c2f35, { r: 0.85 }),
  interior: () => std('interior', 0x3a3d43, { r: 0.85 }),
  floor: () => std('floor', 0x55585e, { r: 0.9 }),
  arch: () => std('arch', 0x0c0c0c, { r: 1 }),
  head: () => new THREE.MeshStandardMaterial({ color: 0xfdf8e8, emissive: 0xfff4cc, emissiveIntensity: 0.15, roughness: 0.2 }),
  tail: () => new THREE.MeshStandardMaterial({ color: 0x7a0b0b, emissive: 0xff1a1a, emissiveIntensity: 0.25, roughness: 0.3 }),
  reverse: () => new THREE.MeshStandardMaterial({ color: 0xdcdcdc, emissive: 0xffffff, emissiveIntensity: 0, roughness: 0.3 }),
  amber: () => new THREE.MeshStandardMaterial({ color: 0xb06a00, emissive: 0xffa500, emissiveIntensity: 0.2, roughness: 0.3 }),
};

function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
const liveryMat = (key, w, h, draw) => mat('livery:' + key, () => new THREE.MeshStandardMaterial({ map: canvasTex(w, h, draw), roughness: 0.45, metalness: 0.1 }));

const box = (w, h, d, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); return o; };
/** Extrude a side profile [(z, y)...] across the width, centred on x. */
function extrudeProfile(points, width, m, bevel = 0.04) {
  const sh = new THREE.Shape(); points.forEach(([z, y], i) => (i ? sh.lineTo(z, y) : sh.moveTo(z, y))); sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: width - bevel * 2, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: 4 });
  g.rotateY(-Math.PI / 2); g.translate(width / 2 - bevel, 0, 0);
  return new THREE.Mesh(g, m);
}

// Side profiles normalised to length (z: -0.5 rear .. 0.5 front) and height (y: 0..1).
const PROFILES = {
  hatch: { body: [[-0.5, 0.2], [0.5, 0.2], [0.5, 0.42], [0.47, 0.52], [0.22, 0.6], [-0.48, 0.6], [-0.5, 0.5]], cab: [[0.22, 0.6], [0.03, 0.97], [-0.37, 0.96], [-0.48, 0.6]] },
  saloon: { body: [[-0.5, 0.22], [0.5, 0.22], [0.5, 0.44], [0.47, 0.55], [0.25, 0.6], [-0.36, 0.62], [-0.49, 0.6], [-0.5, 0.5]], cab: [[0.25, 0.6], [0.08, 0.98], [-0.18, 0.98], [-0.36, 0.62]] },
  estate: { body: [[-0.5, 0.21], [0.5, 0.21], [0.5, 0.43], [0.47, 0.54], [0.24, 0.6], [-0.49, 0.6], [-0.5, 0.5]], cab: [[0.24, 0.6], [0.06, 0.97], [-0.45, 0.95], [-0.49, 0.6]] },
  coupe: { body: [[-0.5, 0.2], [0.5, 0.2], [0.5, 0.4], [0.46, 0.5], [0.2, 0.56], [-0.42, 0.6], [-0.5, 0.52]], cab: [[0.2, 0.56], [-0.02, 0.97], [-0.18, 0.96], [-0.42, 0.6]] },
  suv: { body: [[-0.5, 0.24], [0.5, 0.24], [0.5, 0.5], [0.46, 0.6], [0.24, 0.64], [-0.48, 0.64], [-0.5, 0.55]], cab: [[0.24, 0.64], [0.08, 0.98], [-0.46, 0.97], [-0.49, 0.64]] },
  smallvan: { body: [[-0.5, 0.18], [0.5, 0.18], [0.5, 0.4], [0.45, 0.5], [0.3, 0.55], [-0.5, 0.55]], cab: [[0.3, 0.55], [0.12, 0.96], [0.0, 0.97], [0.0, 0.55]], panel: [[0.0, 0.55], [0.0, 0.97], [-0.5, 0.97], [-0.5, 0.55]] },
  panelvan: { body: [[-0.5, 0.14], [0.5, 0.14], [0.5, 0.33], [0.44, 0.42], [0.36, 0.45], [-0.5, 0.45]], cab: [[0.36, 0.45], [0.22, 0.8], [0.16, 0.8], [0.16, 0.45]], panel: [[0.16, 0.45], [0.16, 0.8], [0.12, 0.98], [-0.5, 0.98], [-0.5, 0.45]] },
};

function addWheel(g, parts, s, x, z, front, r = s.wheelR, tw = 0.24, dual = false) {
  const pivot = new THREE.Group(); pivot.position.set(x, r, z);
  const spin = new THREE.Group(); pivot.add(spin);
  const tyre = new THREE.Mesh(new THREE.CylinderGeometry(r, r, tw * (dual ? 1.9 : 1), 20).rotateZ(Math.PI / 2), MATS.tyre()); spin.add(tyre);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.62, r * 0.62, tw * (dual ? 1.9 : 1) + 0.02, 10).rotateZ(Math.PI / 2), MATS.rim()); spin.add(rim);
  const hub = box(0.05, r * 0.9, 0.08, MATS.trim(), Math.sign(x) * (tw * (dual ? 0.95 : 0.5) + 0.012), 0, 0); spin.add(hub); // a spoke, so you can see it turn
  g.add(pivot); parts.wheels.push({ pivot, spin, front, x, z, r, rest: r });
  const arch = new THREE.Mesh(new THREE.CircleGeometry(r * 1.13, 20), MATS.arch()); arch.position.set(Math.sign(x) * (s.wid / 2 + 0.004), r, z); arch.rotation.y = Math.sign(x) * Math.PI / 2; g.add(arch);
}

function lights(body, parts, s, frontY, rearY, inset = 0.25) {
  const hw = s.wid / 2;
  for (const sx of [-1, 1]) {
    const h = box(0.36, 0.13, 0.04, MATS.head(), sx * (hw - inset), frontY, s.len / 2 + 0.005); body.add(h); parts.head.push(h);
    const t = box(0.3, 0.14, 0.04, MATS.tail(), sx * (hw - inset * 0.8), rearY, -s.len / 2 - 0.005); body.add(t); parts.tail.push(t);
    const rv = box(0.1, 0.08, 0.04, MATS.reverse(), sx * (hw - inset * 0.8 - 0.22), rearY - 0.02, -s.len / 2 - 0.006); body.add(rv); parts.reverse.push(rv);
  }
}

function steeringWheel(parts, parent, seat, r = 0.19, tilt = 0.45) {
  const sw = new THREE.Group(); sw.position.set(seat.x, seat.y + 0.55, seat.z + 0.45); sw.rotation.x = -tilt;
  sw.add(new THREE.Mesh(new THREE.TorusGeometry(r, 0.022, 6, 20), MATS.trim()));
  sw.add(box(r * 1.9, 0.03, 0.03, MATS.trim()));
  parent.add(sw); parts.steering = sw;
}

function carModel(s, colour) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const parts = { body, wheels: [], head: [], tail: [], reverse: [], doors: [], steering: null, beacons: [] };
  const P = PROFILES[s.shape] || PROFILES.hatch; const L = s.len, H = s.hgt;
  const sc = (pts) => pts.map(([z, y]) => [z * L, y * H]);
  const paint = MATS.paint(colour);
  body.add(extrudeProfile(sc(P.body), s.wid, paint));
  body.add(extrudeProfile(sc(P.cab), s.wid * 0.84, MATS.glass(), 0.02));
  if (P.panel) body.add(extrudeProfile(sc(P.panel), s.wid * 0.95, paint, 0.03));
  // roof cap and pillars so the greenhouse reads as a car, not a fish tank
  const cab = sc(P.cab), top = cab.filter(([, y]) => y > H * 0.9);
  if (top.length >= 2) { const z0 = Math.min(...top.map((p) => p[0])), z1 = Math.max(...top.map((p) => p[0])); body.add(box(s.wid * 0.85, 0.05, z1 - z0 + 0.06, paint, 0, H * 0.975, (z0 + z1) / 2)); }
  const bz = (cab[0][0] + cab[cab.length - 1][0]) / 2;
  for (const sx of [-1, 1]) body.add(box(0.06, H * 0.36, 0.1, paint, sx * s.wid * 0.42, H * 0.78, bz));
  // bumpers, grille, mirrors, plates
  body.add(box(s.wid * 0.96, H * 0.11, 0.12, MATS.trim(), 0, H * 0.26, L / 2 - 0.02), box(s.wid * 0.96, H * 0.11, 0.12, MATS.trim(), 0, H * 0.26, -L / 2 + 0.02));
  body.add(box(s.wid * 0.42, H * 0.08, 0.03, MATS.trim(), 0, H * 0.4, L / 2 + 0.01));
  body.add(box(0.52, 0.11, 0.02, std('plateF', 0xf5f5f0), 0, H * 0.31, L / 2 + 0.07), box(0.52, 0.11, 0.02, std('plateR', 0xf2c200), 0, H * 0.33, -L / 2 - 0.07));
  for (const sx of [-1, 1]) body.add(box(0.2, 0.12, 0.1, paint, sx * (s.wid / 2 + 0.07), H * 0.64, cab[0][0] - 0.12));
  lights(body, parts, s, H * 0.47, H * 0.55);
  // interior: seats, dashboard, steering wheel (visible from the driver's seat and through the glass)
  const seat = driverSeat(s);
  for (const [x, z] of [[seat.x, seat.z], [-seat.x, seat.z], ...(s.seats > 2 ? [[seat.x, seat.z - 0.85], [-seat.x, seat.z - 0.85]] : [])]) {
    body.add(box(0.48, 0.12, 0.5, MATS.seat(), x, seat.y + 0.12, z), box(0.48, 0.6, 0.1, MATS.seat(), x, seat.y + 0.45, z - 0.25));
  }
  body.add(box(s.wid * 0.82, 0.18, 0.4, MATS.interior(), 0, seat.y + 0.4, seat.z + 0.75));
  steeringWheel(parts, body, seat);
  // driver's door (opens outward on the right-hand side)
  const dz0 = seat.z + 0.55, dz1 = seat.z - 0.55, door = new THREE.Group(); door.position.set(-s.wid / 2 - 0.012, 0, dz0);
  door.add(box(0.03, H * 0.38, dz0 - dz1, paint, 0, H * 0.4, -(dz0 - dz1) / 2));
  door.add(box(0.025, H * 0.3, (dz0 - dz1) * 0.9, MATS.glass(), 0.03, H * 0.76, -(dz0 - dz1) / 2));
  door.add(box(0.04, 0.03, 0.14, MATS.chrome(), -0.02, H * 0.52, -(dz0 - dz1) * 0.78));
  body.add(door); parts.doors.push({ g: door, open: -1.05, side: -1 });
  if (s.livery === 'taxi') {
    body.add(box(0.7, 0.16, 0.24, liveryMat('taxisign', 256, 64, (c, w, h) => { c.fillStyle = '#ffcf1f'; c.fillRect(0, 0, w, h); c.fillStyle = '#111'; c.font = '900 40px Arial'; c.textAlign = 'center'; c.fillText('TAXI', w / 2, 46); }), 0, H + 0.08, -0.1));
    for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.22), liveryMat('taxiside', 512, 72, (c, w, h) => { c.fillStyle = '#0e7c7b'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = '800 34px Arial'; c.fillText('SEASIDE CABS · fictional', 16, 48); })); p.position.set(sx * (s.wid / 2 + 0.03), H * 0.45, -0.3); p.rotation.y = sx * Math.PI / 2; body.add(p); }
  }
  if (s.livery === 'parcel') for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.7), liveryMat('parcel', 768, 192, (c, w, h) => { c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); c.fillStyle = '#ef6a56'; c.fillRect(0, h - 40, w, 40); c.fillStyle = '#10233f'; c.font = '900 76px Arial'; c.fillText('SWIFT PARCELS', 24, 96); c.font = '700 30px Arial'; c.fillText('fictional courier · Felixstowe', 26, 136); })); p.position.set(sx * (s.wid / 2 + 0.035), H * 0.68, -0.8); p.rotation.y = sx * Math.PI / 2; body.add(p); }
  const wz = s.wb / 2, wx = s.track / 2;
  for (const [x, z, f] of [[-wx, wz, true], [wx, wz, true], [-wx, -wz, false], [wx, -wz, false]]) addWheel(g, parts, s, x, z, f);
  return { group: g, parts };
}

function cabBlock(body, s, paint, len, h, frontZ, opts = {}) {
  // a truck/bus cab: rounded front box with windscreen, grille and side windows
  const cab = extrudeProfile([[frontZ - len, 0.55], [frontZ, 0.55], [frontZ + 0.02, h * 0.55], [frontZ - 0.12, h], [frontZ - len, h]], s.wid, paint, 0.06);
  body.add(cab);
  body.add(box(s.wid * 0.9, h * 0.33, 0.04, MATS.glass(), 0, h * 0.75, frontZ - 0.03));
  for (const sx of [-1, 1]) body.add(box(0.04, h * 0.28, len * 0.55, MATS.glass(), sx * (s.wid / 2 + 0.005), h * 0.74, frontZ - len * 0.42));
  body.add(box(s.wid * 0.6, h * 0.18, 0.05, MATS.trim(), 0, h * 0.38, frontZ + 0.02));
  for (const sx of [-1, 1]) body.add(box(0.08, 0.5, 0.2, MATS.trim(), sx * (s.wid / 2 + 0.25), h * 0.75, frontZ - 0.3)); // mirrors
  return cab;
}

function truckModel(s, colour) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const parts = { body, wheels: [], head: [], tail: [], reverse: [], doors: [], steering: null, beacons: [] };
  const paint = MATS.paint(colour), L = s.len, front = L / 2, cabLen = s.shape === 'tractor' ? 2.4 : 2.1, cabH = s.shape === 'tractor' ? s.hgt : Math.min(3.0, s.hgt);
  cabBlock(body, s, paint, cabLen, cabH, front);
  body.add(box(0.18, 0.28, L - 0.6, MATS.trim(), -0.5, 0.75, -0.2), box(0.18, 0.28, L - 0.6, MATS.trim(), 0.5, 0.75, -0.2)); // chassis rails
  const rear = -L / 2, bodyLen = L - cabLen - 0.25, bodyZ = front - cabLen - 0.15 - bodyLen / 2;
  if (s.shape === 'boxtruck' || s.shape === 'refuse') {
    const lm = s.livery === 'freight' ? liveryMat('freight', 1024, 384, (c, w, h) => { c.fillStyle = '#f6f4ee'; c.fillRect(0, 0, w, h); c.fillStyle = '#1d3a60'; c.fillRect(0, h - 70, w, 70); c.font = '900 92px Arial'; c.fillText('FELIXSTOWE', 40, 130); c.fillStyle = '#0e7c7b'; c.fillText('FREIGHT CO.', 40, 230); c.fillStyle = '#fff'; c.font = '700 36px Arial'; c.fillText('fictional haulier', 40, h - 22); }) : paint;
    const bx = box(s.wid, s.hgt - 1.0, bodyLen, s.shape === 'refuse' ? paint : lm, 0, 1.0 + (s.hgt - 1.0) / 2, bodyZ); body.add(bx);
    if (s.shape === 'refuse') { body.add(box(s.wid * 0.98, 1.6, 1.2, MATS.trim(), 0, 1.6, rear + 0.6)); body.add(box(s.wid * 1.01, 0.3, bodyLen * 0.98, std('refuseStripe', 0xf2f0e8), 0, 1.6, bodyZ)); }
  } else if (s.shape === 'flatbed' || s.shape === 'roadworks') {
    body.add(box(s.wid, 0.18, bodyLen, std('deckwood', 0x6b5b45, { r: 0.9 }), 0, 1.15, bodyZ));
    for (const sx of [-1, 1]) body.add(box(0.06, 0.45, bodyLen, paint, sx * s.wid / 2, 1.45, bodyZ));
    if (s.shape === 'roadworks') {
      for (let i = 0; i < 6; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.6, 10), std('cone', 0xff6a00, { r: 0.6 })); c.position.set(-0.6 + (i % 3) * 0.6, 1.55, bodyZ - 1 + Math.floor(i / 3) * 0.7); body.add(c); }
      body.add(box(1.6, 1.0, 0.1, liveryMat('chevron', 256, 160, (c, w, h) => { c.fillStyle = '#f2a900'; c.fillRect(0, 0, w, h); c.fillStyle = '#d61f26'; for (let x = -h; x < w; x += 60) { c.beginPath(); c.moveTo(x, h); c.lineTo(x + 30, h); c.lineTo(x + 30 + h * 0.6, 0); c.lineTo(x + h * 0.6, 0); c.fill(); } }), 0, 2.0, rear + 0.1));
      for (const sx of [-1, 1]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.16, 10), MATS.amber()); b.position.set(sx * 0.7, cabH + 0.1, front - 1.0); body.add(b); parts.beacons.push(b); }
    } else { body.add(box(1.8, 0.9, 2.2, std('crate', 0x8a6a45, { r: 0.9 }), 0, 1.7, bodyZ)); }
  } else if (s.shape === 'tractor') {
    { const fw = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.12, 16), MATS.trim()); fw.position.set(0, 1.2, -s.len / 2 + 1.5); body.add(fw); } // fifth wheel
    for (const sx of [-1, 1]) body.add(box(0.5, 0.5, 1.2, MATS.chrome(), sx * 0.95, 0.75, front - cabLen - 0.4)); // tanks
  }
  const seat = driverSeat(s);
  body.add(box(0.5, 0.15, 0.5, MATS.seat(), seat.x, seat.y + 0.1, seat.z), box(0.5, 0.65, 0.1, MATS.seat(), seat.x, seat.y + 0.45, seat.z - 0.25));
  body.add(box(s.wid * 0.85, 0.25, 0.5, MATS.interior(), 0, seat.y + 0.5, front - 0.35));
  steeringWheel(parts, body, seat, 0.23, 0.9);
  const door = new THREE.Group(); door.position.set(-s.wid / 2 - 0.015, 0, front - 0.2);
  door.add(box(0.03, cabH * 0.55, 1.2, paint, 0, cabH * 0.45, -0.6), box(0.03, cabH * 0.25, 1.0, MATS.glass(), 0.02, cabH * 0.82, -0.55));
  body.add(door); parts.doors.push({ g: door, open: -1.1, side: -1 });
  lights(body, parts, s, 0.85, 0.9, 0.3);
  const wx = s.track / 2, fz = front - 1.15;
  addWheel(g, parts, s, -wx, fz, true); addWheel(g, parts, s, wx, fz, true);
  const rz = fz - s.wb; addWheel(g, parts, s, -wx, rz, false, s.wheelR, 0.3, true); addWheel(g, parts, s, wx, rz, false, s.wheelR, 0.3, true);
  if (s.shape === 'refuse' || s.shape === 'tractor') { addWheel(g, parts, s, -wx, rz - 1.35, false, s.wheelR, 0.3, true); addWheel(g, parts, s, wx, rz - 1.35, false, s.wheelR, 0.3, true); }
  return { group: g, parts };
}

function destTex(text) { return liveryMat('dest:' + text, 512, 80, (c, w, h) => { c.fillStyle = '#111'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffb000'; c.font = '700 44px "Courier New", monospace'; c.fillText(text, 14, 56); }); }
function busModel(s, colour) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const parts = { body, wheels: [], head: [], tail: [], reverse: [], doors: [], steering: null, beacons: [] };
  const paint = MATS.paint(colour), cream = std('cream', 0xf3ead6, { r: 0.4, m: 0.2 }), L = s.len, W = s.wid, H = s.hgt, decker = s.shape === 'decker';
  const floor = 0.42;
  body.add(box(W, 1.0, L, paint, 0, floor + 0.5, 0)); // lower skirt
  const band = (y0, y1) => { body.add(box(W + 0.01, y1 - y0, L - 0.5, MATS.glass(), 0, (y0 + y1) / 2, -0.15)); for (let z = -L / 2 + 0.6; z < L / 2 - 0.4; z += 1.5) for (const sx of [-1, 1]) body.add(box(0.04, y1 - y0, 0.12, cream, sx * (W / 2 + 0.012), (y0 + y1) / 2, z)); };
  band(floor + 1.0, floor + 2.05);
  body.add(box(W, 0.22, L, cream, 0, floor + 2.16, 0));
  if (decker) { band(floor + 2.35, floor + 3.45); body.add(box(W, 0.2, L, paint, 0, floor + 2.26, 0)); body.add(box(W, H - (floor + 3.45), L, paint, 0, (H + floor + 3.45) / 2, 0)); }
  else body.add(box(W, H - (floor + 2.27), L, cream, 0, (H + floor + 2.27) / 2, 0));
  body.add(box(W * 0.94, decker ? 1.15 : 1.25, 0.05, MATS.glass(), 0, floor + 1.65, L / 2 + 0.01)); // windscreen
  body.add(box(W * 0.8, 0.26, 0.05, destTex(decker ? '7 FERRY via TOWN' : '1 TOWN CENTRE'), 0, floor + (decker ? 3.6 : 2.4), L / 2 + 0.02));
  for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.6), liveryMat('busname', 1024, 144, (c, w, h) => { c.fillStyle = '#0e7c7b'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = '900 80px Arial'; c.fillText('Coastline Buses', 24, 96); c.font = '600 28px Arial'; c.fillText('fictional operator', 30, 132); })); p.position.set(sx * (W / 2 + 0.02), floor + 0.55, -1.2); p.rotation.y = sx * Math.PI / 2; body.add(p); }
  // interior: floor, seats in rows, poles, driver cab; upper deck and stairs on the double-decker
  body.add(box(W - 0.1, 0.06, L - 0.2, MATS.floor(), 0, floor + 0.03, 0));
  for (let z = L / 2 - 3.2; z > -L / 2 + 0.8; z -= 0.82) for (const sx of [-1, 1]) { body.add(box(0.9, 0.1, 0.45, MATS.seat(), sx * 0.72, floor + 0.45, z), box(0.9, 0.55, 0.08, std('busseat', 0x1d3a60, { r: 0.8 }), sx * 0.72, floor + 0.75, z - 0.22)); }
  for (let z = L / 2 - 2.4; z > -L / 2 + 1; z -= 2.4) { const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.0, 6), std('pole', 0xf2b632, { r: 0.4, m: 0.6 })); pole.position.set(0.35, floor + 1.0, z); body.add(pole); }
  if (decker) {
    body.add(box(W - 0.1, 0.08, L - 0.3, MATS.floor(), 0, floor + 2.3, 0));
    for (let z = L / 2 - 1.2; z > -L / 2 + 0.8; z -= 0.8) for (const sx of [-1, 1]) body.add(box(0.9, 0.1, 0.45, MATS.seat(), sx * 0.72, floor + 2.75, z), box(0.9, 0.5, 0.08, std('busseat', 0x1d3a60, { r: 0.8 }), sx * 0.72, floor + 3.02, z - 0.22));
    for (let k = 0; k < 8; k++) body.add(box(0.8, 0.06, 0.28, MATS.floor(), -0.75, floor + 0.28 * (k + 1), L / 2 - 2.6 - k * 0.25)); // stairs
  }
  const seat = driverSeat(s);
  body.add(box(0.55, 0.15, 0.55, MATS.seat(), seat.x, seat.y + 0.1, seat.z), box(0.55, 0.7, 0.1, MATS.seat(), seat.x, seat.y + 0.45, seat.z - 0.25));
  body.add(box(1.2, 0.3, 0.55, MATS.interior(), seat.x + 0.2, seat.y + 0.45, L / 2 - 0.4));
  steeringWheel(parts, body, seat, 0.26, 1.1);
  // passenger doors on the nearside (left, local +x): two leaves at the front
  for (const [dz, sgn] of [[L / 2 - 0.35, 1], [L / 2 - 1.55, -1]]) {
    const door = new THREE.Group(); door.position.set(W / 2 + 0.015, 0, dz);
    door.add(box(0.03, 2.1, 0.6, MATS.glass(), 0, floor + 1.1, -sgn * 0.3), box(0.04, 2.1, 0.06, paint, 0, floor + 1.1, -sgn * 0.6));
    body.add(door); parts.doors.push({ g: door, open: sgn * 1.4, side: 1 });
  }
  for (const sx of [-1, 1]) { const h = box(0.3, 0.16, 0.04, MATS.head(), sx * (W / 2 - 0.3), floor + 0.6, L / 2 + 0.02); body.add(h); parts.head.push(h); const t = box(0.2, 0.4, 0.04, MATS.tail(), sx * (W / 2 - 0.15), floor + 0.8, -L / 2 - 0.02); body.add(t); parts.tail.push(t); const r = box(0.15, 0.12, 0.04, MATS.reverse(), sx * (W / 2 - 0.4), floor + 0.5, -L / 2 - 0.02); body.add(r); parts.reverse.push(r); }
  const wx = s.track / 2, fz = L / 2 - 2.6;
  addWheel(g, parts, s, -wx, fz, true, s.wheelR, 0.3); addWheel(g, parts, s, wx, fz, true, s.wheelR, 0.3);
  addWheel(g, parts, s, -wx, fz - s.wb, false, s.wheelR, 0.3, true); addWheel(g, parts, s, wx, fz - s.wb, false, s.wheelR, 0.3, true);
  return { group: g, parts };
}

/** Semi-trailer with a 40 ft shipping container (fictional line). Origin at the kingpin. */
export function trailerModel(t, colour = 0x9c2a22) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const parts = { body, wheels: [], tail: [], reverse: [] };
  const L = t.len, W = t.wid;
  body.add(box(0.2, 0.3, L, MATS.trim(), -0.45, 1.15, -L / 2 + t.kingpin), box(0.2, 0.3, L, MATS.trim(), 0.45, 1.15, -L / 2 + t.kingpin));
  body.add(box(W, 0.12, L, MATS.trim(), 0, 1.33, -L / 2 + t.kingpin));
  const cl = 12.19, ch = 2.59;
  const cont = liveryMat('container' + colour, 1024, 256, (c, w, h) => { const col = '#' + colour.toString(16).padStart(6, '0'); c.fillStyle = col; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(0,0,0,.18)'; for (let x = 0; x < w; x += 18) c.fillRect(x, 0, 6, h); c.fillStyle = '#fff'; c.font = '900 64px Arial'; c.fillText('SEAGULL LINES', 60, 120); c.font = '600 26px Arial'; c.fillText('fictional shipping line', 64, 160); });
  body.add(box(W, ch, cl, cont, 0, 1.4 + ch / 2, -L / 2 + t.kingpin));
  for (const sx of [-1, 1]) { const tl = box(0.25, 0.12, 0.04, MATS.tail(), sx * (W / 2 - 0.2), 1.0, -L + t.kingpin - 0.02); body.add(tl); parts.tail.push(tl); }
  body.add(box(0.12, 1.0, 0.12, MATS.trim(), -0.9, 0.6, -2.2), box(0.12, 1.0, 0.12, MATS.trim(), 0.9, 0.6, -2.2)); // landing legs
  const s = { wid: W, wheelR: t.wheelR };
  for (let k = 0; k < 3; k++) for (const sx of [-1, 1]) addWheel(g, parts, s, sx * 0.95, -t.axleBack + 1.3 - k * 1.3, false, t.wheelR, 0.3, true);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return { group: g, parts };
}

export function buildModel(s, colour) {
  const out = s.cat === 'bus' ? busModel(s, colour) : (s.cat === 'truck' || s.cat === 'hgv') ? truckModel(s, colour) : carModel(s, colour);
  out.group.traverse((o) => { if (o.isMesh) { o.castShadow = !o.material.transparent; o.receiveShadow = true; } });
  return out;
}
