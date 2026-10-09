# Hamilton Road shops

Hamilton Road is Felixstowe's main shopping street. Each shop in the game has a fascia board with the business name over its unit, on the street-facing wall of its building.

## Where the businesses come from

1. **OpenStreetMap, 8 October 2026.** 127 named businesses lie on or within 30 m of Hamilton Road (`docs/research/hamilton-road-osm.json`). Mappers checked many of them in 2024–2026 (`check_date`).
2. **Corrections from newer records (9 October 2026 research).** These are East Suffolk licensing register, food hygiene ratings, chain store locators and property listings (`docs/research/hamilton-road-*.json`):

| OSM name | Now | Evidence |
|---|---|---|
| Saigon, 11 Hamilton Road | China Palace | premises licence from 7 Apr 2026 |
| Sam Moi Oriental, 8 | China China | premises licence from 30 Dec 2024 |
| Coffee Link, 82 | Closed (blank fascia) | listed as permanently closed |
| Felixstowe Funeralcare, 92 | Vacant ("TO LET") | unit advertised to let, 2026 |
| — | Greggs, 85 (second shop) | Greggs shop locator |
| — | Sweets Reunited, 30 | food hygiene record |
| — | The Deben Butcher, 115 | food hygiene record, Oct 2025 |
| — | Creatdinteriors, 130 | Felixstowe BID page |
| — | The Little Wine Bar and Cafe, 187 | premises licence |

Added businesses are placed by interpolating between neighbouring OSM shops with house numbers on the same side of the road. Their position is therefore approximate, not surveyed.

## What the signs look like

- **National chains (44):** fascia and lettering colours, upper or mixed case, and serif or sans lettering follow each brand's current UK shopfront. A confidence level is recorded for each. These come from general brand knowledge and the chains' own sites, not from photographs of the Felixstowe shops. Low-confidence entries include Poundstretcher, TGJones (the former WHSmith high-street shops, which may still carry the old fascia), Clintons, Card Factory, The Works, Bonmarché, Leaders and several charity shops.
- **Independent shops:** no reliable public record of their fascias was found. They get a generated traditional palette (navy and gold serif, black and white, cream and green, and so on), flagged as generated in the Data panel.
- **No logos.** Every sign is the business name in plain type on the fascia colour. Brand marks, symbols and wordmark lettering are not reproduced.

## Known gaps

- Fascia colours have not been compared with photographs. Street-level imagery (e.g. Google Street View) cannot be used to derive game assets under its terms. Openly licensed photos (Geograph, CC BY-SA) exist, but this project could not view them.
- Several records conflict and are left as OSM has them: Ruby & Scarlet (48–50) and CookieBarista (50); EACH, which moved to the former NatWest on the corner of York Road in 2024; KFC at 115A versus 119–121 in OSM; Coral at 160/162.
- Shop windows are generic glazing. Shop interiors, projecting signs, awnings and A-boards are not modelled yet.
- Each unit's width is shared out along the facade between neighbouring OSM points (3–8.5 m, 16 m for large stores). Real unit boundaries are not mapped.

## Code

- `src/content/shops.js` holds the corrections, additions and brand styles, with sources.
- `src/world/shopfronts.js` does the sign placement and lettering. It uses one texture atlas per map tile, so all signs in a tile draw together.
