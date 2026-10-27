// Spa Pavilion Theatre, Undercliff Road West (OSM way 240664453) – exterior and an enterable interior.
// Sources: OSM footprint; EA LiDAR heights (median 7.0 m, 90th percentile 10.8 m above ground); Theatres
// Trust database (raked auditorium with proscenium stage, 919 seats; rebuilt 1950; sea-view lounge 1960);
// photographs supplied by the user (Oct 2026): the landward entrance with its stair, the seaward glazed
// lounge over a colonnade, the auditorium and the foyer; and (12 Oct 2026) two street views of the
// landward end from Undercliff Road West (docs/research/undercliff-road-west). The user reports that
// the red trim in those photos (bands, copings, frames) is now painted blue. The landward end follows
// them: a two-storey range with a balcony, banners and an undercroft, a raised centre block with the
// big lettering and hipped pantile roofs, the entrance porch, landing and stair facing the sea at a slight angle (per the user), and the glazed LOUNGE. Layout (entrance room -> foyer -> auditorium, doors "SEATS 1 TO 16" / "SEATS 17 TO 33") follows the
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
    render: std({ color: 0xf5f2e8, roughness: 0.85, side: THREE.DoubleSide }),
    brown: std({ color: 0x5a3e2e, roughness: 0.7 }),
    steps: std({ color: 0xcdcac2, roughness: 0.9 }),
    nosing: std({ color: 0xe8c22a, roughness: 0.6 }),
    rail: std({ color: 0xc9a84a, roughness: 0.35, metalness: 0.75 }),   // brass handrails (photo)
    black: std({ color: 0x1b1d20, roughness: 0.5, metalness: 0.4 }),
    door: std({ color: 0x4a2a1f, roughness: 0.6 }),
    glass: std({ color: 0x2a3540, roughness: 0.08, metalness: 0.6, side: THREE.DoubleSide }),
    silver: std({ color: 0xc3c8cc, roughness: 0.35, metalness: 0.7 }),
    blue: std({ color: 0x2c5da8, roughness: 0.5 }),          // exterior panels, frames, planters (were red)
    white: std({ color: 0xf6f6f2, roughness: 0.6 }),
    dark: std({ color: 0x23272c, roughness: 0.9 }),
    bigLetters: letters('SPA PAVILION', '#b98f45', 1536, 192, `700 150px ${SANS}`),   // gilt lettering on the cream gable (photo)
    smallSign: std({ map: cnv(1024, 128, (g, w, h) => { g.fillStyle = '#1f4f9c'; g.fillRect(0, 0, w, h); g.fillStyle = '#f4efe0'; g.font = `700 88px ${SANS}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('SPA PAVILION', w / 2, h / 2 + 4); }), roughness: 0.5 }),
    loungeSign: std({ map: cnv(1024, 128, (g, w, h) => { g.fillStyle = '#9b5530'; g.fillRect(0, 0, w, h); g.strokeStyle = '#efe3c8'; g.lineWidth = 6; g.strokeRect(5, 5, w - 10, h - 10); g.fillStyle = '#f4ead2'; g.font = `700 92px ${SANS}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('LOUNGE', w / 2, h / 2 + 5); }), roughness: 0.5 }),   // copper-brown fascia, cream letters (photo)
    stripes: std({ map: cnv(256, 32, (g, w, h) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#f4f4f0' : '#cf2a22'; g.fillRect(i * w / 8, 0, w / 8, h); } }), roughness: 0.6 }),
    stopSign: std({ map: cnv(128, 128, (g, w, h) => { g.fillStyle = '#d0201c'; g.fillRect(0, 0, w, h); g.strokeStyle = '#fff'; g.lineWidth = 7; g.beginPath(); g.arc(w / 2, h / 2, w * 0.45, 0, 7); g.stroke(); g.fillStyle = '#fff'; g.font = `700 34px ${SANS}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('STOP', w / 2, h / 2 + 2); }), roughness: 0.5, side: THREE.DoubleSide }),
    orange: std({ color: 0xe8741c, roughness: 0.5 }),
    leaf: std({ color: 0x55803a, roughness: 0.8, side: THREE.DoubleSide }),
    trunk: std({ color: 0x6b5a45, roughness: 0.9 }),
    soil: std({ color: 0x4a3a2a, roughness: 1 }),
    reed: std({ color: 0xc9b27a, roughness: 0.9 }),
    bench: std({ color: 0x6a4a2c, roughness: 0.8 }),
    stone: std({ color: 0xb9b5a8, roughness: 0.95 }),
    terraceSign: std({ map: cnv(512, 96, (g, w, h) => { g.fillStyle = '#d9dcdf'; g.fillRect(0, 0, w, h); g.fillStyle = '#2f3338'; g.font = `600 60px ${SANS}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('TERRACE', w / 2, h / 2 + 3); }), roughness: 0.6 }),
    pantile: std({ color: 0xc4532e, roughness: 0.85, side: THREE.DoubleSide }),
    window: std({ color: 0x2f3c48, roughness: 0.1, metalness: 0.5 }),
    banners: posterColours.slice(0, 3).map(([bg, fg], i) => std({ map: cnv(512, 160, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, bg); gr.addColorStop(1, '#111'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = fg; g.font = `700 54px ${SANS}`; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(posterWords[i], 24, h * 0.42); g.fillStyle = '#fff'; g.font = `500 28px ${SANS}`; g.fillText('SPA PAVILION · BOOK NOW', 26, h * 0.78); }), roughness: 0.7, side: THREE.DoubleSide })),
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

  // ---------- exterior: seaward lounge (1960) over a colonnade ----------
  box(m.render, 0, 36, Gp - 0.3, LF, 3, 9);                     // cafe block behind the colonnade
  box(m.render, -5.8, 0, Gp - 0.3, LF + 0.3, 6.0, 9.2);           // link between the lounge and the entrance
  seaPlane(m.cafe, 0.6, 35.4, 2.99, Gp + 0.2, LF - 0.5);
  box(m.white, -0.2, 36.2, LF - 0.4, LF + 0.25, -0.2, 9);        // lounge floor slab / colonnade ceiling
  for (let u = 0.3; u <= 35.8; u += 4.45) {                      // columns with flared heads
    box(m.white, u - 0.22, u + 0.22, Gp, LF - 0.6, 0.15, 0.6);
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.28, 0.5, 4), m.white); head.rotation.y = Math.PI / 4; head.position.set(u, LF - 0.65, Z(0.38)); add(head);
  }
  // lounge body: hollow, so you can walk in from the entrance balcony (user, 12 Oct 2026)
  box(m.render, 0, 36, LF + 0.25, LT, 8.7, 9.0);                 // back wall
  box(m.render, 35.7, 36, LF + 0.25, LT, -0.1, 9.0);             // north-east end
  box(m.render, 0, 36, LT, LT + 0.5, -0.2, 9.0);                 // roof over the lounge
  for (let k = 0; k < 7; k++) { const u1 = 0.4 + k * 4.45 + 4.0; box(m.render, u1, u1 + 0.45, LF + 0.25, LT, -0.1, 1.2); } // piers between the bays
  for (const u of [0.4, 35.8]) box(m.render, u === 0.4 ? 0 : 35.7, u === 0.4 ? 0.4 : 36, LF + 0.25, LT, -0.1, 1.2);
  for (let k = 0; k < 8; k++) {                                  // angled glazed bays
    const u0 = 0.4 + k * 4.45, u1 = u0 + 4.0, inset = 0.6;
    seaPlane(m.lounge, u0 + inset, u1 - inset, -0.1, LF + 0.35, LT - 0.15);
    wall(m.lounge, u0, 1.2, u0 + inset, -0.1, LF + 0.35, LT - 0.15); wall(m.lounge, u1 - inset, -0.1, u1, 1.2, LF + 0.35, LT - 0.15);
    box(m.pale, u0, u1, LF + 0.25, LF + 0.4, -0.2, 1.2); box(m.pale, u0, u1, LT - 0.2, LT - 0.05, -0.2, 1.2);
    box(m.blue, u1 - 0.05, u1 + 0.5, LT - 1.0, LT + 0.5, 1.15, 1.3); // blue panels between the bays (were red)
  }
  box(m.blue, 0, 36, LT, LT + 0.5, 1.1, 1.3);
  box(m.white, -0.3, 36.3, LT + 0.5, LT + 0.7, -0.3, 9);          // flat roof edge
  // SW end glazing with a pair of glazed doors (open) onto the entrance balcony
  const ld0 = 3.25, ld1 = 5.05, LD = LF + 0.25;
  facePlane(m.lounge, -0.05, 1.3, ld0, LF + 0.35, LT - 0.1); facePlane(m.lounge, -0.05, ld1, 8.8, LF + 0.35, LT - 0.1); facePlane(m.lounge, -0.05, ld0, ld1, LD + 2.4, LT - 0.1);
  for (const [v, sg] of [[ld0, 1], [ld1, -1]]) { const g = new THREE.BoxGeometry(0.05, 2.3, (ld1 - ld0) / 2); g.translate(0, 0, Z(sg * (ld1 - ld0) / 4)); const me = new THREE.Mesh(g, m.lounge); me.position.set(-0.02, LD + 1.15, Z(v)); me.rotation.y = sg * zs * 1.25; add(me, false); }
  // lounge interior: carpet, tables and chairs by the windows, a bar along the back wall, pendant lights
  flat(m.carpet, 0.05, 35.65, -0.05, 8.65, LD + 0.01); flat(m.ceiling, 0.05, 35.65, -0.05, 8.65, LT - 0.02);
  wall(m.wallCream, 0.05, 8.68, 35.65, 8.68, LD, LT, [10, 4]);
  for (let u = 2.4; u < 34; u += 3.1) for (const v of [2.4, 5.2]) {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.04, 16), m.wood); t.position.set(u, LD + 0.74, Z(v)); add(t, false);
    box(m.black, u - 0.03, u + 0.03, LD, LD + 0.72, v - 0.03, v + 0.03, false);
    for (const du of [-0.7, 0.7]) { box(m.chair, u + du - 0.2, u + du + 0.2, LD + 0.42, LD + 0.47, v - 0.2, v + 0.2, false); box(m.chair, u + du + (du > 0 ? 0.17 : -0.22), u + du + (du > 0 ? 0.22 : -0.17), LD + 0.45, LD + 0.95, v - 0.2, v + 0.2, false); }
  }
  box(m.wood, 8, 26, LD, LD + 1.05, 7.2, 7.8, false); box(m.pale, 7.9, 26.1, LD + 1.05, LD + 1.1, 7.1, 7.9, false); // bar
  for (let u = 3; u < 34; u += 4.5) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.12, 0.25, 12), m.pendant); c.position.set(u, LT - 0.6, Z(4)); add(c, false); box(m.black, u - 0.005, u + 0.005, LT - 0.48, LT, 3.995, 4.005, false); }
  box(m.blue, -0.15, 0.0, LT - 0.9, LT + 0.5, 1.3, 5.5);
  facePlane(m.terraceSign, -0.25, 1.6, 5.0, LF - 0.42, LF + 0.16);
  for (let u = 3; u < 34; u += 3.2) box(m.blue, u, u + 2.6, Gp, Gp + 0.5, -3.4, -2.8); // planters along the promenade (were red)

  // ---------- exterior: entrance block, stair, terrace ----------
  const bu0 = -8.95, bu1 = -6.0, bv0 = 11.85, bv1 = 21.15, dv0 = 15.0, dv1 = 17.6;
  // entrance block: plain landward face with three windows; it opens on its seaward side into the porch
  box(m.render, bu0, bu1, Gf - 0.3, F, bv0 - 0.3, bv0); box(m.render, bu0, bu1, F + 3.2, F + 4.9, bv0 - 0.3, bv0);
  box(m.render, bu0, bu1, Gf - 0.3, F + 4.9, bv1, bv1 + 0.3);
  box(m.render, bu0 - 0.3, bu0, Gf - 0.3, F + 4.9, bv0 - 0.3, bv1 + 0.3);
  box(m.render, bu0, bu1, F + 4.7, F + 4.9, bv0, bv1);           // roof of the block
  box(m.blue, bu0 - 0.45, bu1, F + 3.4, F + 3.72, bv0 - 0.45, bv1 + 0.45);
  box(m.blue, bu0 - 0.45, bu1, F + 4.5, F + 4.95, bv0 - 0.45, bv1 + 0.45);
  for (let k = 0; k < 3; k++) { const v0 = 13.0 + k * 2.4; facePlane(m.glass, bu0 - 0.31, v0, v0 + 2.1, F + 2.75, F + 3.3); }
  m.blue.side = THREE.DoubleSide;
  // ---- entrance porch, landing and stair: facing the sea at a slight angle (user, 12 Oct 2026) ----
  // Porch frame: p along the porch front, q outwards. The outward direction is the seaward normal (-v)
  // turned 18 degrees towards the south-west (towards Undercliff Road); the angle is an estimate.
  const PH = 18 * Math.PI / 180, aU = Math.cos(PH), aV = -Math.sin(PH), dU = -Math.sin(PH), dV = -Math.cos(PH);
  const Ou = (bu0 + bu1) / 2, Ov = bv0;
  const pq = (p, q) => [Ou + aU * p + dU * q, Ov + aV * p + dV * q];
  const porch = new THREE.Group(); porch.position.set(Ou, 0, Z(Ov)); porch.rotation.y = Math.atan2(-Z(aV), aU); local.add(porch);
  const qz = Math.sign(Math.sin(porch.rotation.y) * dU + Math.cos(porch.rotation.y) * Z(dV)) || 1;
  const padd = (me) => { me.castShadow = true; me.receiveShadow = true; porch.add(me); return me; };
  const pbox = (mat, p0, p1, y0, y1, q0, q1) => { const me = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(p1 - p0), Math.abs(y1 - y0), Math.abs(q1 - q0)), mat); me.position.set((p0 + p1) / 2, (y0 + y1) / 2, qz * (q0 + q1) / 2); return padd(me); };
  const qLand = 4.6, sw = 1.6;
  let ns = 12; for (let it = 0; it < 3; it++) ns = Math.max(6, Math.round((F - gw(...pq(0, qLand + ns * 0.3))) / rise));
  const qBot = qLand + ns * 0.3, Gb = Math.min(gw(...pq(0, qBot)), gw(...pq(0, 0)), gw(...pq(-2, 3)), gw(...pq(2, 3))) - 0.3, yb0 = F - ns * rise;
  // porch: side walls, front wall with double doors, blue bands, sign, canopy
  pbox(m.render, -1.5, -1.3, Gb, F + 4.2, -0.5, 3.0); pbox(m.render, 1.3, 1.5, Gb, F + 4.2, -0.5, 3.0);
  pbox(m.render, -1.5, -0.8, Gb, F + 4.2, 2.8, 3.0); pbox(m.render, 0.8, 1.5, Gb, F + 4.2, 2.8, 3.0);
  pbox(m.render, -0.8, 0.8, F + 2.5, F + 4.2, 2.8, 3.0); pbox(m.render, -1.3, 1.3, Gb, F - 0.02, -0.5, 2.8);
  pbox(m.steps, -1.3, 1.3, F - 0.05, F + 0.02, -0.6, 2.95);
  pbox(m.render, -1.6, 1.6, F + 4.0, F + 4.2, -0.5, 3.1);
  pbox(m.blue, -1.62, 1.62, F + 3.35, F + 3.75, -0.5, 3.16); pbox(m.blue, -1.62, 1.62, F + 4.15, F + 4.45, -0.5, 3.16);
  { const sg = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 0.36), m.smallSign); sg.position.set(0, F + 3.55, qz * 3.175); if (qz < 0) sg.rotation.y = Math.PI; padd(sg); }
  pbox(m.white, -1.25, 1.25, F + 2.55, F + 2.7, 3.0, 3.85);                                           // door canopy
  for (const sgn of [-1, 1]) pbox(m.door, sgn * 0.8 - 0.03, sgn * 0.8 + 0.03, F, F + 2.4, 1.75, 2.8); // doors standing open
  // landing with black railings, then the stair down towards the promenade
  pbox(m.render, -2.2, 2.2, Gb, F - 0.02, 2.9, qLand); pbox(m.steps, -2.2, 2.2, F - 0.05, F + 0.02, 2.95, qLand);
  for (const sgn of [-1, 1]) {
    for (let p = 1.6; p <= 2.2; p += 0.2) pbox(m.black, sgn * p - 0.015, sgn * p + 0.015, F, F + 1.05, qLand - 0.02, qLand + 0.02);
    continue; // both sides open: south-west onto the walkway to the balcony terrace, north-east onto the balcony to the lounge
    for (let q = 3.0; q <= qLand; q += 0.25) pbox(m.black, sgn * 2.2 - 0.02, sgn * 2.2 + 0.02, F, F + 1.05, q - 0.015, q + 0.015);
    pbox(m.black, sgn * 2.2 - 0.04, sgn * 2.2 + 0.04, F + 1.0, F + 1.06, 2.9, qLand);
    for (let p = 1.5; p <= 2.2; p += 0.2) pbox(m.black, sgn * p - 0.015, sgn * p + 0.015, F, F + 1.05, 2.9, 2.94);
  }
  for (let k = 0; k < ns; k++) { const q0 = qLand + k * 0.3, yT = F - (k + 1) * rise; pbox(m.steps, -sw, sw, Gb, yT, q0, q0 + 0.3); pbox(m.nosing, -sw, sw, yT, yT + 0.01, q0 + 0.22, q0 + 0.3); }
  const cheek = (p0, p1, mat, yb, yt, th) => { const sh = new THREE.Shape([new THREE.Vector2(qz * (qBot + 0.4), yb), new THREE.Vector2(qz * qLand, yt), new THREE.Vector2(qz * qLand, yt + th), new THREE.Vector2(qz * (qBot + 0.4), yb + th)]); const g = new THREE.ExtrudeGeometry(sh, { depth: p1 - p0, bevelEnabled: false }); g.rotateY(-Math.PI / 2); g.translate(p1, 0, 0); const me = new THREE.Mesh(g, mat); me.material.side = THREE.DoubleSide; return padd(me); };
  for (const [p0, p1] of [[-sw - 0.4, -sw], [sw, sw + 0.4]]) { cheek(p0, p1, m.render, Gb, F - 0.3, 1.3 + 0.3); cheek(p0 - 0.03, p1 + 0.03, m.blue, yb0 + 1.0, F + 1.0, 0.12); }
  const rail = (p, yOff) => { const pts = [new THREE.Vector3(p, yb0 + yOff, qz * qBot), new THREE.Vector3(p, F + yOff, qz * qLand), new THREE.Vector3(p, F + yOff, qz * (qLand - 0.6))]; padd(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.05), 24, 0.03, 6), m.rail)); };
  rail(0, 0.95); rail(-sw + 0.15, 1.85); rail(sw - 0.15, 1.85);
  for (let k = 0; k <= ns; k += 4) { const q = qLand + k * 0.3, yy = F - k * rise; pbox(m.rail, -0.03, 0.03, yy, yy + 0.95, q - 0.03, q + 0.03); }
  // balcony from the landing's seaward-east side round to the lounge doors (user, 12 Oct 2026)
  const yB = LD, bA = { u0: -6.9, u1: -5.8, v0: 2.4, v1: 8.6 }, bB = { u0: -5.8, u1: 0, v0: 2.4, v1: 6.0 };
  // the lounge floor is lower than the entrance landing: a short flight of steps on the balcony takes up the difference
  const nsB = Math.max(0, Math.round((F - yB) / rise)), rB = nsB ? (F - yB) / nsB : 0, vs1 = 7.5, vs0 = vs1 - nsB * 0.3;
  const balY = (v) => (v >= vs1 ? F : v <= vs0 ? yB : F - Math.ceil((vs1 - v) / 0.3 - 1e-6) * rB);
  for (const r of [bA, bB]) { box(m.render, r.u0, r.u1, yB - 0.35, yB - 0.02, r.v0, r.v1, false); box(m.steps, r.u0, r.u1, yB - 0.05, yB + 0.02, r.v0, r.v1, false); box(m.blue, r.u0, r.u1, yB - 0.35, yB - 0.12, r.v0 - 0.07, r.v0 + 0.15, false); }
  if (nsB) { box(m.render, bA.u0, bA.u1, yB - 0.35, F - 0.02, vs1, bA.v1, false); box(m.steps, bA.u0, bA.u1, F - 0.05, F + 0.02, vs1, bA.v1, false);
    for (let k = 0; k < nsB; k++) { const v1 = vs1 - k * 0.3, y = F - (k + 1) * rB; box(m.steps, bA.u0, bA.u1, yB - 0.3, y, v1 - 0.3, v1, false); box(m.nosing, bA.u0, bA.u1, y, y + 0.01, v1 - 0.3, v1 - 0.22, false); }
    const pts = [new THREE.Vector3(bA.u1 - 0.08, yB + 0.95, Z(vs0)), new THREE.Vector3(bA.u1 - 0.08, F + 0.95, Z(vs1))]; add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 8, 0.03, 6), m.rail)); }
  for (const u of [-6.8, -3.5, -0.2]) box(m.render, u - 0.18, u + 0.18, Gp - 0.3, yB - 0.35, 2.45, 2.81);
  for (let u = bA.u0 + 0.1; u < 0; u += 0.25) box(m.black, u - 0.015, u + 0.015, yB, yB + 1.05, 2.4, 2.44, false);
  box(m.black, bA.u0, 0, yB + 1.0, yB + 1.06, 2.36, 2.48);
  for (let v = 2.5; v <= 6.7; v += 0.25) box(m.black, bA.u0, bA.u0 + 0.04, balY(v), balY(v) + 1.05, v - 0.015, v + 0.015, false);
  // walkway along the entrance block's landward face: the landing joins the balcony terrace (user's sketch, 12 Oct 2026)
  const wu0 = -11.2, wv0 = 8.2;
  box(m.render, wu0, bu0, Gb, F - 0.02, wv0, 21.2, false); box(m.steps, wu0, bu0 - 0.3, F - 0.05, F + 0.02, wv0, 21.2, false);
  box(m.blue, wu0 - 0.07, wu0 + 0.15, F - 0.35, F - 0.12, wv0, 21.2, false);
  for (let v = wv0 + 0.1; v <= 21.2; v += 0.25) box(m.black, wu0, wu0 + 0.04, F, F + 1.05, v - 0.015, v + 0.015, false);
  box(m.black, wu0 - 0.03, wu0 + 0.07, F + 1.0, F + 1.06, wv0, 21.2);
  for (let u = wu0; u <= -10.05; u += 0.25) box(m.black, u - 0.015, u + 0.015, F, F + 1.05, 21.18, 21.22, false);
  box(m.black, wu0, -10.05, F + 1.0, F + 1.06, 21.15, 21.25);
  // balcony terrace in front of the landward range: railings with show banners, an undercroft of white piers below
  box(m.render, -10.05, -6.6, F - 0.35, F, 21.2, 31, false); box(m.steps, -10.05, -6.6, F - 0.05, F + 0.02, 21.2, 31, false);
  box(m.blue, -10.12, -9.9, F - 0.35, F - 0.12, 21.2, 31, false);                                   // blue band along the balcony edge
  facePlane(m.dark, -7.0, 21.5, 30.8, Gf, F - 0.35);                                                  // shadowed undercroft
  for (const v of [21.45, 24.6, 27.8, 30.75]) box(m.render, -10.05, -9.6, Gf - 0.3, F - 0.35, v - 0.25, v + 0.25);
  for (let v = 21.4; v <= 31; v += 0.25) box(m.black, -10.0, -9.96, F, F + 1.05, v - 0.015, v + 0.015, false);
  box(m.black, -10.03, -9.93, F + 1.0, F + 1.06, 21.3, 31);
  m.banners.forEach((bm, i) => facePlane(bm, -10.07, 21.9 + i * 3.0, 21.9 + i * 3.0 + 2.6, F + 0.12, F + 0.95));
  // two-storey landward range: blue-framed windows and doors onto the balcony, blue bands, hipped pantile roof
  const fr = { u0: -6.75, u1: -1.2, v0: 21.2, v1: 31.0, top: F + 3.9 };
  box(m.render, fr.u0, fr.u1, F - 0.3, fr.top, fr.v0, fr.v1);
  box(m.blue, fr.u0 - 0.12, fr.u1, F + 3.05, F + 3.3, fr.v0 - 0.1, fr.v1 + 0.1);                   // band under the eaves
  box(m.blue, fr.u0 - 0.12, fr.u1, fr.top - 0.18, fr.top, fr.v0 - 0.1, fr.v1 + 0.1);
  for (const [v0, v1, door] of [[21.8, 23.3, false], [24.0, 25.6, true], [26.6, 28.2, true], [28.9, 30.4, false]]) {
    const y0 = door ? F + 0.05 : F + 0.9; facePlane(m.window, fr.u0 - 0.02, v0, v1, y0, F + 2.6);
    box(m.blue, fr.u0 - 0.1, fr.u0, y0 - 0.08, F + 2.68, v0 - 0.08, v0); box(m.blue, fr.u0 - 0.1, fr.u0, y0 - 0.08, F + 2.68, v1, v1 + 0.08);
    box(m.blue, fr.u0 - 0.1, fr.u0, F + 2.6, F + 2.68, v0, v1); box(m.blue, fr.u0 - 0.1, fr.u0, y0 - 0.08, y0, v0, v1);
    box(m.blue, fr.u0 - 0.1, fr.u0, y0, F + 2.6, (v0 + v1) / 2 - 0.03, (v0 + v1) / 2 + 0.03);
  }
  const hip = (u0, u1, v0, v1, y0, pitch, mat) => { // hipped roof over a local rectangle (ridge along the longer side)
    const ov = 0.35; u0 -= ov; u1 += ov; v0 -= ov; v1 += ov; const du = u1 - u0, dv = v1 - v0, t = Math.tan(pitch);
    const pos = []; const P = (u, y, v) => [u, y, Z(v)];
    const tri = (a, b, c) => pos.push(...a, ...b, ...c), quad = (a, b, c, d) => { tri(a, b, c); tri(a, c, d); };
    if (dv >= du) { const h = du / 2 * t, rv0 = v0 + du / 2, rv1 = v1 - du / 2, um = (u0 + u1) / 2;
      quad(P(u0, y0, v0), P(u0, y0, v1), P(um, y0 + h, rv1), P(um, y0 + h, rv0)); quad(P(u1, y0, v1), P(u1, y0, v0), P(um, y0 + h, rv0), P(um, y0 + h, rv1));
      tri(P(u1, y0, v0), P(u0, y0, v0), P(um, y0 + h, rv0)); tri(P(u0, y0, v1), P(u1, y0, v1), P(um, y0 + h, rv1));
    } else { const h = dv / 2 * t, ru0 = u0 + dv / 2, ru1 = u1 - dv / 2, vm = (v0 + v1) / 2;
      quad(P(u0, y0, v0), P(u1, y0, v0), P(ru1, y0 + h, vm), P(ru0, y0 + h, vm)); quad(P(u1, y0, v1), P(u0, y0, v1), P(ru0, y0 + h, vm), P(ru1, y0 + h, vm));
      tri(P(u0, y0, v1), P(u0, y0, v0), P(ru0, y0 + h, vm)); tri(P(u1, y0, v0), P(u1, y0, v1), P(ru1, y0 + h, vm)); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return add(new THREE.Mesh(g, mat));
  };
  hip(fr.u0, fr.u1, fr.v0, fr.v1, fr.top, 30 * Math.PI / 180, m.pantile);
  // raised centre block carrying the big lettering, with its own hipped roof
  const cb = { u0: -7.05, u1: -2.6, v0: 22.6, v1: 29.6, top: F + 5.7 };
  box(m.render, cb.u0, cb.u1, fr.top - 0.3, cb.top, cb.v0, cb.v1);
  box(m.blue, cb.u0 - 0.12, cb.u1, cb.top - 0.22, cb.top, cb.v0 - 0.12, cb.v1 + 0.12);
  box(m.blue, cb.u0 - 0.12, cb.u0, fr.top + 0.15, cb.top - 0.22, cb.v0 - 0.12, cb.v0 + 0.05); box(m.blue, cb.u0 - 0.12, cb.u0, fr.top + 0.15, cb.top - 0.22, cb.v1 - 0.05, cb.v1 + 0.12);
  facePlane(m.bigLetters, cb.u0 - 0.03, cb.v0 + 0.25, cb.v1 - 0.25, fr.top + 0.35, fr.top + 1.25);
  hip(cb.u0, cb.u1, cb.v0, cb.v1, cb.top, 32 * Math.PI / 180, m.pantile);
  // seaward lounge end: blue mullions on the glazing and the LOUNGE sign above it
  for (const v of [1.3, 3.2, 5.1, 7.0, 8.8]) box(m.blue, -0.16, 0.0, LF + 0.3, LT - 0.05, v - 0.06, v + 0.06);
  box(m.blue, -0.16, 0.0, LF + 0.25, LF + 0.4, 1.2, 8.9); box(m.blue, -0.16, 0.0, LT - 0.15, LT, 1.2, 8.9);
  box(m.render, -0.3, 0.1, LT + 0.5, LT + 1.9, 1.2, 8.9); box(m.blue, -0.32, -0.28, LT + 0.5, LT + 1.9, 8.8, 8.95);   // parapet carrying the copper LOUNGE fascia, blue edge (photo)
  facePlane(m.loungeSign, -0.33, 1.7, 8.5, LT + 0.75, LT + 1.65);

  // ---------- street furniture from the photos: roundabout boat planter, ticket barrier, lamp post, bench, cordylines ----------
  const extraCol = [];
  const colAt = (u, v, r, y0, top, kind) => { const w = W(u, v); extraCol.push({ type: 'circle', x: w[0], z: w[1], r, y0, top, kind }); };
  { // blue-and-white rowing boat planter on the Undercliff Road roundabout island (photo: far side of the island, long axis across the view)
    const [bu, bv] = toL(272.5, -83.2), by = gw(bu, bv) + 0.05;
    const hull = (hw, hl) => { const sh = new THREE.Shape(); sh.moveTo(-hl, 0); sh.quadraticCurveTo(0, hw * 1.5, hl, 0); sh.quadraticCurveTo(0, -hw * 1.5, -hl, 0); return sh; };
    const slab = (shape, depth, mat, y) => { const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false }); g.rotateX(-Math.PI / 2); const me = new THREE.Mesh(g, mat); me.position.set(bu, by + y, Z(bv)); return add(me, false); };
    slab(hull(0.62, 1.95), 0.5, m.white, 0.0); slab(hull(0.66, 2.0), 0.07, m.blue, 0.46);
    slab(hull(0.5, 1.8), 0.04, m.soil, 0.53);
    for (let k = 0; k < 7; k++) { const t = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.5, 5), m.reed); t.position.set(bu - 1.2 + k * 0.4, by + 0.78, Z(bv + (k % 2 ? 0.14 : -0.14))); t.rotation.z = (k % 3 - 1) * 0.25; add(t, false); }
    colAt(bu, bv, 1.5, by - 0.5, by + 0.7, 'furniture');
  }
  { // orange ticket barrier with red/white boom and STOP sign across the promenade strip (photo: gateway barrier)
    const bu2 = -3.2, bvA = -3.7, bvB = -9.6, gy = gw(bu2, -6);
    box(m.orange, bu2 - 0.22, bu2 + 0.22, gy, gy + 1.05, bvA - 0.22, bvA + 0.22); box(m.black, bu2 - 0.2, bu2 + 0.2, gy + 1.05, gy + 1.1, bvA - 0.2, bvA + 0.2);
    box(m.stripes, bu2 - 0.04, bu2 + 0.04, gy + 0.98, gy + 1.08, bvB, bvA - 0.22, false);
    box(m.orange, bu2 - 0.08, bu2 + 0.08, gy, gy + 1.05, bvB - 0.1, bvB + 0.1);
    box(m.black, bu2 - 0.02, bu2 + 0.02, gy + 0.7, gy + 1.7, -7.0, -6.96, false);
    const stop = new THREE.Mesh(new THREE.CircleGeometry(0.3, 8, Math.PI / 8), m.stopSign); stop.position.set(bu2 - 0.06, gy + 1.65, Z(-6.98)); stop.rotation.y = -Math.PI / 2; add(stop, false);
    colAt(bu2, bvA, 0.25, gy - 0.5, gy + 1.1, 'furniture');
  }
  { // black Victorian lamp post in front of the stair, brown bench and cordylines either side of it (photos 1 and 3)
    const lp = pq(-3.4, qBot + 1.2);
    const lg = gw(...lp);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 4.2, 8), m.black); pole.position.set(lp[0], lg + 2.1, Z(lp[1])); add(pole, false);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.17, 0.9, 8), m.black); base.position.set(lp[0], lg + 0.45, Z(lp[1])); add(base, false);
    const lan = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.14, 0.55, 6), m.pendant); lan.position.set(lp[0], lg + 4.4, Z(lp[1])); add(lan, false);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.25, 6), m.black); cap.position.set(lp[0], lg + 4.8, Z(lp[1])); add(cap, false);
    colAt(lp[0], lp[1], 0.15, lg - 0.5, lg + 4.2, 'column');
    const bp = pq(-5.6, qBot + 0.3), bg = gw(...bp); // bench, back to the cliff
    box(m.bench, bp[0] - 0.9, bp[0] + 0.9, bg + 0.42, bg + 0.48, bp[1] - 0.25, bp[1] + 0.25, false); box(m.bench, bp[0] - 0.9, bp[0] + 0.9, bg + 0.55, bg + 0.95, bp[1] + 0.22, bp[1] + 0.27, false);
    for (const du of [-0.8, 0.8]) box(m.black, bp[0] + du - 0.03, bp[0] + du + 0.03, bg, bg + 0.42, bp[1] - 0.22, bp[1] + 0.22, false);
  }
  { // cordyline palms: two by the stair, two on the promenade by the barrier, two more along the sea-front (photo 3)
    const spots = [pq(-4.4, qBot + 0.2), pq(-5.2, qBot - 0.8), [3.5, -5.2], [9.5, -5.6], [15.5, -5.2], [21.5, -5.5]];
    const leaf = new THREE.ConeGeometry(0.06, 1.7, 4); leaf.translate(0, 0.85, 0);
    const per = 16, im = new THREE.InstancedMesh(leaf, m.leaf, spots.length * per), mt = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), ps = new THREE.Vector3();
    spots.forEach(([u, v], i) => { const g0 = gw(u, v), h = 2.0 + (i % 3) * 0.55;
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, h, 6), m.trunk); t.position.set(u, g0 + h / 2, Z(v)); add(t, false);
      for (let k = 0; k < per; k++) { const az = k / per * Math.PI * 2 + i, tilt = 0.55 + (k % 3) * 0.3; e.set(Math.cos(az) * tilt, 0, Math.sin(az) * tilt); q.setFromEuler(e); ps.set(u, g0 + h, Z(v)); const L = 0.85 + (k % 4) * 0.12; sc.set(1, L, 1); mt.compose(ps, q, sc); im.setMatrixAt(i * per + k, mt); }
      colAt(u, v, 0.2, g0 - 0.5, g0 + h, 'column'); });
    add(im, false);
  }

  // ---------- interior ----------
  const IN = { e0: bu0, e1: -3.0, f1: 4.5, a1: 30.0, s1: 37.5, v0: 9.6, v1: 30.2 }; // kept inside the OSM footprint
  const rows = 26, rowPitch = 0.85, row0 = 6.4, frontFloor = F - 1.4;
  const floorAt = (u) => (u < row0 - 0.4 ? F : u > 29 ? frontFloor : F - 1.4 * (u - (row0 - 0.4)) / (29 - (row0 - 0.4)));
  // entrance room: posters
  flat(m.carpet, IN.e0, IN.e1, bv0, bv1, F + 0.01); flat(m.ceiling, IN.e0, IN.e1, bv0, bv1, F + 3.2);
  wall(m.wallCream, bu1, bv0 + 0.02, IN.e1, bv0 + 0.02, F, F + 3.2); wall(m.wallCream, IN.e0 + 0.02, bv1 - 0.02, IN.e1, bv1 - 0.02, F, F + 3.2);
  wall(m.dadoBlue, bu1, bv0 + 0.03, IN.e1, bv0 + 0.03, F, F + 1.0); wall(m.dadoBlue, IN.e0 + 0.03, bv1 - 0.03, IN.e1, bv1 - 0.03, F, F + 1.0);
  wall(m.wallCream, IN.e0 + 0.02, bv0, IN.e0 + 0.02, bv1, F, F + 3.2); wall(m.wallCream, bu0, bv0 + 0.02, bu1, bv0 + 0.02, F + 3.2, F + 3.2 + 0.01);
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
  const lv = (x, z) => toL(x, z)[1];
  const ringPQ = (pts) => pts.map(([p, q]) => W(...pq(p, q)));
  const qOf = (x, z) => { const [u, v] = toL(x, z); return (u - Ou) * dU + (v - Ov) * dV; };
  surfaces.push({ id: 'spa-terrace', kind: 'terrace', ring: ringW([[wu0, wv0], [bu0, wv0], [bu0, 21.2], [-6.6, 21.2], [-6.6, 31], [-10.05, 31], [-10.05, 21.2], [wu0, 21.2]]), heightAt: () => F });
  surfaces.push({ id: 'spa-balcony', kind: 'terrace', ring: ringW([[bA.u0, bA.v0], [bB.u1, bB.v0], [bB.u1, bB.v1], [bA.u1, bB.v1], [bA.u1, bA.v1], [bA.u0, bA.v1]]), heightAt: (x, z) => balY(toL(x, z)[1]) });
  surfaces.push({ id: 'spa-lounge', kind: 'terrace', ring: ringW([[0.0, -0.1], [35.7, -0.1], [35.7, 8.7], [0.0, 8.7]]), heightAt: () => LD });
  surfaces.push({ id: 'spa-porch', kind: 'terrace', ring: ringPQ([[-1.3, -0.6], [1.3, -0.6], [1.3, 2.9], [2.2, 2.9], [2.2, qLand], [-2.2, qLand], [-2.2, 2.9], [-1.3, 2.9]]), heightAt: () => F });
  surfaces.push({ id: 'spa-stair', kind: 'terrace', ring: ringPQ([[-sw, qLand], [sw, qLand], [sw, qBot], [-sw, qBot]]), heightAt: (x, z) => { const k = Math.max(0, Math.ceil((qOf(x, z) - qLand) / 0.3 - 1e-6)); return Math.max(ctx.ground(x, z), F - k * rise); } });
  void lv;
  for (const s of surfaces) s.meshes = [];

  // ---------- colliders ----------
  const colliders = []; const seg = (a, c, r = 0.05, y0 = Gf - 1, top = E + 3, kind = 'building') => colliders.push({ type: 'segment', a: W(...a), b: W(...c), r, y0, top, kind });
  for (let i = 0; i < Lr.length; i++) { // footprint, except the colonnade face and the entrance opening
    const p = Lr[i], q = Lr[(i + 1) % Lr.length], L = Math.hypot(q[0] - p[0], q[1] - p[1]), n = Math.max(1, Math.ceil(L));
    for (let k = 0; k < n; k++) { const a = [p[0] + (q[0] - p[0]) * k / n, p[1] + (q[1] - p[1]) * k / n], c = [p[0] + (q[0] - p[0]) * (k + 1) / n, p[1] + (q[1] - p[1]) * (k + 1) / n], mu = (a[0] + c[0]) / 2, mv = (a[1] + c[1]) / 2;
      if (mv < 2.5 && mu > -1 && mu < 37) continue; if (mu < -4.5 && mv > bv0 - 0.1 && mv < bv1 + 0.1) continue;
      if (mu > -0.5 && mu < 1.0 && mv < 6.5) { seg(a, c, 0.05, Gf - 1, LF - 0.1); continue; } // lounge end: open at balcony level (walls added below)
      seg(a, c); }
  }
  seg([0, 3], [36, 3]); for (let u = 0.3; u <= 35.8; u += 4.45) colliders.push({ type: 'circle', ...(() => { const w = W(u, 0.38); return { x: w[0], z: w[1] }; })(), r: 0.32, y0: Gp - 1, top: LF, kind: 'column' });
  seg([bu1, bv0 - 0.15], [-4.5, bv0 - 0.15]); seg([bu0 - 0.15, bv1 + 0.15], [-4.5, bv1 + 0.15]);
  seg([bu0 - 0.15, bv0 - 0.15], [bu0 - 0.15, bv1 + 0.15]);
  const segPQ = (a, c, r = 0.05, y0 = Gf - 1, top = E + 3, kind = 'building') => colliders.push({ type: 'segment', a: W(...pq(...a)), b: W(...pq(...c)), r, y0, top, kind });
  segPQ([-1.4, -0.5], [-1.4, 3.0], 0.1); segPQ([1.4, -0.5], [1.4, 3.0], 0.1); segPQ([-1.5, 2.9], [-0.8, 2.9], 0.1); segPQ([0.8, 2.9], [1.5, 2.9], 0.1);
  seg([0.05, 1.2], [0.05, ld0], 0.08, LF, LT); seg([0.05, ld1], [0.05, 8.8], 0.08, LF, LT); seg([0, -0.15], [36, -0.15], 0.1, LF, LT); seg([0, 8.75], [36, 8.75], 0.1, LF, LT); // lounge
  seg([bA.u0, bA.v0], [0, bA.v0], 0.08, yB - 1, yB + 1.1, 'railing'); seg([bA.u0, bA.v0], [bA.u0, 6.6], 0.08, yB - 1, yB + 1.1, 'railing');
  seg([8, 7.5], [26, 7.5], 0.35, LD - 0.2, LD + 1.1, 'furniture');
  for (const sgn of [-1, 1]) { segPQ([sgn * 1.6, qLand], [sgn * 2.2, qLand], 0.08, F - 1, F + 1.1, 'railing'); segPQ([sgn * (sw + 0.2), qLand], [sgn * (sw + 0.2), qBot + 0.4], 0.2); }
  seg([wu0, wv0], [wu0, 21.2], 0.08, F - 1, F + 1.1, 'railing'); seg([wu0, 21.2], [-10.05, 21.2], 0.08, F - 1, F + 1.1, 'railing');
  seg([-10.05, 21.2], [-10.05, 31], 0.08, F - 1, F + 1.1, 'railing'); seg([-10.05, 31], [-6.6, 31], 0.08, F - 1, F + 1.1, 'railing');
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
  const loungeInterior = { id: 'spa-lounge', name: 'Spa Pavilion lounge', ring: ringW([[0.0, -0.1], [35.7, -0.1], [35.7, 8.7], [0.0, 8.7]]), top: LT, bottom: LF - 0.6, ceilingAt: () => LT - 0.15 };
  colliders.push(...extraCol);
  return { group, colliders, surfaces, interior, extraInteriors: [loungeInterior], floorY: F, info: { F, nSteps: ns, entranceFaces: 'sea, 18 deg towards Undercliff Road', seats: seatPos.length } };
}

function clipHalf(ring, f) {
  const out = [];
  for (let i = 0; i < ring.length; i++) { const p = ring[i], q = ring[(i + 1) % ring.length], fp = f(p), fq = f(q); if (fp <= 0) out.push(p); if ((fp <= 0) !== (fq <= 0)) { const t = fp / (fp - fq); out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); } }
  return out;
}
export const _pointInRing = pointInRing;
