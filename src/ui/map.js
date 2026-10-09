// 2D map rendered from exactly the same world-space features as the 3D scene, so the
// minimap and full map cannot drift out of alignment with the 3D environment.

const COL = {
  sea: '#a8c4cf', land: '#ece8de', residential: '#e4dfd3', commercial: '#eadbd6', industrial: '#ddd6cf', port: '#d8d3cc', railway: '#d8d1c9',
  park: '#c5dda8', grass: '#cfe2b0', pitch: '#b6d99a', golf: '#c3e0a7', cemetery: '#bcd2a6', wood: '#a9c98d', scrub: '#bfd29e', farmland: '#efe6c8',
  beach: '#f1e2b8', shingle: '#dcd2bd', water: '#a8c4cf', mud: '#c9bca6', wetland: '#c3d3c0', parking: '#e1ddd6', paved: '#e2dcd2', playground: '#d7ecd0', quay: '#cfcac2', institution: '#ece0cc', brownfield: '#ddd6c0',
  building: '#d4c4b0', buildingStroke: '#b09d87', landmark: '#c98e5b', road: '#ffffff', roadCase: '#b4ab9e', major: '#fbe0a8', majorCase: '#c9a46a', foot: '#c98f73', rail: '#7d7a76', pier: '#b49a7a',
};
const MAJOR = new Set(['motorway', 'trunk', 'primary', 'secondary', 'motorway_link', 'trunk_link', 'primary_link', 'secondary_link']);
const ORDER = ['residential', 'commercial', 'industrial', 'port', 'railway', 'institution', 'farmland', 'brownfield', 'grass', 'park', 'golf', 'cemetery', 'wood', 'scrub', 'pitch', 'playground', 'beach', 'shingle', 'mud', 'wetland', 'water', 'parking', 'paved', 'quay'];

export class MapRenderer {
  constructor(world) { this.world = world; this.cache = new Map(); this.scale = 1; }

  tileCanvas(tile) {
    if (this.cache.has(tile.key)) return this.cache.get(tile.key);
    const s = this.scale, r = tile.rect, W = Math.round((r.maxX - r.minX) * s), H = Math.round((r.maxZ - r.minZ) * s);
    const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
    const P = (p) => [(p[0] - r.minX) * s, (p[1] - r.minZ) * s];
    const poly = (rings) => { g.beginPath(); for (const ring of rings) { ring.forEach((p, i) => { const [x, y] = P(p); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); } };
    const f = tile.features || { areas: [], roads: [], buildings: [], lines: [] };
    g.fillStyle = COL.sea; g.fillRect(0, 0, W, H);
    g.fillStyle = COL.land;
    for (const l of tile.land || []) { poly([l.outer, ...l.holes]); g.fill('evenodd'); }
    const areas = f.areas.slice().sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind));
    for (const a of areas) { if (!COL[a.kind] || a.kind === 'pier') continue; g.fillStyle = COL[a.kind]; poly([a.outer, ...(a.holes || [])]); g.fill('evenodd'); }
    g.lineCap = 'round'; g.lineJoin = 'round';
    const line = (pts) => { g.beginPath(); pts.forEach((p, i) => { const [x, y] = P(p); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); };
    for (const l of f.lines) if (l.kind === 'rail' && !l.tags.tunnel) { g.strokeStyle = COL.rail; g.lineWidth = 2.2 * s; g.setLineDash([]); line(l.pts); g.strokeStyle = '#f4f1ea'; g.lineWidth = 1.1 * s; g.setLineDash([6 * s, 6 * s]); line(l.pts); g.setLineDash([]); }
    for (const rd of f.roads) if (rd.footOnly && rd.kind !== 'pedestrian') { g.strokeStyle = COL.foot; g.lineWidth = Math.max(1, 1.2 * s); g.setLineDash([3 * s, 2.5 * s]); line(rd.pts); }
    g.setLineDash([]);
    const car = f.roads.filter((rd) => !rd.footOnly || rd.kind === 'pedestrian');
    for (const rd of car) { g.strokeStyle = MAJOR.has(rd.kind) ? COL.majorCase : COL.roadCase; g.lineWidth = (rd.width + 2) * s; line(rd.pts); }
    for (const rd of car) { g.strokeStyle = MAJOR.has(rd.kind) ? COL.major : rd.kind === 'pedestrian' ? '#f1ede6' : COL.road; g.lineWidth = rd.width * s; line(rd.pts); }
    for (const a of f.areas) if (a.kind === 'pier') { g.fillStyle = COL.pier; poly([a.outer]); g.fill(); }
    for (const l of f.lines) if (l.kind === 'pier') { g.strokeStyle = COL.pier; g.lineWidth = (l.width || 5) * s; line(l.pts); }
    for (const b of f.buildings) {
      if (b.isPart) continue;
      g.fillStyle = b.landmark ? COL.landmark : COL.building; g.strokeStyle = COL.buildingStroke; g.lineWidth = 0.7;
      poly([b.outer, ...(b.holes || [])]); g.fill('evenodd'); g.stroke();
    }
    this.cache.set(tile.key, c); return c;
  }
  drop(key) { this.cache.delete(key); }

  /**
   * Draw the map into ctx. view = {cx, cz, scale (px per metre), w, h, rotation}
   */
  draw(ctx, view, opts = {}) {
    const { cx, cz, scale, w, h } = view;
    ctx.save(); ctx.fillStyle = COL.sea; ctx.fillRect(0, 0, w, h);
    ctx.translate(w / 2, h / 2); if (view.rotation) ctx.rotate(view.rotation); ctx.scale(scale, scale); ctx.translate(-cx, -cz);
    ctx.imageSmoothingEnabled = true;
    const halfW = (Math.max(w, h) / scale) * 0.75;
    for (const t of this.world.tiles.values()) {
      if (!t.features) continue;
      const r = t.rect; if (r.maxX < cx - halfW || r.minX > cx + halfW || r.maxZ < cz - halfW || r.minZ > cz + halfW) continue;
      ctx.drawImage(this.tileCanvas(t), r.minX, r.minZ, r.maxX - r.minX, r.maxZ - r.minZ);
    }
    ctx.restore();
    if (opts.labels) this._labels(ctx, view);
    if (opts.pois) this._pois(ctx, view, opts);
  }
  toScreen(view, x, z) {
    let dx = (x - view.cx) * view.scale, dz = (z - view.cz) * view.scale;
    if (view.rotation) { const c = Math.cos(view.rotation), s = Math.sin(view.rotation); [dx, dz] = [dx * c - dz * s, dx * s + dz * c]; }
    return [view.w / 2 + dx, view.h / 2 + dz];
  }
  toWorld(view, sx, sy) { return [view.cx + (sx - view.w / 2) / view.scale, view.cz + (sy - view.h / 2) / view.scale]; }

  _labels(ctx, view) {
    if (view.scale < 0.6) return;
    const done = new Set();
    ctx.font = `${view.scale > 2 ? 13 : 11}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const t of this.world.tiles.values()) {
      for (const rd of t.features?.roads || []) {
        if (!rd.name || done.has(rd.name) || rd.footOnly && rd.kind !== 'pedestrian') continue;
        // longest segment
        let best = null; for (let i = 1; i < rd.pts.length; i++) { const L = Math.hypot(rd.pts[i][0] - rd.pts[i - 1][0], rd.pts[i][1] - rd.pts[i - 1][1]); if (!best || L > best.L) best = { L, a: rd.pts[i - 1], b: rd.pts[i] }; }
        if (!best || best.L * view.scale < rd.name.length * 6.5) continue;
        const mx = (best.a[0] + best.b[0]) / 2, mz = (best.a[1] + best.b[1]) / 2;
        const [sx, sy] = this.toScreen(view, mx, mz); if (sx < -50 || sy < -20 || sx > view.w + 50 || sy > view.h + 20) continue;
        let ang = Math.atan2(best.b[1] - best.a[1], best.b[0] - best.a[0]) + (view.rotation || 0); if (ang > Math.PI / 2) ang -= Math.PI; if (ang < -Math.PI / 2) ang += Math.PI;
        ctx.save(); ctx.translate(sx, sy); ctx.rotate(ang);
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.strokeText(rd.name, 0, 0); ctx.fillStyle = '#3a3530'; ctx.fillText(rd.name, 0, 0);
        ctx.restore(); done.add(rd.name);
      }
    }
  }
  _pois(ctx, view, opts) {
    ctx.font = '600 12px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    for (const p of this.world.pois.values()) {
      if (!p.landmark && !(opts.allPois && view.scale > 1.2)) continue;
      const [sx, sy] = this.toScreen(view, p.x, p.z); if (sx < -20 || sy < -20 || sx > view.w + 20 || sy > view.h + 20) continue;
      const known = opts.discovered?.has(p.landmark || p.id);
      ctx.fillStyle = p.landmark ? (known ? '#b5532c' : '#2a4d69') : '#6b6158';
      ctx.beginPath(); ctx.arc(sx, sy, p.landmark ? 6 : 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      if (p.landmark || view.scale > 2) { ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,0.92)'; ctx.strokeText(p.name, sx + 9, sy); ctx.fillStyle = '#1f2a33'; ctx.fillText(p.name, sx + 9, sy); }
    }
  }
}
