// Area a18-south-scissortrix-glow-greyfriars: the west side of Hamilton Road at the south end, from the Wolsey Gardens /
// Bent Hill corner (Scissor Trix) north to Greyfriars, from the Street View photos in docs/research/hamilton-road-streetview
// (k-scissor-trix-corner-victoria-st, k-scissor-trix-livias-nutshells, k-glow-studio8-gables, k-glow-blue-naan-row,
// k-blue-naan-china-palace-greyfriars, k-greyfriars-suffolk-house, and k-basic-charity-scott-beckett for the north end of 733112157).
// Heights, widths and window positions are scaled from the photos (a door or a sash window for scale): estimates, not surveyed.
// The `southRow` feature (world/features/a18-...) takes positions in metres from the SOUTH end of a street face given by `edge`
// (the shared street-edge finder only knows car roads and would pick a back wall here).
const BR = '#ffe0cc';              // tint laid over the brick texture so it reads as the orange-red Suffolk brick of the photos
const STONE = '#d0c19a', BLACK = '#17181b', WHT = '#efece4', SLATE = '#3b3d42';
// street faces (south end, north end) from the OSM footprints
const E = {
  hamilton: [[78.2, -74.6], [77.7, -87.0]],   // Scissor Trix right half, blue door, Livia's
  diag: [[70.0, -70.5], [78.2, -74.6]],       // the cut corner: Scissor Trix shop window and sign
  south: [[62.2, -64.8], [71.1, -68.5]],      // the Wolsey Gardens side: grey ground floor, oriel bay
  nuts: [[77.7, -87.0], [77.5, -91.2]],
  glow: [[77.5, -91.2], [76.4, -114.3]],
  cp: [[76.4, -114.3], [75.2, -145.4]],
};
const row = (edge, o) => ({ t: 'southRow', edge, ...o });

export const FRONTAGES = {
  // Scissor Trix (corner, 1 Hamilton Road), Livia's Boutique (1A) and the Bent Hill post office on the Wolsey Gardens side:
  // two storeys of orange-red brick under a big clay-tile hipped roof, a white painted eaves band, tall chimneys, grey painted ground floor
  733112159: { addr: '1-1A Hamilton Road / Wolsey Gardens (Scissor Trix, Livia\'s Boutique, Bent Hill Post Office)', photo: 'k-scissor-trix-corner-victoria-st.png; k-scissor-trix-livias-nutshells.png', height: 7.0, force: true, roofShape: 'hipped-inset',
    style: { facade: 'brick_red', tint: [1, 0.88, 0.8], roof: 'clay', roofTint: [0.62, 0.4, 0.33], winStyle: 0 },
    details: [
      // Hamilton Road face: the right-hand end of the Scissor Trix shop, then a brick pier, the blue fanlit door and Livia's black timber front
      row(E.hamilton, { H: 7.0, skins: [{ s0: 0, s1: 12.2, mat: 'brick', tint: BR }],
        fronts: [
          { s0: 0.05, s1: 6.0, fascia: '#4a515d', frame: '#8a9099', plinthCol: BLACK, plinth: 0.65, y1: 3.7, glaze: [{ s0: 0.3, s1: 2.35, col: '#52626e', bay: 1.9 }, { s0: 3.65, s1: 5.8, col: '#52626e', bay: 2.1 }] },
          { s0: 8.55, s1: 12.3, fascia: '#141416', frame: '#141416', plinth: 0.45, y1: 3.75, glaze: [{ s0: 8.85, s1: 12.0, col: '#4f5a60', bay: 1.6 }] },
        ],
        doors: [{ s: 3.0, w: 1.0, h: 2.2, col: '#47535c', frame: '#8a9099', glass: '#52626e' }, { s: 7.25, w: 0.9, h: 2.3, col: '#1f4fb0', frame: '#18191c', fan: true }],
        windows: [{ s: 7.2, w: 1.8, h: 1.5, y: 4.3, mull2: true, bars: 1, surround: 0.08 }, { s: 10.2, w: 1.4, h: 1.5, y: 4.3, mull: true, bars: 1, surround: 0.08 }],
        bands: [{ s0: 6.1, s1: 8.5, y0: 0, y1: 0.5, col: BLACK, out: 0.1 }, { s0: 0.05, s1: 12.2, y0: 6.15, y1: 7.0, col: '#ebe6d8', out: 0.12 }],
        cornices: [{ col: '#e3ddcc', out: 0.35, h: 0.18 }],
        chimneys: [{ s: 5.1, inset: 3.2, pitch: 0.7, rise: 2.4 }, { s: 10.0, inset: 3.4, pitch: 0.7, rise: 1.8 }] }),
      // the cut corner: the Scissor Trix shop window and sign over a black plinth, one sash window above
      row(E.diag, { H: 7.0, skins: [{ s0: 0, s1: 9.0, mat: 'brick', tint: BR }],
        fronts: [{ s0: 0.1, s1: 9.0, fascia: '#4a515d', frame: '#8a9099', plinthCol: BLACK, plinth: 0.7, y1: 3.75, glaze: [{ s0: 0.5, s1: 4.4, col: '#5a6b78', bay: 1.95 }, { s0: 4.6, s1: 8.7, col: '#5a6b78', bay: 2.05 }] }],
        windows: [{ s: 3.7, w: 1.05, h: 1.7, y: 4.25, bars: 1, surround: 0.09 }, { s: 6.9, w: 1.05, h: 1.7, y: 4.25, bars: 1, surround: 0.09 }],
        bands: [{ s0: 0.05, s1: 9.0, y0: 6.15, y1: 7.0, col: '#ebe6d8', out: 0.12 }],
        cornices: [{ col: '#e3ddcc', out: 0.35, h: 0.18 }] }),
      // Wolsey Gardens side: grey painted ground floor, black awning and door, brick above with a pale oriel bay under a small gable
      row(E.south, { H: 7.0, skins: [{ s0: 0, s1: 9.4, mat: 'brick', tint: BR }],
        fronts: [{ s0: 0.1, s1: 9.5, fascia: '#6d7584', frame: '#2a2d33', plinthCol: BLACK, plinth: 0.45, wall: '#6d7584', y1: 3.6, glaze: [{ s0: 3.3, s1: 4.7, col: '#33414b', y0: 0.9, y1: 2.5 }] }],
        doors: [{ s: 8.6, w: 0.95, h: 2.2, col: '#2f3a42', frame: '#2a2d33', glass: '#46545e' }],
        awnings: [{ s0: 5.6, s1: 7.8, y: 2.7, depth: 1.0, col: '#141416' }],
        windows: [{ s: 1.7, w: 0.9, h: 1.55, y: 4.3, bars: 1 }, { s: 3.2, w: 0.9, h: 1.55, y: 4.3, bars: 1 }, { s: 4.8, w: 0.9, h: 1.55, y: 4.3, bars: 1 }, { s: 7.7, w: 0.9, h: 1.1, y: 7.3, bars: 1 }],
        bays: [{ s: 7.7, w: 2.0, y0: 4.2, y1: 6.7, depth: 0.7, frame: '#ece7da', canted: true }],
        gables: [{ s: 7.7, w: 2.5, y0: 7.0, rise: 1.7, depth: 3, mat: '#ece7da', coping: '#ece7da', roof: '#7a4c3b' }],
        bands: [{ s0: 0.05, s1: 9.4, y0: 6.15, y1: 7.0, col: '#ebe6d8', out: 0.12 }],
        cornices: [{ col: '#e3ddcc', out: 0.35, h: 0.18 }] }),
    ] },
  // Nutshells by the Sea (1B): a narrow two-storey front in dark grey-green painted timber, a big glazed upper bay under a dark cornice
  733112158: { addr: '1B Hamilton Road (Nutshells by the Sea)', photo: 'k-scissor-trix-livias-nutshells.png', height: 7.2, force: true, roofShape: 'flat',
    style: { facade: 'render', tint: [0.2, 0.24, 0.23], roof: 'flat' },
    details: [row(E.nuts, { H: 7.2, skins: [{ s0: 0, s1: 4.1, mat: '#2e3b3a' }],
      fronts: [{ s0: 0.05, s1: 4.15, fascia: '#2c3937', frame: '#202a29', plinth: 0.5, y1: 3.85, glaze: [{ s0: 0.35, s1: 2.1, col: '#46585a', bay: 1.75 }, { s0: 3.3, s1: 3.95, col: '#46585a' }] }],
      doors: [{ s: 2.7, w: 0.95, h: 2.2, col: '#2c3937', frame: '#202a29', glass: '#46585a' }],
      bays: [{ s: 2.1, w: 3.6, y0: 3.95, y1: 6.7, depth: 0.3, frame: '#242f2e', glass: '#3d4c52', panes: 3, cap: '#1d2625' }],
      cornices: [{ col: '#1d2625', out: 0.4, h: 0.4 }] })] },
  // Glow / Studio8 (3-5) and Blue Naan (7-9): Glow is a Victorian red-brick pair of steep gables (buff and stone banding, triple sash
  // windows, a central dormer) over a black fascia; Blue Naan is a white-rendered three-storey house with black trim and a scalloped gable
  506378827: { addr: '3-9 Hamilton Road (Glow / Studio8, Blue Naan)', photo: 'k-glow-studio8-gables.png; k-glow-blue-naan-row.png; k-blue-naan-china-palace-greyfriars.png', height: 7.2, force: true, roofShape: 'flat',
    style: { facade: 'brick_red', tint: [1, 0.88, 0.8], roof: 'flat' },
    details: [row(E.glow, { H: 7.2,
      skins: [{ s0: 0, s1: 15.0, mat: 'brick', tint: BR }, { s0: 15.0, s1: 22.95, mat: '#f3f0e8' }],
      blocks: [{ s0: 0, s1: 15.0, y0: 7.2, y1: 8.0, depth: 5, mat: 'brick', tint: BR, side: '#9c4b30' }],
      fronts: [
        { s0: 0.1, s1: 14.95, fascia: '#141517', frame: '#141517', plinthCol: '#6a6d70', plinth: 0.55, y1: 4.15, glaze: [{ s0: 1.45, s1: 6.3, frost: '#c4cccf', bay: 2.4 }, { s0: 6.45, s1: 7.95, col: '#3a2e24', bay: 1.6 }, { s0: 8.0, s1: 13.7, frost: '#cfd3d2', bay: 2.8 }] },
        { s0: 15.05, s1: 23.0, fascia: '#17181b', frame: '#e6e4dc', plinthCol: '#6c6f72', plinth: 0.5, y1: 4.1, glaze: [{ s0: 15.6, s1: 19.1, col: '#2b333a', bay: 1.75 }, { s0: 19.4, s1: 21.0, col: '#323b42', bay: 1.8, y0: 0.9, y1: 2.7 }] },
      ],
      doors: [{ s: 0.85, w: 0.8, h: 2.2, col: '#1c2f8a', frame: '#141517' }, { s: 14.4, w: 0.95, h: 2.2, col: '#1f4d3c', frame: '#141517', glass: '#2b3a40' },
        { s: 21.5, w: 0.85, h: 2.3, col: '#f1efe9', frame: '#dcdad2', handle: false }, { s: 22.4, w: 0.85, h: 2.3, col: '#f1efe9', frame: '#dcdad2' }],
      windows: [
        ...[1.85, 2.9, 3.95].map((s) => ({ s, w: 0.8, h: 1.85, y: 4.7, frame: STONE, surround: 0.1, bars: 1 })),
        ...[6.55, 7.7].map((s) => ({ s, w: 0.8, h: 1.9, y: 5.0, surround: 0.06, bars: 1 })),
        ...[10.55, 11.7, 12.85].map((s) => ({ s, w: 0.9, h: 1.85, y: 4.7, frame: STONE, surround: 0.1, bars: 1 })),
        { s: 2.85, w: 0.95, h: 1.2, y: 8.25, frame: STONE, surround: 0.08, bars: 1 }, { s: 11.7, w: 1.2, h: 1.1, y: 8.9, frame: STONE, surround: 0.08, bars: 1 },
        ...[17.5, 18.8, 22.1].map((s) => ({ s, w: 0.95, h: 1.7, y: 4.35, frame: BLACK, surround: 0.1, bars: 1 })),
        { s: 18.4, w: 0.8, h: 1.5, y: 7.65, frame: BLACK, surround: 0.1, bars: 1 },
      ],
      bands: [
        { s0: 0.1, s1: 14.9, y0: 6.95, y1: 7.2, col: '#cbb98c', out: 0.1 }, { s0: 5.95, s1: 8.25, y0: 7.7, y1: 8.0, col: '#cbb98c', out: 0.12 },
        { s0: 1.15, s1: 4.65, y0: 4.5, y1: 4.62, col: STONE, out: 0.15 }, { s0: 9.8, s1: 13.6, y0: 4.5, y1: 4.62, col: STONE, out: 0.15 },
        { s0: 5.65, s1: 5.95, y0: 3.9, y1: 8.0, col: '#b9a47a', out: 0.07 }, { s0: 8.25, s1: 8.55, y0: 3.9, y1: 8.0, col: '#b9a47a', out: 0.07 }, { s0: 0.05, s1: 0.3, y0: 3.9, y1: 7.6, col: '#b9a47a', out: 0.07 },
        { s0: 15.05, s1: 22.95, y0: 6.9, y1: 7.2, col: BLACK, out: 0.14 }, { s0: 16.75, s1: 19.55, y0: 6.2, y1: 6.4, col: BLACK, out: 0.2 }, { s0: 21.45, s1: 22.75, y0: 6.2, y1: 6.4, col: BLACK, out: 0.2 },
        ...[15.35, 17.1, 18.85].map((s) => ({ s0: s - 0.18, s1: s + 0.18, y0: 0.5, y1: 2.8, col: '#dcdad2', out: 0.25 })),
      ],
      cornices: [{ s0: 0.1, s1: 14.95, y: 8.0, col: '#3a3b3f', out: 0.22, h: 0.12 }, { s0: 15.05, s1: 22.95, y: 7.2, col: BLACK, out: 0.28, h: 0.12 }],
      gables: [
        { s: 2.85, w: 5.7, y0: 8.0, rise: 2.8, depth: 9, mat: 'brick', tint: BR, coping: BLACK, roof: SLATE, board: 0.28 },
        { s: 11.7, w: 6.6, y0: 8.0, rise: 3.3, depth: 9, mat: 'brick', tint: BR, coping: BLACK, roof: SLATE, board: 0.28 },
        { s: 18.35, w: 6.4, y0: 7.2, rise: 2.6, depth: 6, mat: '#f3f0e8', coping: BLACK, roof: SLATE, fret: BLACK, board: 0.3 },
      ],
      dormers: [{ s: 7.05, w: 2.0, y0: 8.0, wallH: 1.0, rise: 1.0, front: '#ecebe4', barge: BLACK, roof: SLATE }],
      extraBoxes: [{ s: 13.4, d: -2.0, y0: 9.0, y1: 11.0, hs: 0.4, hd: 0.3, col: '#8c4f3b' }, { s: 13.4, d: -2.0, y0: 11.0, y1: 11.12, hs: 0.47, hd: 0.37, col: '#cfc9b9' }] })] },
  // China Palace (11), Greyfriars Carpets Beds Flooring (13-15) with SUFFOLK HOUSE painted on its white wall, and the white-painted
  // houses beyond (BASIC Life Charity, Scott Beckett): one OSM footprint of 31 m of street face
  733112157: { addr: '11-17+ Hamilton Road (China Palace, Greyfriars, BASIC Life Charity, Scott Beckett)', photo: 'k-blue-naan-china-palace-greyfriars.png; k-greyfriars-suffolk-house.png; k-basic-charity-scott-beckett.png', height: 7.8, force: true, roofShape: 'flat',
    style: { facade: 'render', tint: [0.95, 0.93, 0.88], roof: 'flat' },
    details: [row(E.cp, { H: 7.8,
      skins: [{ s0: 0, s1: 6.5, mat: 'stock', tint: '#fff5d6' }, { s0: 6.5, s1: 16.0, mat: '#f1eee6' }, { s0: 16.0, s1: 30.9, mat: '#eeeadf' }],
      fronts: [
        { s0: 0.05, s1: 7.9, fascia: '#d3111a', frame: '#d3111a', wall: '#d3111a', plinth: 0.55, y1: 4.05, glaze: [{ s0: 0.5, s1: 4.4, col: '#33261a', bay: 3.9, y0: 0.6, y1: 2.15 }, { s0: 4.5, s1: 5.35, col: '#2f2a22', y0: 0.6, y1: 2.15 }, { s0: 0.5, s1: 7.4, col: '#a30c13', y0: 2.3, y1: 2.8, bay: 2.3 }] },
        { s0: 7.95, s1: 16.0, fascia: '#17191d', frame: '#17191d', plinth: 0.45, y1: 4.15, glaze: [{ s0: 9.15, s1: 11.0, col: '#44505a', board: '#d9dfe2', boardH: 0.75, bay: 1.85 }, { s0: 12.3, s1: 15.7, col: '#44505a', board: '#d9dfe2', boardH: 0.75, bay: 1.7 }] },
        { s0: 16.1, s1: 24.4, fascia: '#f1efe9', frame: '#2a2d33', plinth: 0.45, y1: 3.75, glaze: [{ s0: 16.7, s1: 20.0, col: '#5a666f', bay: 1.65 }, { s0: 21.2, s1: 24.0, col: '#5a666f', bay: 1.4 }] },
        { s0: 24.5, s1: 30.9, fascia: '#d9601f', frame: '#d9601f', plinth: 0.45, y1: 3.75, glaze: [{ s0: 25.1, s1: 28.3, col: '#8a98a3', bay: 1.6 }, { s0: 29.2, s1: 30.5, col: '#8a98a3' }] },
      ],
      pents: [{ s0: 0.0, s1: 7.95, y: 4.05, rise: 0.5, depth: 0.75, col: '#c4703f' }],
      doors: [{ s: 6.4, w: 1.0, h: 2.2, col: '#d3111a', frame: '#d3111a', glass: '#2d3a40' }, { s: 8.5, w: 0.95, h: 2.3, col: '#4b1b1d', frame: '#17191d' },
        { s: 11.65, w: 1.3, h: 2.2, col: '#2b3238', frame: '#17191d', glass: '#4a5862', handle: false }, { s: 20.6, w: 1.0, h: 2.2, col: '#2b3238', frame: '#2a2d33', glass: '#4a5862' }, { s: 28.8, w: 0.95, h: 2.2, col: '#d9601f', frame: '#d9601f', glass: '#4a5862' }],
      windows: [
        { s: 1.95, w: 1.3, h: 1.5, y: 4.65, frame: '#efe9d6', surround: 0.07, mull: true, bars: 1 }, { s: 5.2, w: 1.3, h: 1.5, y: 4.65, frame: '#efe9d6', surround: 0.07, mull: true, bars: 1 },
        ...[[9.6, 1.0], [11.7, 1.0], [13.5, 0.95], [15.0, 0.85]].map(([s, w]) => ({ s, w, h: 1.55, y: 4.35, frame: '#e5e2d9', surround: 0.07, bars: 1, rail: true })),
        { s: 17.6, w: 0.9, h: 1.6, y: 4.3, frame: '#e5e2d9', surround: 0.07, bars: 1 }, { s: 22.4, w: 0.9, h: 1.6, y: 4.3, frame: '#e5e2d9', surround: 0.07, bars: 1 },
      ],
      bays: [{ s: 19.9, w: 1.9, y0: 4.2, y1: 6.5, depth: 0.7, frame: '#f1eee6', canted: true }, { s: 26.0, w: 1.9, y0: 4.2, y1: 6.5, depth: 0.7, frame: '#f1eee6', canted: true }, { s: 29.2, w: 1.9, y0: 4.2, y1: 6.5, depth: 0.7, frame: '#f1eee6', canted: true }],
      paints: [{ text: 'SUFFOLK HOUSE', s: 12.5, y: 6.35, w: 3.6, h: 0.5, col: '#2c2f33', font: 'Arial, Helvetica, sans-serif', weight: 'bold' }],
      cornices: [{ s0: 0, s1: 6.5, col: '#e0d4a8', dentils: true, out: 0.28, h: 0.25 }, { s0: 6.5, s1: 30.9, col: '#ebe8df', dentils: true, out: 0.25, h: 0.22 }],
      dormers: [
        { s: 3.25, w: 2.1, y0: 7.8, wallH: 1.0, rise: 1.0, front: '#ece9e0', barge: '#e8e6df', roof: '#6b6e75', win: '#47525b' },
        { s: 10.7, w: 1.7, y0: 7.8, wallH: 0.95, rise: 0.8, front: '#25272b', barge: BLACK, roof: '#3d4046', winFrame: '#e8e6df' },
        { s: 14.0, w: 1.5, y0: 7.8, wallH: 0.95, rise: 0.8, front: '#25272b', barge: BLACK, roof: '#3d4046', winFrame: '#e8e6df' },
        { s: 27.6, w: 1.5, y0: 7.8, wallH: 0.95, rise: 0.8, front: '#ece9e0', barge: BLACK, roof: '#3d4046' },
      ],
      roofs: [{ s0: 6.5, s1: 16.0, y0: 7.8, rise: 2.0, depth: 7, col: '#4a4d55' }, { s0: 16.0, s1: 30.9, y0: 7.8, rise: 2.0, depth: 7, col: '#4a4d55' }],
      chimneys: [{ s: 0.8, inset: 1.0, pitch: 0, rise: 1.6 }] })] },
};

export const SPLITS = {};      // none: the footprints are styled as single blocks
export const AREAS = {};
export const FASCIAS = {
  // sign colours read from the photos (k-*.png)
  'Scissor Trix': { fascia: '#4a515d', text: '#ffffff', case: 'upper', font: 'sans', weight: 'bold' },
  "Livia's Boutique": { fascia: '#141416', text: '#d6bf7c', case: 'mixed', font: 'serif', weight: 'regular' },
  'Nutshells by the Sea': { fascia: '#2c3937', text: '#e9e4d2', case: 'mixed', font: 'serif', weight: 'bold' },
  'Glow': { fascia: '#141517', text: '#f3f1ec', case: 'upper', font: 'sans', weight: 'regular' },
  'Blue Naan': { fascia: '#17181b', text: '#ffffff', case: 'mixed', font: 'sans', weight: 'bold' },
  'China Palace': { fascia: '#6d1d1b', text: '#f0cf6a', case: 'upper', font: 'serif', weight: 'bold' },
  'Greyfriars Carpets Beds Flooring': { fascia: '#17191d', text: '#ffffff', case: 'upper', font: 'sans', weight: 'bold' },
  'The Basic Life Charity': { fascia: '#f1efe9', text: '#1c3d8c', case: 'mixed', font: 'serif', weight: 'bold' },
};
export const OVERRIDES = {
  n3910851751: { name: 'Scissor Trix', kind: 'hairdresser', status: 'replaced', was: 'Scissor-Trix', evidence: ['User-supplied Street View, Sept 2026 (k-scissor-trix-livias-nutshells.png)'], note: 'Fascia reads SCISSOR TRIX, 1 Hamilton Road' },
  n6865114932: { name: "Livia's Boutique", kind: 'clothes', status: 'replaced', was: 'Livias Boutique', evidence: ['User-supplied Street View, Sept 2026 (k-scissor-trix-livias-nutshells.png)'], note: "Black timber front, gold lettering LIVIA'S BOUTIQUE" },
  n6865114916: { name: 'Glow', kind: 'hairdresser', status: 'replaced', was: 'Glow Studios', evidence: ['User-supplied Street View, Sept 2026 (k-glow-studio8-gables.png)'], note: 'Black fascia lettered GLOW and Studio8, 3-5 Hamilton Road' },
  n6865114919: { name: 'Greyfriars Carpets Beds Flooring', kind: 'carpet', status: 'replaced', was: 'Greyfriars', evidence: ['User-supplied Street View, Sept 2026 (k-greyfriars-suffolk-house.png)'], note: 'Black fascia GREYFRIARS | CARPETS | BEDS | FLOORING; SUFFOLK HOUSE painted on the wall above' },
};
export const ADDITIONS = [];
