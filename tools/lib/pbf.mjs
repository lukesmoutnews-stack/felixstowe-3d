// Minimal OpenStreetMap PBF reader (no dependencies). Supports the standard OSMData blocks
// written by Geofabrik/osmium/osmosis: dense nodes, plain nodes, ways, relations, zlib blobs.
import { inflateSync } from 'node:zlib';

class PB {
  constructor(buf, start = 0, end = buf.length) { this.b = buf; this.p = start; this.end = end; }
  get done() { return this.p >= this.end; }
  varint() { // returns Number (safe up to 2^53)
    let r = 0, mul = 1, byte;
    do { byte = this.b[this.p++]; r += (byte & 0x7f) * mul; mul *= 128; } while (byte & 0x80);
    return r;
  }
  svarint() { const n = this.varint(); return n % 2 ? -(n + 1) / 2 : n / 2; }
  key() { const k = this.varint(); return [Math.floor(k / 8), k & 7]; }
  bytes() { const l = this.varint(); const s = this.p; this.p += l; return [s, this.p]; }
  skip(wt) { if (wt === 0) this.varint(); else if (wt === 1) this.p += 8; else if (wt === 2) { const l = this.varint(); this.p += l; } else if (wt === 5) this.p += 4; else throw new Error('bad wire type ' + wt); }
  packed(signed = false) { const [s, e] = this.bytes(); const sub = new PB(this.b, s, e); const out = []; while (!sub.done) out.push(signed ? sub.svarint() : sub.varint()); return out; }
}

function* blobs(buf) {
  let p = 0;
  while (p + 4 <= buf.length) {
    const hl = buf.readUInt32BE(p); p += 4;
    const h = new PB(buf, p, p + hl); p += hl;
    let type = '', size = 0;
    while (!h.done) { const [f, wt] = h.key(); if (f === 1) { const [s, e] = h.bytes(); type = buf.toString('utf8', s, e); } else if (f === 3) size = h.varint(); else h.skip(wt); }
    const bl = new PB(buf, p, p + size); p += size;
    let data = null;
    while (!bl.done) {
      const [f, wt] = bl.key();
      if (f === 1) { const [s, e] = bl.bytes(); data = buf.subarray(s, e); }
      else if (f === 3) { const [s, e] = bl.bytes(); data = inflateSync(buf.subarray(s, e)); }
      else if (f === 4 || f === 5 || f === 6 || f === 7) throw new Error('unsupported PBF blob compression (field ' + f + ')');
      else bl.skip(wt);
    }
    yield { type, data };
  }
}

/**
 * Iterate OSM entities. handlers: { node(id, lat, lon, tags|null), way(id, refs, tags), relation(id, members, tags) }
 * Pass only the handlers you need – skipped entity types are not decoded.
 */
export function readPbf(buf, handlers) {
  for (const { type, data } of blobs(buf)) {
    if (type !== 'OSMData') continue;
    const blk = new PB(data);
    let strings = [], gran = 100, latOff = 0, lonOff = 0; const groups = [];
    while (!blk.done) {
      const [f, wt] = blk.key();
      if (f === 1) { const [s, e] = blk.bytes(); const st = new PB(data, s, e); while (!st.done) { const [ff, w2] = st.key(); if (ff === 1) { const [a, b] = st.bytes(); strings.push(data.toString('utf8', a, b)); } else st.skip(w2); } }
      else if (f === 2) groups.push(blk.bytes());
      else if (f === 17) gran = blk.varint();
      else if (f === 19) latOff = blk.svarint();
      else if (f === 20) lonOff = blk.svarint();
      else blk.skip(wt);
    }
    const coord = (v, off) => (off + gran * v) * 1e-9;
    const tagsOf = (keys, vals) => { if (!keys.length) return null; const t = {}; for (let i = 0; i < keys.length; i++) t[strings[keys[i]]] = strings[vals[i]]; return t; };
    for (const [gs, ge] of groups) {
      const g = new PB(data, gs, ge);
      while (!g.done) {
        const [f, wt] = g.key();
        if (f === 2 && handlers.node) { // DenseNodes
          const [s, e] = g.bytes(); const d = new PB(data, s, e);
          let ids = [], lats = [], lons = [], kv = [];
          while (!d.done) { const [ff, w2] = d.key(); if (ff === 1) ids = d.packed(true); else if (ff === 8) lats = d.packed(true); else if (ff === 9) lons = d.packed(true); else if (ff === 10) kv = d.packed(); else d.skip(w2); }
          let id = 0, lat = 0, lon = 0, k = 0;
          for (let i = 0; i < ids.length; i++) {
            id += ids[i]; lat += lats[i]; lon += lons[i];
            let tags = null;
            if (kv.length) { while (kv[k] !== 0 && k < kv.length) { (tags ||= {})[strings[kv[k]]] = strings[kv[k + 1]]; k += 2; } k++; }
            handlers.node(id, coord(lat, latOff), coord(lon, lonOff), tags);
          }
        } else if (f === 1 && handlers.node) { // plain Node
          const [s, e] = g.bytes(); const n = new PB(data, s, e); let id = 0, lat = 0, lon = 0, keys = [], vals = [];
          while (!n.done) { const [ff, w2] = n.key(); if (ff === 1) id = n.svarint(); else if (ff === 2) keys = n.packed(); else if (ff === 3) vals = n.packed(); else if (ff === 8) lat = n.svarint(); else if (ff === 9) lon = n.svarint(); else n.skip(w2); }
          handlers.node(id, coord(lat, latOff), coord(lon, lonOff), tagsOf(keys, vals));
        } else if (f === 3 && handlers.way) {
          const [s, e] = g.bytes(); const w = new PB(data, s, e); let id = 0, keys = [], vals = [], refs = [];
          while (!w.done) { const [ff, w2] = w.key(); if (ff === 1) id = w.varint(); else if (ff === 2) keys = w.packed(); else if (ff === 3) vals = w.packed(); else if (ff === 8) refs = w.packed(true); else w.skip(w2); }
          for (let i = 1; i < refs.length; i++) refs[i] += refs[i - 1];
          handlers.way(id, refs, tagsOf(keys, vals) || {});
        } else if (f === 4 && handlers.relation) {
          const [s, e] = g.bytes(); const r = new PB(data, s, e); let id = 0, keys = [], vals = [], roles = [], mem = [], types = [];
          while (!r.done) { const [ff, w2] = r.key(); if (ff === 1) id = r.varint(); else if (ff === 2) keys = r.packed(); else if (ff === 3) vals = r.packed(); else if (ff === 8) roles = r.packed(); else if (ff === 9) mem = r.packed(true); else if (ff === 10) types = r.packed(); else r.skip(w2); }
          let ref = 0; const members = mem.map((m, i) => { ref += m; return { type: ['node', 'way', 'relation'][types[i]], ref, role: strings[roles[i]] }; });
          handlers.relation(id, members, tagsOf(keys, vals) || {});
        } else g.skip(wt);
      }
    }
  }
}

/** OSMHeader info: { bbox, replicationTimestamp (ISO) } where present. */
export function readHeader(buf) {
  for (const { type, data } of blobs(buf)) {
    if (type !== 'OSMHeader') continue;
    const h = new PB(data); const out = {};
    while (!h.done) {
      const [f, wt] = h.key();
      if (f === 32) out.replicationTimestamp = new Date(h.varint() * 1000).toISOString();
      else if (f === 16) { const [s, e] = h.bytes(); out.writingProgram = data.toString('utf8', s, e); }
      else h.skip(wt);
    }
    return out;
  }
  return {};
}
