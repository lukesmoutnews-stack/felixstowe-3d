// Felixstowe Town Hall, Undercliff Road West (OSM way 500565020), modelled from a photograph supplied
// by the user (Oct 2026) and the published description of the building: red brick with terracotta
// dressings, an asymmetrical six-bay front (bays 1-4 sash windows on both floors; bay 5 a doorway with
// Corinthian pilasters, an entablature, a cartouche and three finials; bay 6 canted bay windows on both
// floors under a pediment with a blind oculus). Built 1892 to designs by George Horton.
// Sources: https://en.wikipedia.org/wiki/Felixstowe_Town_Hall ; OSM footprint; EA LiDAR (90th
// percentile 9.8 m above ground). The model is not enterable: the game gives no access to the building.

import * as THREE from 'three';
import { ensureCCW, insetRing } from '../geo/polygon.js';
import { triangulate } from './accum.js';

export const isTownHall = (b) => b.id === 500565020 || /^felixstowe town hall$/i.test(b.name || '');

let M = null;
function tex(w, h, draw, rep = true) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (rep) t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }
function brickTex(base, vary) { // 1.2 m x 0.6 m of stretcher-bond brickwork (8 courses)
  return tex(256, 128, (g, w, h) => {
    g.fillStyle = '#d9c9b0'; g.fillRect(0, 0, w, h); let s = 3; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const ch = h / 8, bw = w / 5.5;
    for (let row = 0; row < 8; row++) for (let k = -1; k < 6; k++) { const x = k * bw + (row % 2) * bw / 2; const l = base[2] + (r() - 0.5) * vary; g.fillStyle = `hsl(${base[0] + (r() - 0.5) * 6},${base[1]}%,${l}%)`; g.fillRect(x + 1.5, row * ch + 1.5, bw - 3, ch - 3); }
  });
}
function mats() {
  if (M) return M;
  const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.85, ...o });
  const brick = brickTex([14, 62, 44], 9), plinth = brickTex([225, 22, 20], 6);
  M = {
    brick: std({ map: brick }), plinth: std({ map: plinth }),
    terracotta: std({ map: tex(128, 64, (g, w, h) => { g.fillStyle = '#c06a40'; g.fillRect(0, 0, w, h); g.fillStyle = '#a5532f'; for (let x = 8; x < w; x += 32) { g.beginPath(); g.ellipse(x + 8, h / 2, 10, 14, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#d48558'; g.beginPath(); g.ellipse(x + 8, h / 2, 5, 8, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#a5532f'; } }) }),
    stone: std({ color: 0xc98a5e }), stoneLight: std({ color: 0xd9a77e }),
    herring: std({ map: tex(128, 128, (g, w, h) => { g.fillStyle = '#d9c9b0'; g.fillRect(0, 0, w, h); for (let y = -w; y < h + w; y += 16) for (let x = 0; x < w; x += 32) { g.fillStyle = `hsl(14,60%,${40 + ((x + y) % 7)}%)`; g.save(); g.translate(x, y + x / 2); g.rotate(Math.PI / 4); g.fillRect(0, 0, 20, 8); g.restore(); g.save(); g.translate(x + 16, y + x / 2 + 8); g.rotate(-Math.PI / 4); g.fillRect(0, 0, 20, 8); g.restore(); } }) }),
    white: std({ color: 0xf6f4ee, roughness: 0.5 }), glass: std({ color: 0x5b6b78, roughness: 0.1, metalness: 0.5 }),
    blinds: std({ map: tex(64, 64, (g, w, h) => { g.fillStyle = '#c9d3dc'; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 6) { g.fillStyle = '#aab6c2'; g.fillRect(x, 0, 1.5, h); } }) }),
    door: std({ color: 0x24479a, roughness: 0.4 }), black: std({ color: 0x1c1d20, roughness: 0.5, metalness: 0.4 }),
    sign: std({ map: tex(512, 128, (g, w, h) => { g.fillStyle = '#1f3f8f'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = '700 64px "Gill Sans", "Helvetica Neue", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('TOWN HALL', w / 2, h * 0.58); }, false) }),
    board: std({ map: tex(512, 256, (g, w, h) => { g.fillStyle = '#1f3f8f'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = '700 30px Georgia, serif'; g.textAlign = 'center'; g.fillText('FELIXSTOWE TOWN HALL', w / 2, 38); g.fillStyle = '#eef2f6'; for (let i = 0; i < 4; i++) g.fillRect(24 + i * 118, 60, 100, 170); g.fillStyle = '#9fb3c8'; for (let i = 0; i < 16; i++) g.fillRect(34 + (i % 4) * 118, 74 + Math.floor(i / 4) * 38, 80, 6); }, false) }),
    plaque: std({ color: 0x2b2a28, metalness: 0.5, roughness: 0.4 }),
    roof: std({ map: tex(128, 128, (g, w, h) => { g.fillStyle = '#7d3b26'; g.fillRect(0, 0, w, h); let s = 9; const r = () => (s = (s * 16807) % 2147483647) / 2147483647; for (let y = 0; y < h; y += 10) for (let x = (y / 10) % 2 * 8; x < w; x += 16) { g.fillStyle = `hsl(12,${45 + r() * 15}%,${28 + r() * 12}%)`; g.fillRect(x, y, 15, 9); } }) }),
    bollard: std({ color: 0x24479a, roughness: 0.4 }), lead: std({ color: 0x8d9296, roughness: 0.6 }),
  };
  M.brick.map.repeat.set(1 / 1.2, 1 / 0.6); M.plinth.map.repeat.set(1 / 1.2, 1 / 0.6);
  return M;
}

export function buildTownHall(b, ctx) {
  const m = mats(), outer = ensureCCW(b.outer);
  // front: the long edge facing a car road
  let best = null;
  for (let i = 0; i < outer.length; i++) {
    const a = outer[i], c = outer[(i + 1) % outer.length], L = Math.hypot(c[0] - a[0], c[1] - a[1]); if (L < 10) continue;
    const nx = -(c[1] - a[1]) / L, nz = (c[0] - a[0]) / L, mx = (a[0] + c[0]) / 2 + nx * 6, mz = (a[1] + c[1]) / 2 + nz * 6;
    const road = ctx.nearestRoad(mx, mz, 25, (r) => r.car);
    const score = L * 0.3 + (road ? 40 - road.d : 0) + ctx.ground(mx, mz) * -0.5; if (!best || score > best.score) best = { score, a, c, L, nx, nz };
  }
  const { a: A, c: B, L: W, nx: Nx, nz: Nz } = best;
  const Ex = (B[0] - A[0]) / W, Ez = (B[1] - A[1]) / W, Ox = (A[0] + B[0]) / 2, Oz = (A[1] + B[1]) / 2;
  const base = ctx.ground(Ox + Nx * 3, Oz + Nz * 3);
  let gMin = Infinity; for (const [x, z] of outer) gMin = Math.min(gMin, ctx.ground(x, z));
  const group = new THREE.Group(); group.name = 'landmark:town-hall';
  const local = new THREE.Group(); local.position.set(Ox, base, Oz); local.rotation.y = Math.atan2(-Ez, Ex); group.add(local);
  const add = (me, cast = true) => { me.castShadow = cast; me.receiveShadow = true; local.add(me); return me; };
  const box = (mat, x0, x1, y0, y1, z0, z1, cast = true) => { const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0); if (mat.map?.repeat && mat.map.repeat.x !== 1) { const uv = g.attributes.uv; const sx = x1 - x0, sy = y1 - y0, sz = z1 - z0; for (let i = 0; i < uv.count; i++) { const face = Math.floor(i / 4); const [w, h] = face < 2 ? [sz, sy] : face < 4 ? [sx, sz] : [sx, sy]; uv.setXY(i, uv.getX(i) * w, uv.getY(i) * h); } } const me = new THREE.Mesh(g, mat); me.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); return add(me, cast); };
  const plane = (mat, x0, x1, y0, y1, z) => { const me = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0), mat); me.position.set((x0 + x1) / 2, (y0 + y1) / 2, z); return add(me, false); };
  const hw = W / 2, X = (f) => -hw + W * f; // fraction along the front, left to right (from the photo)
  const EAVES = 7.45;
  // ----- body: the OSM footprint in brick, set just behind the front line -----
  const core = insetRing(outer, 0.3) || outer;
  const shape = new THREE.Shape(core.map(([x, z]) => new THREE.Vector2(x, -z)));
  const bg = new THREE.ExtrudeGeometry(shape, { depth: base + EAVES - (gMin - 0.4), bevelEnabled: false }); bg.rotateX(-Math.PI / 2); bg.translate(0, gMin - 0.4, 0);
  const body = new THREE.Mesh(bg, m.brick); body.castShadow = body.receiveShadow = true; group.add(body);
  // hipped clay roof with ridge cresting
  const roofRing = insetRing(outer, -0.35) || outer; const roofAcc = ctx.acc.get(Ox, Oz, 'roof:clay', true), rt = [1.0, 0.62, 0.5];
  let prev = ensureCCW(roofRing), y = base + EAVES + 0.25; const tan = Math.tan(30 * Math.PI / 180);
  for (let s = 0; s < 6; s++) { const inn = insetRing(prev, 1.4); if (!inn || inn.length !== prev.length) break; for (let i = 0; i < prev.length; i++) { const a = prev[i], c = prev[(i + 1) % prev.length], ia = inn[i], ic = inn[(i + 1) % prev.length], ex = c[0] - a[0], ez = c[1] - a[1], el = Math.hypot(ex, ez) || 1; const uv = (p) => [((p[0] - a[0]) * ex + (p[1] - a[1]) * ez) / el / 2, Math.abs((p[0] - a[0]) * -ez + (p[1] - a[1]) * ex) / el / 2]; roofAcc.quad([a[0], y, a[1]], [c[0], y, c[1]], [ic[0], y + 1.4 * tan, ic[1]], [ia[0], y + 1.4 * tan, ia[1]], uv(a), uv(c), uv(ic), uv(ia), rt); } prev = inn; y += 1.4 * tan; }
  { const { verts, tris } = triangulate(prev); for (const [i, j, k] of tris) roofAcc.triFlat([verts[i][0], y, verts[i][1]], [verts[k][0], y, verts[k][1]], [verts[j][0], y, verts[j][1]], [0, 0], [1, 0], [0, 1], rt); }
  const ridgeY = y - base;
  for (let x = X(0.08); x < X(0.68); x += 0.32) { const cr = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.22, 4), m.stone); cr.position.set(x, ridgeY + 0.1, -5.2); add(cr, false); }
  // ----- front wall of the main block (bays 1-5) and plinth -----
  const fz = 0.0, main1 = X(0.714);
  box(m.brick, -hw, main1, 0.9, EAVES, fz - 0.35, fz);
  box(m.plinth, -hw - 0.02, main1, -0.6, 0.95, fz - 0.35, fz + 0.04);
  box(m.stone, -hw - 0.02, main1, 0.92, 1.05, fz - 0.35, fz + 0.07);           // plinth capping
  box(m.stone, -hw - 0.02, W * 0.714 - hw, 4.3, 4.48, fz - 0.35, fz + 0.06);   // string course
  box(m.terracotta, -hw, main1, 6.75, 7.2, fz - 0.35, fz + 0.06);              // terracotta frieze
  box(m.stone, -hw - 0.1, main1 + 0.1, 7.2, EAVES + 0.25, fz - 0.4, fz + 0.32); // eaves cornice
  // sash windows: white frames, upper sash with glazing bars, blinds behind
  const sash = (xc, y0, y1, w) => {
    box(m.brick, xc - w / 2 - 0.22, xc + w / 2 + 0.22, y0 - 0.12, y1 + 0.2, fz, fz + 0.06);              // rubbed-brick surround
    plane(m.blinds, xc - w / 2, xc + w / 2, y0, y1, fz + 0.065);
    const fr = (a0, a1, b0, b1) => box(m.white, a0, a1, b0, b1, fz + 0.06, fz + 0.12, false);
    fr(xc - w / 2, xc + w / 2, y0, y0 + 0.07); fr(xc - w / 2, xc + w / 2, y1 - 0.07, y1); fr(xc - w / 2, xc - w / 2 + 0.07, y0, y1); fr(xc + w / 2 - 0.07, xc + w / 2, y0, y1);
    const mid = y0 + (y1 - y0) * 0.6; fr(xc - w / 2, xc + w / 2, mid - 0.04, mid + 0.04); fr(xc - 0.025, xc + 0.025, y0, y1);
    for (const f of [0.33, 0.67]) fr(xc - 0.02, xc + 0.02, mid, y1).position.x = xc - w / 2 + w * f;
    fr(xc - w / 2, xc + w / 2, mid + (y1 - mid) / 2 - 0.02, mid + (y1 - mid) / 2 + 0.02);
    box(m.stone, xc - w / 2 - 0.1, xc + w / 2 + 0.1, y0 - 0.14, y0 - 0.02, fz, fz + 0.14);              // sill
  };
  for (const f of [0.09, 0.19, 0.345, 0.44]) { const w = W * 0.064; sash(X(f), 1.55, 3.35, w); sash(X(f), 4.6, 6.3, w); }
  sash(X(0.6), 4.6, 6.3, W * 0.058);
  // ----- bay 5: the doorway -----
  const d0 = X(0.535), d1 = X(0.665), dc = (d0 + d1) / 2, dw = W * 0.082;
  box(m.stone, d0, d1, 0.95, 4.1, fz, fz + 0.12);                                       // stone surround
  plane(m.black, dc - dw / 2, dc + dw / 2, 0.95, 3.0, fz + 0.125);                       // opening
  for (const s of [-1, 1]) { const g = new THREE.BoxGeometry(dw / 2 - 0.03, 2.0, 0.08); const leaf = new THREE.Mesh(g, m.door); leaf.position.set(dc + s * dw / 4, 1.96, fz + 0.16); add(leaf, false); if (s > 0) { leaf.position.x += 0.18; leaf.position.z += 0.25; leaf.rotation.y = -0.9; } for (let k = 0; k < 3; k++) box(m.door, dc + s * dw / 4 - 0.18, dc + s * dw / 4 + 0.18, 1.2 + k * 0.62, 1.62 + k * 0.62, fz + 0.2, fz + 0.23, false).position.x += s > 0 ? 0.18 : 0; }
  const fan = new THREE.Mesh(new THREE.CircleGeometry(dw / 2 + 0.02, 24, 0, Math.PI), m.white); fan.position.set(dc, 3.0, fz + 0.13); add(fan, false);
  const fanSign = new THREE.Mesh(new THREE.CircleGeometry(dw / 2 - 0.08, 24, 0, Math.PI), m.sign); fanSign.position.set(dc, 3.0, fz + 0.135); add(fanSign, false);
  // Corinthian pilasters with capitals, entablature, cartouche pediment and three finials
  for (const px of [d0 + 0.14, d1 - 0.14]) { box(m.stoneLight, px - 0.16, px + 0.16, 0.95, 3.45, fz + 0.12, fz + 0.32); for (let k = 0; k < 4; k++) box(m.stone, px - 0.12 + k * 0.08, px - 0.1 + k * 0.08, 1.2, 3.3, fz + 0.32, fz + 0.34, false); box(m.stoneLight, px - 0.24, px + 0.24, 3.45, 3.85, fz + 0.1, fz + 0.38); }
  box(m.stoneLight, d0 - 0.1, d1 + 0.1, 3.85, 4.25, fz + 0.05, fz + 0.4);
  const ped = new THREE.Shape([new THREE.Vector2(d0, 0), new THREE.Vector2(d1, 0), new THREE.Vector2(dc + 0.55, 0.75), new THREE.Vector2(dc - 0.55, 0.75)]);
  const pg = new THREE.ExtrudeGeometry(ped, { depth: 0.25, bevelEnabled: false }); const pm = new THREE.Mesh(pg, m.stone); pm.position.set(0, 4.25, fz + 0.1); add(pm);
  box(m.stoneLight, dc - 0.32, dc + 0.32, 4.3, 5.15, fz + 0.15, fz + 0.4);               // cartouche block
  const cart = new THREE.Mesh(new THREE.CircleGeometry(0.22, 18), m.stone); cart.scale.y = 1.3; cart.position.set(dc, 4.72, fz + 0.41); add(cart, false);
  for (const [fx, fy, r] of [[dc, 5.35, 0.2], [d0 + 0.12, 4.55, 0.13], [d1 - 0.12, 4.55, 0.13]]) { box(m.stone, fx - r * 0.7, fx + r * 0.7, fy - 0.35, fy - 0.15, fz + 0.18, fz + 0.36); const ball = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), m.stoneLight); ball.position.set(fx, fy, fz + 0.27); add(ball); }
  { const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.07, 0.32, 6), m.black); lamp.position.set(dc, 3.62, fz + 0.5); add(lamp, false); }
  // steps with black handrails
  for (let k = 0; k < 6; k++) box(m.stone, d0 + 0.05, d1 - 0.05, -0.3, 0.95 - k * 0.16, fz + 0.15 + k * 0.3, fz + 0.45 + k * 0.3, false);
  for (const sx of [d0 + 0.12, d1 - 0.12]) { const pts = [new THREE.Vector3(sx, 1.95, fz + 0.3), new THREE.Vector3(sx, 1.95, fz + 0.6), new THREE.Vector3(sx, 1.0, fz + 1.9)]; add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.025, 6), m.black), false); box(m.black, sx - 0.02, sx + 0.02, 0.15, 1.0, fz + 1.88, fz + 1.92, false); }
  // ----- bay 6: projecting gabled block with two-storey canted bay -----
  const g0 = X(0.714), g1 = hw, gc = (g0 + g1) / 2, gp = 0.35, gw = g1 - g0;
  box(m.brick, g0, g1, 0.9, EAVES + 0.15, fz - 0.35, fz + gp);
  box(m.plinth, g0 - 0.02, g1 + 0.02, -0.6, 0.95, fz - 0.35, fz + gp + 0.04); box(m.stone, g0 - 0.02, g1 + 0.02, 0.92, 1.05, fz - 0.35, fz + gp + 0.07);
  box(m.stone, g0 - 0.1, g1 + 0.1, EAVES + 0.1, EAVES + 0.4, fz - 0.35, fz + gp + 0.2);
  const tri = new THREE.Shape([new THREE.Vector2(-gw / 2 - 0.1, 0), new THREE.Vector2(gw / 2 + 0.1, 0), new THREE.Vector2(0, 1.9)]);
  const tg = new THREE.ExtrudeGeometry(tri, { depth: 0.3, bevelEnabled: false }); { const uv = tg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 1.0, uv.getY(i) / 1.0); }
  const gable = new THREE.Mesh(tg, m.herring); gable.position.set(gc, EAVES + 0.4, fz + gp - 0.3); add(gable);
  for (const s of [-1, 1]) { const cop = new THREE.Mesh(new THREE.BoxGeometry(Math.hypot(gw / 2 + 0.2, 1.95), 0.16, 0.42), m.stone); cop.position.set(gc + s * (gw / 4 + 0.05), EAVES + 0.4 + 0.97, fz + gp - 0.12); cop.rotation.z = -s * Math.atan2(1.95, gw / 2 + 0.2); add(cop); }
  const arch = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.6, 24, 1, 0, Math.PI), m.brick); arch.position.set(gc, EAVES + 0.75, fz + gp + 0.02); add(arch, false);
  const ocu = new THREE.Mesh(new THREE.CircleGeometry(0.3, 20), m.brick); ocu.position.set(gc, EAVES + 0.8, fz + gp + 0.03); add(ocu, false);
  const ocuRing = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.36, 20), m.stone); ocuRing.position.set(gc, EAVES + 0.8, fz + gp + 0.035); add(ocuRing, false);
  box(m.black, gc - 0.03, gc + 0.03, EAVES + 2.25, EAVES + 2.7, fz + gp - 0.15, fz + gp - 0.1, false); box(m.black, gc - 0.15, gc + 0.15, EAVES + 2.5, EAVES + 2.55, fz + gp - 0.15, fz + gp - 0.1, false); // finial
  // gable roof behind the pediment
  { const rg = new THREE.BufferGeometry(); const zb = -6, zf = fz + gp - 0.3, yb = EAVES + 0.4, yt = EAVES + 2.3; const P = [g0 - 0.1, yb, zf, gc, yt, zf, gc, yt, zb, g0 - 0.1, yb, zf, gc, yt, zb, g0 - 0.1, yb, zb, gc, yt, zf, g1 + 0.1, yb, zf, g1 + 0.1, yb, zb, gc, yt, zf, g1 + 0.1, yb, zb, gc, yt, zb]; rg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); rg.computeVertexNormals(); const rm = new THREE.Mesh(rg, m.roof); rm.material.side = THREE.DoubleSide; add(rm); }
  // canted bay: centre face plus two angled faces, both floors
  const bw = gw * 0.62, bd = 0.75, side = bd * Math.SQRT2;
  const bay = new THREE.Group(); bay.position.set(gc, 0, fz + gp); local.add(bay);
  const bayShape = new THREE.Shape([new THREE.Vector2(-bw / 2 - bd, 0), new THREE.Vector2(bw / 2 + bd, 0), new THREE.Vector2(bw / 2, bd), new THREE.Vector2(-bw / 2, bd)]);
  const lowerG = new THREE.ExtrudeGeometry(bayShape, { depth: 6.3, bevelEnabled: false }); lowerG.rotateX(-Math.PI / 2); lowerG.scale(1, 1, -1);
  const bayBody = new THREE.Mesh(lowerG, m.brick); bayBody.position.y = 0.95; bay.add(bayBody); bayBody.castShadow = true;
  const bayPl = new THREE.Mesh(new THREE.ExtrudeGeometry(bayShape, { depth: 1.55, bevelEnabled: false }).rotateX(-Math.PI / 2).scale(1, 1, -1), m.plinth); bayPl.position.y = -0.6; bay.add(bayPl);
  const bayTop = new THREE.Mesh(new THREE.ExtrudeGeometry(bayShape, { depth: 0.3, bevelEnabled: false }).rotateX(-Math.PI / 2).scale(1.06, 1, -1.12), m.lead); bayTop.position.y = 7.25; bay.add(bayTop);
  const bayBand = new THREE.Mesh(new THREE.ExtrudeGeometry(bayShape, { depth: 0.4, bevelEnabled: false }).rotateX(-Math.PI / 2).scale(1.02, 1, -1.05), m.terracotta); bayBand.position.y = 4.05; bay.add(bayBand);
  const faces = [{ x: 0, z: bd + 0.01, r: 0, w: bw * 0.62 }, { x: -bw / 2 - bd / 2, z: bd / 2 + 0.01, r: -Math.PI / 4, w: side * 0.55 }, { x: bw / 2 + bd / 2, z: bd / 2 + 0.01, r: Math.PI / 4, w: side * 0.55 }];
  for (const f of faces) for (const [y0, y1] of [[1.5, 3.55], [4.65, 6.6]]) {
    const win = new THREE.Group(); win.position.set(f.x, 0, f.z); win.rotation.y = f.r; bay.add(win);
    const bl = new THREE.Mesh(new THREE.PlaneGeometry(f.w, y1 - y0), m.blinds); bl.position.set(0, (y0 + y1) / 2, 0.005); win.add(bl);
    for (const [a0, a1, b0, b1] of [[-f.w / 2, f.w / 2, y0, y0 + 0.07], [-f.w / 2, f.w / 2, y1 - 0.07, y1], [-f.w / 2, -f.w / 2 + 0.07, y0, y1], [f.w / 2 - 0.07, f.w / 2, y0, y1], [-f.w / 2, f.w / 2, y0 + (y1 - y0) * 0.62, y0 + (y1 - y0) * 0.62 + 0.07], [-0.025, 0.025, y0, y1]]) { const fr = new THREE.Mesh(new THREE.BoxGeometry(a1 - a0, b1 - b0, 0.06), m.white); fr.position.set((a0 + a1) / 2, (b0 + b1) / 2, 0.03); win.add(fr); }
  }
  // chimneys with pots
  for (const [f, zc] of [[0.31, -2.2], [0.65, -2.0]]) { box(m.brick, X(f) - 0.45, X(f) + 0.45, EAVES, 9.15, zc - 0.55, zc + 0.55); box(m.stone, X(f) - 0.52, X(f) + 0.52, 9.15, 9.3, zc - 0.62, zc + 0.62); for (const dx of [-0.2, 0.2]) { const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.45, 10), m.terracotta); pot.position.set(X(f) + dx, 9.5, zc); add(pot); } }
  // downpipes, notice board, Lancaster plaque, bollards
  for (const f of [0.02, 0.508, 0.985]) box(m.black, X(f) - 0.05, X(f) + 0.05, 0, EAVES, fz + 0.06, fz + 0.16, false);
  box(m.board, X(0.2), X(0.305), 0.55, 1.45, fz + 0.06, fz + 0.18).material = m.board;
  plane(m.board, X(0.2), X(0.305), 0.55, 1.45, fz + 0.185);
  for (const s of [-1, 1]) box(m.bollard, X(0.2) + (s < 0 ? 0.08 : W * 0.105 - 0.16), X(0.2) + (s < 0 ? 0.16 : W * 0.105 - 0.08), 0, 0.6, fz + 0.12, fz + 0.18, false);
  box(m.plaque, X(0.245), X(0.275), 1.9, 2.4, fz + 0.06, fz + 0.09, false);
  for (const f of [0.175, 0.79]) { const bo = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 1.0, 10), m.bollard); bo.position.set(X(f), 0.5, fz + 2.6); add(bo); }
  return { group, collider: { outer, holes: [], base: gMin - 0.4, top: base + 10 }, front: { x: Ox + Nx * 3, z: Oz + Nz * 3, door: [Ox + Ex * dc + Nx * 2.2, Oz + Ez * dc + Nz * 2.2], base } };
}
