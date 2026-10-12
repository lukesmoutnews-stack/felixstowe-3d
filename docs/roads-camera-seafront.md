# Camera, smooth roads and the seafront

October 2026. These changes apply to both `index.html` (the explorer) and `mayor.html` (Race to Be Mayor).

## What was wrong (root causes)

| Symptom | Cause |
| --- | --- |
| Angular, segmented roads | Road centre lines were OSM's straight segments, drawn as they are. Every bend was a corner, and junctions were patched with 14-sided discs. |
| Lumpy roads, tilted sideways | Each ribbon vertex sat on the raw 1 m LiDAR terrain, and each road edge was sampled separately. The surface copied every lump and cross-slope in the terrain model. |
| Terrain showing through roads | Roads (4 m samples) and the terrain mesh (5 m grid) disagreed by a few centimetres, so the terrain won the depth test in places. This affected about 3 % of road points. |
| Bouncy driving | Vehicles drove on the raw terrain rather than on the mesh they appeared to be on. The difference was 5 cm on median and 13 cm at the 95th percentile. |
| Camera jitter and jerk | Mouse input was applied directly. The camera snapped to its target every frame, so suspension motion went straight to the screen. Wall pull-in jumped in and out. Getting into a vehicle permanently changed the walking zoom. |

## What changed

**Centre lines** (`src/geo/road-smooth.js`). Every bend that is not a junction becomes a circular arc. The radius depends on the road class: 8 m for a service road, 15 m for residential, 40–45 m for primary and 80 m for trunk roads. Arcs are limited so neighbouring bends never overlap. Junction nodes, crossings, signals and way ends never move, so the road graph and bridge chains keep their topology.

**One road surface for everything** (`src/world/road-surface.js`). Each road gets a long profile:
- It is sampled across its width from the terrain.
- It is smoothed along its length with a Gaussian of 4–10 m (2.5 m for paths).
- It is pinned to one shared height at every junction node, or to the bridge-deck or ramp height where it meets a bridge.

Carriageways have a 2.5 % crown, which fades out near junctions. They have 120 mm kerbs and raised 1.9 m pavements. Kerbs drop to 20 mm at mapped crossings. The ground under roads is graded below the road, and beside it there is a 1 m verge a few centimetres down, blended back into the terrain over 7 m.

The same functions give:
- the height of every road vertex;
- the height vehicles, traffic and people stand on (`world.surfaceAt`);
- the terrain grading.

So what you see is what you drive on.

**Junctions.** Arms are sorted by angle, and each pair of neighbouring arms gets a kerb-corner arc. The radius is 10 m between main roads, 6.5 m on residential roads and 4 m for service roads, shortened on short or sharp arms.

The junction is filled with a polygon that follows those corners, triangulated by ear clipping. It also answers height queries for physics. Corner pavements are ring sectors, which you can walk on. Forks, wedges and two-way joins are handled separately. Minor roads get UK give-way markings (a double broken line) where they meet a bigger road.

**Meshes** (`src/world/roads.js`). Each carriageway is built as two half-strips so the crown shows. Kerbs have vertical faces and pavements have edge skirts. Dead ends get turning heads. Centre-line dashes are phased along the whole way, so tiles agree.

**Traffic.** AI vehicles follow the smoothed centre lines. They take a smooth curve from lane to lane through junctions, and take their height from the shared surface.

**Vehicles.** The body sits on a damped spring, while the wheels follow the road, so kerbs and changes of slope look natural without the wheels leaving the ground.

**Camera** (`src/play/camera-rig.js`, `src/play/input.js`):
- Drag with either mouse button or one finger to orbit around the player or vehicle.
- Zoom with the scroll wheel (trackpads too), a two-finger pinch or the + and − keys. A gamepad's right stick looks around.
- Pitch is limited to −75° to +24°, so the camera never flips or goes under the ground.
- Input moves targets, and the camera eases towards them. The focus follows through a damped spring that is heavier vertically.
- The camera snaps in front of walls, bridge decks and parapets, using a centre ray plus two near-plane rays, and eases back out.
- Getting in or out glides the focus and the chase distance over about a second. The chase distance is about 8 m for a car and 14.5 m for a double-decker.
- Sensitivity and invert-look are in Menu › Settings › Camera. In the mayor app, a Slow, Normal or Fast camera speed is in Profile.

## Measured in the running game

All numbers come from `/tmp/claude-0/roadq.mjs`, run before and after. The car was a saloon driven at about 30 km/h along roughly 700 m of the road graph at two sites: Garrison Lane / High Road West, and Orwell Road. The browser was headless Chromium with software WebGL.

| Measure | Before (site A / B) | After (site A / B) |
| --- | --- | --- |
| Visible kinks over 20° on car roads (not at junctions), per km | 0.9 / 1.4 | 0 / 0 |
| Road points where the terrain shows through | 2.7 % / 3.4 % | 0 / 0 |
| Gap between road mesh and driving surface, median / 95th percentile | 5.1 / 13.2 cm and 4.2 / 11.5 cm | 0 / 1 cm at both |
| Body vertical acceleration, RMS (m/s²) | 1.22 / 1.00 | 0.30 / 0.34 |
| Body vertical acceleration, 95th percentile (m/s²) | 2.43 / 1.81 | 0.46 / 0.65 |
| Camera acceleration, RMS (m/s²) | 9.3 / 9.5 | 4.1 / 3.2 |
| Camera turn per frame, 95th percentile | 1.28° / 0.63° | 0.63° / 0.59° |
| Game update time per frame (software rendering) | 0.9 / 2.0 ms | 1.8 / 3.0 ms |

Camera checks (`/tmp/claude-0/camtest.mjs`):
- A 750 px drag turned the view 180°.
- Pitch ran from −74.5° to +24.1°, with the camera 0.35 m above the ground when looking up.
- Right-button drag, one-finger drag and pinch zoom all worked.
- Wheel zoom changed by at most 0.31 m per frame, and zooming in stops at 1.9 m.
- During a 180-frame orbit beside a building, the camera was inside the building for 0 frames. When a wall cuts in, the camera snaps in by up to 2.6 m in one frame to avoid clipping.
- Getting into and out of a car and a double-decker: no frame moved more than 0.8 m.

Bridges (`/tmp/claude-0/vtest.mjs`) are unchanged:
- A car over Garrison Lane bridge followed the deck to within 0.03 m.
- A double-decker and an articulated lorry passed under High Street bridge on the A14, with 5.68 m headroom, without leaving the lower road.
- Candlet Road and Gulpher Road have no shared node, so no false junction.
- Ambient traffic made no jumps between levels.

Unit tests:
- `node test/roads.test.mjs`: 8 tests.
- `node test/bridges.test.mjs`: 4 tests.
- `node test/mayor/engine.test.mjs`: 28 tests.

## Seafront

**Source** (`src/world/seafront.js`).
- The promenade is the chain of OSM pedestrian ways named "The Promenade", plus the pedestrian ways joined to it along the shore. It runs about 3.3 km.
- The user described the rest: a waist-high brick wall runs along the landward side of the whole promenade. Blue metal flood gates stand wherever a path or street crosses the wall onto the prom, and you can walk through them.
- A gate is placed at every OSM path or street that joins the promenade from the landward side. That gives about 45 gates in the loaded area.
- Each gate has brick piers, steel jamb channels, a sill plate and blue leaves standing open.
- The wall is 1.0 m tall with a concrete coping. Its height and the gate design are approximations.

**Seafront shelters.**
- These are OSM amenity=shelter buildings next to the promenade: five in the data.
- They are modelled from the user's photo: a cream timber frame with fretwork arches, a central glazed screen with benches, and a pale green metal hipped roof with two gables on each side, bargeboards and finials.
- You can walk into them.

**Spa Pavilion.** The landward end was reworked from the user's two street photos:
- a two-storey range with blue-framed windows, a balcony with show banners and an undercroft;
- a raised centre block with the big lettering;
- hipped pantile roofs;
- the stair with brass rails and blue copings;
- the glazed LOUNGE with its TERRACE sign.

All the trim that is red in the photos is now blue, as the user reported.

## Known limitations

- The camera snaps in when a wall comes between it and the player, rather than gliding. That avoids clipping, at the cost of a visible jump.
- At level crossings, rails sit just below the road surface, so the road hides them.
- Junction geometry is computed from the ways in the tile that holds the junction node. Each tile carries a 44 m data margin, so this is complete except for rare junctions within a few metres of a tile edge.
- The flood-gate positions follow OSM path connections, not a survey of the real gates.
- The Undercliff Road West frontage photos (`docs/research/undercliff-road-west`) are stored for the next modelling step. Those buildings are not modelled yet.
