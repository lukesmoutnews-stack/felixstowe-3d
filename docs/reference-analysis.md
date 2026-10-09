# Reference analysis: Echoes of Sherborne

Reference URL: https://bradex.uk/play-sherborne/ (the game's own title is *Echoes of Sherborne*, by Bradley Gunn).
Researched 9 October 2026.

**Method and limits.** The page was read through a text-extracting fetch tool. Direct HTTP requests and a live browser session against bradex.uk were blocked by the development environment's network policy, so the game could not be played, its network traffic was not inspected and its script and asset file names were not seen. Nothing here comes from private source code.

## 1. Directly observed (page text)

- Title "Echoes of Sherborne · Bradex"; description says the real streets of Sherborne, Dorset are rebuilt from OpenStreetMap.
- Opening narrative: "Pack Monday · the first story", arriving by train on Friday 9 October before the town's fair.
- Loading status text "Surveying Sherborne".
- Controls: WASD walk/drive, Space jump or handbrake, E "Talk · doors · cars", V cycles "behind, bird's eye, first person", M map, J "Pocketbook · goals", C camera, Esc menu, F1 or ? help.
- Separate volume sliders for Master, Music, Effects and Voices; a money counter (£0) and a clock (18:00).
- "needs JavaScript and WebGL".
- Attribution line: every street, building and tree is "measured from OpenStreetMap, Overture Maps and Environment Agency LIDAR", linking to the OSM copyright page. Ordnance Survey is not mentioned.
- A build tag that looks like a git commit hash.

### Revisited 9 October 2026 (afternoon)
Same controls, sliders (Master, Music, Effects, Voices), counters (£0, 18:00) and attribution line. Differences from the morning reading: no loading-status text was present this time; an "N" (compass) element and unlabelled ▲ ▼ ⤒ II and "E ▸" glyphs (likely on-screen buttons) are visible; the meta description credits OpenStreetMap and EA LiDAR but omits Overture, while the body text includes it. Still not played interactively; no network traffic or source inspected.

## 2. Stated in public documentation

Source: the developer's home page https://bradex.uk/. The game is built with three.js, OpenStreetMap, Overture and EA LiDAR; buildings, streets and trees are mapped from real data while the people are fictional; it supports keyboard, gamepad and touch. No press coverage or developer write-up was found.

## 3. Inferred (not confirmed)

- Rendering is three.js on WebGL (stated library + WebGL requirement).
- Footprints and streets come from OSM/Overture; LiDAR supplies ground height and very likely building and tree heights ("every … tree is … measured").
- The town is probably pre-processed into compact files rather than streamed from a commercial 3D-tiles service, because no such provider is credited.
- Interiors exist ("go through any front door"), so buildings have at least generic interiors.
- The Voices slider suggests recorded or synthesised dialogue.

## 4. Unknown

Asset formats and sizes, streaming scheme, three.js version and add-ons, physics approach, playable extent, save system, how NPC dialogue is produced, what money and the C camera do, touch layout, performance.

## 5. Feature decisions for Felixstowe

| Feature | Reference | Felixstowe 3D |
|---|---|---|
| OSM streets and footprints | Yes | **Reproduced** |
| Overture buildings | Yes | Planned as a gap-filler with a documented duplicate rule (see data-sources.md) |
| EA LiDAR terrain/heights/trees | Yes | **Reproduced** in `tools/lidar.mjs` (terrain, per-building heights, tree detection, alignment check) |
| Walk / drive / three views | Yes | **Reproduced** (third person, first person, overview) |
| Map | Yes | **Reproduced**, drawn from the same features as the 3D scene, with click-to-travel |
| Pocketbook / goals | Yes | **Reproduced** as a journal; goals are generated from what exists in the data |
| Sound with separate sliders | Yes | **Adapted**: procedural sea, wind, footsteps, engine and chimes; separate master/ambience/effects |
| Time of day / clock | Yes | **Adapted**: real sun position for Felixstowe at a chosen UK clock time |
| Story and NPCs | Yes (fictional) | **Deferred**. History cards use documented facts with sources; no invented people yet |
| Enterable buildings | Yes | **Deferred**: expensive; needs interior generation and door placement evidence |
| Money, photo camera | Yes | Not reproduced; purpose unknown |
| Gamepad / touch | Yes | Basic touch look only; desktop first as the brief asks |

Nothing from the reference's branding, writing, artwork or assets is used.
