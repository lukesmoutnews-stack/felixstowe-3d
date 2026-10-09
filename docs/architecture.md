# Architecture decision record

## Decision

One rendering engine: **three.js (r186, vendored, plain ES modules, no build step)**, with a custom geographic pipeline that turns OSM and EA LiDAR into a local metric world. No Cesium, no Google tiles, no second engine.

### Options considered

| | three.js (chosen) | CesiumJS | Babylon.js |
|---|---|---|---|
| Geographic coordinates | Own frame (below); simple and precise for a 6 km town | Native globe/ECEF; excellent | Own frame |
| Terrain | Own heightmap from LiDAR | Native terrain + 3D Tiles | Own |
| Procedural buildings, materials | Full control | Possible but fights the tile model | Full control |
| Character, car, collision | Hand-written 2.5D (enough for a town) | Awkward: globe camera, ECEF physics | Built-in physics plugins |
| Size / start-up | ~0.7 MB | Several MB | ~3 MB |
| Main reason | Matches the reference's proven stack; game feel and art direction need full control | Best only if streaming Google/Cesium tiles, which the licensing rules out | Comparable; no decisive advantage |

## Coordinate frame

- Source CRS: WGS84 lat/lon (OSM, Overture; practically ETRS89 in the UK). EA LiDAR: OSGB36 British National Grid, EPSG:27700, heights in metres ODN.
- World frame: lat/lon projected with the National Grid Transverse Mercator parameters on the GRS80 ellipsoid ("ETRS89 TM", step one of OSTN15), minus a fixed origin at 51.9600 N, 1.3500 E. Three.js axes: x = grid east, y = up (m ODN when terrain is loaded), z = grid south. Implementation `src/geo/projection.js`, verified against the Ordnance Survey worked example to 0.3 mm.
- Grid north differs from true north by about 2.6° at Felixstowe (meridian convergence). The map and minimap are grid-north-up; this is noted on the map.
- OSGB36 relation: EPSG:27700 = ETRS89 TM + a smooth shift (≈ +103 m E, −77 m N here) that varies by centimetres across the town. It starts as an OS Helmert estimate (±3–5 m) and `tools/lidar.mjs` calibrates it by matching LiDAR building heights to OSM footprints (on synthetic data it recovered a planted 3.0/−2.0 m offset to within 0.25–0.5 m).
- Precision: the whole town lies within ±6 km of the origin, so float32 GPU coordinates resolve better than 1 mm.

## Data flow

```mermaid
flowchart LR
  subgraph Offline tools (Node, no deps)
    OP[Overpass API] --> FO[tools/fetch-osm.mjs] --> T[(data/tiles/i_j.json)]
    EA[EA LiDAR DTM/DSM zips] --> LI[tools/lidar.mjs] --> TR[(terrain.json/.bin\nbuilding-heights.json\ntrees.json)]
    T --> LI
  end
  subgraph Browser
    TS[TileSource: static → cache → live Overpass] --> P[parseOverpass + buildFeatures\nsrc/geo/osm.js]
    P --> C[coastline → land polygons\nsrc/geo/coast.js]
    P & C --> W[World.buildTile\nground · areas · roads · rail · pier · buildings · barriers · props · trees]
    TR --> TE[Terrain heightAt] --> W
    W --> M[Merged meshes per 250 m chunk × material]
    W --> IDX[Spatial grids: walls, posts, roads, footprints, water]
    IDX --> PH[Player · Vehicle · Camera collision]
    P --> MAP[Map/minimap canvases]
    M & PH --> R[three.js renderer]
  end
  T --> TS
```

## Components

- **Data ingestion** (`src/data/tile-source.js`, `tools/fetch-osm.mjs`): 1 km tiles in the world frame; one shared Overpass query; tiles listed in `data/manifest.json` load from disk, others from browser cache or live Overpass (sequential, cached).
- **Geographic processing** (`src/geo/`): Overpass JSON → features with OSM ids; multipolygon assembly; tag interpretation with provenance flags (`heightSource`, `roofShapeSource`, `widthSource`, `sidewalkSource`); coastline-to-land polygons per tile (land on the left of the way).
- **Terrain** (`tools/lidar.mjs`, `src/world/terrain.js`): DTM resampled to a 2 m Int16 grid in OSGB coordinates; bilinear sampling. Without it the ground is flat at 0 m and the sea sits just below.
- **Buildings** (`src/world/buildings.js`): extruded real footprints; roofs from a "minimum of planes" model on the footprint's oriented box (gabled, hipped, pyramidal, skillion) with exact gable walls, an inset hip roof for irregular footprints, flat roofs with parapets; chimneys; shopfront ground floors where OSM has shop/amenity nodes inside the footprint.
- **Materials** (`src/world/textures.js`, `materials.js`): canvas-generated PBR textures with normal and roughness maps (brick bonds sized to real bricks, sash/casement windows per 3.2 m bay and 2.9 m storey, flint, render, slate, clay and pan tiles, asphalt, paving, block paving, kerbs, sand, shingle, grass, concrete, timber decking); world-space UVs; a shader macro-variation term breaks tiling.
- **Roads**: ribbons from centre lines with mitred joins and junction discs; pavement, kerb, carriageway and markings are separate layers that never write depth and are ordered by `renderOrder`, so overlapping junction geometry cannot z-fight. Zebra stripes and Belisha beacons only where OSM tags a zebra crossing.
- **Worker parsing**: Overpass JSON → features → land polygons runs in a module Web Worker (`src/data/parse-worker.js`), falling back to the main thread.
- **Terrain streaming**: `tools/lidar.mjs` writes 1 km Int16 chunks aligned to the National Grid; the game loads the chunks under each tile before building it. Near ground is a 5 m mesh, a 25 m mesh beyond 700 m.
- **Data workflow**: `tools/setup-data.mjs` → `osm-from-pbf.mjs` (or `fetch-osm.mjs`), `fetch-lidar.mjs` → `lidar.mjs`, optional `merge-overture.mjs`, then `validate-data.mjs`.
- **Streaming/performance**: tiles within 1.3 km load nearest-first and unload beyond 2.4 km; geometry merged per 250 m chunk and material; chunk distance culling plus frustum culling; instancing for trees and props; shared materials; geometry disposal on unload.
- **Play** (`src/play/`): 2.5D collision of circles against wall segments with vertical extents (step-over, walk-under), walkability (land, beach, pier deck; not the sea or inland water), kinematic bicycle-model car, three camera modes with wall pull-in.
- **Interaction & content** (`src/content/landmarks.js`, `src/ui/`): landmarks matched by OSM name at runtime; facts carry source links; journal persisted in localStorage.
- **Hosting**: static files only (any static host or CDN). No server, no keys.
