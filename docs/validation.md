# Validation, visual QA and performance

## Status of real-data validation (9 October 2026)

**Real Felixstowe data has been downloaded, processed, validated and rendered.** The development sandbox cannot reach geographic hosts, so the data tools run on a GitHub-hosted runner (`.github/workflows/fetch-data.yml`), which commits the prepared data, its run log and `docs/data-report.md` to the `data` branch. Four runs succeeded (3–5 minutes each); the figures below are from run 4.

| Item | Result (evidence: `docs/data-report.md`, `data/run-log.txt`) |
|---|---|
| OSM | Geofabrik Suffolk extract, data timestamp 2026-10-08 20:21 UTC; 88 of 90 tiles (the 2 missing tiles are entirely at sea) |
| Counts | 9,841 buildings, 3,109 roads (928 named), 1,202 areas, 713 POIs, 107 coastline ways |
| Overture | 15,063 buildings in the box; 12,517 already from OSM; 2,545 added where they overlap no OSM footprint by >20% |
| LiDAR | EA National LiDAR Programme 1 m DTM and DSM: 2020 for TM2530, TM3030, TM2535, TM3035; 2023 for TM2030, TM2035 |
| Terrain | 121 chunks of 1 km at 2 m; −2 to 29.35 m ODN; 7.5 M water-surface cells replaced by sea bed using the OSM coastline |
| Alignment | OSM building edges vs. LiDAR DSM steps: score 0.529 at the Helmert shift, best 0.620 at E+0, N+2.25 m (applied) |
| Measured | 8,453 building heights from DSM−DTM; 11,952 trees; 10,605 container slots in mapped yards |
| Street names | 15/16 expected found; View Point Road not in the OSM extract |
| Control points | Landguard Fort (NHLE 1030415) and station (NHLE 1284364) points lie inside the matching OSM footprints: PASS. Pier HER point 88.8 m from the OSM pier: WARN (to investigate: the HER point may mark a different part of the structure than the OSM way) |
| Ground heights | Cliff Gardens 8.49 m, station 20.32 m, Landguard Fort 2.9 m ODN |
| Names not in OSM | Seafront Gardens, Hamilton Gardens, Cliff Gardens are not tagged with these names |
| Geometry | No duplicate footprints; 43 car-road centre lines cross building footprints (to review; some are arches or canopies) |

Checked by eye in the game (SwiftShader screenshots): the pier runs out from the promenade over the beach; groynes, sea and cliff-top terrain behind the seafront; Hamilton Road and Stanley Road streets with brick and render terraces; Landguard Fort footprint in brick; the port's crane row along the quay with 12 m container rows behind it; the map shows the real street names.

## Test results

### Unit tests – `node test/unit.mjs` – 14/14 pass
Projection against the Ordnance Survey worked example (0.3 mm); grid references; frame round-trip (< 1 mm); grid convergence 2.64°; Helmert shift; coastline orientation, reversal, inlet, dangling end, island; inset roofs; oriented boxes; tag parsing and provenance; multipolygon assembly; Overpass JSON ids.

### Data-tool tests – `node test/tools.test.mjs` – 11/11 pass (12 with `--pbf`)
Against local mock services: fetch-osm retries after HTTP 429, writes tiles with licence and query box, updates the manifest and skips existing tiles; fetch-lidar finds the six OS tiles, prefers the newest National LiDAR Programme DTM over the composite, falls back where NLP is missing, reports tiles without a DSM and downloads one zip per product. osm-from-pbf converts a real PBF.

### LiDAR processing – synthetic GeoTIFF/ASC rasters
LZW and Deflate GeoTIFF decode bit-exactly; ASC to 0.005 m. Alignment search recovered a planted +3.0 m E / −2.0 m N offset as +2.75 / −1.75 m. Building heights measured for 1,900/1,900 footprints. Land gaps filled from neighbours using the OSM coastline; sea gaps set to the sea bed. Container stacks extracted from DSM−DTM in the mapped yard (338 cells → 105 blocks). Tree detection gives no false positives on building edges or stacks after the crown, clearance and yard filters. Terrain written as 1 km chunks and streamed by the game.

### Browser tests – `node tools/test-headless.mjs` (Chromium, SwiftShader software GL, 1280×720)

| Check | Synthetic fixture | Real OSM: Vaduz 2013 | Synthetic + LiDAR terrain | **Real Felixstowe (run 4)** |
|---|---|---|---|---|
| Loads and becomes enterable | Pass (2.7–3.2 s) | Pass (2.7–3.1 s) | Pass (3.9–4.1 s) | Pass (6.0–6.6 s) |
| Player walks (6 m in 3 s) | Pass | Pass | Pass | Pass |
| Collision stops at a wall (0.35 m) | Pass | Pass | Pass | Pass |
| Pier deck walkable, cannot walk into the sea | Pass | n/a (no pier) | Pass (deck 6.5 m ODN over −1.2 m sea bed) | Pass (deck 1.2 m ODN over −2 m sea bed; deck height is approximate) |
| Enter, drive, handbrake, leave car; car never inside a building | Pass | Pass | Pass | Pass |
| Map centred on player in the same frame | Pass | Pass | Pass | Pass |
| No console errors | Pass | Pass | Pass | Pass |
| **Total** | **13/13** | **12/12** (pier skipped) | **13/13** | **13/13** |

### Fixes made in this round
The first real-data browser run failed both pier checks: the test picked its point from the deck's bounding box, which lies off the deck for Felixstowe's diagonal pier. The harness now samples points inside the deck polygon and walks towards the nearest edge, which works for piers at any bearing; the game itself was unchanged. Screenshots of heavy software-rendered scenes needed a longer timeout in the test harness. Bay-window colliders confused the collision test (now only outer rings are used and rings are normalised to counter-clockwise); unlisted tiles in a prepared data set no longer trigger live Overpass requests; terrain blocks now align with the 250 m culling chunks.

## Geographic validation checklist (first real-data run)

`tools/validate-data.mjs` automates most of this and writes `docs/data-report.md`:

| # | Check | How | Tolerance |
|---|---|---|---|
| 1 | All tiles in the extent present | manifest vs. extent | sea-only tiles may be absent |
| 2 | Bounds, feature counts, tag completeness | computed | report |
| 3 | 16 expected street names (Hamilton Road, Undercliff Road East/West, High Road East/West, Sea Road, Orwell Road, Bath Road, Garrison Lane, Langer Road, View Point Road, Ferry Road, Walton Avenue, Dock Road, Beach Station Road, Cliff Road) | names in OSM | ≤ 2 missing |
| 4 | Landmarks by name (pier, Spa Pavilion, Landguard Fort, Seafront/Hamilton/Cliff Gardens, station) | names in OSM | present |
| 5 | Control points: Landguard Fort NHLE 1030415, station NHLE 1284364, Cliff Gardens NHLE 1001220, pier HER MXS19251 (TM 30251 33918) | distance to matching OSM feature | 60–120 m (records are centroids) |
| 6 | Duplicate footprints; car roads crossing buildings | geometry | report |
| 7 | Coastline present | OSM | required |
| 8 | LiDAR: grid, alignment score and offset, ground heights at Cliff Gardens / station / fort | terrain files | offset < 5 m |

Then by eye, in the game: seafront cliff below Cliff Gardens; Hamilton Road descending to the sea; pier position and bearing; Landguard Fort footprint; port crane rows along the quay.

## Visual quality checklist

| Item | Status (synthetic and Vaduz data) |
|---|---|
| Road, pavement, kerb, marking materials | Pass; layered without z-fighting |
| Varied building geometry | Pass: gabled/hipped/inset/flat roofs with 0.3 m eaves, chimneys, gable walls, canted bay windows, front doors on the street side, shopfront fascias, roller doors on industrial buildings |
| Facade variety | 10 materials × 3 window styles, string courses, 7 door colours, render tints |
| Beach huts, groynes, sea walls | Implemented (huts painted when OSM tags `building=beach_hut`) |
| Container yards | From LiDAR only; colours illustrative |
| Floating buildings / holes / missing textures | None seen |
| Real Felixstowe appearance | Checked by eye on SwiftShader screenshots (seafront, town streets, fort, port); not yet compared side by side with photographs |

## Performance log

| Date | Renderer | Scene | Result |
|---|---|---|---|
| 2026-10-09 | SwiftShader (CPU) | synthetic, overview 600 m | ~27 fps; 480 draws; 115k tris |
| 2026-10-09 | SwiftShader | synthetic + terrain | 379–470 draws; 176–262k tris (5 m terrain mesh near, 25 m beyond 700 m) |
| 2026-10-09 | SwiftShader | real OSM, Vaduz | 311–339 draws; 40–44k tris; load 2.7–3.1 s |
| 2026-10-09 | SwiftShader | real Felixstowe, spawn at the pier | 1,390 draws, 2.77 M tris (third person); 1,681 draws, 2.63 M tris (overview); load 6.0–6.6 s; 9–15 ms/frame |

Real-GPU frame rate and memory are **not measured**. Download size of the prepared data: 76 MB raw (`data/`), 28 MB as the web copy (`tools/make-web-data.mjs`: terrain chunks as gzipped row deltas, 60.7 → 7.9 MB before base64). The Felixstowe scene is much heavier than the test scenes (draw calls and triangles above); reducing it is on the roadmap. Tile parsing now runs in a Web Worker; doors/markings hide beyond ~530 m, props beyond 450 m, trees beyond 1 km.
