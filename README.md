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

Real Felixstowe data has been downloaded, processed and rendered. The GitHub Actions workflow (`.github/workflows/fetch-data.yml`) ran the data tools on a networked runner and committed the result to the `data` branch.

| Area | State |
|---|---|
| Data workflow (OSM, Overture, EA LiDAR, validation) | **Run on live services** (4 runs): OSM extract of 8 Oct 2026, 9,841 OSM + 2,545 Overture buildings, EA National LiDAR Programme DTM/DSM 2020 and 2023 for six 5 km squares |
| Geographic checks | Listed-building control points for Landguard Fort and the station fall inside the matching OSM footprints; 15/16 expected streets found; OSM–LiDAR alignment offset 2.25 m. See [docs/data-report.md](docs/data-report.md) |
| 3D town | Rendered and checked by eye: seafront, pier, beach, cliff terrain, Hamilton Road, Landguard Fort, port crane rows and LiDAR container stacks |
| Browser checks on the real data | 13/13 after a test-harness fix for diagonal piers (see [docs/validation.md](docs/validation.md)) |
| Shop signs | 268 named fascia boards across the town; on Hamilton Road, OSM names corrected/added from 2024–26 licensing and hygiene records, chain colours researched; see [docs/hamilton-road.md](docs/hamilton-road.md) |
| Still estimated | 98% of building heights in OSM are untagged (LiDAR measures 8,453 of them); roof shapes, facades, doors and container colours are generated |

The app never substitutes test data silently: synthetic and other-region data sets are labelled on screen.

## Documentation

- [Reference analysis (Echoes of Sherborne)](docs/reference-analysis.md)
- [Data sources, comparison and recommendation](docs/data-sources.md)
- [Licensing and attribution register](docs/licensing.md)
- [Architecture decision record](docs/architecture.md)
- [Validation, visual QA and performance log](docs/validation.md)
- [Hamilton Road shops: sources, corrections, sign styles](docs/hamilton-road.md)
- [Hand-modelled buildings (pier, leisure centre, Fish Dish, The Regal, Spa Pavilion with interior)](docs/landmark-models.md)
- [Roadmap and known limitations](docs/roadmap.md)
- [Setup and deployment](docs/setup.md)

## Tests

```bash
npm test                                   # 14 unit tests + 11 offline data-tool tests
node tools/test-headless.mjs               # browser run on the synthetic fixture (screenshots in test/results/)
node tools/test-headless.mjs --data=test/real-osm-liechtenstein/   # browser run on a real OSM extract
node tools/test-headless.mjs --data=data/  # browser run on the prepared Felixstowe data (git checkout origin/data -- data)
node tools/make-web-data.mjs               # copy data/ for hosts that refuse binary files (gzipped base64 terrain)
```

Map data © OpenStreetMap contributors (ODbL). Terrain, when used: © Environment Agency copyright and/or database right (OGL v3).
