// Terrain height source. Either flat (no LiDAR supplied) or heights produced by tools/lidar.mjs
// from Environment Agency DTM tiles (OSGB36 grid, metres above Ordnance Datum Newlyn).
// Two layouts: a single grid (small areas/tests) or 1 km chunks streamed with the map tiles.

export class Terrain {
  constructor() { this.grid = null; this.seaLevel = -0.25; this.mode = 'flat'; this.chunks = null; this.clamps = []; }

  /** Keep the ground inside a footprint at or below maxY (dug-in buildings with interiors). */
  addClamp(ring, maxY) { let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity; for (const [x, z] of ring) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); } this.clamps.push({ ring, maxY, x0, x1, z0, z1 }); }
  _clamp(x, z, h) { for (const c of this.clamps) { if (x < c.x0 || x > c.x1 || z < c.z0 || z > c.z1) continue; let ins = false; const r = c.ring; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { if ((r[i][1] > z) !== (r[j][1] > z) && x < (r[j][0] - r[i][0]) * (z - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) ins = !ins; } if (ins && h > c.maxY) h = c.maxY; } return h; }

  /** Load terrain.json (+ terrain.bin for a single grid). Returns true when LiDAR terrain is active. */
  async load(url, frame) {
    try {
      const res = await fetch(url, { cache: 'no-cache' });
      if (!res.ok) return false;
      const t = await res.json();
      this.frame = frame;
      if (t.osgbShift) frame.osgbShift = { ...t.osgbShift };
      this.seaLevel = t.seaLevel ?? 0.3; this.meta = t.meta || {}; this.scale = t.scale || 0.01; this.nodata = t.nodata ?? -32768;
      if (t.chunks) {
        this.mode = 'lidar-chunks'; this.base = url.replace(/[^/]*$/, '') + 'chunks/';
        this.ch = { size: t.chunk, n: t.samples, cell: t.cell, keys: new Set(t.chunks) };
        this.chunks = new Map(); this.pending = new Map(); this.b64 = !!t.base64Chunks; this.enc = t.chunkEncoding || 'raw';
        return true;
      }
      const binRes = await fetch(url.replace(/\.json$/, '.bin'), { cache: 'no-cache' });
      if (!binRes.ok) return false;
      const raw = new Int16Array(await binRes.arrayBuffer());
      if (raw.length !== t.cols * t.rows) throw new Error('terrain.bin size mismatch');
      this.grid = { E0: t.E0, N0: t.N0, cell: t.cell, cols: t.cols, rows: t.rows, h: raw };
      this.mode = 'lidar';
      return true;
    } catch (e) { console.warn('terrain', e); return false; }
  }

  /** Make sure the chunks under a world rect are loaded (call before building that area). */
  async ensureRect(r, margin = 120) {
    if (!this.chunks) return;
    const S = this.ch.size, keys = new Set();
    const cs = [[r.minX - margin, r.minZ - margin], [r.maxX + margin, r.minZ - margin], [r.minX - margin, r.maxZ + margin], [r.maxX + margin, r.maxZ + margin]].map(([x, z]) => this.frame.toOSGB(x, z));
    const e0 = Math.floor(Math.min(...cs.map((c) => c.E)) / S) * S, e1 = Math.floor(Math.max(...cs.map((c) => c.E)) / S) * S;
    const n0 = Math.floor(Math.min(...cs.map((c) => c.N)) / S) * S, n1 = Math.floor(Math.max(...cs.map((c) => c.N)) / S) * S;
    for (let n = n0; n <= n1; n += S) for (let e = e0; e <= e1; e += S) { const k = `${e}_${n}`; if (this.ch.keys.has(k) && !this.chunks.has(k)) keys.add(k); }
    await Promise.all([...keys].map((k) => {
      if (!this.pending.has(k)) this.pending.set(k, this._fetchChunk(k).then((b) => { if (b) this.chunks.set(k, new Int16Array(b)); }).catch(() => {}));
      return this.pending.get(k);
    }));
  }

  /** Raw Int16 chunk (.bin), or a base64 JSON copy (.b64.json) for hosts that do not serve binary files. */
  async _fetchChunk(k) {
    if (!this.b64) { const r = await fetch(this.base + k + '.bin'); if (r.ok) return r.arrayBuffer(); }
    const r = await fetch(this.base + k + '.b64.json'); if (!r.ok) return null;
    const bin = atob((await r.json()).data); const u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    if (this.enc !== 'delta-gzip') return u.buffer;
    // tools/make-web-data.mjs: row-major Int16 deltas, gzipped (about 8x smaller for this terrain).
    const out = await new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
    const d = new Int16Array(out); let p = 0;
    for (let i = 0; i < d.length; i++) { p = (p + d[i]) << 16 >> 16; d[i] = p; }
    return out;
  }

  /** Height (m ODN) at world x,z. */
  heightAt(x, z) { const h = this._heightAt(x, z); return this.clamps.length ? this._clamp(x, z, h) : h; }
  _heightAt(x, z) {
    if (this.mode === 'flat') return 0;
    const o = this.frame.toOSGB(x, z); const under = this.seaLevel - 1.5;
    if (this.chunks) {
      const { size: S, n, cell } = this.ch;
      const cE = Math.floor(o.E / S) * S, cN = Math.floor(o.N / S) * S;
      const h = this.chunks.get(`${cE}_${cN}`); if (!h) return under;
      const fx = (o.E - cE) / cell, fy = (cN + S - o.N) / cell;
      const ix = Math.min(n - 2, Math.floor(fx)), iy = Math.min(n - 2, Math.floor(fy)), tx = fx - ix, ty = fy - iy;
      const s = (cx, cy) => { const v = h[cy * n + cx]; return v === this.nodata ? under : v * this.scale; };
      return (s(ix, iy) * (1 - tx) + s(ix + 1, iy) * tx) * (1 - ty) + (s(ix, iy + 1) * (1 - tx) + s(ix + 1, iy + 1) * tx) * ty;
    }
    const g = this.grid;
    const fx = (o.E - g.E0) / g.cell, fy = (g.N0 - o.N) / g.cell;
    if (fx < 0 || fy < 0 || fx >= g.cols - 1 || fy >= g.rows - 1) return under;
    const ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
    const s = (cx, cy) => { const v = g.h[cy * g.cols + cx]; return v === this.nodata ? under : v * this.scale; };
    return (s(ix, iy) * (1 - tx) + s(ix + 1, iy) * tx) * (1 - ty) + (s(ix, iy + 1) * (1 - tx) + s(ix + 1, iy + 1) * tx) * ty;
  }
  get hasTerrain() { return this.mode !== 'flat'; }
}
