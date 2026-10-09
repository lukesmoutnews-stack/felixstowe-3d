// Web Worker: parses Overpass JSON into features and land polygons off the main thread,
// so streaming new tiles does not stall walking or driving.
import { LocalFrame } from '../geo/projection.js';
import { parseOverpass, buildFeatures, overtureBuildings } from '../geo/osm.js';
import { landPolygons } from '../geo/coast.js';

let frame = null;
self.onmessage = (e) => {
  const { id, origin, rect, json, overture } = e.data;
  try {
    if (!frame || frame.originLat !== origin.lat || frame.originLon !== origin.lon) frame = new LocalFrame(origin.lat, origin.lon);
    const features = buildFeatures(parseOverpass(json, frame));
    if (overture) features.buildings.push(...overtureBuildings(overture, frame));
    const inR = (x, z) => x >= rect.minX && x < rect.maxX && z >= rect.minZ && z < rect.maxZ;
    const hint = features.buildings.some((b) => inR(b.cx, b.cz)) || features.roads.some((r) => r.pts.some((p) => inR(p[0], p[1])));
    const lp = landPolygons(features.coastLines, rect, hint);
    self.postMessage({ id, features, land: lp.land, coastStatus: lp.status });
  } catch (err) { self.postMessage({ id, error: String(err && err.stack || err) }); }
};
