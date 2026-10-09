// Where tile data comes from, in order of preference:
//   1. data/tiles/<i>_<j>.json – pre-fetched by tools/fetch-osm.mjs (production path)
//   2. browser Cache Storage – a previous live fetch (Overpass policy asks clients to cache)
//   3. live Overpass API request (development path; one request at a time)
// A synthetic test fixture can be forced with ?fixture=<name> for automated tests.

import { CONFIG, tileBBox, overpassQuery } from '../config.js';

const CACHE = 'felixstowe-osm-v1';
let queue = Promise.resolve();
let lastRequest = 0;

export class TileSource {
  constructor(frame, { fixture = null, onStatus = () => {}, staticPath = CONFIG.staticTilePath, allowLive = true } = {}) {
    this.frame = frame; this.fixture = fixture; this.onStatus = onStatus; this.log = []; this.staticPath = staticPath; this.allowLive = allowLive;
    this._fixtureJson = null;
  }
  async get(i, j) {
    const key = `${i}_${j}`;
    if (this.fixture) {
      if (!this._fixtureJson) this._fixtureJson = fetch(`test/fixtures/${this.fixture}.json`).then((r) => r.json());
      return { json: await this._fixtureJson, source: 'fixture:' + this.fixture };
    }
    // 1. static (only tiles listed in data/manifest.json, so missing files never 404)
    if (this.staticTiles?.has(key)) try {
      const r = await fetch(`${this.staticPath}${key}.json`);
      if (r.ok) {
        const json = await r.json(); this.log.push({ key, source: 'static' });
        let overture = null;
        if (this.overtureTiles?.has(key)) try { const o = await fetch(`${this.staticPath.replace(/tiles\/$/, '')}overture/${key}.json`); if (o.ok) overture = (await o.json()).buildings; } catch { /* optional */ }
        return { json, overture, source: 'static file' };
      }
    } catch { /* fall through */ }
    // Prepared data sets list every tile that has data; anything else is open sea or outside the area.
    if (!this.allowLive || this.staticTiles?.size) return { json: { elements: [] }, source: 'no data in this tile (outside the prepared data set)' };
    // 2/3. cache or live Overpass
    const bb = tileBBox(i, j, this.frame);
    const q = overpassQuery(bb);
    const cacheKey = 'https://cache.local/overpass?' + encodeURIComponent(q);
    let cache = null;
    try { cache = await caches.open(CACHE); const hit = await cache.match(cacheKey); if (hit) { this.log.push({ key, source: 'cache' }); return { json: await hit.json(), source: 'browser cache (OSM via Overpass)' }; } } catch { /* no Cache Storage */ }
    const json = await this._overpass(q, key);
    try { if (cache) await cache.put(cacheKey, new Response(JSON.stringify(json), { headers: { 'Content-Type': 'application/json', 'X-Fetched': new Date().toISOString() } })); } catch { /* quota */ }
    return { json, source: 'live Overpass API' };
  }
  _overpass(q, key) {
    const run = async () => {
      const wait = Math.max(0, 1200 - (Date.now() - lastRequest)); if (wait) await new Promise((r) => setTimeout(r, wait));
      let lastErr;
      for (const ep of CONFIG.overpass.endpoints) {
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            this.onStatus(`Downloading OpenStreetMap data for tile ${key}…`);
            lastRequest = Date.now();
            const res = await fetch(ep, { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
            if (res.status === 429 || res.status === 504) { lastErr = new Error(`${ep} busy (${res.status})`); await new Promise((r) => setTimeout(r, 8000)); continue; }
            if (!res.ok) throw new Error(`${ep} HTTP ${res.status}`);
            const json = await res.json();
            if (json.remark && /runtime error|timed out/i.test(json.remark)) throw new Error('Overpass: ' + json.remark);
            this.log.push({ key, source: 'overpass', endpoint: ep, elements: json.elements?.length, osm3s: json.osm3s?.timestamp_osm_base });
            return json;
          } catch (e) { lastErr = e; }
        }
      }
      throw lastErr || new Error('Overpass unavailable');
    };
    const p = queue.then(run, run); queue = p.catch(() => {}); return p;
  }
}
