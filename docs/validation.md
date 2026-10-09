# Validation, visual QA and performance

## Status of real-data validation (9 October 2026)

**Real Felixstowe data has not been downloaded, rendered or verified yet.** The development sandbox's egress proxy rejects every geographic host by organisation policy (Overpass, the OSM API and tiles, Geofabrik, Overture's S3/Azure buckets, environment.data.gov.uk, Google Cloud, Hugging Face: all `403 connect_rejected` at the proxy). Only GitHub and the npm/PyPI registries are reachable. This was confirmed with the proxy's own status endpoint, so it is a network policy, not an endpoint failure or a bug in the tools.

What was done instead:

- Every tool was made to run on a networked machine with one command (`node tools/setup-data.mjs`) and tested offline against mock services.
- The whole pipeline was run on **real OpenStreetMap data** for a different place (the 2013 Liechtenstein extract shipped with osm2pgsql's test suite, obtained through git), to exercise real tagging, multipolygons and road networks.
- A validator (`tools/validate-data.mjs`) was written so the first real download produces an evidence report (`docs/data-report.md`).

## Test results

### Unit tests – `node test/unit.mjs` – 14/14 pass
Projection against the Ordnance Survey worked example (0.3 mm); grid references; frame round-trip (< 1 mm); grid convergence 2.64°; Helmert shift; coastline orientation, reversal, inlet, dangling end, island; inset roofs; oriented boxes; tag parsing and provenance; multipolygon assembly; Overpass JSON ids.

### Data-tool tests – `node test/tools.test.mjs` – 11/11 pass (12 with `--pbf`)
Against local mock services: fetch-osm retries after HTTP 429, writes tiles with licence and query box, updates the manifest and skips existing tiles; fetch-lidar finds the six OS tiles, prefers the newest National LiDAR Programme DTM over the composite, falls back where NLP is missing, reports tiles without a DSM and downloads one zip per product. osm-from-pbf converts a real PBF.

### LiDAR processing – synthetic GeoTIFF/ASC rasters
LZW and Deflate GeoTIFF decode bit-exactly; ASC to 0.005 m. Alignment search recovered a planted +3.0 m E / −2.0 m N offset as +2.75 / −1.75 m. Building heights measured for 1,900/1,900 footprints. Land gaps filled from neighbours using the OSM coastline; sea gaps set to the sea bed. Container stacks extracted from DSM−DTM in the mapped yard (338 cells → 105 blocks). Tree detection gives no false positives on building edges or stacks after the crown, clearance and yard filters. Terrain written as 1 km chunks and streamed by the game.

### Browser tests – `node tools/test-headless.mjs` (Chromium, SwiftShader software GL, 1280×720)

| Check | Synthetic fixture | Real OSM: Vaduz 2013 | Synthetic + LiDAR terrain |
|---|---|---|---|
| Loads and becomes enterable | Pass (2.7–3.2 s) | Pass (2.7–3.1 s) | Pass (3.9–4.1 s) |
| Player walks (6 m in 3 s) | Pass | Pass | Pass |
| Collision stops at a wall (0.35 m) | Pass | Pass | Pass |
| Pier deck walkable, cannot walk into the sea | Pass | n/a (no pier) | Pass (deck 6.5 m ODN over −1.2 m sea bed) |
| Enter, drive, handbrake, leave car; car never inside a building | Pass | Pass | Pass |
| Map centred on player in the same frame | Pass | Pass | Pass |
| No console errors | Pass | Pass | Pass |
| **Total** | **13/13** | **12/12** (pier skipped) | **13/13** |

### Fixes made in this round
Screenshots of heavy software-rendered scenes needed a longer timeout in the test harness. Bay-window colliders confused the collision test (now only outer rings are used and rings are normalised to counter-clockwise); unlisted tiles in a prepared data set no longer trigger live Overpass requests; terrain blocks now align with the 250 m culling chunks.

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
| Real Felixstowe appearance | **Not yet checked** |

## Performance log

| Date | Renderer | Scene | Result |
|---|---|---|---|
| 2026-10-09 | SwiftShader (CPU) | synthetic, overview 600 m | ~27 fps; 480 draws; 115k tris |
| 2026-10-09 | SwiftShader | synthetic + terrain | 379–470 draws; 176–262k tris (5 m terrain mesh near, 25 m beyond 700 m) |
| 2026-10-09 | SwiftShader | real OSM, Vaduz | 311–339 draws; 40–44k tris; load 2.7–3.1 s |

Real-GPU frame rate, memory and real Felixstowe download sizes are **not measured**. Tile parsing now runs in a Web Worker; doors/markings hide beyond ~530 m, props beyond 450 m, trees beyond 1 km.
