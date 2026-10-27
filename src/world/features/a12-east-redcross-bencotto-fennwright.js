// Area a12-east-redcross-bencotto-fennwright: custom building features. Export functions keyed by the `t` name used in your FRONTAGES details.
// Signature: (K, it, ctx) where K is the frame object from frontage-details.js and ctx = { b, ring, pointInRing, sideFrame }.
//
// Hamilton Road, east side, between the Gainsborough Road corner and FennWright, from the Street View photos in
// docs/research/hamilton-road-streetview (f-british-red-cross-corner, f-salon26-sage-clinic-fairtrade, f-cafe-bencotto-fred-olsen,
// f-fred-olsen-recreate-fennwright, f-fennwright-spudhut-bakery-kings). Every dimension is an estimate scaled from the photos (a door,
// a window or a person for scale); nothing is surveyed.
//
// This part of Hamilton Road is pedestrianised, so the shared frame K may point at a back wall. Each feature therefore builds its own
// frames on the footprint edges (mkFrame): s runs along the wall to the viewer's right, d out from the wall, y up. Everything is drawn
// as coloured geometry laid over the plain brick base walls (windows: false); the roofs are drawn here too, clipped to the footprint,
// because the base roof code would put the ridges on the wrong axis. Shop boards are drawn here at 0.22-0.3 m out so they sit in front
// of the generic OSM-named boards from world/shopfronts.js (which hide behind them).
import * as THREE from 'three';
import { Geo } from '../seafront.js';
import { Textures } from '../textures.js';

const STONE = '#ddd3b8', WHITE = '#f4f2ec', PAINT = '#f3f0e6', BLACK = '#202226', GLASS = '#3b4a56', GLASSL = '#7f98a4';
const BRICK_A = '1.9,1.38,0.95', BRICK_B = '1.9,1.4,0.97', BRICK_FO = '1.9,1.5,1.0', BRICK_BUFF = '1.5,1.45,1.15'; // r,g,b multipliers on the brick texture (>1 brightens)

// ---------------------------------------------------------------- materials
const MC = new Map();
function mat(K, key) {
  let m = MC.get(key); if (m) return m;
  const [kind, a, b] = key.split('|');
  const std = (o) => new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.8, ...o });
  if (kind === 'g') m = std({ color: a, roughness: 0.12, metalness: 0.3 });
  else if (kind === 'm') m = std({ color: a, roughness: 0.4, metalness: 0.4 });
  else if (kind === 'b') { const c = new THREE.Color(); const q = a.split(',').map(Number); c.setRGB(q[0], q[1], q[2]); m = std({ map: K.m.brick.map, normalMap: K.m.brick.normalMap, color: c, roughness: 1 }); }
  else if (kind === 'r') { const t = Textures.roofTexture(a, 5); m = std({ map: t.map, normalMap: t.normalMap, roughnessMap: t.roughnessMap, roughness: 1, color: b || '#ffffff' }); }
  else m = std({ color: a });
  MC.set(key, m); return m;
}

// ---------------------------------------------------------------- frames
/** Frame on the footprint edge whose midpoint is nearest `at`: s along the wall (to the viewer's right), d out, y up from K.g. */
function mkFrame(K, ctx, at) {
  const R = ctx.ring, n = R.length; let best = null;
  for (let i = 0; i < n; i++) {
    const a = R[i], c = R[(i + 1) % n], L = Math.hypot(c[0] - a[0], c[1] - a[1]); if (L < 1.5) continue;
    const dd = Math.hypot((a[0] + c[0]) / 2 - at[0], (a[1] + c[1]) / 2 - at[1]);
    if (!best || dd < best.dd) best = { a, c, L, dd };
  }
  let { a, c } = best; const L = best.L;
  let ux = (c[0] - a[0]) / L, uz = (c[1] - a[1]) / L; const mx = (a[0] + c[0]) / 2, mz = (a[1] + c[1]) / 2;
  if (ctx.pointInRing(mx - uz * 0.4, mz + ux * 0.4, R)) { const t = a; a = c; c = t; ux = -ux; uz = -uz; } // make v = (-uz, ux) point out
  const vx = -uz, vz = ux, g = K.g, geos = new Map();
  const G = (key) => { let q = geos.get(key); if (!q) { q = new Geo(); geos.set(key, q); } return q; };
  const P = (s, d, y) => [a[0] + ux * s + vx * d, g + y, a[1] + uz * s + vz * d];
  const F = { L, P, G, ux, uz, vx, vz, a, g, K };
  /** box by extents */
  F.slab = (key, s0, s1, d0, d1, y0, y1) => { const p = P((s0 + s1) / 2, (d0 + d1) / 2, (y0 + y1) / 2); G(key).box(p[0], p[1], p[2], ux, uz, Math.abs(s1 - s0) / 2, Math.abs(y1 - y0) / 2, Math.abs(d1 - d0) / 2); };
  /** flat panel on the plane d. brick keys get tiled uv */
  F.quad = (key, s0, s1, y0, y1, d) => {
    const uv = key.startsWith('b|') ? [[s0 / 3.2, y0 / 2.9], [s1 / 3.2, y0 / 2.9], [s1 / 3.2, y1 / 2.9], [s0 / 3.2, y1 / 2.9]] : undefined;
    G(key).quad(P(s0, d, y0), P(s1, d, y0), P(s1, d, y1), P(s0, d, y1), uv);
  };
  /** convex polygon from [s,d,y] points (fan), brick uv from s,y */
  F.poly = (key, pts, uvf) => {
    const q = G(key), n0 = q.p.length / 3, brick = key.startsWith('b|');
    for (const [s, d, y] of pts) { q.p.push(...P(s, d, y)); const t = uvf ? uvf(s, d, y) : brick ? [s / 3.2, y / 2.9] : [0, 0]; q.uv.push(t[0], t[1]); }
    for (let i = 1; i + 1 < pts.length; i++) q.idx.push(n0, n0 + i, n0 + i + 1);
  };
  F.quad3 = (key, a3, b3, c3, d3) => G(key).quad(P(...a3), P(...b3), P(...c3), P(...d3));
  F.tri3 = (key, a3, b3, c3) => G(key).tri(P(...a3), P(...b3), P(...c3));
  /** half-ellipse (arch head) centred s, springing yc, d plane */
  F.arch = (key, s, yc, rx, ry, d, n = 12) => { const pts = []; for (let i = 0; i <= n; i++) { const t = Math.PI * i / n; pts.push([s + rx * Math.cos(t), d, yc + ry * Math.sin(t)]); } F.poly(key, pts); };
  /** voussoir ring alternating two keys */
  F.voussoirs = (s, yc, rx, ry, w, d, k1, k2, n = 13) => {
    for (let i = 0; i < n; i++) {
      const t0 = Math.PI * i / n, t1 = Math.PI * (i + 1) / n, key = i % 2 ? k2 : k1;
      F.quad3(key, [s + rx * Math.cos(t0), d, yc + ry * Math.sin(t0)], [s + rx * Math.cos(t1), d, yc + ry * Math.sin(t1)], [s + (rx + w) * Math.cos(t1), d, yc + (ry + w) * Math.sin(t1)], [s + (rx + w) * Math.cos(t0), d, yc + (ry + w) * Math.sin(t0)]);
    }
  };
  /** wall region below an arch head: strips from the arch curve up to yTop, between s-rx and s+rx */
  F.aboveArch = (key, s, yc, rx, ry, yTop, d, n = 12) => {
    for (let i = 0; i < n; i++) {
      const t0 = Math.PI * i / n, t1 = Math.PI * (i + 1) / n, x0 = s + rx * Math.cos(t0), x1 = s + rx * Math.cos(t1), y0 = yc + ry * Math.sin(t0), y1 = yc + ry * Math.sin(t1);
      F.poly(key, [[x0, d, y0], [x1, d, y1], [x1, d, yTop], [x0, d, yTop]]);
    }
  };
  /** sash window: frame, dark glass, glazing bars, optional sill, optional arched head, optional stone hood */
  F.sash = (s, y0, w, h, o = {}) => {
    const d = o.d ?? 0.04, fr = o.frame || WHITE, gl = o.glass || GLASS, ft = o.ft ?? 0.07, y1 = y0 + h;
    F.quad('c|' + fr, s - w / 2 - ft, s + w / 2 + ft, y0 - ft, y1 + ft, d);
    F.quad('g|' + gl, s - w / 2, s + w / 2, y0, y1, d + 0.02);
    const cols = o.cols ?? 2, rows = o.rows ?? 2;
    for (let i = 1; i < cols; i++) F.slab('c|' + fr, s - w / 2 + (w * i) / cols - 0.018, s - w / 2 + (w * i) / cols + 0.018, d + 0.02, d + 0.06, y0, y1);
    for (let i = 1; i < rows; i++) F.slab('c|' + fr, s - w / 2, s + w / 2, d + 0.02, d + 0.06, y0 + (h * i) / rows - 0.018, y0 + (h * i) / rows + 0.018);
    if (o.sill !== false) F.slab('c|' + (o.sillCol || STONE), s - w / 2 - 0.12, s + w / 2 + 0.12, d - 0.02, d + 0.14, y0 - ft - 0.07, y0 - ft);
    if (o.hood) F.slab('c|' + (o.hoodCol || STONE), s - w / 2 - 0.16, s + w / 2 + 0.16, d - 0.02, d + 0.1, y1 + ft, y1 + ft + 0.14);
  };
  F.done = (tint) => {
    for (const [key, q] of geos) { const m = q.mesh(mat(K, key)); if (m) { m.name = 'a12:' + key; K.extra.push(m); } }
    void tint;
  };
  return F;
}

// ---------------------------------------------------------------- lettered boards
const TEX = new Map();
/**
 * A lettered board: runs [{ t, c, w?, i? }] drawn centred on a coloured ground. o.bg, o.font ('sans'|'serif'), o.weight, o.draw(ctx,w,h) for extra paint.
 * Placed on plane d of frame F. Lettering is mirrored-safe: s runs to the viewer's right.
 */
function board(F, K, s0, s1, y0, y1, d, o) {
  if (o.edge !== false) F.slab('c|' + (o.edge || o.bg || '#ffffff'), s0, s1, d - 0.14, d - 0.01, y0, y1); // the board's body
  if (typeof document === 'undefined') return;
  const runs = o.runs || [{ t: o.text, c: o.fg || '#111' }];
  const key = JSON.stringify([runs, o.bg, o.font, o.weight, o.italic, o.sizeK, o.pad, o.drawKey, Math.round(((s1 - s0) / (y1 - y0)) * 4)]);
  let tex = TEX.get(key);
  if (!tex) {
    const cw = 1024, ch = Math.max(48, Math.min(512, Math.round(cw * (y1 - y0) / (s1 - s0)))), c = document.createElement('canvas'); c.width = cw; c.height = ch; const x = c.getContext('2d');
    if (o.bg) { x.fillStyle = o.bg; x.fillRect(0, 0, cw, ch); }
    if (o.draw) o.draw(x, cw, ch);
    const fam = o.font === 'serif' ? 'Georgia, "Times New Roman", serif' : o.font === 'script' ? '"Brush Script MT", "Segoe Script", cursive' : '"Helvetica Neue", Arial, sans-serif';
    let fs = Math.round(ch * (o.sizeK ?? 0.62));
    const setF = () => { x.font = `${o.italic ? 'italic ' : ''}${o.weight || 'bold'} ${fs}px ${fam}`; };
    setF(); const full = runs.map((r) => r.t).join(''); const avail = (o.avail ?? 0.94) * (cw - (o.pad ?? 0)); let tw = x.measureText(full).width;
    if (tw > avail) { fs = Math.floor((fs * avail) / tw); setF(); tw = x.measureText(full).width; }
    x.textBaseline = 'middle'; x.textAlign = 'left'; let px = (o.pad ?? 0) + (cw - (o.pad ?? 0) - tw) / 2;
    if (o.left != null) px = o.left * cw;
    for (const r of runs) { x.fillStyle = r.c; x.fillText(r.t, px, ch * 0.54); px += x.measureText(r.t).width; }
    tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; TEX.set(key, tex);
  }
  const A = F.P(s0, d, y0), B = F.P(s1, d, y0), C = F.P(s1, d, y1), D = F.P(s0, d, y1);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([...A, ...B, ...C, ...D], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2)); g.setIndex([0, 1, 2, 0, 2, 3]); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5, side: THREE.DoubleSide, transparent: !o.bg, depthWrite: !!o.bg, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  m.name = 'a12:board'; K.extra.push(m);
}

// ---------------------------------------------------------------- roofs
/**
 * A pitched roof clipped to the footprint. profile: [{t, y}] heights above the eaves at coordinate t (t is a linear function of x,z:
 * tf = [ax, az, k]); `clip` limits the roof to lo <= cf <= hi (cf = [ax, az, k]). Walls up to the roof are added where the roof meets a footprint edge
 * (gable ends). `key` is the roof material key, `wall` the key for the gable walls.
 */
function roof(F, ring, H, o) {
  const [tax, taz, tk] = o.tf, T = (p) => tax * p[0] + taz * p[1] + tk, prof = o.profile;
  const yAt = (t) => { if (t <= prof[0].t) return prof[0].y; for (let i = 1; i < prof.length; i++) if (t <= prof[i].t) { const a = prof[i - 1], b = prof[i]; return a.y + ((t - a.t) / (b.t - a.t || 1)) * (b.y - a.y); } return prof[prof.length - 1].y; };
  const clipHalf = (poly, fn) => { // keep fn >= 0
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i], q = poly[(i + 1) % poly.length], fp = fn(p), fq = fn(q);
      if (fp >= 0) out.push(p);
      if ((fp >= 0) !== (fq >= 0)) { const u = fp / (fp - fq); out.push([p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u]); }
    }
    return out;
  };
  let base = ring.map((p) => [p[0], p[1]]);
  if (o.clip) { const [cax, caz, ck] = o.clip.cf; if (o.clip.lo != null) base = clipHalf(base, (p) => cax * p[0] + caz * p[1] + ck - o.clip.lo); if (o.clip.hi != null) base = clipHalf(base, (p) => o.clip.hi - (cax * p[0] + caz * p[1] + ck)); }
  const rq = F.G(o.key), wq = F.G(o.wall), g = F.g; let cum = 0;
  const onSeg = (p, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz || 1; let u = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / L2; u = Math.max(0, Math.min(1, u)); return Math.hypot(a[0] + dx * u - p[0], a[1] + dz * u - p[1]) < 0.03; };
  for (let k = 0; k + 1 < prof.length; k++) {
    const a = prof[k], b = prof[k + 1]; let poly = clipHalf(base, (p) => T(p) - a.t); poly = clipHalf(poly, (p) => b.t - T(p));
    const len = Math.hypot(b.t - a.t, b.y - a.y);
    if (poly.length >= 3) {
      const n0 = rq.p.length / 3, V = poly.map((p) => { const t = T(p), y = yAt(t); return { x: p[0], z: p[1], y: g + H + y + (o.lift || 0), t }; });
      for (const v of V) { rq.p.push(v.x, v.y, v.z); const s = (v.x - F.a[0]) * F.ux + (v.z - F.a[1]) * F.uz; rq.uv.push(s / 2, (cum + (len > 0 ? (v.t - a.t) / (b.t - a.t || 1) * len : 0)) / 2); }
      for (let i = 1; i + 1 < V.length; i++) rq.idx.push(n0, n0 + i, n0 + i + 1);
      // gable walls where a roof polygon edge lies on a footprint edge
      for (let i = 0; i < V.length; i++) {
        const p = V[i], q = V[(i + 1) % V.length]; if (Math.hypot(p.x - q.x, p.z - q.z) < 0.05) continue;
        const hp = p.y - g - H - (o.lift || 0), hq = q.y - g - H - (o.lift || 0); if (hp < 0.03 && hq < 0.03) continue;
        for (let e = 0; e < ring.length; e++) {
          const ea = ring[e], eb = ring[(e + 1) % ring.length];
          if (onSeg([p.x, p.z], ea, eb) && onSeg([q.x, q.z], ea, eb)) {
            const m0 = wq.p.length / 3, wl = (v) => (v.x - ea[0]) * (eb[0] - ea[0]) / (Math.hypot(eb[0] - ea[0], eb[1] - ea[1]) * 3.2) + (v.z - ea[1]) * (eb[1] - ea[1]) / (Math.hypot(eb[0] - ea[0], eb[1] - ea[1]) * 3.2);
            wq.p.push(p.x, g + H - 0.05, p.z, q.x, g + H - 0.05, q.z, q.x, q.y, q.z, p.x, p.y, p.z);
            wq.uv.push(wl(p), 0, wl(q), 0, wl(q), (hq + 0.05) / 2.9, wl(p), (hp + 0.05) / 2.9); wq.idx.push(m0, m0 + 1, m0 + 2, m0, m0 + 2, m0 + 3); break;
          }
        }
      }
    }
    cum += len;
  }
}

// ---------------------------------------------------------------- bits
function chimney(F, s, d, hs, hd, y0, y1, pots = 2, brick = 'b|' + BRICK_A) {
  F.slab(brick, s - hs, s + hs, d - hd, d + hd, y0, y1); F.slab('c|' + STONE, s - hs - 0.07, s + hs + 0.07, d - hd - 0.07, d + hd + 0.07, y1, y1 + 0.12);
  for (let i = 0; i < pots; i++) { const ps = s - hs + ((2 * hs) * (i + 0.5)) / pots; F.slab('c|#b0623f', ps - 0.08, ps + 0.08, d - 0.08, d + 0.08, y1 + 0.12, y1 + 0.55); }
}

/** A dormer standing on a roof slope: front plane at depth df behind the wall, hood 'gable' | 'dome' | 'flat'. slope(t) = roof height above the eaves at depth t. */
function dormer(F, s, df, w, yb, yt, o) {
  const H0 = o.H || 0, hw = w / 2 + 0.12, ch = o.cheek || BLACK, face = o.face || BLACK, back = o.back ?? 2.4, hood = o.hood || 'gable', hoodCol = o.hoodCol || BLACK;
  const d0 = -df;
  F.quad('c|' + face, s - hw, s + hw, yb, yt, d0);
  F.sash(s, yb + 0.3, w * 0.62, yt - yb - 0.55, { d: d0 + 0.03, cols: 2, rows: 3, sill: false, ft: 0.06, frame: o.frame || WHITE });
  const sl = o.slope;
  for (const sg of [-1, 1]) { const sx = s + sg * hw; F.poly('c|' + ch, [[sx, d0, yb - 0.3], [sx, d0, yt], [sx, d0 - back, yt], [sx, d0 - back, sl(df + back) + H0]]); }
  if (hood === 'gable') {
    const apex = yt + 0.7;
    F.tri3('c|' + hoodCol, [s - hw - 0.08, d0 + 0.08, yt], [s + hw + 0.08, d0 + 0.08, yt], [s, d0 + 0.08, apex]);
    F.tri3('c|' + hoodCol, [s - hw - 0.08, d0 - back, yt], [s, d0 - back, apex], [s + hw + 0.08, d0 - back, yt]);
    F.quad3('c|' + hoodCol, [s - hw - 0.08, d0 + 0.08, yt], [s, d0 + 0.08, apex], [s, d0 - back, apex], [s - hw - 0.08, d0 - back, yt]);
    F.quad3('c|' + hoodCol, [s, d0 + 0.08, apex], [s + hw + 0.08, d0 + 0.08, yt], [s + hw + 0.08, d0 - back, yt], [s, d0 - back, apex]);
  } else if (hood === 'dome') {
    const n = 10, r = hw + 0.06, yc = yt;
    for (let i = 0; i < n; i++) {
      const t0 = Math.PI * i / n, t1 = Math.PI * (i + 1) / n, a0 = [s + r * Math.cos(t0), yc + r * 0.85 * Math.sin(t0)], a1 = [s + r * Math.cos(t1), yc + r * 0.85 * Math.sin(t1)];
      F.tri3('c|' + hoodCol, [s, d0 + 0.08, yc], [a0[0], d0 + 0.08, a0[1]], [a1[0], d0 + 0.08, a1[1]]);
      F.quad3('c|' + hoodCol, [a0[0], d0 + 0.08, a0[1]], [a1[0], d0 + 0.08, a1[1]], [a1[0], d0 - back, a1[1]], [a0[0], d0 - back, a0[1]]);
    }
  } else { // flat lean-to cap parallel to nothing: a thin slab
    F.slab('c|' + hoodCol, s - hw - 0.08, s + hw + 0.08, d0 - back, d0 + 0.1, yt, yt + 0.1);
  }
}

/** A pent-roof hood over a bay: front edge at depth dF, height y, rising to the wall by `rise`. */
function pent(F, key, sL, sR, dF, y, rise) {
  F.quad3(key, [sL, dF, y], [sR, dF, y], [sR, 0.0, y + rise], [sL, 0.0, y + rise]);
  F.tri3(key, [sL, 0.0, y], [sL, dF, y], [sL, 0.0, y + rise]); F.tri3(key, [sR, 0.0, y], [sR, dF, y], [sR, 0.0, y + rise]);
  F.slab(key, sL, sR, 0.0, dF, y - 0.12, y);
}

// ---------------------------------------------------------------- the features
export const FEATURES = {
  // ======================================================================== British Red Cross (732472271)
  a12RedCross(K, it, ctx) {
    const H = K.H, WH = '#f3f2ee';
    const RCRED = '#d8202f';
    const redCross = (x, cw, ch) => { // red cross emblem at left of the board
      const u = ch * 0.52, cx = cw * 0.075, cy = ch * 0.5; x.fillStyle = RCRED; x.fillRect(cx - u * 0.17, cy - u * 0.5, u * 0.34, u); x.fillRect(cx - u * 0.5, cy - u * 0.17, u, u * 0.34);
    };
    const runs = [{ t: 'British', c: '#2a2a2c' }, { t: 'Red', c: RCRED }, { t: 'Cross', c: '#2a2a2c' }];
    // one white shopfront run on a face from s0 to s1: render skin, glazing with mullions, fascia board, parapet
    const front = (F, s0, s1, o = {}) => {
      F.quad('c|' + WH, s0, s1, 0, H, 0.05);
      F.slab('c|#cfcdc6', s0, s1, 0, 0.2, 0, 0.45); // low plinth
      const doorAt = o.door;
      const gl0 = s0 + 0.3, gl1 = s1 - 0.3;
      F.quad('g|' + GLASSL, gl0, gl1, 0.5, 2.85, 0.16);
      F.quad('c|#3e3b36', gl0, gl1, 0.5, 1.6, 0.158); // dark display backing low down
      F.quad('g|' + GLASSL, gl0, gl1, 0.5, 2.85, 0.16);
      const pane = 1.35, n = Math.max(1, Math.round((gl1 - gl0) / pane));
      for (let i = 0; i <= n; i++) F.slab('c|' + WH, gl0 + ((gl1 - gl0) * i) / n - 0.045, gl0 + ((gl1 - gl0) * i) / n + 0.045, 0.1, 0.24, 0.45, 2.95);
      F.slab('c|' + WH, gl0, gl1, 0.1, 0.24, 2.1, 2.16); F.slab('c|' + WH, gl0, gl1, 0.1, 0.24, 0.45, 0.55);
      F.slab('c|' + WH, s0, s1, 0, 0.3, 2.9, 3.0);
      if (doorAt) { // double glazed door with white frames
        const [d0, d1] = doorAt; F.quad('g|#26323a', d0, d1, 0.05, 2.45, 0.18);
        F.slab('c|' + WH, d0 - 0.06, d0 + 0.04, 0.12, 0.26, 0, 2.5); F.slab('c|' + WH, d1 - 0.04, d1 + 0.06, 0.12, 0.26, 0, 2.5); F.slab('c|' + WH, (d0 + d1) / 2 - 0.04, (d0 + d1) / 2 + 0.04, 0.12, 0.26, 0, 2.5); F.slab('c|' + WH, d0, d1, 0.12, 0.26, 2.45, 2.55);
      }
      board(F, K, s0 + 0.15, s1 - 0.15, 3.0, 3.98, 0.28, { bg: '#ffffff', runs, font: 'sans', weight: 'bold', sizeK: 0.5, draw: redCross, drawKey: 'rc', pad: 0, edge: '#ffffff', pad: 150 });
      F.slab('c|' + WH, s0, s1, 0, 0.34, 3.98, 4.12);
    };
    // north face is on Gainsborough Road: white run at the west end only, brick beyond with two small windows
    const fG = mkFrame(K, ctx, [157.5, -612.5]), fC = mkFrame(K, ctx, [146.5, -614.5]), fW = mkFrame(K, ctx, [143.5, -609]);
    const wl = 9.2;
    front(fG, fG.L - wl, fG.L, {});
    fG.slab('c|#5b3d30', 0, fG.L - wl, -0.02, 0.2, H, H + 0.14);
    for (const s of [fG.L - wl - 2.2, fG.L - wl - 3.8]) fG.sash(s, 2.0, 1.1, 0.55, { cols: 3, rows: 1, d: 0.03, sill: false });
    fG.quad('c|#d6d3cb', fG.L - wl - 6.8, fG.L - wl - 5.9, 1.3, 2.0, 0.04); // small notice panel
    front(fC, 0, fC.L, { door: [fC.L / 2 - 1.0, fC.L / 2 + 1.0] });
    front(fW, 0, fW.L, {});
    fW.slab('c|#5b3d30', 0, fW.L, -0.02, 0.2, H, H + 0.14);
    for (const f of [fG, fC, fW]) f.done();
  },

  // ======================================================================== three-storey block (732472270): Salon Twenty6, florist, Sage Clinic, Fair Trade Shop
  a12ThreeStorey(K, it, ctx) {
    const F = mkFrame(K, ctx, [142, -599]), L = F.L, H = K.H, k = L / 15.9, sc = (m) => m * k;
    const ring = ctx.ring, B = 'b|' + BRICK_A, BLK = BLACK;
    const sA = { salon: [0, sc(4.6)], flowers: [sc(5.2), sc(9.6)], door: [sc(9.7), sc(10.4)], sage: [sc(10.5), sc(13.6)], fair: [sc(13.6), L] };
    // ---- roof (clay tile): short steep west slope to a ridge 4.6 m back, long shallow slope behind, gables north and south
    const rise = 3.9, ridgeT = 4.6, tf = [-F.vx, -F.vz, -(F.a[0] * -F.vx + F.a[1] * -F.vz)]; // t = depth behind the wall line
    let tmax = 0; for (const p of ring) tmax = Math.max(tmax, tf[0] * p[0] + tf[1] * p[1] + tf[2]);
    roof(F, ring, H, { key: 'r|clay|#d9a690', wall: B, tf, profile: [{ t: 0, y: 0 }, { t: ridgeT, y: rise }, { t: tmax, y: 0.6 }] });
    const slope = (t) => (t <= ridgeT ? (rise * t) / ridgeT : rise);
    // black eaves board and gutter
    F.slab('c|#25282b', 0, L, -0.02, 0.38, H - 0.34, H + 0.04);
    // ---- stone piers
    const pier = (s, hgt) => { F.slab('c|' + STONE, s - 0.25, s + 0.25, -0.02, 0.2, 0, hgt); F.slab('c|#cfc4a4', s - 0.31, s + 0.31, -0.04, 0.26, hgt, hgt + 0.15); for (let y = 0.7; y < hgt; y += 0.55) F.slab('c|#c7bc9c', s - 0.27, s + 0.27, -0.03, 0.22, y, y + 0.04); };
    pier(sc(5.0), H + 1.1); pier(L - 0.3, H + 0.2);
    // ---- first-floor oriels and the arched window; second-floor dormers
    const oriel = (s, w) => {
      const dp = 0.72, a = 0.42, y0 = 4.15, y1 = 6.55, pts = [[s - w / 2 - a, 0.02], [s - w / 2, dp], [s + w / 2, dp], [s + w / 2 + a, 0.02]];
      for (let i = 0; i < 3; i++) {
        const [sa, da] = pts[i], [sb, db] = pts[i + 1];
        F.quad3('c|' + WHITE, [sa, da, y0 + 0.25], [sb, db, y0 + 0.25], [sb, db, y1], [sa, da, y1]);
        const e = 0.1, m0 = (sb - sa), m1 = (db - da), ln = Math.hypot(m0, m1) || 1;
        const gs = [sa + (m0 / ln) * e, da + (m1 / ln) * e], ge = [sb - (m0 / ln) * e, db - (m1 / ln) * e];
        F.quad3('g|' + GLASSL, [gs[0], gs[1] + 0.02, y0 + 0.4], [ge[0], ge[1] + 0.02, y0 + 0.4], [ge[0], ge[1] + 0.02, y1 - 0.2], [gs[0], gs[1] + 0.02, y1 - 0.2]);
        F.quad3('c|' + WHITE, [(gs[0] + ge[0]) / 2 - 0.02, (gs[1] + ge[1]) / 2 + 0.03, y0 + 0.4], [(gs[0] + ge[0]) / 2 + 0.02, (gs[1] + ge[1]) / 2 + 0.03, y0 + 0.4], [(gs[0] + ge[0]) / 2 + 0.02, (gs[1] + ge[1]) / 2 + 0.03, y1 - 0.2], [(gs[0] + ge[0]) / 2 - 0.02, (gs[1] + ge[1]) / 2 + 0.03, y1 - 0.2]);
        F.quad3('c|' + WHITE, [gs[0], gs[1] + 0.03, y0 + 1.5], [ge[0], ge[1] + 0.03, y0 + 1.5], [ge[0], ge[1] + 0.03, y0 + 1.55], [gs[0], gs[1] + 0.03, y0 + 1.55]);
      }
      // curved white underside (corbel) and the black hood above
      F.poly('c|' + WHITE, [[s - w / 2 - a, 0.02, y0 + 0.25], [s - w / 2, dp, y0 + 0.25], [s + w / 2, dp, y0 + 0.25], [s + w / 2 + a, 0.02, y0 + 0.25], [s, 0.02, y0 - 0.2]]);
      F.poly('c|' + WHITE, [[s - w / 2, dp, y0 + 0.25], [s + w / 2, dp, y0 + 0.25], [s, dp - 0.1, y0 - 0.25]]);
      pent(F, 'c|#2a2d31', s - w / 2 - a - 0.06, s + w / 2 + a + 0.06, dp + 0.1, y1, 0.5);
    };
    oriel(sc(7.3), 1.45); oriel(sc(12.9), 1.75);
    // arched first-floor window with a brick hood moulding
    const sw = sc(9.9);
    F.sash(sw, 4.3, 0.78, 1.4, { cols: 2, rows: 3, d: 0.04, sill: true });
    F.arch('g|' + GLASS, sw, 5.7, 0.39, 0.38, 0.06); F.arch('c|' + WHITE, sw, 5.7, 0.46, 0.45, 0.045);
    F.voussoirs(sw, 5.7, 0.5, 0.5, 0.2, 0.05, 'c|#c98f6c', 'c|#d8ae8d', 11);
    F.slab('c|#d8ae8d', sw - 0.62, sw + 0.62, 0.0, 0.1, 5.72, 5.8);
    // dormers: gabled, domed, gabled (wall dormers standing on the eaves line)
    dormer(F, sc(7.3) - 0.05, 0.1, 1.15, H + 0.02, H + 1.6, { slope, H, hood: 'gable', back: 2.6 });
    dormer(F, sc(9.9) + 0.15, 0.1, 1.15, H + 0.02, H + 1.6, { slope, H, hood: 'dome', back: 2.6 });
    dormer(F, sc(12.9) - 0.1, 0.1, 1.15, H + 0.02, H + 1.6, { slope, H, hood: 'gable', back: 2.6 });
    // chimneys: one on the north gable ridge, a taller pair of pots near the south end
    chimney(F, 1.2, -ridgeT - 0.2, 0.42, 0.3, H + rise - 0.6, H + rise + 1.9, 2, B);
    chimney(F, sc(11.5), -ridgeT + 0.4, 0.42, 0.3, H + rise - 0.5, H + rise + 1.5, 4, B);
    // ---- ground floor shop units (everything is laid at d >= 0.16 so it hides the generated name boards)
    const SH = 3.0;
    F.slab('c|' + STONE, 0, L, -0.03, 0.12, SH + 0.95, SH + 1.0); // string course above the fascia boards
    // Salon Twenty6: the single-storey sage-green unit (flat roof to 4.15 m), sash window and pale door
    {
      const [a, b] = sA.salon, sage = '#a8b99f', sageD = '#8ea585';
      F.slab('c|' + sage, a, b, -0.02, 0.3, 0, 4.15); F.slab('c|#7d9475', a - 0.02, b + 0.02, -0.04, 0.34, 4.15, 4.3);
      F.quad('g|#3a4549', a + 0.35, b - 1.35, 0.55, 2.7, 0.33); F.slab('c|#5b6f55', a + 0.28, b - 1.28, 0.3, 0.38, 0.45, 0.55);
      F.quad('g|#2c3338', b - 1.1, b - 0.35, 0.1, 2.55, 0.33); F.slab('c|' + sageD, b - 1.2, b - 1.1, 0.3, 0.38, 0, 2.6); F.slab('c|' + sageD, b - 0.35, b - 0.25, 0.3, 0.38, 0, 2.6);
      board(F, K, a + 0.2, b - 0.2, 3.1, 3.9, 0.36, { bg: '#b9c7af', edge: sage, runs: [{ t: 'SALON TWENTY6', c: '#f4f7f0' }], font: 'sans', weight: 'regular', sizeK: 0.36, draw: (x, cw, ch) => { x.fillStyle = '#6f9a62'; x.fillRect(cw * 0.13, ch * 0.12, cw * 0.74, ch * 0.76); } });
      F.slab('c|#c9d3c1', a, b, -0.02, 0.2, 0, 0.5);
    }
    // florist: dark green fascia, big shop window full of flowers, white frames
    {
      const [a, b] = sA.flowers;
      F.slab('c|' + WHITE, a, b, -0.02, 0.26, 0, SH + 0.95); F.slab('c|#2a2e2c', a + 0.1, b - 0.1, 0.0, 0.3, 0, 0.5);
      F.quad('g|#47583f', a + 0.45, b - 0.3, 0.5, 2.85, 0.33); F.slab('c|' + WHITE, a + 0.4, b - 0.25, 0.3, 0.38, 2.82, 2.9);
      for (let i = 0; i < 4; i++) { const sx = a + 0.45 + ((b - a - 0.75) * (i + 0.5)) / 4; F.slab('c|#d7b6c7', sx - 0.18, sx + 0.18, 0.3, 0.45, 0.6, 1.2); F.slab('c|#8d3d4f', sx - 0.12, sx + 0.12, 0.3, 0.42, 1.3, 1.9); }
      F.quad('g|#26302c', a + 0.05, a + 0.4, 0.05, 2.4, 0.3);
      board(F, K, a + 0.15, b - 0.1, 3.0, 3.9, 0.36, { bg: '#2f4a37', edge: '#2f4a37', runs: [{ t: 'FLOWERS', c: '#eef0e6' }], font: 'serif', sizeK: 0.5 });
    }
    // flats door between: black door under a fanlight
    { const [a, b] = sA.door; F.slab('c|' + WHITE, a, b, -0.02, 0.24, 0, SH + 0.95); F.quad('c|#16181b', a + 0.07, b - 0.07, 0.05, 2.5, 0.28); F.arch('g|#2d3338', (a + b) / 2, 2.5, (b - a) / 2 - 0.07, 0.25, 0.28); }
    // The Sage Clinic and the Fair Trade Shop: white painted frontages, black plinth, big glazed windows
    for (const [nm, [a, b], bg, edge, runs, font] of [
      ['sage', sA.sage, '#6aa04a', '#6aa04a', [{ t: 'THE SAGE CLINIC', c: '#ffffff' }], 'sans'],
      ['fair', sA.fair, '#f3f2e8', '#f3f2e8', [{ t: 'The Fair Trade Shop', c: '#2f7a43' }], 'sans'],
    ]) {
      F.slab('c|' + WHITE, a, b, -0.02, 0.26, 0.45, SH + 0.95); F.slab('c|#1b1c1f', a, b, -0.02, 0.3, 0, 0.45);
      F.quad('g|#6e8590', a + 0.3, b - 0.3, 0.6, 2.85, 0.33);
      const n = Math.max(2, Math.round((b - a - 0.6) / 1.1)); for (let i = 0; i <= n; i++) { const sx = a + 0.3 + ((b - a - 0.6) * i) / n; F.slab('c|' + WHITE, sx - 0.04, sx + 0.04, 0.3, 0.4, 0.55, 2.9); }
      F.slab('c|' + WHITE, a + 0.3, b - 0.3, 0.3, 0.4, 2.82, 2.9);
      if (nm === 'sage') F.quad('c|#cfe0c4', a + 0.5, a + 1.5, 0.9, 2.3, 0.36); // the tall poster in the window
      board(F, K, a + 0.1, b - 0.1, 3.0, 3.75, 0.36, { bg, edge, runs, font, sizeK: nm === 'sage' ? 0.46 : 0.5 });
    }
    // ---- the ghost sign on the north gable end (K. ANDREWS DECORATOR), above the Red Cross roof
    {
      const N = mkFrame(K, ctx, [151.5, -602.5]);
      if (typeof document !== 'undefined') {
        const s0 = 5.5, s1 = Math.min(N.L - 1.5, 14.5);
        board(N, K, s0, s1, 7.35, 8.75, 0.04, { bg: null, edge: false, runs: [{ t: 'K. ANDREWS', c: 'rgba(235,221,196,0.78)' }], font: 'serif', sizeK: 0.5, drawKey: 'ghost' });
        board(N, K, s0 + 1.2, s1 - 1.2, 6.55, 7.25, 0.045, { bg: null, edge: false, runs: [{ t: 'DECORATOR', c: 'rgba(235,221,196,0.7)' }], font: 'serif', sizeK: 0.55, drawKey: 'ghost2' });
      }
      N.done();
    }
    F.done();
  },

  // ======================================================================== Cafe Bencotto (732472269)
  a12Bencotto(K, it, ctx) {
    const F = mkFrame(K, ctx, [139.5, -588]), L = F.L, H = K.H, ring = ctx.ring, B = 'b|' + BRICK_B;
    const wing = 2.5, g0 = wing, g1 = L, gm = (g0 + g1) / 2, apex = H + 2.45;
    const cs = [4.4, 8.2], cw = 3.0; // arched ground-floor windows
    // ---- roofs: clay tile gable roof over the main block (ridge towards the back), lean-to over the north wing
    const sT = [F.ux, F.uz, -(F.a[0] * F.ux + F.a[1] * F.uz)], dT = [-F.vx, -F.vz, -(F.a[0] * -F.vx + F.a[1] * -F.vz)];
    roof(F, ring, H, { key: 'r|clay|#d49a82', wall: B, tf: sT, clip: { cf: sT, lo: g0 - 0.01 }, profile: [{ t: g0, y: 0 }, { t: gm, y: apex - H - 0.05 }, { t: g1 + 0.2, y: 0 }] });
    let tmax = 0; for (const p of ring) tmax = Math.max(tmax, dT[0] * p[0] + dT[1] * p[1] + dT[2]);
    roof(F, ring, H, { key: 'r|slate|#d0d0d0', wall: B, tf: dT, clip: { cf: sT, hi: g0 + 0.01 }, profile: [{ t: 0, y: 0 }, { t: 2.8, y: 1.0 }, { t: tmax, y: 1.2 }], lift: 0.02 });
    // ---- the shaped gable on the front: pitched sides with scrolled shoulders, stone coping, central pedestal and a segmental finial
    const gh = apex - H;
    F.poly(B, [[g0, 0.02, H - 0.05], [g1, 0.02, H - 0.05], [g1, 0.02, H + 0.25], [gm, 0.02, apex], [g0, 0.02, H + 0.25]]);
    const cop = (sa, ya, sb, yb) => { const ln = Math.hypot(sb - sa, yb - ya), n = 1; void n; F.quad3('c|' + STONE, [sa, -0.02, ya - 0.1], [sb, -0.02, yb - 0.1], [sb, 0.18, yb + 0.06], [sa, 0.18, ya + 0.06]); void ln; };
    cop(g0 - 0.12, H + 0.15, gm - 0.35, apex - 0.05); cop(gm + 0.35, apex - 0.05, g1 + 0.12, H + 0.15);
    for (const sg of [0, 1]) { // shoulder scrolls
      const s = sg ? g1 : g0, dir = sg ? 1 : -1;
      F.poly('c|' + STONE, [[s + dir * 0.35, -0.02, H - 0.2], [s - dir * 0.2, -0.02, H - 0.2], [s - dir * 0.15, -0.02, H + 0.5], [s + dir * 0.05, -0.02, H + 0.62], [s + dir * 0.4, -0.02, H + 0.3]]);
    }
    F.slab('c|' + STONE, gm - 0.5, gm + 0.5, -0.05, 0.22, apex - 0.1, apex + 0.45); F.arch('c|' + STONE, gm, apex + 0.45, 0.5, 0.45, 0.2, 10); F.slab('c|' + STONE, gm - 0.58, gm + 0.58, -0.07, 0.24, apex + 0.45, apex + 0.52);
    F.slab('c|#33282a', gm - 0.2, gm - 0.12, -0.0, 0.06, apex - 1.25, apex - 0.6); F.slab('c|#33282a', gm + 0.1, gm + 0.18, -0.0, 0.06, apex - 1.25, apex - 0.6); // vent slots
    F.slab('c|' + STONE, g0, g1, -0.03, 0.14, 4.55, 4.78); // first-floor string course (stone)
    F.slab('c|' + STONE, 0, g0, -0.03, 0.14, 4.55, 4.78);
    F.slab('c|' + STONE, 0, L, -0.04, 0.3, H - 0.2, H + 0.05); // eaves cornice
    // ---- first floor: two sashes with stone cartouche hoods in the gable block, one sash over the wing door
    for (const s of [4.7, 7.5]) { F.sash(s, 5.0, 1.05, 1.6, { cols: 2, rows: 3, d: 0.05, hood: true, hoodCol: STONE }); F.slab('c|' + STONE, s - 0.5, s + 0.5, -0.0, 0.1, 6.9, 7.0); F.arch('c|' + STONE, s, 6.99, 0.42, 0.18, 0.08, 8); F.slab('c|#c9bd9b', s - 0.14, s + 0.14, 0.05, 0.14, 7.0, 7.32); }
    F.sash(1.3, 4.9, 0.9, 1.4, { cols: 2, rows: 3, d: 0.05, hood: true });
    // ---- ground floor: brick shell with the two great arched windows (banded voussoirs), plus the wing's arched door
    const SH = 4.55, sh = 0.22, yS = 2.2, rx = cw / 2 - 0.1, ry = 1.4;
    // piers and wall between/around the openings (the openings themselves are glazed behind the shell)
    const edges = [0, cs[0] - rx, cs[0] + rx, cs[1] - rx, cs[1] + rx, g1];
    F.quad(B, 0, 0.65, 0, SH, sh); // wing, left of the door
    F.quad(B, edges[0] + 2.0, edges[1], 0, SH, sh); // between the door and the first arch
    F.quad(B, edges[2], edges[3], 0, SH, sh);       // pier between the arches
    F.quad(B, edges[4], edges[5], 0, SH, sh);       // right of the second arch
    for (const s of cs) { F.aboveArch(B, s, yS, rx, ry, SH, sh); F.quad(B, s - rx, s + rx, 0, 0.0, sh); }
    for (const s of cs) {
      F.quad('b|' + BRICK_B, s - rx, s + rx, 0, 0.55, sh); // brick stall riser
      F.quad('g|#2e3b44', s - rx, s + rx, 0.55, yS, 0.15); F.arch('c|#8f9b95', s, yS, rx, ry, 0.15); // glazing + the grey-green lunette board
      F.slab('c|' + WHITE, s - rx, s + rx, 0.16, 0.26, 0.5, 0.58); F.slab('c|' + WHITE, s - rx, s + rx, 0.16, 0.26, yS - 0.05, yS + 0.02);
      F.slab('c|' + WHITE, s - 0.03, s + 0.03, 0.16, 0.26, 0.55, yS); F.slab('c|' + WHITE, s - rx - 0.04, s - rx + 0.02, 0.16, 0.26, 0.5, yS); F.slab('c|' + WHITE, s + rx - 0.02, s + rx + 0.04, 0.16, 0.26, 0.5, yS);
      F.voussoirs(s, yS, rx, ry, 0.3, sh + 0.02, 'c|#e3d9bd', 'c|#b7452e', 15);
      for (const sg of [-1, 1]) F.slab('c|' + STONE, s + sg * (rx + 0.15) - 0.17, s + sg * (rx + 0.15) + 0.17, 0.0, 0.3, 1.0, yS); // stone jambs
    }
    // lettering in the lunettes
    board(F, K, cs[0] - 1.05, cs[0] + 1.05, 2.45, 3.05, 0.17, { bg: '#8f9b95', edge: '#8f9b95', runs: [{ t: 'PIZZA   PASTA', c: '#262a2c' }], font: 'serif', sizeK: 0.55 });
    board(F, K, cs[1] - 1.05, cs[1] + 1.05, 2.45, 3.05, 0.17, { bg: '#8f9b95', edge: '#8f9b95', runs: [{ t: 'MEDITERRANEAN', c: '#262a2c' }], font: 'serif', sizeK: 0.55 });
    // wing: arched door (dark green) with banded voussoirs, set in a recess
    { const s = 1.3, r = 0.62; F.quad('c|#3f5148', s - r, s + r, 0.0, 1.95, 0.2); F.arch('c|#3f5148', s, 1.95, r, 0.55, 0.2); F.quad(B, 0.65, s - r, 0, SH, sh); F.aboveArch(B, s, 1.95, r, 0.55, SH, sh); F.voussoirs(s, 1.95, r, 0.55, 0.22, sh + 0.02, 'c|#e3d9bd', 'c|#b7452e', 11); F.quad(B, s + r, 2.0, 0, SH, sh); }
    F.slab('c|#c9bd9b', 0.1, 0.55, 0.2, 0.3, 1.2, 1.6); // little brass plaque panel
    // green windbreak banners on the pavement (Pizza, Pasta & Mediterranean)
    for (const [a, b] of [[3.2, 5.8], [6.1, 9.2]]) board(F, K, a, b, 0.25, 1.05, 1.5, { bg: '#78a04a', edge: '#78a04a', runs: [{ t: 'Pizza, Pasta & Mediterranean', c: '#ffffff' }], font: 'sans', sizeK: 0.4, weight: 'bold' });
    chimney(F, g0 + 0.6, -3.0, 0.4, 0.3, H, apex + 0.9, 2, B);
    F.done();
  },

  // ======================================================================== Fred Olsen Travel (732472268)
  a12FredOlsen(K, it, ctx) {
    const F = mkFrame(K, ctx, [137, -578.5]), L = F.L, H = K.H, ring = ctx.ring, B = 'b|' + BRICK_FO;
    const dT = [-F.vx, -F.vz, -(F.a[0] * -F.vx + F.a[1] * -F.vz)];
    let tmax = 0; for (const p of ring) tmax = Math.max(tmax, dT[0] * p[0] + dT[1] * p[1] + dT[2]);
    // slate mansard: steep lower slope, shallow top
    roof(F, ring, H, { key: 'r|slate|#9aa0a8', wall: B, tf: dT, profile: [{ t: 0, y: 0 }, { t: 0.75, y: 1.95 }, { t: tmax / 2, y: 2.55 }, { t: tmax - 0.75, y: 1.95 }, { t: tmax, y: 0 }] });
    const slope = (t) => (t < 0.75 ? (1.95 * t) / 0.75 : 1.95 + ((t - 0.75) * 0.6) / (tmax / 2 - 0.75));
    F.slab('c|#4a4d52', 0, L, -0.04, 0.16, H - 0.05, H + 0.1); // dark eaves line
    F.slab('c|#8c3a24', 0, L, -0.0, 0.12, H - 0.45, H - 0.05); // brick corbel band
    // ---- three dormers on the mansard, white UPVC
    for (const s of [1.2, 3.5, 7.1]) {
      dormer(F, s, 0.25, 1.2, H + 0.45, H + 2.15, { slope, H, hood: 'flat', face: WHITE, cheek: WHITE, hoodCol: '#4a4d52', back: 0.9, frame: WHITE });
      F.quad('g|' + GLASS, s - 0.5, s + 0.5, H + 0.7, H + 1.9, -0.22); F.quad('g|' + GLASS, s - 0.52, s + 0.52, H + 0.66, H + 1.94, -0.26);
      F.quad('c|#d9dbd8', s - 0.45, s + 0.45, H + 0.9, H + 1.7, -0.19); // venetian blind
    }
    // ---- first-floor windows: white-framed, projecting top-hung lights, no sills
    for (const s of [1.2, 3.5, 7.1]) { F.sash(s, 4.1, 1.3, 1.5, { cols: 1, rows: 2, d: 0.04, sill: false, ft: 0.08, glass: '#46525c' }); F.quad('c|#d8dad6', s - 0.62, s + 0.62, 4.5, 5.45, 0.07); }
    // ---- ground floor: buff brick, blue fascia, shop window with posters, white double door
    F.quad('b|' + BRICK_BUFF, 0, L, 0, 3.55, 0.2);
    F.slab('c|#b9a37a', 0, L, -0.02, 0.26, 3.55, 3.65); // buff brick band under the first-floor brick
    F.quad('g|#7a8f9c', 0.5, 5.8, 0.6, 2.85, 0.25);
    F.quad('c|#ffffff', 0.45, 5.85, 0.5, 0.62, 0.31);
    for (const x of [0.45, 1.8, 3.15, 4.5, 5.85]) F.slab('c|' + WHITE, x - 0.05, x + 0.05, 0.14, 0.34, 0.5, 2.95);
    F.slab('c|' + WHITE, 0.4, 5.9, 0.14, 0.34, 2.88, 2.98); F.slab('c|' + WHITE, 0.4, 5.9, 0.14, 0.34, 0.5, 0.6);
    for (let i = 0; i < 4; i++) { const a = 0.7 + i * 1.3; F.quad(i % 2 ? 'c|#3f8fc4' : 'c|#e4ecf3', a, a + 1.0, 0.8, 2.6, 0.27); F.quad(i % 2 ? 'c|#f1f6fa' : 'c|#2a62b9', a + 0.12, a + 0.88, 1.7, 2.45, 0.28); }
    // door: white frame, rounded-top glazed leaves
    F.quad('c|#16181b', 6.3, 8.15, 0.1, 2.5, 0.26);
    F.slab('c|' + WHITE, 6.15, 6.35, 0.14, 0.36, 0, 2.65); F.slab('c|' + WHITE, 8.1, 8.3, 0.14, 0.36, 0, 2.65); F.slab('c|' + WHITE, 6.15, 8.3, 0.14, 0.36, 2.55, 2.7);
    for (const [a, b] of [[6.4, 7.18], [7.28, 8.05]]) { F.quad('g|#33414a', a, b, 0.25, 1.9, 0.3); F.arch('g|#33414a', (a + b) / 2, 1.9, (b - a) / 2, 0.3, 0.3); F.slab('c|' + WHITE, a - 0.04, a + 0.04, 0.28, 0.36, 0.1, 2.3); }
    F.quad('c|#d4d6d3', 8.35, 8.95, 1.8, 2.2, 0.3); // 'I.S. FORWARDING' plaque
    board(F, K, 8.45, 8.85, 2.4, 3.4, 0.3, { bg: '#1c4ec0', edge: '#1c4ec0', runs: [{ t: 'T', c: '#ffffff' }], font: 'sans', sizeK: 0.6 });
    board(F, K, 0.25, 6.0, 3.0, 3.9, 0.34, {
      bg: '#1756c9', edge: '#1756c9', runs: [{ t: 'Fred. Olsen ', c: '#ffffff' }, { t: 'Travel Agents', c: '#ffffff' }], font: 'sans', sizeK: 0.5, weight: 'bold', avail: 0.62,
      draw: (x, cw, ch) => { for (const [i, c] of ['#e87b36', '#7fb7d6', '#d6402e', '#3a9ec2'].entries()) { x.fillStyle = c; x.beginPath(); x.arc(cw * (0.69 + i * 0.075), ch * 0.5, ch * 0.34, 0, Math.PI * 2); x.fill(); } },
      left: 0.04,
    });
    F.done();
  },

  // ======================================================================== Re-Create Discovery (732472267)
  a12Recreate(K, it, ctx) {
    const F = mkFrame(K, ctx, [135.5, -570]), L = F.L, H = K.H, P = PAINT;
    // white painted render over the whole front, stepped parapet, cornice, string course
    F.quad('c|' + P, 0, L, 0, H, 0.06);
    F.slab('c|' + P, 0, L, -0.03, 0.3, H - 0.3, H + 0.08); F.slab('c|#e7e3d5', 0, L, -0.02, 0.34, H - 0.34, H - 0.28);
    F.slab('c|' + P, 1.0, 2.9, -0.0, 0.14, H + 0.08, H + 0.45); F.slab('c|' + P, L - 2.2, L - 0.9, -0.0, 0.14, H + 0.08, H + 0.4); // raised parapet panels
    F.slab('c|' + P, -0.0, 0.5, -0.03, 0.2, 0, H); F.slab('c|' + P, L - 0.5, L, -0.03, 0.2, 0, H); // pilasters at the party walls
    F.slab('c|#e7e3d5', 0, L, -0.03, 0.2, 3.95, 4.05);
    for (const s of [1.6, 3.8, 5.9]) { F.sash(s, 4.2, 0.95, 1.35, { cols: 2, rows: 3, d: 0.08, frame: WHITE, sillCol: '#ece8da' }); F.slab('c|#e7e3d5', s - 0.62, s + 0.62, 0.05, 0.14, 5.65, 5.78); F.slab('c|#e7e3d5', s - 0.6, s - 0.5, 0.05, 0.14, 4.1, 5.65); F.slab('c|#e7e3d5', s + 0.5, s + 0.6, 0.05, 0.14, 4.1, 5.65); }
    // shopfront: pale fascia board, teal-green pilasters and window frames, central door, low stall risers
    const TEAL = '#35796c';
    F.slab('c|' + TEAL, 0.5, L - 0.5, 0.0, 0.3, 0, 0.55);
    F.quad('g|#4b5f69', 0.7, 3.5, 0.55, 2.85, 0.2); F.quad('g|#4b5f69', 4.9, L - 0.7, 0.55, 2.85, 0.2);
    for (const x of [0.65, 3.55, 3.7, 4.75, 4.9, L - 0.65]) F.slab('c|' + TEAL, x - 0.05, x + 0.05, 0.14, 0.3, 0.5, 2.95);
    F.slab('c|' + TEAL, 0.6, 3.6, 0.14, 0.3, 2.88, 2.98); F.slab('c|' + TEAL, 4.8, L - 0.6, 0.14, 0.3, 2.88, 2.98);
    F.quad('c|#2f7d6b', 3.7, 4.8, 0.05, 2.75, 0.22); F.quad('g|#31453f', 3.85, 4.65, 0.55, 2.6, 0.25);
    F.quad('c|#e8e0c8', 0.8, 1.6, 0.9, 2.3, 0.24); F.quad('c|#d9a35a', 5.2, 6.1, 1.0, 2.2, 0.24); F.quad('c|#8fc1c7', 6.3, 7.2, 0.8, 2.0, 0.24); // window displays
    board(F, K, 0.2, L - 0.2, 3.0, 3.95, 0.34, {
      bg: '#fbf9f2', edge: '#fbf9f2', runs: [{ t: 'Re-Create', c: '#3f8fb1' }, { t: ' ', c: '#000' }, { t: 'Discovery', c: '#d3a553' }], font: 'script', weight: 'bold', italic: false, sizeK: 0.66, avail: 0.74, left: 0.08,
      draw: (x, cw, ch) => { x.strokeStyle = '#3f8fb1'; x.lineWidth = ch * 0.07; x.beginPath(); x.arc(cw * 0.465, ch * 0.5, ch * 0.3, 0.3, Math.PI * 1.75); x.stroke(); x.strokeStyle = '#e1b457'; x.beginPath(); x.arc(cw * 0.465, ch * 0.5, ch * 0.17, 3.4, Math.PI * 2.2); x.stroke(); },
    });
    // chimney stack behind the parapet
    chimney(F, 3.9, -2.6, 0.5, 0.35, H, H + 2.3, 5, 'b|' + BRICK_A);
    F.done();
  },

  // ======================================================================== FennWright (732472265)
  a12FennWright(K, it, ctx) {
    const F = mkFrame(K, ctx, [134.5, -563]), L = F.L, H = K.H, ring = ctx.ring, B = 'b|' + BRICK_A, sm = L / 2;
    // ---- brick parapet in a shallow segmental curve with white coping
    const crest = 1.25, n = 14; let prev = null;
    const yAt = (s) => H + crest * (1 - Math.pow((s - sm) / sm, 2));
    for (let i = 0; i <= n; i++) {
      const s = (L * i) / n, y = yAt(s);
      if (prev) { F.poly(B, [[prev.s, 0.0, H - 0.05], [s, 0.0, H - 0.05], [s, 0.0, y], [prev.s, 0.0, prev.y]]); F.quad3('c|' + WHITE, [prev.s - 0.02, -0.03, prev.y - 0.06], [s + 0.02, -0.03, y - 0.06], [s + 0.02, 0.2, y + 0.06], [prev.s - 0.02, 0.2, prev.y + 0.06]); }
      prev = { s, y };
    }
    F.slab('c|' + WHITE, 0, L, -0.03, 0.26, H - 0.45, H - 0.3); // string under the parapet
    for (const s of [0.05, L - 0.05]) F.poly('c|' + WHITE, [[s - 0.18, -0.03, H - 0.3], [s + 0.18, -0.03, H - 0.3], [s + 0.15, -0.03, H + 0.35], [s, -0.03, H + 0.5], [s - 0.15, -0.03, H + 0.35]]); // little scrolls
    // roof behind: pitched slate, ridge along the street
    const dT = [-F.vx, -F.vz, -(F.a[0] * -F.vx + F.a[1] * -F.vz)]; let tmax = 0; for (const p of ring) tmax = Math.max(tmax, dT[0] * p[0] + dT[1] * p[1] + dT[2]);
    roof(F, ring, H - 0.2, { key: 'r|slate|#8f959c', wall: B, tf: dT, profile: [{ t: 1.2, y: 0 }, { t: tmax * 0.5, y: 1.6 }, { t: tmax, y: 0 }] });
    // ---- second floor: arched fanlight window (round head, radial glazing bars) with a brick-arch surround
    { const s = sm, w = 1.0, y0 = 6.95, yc = 7.7;
      F.quad('c|' + WHITE, s - w - 0.07, s + w + 0.07, y0 - 0.07, yc, 0.05); F.arch('c|' + WHITE, s, yc, w + 0.07, 0.95, 0.05);
      F.quad('g|' + GLASSL, s - w, s + w, y0, yc, 0.08); F.arch('g|' + GLASSL, s, yc, w, 0.88, 0.08);
      for (let i = 0; i <= 4; i++) F.slab('c|' + WHITE, s - w + (2 * w * i) / 4 - 0.025, s - w + (2 * w * i) / 4 + 0.025, 0.08, 0.12, y0, yc);
      F.slab('c|' + WHITE, s - w, s + w, 0.08, 0.12, 7.35, 7.4);
      for (let i = 0; i <= 5; i++) { const t = (Math.PI * i) / 5; F.quad3('c|' + WHITE, [s + 0.03 * Math.cos(t), 0.09, yc], [s - 0.03 * Math.cos(t), 0.09, yc], [s + (w) * Math.cos(t) - 0.03, 0.09, yc + 0.88 * Math.sin(t)], [s + (w) * Math.cos(t) + 0.03, 0.09, yc + 0.88 * Math.sin(t)]); }
      F.slab('c|' + WHITE, s - w - 0.2, s + w + 0.2, 0.0, 0.2, y0 - 0.17, y0 - 0.07);
    }
    // ---- first-floor oriel bay (white) with a slate hood
    { const s = sm, w = 1.55, a = 0.45, dp = 0.8, y0 = 4.1, y1 = 6.4, pts = [[s - w / 2 - a, 0.02], [s - w / 2, dp], [s + w / 2, dp], [s + w / 2 + a, 0.02]];
      for (let i = 0; i < 3; i++) {
        const [sa, da] = pts[i], [sb, db] = pts[i + 1];
        F.quad3('c|' + WHITE, [sa, da, y0], [sb, db, y0], [sb, db, y1], [sa, da, y1]);
        const m0 = sb - sa, m1 = db - da, ln = Math.hypot(m0, m1), e = 0.09, gs = [sa + (m0 / ln) * e, da + (m1 / ln) * e], ge = [sb - (m0 / ln) * e, db - (m1 / ln) * e];
        F.quad3('g|' + GLASSL, [gs[0], gs[1] + 0.02, y0 + 0.35], [ge[0], ge[1] + 0.02, y0 + 0.35], [ge[0], ge[1] + 0.02, y1 - 0.15], [gs[0], gs[1] + 0.02, y1 - 0.15]);
        F.quad3('c|' + WHITE, [(gs[0] + ge[0]) / 2 - 0.02, (gs[1] + ge[1]) / 2 + 0.03, y0 + 0.35], [(gs[0] + ge[0]) / 2 + 0.02, (gs[1] + ge[1]) / 2 + 0.03, y0 + 0.35], [(gs[0] + ge[0]) / 2 + 0.02, (gs[1] + ge[1]) / 2 + 0.03, y1 - 0.15], [(gs[0] + ge[0]) / 2 - 0.02, (gs[1] + ge[1]) / 2 + 0.03, y1 - 0.15]);
      }
      F.poly('c|' + WHITE, [[s - w / 2 - a, 0.02, y0], [s - w / 2, dp, y0], [s + w / 2, dp, y0], [s + w / 2 + a, 0.02, y0], [s, 0.02, y0 - 0.3]]);
      pent(F, 'c|#5e656c', s - w / 2 - a - 0.1, s + w / 2 + a + 0.1, dp + 0.12, y1 + 0.02, 0.55);
    }
    // ---- ground floor: white pilasters, navy plinth, estate-agent windows, glazed door, lime/white fascia
    F.slab('c|' + WHITE, 0, 0.4, -0.03, 0.28, 0, 3.95); F.slab('c|' + WHITE, L - 0.4, L, -0.03, 0.28, 0, 3.95);
    F.quad('c|#f1f2ec', 0.4, L - 0.4, 0, 3.0, 0.2); F.slab('c|#2b3340', 0.4, L - 0.4, 0.0, 0.3, 0, 0.5);
    F.quad('g|#8ea0aa', 0.6, 2.3, 0.6, 2.85, 0.3); F.quad('g|#8ea0aa', 3.6, 5.5, 0.6, 2.85, 0.3);
    for (const x of [0.6, 2.3, 3.6, 5.5]) F.slab('c|' + WHITE, x - 0.05, x + 0.05, 0.28, 0.4, 0.5, 2.95);
    F.slab('c|' + WHITE, 0.55, 2.35, 0.28, 0.4, 2.85, 2.95); F.slab('c|' + WHITE, 3.55, 5.55, 0.28, 0.4, 2.85, 2.95);
    F.quad('c|#dfe3e6', 0.9, 2.0, 1.1, 2.3, 0.34); F.quad('c|#dfe3e6', 3.9, 5.2, 1.1, 2.3, 0.34); F.quad('c|#27345e', 0.7, 2.2, 0.75, 1.0, 0.34); F.quad('c|#27345e', 3.7, 5.4, 0.75, 1.0, 0.34);
    F.quad('g|#2a3a44', 2.55, 3.4, 0.1, 2.4, 0.3); F.slab('c|' + WHITE, 2.45, 2.55, 0.28, 0.4, 0, 2.5); F.slab('c|' + WHITE, 3.4, 3.5, 0.28, 0.4, 0, 2.5); F.slab('c|' + WHITE, 2.45, 3.5, 0.28, 0.4, 2.45, 2.55); F.slab('c|' + WHITE, 2.95, 3.0, 0.28, 0.4, 0.1, 2.45);
    board(F, K, 0.3, L - 0.3, 3.0, 3.85, 0.36, {
      bg: '#f2f3ec', edge: '#f2f3ec', runs: [{ t: 'Fenn', c: '#1f6b3d' }, { t: 'Wright', c: '#1f6b3d' }], font: 'sans', weight: 'bold', italic: true, sizeK: 0.5, avail: 0.5, left: 0.05,
      draw: (x, cw, ch) => { x.fillStyle = '#9bc53d'; x.beginPath(); x.moveTo(cw * 0.58, ch); x.quadraticCurveTo(cw * 0.66, ch * 0.2, cw * 0.78, 0); x.lineTo(cw, 0); x.lineTo(cw, ch); x.closePath(); x.fill(); x.fillStyle = '#26421f'; x.font = `bold ${Math.round(ch * 0.22)}px sans-serif`; x.textAlign = 'left'; x.fillText('01394 548700', cw * 0.74, ch * 0.66); },
    });
    F.done();
  },
};
