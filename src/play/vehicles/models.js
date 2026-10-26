// Procedural vehicle models (original designs, fictional liveries). Local axes: +z forward, +y up,
// UK right-hand drive (driver on local -x). Every model exposes the parts the simulation animates:
// wheels (spin/steer/suspension), body (pitch/roll), doors, steering wheel and lights.

import * as THREE from 'three';
import { driverSeat } from './specs.js';
import { TEX } from '../../world/textures.js';

const M = new Map();
const mat = (key, make) => { if (!M.has(key)) M.set(key, make()); return M.get(key); };
const std = (key, color, o = {}) => mat(key, () => new THREE.MeshStandardMaterial({ color, roughness: o.r ?? 0.6, metalness: o.m ?? 0, transparent: !!o.t, opacity: o.t ?? 1, side: o.side ?? THREE.FrontSide, emissive: o.e ?? 0x000000, emissiveIntensity: o.ei ?? 1 }));
const phys = (key, o) => mat(key, () => (TEX.low ? new THREE.MeshStandardMaterial({ color: o.color, roughness: Math.max(0.2, o.roughness ?? 0.5), metalness: o.metalness ?? 0, transparent: !!o.transparent, opacity: o.opacity ?? 1, side: o.side ?? THREE.FrontSide })
  : new THREE.MeshPhysicalMaterial(o)));
export const MATS = {
  // two-coat car paint: metallic base under a glossy clear coat that mirrors the sky and the street
  paint: (c) => phys('paint' + c, { color: c, metalness: 0.5, roughness: 0.42, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.3 }),
  glass: () => phys('glass', { color: 0x0e151b, metalness: 0.05, roughness: 0.02, transparent: true, opacity: 0.5, side: THREE.DoubleSide, envMapIntensity: 2.2, clearcoat: 1, clearcoatRoughness: 0 }),
  tyre: () => phys('tyre', { color: 0x1b1b1c, roughness: 0.82, metalness: 0, sheen: 0.2 }),
  rim: () => phys('rim', { color: 0xc9ccd0, roughness: 0.22, metalness: 1, envMapIntensity: 1.4 }),
  disc: () => std('disc', 0x5a5c60, { r: 0.45, m: 0.8 }),
  trim: () => std('trim', 0x1a1b1e, { r: 0.6 }),
  chrome: () => phys('chrome', { color: 0xe4e6e9, roughness: 0.06, metalness: 1, envMapIntensity: 1.6 }),
  lens: () => phys('lens', { color: 0xeef3f6, roughness: 0.02, metalness: 0, transparent: true, opacity: 0.35, clearcoat: 1, envMapIntensity: 2 }),
  seat: () => std('seat', 0x2c2f35, { r: 0.85 }),
  interior: () => std('interior', 0x3a3d43, { r: 0.85 }),
  floor: () => std('floor', 0x55585e, { r: 0.9 }),
  arch: () => std('arch', 0x0b0b0c, { r: 1, side: THREE.DoubleSide }),
  head: () => new THREE.MeshStandardMaterial({ color: 0xfdf8e8, emissive: 0xfff4cc, emissiveIntensity: 0.15, roughness: 0.2 }),
  tail: () => new THREE.MeshStandardMaterial({ color: 0x8a0d0d, emissive: 0xff1a1a, emissiveIntensity: 0.25, roughness: 0.15 }),
  reverse: () => new THREE.MeshStandardMaterial({ color: 0xdcdcdc, emissive: 0xffffff, emissiveIntensity: 0, roughness: 0.2 }),
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

const WHEEL_GEO = new Map();
function wheelGeos(r, tw) {
  const key = r.toFixed(3) + ':' + tw.toFixed(3); if (WHEEL_GEO.has(key)) return WHEEL_GEO.get(key);
  // tyre: a lathe profile with rounded shoulders and a sidewall, axis along x
  const prof = [[r * 0.64, -tw / 2], [r * 0.9, -tw / 2], [r * 0.97, -tw * 0.44], [r, -tw * 0.3], [r, tw * 0.3], [r * 0.97, tw * 0.44], [r * 0.9, tw / 2], [r * 0.64, tw / 2]];
  const tyre = new THREE.LatheGeometry(prof.map(([a, b]) => new THREE.Vector2(a, b)), 28); tyre.rotateZ(Math.PI / 2);
  const barrel = new THREE.CylinderGeometry(r * 0.64, r * 0.64, tw * 0.9, 24, 1, true); barrel.rotateZ(Math.PI / 2);
  const disc = new THREE.CylinderGeometry(r * 0.5, r * 0.5, 0.025, 20); disc.rotateZ(Math.PI / 2);
  const g = { tyre, barrel, disc }; WHEEL_GEO.set(key, g); return g;
}
function addWheel(g, parts, s, x, z, front, r = s.wheelR, tw = 0.24, dual = false, arch = true) {
  const W = tw * (dual ? 1.9 : 1), side = Math.sign(x) || 1;
  const pivot = new THREE.Group(); pivot.position.set(x, r, z);
  const spin = new THREE.Group(); pivot.add(spin);
  const G = wheelGeos(r, W);
  spin.add(new THREE.Mesh(G.tyre, MATS.tyre()), new THREE.Mesh(G.barrel, MATS.rim()));
  const disc = new THREE.Mesh(G.disc, MATS.disc()); disc.position.x = side * W * 0.1; spin.add(disc);
  // five-spoke alloy face, set just inside the tyre's outer sidewall
  const face = side * (W / 2 - 0.035), rimR = r * 0.62;
  const ringM = new THREE.Mesh(new THREE.TorusGeometry(rimR, 0.018, 6, 28).rotateY(Math.PI / 2), MATS.rim()); ringM.position.x = face; spin.add(ringM);
  for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2, sp = box(0.03, rimR * 0.92, 0.055, MATS.rim(), face, Math.cos(a) * rimR * 0.48, Math.sin(a) * rimR * 0.48); sp.rotation.x = -a; spin.add(sp); }
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.13, r * 0.13, 0.04, 14).rotateZ(Math.PI / 2), MATS.chrome()); cap.position.x = face; spin.add(cap);
  g.add(pivot); parts.wheels.push({ pivot, spin, front, x, z, r, rest: r });
  if (arch) { const a = new THREE.Mesh(new THREE.CircleGeometry(r * 1.13, 24), MATS.arch()); a.position.set(side * (s.wid / 2 + 0.004), r, z); a.rotation.y = side * Math.PI / 2; g.add(a); }
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

// ---------- smooth car bodies ----------
// The body is lofted through cross-sections along the car: each section is a rounded "superellipse" whose
// height follows the side profile (bonnet, waist, boot) and whose width rounds off towards the bumpers in plan.
// The bottom edge rises over each axle, so the wheel arches are cut into the body. The glasshouse is a second
// loft that narrows towards the roof (tumblehome); its roof and corner pillars are painted, the rest is glass.
function superRing(hwB, hwM, hwT, y0, y1, p, n) {
  const out = [], yc = (y0 + y1) / 2, b = (y1 - y0) / 2;
  for (let k = 0; k < n; k++) {
    const t = (k / n) * Math.PI * 2, c = Math.cos(t), sn = Math.sin(t);
    const ex = Math.sign(c) * Math.abs(c) ** (2 / p), ey = Math.sign(sn) * Math.abs(sn) ** (2 / p);
    const w = ey >= 0 ? hwM + (hwT - hwM) * ey : hwM + (hwB - hwM) * -ey;
    out.push([ex * w, yc + ey * b]);
  }
  return out;
}
/** Loft rings (one per station) into a mesh; classify(face) picks material group 0 or 1. Ends are capped. */
function loft(stations, p, n, classify, mats) {
  const pos = [], idx0 = [], idx1 = [];
  const rings = stations.map((st) => superRing(st.hwB, st.hwM, st.hwT, st.y0, st.y1, p, n));
  rings.forEach((r, i) => r.forEach(([x, y]) => pos.push(x, y, stations[i].z)));
  let curK = -1; const V = (i, k) => i * n + (k % n), P3 = (v) => [pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]];
  const tri = (a, b, c) => {
    const A = P3(a), B = P3(b), C = P3(c), ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2], vx = C[0] - A[0], vy = C[1] - A[1], vz = C[2] - A[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const L = Math.hypot(nx, ny, nz) || 1; nx /= L; ny /= L; nz /= L;
    (classify ? classify({ nx, ny, nz, y: (A[1] + B[1] + C[1]) / 3, z: (A[2] + B[2] + C[2]) / 3, deg: curK < 0 ? -1 : ((curK + 0.5) / n) * 360 }) : 0) ? idx1.push(a, b, c) : idx0.push(a, b, c);
  };
  for (let i = 0; i < stations.length - 1; i++) for (let k = 0; k < n; k++) { curK = k; tri(V(i, k), V(i + 1, k + 1), V(i + 1, k)); tri(V(i, k), V(i, k + 1), V(i + 1, k + 1)); } // outward-facing
  curK = -1;
  // end caps: separate vertices so the edge stays crisp
  for (const [i, flip] of [[0, true], [stations.length - 1, false]]) {
    const base = pos.length / 3, r = rings[i], z = stations[i].z, cy = (stations[i].y0 + stations[i].y1) / 2;
    pos.push(0, cy, z); r.forEach(([x, y]) => pos.push(x, y, z));
    for (let k = 0; k < n; k++) { const a = base, b = base + 1 + k, c = base + 1 + ((k + 1) % n); flip ? tri(a, c, b) : tri(a, b, c); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex([...idx0, ...idx1]); g.addGroup(0, idx0.length, 0); g.addGroup(idx0.length, idx1.length, 1); g.computeVertexNormals();
  return new THREE.Mesh(g, mats);
}
/** Upper edge of a normalised profile polygon (points above minY), as a function of u (-0.5..0.5). */
function upperEdge(poly, minY) {
  const pts = poly.filter(([, y]) => y > minY).sort((a, b) => a[0] - b[0]);
  return (u) => { if (u <= pts[0][0]) return pts[0][1]; for (let i = 1; i < pts.length; i++) if (u <= pts[i][0]) { const [z0, y0] = pts[i - 1], [z1, y1] = pts[i]; return y0 + (y1 - y0) * (u - z0) / ((z1 - z0) || 1); } return pts[pts.length - 1][1]; };
}
function plateTex(text, rear) {
  return liveryMat('plate:' + text + rear, 256, 56, (c, w, h) => { c.fillStyle = rear ? '#f4c400' : '#f7f7f2'; c.fillRect(0, 0, w, h); c.fillStyle = '#1f3f9c'; c.fillRect(0, 0, 22, h); c.fillStyle = '#fff'; c.font = '700 10px Arial'; c.fillText('UK', 4, h - 8); c.fillStyle = '#111'; c.font = '700 40px "Arial Narrow", Arial, sans-serif'; c.textAlign = 'center'; c.fillText(text, w / 2 + 10, 42); c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 2; c.strokeRect(1, 1, w - 2, h - 2); });
}

function carModel(s, colour) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const parts = { body, wheels: [], head: [], tail: [], reverse: [], doors: [], steering: null, beacons: [] };
  const P = PROFILES[s.shape] || PROFILES.hatch; const L = s.len, H = s.hgt, HW = s.wid / 2;
  const paint = MATS.paint(colour), glass = MATS.glass();
  const belt = upperEdge(P.body, 0.3), roofE = upperEdge(P.cab, 0.55);
  const axles = [s.wb / 2, -s.wb / 2], archR = s.wheelR * 1.14;
  const plan = (u) => { const a = Math.abs(u); return a < 0.4 ? 1 : Math.sqrt(1 - ((a - 0.4) / 0.1) ** 2 * 0.24); }; // modern cars: square-ish ends with rounded corners
  const sill = (z, u) => { let y0 = H * (Math.abs(u) > 0.44 ? 0.25 : 0.19); for (const ax of axles) { const d = Math.abs(z - ax); if (d < archR) y0 = Math.max(y0, s.wheelR + Math.sqrt(archR * archR - d * d) * 0.97); } return y0; };
  // lower body: stations denser at the bumpers and through the arches
  const us = []; for (let i = 0; i <= 40; i++) { const t = i / 40; us.push(-0.5 + t); }
  const lower = us.map((u) => { const z = u * L, hw = HW * plan(u), y1 = belt(u) * H, y0 = Math.min(sill(z, u), y1 - 0.08); return { z, y0, y1, hwB: hw * 0.9, hwM: hw, hwT: hw * 0.84 }; });
  body.add(loft(lower, 4.2, 32, null, [paint]));
  // glasshouse: from the base of the windscreen to the base of the rear window
  const cab = P.cab, uA = cab[0][0], uC = cab[cab.length - 1][0], uTop = cab.filter(([, y]) => y > 0.9);
  const gs = []; for (let i = 0; i <= 18; i++) { const u = uC + (uA - uC) * i / 18, z = u * L, base = belt(u) * H - 0.015, top = Math.max(base + 0.02, roofE(u) * H), hw = HW * plan(u); gs.push({ z, y0: base, y1: top, hwB: hw * 0.94, hwM: hw * 0.88, hwT: hw * 0.76 }); }
  const zB = ((uTop[0]?.[0] ?? 0) + (uTop[uTop.length - 1]?.[0] ?? 0)) / 2 * L - 0.25;
  // painted: the roof skin, the corner pillars (diagonal faces) and the B-pillar band; the rest is glass
  // by position round the section (0 deg = right side, 90 = roof): the flat roof, a strip along each top corner
  // (A-pillars along the windscreen, roof rails, C-pillars along the rear window) and the B-pillar band
  const roofOrPillar = (f) => { if (f.deg < 0 || f.deg > 180) return 0; const top = f.deg > 63 && f.deg < 117, corner = (f.deg >= 45 && f.deg <= 63) || (f.deg >= 117 && f.deg <= 135);
    return (top && Math.abs(f.nz) < 0.3) || corner || (Math.abs(f.z - zB) < 0.07 && !top) ? 1 : 0; };
  body.add(loft(gs, 4.5, 28, roofOrPillar, [glass, paint]));
  if (P.panel) { // vans: the load area behind the cab, painted, with a crease line
    const pe = upperEdge(P.panel, 0.5), ps = [];
    for (let i = 0; i <= 14; i++) { const u = -0.5 + (uC + 0.5) * i / 14 + (i === 14 ? 0.002 : 0), z = u * L, base = belt(u) * H - 0.015, hw = HW * plan(u); ps.push({ z, y0: base, y1: Math.max(base + 0.05, pe(u) * H), hwB: hw * 0.98, hwM: hw * 0.97, hwT: hw * 0.92 }); }
    body.add(loft(ps, 6, 28, null, [paint]));
  }
  // dark wheel-well liners seen through the arches
  for (const ax of axles) { const liner = new THREE.Mesh(new THREE.CylinderGeometry(archR * 0.98, archR * 0.98, HW * 2 * 0.86, 20, 1, true, -Math.PI / 2, Math.PI).rotateZ(Math.PI / 2), MATS.arch()); liner.position.set(0, s.wheelR, ax); body.add(liner); }
  // front: grille in a chrome surround, shaped headlamps; rear: light clusters; bumpers' lower valance in black
  const fz = L / 2, fw = HW * plan(0.5), yF0 = sill(fz, 0.5), yF1 = belt(0.5) * H, yFm = (yF0 + yF1) / 2;
  body.add(box(fw * 0.8, (yF1 - yF0) * 0.28, 0.03, MATS.trim(), 0, yF0 + (yF1 - yF0) * 0.42, fz + 0.012));
  body.add(box(fw * 0.84, 0.018, 0.035, MATS.chrome(), 0, yF0 + (yF1 - yF0) * 0.57, fz + 0.014));
  body.add(box(fw * 1.7, (yF1 - yF0) * 0.22, 0.05, MATS.trim(), 0, yF0 + 0.03, fz - 0.005));
  const rz = -L / 2, rw = HW * plan(-0.5), yR0 = sill(rz, -0.5), yR1 = belt(-0.5) * H;
  body.add(box(rw * 1.7, (yR1 - yR0) * 0.22, 0.05, MATS.trim(), 0, yR0 + 0.03, rz + 0.005));
  for (const sx of [-1, 1]) {
    const hx = sx * fw * 0.62, hy = yF0 + (yF1 - yF0) * 0.66;
    const lens = box(fw * 0.42, (yF1 - yF0) * 0.24, 0.05, MATS.lens(), hx, hy, fz + 0.012), lamp = box(fw * 0.38, (yF1 - yF0) * 0.2, 0.03, MATS.head(), hx, hy, fz - 0.005), refl = box(fw * 0.4, (yF1 - yF0) * 0.22, 0.02, MATS.chrome(), hx, hy, fz - 0.018);
    body.add(refl, lamp, lens); parts.head.push(lamp);
    const tx = sx * rw * 0.66, ty = yR0 + (yR1 - yR0) * 0.62;
    const t = box(rw * 0.46, (yR1 - yR0) * 0.26, 0.04, MATS.tail(), tx, ty, rz - 0.01); body.add(t); parts.tail.push(t);
    const rv = box(rw * 0.14, (yR1 - yR0) * 0.1, 0.042, MATS.reverse(), tx - sx * rw * 0.12, ty - (yR1 - yR0) * 0.06, rz - 0.012); body.add(rv); parts.reverse.push(rv);
  }
  const reg = 'FX' + (20 + (colour % 7)) + ' ' + String.fromCharCode(65 + (colour >> 3) % 26, 65 + (colour >> 9) % 26, 65 + (colour >> 15) % 26);
  body.add(box(0.52, 0.11, 0.012, plateTex(reg, false), 0, yF0 + (yF1 - yF0) * 0.25, fz + 0.04), box(0.52, 0.11, 0.012, plateTex(reg, true), 0, yR0 + (yR1 - yR0) * 0.35, rz - 0.04));
  // mirrors on short stalks at the base of the A-pillars
  for (const sx of [-1, 1]) { const mz = uA * L - 0.15, my = belt(uA) * H + 0.1, mx = sx * (HW * 0.93 + 0.1); body.add(box(0.06, 0.03, 0.06, MATS.trim(), sx * (HW * 0.93 + 0.03), my - 0.02, mz), box(0.1, 0.12, 0.14, paint, mx, my, mz), box(0.012, 0.09, 0.11, MATS.chrome(), mx + sx * 0.05, my, mz + 0.01)); }
  // interior: seats, dashboard, steering wheel (visible through the glass)
  const seat = driverSeat(s);
  for (const [x, z] of [[seat.x, seat.z], [-seat.x, seat.z], ...(s.seats > 2 ? [[seat.x, seat.z - 0.85], [-seat.x, seat.z - 0.85]] : [])]) body.add(box(0.48, 0.12, 0.5, MATS.seat(), x, seat.y + 0.12, z), box(0.48, 0.6, 0.1, MATS.seat(), x, seat.y + 0.45, z - 0.25));
  body.add(box(s.wid * 0.8, 0.18, 0.4, MATS.interior(), 0, seat.y + 0.4, seat.z + 0.75));
  steeringWheel(parts, body, seat);
  // driver's door (right-hand side, local -x): a panel flush with the side, with a shut line and a chrome handle
  const dz0 = seat.z + 0.55, dz1 = seat.z - 0.55, du = seat.z / L, dy0 = H * 0.22, dy1 = belt(du) * H - 0.03, door = new THREE.Group();
  door.position.set(-HW + 0.012, 0, dz0); // closed, the panel sits just inside the body skin; it shows when it swings open
  door.add(box(0.018, dy1 - dy0, dz0 - dz1, paint, 0, (dy0 + dy1) / 2, -(dz0 - dz1) / 2));
  for (const zz of [dz0, dz1]) body.add(box(0.012, dy1 - dy0, 0.008, MATS.trim(), -HW - 0.003, (dy0 + dy1) / 2, zz)); // shut lines
  door.add(box(0.035, 0.028, 0.14, MATS.chrome(), -0.03, dy1 - 0.12, -(dz0 - dz1) * 0.78));
  body.add(door); parts.doors.push({ g: door, open: -1.05, side: -1 });
  if (s.livery === 'taxi') {
    body.add(box(0.7, 0.16, 0.24, liveryMat('taxisign', 256, 64, (c, w, h) => { c.fillStyle = '#ffcf1f'; c.fillRect(0, 0, w, h); c.fillStyle = '#111'; c.font = '900 40px Arial'; c.textAlign = 'center'; c.fillText('TAXI', w / 2, 46); }), 0, H + 0.08, -0.1));
    for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.22), liveryMat('taxiside', 512, 72, (c, w, h) => { c.fillStyle = '#0e7c7b'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = '800 34px Arial'; c.fillText('SEASIDE CABS · fictional', 16, 48); })); p.position.set(sx * (HW + 0.02), H * 0.4, -0.3); p.rotation.y = sx * Math.PI / 2; body.add(p); }
  }
  if (s.livery === 'parcel') for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.7), liveryMat('parcel', 768, 192, (c, w, h) => { c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); c.fillStyle = '#ef6a56'; c.fillRect(0, h - 40, w, 40); c.fillStyle = '#10233f'; c.font = '900 76px Arial'; c.fillText('SWIFT PARCELS', 24, 96); c.font = '700 30px Arial'; c.fillText('fictional courier · Felixstowe', 26, 136); })); p.position.set(sx * (HW + 0.025), H * 0.68, -0.8); p.rotation.y = sx * Math.PI / 2; body.add(p); }
  const wz = s.wb / 2, wx = s.track / 2;
  for (const [x, z, f] of [[-wx, wz, true], [wx, wz, true], [-wx, -wz, false], [wx, -wz, false]]) addWheel(g, parts, s, x, z, f, s.wheelR, 0.22, false, false);
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

// soft contact shadow under a vehicle: a blurred dark patch on the road (sky light is blocked under the body)
let SHADOW_TEX = null;
function contactShadow(len, wid) {
  if (!SHADOW_TEX) { const c = document.createElement('canvas'); c.width = 64; c.height = 128; const x = c.getContext('2d'); const g = x.createRadialGradient(32, 64, 4, 32, 64, 64); g.addColorStop(0, 'rgba(0,0,0,0.85)'); g.addColorStop(0.55, 'rgba(0,0,0,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.save(); x.scale(1, 1); x.fillRect(0, 0, 64, 128); x.restore(); SHADOW_TEX = new THREE.CanvasTexture(c); }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(wid * 1.35, len * 1.12), new THREE.MeshBasicMaterial({ map: SHADOW_TEX, transparent: true, depthWrite: false, opacity: 0.7, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.03; m.renderOrder = 1; m.name = 'contact-shadow'; return m;
}
export function buildModel(s, colour) {
  const out = s.cat === 'bus' ? busModel(s, colour) : (s.cat === 'truck' || s.cat === 'hgv') ? truckModel(s, colour) : carModel(s, colour);
  out.group.add(contactShadow(s.len, s.wid));
  out.group.traverse((o) => { if (o.isMesh && o.name !== 'contact-shadow') { o.castShadow = !o.material.transparent; o.receiveShadow = true; } });
  return out;
}
