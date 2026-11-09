// The Beach House kiosk next to the pier (OSM cafe node 9383771519 "Kiosk 28", inside building way 1017356068, Undercliff Road West).
// Modelled from a photograph supplied by the user (9 Nov 2026): a single-storey timber kiosk clad in dark navy-black horizontal boards,
// a deep fascia carrying two brown signs with white borders and stars (a small "Ice Cream" one to the left, a large "Coffee" one over
// the hatch), a wide service hatch under a pale roll-up awning with small spotlights, white boarded counter front with a timber
// counter top, a red fridge and coffee machine inside, a glass-topped ice cream chiller in front of the counter, a giant fibreglass
// ice cream cone on a black cross base, an A-frame chalkboard, two black bar stools and a basket of buckets and spades.
// Footprint from OSM (about 7.1 x 5.4 m); height, depths and prop sizes are estimates scaled from the photo. No brand names or logos
// from the photo are drawn (the fridge and the chiller are plain).

import * as THREE from 'three';
import { ensureCCW } from '../geo/polygon.js';

export const isBeachHouse = (b) => b.id === 1017356068;

let M = null;
function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function tex(c, rep = false) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (rep) t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }
function boardsTex(base, line) { // horizontal clapboard: one board per 0.18 m
  const [c, g] = cv(64, 128); g.fillStyle = base; g.fillRect(0, 0, 64, 128);
  for (let i = 0; i < 8; i++) { g.fillStyle = line; g.fillRect(0, i * 16, 64, 2); g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(0, i * 16 + 2, 64, 3); }
  return tex(c, true);
}
function signTex(text, wPx, hPx) { // brown board, white double border, a star either side of the word
  const [c, g] = cv(wPx, hPx); g.fillStyle = '#4d3532'; g.fillRect(0, 0, wPx, hPx);
  g.strokeStyle = '#f1ece6'; g.lineWidth = hPx * 0.05; g.strokeRect(hPx * 0.05, hPx * 0.05, wPx - hPx * 0.1, hPx - hPx * 0.1);
  g.fillStyle = '#f1ece6'; g.textAlign = 'center'; g.textBaseline = 'middle';
  let fs = hPx * 0.56; g.font = `600 ${fs}px "Helvetica Neue", Arial, sans-serif`; const tw = g.measureText(text).width, max = wPx - hPx * 1.5; if (tw > max) { fs *= max / tw; g.font = `600 ${fs}px "Helvetica Neue", Arial, sans-serif`; }
  g.fillText(text, wPx / 2, hPx / 2 + 2);
  const star = (x, r) => { g.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.42 : r; g.lineTo(x + Math.cos(a) * rr, hPx / 2 + Math.sin(a) * rr); } g.closePath(); g.fill(); };
  const half = Math.min(tw, max) / 2 + hPx * 0.42; star(wPx / 2 - half, hPx * 0.2); star(wPx / 2 + half, hPx * 0.2);
  return tex(c);
}
function chalkTex() { // A-frame board: black, hand-lettered white lines (generic wording)
  const [c, g] = cv(256, 384); g.fillStyle = '#1c1c1c'; g.fillRect(0, 0, 256, 384); g.strokeStyle = '#8a6a44'; g.lineWidth = 12; g.strokeRect(6, 6, 244, 372);
  g.fillStyle = '#f2f0ea'; g.textAlign = 'center'; g.textBaseline = 'middle';
  [['Delicious', 70, 40], ['HOT DONUTS', 125, 44], ['Freshly made', 190, 30], ['COFFEE', 255, 50], ['ICE CREAM', 320, 40]].forEach(([t, y, s]) => { g.font = `700 ${s}px "Comic Sans MS", "Segoe Print", cursive`; g.fillText(t, 128, y, 220); });
  return tex(c);
}
function mats() {
  if (M) return M; const std = (o) => new THREE.MeshStandardMaterial(o);
  M = {
    clad: std({ map: boardsTex('#1b2229', '#0c1014'), roughness: 0.8 }),
    cladSide: std({ map: boardsTex('#1b2229', '#0c1014'), roughness: 0.8 }),
    white: std({ map: boardsTex('#e9ebe9', '#b9bdbc'), roughness: 0.7 }),
    timber: std({ color: 0x8b6a44, roughness: 0.6 }),
    roof: std({ color: 0x15191d, roughness: 0.9 }),
    inside: std({ color: 0x15171a, roughness: 0.95 }),
    insideFloor: std({ color: 0x2c2a27, roughness: 0.9 }),
    awning: std({ color: 0xdfe2e4, roughness: 0.5 }),
    steel: std({ color: 0x25282b, roughness: 0.45, metalness: 0.6 }),
    chrome: std({ color: 0xaab0b5, roughness: 0.25, metalness: 0.8 }),
    lamp: std({ color: 0xfff2cf, emissive: 0xffe2a0, emissiveIntensity: 0.8 }),
    fridge: std({ color: 0xc4161c, roughness: 0.4 }),
    glass: new THREE.MeshStandardMaterial({ color: 0xbfd6e4, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.35 }),
    chiller: std({ color: 0x2c4a7c, roughness: 0.5 }),
    cone: std({ color: 0xd8b98a, roughness: 0.8 }), swirl: std({ color: 0xf6f1e4, roughness: 0.7 }), flake: std({ color: 0x4a2a1a, roughness: 0.8 }),
    basket: std({ color: 0x7a5a3a, roughness: 0.9 }), red: std({ color: 0xd9352b, roughness: 0.6 }), blue: std({ color: 0x2c6fd1, roughness: 0.6 }), yellow: std({ color: 0xf0c52f, roughness: 0.6 }),
    chalk: std({ map: chalkTex(), roughness: 0.9 }),
    sign: { ice: std({ map: signTex('Ice Cream', 640, 200), roughness: 0.6 }), coffee: std({ map: signTex('Coffee', 1280, 240), roughness: 0.6 }) },
  };
  M.clad.map.repeat.set(3, 1.6); M.cladSide.map.repeat.set(3, 1.6); M.white.map.repeat.set(3, 1.1);
  return M;
}

export function buildBeachHouse(b, ctx) {
  const m = mats(), outer = ensureCCW(b.outer);
  // front: the long edge that faces the sea (towards the south-east), as in the photograph
  const sea = [0.62, 0.78]; let best = null;
  for (let i = 0; i < outer.length; i++) {
    const a = outer[i], c = outer[(i + 1) % outer.length], L = Math.hypot(c[0] - a[0], c[1] - a[1]); if (L < 4) continue;
    const nx = -(c[1] - a[1]) / L, nz = (c[0] - a[0]) / L, score = nx * sea[0] + nz * sea[1] + L * 0.01; if (!best || score > best.score) best = { score, a, c, L, nx, nz };
  }
  const { a: A, c: B, L: W, nx: Nx, nz: Nz } = best, Ex = (B[0] - A[0]) / W, Ez = (B[1] - A[1]) / W, Ox = (A[0] + B[0]) / 2, Oz = (A[1] + B[1]) / 2;
  let D = 0, gMin = Infinity; for (const [x, z] of outer) { D = Math.max(D, -((x - Ox) * Nx + (z - Oz) * Nz)); gMin = Math.min(gMin, ctx.ground(x, z)); }
  const base = ctx.ground(Ox + Nx * 1.5, Oz + Nz * 1.5);
  const group = new THREE.Group(); group.name = 'landmark:beach-house';
  const local = new THREE.Group(); local.position.set(Ox, base, Oz); local.rotation.y = Math.atan2(-Ez, Ex); group.add(local);
  const box = (mat, x0, x1, y0, y1, z0, z1) => { const me = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat); me.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); me.castShadow = me.receiveShadow = true; local.add(me); return me; };
  const plane = (mat, x0, x1, y0, y1, z, ry = 0) => { const me = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0), mat); me.position.set((x0 + x1) / 2, (y0 + y1) / 2, z); me.rotation.y = ry; local.add(me); return me; };
  const cyl = (mat, r0, r1, h, x, y, z, seg = 16) => { const me = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, h, seg), mat); me.position.set(x, y + h / 2, z); me.castShadow = true; local.add(me); return me; };
  const hw = W / 2, H = 3.0, CT = 1.0, OPEN = 2.1, T = 0.14; // overall height, counter height, hatch head, wall thickness
  const o0 = -hw + 0.95, o1 = hw - 0.55; // hatch opening
  // floor, side and back walls, roof
  box(m.insideFloor, -hw, hw, -0.25, 0.05, -D, 0);
  box(m.cladSide, -hw, -hw + T, 0, H - 0.05, -D, 0); box(m.cladSide, hw - T, hw, 0, H - 0.05, -D, 0); box(m.cladSide, -hw, hw, 0, H - 0.05, -D, -D + T);
  box(m.roof, -hw - 0.25, hw + 0.25, H - 0.05, H + 0.12, -D - 0.25, 0.4);
  // front: white boarded counter front, dark piers either side of the hatch, deep dark fascia
  box(m.white, -hw, hw, 0, CT, -T, 0.02);
  box(m.clad, -hw, o0, CT, OPEN, -T, 0.02); box(m.clad, o1, hw, CT, OPEN, -T, 0.02);
  box(m.clad, -hw, hw, OPEN, H - 0.05, -T, 0.05);
  box(m.steel, -hw, hw, 0, 0.1, -T, 0.04); // plinth
  // timber counter top, projecting
  box(m.timber, o0 - 0.15, o1 + 0.15, CT, CT + 0.05, -0.9, 0.38);
  // roll-up awning cassette and spotlights under the fascia
  box(m.awning, o0 - 0.1, o1 + 0.1, OPEN - 0.3, OPEN + 0.02, -0.05, 0.42);
  for (let k = 0; k < 5; k++) { const x = o0 + 0.6 + ((o1 - o0 - 1.2) * k) / 4; cyl(m.steel, 0.045, 0.045, 0.14, x, OPEN - 0.45, 0.25, 8); box(m.lamp, x - 0.025, x + 0.025, OPEN - 0.47, OPEN - 0.44, 0.23, 0.27); }
  // signs on the fascia: small "Ice Cream" over the left pier, big "Coffee" over the hatch
  plane(m.sign.ice, -hw + 0.2, -hw + 1.9, OPEN + 0.14, OPEN + 0.74, 0.06);
  plane(m.sign.coffee, -hw + 2.15, hw - 0.2, OPEN + 0.12, OPEN + 0.76, 0.06);
  // inside: dark back wall at 1.6 m, shelves, red fridge (plain), coffee machine, a chalk menu
  box(m.inside, -hw + T, hw - T, 0, OPEN, -1.7, -1.62);
  box(m.fridge, 0.35, 1.05, 0.05, 1.75, -1.6, -1.0); box(m.glass, 0.4, 1.0, 0.7, 1.7, -1.0, -0.98);
  box(m.steel, o1 - 1.5, o1 - 0.8, CT + 0.05, CT + 0.55, -0.7, -0.2); box(m.chrome, o1 - 1.45, o1 - 0.85, CT + 0.2, CT + 0.45, -0.22, -0.18);
  box(m.timber, o0 + 0.2, 0.2, 1.25, 1.3, -1.6, -1.2); box(m.timber, o0 + 0.2, 0.2, 1.65, 1.7, -1.6, -1.2);
  plane(new THREE.MeshStandardMaterial({ map: chalkTex(), roughness: 0.9 }), -1.9, -1.2, 1.1, 1.85, -1.6 + 0.0);
  // glass-topped ice cream chiller in front of the counter on the left (plain blue base, curved glass top)
  box(m.chiller, o0 + 0.2, o0 + 1.7, 0.05, 0.85, 0.35, 0.95); box(m.glass, o0 + 0.2, o0 + 1.7, 0.85, 1.2, 0.35, 0.95);
  // giant fibreglass ice cream on a black cross base, left of the hatch
  { const px = -hw + 0.55, pz = 1.7; box(m.steel, px - 0.45, px + 0.45, 0.02, 0.07, pz - 0.05, pz + 0.05); box(m.steel, px - 0.05, px + 0.05, 0.02, 0.07, pz - 0.45, pz + 0.45);
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.03, 0.95, 16), m.cone); cone.position.set(px, 0.55, pz); cone.castShadow = true; local.add(cone);
    cyl(m.swirl, 0.3, 0.3, 0.2, px, 1.0, pz); cyl(m.swirl, 0.24, 0.24, 0.2, px, 1.2, pz); cyl(m.swirl, 0.16, 0.16, 0.2, px, 1.4, pz); cyl(m.swirl, 0.07, 0.03, 0.2, px, 1.6, pz);
    const fl = box(m.flake, px - 0.05, px + 0.05, 1.1, 1.95, pz - 0.02, pz + 0.02); fl.position.set(px + 0.2, 1.55, pz - 0.1); fl.rotation.z = -0.22; }
  // A-frame chalkboard on the left, two black bar stools on the right, a basket of buckets and spades
  { const px = -hw - 0.35, pz = 2.5; const bd = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.9, 0.05), m.chalk); bd.position.set(px, 0.5, pz); bd.rotation.x = -0.12; local.add(bd);
    box(m.steel, px - 0.3, px - 0.26, 0, 0.9, pz - 0.35, pz - 0.3); box(m.steel, px + 0.26, px + 0.3, 0, 0.9, pz - 0.35, pz - 0.3); }
  for (const sx of [hw - 1.2, hw - 0.4]) { const z = 1.7; cyl(m.steel, 0.17, 0.17, 0.04, sx, 0.72, z, 20); for (const [dx, dz] of [[-0.12, -0.12], [0.12, -0.12], [-0.12, 0.12], [0.12, 0.12]]) cyl(m.steel, 0.012, 0.012, 0.72, sx + dx, 0, z + dz, 6); cyl(m.steel, 0.12, 0.12, 0.01, sx, 0.3, z, 12); }
  { const px = 0.6, pz = 1.9; const bk = cyl(m.basket, 0.27, 0.22, 0.4, px, 0, pz, 14);
    for (const [dx, dz, c, h] of [[-0.1, 0.03, m.red, 0.42], [0.08, -0.06, m.blue, 0.5], [0.0, 0.09, m.yellow, 0.36], [-0.05, -0.1, m.blue, 0.34]]) { const t = box(c, -0.05, 0.05, 0, h, -0.05, 0.05); t.position.set(px + dx, 0.4 + h / 2 - 0.1, pz + dz); t.rotation.z = dx * 1.4; } }
  plane(m.steel, -0.45, 0.45, 0, 2.0, -D - 0.01, Math.PI); // a plain black staff door in the rear wall
  return { group, collider: { outer, holes: [], base: gMin - 0.3, top: base + H + 0.15 } };
}
