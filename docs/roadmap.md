# Roadmap and known limitations

## Phases

| Phase | State | Evidence / next step |
|---|---|---|
| 1 Audit and research | Done | reference-analysis.md, data-sources.md, architecture.md |
| 2 Geographic prototype | Built; real-data run pending | Pipeline runs on real OSM (Vaduz test); Felixstowe needs `node tools/setup-data.mjs` on a networked machine |
| 3 Validate prototype | **Open** | `tools/validate-data.mjs` produces the evidence; checklist in validation.md |
| 4 Exploration (walk, collision, cameras, map) | Built; tested on synthetic, real-OSM and terrain data | |
| 5 Improve environment | Largely done | Doors, canted bays, eaves, window styles, shopfronts, roller doors, beach huts, LiDAR container stacks, terrain LOD; landmark models outstanding |
| 6 Driving | Built; tested | Kinematic controller |
| 7 Interactive content | Started | Verified, sourced facts for 8 landmarks; objectives labelled as game content; no characters |
| 8 Expand the town | Ready | Data workflow covers the whole extent; streaming loads 1 km tiles and terrain chunks |
| 9 Production readiness | Not started | Browser matrix, accessibility, hosting |

## Done in this round (9 October 2026)

- Diagnosed the data blocker as an egress policy of the development sandbox, not a tool bug.
- One-command data workflow: `tools/setup-data.mjs` (Geofabrik PBF → tiles, Overpass fallback, EA LiDAR search/download/processing, optional Overture merge, validation report); GitHub Actions workflow for the same.
- New tools: `osm-from-pbf.mjs` (own PBF reader), `fetch-lidar.mjs` (Defra survey API), `merge-overture.mjs` (documented duplicate rule), `validate-data.mjs`.
- LiDAR: gap filling using the OSM coastline, 1 km streamed terrain chunks, container-stack extraction, spatial indexing.
- Buildings: street-facing doors and canted bay windows, 0.3 m eaves, three window styles, string courses, roller doors, beach-hut colours.
- Performance: Web Worker parsing, terrain LOD, distance limits for small details.
- Content: landmark facts verified against Historic England, Suffolk HER, Theatres Trust, the port operator and Landguard sources; corrections applied.
- Tests: 14 unit, 11 data-tool, and browser runs on three data sets.

## Next actions, in order

1. Run `node tools/setup-data.mjs` and `node tools/test-headless.mjs --live`; review `docs/data-report.md` and screenshots; fix what the real data reveals.
2. Tune estimated defaults against the real attribute coverage (storey heights, roof shares, facade mix for Felixstowe's actual building stock).
3. Model landmarks from openly licensed references: pier building, Spa Pavilion, Landguard Fort earthworks, crane orientation per quay.
4. Real-GPU performance measurement; set targets; compress tiles for hosting.
5. Narrative content, clearly labelled as fiction, built on the sourced history.

## Known limitations

- **No real Felixstowe data has been rendered yet.** All appearance claims about Felixstowe are unverified.
- Without LiDAR the town is flat at sea level and the seafront cliff is missing.
- Heights, roof shapes, facade materials, doors, bays and pavements are estimated where data is silent; the Data panel shows the proportion. Bays may double up where OSM footprints already include them.
- Facades are generic UK materials, not photographs. Shop signs are abstract.
- LiDAR gaps on land are filled by interpolation (counted in `terrain.json`); terrain is meshed at 5 m, so very sharp edges are softened.
- Container stacks exist only where LiDAR measured them inside mapped yards; their colours are invented. Cranes appear only where mapped, with a generic model and approximate orientation.
- Kerbs are painted, not raised; bridges are drawn at ground level; tunnels are hidden.
- The car is kinematic (no suspension or tyre slip).
- Buildings cannot be entered; no characters yet.
- The map is grid-north-up (true north is ~2.6° anticlockwise).
- Tiles outside the prepared data set render as open water.
