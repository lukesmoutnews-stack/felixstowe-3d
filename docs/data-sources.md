# Geographic data sources for Felixstowe

Checked 9 October 2026 from official pages (links inline). **Coverage of Felixstowe specifically could not be measured from the development sandbox**, because every geographic data host was blocked there. Items marked *to verify* are the first things to check on a networked machine; `node tools/fetch-osm.mjs` followed by the in-game Menu › Data panel produces the numbers.

## Inventory

### OpenStreetMap (primary source: roads, footprints, landcover, coast, POIs)
- Licence ODbL 1.0; attribution "© OpenStreetMap contributors" with a link to https://www.openstreetmap.org/copyright. Games may credit on a splash screen or menu; the app also shows it permanently on the HUD.
- Access: Overpass API (one query per 1 km tile, defined once in `src/config.js`). Policy: under ~10,000 queries and 1 GB per day, no parallel requests, identify the client, back off on 429/504, and cache (https://wiki.openstreetmap.org/wiki/Overpass_API). The browser path caches every tile in Cache Storage; `tools/fetch-osm.mjs` downloads sequentially with pauses for production.
- Bulk alternative (now the default in `tools/setup-data.mjs`): Geofabrik Suffolk extract, ~32 MB PBF, daily (https://download.geofabrik.de/europe/united-kingdom/england/suffolk.html), converted by `tools/osm-from-pbf.mjs` (dependency-free PBF reader, tested on the real 2013 Liechtenstein extract from the osm2pgsql test suite). One download replaces ~90 Overpass requests.
- Attributes present: geometry for every mapped feature. `height`, `building:levels`, `roof:shape`, `building:material` coverage in Felixstowe is *to verify*. The app counts the provenance of every building (Menu › Data) instead of assuming.

### Environment Agency LiDAR (terrain, building heights, trees)
- National LiDAR Programme: 1 m DTM, DSM, first-return DSM and point cloud for all of England, surveyed 2017–2023, 5 km GeoTIFF tiles in EPSG:27700 (https://www.data.gov.uk/dataset/f0db0249-f17b-4036-9e65-309148c97ce4/national-lidar-programme). OGL v3; attribution "© Environment Agency copyright and/or database right 2022. All rights reserved."
- LIDAR Composite DTM 1 m (2022): ~99% of England, surveys 2000–2022, heights above Ordnance Datum Newlyn. A WCS endpoint exists (listed in the catalogue) but its catalogue entry shows "No Licence Provided"; use the National LiDAR Programme tiles, whose OGL licence is explicit.
- Download portal: https://environment.data.gov.uk/survey (the older `DefraDataDownload` address and its api.agrimetrics host were retired in 2026, per the maintained LIDAR Downloader UK QGIS plugin, https://github.com/simonstoate/LidarDownloaderUK).
- Scriptable API used by `tools/fetch-lidar.mjs` (from that plugin's source, not formal Defra documentation): `POST /tiles/collections/survey/search` with a WGS84 GeoJSON polygon returns products per 5 km tile (`national_lidar_programme_dtm`, `national_lidar_programme_dsm`, `national_lidar_programme_first_return_dsm`, `lidar_composite_dtm`, …, each with a year); `GET {uri}` returns a ~70 MB zip; HTTP 500 means no data. Not reachable from the development sandbox, so tested only against a mock service.
- **Coverage check (computed, 9 Oct 2026):** the configured extent (51.93–52.00 N, 1.27–1.40 E) converts to OS grid TM 249 307 – TM 334 389, i.e. six 5 km tiles: TM2030, TM2530, TM3030, TM2035, TM2535, TM3035. All lie inside the 10 km squares TM23 and TM33, so those two squares do cover the whole extent (Landguard Point to Felixstowe Ferry, and the port to the west). Which products and survey years exist for them is reported in `data/lidar-raw/coverage.json` when the tool runs.
- WCS for the composite DTM exists (`…/spatialdata/lidar-composite-digital-terrain-model-dtm-1m/wcs`, coverage id ending `__Lidar_Composite_Elevation_DTM_1m`, EPSG:27700) but GetCoverage was not seen working, so it is not used.
- DTM = bare earth (terrain mesh). DSM − DTM = above-ground height (buildings, trees). Neither provides textures or game-ready buildings.

### Overture Maps (buildings and places)
- Buildings ODbL; Places CDLA-Permissive 2.0 (Foursquare part Apache 2.0). Suggested credit "© OpenStreetMap contributors, Overture Maps Foundation" (https://docs.overturemaps.org/attribution/).
- Buildings merge OSM (highest priority) with Microsoft ML, Google Open Buildings and Esri footprints; `height`, `num_floors`, `roof_shape` fields exist. Latest release 2026-09-23.1. Download by bbox with the `overturemaps` Python CLI or DuckDB on S3.
- UK height completeness is *to verify*. Expect Overture to add footprints where OSM is incomplete (likely parts of the port) rather than better heights.
- Implemented in `tools/merge-overture.mjs`. Download with `overturemaps download --bbox=1.27,51.93,1.40,52.00 -f geojson --type=building` (CLI 1.0.2; release 2026-09-23.1).
- **Duplicate rule:** an Overture footprint is skipped if its `sources` include OpenStreetMap, or if more than 20% of its area is covered by OSM buildings (1 m sampling). OSM wins every conflict; kept buildings carry `source: overture` and are counted in the Data panel.

### Ordnance Survey OpenData (OGL v3, "Contains OS data © Crown copyright and database right [year]")
- OS OpenMap Local: generalised building polygons (1:10,000), useful as an independent check of OSM footprint completeness, not for detail.
- OS Open Zoomstack, Open Roads, Open Greenspace: independent references for validation. OS Terrain 50 is too coarse next to 1 m LiDAR.
- OS Data Hub Premium (free up to £1,000/month of transactions) gives MasterMap topography via API; worth evaluating later for building heights (OS NGD), subject to its licence terms for redistribution.

### Aerial imagery
- Defra/EA Vertical Aerial Photography (10–50 cm) exists, but its catalogue entry shows "No Licence Provided"; do not use as textures until the licence is confirmed.
- Bing, Esri and Google imagery may not be extracted for use as textures.

### Google Photorealistic 3D Tiles
- 1,000 root-tile requests free per month, then $6 per 1,000 (https://developers.google.com/maps/billing-and-pricing/pricing). Policies forbid pre-fetching or caching beyond `Cache-Control`, offline use, and deriving or extracting 3D objects; the Google logo and attributions must be displayed (https://developers.google.com/maps/documentation/tile/policies).
- It cannot be turned into game assets, cannot be collided with under those terms without deriving geometry, and creates a per-visitor cost. Felixstowe coverage is *to verify*.

### Imagery and photogrammetry for landmarks
- Openly licensed photographs (Wikimedia Commons, Geograph Britain and Ireland – mostly CC BY-SA 2.0) can legally be used as modelling references or adapted into textures, with attribution, and with any adapted texture released under the same licence. Each image's licence must be checked individually. This is the realistic route to better models of the pier building, Spa Pavilion and Landguard Fort; it is not done yet.
- No openly licensed photogrammetric meshes of Felixstowe were found. Google Photorealistic 3D Tiles may only be streamed and displayed under Google's terms; deriving meshes or textures from them is prohibited, so they are not used.

### Heritage
- Historic England National Heritage List (OGL): Landguard Fort scheduled monument 1018969 and Grade I 1030415; Felixstowe station Grade II 1284364; Cliff Gardens and Town Hall Garden registered park 1001220. Suffolk HER record MXS19251 (pier).

## Comparison

| Need | OSM | EA LiDAR | Overture | OS Open | Google 3D Tiles |
|---|---|---|---|---|---|
| Roads | Yes, with names, classes; widths mostly defaulted | No | Transportation theme (OSM-derived) | Open Roads (centre lines) | Visual only |
| Building footprints | Yes; completeness *to verify* | Implied by DSM | Yes (OSM + ML) | Generalised | Visual only |
| Heights | Partial tags | **Measured** (DSM − DTM) | Partial | No (open) | Visual only |
| Terrain | No | **1 m DTM** | No | 50 m | Visual only |
| Real textures | No | No | No | No | Yes, but not extractable |
| Coastline/beach | Coastline, beach polygons | Shoreline shape | Base theme | Yes | Visual only |
| Port | Footprints, cranes and quays as mapped | Crane and stack heights | ML footprints | Generalised | Visual only |
| Cost | Free | Free | Free | Free | Per request |
| Licence | ODbL (share-alike on the database) | OGL | ODbL / CDLA | OGL | Restrictive |
| Browser streaming | Yes (tiles) | Yes (pre-processed grid) | Yes (pre-processed) | Yes | Yes, via renderer |
| Maintenance | Re-run fetch | Rarely changes | Monthly releases | 6-monthly | Vendor-controlled |

## Recommendation

Use **OSM for geometry, EA LiDAR for terrain and measured heights, procedural PBR materials for appearance**, all pre-processed into static files and rendered with three.js. Add Overture later only to fill footprint gaps, under the rule above. Do not use Google Photorealistic 3D Tiles: its terms rule out the collision geometry and offline asset use a walkable game needs, and it adds a running cost.
