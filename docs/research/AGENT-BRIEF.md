# Brief for the building agents (Felixstowe 3D, Hamilton Road town centre)

Goal: make the game's buildings in YOUR AREA look like the Google Street View photos the user supplied: shape, height, roof, brick/render/stone colour, windows, dormers, gables, chimneys, bays, shopfronts and shop-sign colours. "Hyper realistic" is the target; stay honest about what you could not see.

## Reference
- Photos: `docs/research/hamilton-road-streetview/*.png` (about 150 files). `README.md` there indexes them in tables (file name prefixes a-l). Look at your photos with the Read tool (it shows images). Measurements are estimates scaled from the photos; do not claim they are surveyed.
- Positions: world metres from the town origin, x east, z SOUTH (so Hamilton Road runs roughly north-south around x 60-110; the Palace Cinema is at about (50,-460); the south end by the sea is near (85,-60)).
  - `node /tmp/claude-0/zone/near.mjs X Z RADIUS` lists OSM buildings (id, area, levels, roof shape, POI names inside) and roads near a point.
  - `node /tmp/claude-0/zone/find.mjs "regex"` finds named businesses and the building id that contains them.
  - Footprints: `node /tmp/claude-0/zone/bld.mjs` / read `/tmp/claude-0/zone/zone-buildings.json` (ids, outlines). Check an outline before choosing a height/orientation.
- A building footprint often holds several shops. Split a footprint with `SPLITS` (`{ at: 0.5 }` etc., see `src/content/frontages.js`), or style it as one block and label each shop with fascia styles.

## Where you may write (ONLY these two files plus new files you create)
1. `src/content/frontage-parts/<your-area>.js` — data. Exports `FRONTAGES` (keyed by OSM building way id), `SPLITS`, `AREAS`, `FASCIAS` (shop sign styles by shop name, fields: fascia, text, case upper|mixed, font sans|serif, weight bold|regular; sample entries in `src/content/shops.js` BRAND_STYLES), `OVERRIDES` (business name fixes by OSM node id like `n123`, see shops.js), `ADDITIONS`.
   FRONTAGES entry format: see existing entries in `src/content/frontages.js` (Palace Cinema 354182171, Treasure Chest 688756410, Abbeygate 732472280, the south-end entries at the end). Fields: `addr`, `photo`, `height` (metres), `force: true` (to override LiDAR/OSM height), `roofShape` ('flat'|'gabled'|'hipped'|'hipped-inset'), `style: { facade: 'brick_red'|'brick_yellow'|'brick_dark'|'render'|'stone'|'flint'|'concrete', tint: [r,g,b], roof: 'slate'|'clay'|'concrete_tile'|'pantile'|'flat'|'metal', roofTint, winStyle: 0|1|2, windows: false }`, `details: [{ t: 'name', ...params }]`.
2. `src/world/features/<your-area>.js` — code. Export `FEATURES = { yourName(K, it, ctx) {...} }`. It is called for any detail `{ t: 'yourName' }` on a building with a frontage. K is the local frame (see `src/world/frontage-details.js`, and the examples in `src/world/frontage-features.js`: `cinemaFront`, `cinemaSide`, `dormers`, `chimneys`, `label`, `sideFrame`): `K.P(s,d,y)` position (s along the street-facing edge, d out from the wall, y up from the ground), `K.box(mat, s, d, y, halfS, halfD, halfY)`, `K.G[mat]` geometry accumulators with materials gw (off-white), red, slate, white, black, glass, blue, timber, steel, deck, brick, coping, yellowWall, pane, tile, cream, panel, resin, `K.L` edge length, `K.H` building height, `K.e` edge frame, `K.extra` (push your own THREE.Mesh), `K.colliders`. Import helpers from `../frontage-features.js` (read-only). If you need a new material colour, make it with `extra` meshes of your own or reuse an existing one. Shared helper files must NOT be edited. If you want a shared helper, put a copy in your own file.
   A feature that throws is caught and logged ("frontage feature failed"); fix it.
Do NOT edit `src/content/frontages.js`, `src/content/shops.js`, `src/world/frontage-details.js`, `src/world/frontage-features.js`, `src/world/world.js`, the other areas' files, or anything else. 19 other agents work at the same time on other areas. If your area is missing something only a shared file can give, say so in your report instead of editing it.
Another agent may own a neighbouring building. Only add entries for building ids inside your area. If a photo shows buildings outside your list, skip them.

## Checking your work
- Syntax: `node --check` every file you edit. Also run `node test/zone.test.mjs` once at the end (must stay 293/293).
- Look at it in the game with the shared render script. The machine has 2 CPU cores and every render takes 1-3 minutes, so: ALWAYS go through the lock, batch several views into one run (separate views with `;`), and do at most 4 render runs in total:
  `flock /tmp/claude-0/render.lock timeout 540 node /tmp/claude-0/zone/shot.mjs YOURTAG "x,z,targetx,targetz,distance,pitch;x,z,..."`
  Screenshots land in `/tmp/claude-0/shots/YOURTAG-0.png`, `-1.png`... Read them and compare with the photo. The camera stands at (x,z) looking at the target (distance is the camera pull-back in metres, pitch about -0.02). Stand across the street from the facade. Compare the silhouette, roof, colours, window rhythm and sign colours with the photo and fix the biggest differences first.
  If a render is slow, wait for it; do not start extra ones. Never run the game outside the lock.
- Do not git commit, push or publish. The lead does that.

## Report back (under 250 words)
Which building ids you did (id, what it is), what you added, what looks right in your screenshots (file paths), what still differs from the photos, and anything you guessed (heights, colours, hidden sides). Be candid: say plainly if a building could not be matched or a render failed.
