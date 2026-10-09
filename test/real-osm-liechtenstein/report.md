# Data validation report

Generated 2026-10-09T11:05:23.406Z from `test/real-osm-liechtenstein`. OSM data timestamp(s): 2013-08-03T19:00:02.000Z.

| Group | Check | Result | Detail |
|---|---|---|---|
| Coverage | Tiles in the configured extent present | PASS | 30 of 30 |
| Coverage | Geographic bounds of buildings and roads | INFO | 47.10553, 9.47554 to 47.16373, 9.57273 (WGS84) |
| Coverage | Feature counts | PASS | {"buildings":269,"roads":587,"namedRoads":371,"areas":52,"lines":1,"pois":111,"coastlineWays":0,"trees":0} |
| Attributes | Building height/levels/roof/material tag coverage | INFO | {"height":"0.0%","levels":"0.0%","estimated":"100.0%","roofShape":"0.0%","material":"0.0%","roadWidths":"1 of 587","sidewalkTagged":"0 of 453 car roads"} |
| Geometry | Duplicate building footprints | PASS | none |
| Geometry | Car-road centre lines crossing building footprints | PASS | 0 (often legitimate: arches, canopies, petrol stations) |
| Geometry | Coastline ways present | INFO | 0 coastline way references across tiles |
| LiDAR | Terrain processed | WARN | no terrain in manifest – run node tools/fetch-lidar.mjs |

