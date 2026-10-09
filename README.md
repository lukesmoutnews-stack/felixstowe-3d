# Felixstowe 3D

A browser-based, explorable 3D recreation of Felixstowe, Suffolk, built from real open geographic data. Streets, building footprints, coastline, beaches, parks, the pier, railway and port cranes come from OpenStreetMap. Terrain and measured building heights come from Environment Agency LiDAR when you supply it. Nothing is placed by hand.

You can walk, drive a car on the real street network, switch between third-person, first-person and overview cameras, use a minimap and full map (click to travel), read sourced history at landmarks, and track discoveries in a pocketbook.

## Quick start

Needs Node 18+ and a desktop browser with WebGL. No `npm install`; three.js r186 is vendored.

```bash
node tools/setup-data.mjs   # downloads and prepares real OSM + Environment Agency LiDAR data, writes docs/data-report.md
node tools/serve.mjs        # http://localhost:8080
```

`setup-data.mjs` cuts the Geofabrik Suffolk extract into the game's tiles (falling back to the Overpass API), downloads the 1 m LiDAR tiles for the six OS 5 km squares around the town, processes terrain, measured building heights, trees and container stacks, and validates the result. Use `--no-lidar` for a quick OSM-only start or `--overture` to add Overture buildings. Without any prepared data the browser fetches live OSM data from Overpass. See [docs/setup.md](docs/setup.md).

## Status (9 October 2026)

| Area | State |
|---|---|
| Data workflow (OSM, Overture, EA LiDAR, validation) | Built; tested offline with mock services and a real OSM extract; **not yet run against live services** |
| Geographic pipeline (OSM → world) | Built; unit-tested; exercised on real OSM data for Vaduz (2013 test extract) |
| 3D buildings, roofs, doors, bays, materials, roads, landcover, trees, props, pier, cranes, container stacks | Built; tested on synthetic and real-OSM data |
| LiDAR terrain (streamed 1 km chunks), building heights, trees, alignment check | Built; tested on synthetic GeoTIFF/ASC rasters |
| Walking, collision, cameras, map/minimap, driving, journal, landmark cards, audio | Built; browser checks pass on three data sets |
| **Real Felixstowe rendering and geographic verification** | **Outstanding** – needs one run of `setup-data.mjs` on a networked machine |

The development sandbox's network policy blocks every geographic data host (see [docs/validation.md](docs/validation.md)), so Felixstowe itself has not been downloaded or rendered here. The app never substitutes test data silently: synthetic and other-region data sets are labelled on screen.

## Documentation

- [Reference analysis (Echoes of Sherborne)](docs/reference-analysis.md)
- [Data sources, comparison and recommendation](docs/data-sources.md)
- [Licensing and attribution register](docs/licensing.md)
- [Architecture decision record](docs/architecture.md)
- [Validation, visual QA and performance log](docs/validation.md)
- [Roadmap and known limitations](docs/roadmap.md)
- [Setup and deployment](docs/setup.md)

## Tests

```bash
npm test                                   # 14 unit tests + 11 offline data-tool tests
node tools/test-headless.mjs               # browser run on the synthetic fixture (screenshots in test/results/)
node tools/test-headless.mjs --data=test/real-osm-liechtenstein/   # browser run on a real OSM extract
node tools/test-headless.mjs --live        # browser run on the Felixstowe data in data/
```

Map data © OpenStreetMap contributors (ODbL). Terrain, when used: © Environment Agency copyright and/or database right (OGL v3).
