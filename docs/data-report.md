# Data validation report

Generated 2026-10-09T12:47:56.847Z from `data`. OSM data timestamp(s): 2026-10-08T20:21:06.000Z.

| Group | Check | Result | Detail |
|---|---|---|---|
| Coverage | Tiles in the configured extent present | WARN | 88 of 90; missing -5_4 -4_4 (tiles entirely at sea have no data and are expected to be missing) |
| Coverage | Geographic bounds of buildings and roads | INFO | 51.9342, 1.26182 to 52.01736, 1.4181 (WGS84) |
| Coverage | Feature counts | PASS | {"buildings":9841,"roads":3109,"namedRoads":928,"areas":1202,"lines":581,"pois":713,"coastlineWays":107,"trees":0} |
| Attributes | Building height/levels/roof/material tag coverage | INFO | {"height":"0.0%","levels":"1.8%","estimated":"98.2%","roofShape":"1.4%","material":"0.0%","roadWidths":"138 of 3109","sidewalkTagged":"28 of 2175 car roads"} |
| Names | Expected street names present | PASS | found 15/16; missing: View Point Road |
| Names | Landmark in OSM: Felixstowe Pier | PASS | w28724732 (pier) |
| Names | Landmark in OSM: Spa Pavilion | PASS | w240664453 (building) |
| Names | Landmark in OSM: Landguard Fort | PASS | w32007009 (historic) |
| Names | Landmark in OSM: Seafront Gardens | WARN | not found by name |
| Names | Landmark in OSM: Hamilton Gardens | WARN | not found by name |
| Names | Landmark in OSM: Cliff Gardens | WARN | not found by name |
| Names | Landmark in OSM: Felixstowe station | PASS | n25685821 (station) |
| Control points | Landguard Fort (NHLE 1030415, Grade I) | PASS | nearest OSM building relation1812042 is under the point (contains it) (tolerance 15 m) |
| Control points | Felixstowe station buildings (NHLE 1284364, Grade II) | PASS | nearest OSM building way357281655 is under the point (contains it) (tolerance 15 m) |
| Control points | Felixstowe Pier landward end (Suffolk HER MXS19251, TM 30251 33918) | WARN | nearest OSM pier w28724732 is 88.8 m away (tolerance 60 m) |
| Control points | OSM station node vs. listed station building | INFO | 169 m apart (the operational station and the listed 1898 building need not coincide) |
| Geometry | Duplicate building footprints | PASS | none |
| Geometry | Car-road centre lines crossing building footprints | WARN | 43 e.g. road 5938611×building 506430487, road 688146024×building 506426480, road 688146024×building 506426480, road 347644375×building 350995923, road 4728656×building 488445151, road 4717827×building 488445030, road 4747962×building 506431048, road 4748294×building 506430917, road 5938638×building 506431819, road 6131284×building 506431144 (often legitimate: arches, canopies, petrol stations) |
| Geometry | Coastline ways present | PASS | 107 coastline way references across tiles |
| LiDAR | Terrain grid | PASS | 121 chunks of 1000 m @ 2 m, -2–29.35 m ODN, 18370662 cells with data, source: National LIDAR Programme DTM 2023; National LIDAR Programme DTM 2020 |
| LiDAR | OSM ↔ LiDAR alignment | PASS | {"samplePoints":972825,"scoreAtHelmert":0.529,"bestOffsetE":0,"bestOffsetN":2.25,"bestScore":0.62} |
| LiDAR | Ground heights (m ODN) at reference points | INFO | Cliff Gardens 8.49, station 20.32, Landguard Fort 2.9, pier landward end -2 |
| LiDAR | Water-surface returns replaced by sea bed | INFO | 7536643 |

Street names found (first 60): Academy Terrace, Adams Road, Adastral Close, Addington Road, Admiralty Pier, Albert Walk, Aldringham Mews, Aleston Street, Alexandra Road, Allens Drive, Andrew Close, Anne Street, Anzani Avenue, Arwela Road, Ascot Drive, Ash Ground Close, Ashtree Close, Ataka Road, Avocet Mews, Back Lane, Bacton Road, Barnfield, Barons Close, Barton Road, Bath Hill, Bath Road, Battery Lane, Bawdsey Close, Beach Road East, Beach Road West, Beach Station Road, Beacon Field, Beatrice Avenue, Bent Hill, Berners Road, Bigod Terrace, Bishops Close, Black Barns, Blofield Road, Blofield Track, Bloomfield Road, Blue Barn Close, Bluebell Way, Blyford Way, Boxford Court, Brackley Close, Brandon Road, Bredfield Close, Brick Kiln Close, Bridge Road, Brightwell Close, Brinkley Way, Bristol Hill, Brook Lane, Broom Field, Brotherton Avenue, Brownlow Road, Bryon Avenue, Buregate Road, Burnham Close