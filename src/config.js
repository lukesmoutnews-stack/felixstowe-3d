// Project configuration. Coordinates here define the data grid only; no geometry is
// placed from these numbers – everything visible is built from downloaded source data.

export const CONFIG = {
  name: 'Felixstowe 3D',
  // Fixed frame origin (a round number near the town centre). Changing it moves nothing
  // geographically; it only keeps world coordinates small for float32 precision.
  origin: { lat: 51.9600, lon: 1.3500 },

  // Data tiles: a 1 km grid in the project's metric frame (x east, z south), tile 0_0
  // centred on the origin. Each tile's lat/lon query box is derived from its corners.
  tileSize: 1000,

  // Town extent used for tile streaming (S, W, N, E). Covers seafront, town centre,
  // Landguard, the port, Walton, Old Felixstowe and Felixstowe Ferry.
  extent: { s: 51.930, w: 1.270, n: 52.000, e: 1.400 },

  // Tiles are loaded around
  // the player within `streamRadius` metres and unloaded beyond `unloadRadius`.
  streamRadius: 1300,
  unloadRadius: 2400,

  // Where the player starts. Resolved at runtime to the nearest real road in the data.
  // Named targets are looked up by OSM name; the lat/lon is only a fallback search point.
  spawn: { name: 'Felixstowe Pier', lat: 51.9580, lon: 1.3500 },

  overpass: {
    endpoints: ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter'],
    timeout: 120,
  },
  staticTilePath: 'data/tiles/', // pre-baked tiles from tools/fetch-osm.mjs (preferred)
  terrainPath: 'data/terrain/terrain.json', // from tools/lidar.mjs (optional)
};

export function tileKey(i, j) { return `${i}_${j}`; }
/** World-space rect of a tile. */
export function tileRect(i, j) {
  const S = CONFIG.tileSize;
  return { minX: (i - 0.5) * S, maxX: (i + 0.5) * S, minZ: (j - 0.5) * S, maxZ: (j + 0.5) * S };
}
export function tileAt(x, z) { const S = CONFIG.tileSize; return [Math.floor(x / S + 0.5), Math.floor(z / S + 0.5)]; }
/** Lat/lon query box covering a tile (corners projected back, plus ~40 m padding). */
export function tileBBox(i, j, frame, pad = 0.0004) {
  const r = tileRect(i, j); const c = [[r.minX, r.minZ], [r.maxX, r.minZ], [r.maxX, r.maxZ], [r.minX, r.maxZ]].map(([x, z]) => frame.toLatLon(x, z));
  return { s: Math.min(...c.map((p) => p.lat)) - pad, n: Math.max(...c.map((p) => p.lat)) + pad, w: Math.min(...c.map((p) => p.lon)) - pad * 1.6, e: Math.max(...c.map((p) => p.lon)) + pad * 1.6 };
}
export function tilesInExtent(frame, extent = CONFIG.extent) {
  const a = frame.toWorld(extent.s, extent.w), b = frame.toWorld(extent.n, extent.e);
  const [i0, j1] = tileAt(Math.min(a.x, b.x), Math.max(a.z, b.z)), [i1, j0] = tileAt(Math.max(a.x, b.x), Math.min(a.z, b.z));
  const out = []; for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) out.push([i, j]); return out;
}

/** The single Overpass query used by both the browser and tools/fetch-osm.mjs. */
export function overpassQuery(bb, timeout = CONFIG.overpass.timeout) {
  const b = `${bb.s},${bb.w},${bb.n},${bb.e}`;
  return `[out:json][timeout:${timeout}];
(
  way["highway"](${b});
  way["building"](${b});
  way["building:part"](${b});
  relation["building"](${b});
  relation["type"="multipolygon"]["building"](${b});
  way["landuse"](${b});
  way["leisure"](${b});
  way["natural"](${b});
  way["amenity"~"parking|school|hospital|college|grave_yard"](${b});
  way["man_made"](${b});
  way["railway"](${b});
  way["barrier"~"wall|fence|hedge|retaining_wall|city_wall|guard_rail"](${b});
  way["waterway"](${b});
  way["water"](${b});
  way["area:highway"](${b});
  way["place"="square"](${b});
  way["historic"](${b});
  way["tourism"](${b});
  relation["type"="multipolygon"]["historic"](${b});
  relation["type"="multipolygon"]["tourism"](${b});
  relation["type"="multipolygon"]["landuse"](${b});
  relation["type"="multipolygon"]["leisure"](${b});
  relation["type"="multipolygon"]["natural"](${b});
  relation["type"="multipolygon"]["man_made"](${b});
  relation["type"="multipolygon"]["amenity"](${b});
  node["natural"="tree"](${b});
  node["highway"~"street_lamp|bus_stop|crossing|traffic_signals"](${b});
  node["amenity"~"bench|post_box|waste_basket|telephone"](${b});
  node["barrier"="bollard"](${b});
  node["man_made"](${b});
  node["leisure"="picnic_table"](${b});
  node["name"](${b});
);
out geom qt;`;
}

/**
 * The same feature selection as overpassQuery(), for local extracts (tools/osm-from-pbf.mjs).
 * Keep the two in sync.
 */
export function wantedByQuery(type, t) {
  if (!t) return false;
  if (type === 'node') {
    return t.natural === 'tree' || /^(street_lamp|bus_stop|crossing|traffic_signals)$/.test(t.highway || '') ||
      /^(bench|post_box|waste_basket|telephone)$/.test(t.amenity || '') || t.barrier === 'bollard' || !!t.man_made ||
      t.leisure === 'picnic_table' || !!t.name;
  }
  if (type === 'way') {
    return !!(t.highway || t.building || t['building:part'] || t.landuse || t.leisure || t.natural || t.man_made || t.railway ||
      t.waterway || t.water || t['area:highway'] || t.historic || t.tourism) || /parking|school|hospital|college|grave_yard/.test(t.amenity || '') ||
      /wall|fence|hedge|retaining_wall|city_wall|guard_rail/.test(t.barrier || '') || t.place === 'square';
  }
  if (type === 'relation') {
    if (t.building) return true;
    return t.type === 'multipolygon' && !!(t.landuse || t.leisure || t.natural || t.man_made || t.amenity || t.historic || t.tourism);
  }
  return false;
}
