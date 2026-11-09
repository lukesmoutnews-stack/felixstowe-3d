// Signal-controlled (pelican) pedestrian crossings, from OSM highway=crossing + crossing=traffic_signals nodes.
// The one on Undercliff Road West outside Rock Around The Shop (node 25685835, at the Leisure Centre side) is photographed in the user's
// Street View captures of Sept 2026: two rows of metal studs across the carriageway, a stop line on each approach, white zig-zag
// lines either side along the kerbs, red tactile paving at the kerb on both pavements, and navy signal poles on both pavements with
// a traffic head facing each direction of approach (green lit in the photo), a pedestrian head across the road and a push-button box.
// Dimensions are estimates from the photos, not surveyed.
import * as THREE from 'three';
import { Geo } from './seafront.js';
import { distToSegment } from '../geo/polygon.js';
import { ROAD } from './road-surface.js';

const std = (o) => new THREE.MeshStandardMaterial(o);
let M = null;
function mats() {
  if (M) return M;
  const off = { polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 };
  M = {
    white: std({ color: 0xf3f3ee, roughness: 0.7, ...off }), tactile: std({ color: 0xc4574e, roughness: 0.9, ...off }),
    navy: std({ color: 0x1b2a55, roughness: 0.45, metalness: 0.5 }), black: std({ color: 0x15171a, roughness: 0.5, metalness: 0.3 }),
    green: std({ color: 0x2fe06a, emissive: 0x1fa04a, emissiveIntensity: 0.9, roughness: 0.4 }), redOff: std({ color: 0x4a1414, roughness: 0.6 }), amberOff: std({ color: 0x4a3a12, roughness: 0.6 }),
    redOn: std({ color: 0xff3a30, emissive: 0xc01810, emissiveIntensity: 0.9, roughness: 0.4 }), yellow: std({ color: 0xf0c52f, roughness: 0.6 }), steel: std({ color: 0xb8bcc0, roughness: 0.4, metalness: 0.7 }),
  };
  return M;
}

export const isPelican = (p) => p.kind === 'crossing' && p.tags && p.tags.crossing === 'traffic_signals';

/** @returns {{group, colliders}|null} */
export function buildPelican(p, roads, ctx) {
  let best = null;
  for (const r of roads) { if (r.footOnly || r.car === false) continue; for (let i = 1; i < r.pts.length; i++) { const d = distToSegment(p.x, p.z, r.pts[i - 1][0], r.pts[i - 1][1], r.pts[i][0], r.pts[i][1]); if (d.d < 4 && (!best || d.d < best.d)) best = { ...d, r, i }; } }
  if (!best) return null;
  const a = best.r.pts[best.i - 1], b = best.r.pts[best.i], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L, vx = -uz, vz = ux; // v: to the right of the direction of travel
  const cx = best.cx, cz = best.cz, hw = (best.r.width || 6) / 2, m = mats();
  const surf = (x, z) => ctx.net?.surface(x, z)?.y ?? ctx.ground(x, z);
  const at = (s, l) => [cx + ux * s + vx * l, cz + uz * s + vz * l];
  const G = { white: new Geo(), tactile: new Geo(), navy: new Geo(), black: new Geo(), green: new Geo(), redOff: new Geo(), amberOff: new Geo(), redOn: new Geo(), yellow: new Geo(), steel: new Geo() }, colliders = [];
  const bx = (k, s, l, y0, y1, hs, hl, ang = 0) => { const [x, z] = at(s, l), c = Math.cos(ang), sn = Math.sin(ang); G[k].box(x, y0 + (y1 - y0) / 2, z, ux * c - uz * sn * 0 + vx * sn, uz * c + vz * sn, hs, (y1 - y0) / 2, hl); };
  const road = (s, l) => surf(...at(s, l));
  // road studs: two rows across the carriageway
  for (const s of [-1.3, 1.3]) for (let l = -hw + 0.4; l <= hw - 0.3; l += 0.5) bx('white', s, l, road(s, l) + 0.015, road(s, l) + 0.045, 0.07, 0.07);
  // stop lines: each lane its own half (traffic keeps left: heading +u uses l < 0)
  for (const sg of [-1, 1]) { const s = sg * 3.0; const l0 = sg < 0 ? -hw : 0.05, l1 = sg < 0 ? -0.05 : hw; for (let l = l0 + 0.3; l < l1; l += 0.6) bx('white', s, l, road(s, l) + 0.01, road(s, l) + 0.025, 0.1, 0.3); }
  // zig-zag lines along both kerbs on each approach
  for (const sg of [-1, 1]) for (const ls of [-1, 1]) { const l = ls * (hw - 0.3); for (let k = 0; k < 12; k++) { const s = sg * (3.8 + k * 0.85); bx('white', s, l, road(s, l) + 0.01, road(s, l) + 0.025, 0.55, 0.06, (k % 2 ? 1 : -1) * 0.5); } }
  // tactile paving at the kerb on both pavements; navy signal poles
  for (const ls of [-1, 1]) {
    const l = ls * (hw + ROAD.kerbW + 0.55), y = surf(...at(0, l));
    bx('tactile', 0, l, y + 0.012, y + 0.03, 1.2, 0.6);
    const ps = 1.9, pl = ls * (hw + ROAD.kerbW + 0.5), py = surf(...at(ps, pl)); // pole just along from the crossing, on the kerb side of the pavement
    bx('navy', ps, pl, py, py + 3.2, 0.06, 0.06);
    for (const d of [1, -1]) { // traffic head each way, back to back on the pole: red, amber, green aspects (green lit)
      bx('black', ps + d * 0.17, pl, py + 2.35, py + 3.05, 0.09, 0.15);
      bx('redOff', ps + d * 0.27, pl, py + 2.8, py + 2.95, 0.02, 0.07); bx('amberOff', ps + d * 0.27, pl, py + 2.62, py + 2.77, 0.02, 0.07); bx('green', ps + d * 0.27, pl, py + 2.44, py + 2.59, 0.02, 0.07);
    }
    // pedestrian head and push-button box facing the crossing
    bx('black', ps - 0.0, pl - ls * 0.12, py + 1.85, py + 2.3, 0.15, 0.06); bx('redOn', ps, pl - ls * 0.18, py + 2.08, py + 2.24, 0.1, 0.02);
    bx('steel', ps + 0.2, pl - ls * 0.1, py + 1.05, py + 1.4, 0.07, 0.07); bx('yellow', ps + 0.2, pl - ls * 0.17, py + 1.15, py + 1.28, 0.05, 0.015);
    const [qx, qz] = at(ps, pl); colliders.push({ type: 'circle', x: qx, z: qz, r: 0.12, y0: py - 0.3, top: py + 3.2, kind: 'signal' });
  }
  const group = new THREE.Group(); group.name = 'pelican:' + p.id;
  for (const [k, g] of Object.entries(G)) { const me = g.mesh(m[k]); if (me) { me.castShadow = k === 'navy' || k === 'black'; group.add(me); } }
  return { group, colliders };
}
