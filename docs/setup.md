# Setup and deployment

## Run locally

Requirements: Node 18 or newer, a desktop browser with WebGL 2. Nothing to install (three.js r186 is vendored).

```bash
node tools/serve.mjs            # or: npm start   →  http://localhost:8080
```

Opening `index.html` from the file system will not work (ES modules need HTTP).

## Get the real Felixstowe data (one command)

```bash
node tools/setup-data.mjs       # or: npm run data
```

What it does, in order (each step is skipped if its output already exists):

1. **OpenStreetMap**: downloads the Geofabrik Suffolk extract (~35 MB, updated daily) and cuts it into the game's 1 km tiles with `tools/osm-from-pbf.mjs`. If that download fails it falls back to the Overpass API (`tools/fetch-osm.mjs --all`, sequential, polite back-off).
2. **Environment Agency LiDAR**: `tools/fetch-lidar.mjs` asks the Defra survey API which 1 m DTM/DSM tiles exist for the six OS 5 km squares covering the extent (TM2030, TM2530, TM3030, TM2035, TM2535, TM3035), downloads the newest National LiDAR Programme tiles (falling back to the 2022 composite), then runs `tools/lidar.mjs`. Expect roughly 0.5–1 GB of zips and a few minutes of processing; about 1–2 GB of RAM.
3. **Validation**: `tools/validate-data.mjs` writes `docs/data-report.md` (coverage, counts, tag completeness, expected street and landmark names, control points against Historic England / Suffolk HER, duplicate footprints, LiDAR alignment).

Options: `--no-lidar` (OSM only), `--overture` (also merge Overture buildings; needs `pip install overturemaps`), `--overpass` (skip Geofabrik), `--force` (refresh OSM).

Then start the game and, optionally, run the browser test against the real data:

```bash
node tools/serve.mjs
npm install --no-save playwright && npx playwright install chromium   # once, for the browser test
node tools/test-headless.mjs --live --out=test/results-felixstowe
```

Please send back `docs/data-report.md` and the screenshots in `test/results-felixstowe/` if you want them reviewed.

### Doing the steps by hand

```bash
node tools/fetch-osm.mjs [--all | --radius=2500 | --tiles=0_0,1_0] [--force]
node tools/osm-from-pbf.mjs --pbf=suffolk-latest.osm.pbf
node tools/fetch-lidar.mjs [--dry-run] [--dtm-only]
node tools/lidar.mjs --dtm="downloads/*DTM*.zip" --dsm="downloads/*DSM*.zip" [--cell=2] [--sea=0.3]
overturemaps download --bbox=1.27,51.93,1.40,52.00 -f geojson --type=building -o overture.geojson
node tools/merge-overture.mjs --in=overture.geojson
node tools/validate-data.mjs
```

If the EA API changes (its endpoints are not formally documented), download the tiles from https://environment.data.gov.uk/survey by hand: search the area, choose "National LiDAR Programme DTM" and "DSM" at 1 m, keep the zips, and pass them to `tools/lidar.mjs`.

### Using GitHub Actions instead of your computer

`.github/workflows/fetch-data.yml` runs the same `setup-data.mjs` on a GitHub runner and commits the result to a `data` branch. Push the project to a GitHub repository, open Actions › "Fetch Felixstowe data" › Run workflow, then `git checkout data -- data docs/data-report.md`.

## Configuration

`src/config.js`: frame origin, tile size, town extent, stream/unload radii, spawn landmark, Overpass endpoints. No API keys or environment variables are needed.

## Tests

```bash
npm test                          # unit tests (geography) + offline data-tool tests with mock services
node tools/test-headless.mjs      # browser test on the synthetic fixture
node tools/test-headless.mjs --data=test/real-osm-liechtenstein/   # browser test on a real OSM extract
node tools/test-headless.mjs --live                                # browser test on Felixstowe data in data/
```

Development URL parameters: `?fixture=test-grid` (synthetic data), `?data=<dir>/` (another prepared region), `&terrain=<terrain.json>`, `&autoenter`, `&test`.

## Deploy

Static files only: `index.html`, `src/`, `vendor/`, `data/` (tiles, terrain chunks, manifest). Any static host works (GitHub Pages, Netlify, Cloudflare Pages, S3 + CloudFront). Enable gzip or brotli: the OSM JSON and terrain chunks compress well. Do not ship `data/lidar-raw/` or the `.osm.pbf`.

Costs: all data sources are free; hosting is free to a few pounds a month at hobby traffic. Bandwidth per visitor depends on how far they roam (each 1 km tile is one OSM JSON file plus one or two terrain chunks).
