# Race to Be Mayor: game systems

`mayor.html` is the campaign game, built on the Felixstowe 3D world. It needs no build step: serve the folder (`npx serve .` or any static server) and open `mayor.html`. Add `?notraffic` or `?nopeople` to switch off ambient vehicles or passers-by.

Design and policy documents (private Claude artifacts, shared by the owner):

- Reputation system: https://claude.ai/code/artifact/f6b4678b-1300-4c52-9a13-92c1cd951ec0
- Safeguarding and compliance: https://claude.ai/code/artifact/3fb245a9-f75b-4996-a7a2-4c4a796c0202
- Character design (Sam Shingle): https://claude.ai/artifact/14XZPDJddFgovAas4Y3ice

Everything in the game's story is fictional. Players can make questionable choices inside the game, but the game never rewards putting real people, property or themselves at risk. Real-world check-ins only run between 08:00 and 20:00 UK time.

## What is functional and what is demo-only

| Area | Status |
| --- | --- |
| Reputation, Marks, rumours, town stories | Functional, client-side. State is kept in the browser (`src/mayor/store.js`). |
| Residents, conversations, promises, influence groups | Functional, client-side. 15 fictional residents. |
| Felixstowe News (game edition) | Functional. Stories are generated from what the player does; no real news is fetched. Links point to www.felixstowenews.co.uk. |
| Character selection and appearance editor | Functional. Cosmetic only; changing it keeps all progress. |
| Vehicles and traffic | Functional in the 3D world. Taking a vehicle is a fictional act with reputation consequences. |
| Leaderboard, admin, reports | Demo. No server; reports are stored locally and shown in the admin Safety section. |
| Town meeting finale event | Demo event at Mr. Felixstowe's Shelter. |

## Code map

| File | Purpose |
| --- | --- |
| `src/mayor/engine.js` | Game state, missions, ranks, check-ins. Mixes in reputation, news and influence. |
| `src/mayor/reputation.js` | Three standings (trust 0.4, community 0.3, effectiveness 0.3), levels, daily caps, Marks, 18 town stories, the rank and finale gates. |
| `src/mayor/residents.js`, `influence.js` | Residents, dialogue trees, promises, six groups (business, families, volunteers, coastal, long-standing, visitors). An endorsement needs 60 support; Candidate needs 3 group endorsements. |
| `src/mayor/news.js`, `news-screens.js` | Felixstowe News branding and story generators. Publishing never changes reputation. |
| `src/mayor/character.js` | Male / Female / Other-Customise presets, the 3D preview and the editor. All presets have identical gameplay. |
| `src/mayor/world-layer.js` | Bridges the app and the 3D world: news boards, the action button, resident name tags, outfits by rank. |
| `src/play/people/humanoid.js`, `crowd.js` | Shared humanoid rig with expressions and posture; passers-by and named residents. |
| `src/play/vehicles/*` | Vehicle specs (15 types, all liveries fictional), procedural models, driving physics, trailers, fleet and traffic. |
| `src/world/bridge-profile.js`, `bridges.js` | Bridge decks raised from OSM `bridge`/`layer` tags. |
| `src/world/town-hall-gardens.js` | Town Hall Gardens and Mr. Felixstowe's Shelter. |

## Bridges

The LiDAR terrain has bridges removed, so roads used to dip at every crossing. Bridge ways from OSM are now profiled: deck height comes from the ground at each abutment (searched up to 14 m outward), with a minimum clearance over whatever the bridge crosses (road 5.1 m, rail 4.9 m, footway 2.6 m). Ways joined end to end are profiled as one chain, and approach ramps follow the joining roads. No bridge is added that is not in the OSM data (50 decks in the current extract).

Surfaces are layered: `world.surfaceAt(x, z, y)` returns the deck only for something already near deck height, so vehicles and people pass both over and under. Traffic only joins roads that share an OSM node, so two roads crossing at different levels never form a junction. Headroom signs and blocking appear below 5.03 m. No road in the Felixstowe extract has a bridge that low, so this logic is covered by unit tests rather than seen on the map.

## Town Hall Gardens

Matched by OSM way 402525404 only. The lawn at the bottom is flat (10 m radius around the fountain), then stone steps climb even terraces to Mr. Felixstowe's Shelter, which sits square on the garden's axis at the top. The fountain position and the terrace layout are reconstructions from the user's photos and the OSM outline, not surveyed.

## Tests

```
node test/mayor/engine.test.mjs   # 28 tests
node test/bridges.test.mjs        # 4 tests
```

The browser end-to-end script `tools/test-mayor.mjs` exists but was not run for this release.

## Attribution

Map data © OpenStreetMap contributors (ODbL). Terrain: Environment Agency LiDAR (Open Government Licence). The attribution stays visible in the game.
