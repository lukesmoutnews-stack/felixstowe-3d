# Licensing and attribution register

| Source | Used for | Licence / terms | Attribution required | Modify | Redistribute | Cache / offline | Commercial use | If the service changes |
|---|---|---|---|---|---|---|---|---|
| OpenStreetMap (via Overpass or pre-fetched tiles) | All geometry | ODbL 1.0 | "© OpenStreetMap contributors" + link, visible on HUD and loading screen | Yes | Yes. A *derivative database* shared publicly must be offered under ODbL; rendered images and the game itself are a "produced work" | Yes (and encouraged by Overpass policy) | Yes | Pre-fetched tiles keep working; switch Overpass endpoint or use Geofabrik |
| Environment Agency National LiDAR Programme | Terrain, building heights, trees | Open Government Licence v3 | "© Environment Agency copyright and/or database right. All rights reserved." shown in HUD and Menu › Data when terrain is loaded | Yes | Yes | Yes | Yes | Processed files are kept locally |
| Overture Maps (optional, `--overture`) | Footprint gap-fill | Buildings ODbL; Places CDLA-P 2.0 / Apache 2.0 | "© OpenStreetMap contributors, Overture Maps Foundation" | Yes | Yes (ODbL share-alike for buildings) | Yes | Yes | Releases are versioned; pin one |
| Ordnance Survey OpenData (validation only) | Reference checks | OGL v3 | "Contains OS data © Crown copyright and database right [year]" if any OS data is shown | Yes | Yes | Yes | Yes | n/a |
| Geofabrik Suffolk extract | Same OSM data in bulk | ODbL 1.0 (it is OSM) | as OSM | Yes | Yes | Yes | Yes | Overpass fallback |
| Historic England NHLE | Facts and list entry numbers | OGL v3 | Source links on every fact card | n/a | n/a | n/a | Yes | Links may move |
| Port of Felixstowe, Landguard Fort Trust, English Heritage, Theatres Trust, Suffolk HER, Felixstowe Town Council, Discover Suffolk | Facts on landmark cards | Facts are not copyrighted; text paraphrased | Source link on every card | n/a | n/a | n/a | n/a | Links may move |
| Wikipedia (facts) | One pier fact (2017 building) | CC BY-SA (text); facts themselves are not copyrighted | Source link on the card; text is paraphrased | n/a | n/a | n/a | n/a | Replace with primary sources over time |
| three.js r186 (vendored) | Rendering | MIT (`vendor/three/LICENSE`) | Keep licence file | Yes | Yes | Yes | Yes | Vendored copy |
| Textures, models, sounds | Everything visual/audible | Generated in code for this project | None | Yes | Yes | Yes | Yes | n/a |
| Google Photorealistic 3D Tiles | **Not used** | Google Maps Platform terms | – | – | – | Forbidden beyond Cache-Control | Paid | – |
| Aerial imagery (any) | **Not used** | Varies; EA aerial licence unconfirmed | – | – | – | – | – | – |

## Obligations to keep

- The OSM credit must stay visible (HUD bottom-right, loading screen, Menu › Data).
- If the pre-processed OSM tiles (`data/tiles/*.json`) are published with the site, they are themselves an ODbL database: keep them under ODbL and say so (the `fetched.licence` field in each tile records this).
- No API keys are used. If a keyed service is added later, keep secrets server-side; client keys must be domain-restricted.
