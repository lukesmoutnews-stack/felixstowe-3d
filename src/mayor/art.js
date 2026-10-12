// Original artwork drawn in code: logo, seaside skyline, avatars, stamps and icons.

export function logo({ compact = false } = {}) {
  if (compact) return `<svg class="logo-compact" viewBox="0 0 248 44" role="img" aria-label="Felixstowe – The Game"><g transform="translate(2 4)">${hallGlyph(30, 'var(--navy)', 'var(--gold)')}</g><g font-family="var(--display)" font-weight="800">
    <text x="40" y="30" font-size="27" fill="var(--navy)" textLength="150" lengthAdjust="spacingAndGlyphs">FELIXSTOWE</text><text x="198" y="16" font-size="9.5" fill="var(--teal)" letter-spacing="1.2">THE</text><text x="198" y="28" font-size="9.5" fill="var(--teal)" letter-spacing="1.2">GAME</text></g>
    <rect x="40" y="36" width="150" height="4" rx="2" fill="var(--coral)"/><rect x="190" y="36" width="44" height="4" rx="2" fill="var(--gold)"/></svg>`;
  return `<svg class="logo" viewBox="0 0 360 170" role="img" aria-label="Felixstowe – The Game: Race to Be Mayor">
    <rect x="8" y="30" width="344" height="92" rx="20" fill="var(--navy)"/>
    <path d="M8 98 Q 60 88 110 98 T 210 98 T 310 98 T 352 98 V102 a20 20 0 0 1 -20 20 H28 a20 20 0 0 1 -20 -20Z" fill="var(--teal)"/>
    <g transform="translate(150 0)">${hallGlyph(60, 'var(--navy)', 'var(--gold)', true)}</g>
    <text x="180" y="88" text-anchor="middle" font-family="var(--display)" font-weight="800" font-size="44" textLength="290" lengthAdjust="spacingAndGlyphs" fill="var(--paper)">FELIXSTOWE</text>
    <text x="180" y="108" text-anchor="middle" font-family="var(--display)" font-weight="700" font-size="11" letter-spacing="5" fill="var(--gold)">THE GAME</text>
    <g transform="translate(180 140)"><path d="M-150 -14 H150 L138 0 L150 14 H-150 L-138 0Z" fill="var(--coral)"/>
      <text y="6" text-anchor="middle" font-family="var(--display)" font-weight="800" font-size="17" textLength="230" lengthAdjust="spacingAndGlyphs" fill="var(--paper)">RACE TO BE MAYOR</text></g></svg>`;
}

/** Simplified Town Hall front (gabled bay, hipped roof, portico) used as the game's emblem. */
export function hallGlyph(w, ink, accent, framed = false) {
  const h = w * 0.62, k = w / 60;
  return `<svg x="0" y="0" width="${w}" height="${h + (framed ? 6 * k : 0)}" viewBox="0 0 60 ${37 + (framed ? 6 : 0)}" overflow="visible">
    ${framed ? `<rect x="-4" y="-1" width="68" height="41" rx="8" fill="${accent}"/>` : ''}
    <g fill="${ink}"><path d="M2 14 L8 7 H36 L38 14Z"/><rect x="2" y="14" width="36" height="22"/><path d="M38 14 L48 4 L58 14Z"/><rect x="39" y="14" width="18" height="22"/><rect x="12" y="2" width="3" height="6"/><rect x="28" y="3" width="3" height="5"/></g>
    <g fill="${framed ? accent : '#fffaf0'}" opacity="${framed ? 1 : 0.95}">${[5, 11, 18, 24].map((x) => `<rect x="${x}" y="17" width="4" height="5"/><rect x="${x}" y="26" width="4" height="6"/>`).join('')}<rect x="44" y="17" width="8" height="5"/><rect x="44" y="26" width="8" height="6"/><circle cx="48" cy="10" r="1.6"/></g>
    <path d="M29.5 36 V27 a3 3 0 0 1 6 0 V36Z" fill="${framed ? '#ef6a56' : accent}"/><rect x="28.5" y="24" width="8" height="1.5" fill="${framed ? accent : '#fffaf0'}"/></svg>`;
}

/** The Town Hall at dusk, lighting up as the player's rank rises (level 0-5). Original drawing. */
export function townHallArt(level = 0) {
  const lit = (n) => level >= n; const on = '#ffd166', off = '#2d4566', glow = (n) => (lit(n) ? `filter="url(#th-glow)"` : '');
  const win = (x, y, w, h, n) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1" fill="${lit(n) ? on : off}" ${glow(n)}/><path d="M${x} ${y + h * 0.6} H${x + w} M${x + w / 2} ${y} V${y + h}" stroke="#f6f4ee" stroke-width="1.2"/>`;
  const rays = lit(5) ? Array.from({ length: 9 }, (_, i) => { const a = -Math.PI / 2 + (i - 4) * 0.22; return `<path d="M278 44 L${(278 + Math.cos(a) * 60).toFixed(1)} ${(44 + Math.sin(a) * 60).toFixed(1)}" stroke="${on}" stroke-width="3" stroke-linecap="round" opacity=".8"/>`; }).join('') : '';
  return `<svg class="th-art" viewBox="0 0 360 220" role="img" aria-label="Felixstowe Town Hall at dusk, ${level} of 5 parts lit">
    <defs><linearGradient id="th-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#10233f"/><stop offset="1" stop-color="#1d5b70"/></linearGradient>
      <filter id="th-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <rect width="360" height="220" fill="url(#th-sky)"/>
    ${[[30, 30], [70, 18], [120, 40], [330, 26], [205, 14], [160, 22]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.2" fill="#fffaf0" opacity=".7"/>`).join('')}
    ${rays}<circle cx="278" cy="44" r="${lit(5) ? 9 : 4}" fill="${lit(5) ? on : off}" ${glow(5)}/>
    <path d="M0 196 H360 V220 H0Z" fill="#0b1a2e"/>
    <g transform="translate(26 0)">
      <path d="M8 92 L26 72 H206 L214 92Z" fill="#7d3b26"/>${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => `<path d="M${40 + i * 13} 72 l3 -4 l3 4" fill="#c06a40"/>`).join('')}
      <rect x="62" y="48" width="14" height="26" fill="#a8452a"/><rect x="146" y="52" width="14" height="22" fill="#a8452a"/>
      <rect x="8" y="92" width="206" height="104" fill="#b5502e"/><rect x="8" y="92" width="206" height="7" fill="#c06a40"/><rect x="8" y="140" width="206" height="3" fill="#d9a77e"/><rect x="8" y="186" width="206" height="10" fill="#1f2840"/>
      ${[20, 50, 92, 120].map((x) => win(x, 104, 20, 30, 2) + win(x, 150, 20, 32, 1)).join('')}
      ${win(166, 104, 18, 30, 2)}
      <g><rect x="158" y="146" width="34" height="40" fill="#d9a77e"/><rect x="154" y="140" width="42" height="7" fill="#e4b88e"/><path d="M162 140 L175 128 L188 140Z" fill="#d9a77e"/><circle cx="175" cy="124" r="3" fill="#e4b88e"/>
        <path d="M166 186 V160 a9 9 0 0 1 18 0 V186Z" fill="${lit(3) ? '#2f5bd0' : '#1f3570'}" ${glow(3)}/><path d="M166 160 a9 9 0 0 1 18 0Z" fill="${lit(3) ? on : off}"/>
        <path d="M160 196 H190 L186 186 H164Z" fill="#c98a5e"/></g>
      <rect x="214" y="80" width="86" height="116" fill="#b5502e"/><path d="M210 82 L257 44 L304 82Z" fill="#a8452a"/><path d="M220 80 L257 50 L294 80Z" fill="#c25d36"/>
      <circle cx="257" cy="68" r="7" fill="${lit(4) ? on : '#8f3b22'}" ${glow(4)}/><path d="M246 68 a11 11 0 0 1 22 0" fill="none" stroke="#d9a77e" stroke-width="2"/>
      <path d="M230 186 V104 L240 96 H274 L284 104 V186Z" fill="#a8452a"/>${win(241, 104, 32, 30, 4)}${win(241, 150, 32, 32, 4)}${win(231, 108, 8, 24, 4)}${win(275, 108, 8, 24, 4)}${win(231, 154, 8, 26, 4)}${win(275, 154, 8, 26, 4)}
      <rect x="214" y="186" width="86" height="10" fill="#1f2840"/>
    </g>
    ${lit(5) ? `<g>${Array.from({ length: 14 }, (_, i) => `<path d="M${34 + i * 22} 66 l6 10 l6 -10" fill="${['#ef6a56', '#f2b632', '#13a3a0'][i % 3]}"/>`).join('')}<path d="M30 66 Q 180 80 330 62" stroke="#fffaf0" stroke-width="1" fill="none"/></g>` : ''}
  </svg>`;
}

export function rosette(r = 16) {
  const petals = Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return `<circle cx="${(Math.cos(a) * r * 0.62).toFixed(1)}" cy="${(Math.sin(a) * r * 0.62).toFixed(1)}" r="${(r * 0.42).toFixed(1)}" fill="var(--gold)"/>`; }).join('');
  return `<path d="M${-r * 0.5} ${r * 0.4} L${-r * 0.8} ${r * 1.7} L${-r * 0.2} ${r * 1.3} L0 ${r * 1.8} L${r * 0.2} ${r * 0.5}Z" fill="var(--coral)"/>${petals}<circle r="${r * 0.6}" fill="var(--paper)"/><circle r="${r * 0.42}" fill="var(--coral)"/>`;
}

/** Seaside skyline: pier building, beach huts, Martello tower and port cranes (original drawing). */
export function skyline() {
  const huts = ['#ef6a56', '#f2b632', '#13a3a0', '#fffaf0', '#4b6cb7', '#ef6a56', '#f2b632'].map((c, i) => `<g transform="translate(${150 + i * 17} 120)"><path d="M0 0 L7 -8 L14 0 V16 H0Z" fill="${c}" stroke="#10233f" stroke-width="1.2"/><rect x="5" y="6" width="4" height="10" fill="#10233f" opacity=".35"/></g>`).join('');
  return `<svg class="skyline" viewBox="0 0 360 160" role="img" aria-label="Illustration of the Felixstowe seafront">
    <rect width="360" height="160" fill="#cfe9ea"/>
    <circle cx="300" cy="38" r="20" fill="#f2b632"/>
    <path d="M0 96 H360 V160 H0Z" fill="#7cc4c3"/>
    <path d="M0 104 Q 40 99 80 104 T 160 104 T 240 104 T 320 104 T 400 104 V160 H0Z" fill="#13a3a0" opacity=".55"/>
    <g fill="#10233f" opacity=".75"><rect x="300" y="58" width="4" height="40"/><path d="M286 60 H340 V64 H286Z"/><rect x="318" y="64" width="3" height="16"/><rect x="330" y="50" width="4" height="48"/><path d="M314 52 H356 V56 H314Z"/></g>
    <g transform="translate(18 74)"><path d="M0 26 L4 0 H34 L38 26Z" fill="#e9dfc6" stroke="#10233f" stroke-width="1.5"/><rect x="15" y="12" width="8" height="14" fill="#10233f"/><path d="M0 0 H38 V4 H0Z" fill="#10233f"/></g>
    <g transform="translate(66 64)"><rect x="0" y="16" width="70" height="20" fill="#fffaf0" stroke="#10233f" stroke-width="1.5"/>
      <rect x="10" y="0" width="12" height="36" fill="#fffaf0" stroke="#10233f" stroke-width="1.5"/><rect x="48" y="0" width="12" height="36" fill="#fffaf0" stroke="#10233f" stroke-width="1.5"/>
      <rect x="7" y="-4" width="18" height="5" fill="#24395c"/><rect x="45" y="-4" width="18" height="5" fill="#24395c"/><rect x="24" y="20" width="22" height="7" fill="#4b6cb7"/>
      <path d="M70 32 H150" stroke="#10233f" stroke-width="3"/>${[80, 100, 120, 140].map((x) => `<path d="M${x} 32 V44" stroke="#10233f" stroke-width="2"/>`).join('')}</g>
    <path d="M0 136 Q 90 128 180 136 T 360 134 V160 H0Z" fill="#f1e4c8"/>${huts}
    <g stroke="#10233f" stroke-width="1.5" opacity=".6"><path d="M250 140 L270 138"/><path d="M200 146 L216 145"/></g></svg>`;
}

export function avatar(name = '?', colour = '#0e7c7b', size = 40, extra = '') {
  const initials = String(name).trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  return `<span class="avatar ${extra}" style="--av:${colour};width:${size}px;height:${size}px;font-size:${Math.round(size * 0.4)}px" aria-hidden="true">${escapeHtml(initials)}</span>`;
}

const ICON_PATHS = {
  news: 'M4 5h13v14H6a2 2 0 0 1-2-2V5zM17 9h3v8a2 2 0 0 1-2 2M7 9h7M7 12h7M7 15h4',
  home: 'M3 11 L12 3 L21 11 V21 H14 V15 H10 V21 H3Z',
  explore: 'M12 2 C7 2 4 6 4 10 C4 16 12 22 12 22 C12 22 20 16 20 10 C20 6 17 2 12 2Z M12 7 A3 3 0 1 1 11.99 7Z',
  missions: 'M5 3 H15 L19 7 V21 H5Z M8 11 H16 M8 15 H16 M8 7 H12',
  leaderboard: 'M3 21 V13 H8 V21Z M9.5 21 V6 H14.5 V21Z M16 21 V10 H21 V21Z',
  profile: 'M12 3 A4.5 4.5 0 1 1 11.99 3Z M3.5 21 C4.5 15.5 8 13.5 12 13.5 C16 13.5 19.5 15.5 20.5 21Z',
  qr: 'M3 3 H10 V10 H3Z M14 3 H21 V10 H14Z M3 14 H10 V21 H3Z M14 14 H17 V17 H14Z M18 18 H21 V21 H18Z M18 14 H21 M14 21 H16',
  close: 'M5 5 L19 19 M19 5 L5 19', back: 'M15 4 L7 12 L15 20', check: 'M4 12 L10 18 L20 6',
  pin: 'M12 2 C8 2 5 5 5 9 C5 14 12 22 12 22 C12 22 19 14 19 9 C19 5 16 2 12 2Z', guide: 'M12 2 L20 21 L12 16 L4 21Z',
  search: 'M10 3 A7 7 0 1 1 9.99 3Z M15 15 L21 21', list: 'M4 6 H20 M4 12 H20 M4 18 H20', map: 'M3 6 L9 3 L15 6 L21 3 V18 L15 21 L9 18 L3 21Z M9 3 V18 M15 6 V21',
  eye: 'M2 12 C5 6 19 6 22 12 C19 18 5 18 2 12Z M12 9 A3 3 0 1 1 11.99 9Z', star: 'M12 2 L15 9 L22 9.5 L16.5 14 L18.5 21 L12 17 L5.5 21 L7.5 14 L2 9.5 L9 9Z',
  camera: 'M3 8 H7 L9 5 H15 L17 8 H21 V20 H3Z M12 10 A4 4 0 1 1 11.99 10Z', upload: 'M12 16 V4 M7 9 L12 4 L17 9 M4 20 H20', keyboard: 'M2 6 H22 V18 H2Z M6 10 H7 M10 10 H11 M14 10 H15 M18 10 H18.5 M7 14 H17',
  shop: 'M3 9 L5 3 H19 L21 9 Z M4 9 V21 H20 V9 M9 21 V14 H15 V21', flag: 'M5 21 V3 M5 4 H17 L14 8 L17 12 H5', people: 'M8 11 A3 3 0 1 1 7.99 11Z M16 11 A3 3 0 1 1 15.99 11Z M2 21 C3 16 13 16 14 21 M10 21 C11 16 21 16 22 21',
  overview: 'M12 3 L21 8 L12 13 L3 8Z M3 13 L12 18 L21 13', street: 'M12 4 A3 3 0 1 1 11.99 4Z M8 22 L10 12 H14 L16 22', lock: 'M6 11 H18 V21 H6Z M8 11 V7 A4 4 0 0 1 16 7 V11',
  external: 'M14 4 H20 V10 M20 4 L11 13 M18 14 V20 H4 V6 H10', hall: 'M2 11 L5 7 H14 L15 11 Z M2 11 V21 H22 V11 M15 11 L18.5 6 L22 11 M11 21 V16 a1.5 1.5 0 0 1 3 0 V21 M5 14 H7 M9 14 H11 M17 14 H20 M17 18 H20', admin: 'M12 2 L20 6 V12 C20 17 16 21 12 22 C8 21 4 17 4 12 V6Z',
};
export function icon(name, cls = '') { return `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICON_PATHS[name] || ''}"/></svg>`; }

/** Business stamp: a round postmark-style stamp drawn from the business name. */
export function stamp(loc, got, date) {
  const hue = [...loc.id].reduce((s, c) => s + c.charCodeAt(0), 0) % 4;
  const col = ['var(--coral)', 'var(--teal)', 'var(--navy)', '#b9831c'][hue];
  const words = loc.name.replace(/^The /, '').toUpperCase();
  return `<figure class="stamp ${got ? 'got' : ''}" style="--st:${col}" title="${escapeHtml(loc.name)}">
    <svg viewBox="0 0 100 100" aria-hidden="true"><defs><path id="sp-${loc.id}" d="M50 50 m-36 0 a36 36 0 1 1 72 0 a36 36 0 1 1 -72 0"/></defs>
      <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" stroke-width="3" stroke-dasharray="${got ? '0' : '4 4'}"/><circle cx="50" cy="50" r="28" fill="none" stroke="currentColor" stroke-width="1.5"/>
      <text font-size="9.5" font-weight="800" letter-spacing="1.2" fill="currentColor"><textPath href="#sp-${loc.id}">${escapeHtml(words.slice(0, 26))}</textPath></text>
      <text x="50" y="47" text-anchor="middle" font-size="9" font-weight="800" fill="currentColor">${got ? 'VISITED' : 'NOT YET'}</text>
      <text x="50" y="60" text-anchor="middle" font-size="8" fill="currentColor">${got ? escapeHtml(date) : 'FELIXSTOWE'}</text></svg>
    <figcaption>${escapeHtml(loc.name)}</figcaption></figure>`;
}

export function escapeHtml(s) { return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
