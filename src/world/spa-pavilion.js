// Spa Pavilion Theatre, Undercliff Road West (OSM way 240664453) – exterior and an enterable interior.
// Sources: OSM footprint; EA LiDAR heights (median 7.0 m, 90th percentile 10.8 m above ground); Theatres
// Trust database (raked auditorium with proscenium stage, 919 seats; rebuilt 1950; sea-view lounge 1960);
// photographs supplied by the user (Oct 2026): the landward entrance with its stair, the seaward glazed
// lounge over a colonnade, the auditorium and the foyer. The user reports that the red elements are now
// blue. Layout (entrance room -> foyer -> auditorium, doors "SEATS 1 TO 16" / "SEATS 17 TO 33") follows the
// user's description; room sizes are estimates fitted inside the OSM footprint.
//
// Local frame: u along the seafront from the entrance (SW) end, v from the seaward facade towards the
// cliff, y = metres above Ordnance Datum. The local THREE group maps (x=u, y, z=-v).

import * as THREE from 'three';
import { ensureCCW, insetRing, pointInRing } from '../geo/polygon.js';
import { triangulate } from './accum.js';

export const isSpaPavilion = (b) => b.id === 240664453 || /^spa pavilion/i.test(b.name || '');

let M = null;
const cnv = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
const SANS = '"Gill Sans", "Gill Sans MT", "Helvetica Neue", Arial, sans-serif';
function mats() {
  if (M) return M;
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const lit = (color, k = 0.35, extra = {}) => std({ color, emissive: color, emissiveIntensity: k, roughness: 0.8, side: THREE.DoubleSide, ...extra });
  const letters = (text, color, w, h, font) => std({ map: cnv(w, h, (g) => { g.fillStyle = color; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + 2); }), transparent: true, alphaTest: 0.35, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, roughness: 0.4 });
  const posterColours = [['#1f1147', '#e94f8a'], ['#0e3b43', '#f3c64b'], ['#3b0d0d', '#f28c28'], ['#13233f', '#7fd1e8'], ['#2a1a05', '#e8d06a'], ['#24123a', '#b48cf2']];
  const posterWords = ['LIVE ON STAGE', 'COMEDY NIGHT', 'TRIBUTE CONCERT', 'FAMILY PANTO', 'DANCE SHOW', 'MUSIC NIGHT'];
  M = {
    render: std({ color: 0xf0e9d2, roughness: 0.85, side: THREE.DoubleSide }),
    brown: std({ color: 0x5a3e2e, roughness: 0.7 }),
    steps: std({ color: 0xcdcac2, roughness: 0.9 }),
    nosing: std({ color: 0xe8c22a, roughness: 0.6 }),
    rail: std({ color: 0x6f7f94, roughness: 0.4, metalness: 0.6 }),
    black: std({ color: 0x1b1d20, roughness: 0.5, metalness: 0.4 }),
    door: std({ color: 0x4a2a1f, roughness: 0.6 }),
    glass: std({ color: 0x2a3540, roughness: 0.08, metalness: 0.6, side: THREE.DoubleSide }),
    silver: std({ color: 0xc3c8cc, roughness: 0.35, metalness: 0.7 }),
    blue: std({ color: 0x2c5da8, roughness: 0.5 }),          // exterior panels, frames, planters (were red)
    white: std({ color: 0xf6f6f2, roughness: 0.6 }),
    dark: std({ color: 0x23272c, roughness: 0.9 }),
    bigLetters: letters('SPA PAVILION', '#1f4fb4', 1536, 192, `700 150px ${SANS}`),
    smallLetters: letters('SPA PAVILION', '#24489c', 1024, 128, `600 92px ${SANS}`),
    restaurant: std({ map: cnv(1024, 128, (g, w, h) => { g.fillStyle = '#f2f0ea'; g.fillRect(0, 0, w, h); g.fillStyle = '#2f3338'; g.font = `500 80px ${SANS}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('RESTAURANT', w / 2, h / 2 + 3); }), roughness: 0.6 }),
    cafe: std({ map: cnv(512, 128, (g, w, h) => { g.fillStyle = '#2b3642'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,230,190,0.25)'; g.fillRect(0, h * 0.2, w, h * 0.7); g.strokeStyle = '#2c5da8'; g.lineWidth = 10; g.strokeRect(5, 5, w - 10, h - 10); for (let x = 0; x <= w; x += w / 4) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } g.beginPath(); g.moveTo(0, h * 0.3); g.lineTo(w, h * 0.3); g.stroke(); }), roughness: 0.2, metalness: 0.2 }),
    lounge: std({ map: cnv(256, 256, (g, w, h) => { g.fillStyle = '#3a4955'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(200,220,235,0.25)'; g.fillRect(0, 0, w, h * 0.5); g.strokeStyle = '#c8cdd1'; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, h - 8); for (const y of [0.33, 0.66]) { g.beginPath(); g.moveTo(0, h * y); g.lineTo(w, h * y); g.stroke(); } g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.stroke(); }), roughness: 0.1, metalness: 0.5, side: THREE.DoubleSide }),
    // interior
    carpet: lit(0x3d5876, 0.3, { roughness: 1 }),
    wood: lit(0x6b3f22, 0.3),
    wallCream: lit(0xf0ead4, 0.45),
    dadoBlue: lit(0x2a5a8c, 0.4),
    gold: lit(0xb89a3c, 0.4, { metalness: 0.5 }),
    ceiling: lit(0xf4f2ec, 0.5),
    skylight: std({ color: 0xffffff, emissive: 0xeaf2ff, emissiveIntensity: 1.1, side: THREE.DoubleSide }),
    pendant: std({ color: 0xd8dbde, emissive: 0xfff3dc, emissiveIntensity: 0.6, metalness: 0.6, roughness: 0.3 }),
    seat: lit(0x2a3f78, 0.32, { roughness: 0.95, side: THREE.FrontSide }),
    audWall: lit(0x4d6f9e, 0.38),
    audDado: lit(0xd8c27a, 0.35),
    rib: lit(0x2a54a0, 0.4),
    stageBlack: lit(0x161616, 0.2),
    drape: lit(0x1f3c88, 0.35),
    backdrop: lit(0xd9d4c4, 0.45),
    pros: lit(0x1b2552, 0.35),
    spot: std({ color: 0xffffff, emissive: 0xfff4d8, emissiveIntensity: 1.4 }),
    exit: std({ map: cnv(256, 96, (g, w, h) => { g.fillStyle = '#1aa04a'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = `700 60px ${SANS}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('EXIT', w / 2, h / 2 + 2); }), emissive: 0xffffff, emissiveIntensity: 0.9, emissiveMap: null }),
    doorGrey: std({ map: cnv(256, 512, (g, w, h) => { g.fillStyle = '#7d858f'; g.fillRect(0, 0, w, h); g.strokeStyle = '#d6bd5a'; g.lineWidth = 12; g.strokeRect(w * 0.22, h * 0.12, w * 0.56, h * 0.72); g.fillStyle = '#c9a84a'; g.fillRect(w * 0.08, h * 0.45, 10, 60); }), emissive: 0x7d858f, emissiveIntensity: 0.3, side: THREE.DoubleSide }),
    sign1: std({ map: cnv(512, 96, (g, w, h) => { g.fillStyle = '#16181b'; g.fillRect(0, 0, w, h); g.fillStyle = '#e6d9a8'; g.font = `500 58px ${SANS}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('SEATS 1 TO 16', w / 2, h / 2 + 3); }), emissive: 0xffffff, emissiveIntensity: 0.25, side: THREE.DoubleSide }),
    sign2: std({ map: cnv(512, 96, (g, w, h) => { g.fillStyle = '#16181b'; g.fillRect(0, 0, w, h); g.fillStyle = '#e6d9a8'; g.font = `500 58px ${SANS}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('SEATS 17 TO 33', w / 2, h / 2 + 3); }), emissive: 0xffffff, emissiveIntensity: 0.25, side: THREE.DoubleSide }),
    posters: posterColours.map(([bg, fg], i) => std({ map: cnv(256, 360, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, bg); gr.addColorStop(1, '#000'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = fg; g.beginPath(); g.arc(w * 0.5, h * 0.42, w * 0.28, 0, 7); g.fill(); g.fillStyle = '#fff'; g.font = `700 26px ${SANS}`; g.textAlign = 'center'; g.fillText(posterWords[i], w / 2, h * 0.82); g.font = `400 16px ${SANS}`; g.fillText('SPA PAVILION', w / 2, h * 0.9); g.strokeStyle = '#c9a84a'; g.lineWidth = 10; g.strokeRect(0, 0, w, h); }), emissive: 0xffffff, emissiveIntensity: 0.25, side: THREE.DoubleSide })),
    redBoard: lit(0xc8102e, 0.3), // the foyer poster boards in the user's foyer photo are red
    chair: lit(0x5a5c66, 0.3),
    pale: lit(0xd7c49a, 0.35),
  };
  M.exit.emissiveMap = M.exit.map;
  return M;
}

/** Floor level of the entrance/foyer (m ODN) – used before the tile's ground is built to dig the hall in. */
export function spaFloorLevel(b, ground) {
  const f = spaFrame(b); const gw = (u, v) => ground(...f.W(u, v));
  const Gp = gw(18, -3), Gf = gw(-17, 16); const n = Math.max(12, Math.round((Math.max(Gp + 3.6, Gf + 3.3) - Gf) / 0.165));
  return Gf + n * 0.165;
}
function spaFrame(b) {
  const outer = ensureCCW(b.outer);
  let li = 0, lL = 0; for (let i = 0; i < outer.length; i++) { const a = outer[i], c = outer[(i + 1) % outer.length], L = Math.hypot(c[0] - a[0], c[1] - a[1]); if (L > lL) { lL = L; li = i; } }
  let A = outer[li], C = outer[(li + 1) % outer.length]; if (C[0] < A[0]) [A, C] = [C, A];
  const Ux = (C[0] - A[0]) / lL, Uz = (C[1] - A[1]) / lL;
  const cx = outer.reduce((s, p) => s + p[0], 0) / outer.length, cz = outer.reduce((s, p) => s + p[1], 0) / outer.length;
  let Vx = -Uz, Vz = Ux; if ((cx - A[0]) * Vx + (cz - A[1]) * Vz < 0) { Vx = -Vx; Vz = -Vz; }
  return { outer, A, Ux, Uz, Vx, Vz, cx, cz, W: (u, v) => [A[0] + Ux * u + Vx * v, A[1] + Uz * u + Vz * v] };
}

export function buildSpaPavilion(b, ctx) {
  const m = mats();
  const outer = ensureCCW(b.outer);
  // frame: longest edge is the seaward facade; u runs along it eastwards, v towards the footprint centre
  let li = 0, lL = 0; for (let i = 0; i < outer.length; i++) { const a = outer[i], c = outer[(i + 1) % outer.length], L = Math.hypot(c[0] - a[0], c[1] - a[1]); if (L > lL) { lL = L; li = i; } }
  let A = outer[li], C = outer[(li + 1) % outer.length]; if (C[0] < A[0]) [A, C] = [C, A];
  const Ux = (C[0] - A[0]) / lL, Uz = (C[1] - A[1]) / lL;
  const cx = outer.reduce((s, p) => s + p[0], 0) / outer.length, cz = outer.reduce((s, p) => s + p[1], 0) / outer.length;
  let Vx = -Uz, Vz = Ux; if ((cx - A[0]) * Vx + (cz - A[1]) * Vz < 0) { Vx = -Vx; Vz = -Vz; }
  const W = (u, v) => [A[0] + Ux * u + Vx * v, A[1] + Uz * u + Vz * v];
  const toL = (x, z) => { const dx = x - A[0], dz = z - A[1]; return [dx * Ux + dz * Uz, dx * Vx + dz * Vz]; };
  const gw = (u, v) => ctx.ground(...W(u, v));
  const Gp = gw(18, -3), Gf = gw(-17, 16);
  const nSteps = Math.max(12, Math.round((Math.max(Gp + 3.6, Gf + 3.3) - Gf) / 0.165)), rise = 0.165, F = Gf + nSteps * rise;
  const LF = Gp + 3.7, LT = LF + 3.6, E = F + 6.3; // lounge floor, lounge top, hall eaves
  const group = new THREE.Group(); group.name = 'landmark:spa-pavilion';
  const local = new THREE.Group(); local.position.set(A[0], 0, A[1]); local.rotation.y = Math.atan2(-Uz, Ux); group.add(local);
  // when V = -(local z), the mapping x=u, z=-v holds; otherwise mirror v
  const zs = (Math.sin(local.rotation.y) * Vx + Math.cos(local.rotation.y) * Vz) > 0 ? 1 : -1; // local z axis . V
  const Z = (v) => v * zs;
  const add = (mesh, cast = true) => { mesh.castShadow = cast; mesh.receiveShadow = true; local.add(mesh); return mesh; };
  const box = (mat, u0, u1, y0, y1, v0, v1, cast = true) => { const me = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(u1 - u0), Math.abs(y1 - y0), Math.abs(v1 - v0)), mat); me.position.set((u0 + u1) / 2, (y0 + y1) / 2, Z((v0 + v1) / 2)); return add(me, cast); };
  // vertical plane between two local points (double-sided materials)
  const wall = (mat, u0, v0, u1, v1, y0, y1, toward = null) => { if (toward) { const nu = -zs * (v1 - v0), nv = zs * (u1 - u0); if ((toward[0] - (u0 + u1) / 2) * nu + (toward[1] - (v0 + v1) / 2) * nv < 0) { [u0, u1] = [u1, u0]; [v0, v1] = [v1, v0]; } } const L = Math.hypot(u1 - u0, v1 - v0); if (L < 0.01) return null; const me = new THREE.Mesh(new THREE.PlaneGeometry(L, y1 - y0), mat); me.position.set((u0 + u1) / 2, (y0 + y1) / 2, Z((v0 + v1) / 2)); me.rotation.y = -Math.atan2(Z(v1 - v0), u1 - u0); return add(me, false); };
  // horizontal rectangle (floor/ceiling)
  const flat = (mat, u0, u1, v0, v1, y) => { const me = new THREE.Mesh(new THREE.PlaneGeometry(u1 - u0, Math.abs(v1 - v0)), mat); me.rotation.x = -Math.PI / 2; me.position.set((u0 + u1) / 2, y, Z((v0 + v1) / 2)); me.material.side = THREE.DoubleSide; return add(me, false); };
  const facePlane = (mat, u, v0, v1, y0, y1, facing = -1) => { const me = new THREE.Mesh(new THREE.PlaneGeometry(Math.abs(v1 - v0), y1 - y0), mat); me.position.set(u, (y0 + y1) / 2, Z((v0 + v1) / 2)); me.rotation.y = facing < 0 ? -Math.PI / 2 : Math.PI / 2; return add(me, false); };
  const seaPlane = (mat, u0, u1, v, y0, y1) => { const me = new THREE.Mesh(new THREE.PlaneGeometry(u1 - u0, y1 - y0), mat); me.position.set((u0 + u1) / 2, (y0 + y1) / 2, Z(v)); if (zs > 0) me.rotation.y = Math.PI; return add(me, false); };

  const Lr = outer.map((p) => toL(...p)); // footprint in local (u,v)
  let gMin = Infinity; for (const [x, z] of outer) gMin = Math.min(gMin, ctx.ground(x, z));
  const hall = clipHalf(Lr, (p) => 9 - p[1]); // v >= 9: theatre block

  // ---------- exterior: theatre block walls (with the opening behind the entrance block) ----------
  const geo = { pos: [], uv: [] };
  const quad = (p0, p1, y0, y1) => { const a = W(...p0), c = W(...p1), L = Math.hypot(c[0] - a[0], c[1] - a[1]); geo.pos.push(a[0], y0, a[1], c[0], y0, c[1], c[0], y1, c[1], a[0], y0, a[1], c[0], y1, c[1], a[0], y1, a[1]); geo.uv.push(0, 0, L, 0, L, 1, 0, 0, L, 1, 0, 1); };
  for (let i = 0; i < hall.length; i++) {
    const p = hall[i], q = hall[(i + 1) % hall.length], L = Math.hypot(q[0] - p[0], q[1] - p[1]); const n = Math.max(1, Math.ceil(L));
    for (let k = 0; k < n; k++) {
      const a = [p[0] + (q[0] - p[0]) * k / n, p[1] + (q[1] - p[1]) * k / n], c = [p[0] + (q[0] - p[0]) * (k + 1) / n, p[1] + (q[1] - p[1]) * (k + 1) / n], mu = (a[0] + c[0]) / 2, mv = (a[1] + c[1]) / 2;
      if (mu < -4.5 && mv > 11.9 && mv < 21.1) quad(a, c, F + 3.2, E); else quad(a, c, gMin - 0.5, E);
    }
  }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(geo.pos, 3)); sg.setAttribute('uv', new THREE.Float32BufferAttribute(geo.uv, 2)); sg.computeVertexNormals();
  const shell = new THREE.Mesh(sg, m.render); shell.castShadow = shell.receiveShadow = true; group.add(shell);
  // hipped clay roof over the theatre block (stepped insets so irregular plans still close)
  const roofAcc = ctx.acc.get(cx, cz, 'roof:clay', true), rt = [0.85, 0.62, 0.55];
  let prev = ensureCCW(insetRing(ensureCCW(hall.map((p) => W(...p))), -0.5) || hall.map((p) => W(...p))), y = E;
  const tan = Math.tan(22 * Math.PI / 180);
  for (let s = 0; s < 8; s++) {
    const inn = insetRing(prev, 1.6); if (!inn || inn.length !== prev.length) break;
    for (let i = 0; i < prev.length; i++) { const a = prev[i], c = prev[(i + 1) % prev.length], ia = inn[i], ic = inn[(i + 1) % prev.length], ex = c[0] - a[0], ez = c[1] - a[1], el = Math.hypot(ex, ez) || 1; const uv = (pp) => [((pp[0] - a[0]) * ex + (pp[1] - a[1]) * ez) / el / 2, Math.abs((pp[0] - a[0]) * -ez + (pp[1] - a[1]) * ex) / el / 2]; roofAcc.quad([a[0], y, a[1]], [c[0], y, c[1]], [ic[0], y + 1.6 * tan, ic[1]], [ia[0], y + 1.6 * tan, ia[1]], uv(a), uv(c), uv(ic), uv(ia), rt); }
    prev = inn; y += 1.6 * tan;
  }
  { const { verts, tris } = triangulate(prev); for (const [i, j, k] of tris) roofAcc.triFlat([verts[i][0], y, verts[i][1]], [verts[k][0], y, verts[k][1]], [verts[j][0], y, verts[j][1]], [0, 0], [1, 0], [0, 1], rt); }
  // big lettering on the landward end of the theatre block
  facePlane(m.bigLetters, -6.75, 22.5, 31, E - 1.5, E - 0.45);

  // ---------- exterior: seaward lounge (1960) over a colonnade ----------
  box(m.render, 0, 36, Gp - 0.3, LF, 3, 9);                     // cafe block behind the colonnade
  box(m.render, -5.8, 0, Gp - 0.3, LF + 0.3, 6.0, 9.2);           // link between the lounge and the entrance
  seaPlane(m.cafe, 0.6, 35.4, 2.99, Gp + 0.2, LF - 0.5);
  box(m.white, -0.2, 36.2, LF - 0.4, LF + 0.25, -0.2, 9);        // lounge floor slab / colonnade ceiling
  for (let u = 0.3; u <= 35.8; u += 4.45) {                      // columns with flared heads
    box(m.white, u - 0.22, u + 0.22, Gp, LF - 0.6, 0.15, 0.6);
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.28, 0.5, 4), m.white); head.rotation.y = Math.PI / 4; head.position.set(u, LF - 0.65, Z(0.38)); add(head);
  }
  box(m.render, 0, 36, LF + 0.25, LT, 1.2, 9);                   // lounge body
  for (let k = 0; k < 8; k++) {                                  // angled glazed bays
    const u0 = 0.4 + k * 4.45, u1 = u0 + 4.0, inset = 0.6;
    seaPlane(m.lounge, u0 + inset, u1 - inset, -0.1, LF + 0.35, LT - 0.15);
    wall(m.lounge, u0, 1.2, u0 + inset, -0.1, LF + 0.35, LT - 0.15); wall(m.lounge, u1 - inset, -0.1, u1, 1.2, LF + 0.35, LT - 0.15);
    box(m.pale, u0, u1, LF + 0.25, LF + 0.4, -0.2, 1.2); box(m.pale, u0, u1, LT - 0.2, LT - 0.05, -0.2, 1.2);
    box(m.blue, u1 - 0.05, u1 + 0.5, LT - 1.0, LT + 0.5, 1.15, 1.3); // blue panels between the bays (were red)
  }
  box(m.blue, 0, 36, LT, LT + 0.5, 1.1, 1.3);
  box(m.white, -0.3, 36.3, LT + 0.5, LT + 0.7, -0.3, 9);          // flat roof edge
  facePlane(m.lounge, -0.05, 1.3, 8.8, LF + 0.35, LT - 0.1);       // SW end glazing
  box(m.blue, -0.15, 0.0, LT - 0.9, LT + 0.5, 1.3, 5.5);
  facePlane(m.restaurant, -0.25, 1.0, 5.5, LF - 0.38, LF + 0.2);
  for (let u = 3; u < 34; u += 3.2) box(m.blue, u, u + 2.6, Gp, Gp + 0.5, -3.4, -2.8); // planters along the promenade (were red)

  // ---------- exterior: entrance block, stair, terrace ----------
  const bu0 = -8.95, bu1 = -6.0, bv0 = 11.85, bv1 = 21.15, dv0 = 15.0, dv1 = 17.6;
  box(m.render, bu0, bu1, Gf - 0.3, F + 4.9, bv0 - 0.3, bv0);
  box(m.render, bu0, bu1, Gf - 0.3, F + 4.9, bv1, bv1 + 0.3);
  box(m.render, bu0 - 0.3, bu0, Gf - 0.3, F + 4.9, bv0 - 0.3, dv0);
  box(m.render, bu0 - 0.3, bu0, Gf - 0.3, F + 4.9, dv1, bv1 + 0.3);
  box(m.render, bu0 - 0.3, bu0, F + 2.4, F + 4.9, dv0, dv1);
  box(m.render, bu0, bu1, F + 4.7, F + 4.9, bv0, bv1);           // roof of the block
  box(m.brown, bu0 - 0.45, bu1, F + 3.4, F + 3.72, bv0 - 0.45, bv1 + 0.45);
  box(m.brown, bu0 - 0.45, bu1, F + 4.5, F + 4.95, bv0 - 0.45, bv1 + 0.45);
  facePlane(m.smallLetters, bu0 - 0.32, bv0 + 1.2, bv1 - 1.2, F + 3.8, F + 4.42);
  for (let k = 0; k < 3; k++) { const v0 = 13.0 + k * 2.4; facePlane(m.glass, bu0 - 0.31, v0, v0 + 2.1, F + 2.75, F + 3.3); }
  box(m.white, bu0 - 1.0, bu0, F + 2.45, F + 2.6, dv0 - 1.2, dv1 + 1.2);   // door canopy
  const leaf = (hv, sgn) => { const g = new THREE.BoxGeometry(0.06, 2.35, 1.28); g.translate(0, 0, Z(sgn * 0.64)); const me = new THREE.Mesh(g, m.door); me.position.set(bu0 - 0.15, F + 1.18, Z(hv)); me.rotation.y = sgn * zs * 1.3; return add(me); };
  leaf(dv0, 1); leaf(dv1, -1);
  // stair with yellow nosings, cheek walls with brown copings, handrails
  const sv0 = 12.75, sv1 = 19.85, land = -10.05, sBot = land - nSteps * 0.3;
  for (let k = 0; k < nSteps; k++) { const uTop = land - k * 0.3, yT = F - k * rise; box(m.steps, uTop - 0.3, uTop, Gf - 0.3, yT, sv0, sv1, false); box(m.nosing, uTop - 0.3, uTop - 0.22, yT, yT + 0.01, sv0, sv1, false); }
  box(m.steps, land, bu0 - 0.3, Gf - 0.3, F, sv0, sv1, false);
  const cheek = (v0, v1, mat, yb, yt, th) => { const sh = new THREE.Shape([new THREE.Vector2(sBot - 0.4, yb), new THREE.Vector2(land, yt), new THREE.Vector2(land, yt + th), new THREE.Vector2(sBot - 0.4, yb + th)]); const g = new THREE.ExtrudeGeometry(sh, { depth: v1 - v0, bevelEnabled: false }); g.translate(0, 0, Math.min(Z(v0), Z(v1))); return add(new THREE.Mesh(g, mat)); };
  for (const [v0, v1] of [[sv0 - 0.4, sv0], [sv1, sv1 + 0.4]]) { cheek(v0, v1, m.render, Gf - 0.3, F - 0.3, 1.3 + 0.3); cheek(v0 - 0.03, v1 + 0.03, m.brown, Gf + 1.0, F + 1.0, 0.12); }
  const rail = (v, yOff) => { const pts = [new THREE.Vector3(sBot, Gf + yOff, Z(v)), new THREE.Vector3(land, F + yOff, Z(v)), new THREE.Vector3(land + 0.6, F + yOff, Z(v))]; add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.05), 24, 0.03, 6), m.rail)); };
  rail(16.3, 0.95); rail(sv0 + 0.15, 1.85); rail(sv1 - 0.15, 1.85);
  for (let k = 0; k <= nSteps; k += 4) { const uu = land - k * 0.3, yy = F - k * rise; box(m.rail, uu - 0.03, uu + 0.03, yy, yy + 0.95, 16.27, 16.33); }
  // terrace in front of the theatre block with black railings and a dark undercroft
  box(m.render, -10.05, -6.6, Gf - 0.3, F, 21.2, 31, false); box(m.steps, -10.05, -6.6, F - 0.05, F + 0.02, 21.2, 31, false);
  facePlane(m.dark, -10.06, 22, 30, Gf + 0.2, F - 0.5);
  for (let v = 21.4; v <= 31; v += 0.25) box(m.black, -10.0, -9.96, F, F + 1.05, v - 0.015, v + 0.015, false);
  box(m.black, -10.03, -9.93, F + 1.0, F + 1.06, 21.3, 31);

  // ---------- interior ----------
  const IN = { e0: bu0, e1: -3.0, f1: 4.5, a1: 30.0, s1: 37.5, v0: 9.6, v1: 30.2 }; // kept inside the OSM footprint
  const rows = 26, rowPitch = 0.85, row0 = 6.4, frontFloor = F - 1.4;
  const floorAt = (u) => (u < row0 - 0.4 ? F : u > 29 ? frontFloor : F - 1.4 * (u - (row0 - 0.4)) / (29 - (row0 - 0.4)));
  // entrance room: posters
  flat(m.carpet, IN.e0, IN.e1, bv0, bv1, F + 0.01); flat(m.ceiling, IN.e0, IN.e1, bv0, bv1, F + 3.2);
  wall(m.wallCream, IN.e0 + 0.02, bv0 + 0.02, IN.e1, bv0 + 0.02, F, F + 3.2); wall(m.wallCream, IN.e0 + 0.02, bv1 - 0.02, IN.e1, bv1 - 0.02, F, F + 3.2);
  wall(m.dadoBlue, IN.e0 + 0.03, bv0 + 0.03, IN.e1, bv0 + 0.03, F, F + 1.0); wall(m.dadoBlue, IN.e0 + 0.03, bv1 - 0.03, IN.e1, bv1 - 0.03, F, F + 1.0);
  wall(m.wallCream, IN.e0 + 0.02, bv0, IN.e0 + 0.02, dv0, F, F + 3.2); wall(m.wallCream, IN.e0 + 0.02, dv1, IN.e0 + 0.02, bv1, F, F + 3.2); wall(m.wallCream, IN.e0 + 0.02, dv0, IN.e0 + 0.02, dv1, F + 2.4, F + 3.2);
  for (let k = 0; k < 3; k++) { const u = IN.e0 + 1.0 + k * 1.9; wall(m.posters[k], u, bv0 + 0.05, u + 1.0, bv0 + 0.05, F + 1.2, F + 2.6, [u, 16]); wall(m.posters[k + 3], u, bv1 - 0.05, u + 1.0, bv1 - 0.05, F + 1.2, F + 2.6, [u, 16]); }
  // partition entrance room / foyer, with a wide opening
  for (const [a, c] of [[IN.v0, 14], [19, IN.v1]]) { wall(m.wallCream, IN.e1, a, IN.e1, c, F, F + 3.6); wall(m.dadoBlue, IN.e1 + 0.02, a, IN.e1 + 0.02, c, F, F + 1.1); }
  wall(m.wallCream, IN.e1, 14, IN.e1, 19, F + 2.8, F + 3.6);
  // foyer: blue dado, cream walls, gold rail, blue cornice, lightwell, pendants, blue pillars
  flat(m.carpet, IN.e1, IN.f1, IN.v0, IN.v1, F + 0.01); flat(m.wood, IN.f1 - 1.6, IN.f1, IN.v1 - 3, IN.v1, F + 0.015); flat(m.wood, IN.f1 - 1.6, IN.f1, IN.v0, IN.v0 + 3, F + 0.015);
  const fy = F + 3.6, lw = { u0: -1.2, u1: 2.6, v0: 16.5, v1: 24.5 };
  flat(m.ceiling, IN.e1, lw.u0, IN.v0, IN.v1, fy); flat(m.ceiling, lw.u1, IN.f1, IN.v0, IN.v1, fy); flat(m.ceiling, lw.u0, lw.u1, IN.v0, lw.v0, fy); flat(m.ceiling, lw.u0, lw.u1, lw.v1, IN.v1, fy);
  for (const [a, b2, c, d] of [[lw.u0, lw.v0, lw.u1, lw.v0], [lw.u0, lw.v1, lw.u1, lw.v1], [lw.u0, lw.v0, lw.u0, lw.v1], [lw.u1, lw.v0, lw.u1, lw.v1]]) wall(m.dadoBlue, a, b2, c, d, fy, fy + 1.8);
  flat(m.skylight, lw.u0, lw.u1, lw.v0, lw.v1, fy + 1.8);
  for (const [a, b2, c, d] of [[IN.e1, IN.v0 + 0.02, IN.f1, IN.v0 + 0.02], [IN.e1, IN.v1 - 0.02, IN.f1, IN.v1 - 0.02]]) { wall(m.wallCream, a, b2, c, d, F, fy); wall(m.dadoBlue, a, b2 + (b2 < 20 ? 0.01 : -0.01), c, d + (d < 20 ? 0.01 : -0.01), F, F + 1.1); }
  box(m.gold, IN.e1, IN.f1, F + 2.55, F + 2.62, IN.v0, IN.v0 + 0.05); box(m.gold, IN.e1, IN.f1, F + 2.55, F + 2.62, IN.v1 - 0.05, IN.v1);
  box(m.dadoBlue, IN.e1, IN.f1, fy - 0.3, fy, IN.v0, IN.v0 + 0.25); box(m.dadoBlue, IN.e1, IN.f1, fy - 0.3, fy, IN.v1 - 0.25, IN.v1);
  box(m.dadoBlue, lw.u0 - 0.3, lw.u1 + 0.3, fy - 0.35, fy, IN.v0, IN.v1);   // beams round the lightwell
  for (const v of [13, 20.1, 27.2]) box(m.dadoBlue, IN.f1 - 0.6, IN.f1, F, fy, v - 0.3, v + 0.3);  // pillars
  for (const [u, v] of [[0, 14], [0.4, 14.6], [-0.4, 14.4], [1.6, 26], [2.0, 26.5], [1.2, 26.4]]) { const len = 0.9 + ((u * 7 + v) % 1) * 0.8; box(m.black, u - 0.005, u + 0.005, fy - len, fy, v - 0.005, v + 0.005, false); const c = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.45, 10), m.pendant); c.position.set(u, fy - len - 0.22, Z(v)); add(c, false); }
  // raised curved platform with red poster boards, high table and chairs
  const plat = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.15, 24, 1, false, 0, Math.PI), m.carpet); plat.position.set(IN.f1 - 0.7, F + 0.075, Z(23.5)); plat.rotation.y = Math.PI / 2; add(plat, false);
  for (let k = 0; k < 4; k++) { const th = (k / 3) * Math.PI * 0.8 + Math.PI * 0.1; box(m.redBoard, IN.f1 - 0.7 - Math.sin(th) * 1.5 - 0.35, IN.f1 - 0.7 - Math.sin(th) * 1.5 + 0.35, F + 0.15, F + 1.35, 23.5 - Math.cos(th) * 1.5 - 0.03, 23.5 - Math.cos(th) * 1.5 + 0.03); }
  box(m.pale, IN.f1 - 1.2, IN.f1 - 1.1, F + 0.15, F + 1.1, 23.4, 23.5); box(m.pale, IN.f1 - 1.45, IN.f1 - 0.85, F + 1.1, F + 1.14, 23.15, 23.75);
  for (const v of [22.6, 24.4]) { box(m.chair, IN.f1 - 0.9, IN.f1 - 0.4, F + 0.15, F + 0.6, v - 0.25, v + 0.25); box(m.chair, IN.f1 - 0.45, IN.f1 - 0.35, F + 0.6, F + 1.25, v - 0.25, v + 0.25); }
  // foyer / auditorium wall with the two seat doors
  const doorsAt = [[10.0, 11.8, m.sign2], [28.3, 30.1, m.sign1]];
  const segs = [[IN.v0, 10.0], [11.8, 28.3], [30.1, IN.v1]];
  for (const [a, c] of segs) { wall(m.wallCream, IN.f1, a, IN.f1, c, F, fy); wall(m.dadoBlue, IN.f1 - 0.02, a, IN.f1 - 0.02, c, F, F + 1.1); }
  for (const [a, c, sign] of doorsAt) {
    wall(m.wallCream, IN.f1, a, IN.f1, c, F + 2.5, fy); box(m.black, IN.f1 - 0.1, IN.f1, F + 2.2, F + 2.5, a - 0.1, c + 0.1);
    facePlane(sign, IN.f1 - 0.11, a + 0.1, c - 0.1, F + 2.24, F + 2.46);
    const half = (c - a) / 2; const lf = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.15, half), m.doorGrey); lf.geometry.translate(0, 0, Z(half / 2)); lf.position.set(IN.f1, F + 1.08, Z(a)); lf.rotation.y = zs * -1.2; add(lf, false);
    const rf = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.15, half), m.doorGrey); rf.position.set(IN.f1 - 0.02, F + 1.08, Z(c - half / 2)); add(rf, false);
  }
  // auditorium: raked floor, walls, vaulted ceiling with blue ribs, spots, seats, stage
  const rake = new THREE.BufferGeometry(); { const p = [[IN.f1, F, IN.v0], [row0 - 0.4, F, IN.v0], [29, frontFloor, IN.v0], [IN.a1, frontFloor, IN.v0]]; const pos = []; for (let i = 0; i < 3; i++) { const a = p[i], c = p[i + 1]; pos.push(a[0], a[1], Z(IN.v0), c[0], c[1], Z(IN.v0), c[0], c[1], Z(IN.v1), a[0], a[1], Z(IN.v0), c[0], c[1], Z(IN.v1), a[0], a[1], Z(IN.v1)); } rake.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); rake.computeVertexNormals(); }
  add(new THREE.Mesh(rake, m.carpet), false);
  const springY = F + 4.6, crownY = F + 5.6;
  for (const v of [IN.v0 + 0.02, IN.v1 - 0.02]) { wall(m.audWall, IN.f1, v, IN.a1, v, frontFloor, springY); wall(m.audDado, IN.f1, v + (v < 20 ? 0.01 : -0.01), IN.a1, v + (v < 20 ? 0.01 : -0.01), frontFloor, F + 0.4); }
  for (const [a, c] of segs) wall(m.audWall, IN.f1 + 0.03, a, IN.f1 + 0.03, c, F, springY);
  for (const [a, c] of doorsAt) wall(m.audWall, IN.f1 + 0.03, a, IN.f1 + 0.03, c, F + 2.5, springY);
  const vaultW = IN.v1 - IN.v0, vc = (IN.v0 + IN.v1) / 2, R = (vaultW * vaultW / 4 + (crownY - springY) ** 2) / (2 * (crownY - springY));
  const arcY = (v) => springY - (R - (crownY - springY)) + Math.sqrt(Math.max(0, R * R - (v - vc) ** 2));
  { const pos = []; const N = 16; for (let i = 0; i < N; i++) { const va = IN.v0 + vaultW * i / N, vb = IN.v0 + vaultW * (i + 1) / N; const ya = arcY(va), yb = arcY(vb); pos.push(IN.f1, ya, Z(va), IN.a1, ya, Z(va), IN.a1, yb, Z(vb), IN.f1, ya, Z(va), IN.a1, yb, Z(vb), IN.f1, yb, Z(vb)); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); add(new THREE.Mesh(g, m.ceiling), false); }
  for (let u = IN.f1 + 1.5; u < IN.a1; u += 3.2) { const pts = []; for (let i = 0; i <= 20; i++) { const v = IN.v0 + vaultW * i / 20; pts.push(new THREE.Vector3(u, arcY(v) - 0.12, Z(v))); } add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.16, 6), m.rib), false); }
  { const sp = new THREE.CylinderGeometry(0.11, 0.11, 0.04, 10); const spots = []; for (let u = IN.f1 + 3; u < IN.a1; u += 3.2) for (const v of [14.5, 20.5, 26.5]) spots.push([u, arcY(v) - 0.05, v]); const im = new THREE.InstancedMesh(sp, m.spot, spots.length); const mt = new THREE.Matrix4(); spots.forEach(([u, yy, v], i) => { mt.makeTranslation(u, yy, Z(v)); im.setMatrixAt(i, mt); }); add(im, false); }
  // seats: 26 rows x 33 = 858 (the real hall has 919; seats 17-33 seaward of the centre aisle, 1-16 on the cliff side)
  const seatG = (() => { const parts = [new THREE.BoxGeometry(0.42, 0.1, 0.44).translate(0.02, 0.42, 0), new THREE.BoxGeometry(0.08, 0.55, 0.46).translate(-0.24, 0.7, 0), new THREE.BoxGeometry(0.4, 0.04, 0.05).translate(0, 0.62, 0.24)]; const pos = [], nor = [], idx = []; let off = 0; for (const p of parts) { const q = p.toNonIndexed(); pos.push(...q.attributes.position.array); nor.push(...q.attributes.normal.array); off += q.attributes.position.count; } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); return g; })();
  const blocks = [[10.7, 17], [20.6, 16]]; const seatPos = [];
  for (let r = 0; r < rows; r++) { const u = row0 + r * rowPitch; for (const [v0, n] of blocks) for (let k = 0; k < n; k++) seatPos.push([u, floorAt(u), v0 + 0.26 + k * 0.52]); }
  { const im = new THREE.InstancedMesh(seatG, m.seat, seatPos.length); const mt = new THREE.Matrix4(); seatPos.forEach(([u, yy, v], i) => { mt.makeTranslation(u, yy, Z(v)); im.setMatrixAt(i, mt); }); im.receiveShadow = true; add(im, false); }
  // proscenium wall and stage
  const stY = frontFloor + 1.1, pv0 = 12.5, pv1 = 28.5, pTop = F + 4.2;
  wall(m.pros, IN.a1, IN.v0, IN.a1, pv0, frontFloor, springY + 0.6); wall(m.pros, IN.a1, pv1, IN.a1, IN.v1, frontFloor, springY + 0.6); wall(m.pros, IN.a1, pv0, IN.a1, pv1, pTop, crownY + 0.2);
  box(m.pros, IN.a1 - 0.3, IN.a1, stY, pTop + 0.35, pv0 - 0.35, pv0); box(m.pros, IN.a1 - 0.3, IN.a1, stY, pTop + 0.35, pv1, pv1 + 0.35); box(m.pros, IN.a1 - 0.3, IN.a1, pTop, pTop + 0.35, pv0, pv1);
  box(m.stageBlack, IN.a1 - 0.2, IN.s1, frontFloor - 0.2, stY, 10.0, IN.v1, false);
  flat(m.stageBlack, IN.a1, IN.s1, IN.v0, IN.v1, stY + 0.005); flat(m.stageBlack, IN.a1, IN.s1, IN.v0, IN.v1, F + 5.8);
  wall(m.backdrop, IN.s1 - 0.05, pv0 - 1, IN.s1 - 0.05, pv1 + 1, stY, F + 5.8);
  for (const v of [IN.v0 + 0.02, IN.v1 - 0.02]) wall(m.stageBlack, IN.a1, v, IN.s1, v, stY, F + 5.8);
  for (const v of [pv0 + 0.6, pv1 - 0.6]) for (const du of [1.5, 3.5, 5.5]) box(m.drape, IN.a1 + du, IN.a1 + du + 0.15, stY, F + 5.6, v - 0.9, v + 0.9, false);
  box(m.drape, IN.a1 + 0.3, IN.a1 + 0.45, pTop - 0.9, pTop, pv0, pv1, false); // house border
  for (const v of [16, 20.1, 25]) { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 12), m.spot); s.position.set(IN.a1 + 2.5, F + 5.75, Z(v)); add(s, false); }
  for (const v of [IN.v0 + 0.03, IN.v1 - 0.03]) { wall(m.exit, 27.5, v, 28.3, v, F - 1.4 + 2.35, F - 1.4 + 2.65, [27.9, 20]); wall(m.doorGrey, 27.2, v + (v < 20 ? 0.01 : -0.01), 28.6, v + (v < 20 ? 0.01 : -0.01), frontFloor, frontFloor + 2.2); }
  // stage steps (visual)
  for (const [v0, v1] of [[12.4, 14.2], [26.8, 28.6]]) for (let k = 1; k <= 3; k++) box(m.stageBlack, IN.a1 - 1.4 + (k - 1) * 0.45, IN.a1, frontFloor, frontFloor + k * (1.1 / 3), v0, v1, false);

  // ---------- walking surfaces ----------
  const ringW = (pts) => pts.map(([u, v]) => W(u, v));
  const lu = (x, z) => toL(x, z)[0];
  const surfaces = [];
  for (const [v0, v1] of [[12.4, 14.2], [26.8, 28.6]]) surfaces.push({ id: 'spa-stage-steps', kind: 'terrace', ring: ringW([[IN.a1 - 1.4, v0], [IN.a1, v0], [IN.a1, v1], [IN.a1 - 1.4, v1]]), heightAt: (x, z) => { const u = lu(x, z); const k = Math.min(3, Math.max(0, Math.ceil((u - (IN.a1 - 1.4)) / 0.45))); return frontFloor + k * (1.1 / 3); } });
  surfaces.push({ id: 'spa-stage', kind: 'terrace', ring: ringW([[IN.a1, 10.0], [IN.s1, 10.0], [IN.s1, IN.v1], [IN.a1, IN.v1]]), heightAt: () => stY });
  surfaces.push({ id: 'spa-interior', kind: 'terrace', ring: ringW([[bu0, bv0], [IN.e1, bv0], [IN.e1, IN.v0], [IN.a1, IN.v0], [IN.a1, IN.v1], [IN.e1, IN.v1], [IN.e1, bv1], [bu0, bv1]]), heightAt: (x, z) => floorAt(lu(x, z)) });
  surfaces.push({ id: 'spa-landing', kind: 'terrace', ring: ringW([[land, sv0], [bu0 - 0.3, sv0], [bu0 - 0.3, 21.2], [-6.6, 21.2], [-6.6, 31], [land, 31]]), heightAt: () => F });
  surfaces.push({ id: 'spa-stair', kind: 'terrace', ring: ringW([[sBot, sv0], [land, sv0], [land, sv1], [sBot, sv1]]), heightAt: (x, z) => { const u = lu(x, z); const k = Math.max(0, Math.ceil((land - u) / 0.3)); return Math.max(ctx.ground(x, z), F - k * rise); } });
  for (const s of surfaces) s.meshes = [];

  // ---------- colliders ----------
  const colliders = []; const seg = (a, c, r = 0.05, y0 = Gf - 1, top = E + 3, kind = 'building') => colliders.push({ type: 'segment', a: W(...a), b: W(...c), r, y0, top, kind });
  for (let i = 0; i < Lr.length; i++) { // footprint, except the colonnade face and the entrance opening
    const p = Lr[i], q = Lr[(i + 1) % Lr.length], L = Math.hypot(q[0] - p[0], q[1] - p[1]), n = Math.max(1, Math.ceil(L));
    for (let k = 0; k < n; k++) { const a = [p[0] + (q[0] - p[0]) * k / n, p[1] + (q[1] - p[1]) * k / n], c = [p[0] + (q[0] - p[0]) * (k + 1) / n, p[1] + (q[1] - p[1]) * (k + 1) / n], mu = (a[0] + c[0]) / 2, mv = (a[1] + c[1]) / 2;
      if (mv < 2.5 && mu > -1 && mu < 37) continue; if (mu < -4.5 && mv > bv0 - 0.1 && mv < bv1 + 0.1) continue; seg(a, c); }
  }
  seg([0, 3], [36, 3]); for (let u = 0.3; u <= 35.8; u += 4.45) colliders.push({ type: 'circle', ...(() => { const w = W(u, 0.38); return { x: w[0], z: w[1] }; })(), r: 0.32, y0: Gp - 1, top: LF, kind: 'column' });
  seg([bu0 - 0.15, bv0 - 0.15], [-4.5, bv0 - 0.15]); seg([bu0 - 0.15, bv1 + 0.15], [-4.5, bv1 + 0.15]);
  seg([bu0 - 0.15, bv0 - 0.15], [bu0 - 0.15, dv0]); seg([bu0 - 0.15, dv1], [bu0 - 0.15, bv1 + 0.15]);
  seg([sBot - 0.5, sv0 - 0.15], [land, sv0 - 0.15], 0.15); seg([sBot - 0.5, sv1 + 0.15], [land, sv1 + 0.15], 0.15);
  seg([land, sv1 + 0.15], [land, 31], 0.08, F - 1, F + 1.1, 'railing'); seg([land, 31], [-6.6, 31], 0.08, F - 1, F + 1.1, 'railing');
  seg([IN.e1, bv0], [-4.5, bv0]); seg([IN.e1, bv1], [-4.5, bv1]); // entrance room side walls inside the block
  seg([IN.e1, IN.v0], [IN.e1, 14]); seg([IN.e1, 19], [IN.e1, IN.v1]);
  seg([IN.e1, IN.v0], [IN.s1, IN.v0]); seg([IN.e1, IN.v1], [IN.s1, IN.v1]); seg([IN.s1, IN.v0], [IN.s1, IN.v1]);
  for (const [a, c] of segs) seg([IN.f1, a], [IN.f1, c]);
  seg([IN.a1, IN.v0], [IN.a1, 10.0]);
  { const w = W(IN.f1 - 0.7, 23.5); colliders.push({ type: 'circle', x: w[0], z: w[1], r: 1.5, y0: F - 1, top: F + 1.4, kind: 'furniture' }); }
  for (const v of [13, 20.1, 27.2]) { const w = W(IN.f1 - 0.3, v); colliders.push({ type: 'circle', x: w[0], z: w[1], r: 0.4, y0: F - 1, top: fy, kind: 'pillar' }); }
  for (let r = 0; r < rows; r++) { const u = row0 + r * rowPitch - 0.25, yy = floorAt(u); for (const [v0, n] of blocks) seg([u, v0], [u, v0 + n * 0.52], 0.05, yy - 0.5, yy + 1.0, 'seats'); }

  // interior volume for the camera
  const interiorRing = ringW([[bu0, bv0], [IN.e1, bv0], [IN.e1, IN.v0], [IN.s1, IN.v0], [IN.s1, IN.v1], [IN.e1, IN.v1], [IN.e1, bv1], [bu0, bv1]]);
  const interior = { id: 'spa-pavilion', name: 'Spa Pavilion Theatre', ring: interiorRing, top: E, ceilingAt: (x, z) => { const [u, v] = toL(x, z); if (u < IN.e1) return F + 3.2; if (u < IN.f1) return fy; if (u < IN.a1) return arcY(v); return F + 5.8; } };
  return { group, colliders, surfaces, interior, floorY: F, info: { F, nSteps, seats: seatPos.length } };
}

function clipHalf(ring, f) {
  const out = [];
  for (let i = 0; i < ring.length; i++) { const p = ring[i], q = ring[(i + 1) % ring.length], fp = f(p), fq = f(q); if (fp <= 0) out.push(p); if ((fp <= 0) !== (fq <= 0)) { const t = fp / (fp - fq); out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); } }
  return out;
}
export const _pointInRing = pointInRing;
