// A small helper for hand-modelled buildings: collects boxes, prisms, tubes and textured panels per material
// and merges each material into one mesh (a few draw calls per building instead of hundreds).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/BufferGeometryUtils.js';

export function makeKit() {
  const acc = new Map();
  const put = (mat, g0) => {
    const g = g0.index ? g0.toNonIndexed() : g0;
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    let l = acc.get(mat); if (!l) acc.set(mat, l = []); l.push(g);
  };
  const box = (mat, x0, x1, y0, y1, z0, z1) => { if (x1 <= x0 || y1 <= y0 || z1 <= z0) return; const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); put(mat, g); };
  /** Face frame: u along the face, w out of it; th turns it about +y (0 = facing +z). */
  const face = (ox, oz, th = 0) => ({ ox, oz, th });
  const fbox = (F, mat, u0, u1, y0, y1, w0, w1) => { if (u1 <= u0 || y1 <= y0 || w1 <= w0) return; const g = new THREE.BoxGeometry(u1 - u0, y1 - y0, w1 - w0); g.translate((u0 + u1) / 2, (y0 + y1) / 2, (w0 + w1) / 2); g.rotateY(F.th); g.translate(F.ox, 0, F.oz); put(mat, g); };
  /** A flat quad on a face with UVs in metres (divided by rep = [metres per texture repeat in u, in v]). */
  const panel = (F, mat, u0, u1, y0, y1, w = 0.01, rep = [1.6, 1.6], flip = false) => {
    const g = new THREE.PlaneGeometry(u1 - u0, y1 - y0); const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (u0 + uv.getX(i) * (u1 - u0)) / rep[0], (y0 + uv.getY(i) * (y1 - y0)) / rep[1]);
    if (flip) g.rotateY(Math.PI);
    g.translate((u0 + u1) / 2, (y0 + y1) / 2, w); g.rotateY(F.th); g.translate(F.ox, 0, F.oz); put(mat, g);
  };
  const prism = (mat, pts, y0, y1) => {
    const sh = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));
    const g = new THREE.ExtrudeGeometry(sh, { depth: y1 - y0, bevelEnabled: false }); g.rotateX(-Math.PI / 2); g.translate(0, y0, 0); put(mat, g);
  };
  const bar = (mat, a, c, t = 0.03) => {
    const d = new THREE.Vector3(c[0] - a[0], c[1] - a[1], c[2] - a[2]), L = d.length(); if (L < 1e-4) return;
    const g = new THREE.BoxGeometry(t, t, L); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), d.normalize()));
    g.translate((a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2); put(mat, g);
  };
  const tube = (mat, a, c, r = 0.02, seg = 6) => {
    const d = new THREE.Vector3(c[0] - a[0], c[1] - a[1], c[2] - a[2]), L = d.length(); if (L < 1e-4) return;
    const g = new THREE.CylinderGeometry(r, r, L, seg); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
    g.translate((a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2); put(mat, g);
  };
  const cyl = (mat, x, y0, y1, z, r0, r1 = r0, seg = 8) => { const g = new THREE.CylinderGeometry(r1, r0, y1 - y0, seg); g.translate(x, (y0 + y1) / 2, z); put(mat, g); };
  const sph = (mat, x, y, z, r, sy = 1, seg = 8) => { const g = new THREE.SphereGeometry(r, seg, Math.max(4, seg - 2)); g.scale(1, sy, 1); g.translate(x, y, z); put(mat, g); };
  /** Merge everything collected so far into one mesh per material, added to `parent`. */
  const flush = (parent, name) => {
    for (const [mat, list] of acc) {
      const g = mergeGeometries(list, false); if (!g) continue;
      const me = new THREE.Mesh(g, mat); me.castShadow = !mat.transparent; me.receiveShadow = true; me.name = name; if (mat.transparent) me.renderOrder = 2; parent.add(me);
    }
    acc.clear();
  };
  return { put, box, face, fbox, panel, prism, bar, tube, cyl, sph, flush };
}
