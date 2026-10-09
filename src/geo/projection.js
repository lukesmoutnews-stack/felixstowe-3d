// Coordinate handling for the whole project (shared by browser and Node tools).
//
// World frame (documented in docs/architecture.md):
//   * Source data: OSM / Overture are WGS84 lat/lon (effectively ETRS89 in the UK, sub-metre).
//   * We project lat/lon with the Ordnance Survey National Grid Transverse Mercator
//     parameters on the GRS80 ellipsoid. This is exactly step 1 of the OSTN15
//     transformation and gives a conformal, metric grid ("ETRS89 TM").
//   * OSGB36 National Grid (EPSG:27700, used by EA LiDAR and OS data) differs from
//     ETRS89 TM by a smoothly varying shift (se, sn) of roughly 100 m. Over a 6 km
//     town the shift varies by only centimetres, so we treat it as a constant
//     per-project offset. The initial value is estimated with the OS 7-parameter
//     Helmert transform (+-3-5 m); tools/lidar.mjs can refine it by correlating
//     LiDAR surface heights with OSM building footprints.
//   * Three.js world: x = east (m), y = up (m, ODN when terrain is present),
//     z = south (m), all relative to a fixed project origin so float32 GPU
//     precision stays sub-millimetre across the town.

const DEG = Math.PI / 180;

// National Grid TM parameters (OS "A guide to coordinate systems in Great Britain").
const NG = { F0: 0.9996012717, lat0: 49 * DEG, lon0: -2 * DEG, E0: 400000, N0: -100000 };
const GRS80 = { a: 6378137.0, b: 6356752.314140 };
const AIRY = { a: 6377563.396, b: 6356256.909 };

function meridionalArc(b, F0, n, phi, phi0) {
  const dp = phi - phi0, sp = phi + phi0;
  return b * F0 * (
    (1 + n + (5 / 4) * n * n + (5 / 4) * n ** 3) * dp -
    (3 * n + 3 * n * n + (21 / 8) * n ** 3) * Math.sin(dp) * Math.cos(sp) +
    ((15 / 8) * n * n + (15 / 8) * n ** 3) * Math.sin(2 * dp) * Math.cos(2 * sp) -
    (35 / 24) * n ** 3 * Math.sin(3 * dp) * Math.cos(3 * sp));
}

/** Transverse Mercator forward (lat/lon degrees -> E,N metres) on a given ellipsoid. */
export function tmForward(latDeg, lonDeg, ell = GRS80) {
  const { a, b } = ell; const { F0, lat0, lon0, E0, N0 } = NG;
  const phi = latDeg * DEG, lam = lonDeg * DEG;
  const e2 = 1 - (b * b) / (a * a), n = (a - b) / (a + b);
  const s = Math.sin(phi), c = Math.cos(phi), t = Math.tan(phi);
  const nu = a * F0 / Math.sqrt(1 - e2 * s * s);
  const rho = a * F0 * (1 - e2) / Math.pow(1 - e2 * s * s, 1.5);
  const eta2 = nu / rho - 1;
  const M = meridionalArc(b, F0, n, phi, lat0);
  const I = M + N0;
  const II = (nu / 2) * s * c;
  const III = (nu / 24) * s * c ** 3 * (5 - t * t + 9 * eta2);
  const IIIA = (nu / 720) * s * c ** 5 * (61 - 58 * t * t + t ** 4);
  const IV = nu * c;
  const V = (nu / 6) * c ** 3 * (nu / rho - t * t);
  const VI = (nu / 120) * c ** 5 * (5 - 18 * t * t + t ** 4 + 14 * eta2 - 58 * t * t * eta2);
  const dl = lam - lon0;
  return {
    E: E0 + IV * dl + V * dl ** 3 + VI * dl ** 5,
    N: I + II * dl ** 2 + III * dl ** 4 + IIIA * dl ** 6,
  };
}

/** Transverse Mercator inverse (E,N metres -> lat/lon degrees). */
export function tmInverse(E, N, ell = GRS80) {
  const { a, b } = ell; const { F0, lat0, lon0, E0, N0 } = NG;
  const e2 = 1 - (b * b) / (a * a), n = (a - b) / (a + b);
  let phi = lat0, M = 0;
  do {
    phi = (N - N0 - M) / (a * F0) + phi;
    M = meridionalArc(b, F0, n, phi, lat0);
  } while (Math.abs(N - N0 - M) >= 0.00001);
  const s = Math.sin(phi), c = Math.cos(phi), t = Math.tan(phi);
  const nu = a * F0 / Math.sqrt(1 - e2 * s * s);
  const rho = a * F0 * (1 - e2) / Math.pow(1 - e2 * s * s, 1.5);
  const eta2 = nu / rho - 1;
  const VII = t / (2 * rho * nu);
  const VIII = t / (24 * rho * nu ** 3) * (5 + 3 * t * t + eta2 - 9 * t * t * eta2);
  const IX = t / (720 * rho * nu ** 5) * (61 + 90 * t * t + 45 * t ** 4);
  const X = 1 / (c * nu);
  const XI = 1 / (c * 6 * nu ** 3) * (nu / rho + 2 * t * t);
  const XII = 1 / (c * 120 * nu ** 5) * (5 + 28 * t * t + 24 * t ** 4);
  const XIIA = 1 / (c * 5040 * nu ** 7) * (61 + 662 * t * t + 1320 * t ** 4 + 720 * t ** 6);
  const dE = E - E0;
  return {
    lat: (phi - VII * dE ** 2 + VIII * dE ** 4 - IX * dE ** 6) / DEG,
    lon: (lon0 + X * dE - XI * dE ** 3 + XII * dE ** 5 - XIIA * dE ** 7) / DEG,
  };
}

// --- Helmert WGS84/ETRS89 -> OSGB36 (OS published parameters, accuracy ~3-5 m) ---
function toCartesian(latDeg, lonDeg, h, { a, b }) {
  const phi = latDeg * DEG, lam = lonDeg * DEG;
  const e2 = 1 - (b * b) / (a * a);
  const nu = a / Math.sqrt(1 - e2 * Math.sin(phi) ** 2);
  return [
    (nu + h) * Math.cos(phi) * Math.cos(lam),
    (nu + h) * Math.cos(phi) * Math.sin(lam),
    ((1 - e2) * nu + h) * Math.sin(phi),
  ];
}
function fromCartesian([x, y, z], { a, b }) {
  const e2 = 1 - (b * b) / (a * a);
  const p = Math.hypot(x, y);
  let phi = Math.atan2(z, p * (1 - e2)), prev = 0;
  while (Math.abs(phi - prev) > 1e-12) {
    prev = phi;
    const nu = a / Math.sqrt(1 - e2 * Math.sin(phi) ** 2);
    phi = Math.atan2(z + e2 * nu * Math.sin(phi), p);
  }
  return { lat: phi / DEG, lon: Math.atan2(y, x) / DEG };
}
export function wgs84ToOsgbHelmert(lat, lon) {
  const [x, y, z] = toCartesian(lat, lon, 0, GRS80);
  const tx = -446.448, ty = 125.157, tz = -542.06, s = 20.4894e-6;
  const rx = (-0.1502 / 3600) * DEG, ry = (-0.247 / 3600) * DEG, rz = (-0.8421 / 3600) * DEG;
  const x2 = tx + (1 + s) * x - rz * y + ry * z;
  const y2 = ty + rz * x + (1 + s) * y - rx * z;
  const z2 = tz - ry * x + rx * y + (1 + s) * z;
  const ll = fromCartesian([x2, y2, z2], AIRY);
  return tmForward(ll.lat, ll.lon, AIRY);
}

/**
 * The project's local metric frame. All geometry and physics use it.
 */
export class LocalFrame {
  constructor(originLat, originLon, osgbShift = null) {
    this.originLat = originLat; this.originLon = originLon;
    const o = tmForward(originLat, originLon);
    this.E0 = o.E; this.N0 = o.N;
    if (osgbShift) this.osgbShift = osgbShift;
    else {
      const h = wgs84ToOsgbHelmert(originLat, originLon);
      this.osgbShift = { se: h.E - o.E, sn: h.N - o.N, source: 'helmert-estimate' };
    }
  }
  /** lat/lon -> world {x, z} metres (x east, z south). */
  toWorld(lat, lon) {
    const p = tmForward(lat, lon);
    return { x: p.E - this.E0, z: -(p.N - this.N0) };
  }
  toLatLon(x, z) { return tmInverse(x + this.E0, -z + this.N0); }
  /** world -> OSGB36 National Grid (EPSG:27700) easting/northing. */
  toOSGB(x, z) { return { E: x + this.E0 + this.osgbShift.se, N: -z + this.N0 + this.osgbShift.sn }; }
  fromOSGB(E, N) { return { x: E - this.osgbShift.se - this.E0, z: -(N - this.osgbShift.sn - this.N0) }; }
}

/** Format an OSGB coordinate as a grid reference, e.g. "TM 30251 33918". */
export function gridRef(E, N, digits = 10) {
  const e100k = Math.floor(E / 100000), n100k = Math.floor(N / 100000);
  let l1 = (19 - n100k) - (19 - n100k) % 5 + Math.floor((e100k + 10) / 5);
  let l2 = (19 - n100k) * 5 % 25 + e100k % 5;
  if (l1 > 7) l1++; if (l2 > 7) l2++;
  const letters = String.fromCharCode(l1 + 65, l2 + 65);
  const d = digits / 2;
  const e = Math.floor((E % 100000) / 10 ** (5 - d)).toString().padStart(d, '0');
  const n = Math.floor((N % 100000) / 10 ** (5 - d)).toString().padStart(d, '0');
  return `${letters} ${e} ${n}`;
}
/** Parse "TM 30251 33918" -> {E, N}. */
export function parseGridRef(ref) {
  const m = ref.trim().toUpperCase().match(/^([A-HJ-Z])([A-HJ-Z])\s*(\d+)\s*(\d+)$/);
  if (!m) throw new Error('bad grid ref ' + ref);
  let l1 = m[1].charCodeAt(0) - 65, l2 = m[2].charCodeAt(0) - 65;
  if (l1 > 7) l1--; if (l2 > 7) l2--;
  const e100k = ((l1 - 2) % 5) * 5 + (l2 % 5);
  const n100k = (19 - Math.floor(l1 / 5) * 5) - Math.floor(l2 / 5);
  const d = m[3].length;
  return { E: e100k * 100000 + Number(m[3]) * 10 ** (5 - d), N: n100k * 100000 + Number(m[4]) * 10 ** (5 - d) };
}
