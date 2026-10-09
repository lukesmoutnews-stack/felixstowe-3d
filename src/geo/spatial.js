// Uniform-grid spatial index for footprints, edges and road segments.

export class SpatialGrid {
  constructor(cell = 20) { this.cell = cell; this.map = new Map(); }
  _k(i, j) { return i * 73856093 ^ j * 19349663; }
  insert(minX, minZ, maxX, maxZ, item) {
    const c = this.cell;
    for (let i = Math.floor(minX / c); i <= Math.floor(maxX / c); i++)
      for (let j = Math.floor(minZ / c); j <= Math.floor(maxZ / c); j++) {
        const k = this._k(i, j); let a = this.map.get(k); if (!a) { a = []; this.map.set(k, a); } a.push(item);
      }
  }
  /** Items whose cells overlap the query box. May contain duplicates removed via Set. */
  query(minX, minZ, maxX, maxZ) {
    const c = this.cell, out = new Set();
    for (let i = Math.floor(minX / c); i <= Math.floor(maxX / c); i++)
      for (let j = Math.floor(minZ / c); j <= Math.floor(maxZ / c); j++) {
        const a = this.map.get(this._k(i, j)); if (a) for (const it of a) out.add(it);
      }
    return out;
  }
  remove(pred) { for (const [k, a] of this.map) { const f = a.filter((x) => !pred(x)); if (f.length) this.map.set(k, f); else this.map.delete(k); } }
}
