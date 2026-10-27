// Keeps the coarse ground meshes (5 m base grid, beach cells, 6 m overlay triangles) from poking through
// footpaths and the promenade.
//
// The road network grades the terrain (roads.grade) to just below each path, but the base mesh only samples
// that graded height at its vertices, so a triangle that spans the edge of a 6 m wide path interpolates
// between a lowered vertex under the path and a higher vertex outside it, and the grass shows through the
// paving as green wedges (worst along the promenade, where the sea wall bank rises right next to it).
// meshY() lowers any mesh vertex that has a footpath surface within 7.5 m to a little below the lowest such
// surface, never by more than 0.5 m, so the interpolated mesh stays under the paving.

const RADII = [0, 2.5, 5, 7.5];
const DIRS = 8;

export function makeMeshY(ctx) {
  const net = ctx && ctx.net;
  if (!net || !net.surface) return (x, z, y) => y;
  return (x, z, y) => {
    let s = Infinity;
    for (const r of RADII) {
      const n = r === 0 ? 1 : DIRS;
      for (let k = 0; k < n; k++) {
        const a = (k / DIRS) * Math.PI * 2 + r * 0.3, sf = net.surface(x + Math.cos(a) * r, z + Math.sin(a) * r);
        if (sf && sf.kind === 'path' && sf.y < s) s = sf.y;
      }
    }
    if (s === Infinity) return y;
    return Math.max(Math.min(y, s - 0.1), y - 0.5);
  };
}
