// Generates test/fixtures/test-grid.json: a SYNTHETIC Overpass-format dataset placed at
// 0°N 0°E ("Null Island"). It is NOT Felixstowe and must never be presented as such.
// It exists so the full pipeline (parsing, coastline, roads, buildings, pier, props,
// collision, map) can be tested automatically without network access.

import { writeFileSync, mkdirSync } from 'node:fs';

const M_PER_DEG_LAT = 110574, M_PER_DEG_LON = 111320;
const ll = (x, z) => ({ lat: -z / M_PER_DEG_LAT, lon: x / M_PER_DEG_LON }); // x east, z south (metres)
let nid = 1, wid = 1, rid = 1;
const els = [];
const node = (x, z, tags) => { const p = ll(x, z); els.push({ type: 'node', id: nid++, ...p, tags }); };
const way = (pts, tags, closed = false) => {
  const ps = closed ? [...pts, pts[0]] : pts;
  const ids = ps.map(() => 100000 + nid++);
  els.push({ type: 'way', id: wid++, nodes: ids, geometry: ps.map(([x, z]) => ll(x, z)), tags });
  return wid - 1;
};
const rect = (cx, cz, w, d, rot = 0) => {
  const c = Math.cos(rot), s = Math.sin(rot);
  return [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([u, v]) => [cx + u * c - v * s, cz + u * s + v * c]);
};
let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

// coastline: south -> north (land on the left = west), slight bays
const coast = []; for (let z = 1600; z >= -1600; z -= 50) coast.push([255 + Math.sin(z / 140) * 18, z]);
way(coast, { natural: 'coastline' });
// beach + promenade
const beach = []; for (let z = 650; z >= -650; z -= 50) beach.push([205 + Math.sin(z / 140) * 6, z]);
for (let z = -650; z <= 650; z += 50) beach.push([290 + Math.sin(z / 140) * 18, z]);
way(beach, { natural: 'beach', surface: 'shingle', name: 'Test Beach' }, true);
way([[196, 650], [196, -650]], { highway: 'footway', name: 'Test Promenade', surface: 'paving_stones' });
// groynes
for (let z = -600; z <= 600; z += 120) way([[208, z], [300, z]], { man_made: 'groyne' });
// pier: polygon from the promenade out to sea
way([[198, -6], [430, -6], [430, 6], [198, 6]], { man_made: 'pier', name: 'Test Pier' }, true);
node(312, 0, { tourism: 'attraction', name: 'Test Pier' });
// road grid
const ns = [-480, -360, -240, -120, 0, 120];
const ew = [-540, -450, -360, -270, -180, -90, 0, 90, 180, 270, 360, 450, 540];
ns.forEach((x, i) => way(ew.map((z) => [x, z]), { highway: i === 3 ? 'primary' : 'tertiary', name: `Test Avenue ${i + 1}`, ...(i === 3 ? { ref: 'A0' } : {}) }));
ew.forEach((z, j) => way([[-480, z], [-360, z], [-240, z], [-120, z], [0, z], [120, z], [185, z]], { highway: j % 3 ? 'residential' : 'secondary', name: `Test Street ${j + 1}` }));
way([[185, 540], [185, -540]], { highway: 'unclassified', name: 'Test Undercliff Road' });
// pedestrian zone and footpaths
way([[-120, 45], [0, 45]], { highway: 'pedestrian', name: 'Test Walk', surface: 'paving_stones' });
way([[-470, -560], [-300, -620], [-100, -650]], { highway: 'path', surface: 'gravel' });
// zebra crossings, lamps, benches, bus stop, post box, phone box, bollards
node(0, 20, { highway: 'crossing', crossing: 'zebra' });
node(-240, -100, { highway: 'crossing', crossing_ref: 'zebra' });
for (let z = -500; z <= 500; z += 35) node(-112, z, { highway: 'street_lamp' });
for (let z = -600; z <= 600; z += 60) node(199, z, { amenity: 'bench' });
node(-112, 60, { highway: 'bus_stop', name: 'Test Bus Stop', shelter: 'yes' });
node(-128, 120, { amenity: 'post_box' }); node(-128, 150, { amenity: 'telephone' });
for (let k = 0; k < 6; k++) node(-60 + k * 1.6, 52, { barrier: 'bollard' });
// blocks of terraced houses on both sides of E-W streets
let bid = 0;
const exclude = [[-420, 400, 100, 70], [-120, 400, 90, 55], [80, 400, 50, 30], [60, -600, 260, 120], [-300, 225, 40, 30], [-180, -230, 30, 30], [150, 30, 34, 18], [40, 220, 40, 40]];
const excluded = (x, z) => exclude.some(([cx, cz, w, d]) => Math.abs(x - cx) < w / 2 + 6 && Math.abs(z - cz) < d / 2 + 6);
for (const z of ew.slice(0, -1)) {
  for (const [x0, x1] of [[-470, -370], [-350, -250], [-230, -130], [-110, -10], [10, 110], [130, 178]]) {
    const style = rnd();
    for (const side of [1, -1]) {
      const zz = z + side * (8.5 + 4.5);
      for (let x = x0 + 4; x + 6 < x1; x += 6.2) {
        if (excluded(x + 3, zz)) continue;
        const tags = { building: style < 0.5 ? 'terrace' : style < 0.75 ? 'house' : 'yes' };
        if (rnd() < 0.3) tags['building:levels'] = String(rnd() < 0.7 ? 2 : 3);
        if (rnd() < 0.1) tags['roof:shape'] = 'hipped';
        if (z === 0 && x0 === -110) { tags.building = 'retail'; tags['building:levels'] = '3'; }
        way(rect(x + 3, zz, 6, 9), tags, true); bid++;
      }
    }
  }
}
// shops on Test Street 7 (z = 0)
for (let x = -100; x < -20; x += 12.4) node(x + 3, -13, { shop: 'clothes', name: 'Test Shop' });
// an L-shaped building, a courtyard multipolygon, a church, a landmark pavilion
way([[20, 200], [60, 200], [60, 215], [35, 215], [35, 240], [20, 240]], { building: 'house' }, true);
const cy = way(rect(-300, 225, 40, 30), {}, true), cyIn = way(rect(-300, 225, 18, 12), {}, true);
els.push({ type: 'relation', id: rid++, members: [{ type: 'way', ref: cy, role: 'outer', geometry: rect(-300, 225, 40, 30).concat([rect(-300, 225, 40, 30)[0]]).map(([x, z]) => ll(x, z)) }, { type: 'way', ref: cyIn, role: 'inner', geometry: rect(-300, 225, 18, 12).concat([rect(-300, 225, 18, 12)[0]]).map(([x, z]) => ll(x, z)) }], tags: { type: 'multipolygon', building: 'apartments', 'building:levels': '4', name: 'Test Court' } });
way(rect(-180, -230, 14, 26, 0.3), { building: 'church', name: 'Test Church', 'roof:shape': 'gabled' }, true);
way(rect(150, 30, 34, 18), { building: 'yes', name: 'Test Pavilion', amenity: 'theatre', height: '9' }, true);
// park with mapped trees, a wood, a pond
way(rect(-420, 400, 100, 70), { leisure: 'park', name: 'Test Gardens' }, true);
for (let k = 0; k < 14; k++) node(-460 + rnd() * 80, 375 + rnd() * 50, { natural: 'tree', ...(k % 4 === 0 ? { leaf_type: 'needleleaved' } : {}) });
way(rect(-300, 620, 200, 70), { natural: 'wood' }, true);
way(rect(-400, 410, 20, 12), { natural: 'water' }, true);
way([[-480, 500], [-360, 500]], { natural: 'tree_row' });
// industrial estate with warehouses + railway + crane by the "quay"
way(rect(60, -600, 260, 120), { landuse: 'industrial', industrial: 'port', name: 'Test Container Yard' }, true);
way(rect(20, -600, 70, 40), { building: 'warehouse' }, true);
way(rect(120, -610, 50, 60), { building: 'industrial' }, true);
way([[-480, -680], [-200, -670], [100, -660], [180, -650]], { railway: 'rail' });
node(240, -580, { man_made: 'crane', 'crane:type': 'portal_crane' });
// boundary walls / fences / hedge
way([[-470, 300], [-370, 300]], { barrier: 'wall' });
way([[-350, 300], [-250, 300]], { barrier: 'fence' });
way([[-230, 300], [-130, 300]], { barrier: 'hedge' });
// parking + pitch
way(rect(80, 400, 50, 30), { amenity: 'parking' }, true);
way(rect(-120, 400, 90, 55), { leisure: 'pitch' }, true);

const out = {
  version: 0.6, generator: 'felixstowe-3d test fixture (synthetic)',
  osm3s: { timestamp_osm_base: 'synthetic', copyright: 'Synthetic test data – not real geography.' },
  fixtureMeta: { origin: { lat: 0, lon: 0 }, spawn: { name: 'Test Pier', lat: 0, lon: 0.0015 }, note: 'Synthetic test grid at Null Island. NOT Felixstowe.' },
  elements: els,
};
mkdirSync(new URL('./fixtures/', import.meta.url), { recursive: true });
writeFileSync(new URL('./fixtures/test-grid.json', import.meta.url), JSON.stringify(out));
console.log(`test-grid.json: ${els.length} elements, ${bid} terraced houses`);
