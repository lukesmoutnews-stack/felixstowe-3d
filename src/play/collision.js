// 2.5D collision: circles (player / car axles) against building wall segments, barriers
// and posts, with vertical extents so you can walk under overhangs and over low kerbs.

import { distToSegment, pointInRing } from '../geo/polygon.js';

export class Collision {
  constructor(world) { this.world = world; }

  /** Push a circle out of nearby colliders. Returns {x, z, hit, normal}. */
  resolve(x, z, r, yFeet, yHead, iterations = 3) {
    let hit = false, nx = 0, nz = 0;
    const w = this.world;
    for (let it = 0; it < iterations; it++) {
      let moved = false;
      for (const c of w.edgeGrid.query(x - r - 1, z - r - 1, x + r + 1, z + r + 1)) {
        if (c.top != null && c.top < yFeet + 0.45) continue;           // low enough to step over
        if (c.y0 != null && c.y0 > yHead) continue;                     // above our head
        const d = distToSegment(x, z, c.a[0], c.a[1], c.b[0], c.b[1]);
        const minD = r + (c.r || 0);
        if (d.d < minD) {
          let dx = x - d.cx, dz = z - d.cz, L = Math.hypot(dx, dz);
          if (L < 1e-6) { // exactly on the line: push along segment normal
            const sx = c.b[0] - c.a[0], sz = c.b[1] - c.a[1], sl = Math.hypot(sx, sz) || 1; dx = sz / sl; dz = -sx / sl; L = 1;
          }
          const push = minD - d.d;
          x += (dx / L) * push; z += (dz / L) * push; nx += dx / L; nz += dz / L; hit = moved = true;
        }
      }
      for (const c of w.circleGrid.query(x - r - 1, z - r - 1, x + r + 1, z + r + 1)) {
        const dx = x - c.x, dz = z - c.z, L = Math.hypot(dx, dz), minD = r + c.r;
        if (L < minD && L > 1e-6) { x += (dx / L) * (minD - L); z += (dz / L) * (minD - L); nx += dx / L; nz += dz / L; hit = moved = true; }
      }
      if (!moved) break;
    }
    const nl = Math.hypot(nx, nz) || 1;
    return { x, z, hit, normal: [nx / nl, nz / nl] };
  }

  /** True if (x,z) is inside a building footprint whose vertical extent covers y. */
  insideBuilding(x, z, y = null) {
    for (const b of this.world.buildingGrid.query(x, z, x, z)) {
      if (b.b.minHeight > 2.2) continue;
      if (pointInRing(x, z, b.outer)) { if (y == null) return b; const top = this.world.ground(b.b.cx, b.b.cz) + b.b.height + 6; if (y < top) return b; }
    }
    return null;
  }

  /** Line of sight in plan view (blocked by building walls taller than eye height). */
  lineOfSight(x0, z0, x1, z1, eyeY, ignoreId = null) {
    const minX = Math.min(x0, x1), maxX = Math.max(x0, x1), minZ = Math.min(z0, z1), maxZ = Math.max(z0, z1);
    for (const c of this.world.edgeGrid.query(minX, minZ, maxX, maxZ)) {
      if (c.kind !== 'building' || c.id === ignoreId) continue;
      if (c.top < eyeY) continue;
      if (segX([x0, z0], [x1, z1], c.a, c.b)) return false;
    }
    return true;
  }
}
function segX(p, q, a, b) {
  const o = (u, v, w) => (v[0] - u[0]) * (w[1] - u[1]) - (v[1] - u[1]) * (w[0] - u[0]);
  const d1 = o(a, b, p), d2 = o(a, b, q), d3 = o(p, q, a), d4 = o(p, q, b);
  return (d1 > 0) !== (d2 > 0) && (d3 > 0) !== (d4 > 0);
}
