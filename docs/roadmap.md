# Roadmap and known limitations

## Phases

| Phase | State | Evidence / next step |
|---|---|---|
| 1 Audit and research | Done | reference-analysis.md, data-sources.md, architecture.md |
| 2 Geographic prototype | **Done** | Real Felixstowe data prepared by GitHub Actions (OSM 8 Oct 2026, Overture, EA LiDAR 2020/2023) and rendered |
| 3 Validate prototype | Largely done | docs/data-report.md: control points pass, 15/16 streets, LiDAR alignment 2.25 m; open: pier HER point (89 m), 43 road/building crossings, photo comparison |
| 4 Exploration (walk, collision, cameras, map) | Built; tested on synthetic, real-OSM and terrain data | |
| 5 Improve environment | Largely done | Doors, canted bays, eaves, window styles, shopfronts, roller doors, beach huts, LiDAR container stacks, terrain LOD; landmark models outstanding |
| 6 Driving | Built; tested | Kinematic controller |
| 7 Interactive content | Started | Verified, sourced facts for 8 landmarks; objectives labelled as game content; no characters |
| 8 Expand the town | Ready | Data workflow covers the whole extent; streaming loads 1 km tiles and terrain chunks |
| 9 Production readiness | Not started | Browser matrix, accessibility, hosting |

## Done: seafront landmark models (9 October 2026)

- Felixstowe Pier building, Felixstowe Leisure Centre, Fish Dish, The Regal and the Spa Pavilion (with an enterable entrance room, foyer and auditorium) modelled from user photos on their OSM footprints (docs/landmark-models.md); pier deck now level with the pier terrace.

## Done: Hamilton Road shops (9 October 2026)

- Named fascia boards for every OSM shop/amenity in a building; Hamilton Road businesses verified against licensing, hygiene and store-locator records (4 corrections, 5 additions); researched brand fascia colours for chains; generated (flagged) styles for independents; no logos. Shopfronts now also on single-storey shops.

## Done in the real-data round (9 October 2026)

- Ran the data workflow on GitHub Actions four times; real Felixstowe data on the `data` branch.
- Fixed what the real data revealed: Landguard Fort missing (historic features added to the query), container stacks drawn as thin columns (now 12.2 m slots in the yard's grid, one mesh per tier), generic facade on the fort (landmark styling from the containing area), beach-hut rows split into huts.
- `tools/make-web-data.mjs` for static hosts; published the playable demo with the real data.
- Browser test harness: pier checks now work for piers at any bearing.

## Done in the previous round

- Diagnosed the data blocker as an egress policy of the development sandbox, not a tool bug.
- One-command data workflow: `tools/setup-data.mjs` (Geofabrik PBF → tiles, Overpass fallback, EA LiDAR search/download/processing, optional Overture merge, validation report); GitHub Actions workflow for the same.
- New tools: `osm-from-pbf.mjs` (own PBF reader), `fetch-lidar.mjs` (Defra survey API), `merge-overture.mjs` (documented duplicate rule), `validate-data.mjs`.
- LiDAR: gap filling using the OSM coastline, 1 km streamed terrain chunks, container-stack extraction, spatial indexing.
- Buildings: street-facing doors and canted bay windows, 0.3 m eaves, three window styles, string courses, roller doors, beach-hut colours.
- Performance: Web Worker parsing, terrain LOD, distance limits for small details.
- Content: landmark facts verified against Historic England, Suffolk HER, Theatres Trust, the port operator and Landguard sources; corrections applied.
- Tests: 14 unit, 11 data-tool, and browser runs on three data sets.

## Next actions, in order

1. Performance: the real town is about 1,400–1,700 draw calls and 2.6–2.8 M triangles near the pier on SwiftShader. Merge per-tile materials further, simplify distant buildings, and measure on real GPUs.
2. Hamilton Road: check fascia colours against openly licensed photographs; projecting signs, awnings, shop window displays.
3. Review the 43 road/building crossings and the pier HER offset; compare key views against openly licensed photographs.
4. Tune estimated defaults to Felixstowe's stock (storey heights, roof shares, facade mix); OSM tags heights on <2% of buildings.
5. Model more landmarks from openly licensed references: Spa Pavilion, Landguard Fort earthworks, crane orientation per quay.
6. Narrative content, clearly labelled as fiction, built on the sourced history.

## Known limitations

- Real Felixstowe has been checked only on software-rendered screenshots, not against photographs.
- Without LiDAR (e.g. outside the six 5 km squares) the ground is flat at sea level.
- Heights, roof shapes, facade materials, doors, bays and pavements are estimated where data is silent; the Data panel shows the proportion. Bays may double up where OSM footprints already include them.
- Facades are generic UK materials, not photographs. Shop signs are abstract.
- LiDAR gaps on land are filled by interpolation (counted in `terrain.json`); terrain is meshed at 5 m, so very sharp edges are softened.
- Container stacks exist only where LiDAR measured them inside mapped yards; their colours are invented. Cranes appear only where mapped, with a generic model and approximate orientation.
- Kerbs are painted, not raised; bridges are drawn at ground level; tunnels are hidden.
- The car is kinematic (no suspension or tyre slip).
- Only the Spa Pavilion can be entered; no characters yet.
- The map is grid-north-up (true north is ~2.6° anticlockwise).
- Tiles outside the prepared data set render as open water.
