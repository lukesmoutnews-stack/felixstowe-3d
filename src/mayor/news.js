// Felixstowe News – Game Edition. Fictional articles generated from what the player does in the game.
// Nothing here is real reporting: every story is about the player's character and the game's invented
// cast, and is labelled as a game story. The brand belongs to Felixstowe News (www.felixstowenews.co.uk)
// and is used with the owner's permission to promote the website.
//
// News is related to reputation but separate: an article never adds or removes reputation points.

import { seeded } from './reputation.js';

export const BRAND = {
  name: 'Felixstowe News', edition: 'Game Edition', url: 'https://www.felixstowenews.co.uk', display: 'felixstowenews.co.uk',
  logo: 'icons/felixstowe-news.png', yellow: '#ffdb00', ink: '#0b0b0d',
  disclaimer: 'Game Edition: a fictional story generated from your play in Race to Be Mayor. It has not been published by Felixstowe News and describes no real people or events.',
};

const pick = (arr, ...seed) => arr[Math.floor(seeded(...seed) * arr.length) % arr.length];

// Each generator returns { headline, standfirst, body[], tone, breaking?, section }.
// `n` = the player's display name, `d` = event data, `g` = the Game.
const STORIES = {
  first_checkin: (n, d) => ({ section: 'Town', tone: 'good',
    headline: pick(['Newcomer Makes First Stop on the Road to the Town Hall', 'A New Face on the Campaign Trail', `${n} Signs the Visitors’ Book`], n, 'fc'),
    standfirst: `${n} has made a first verified visit, to ${d.place}, in the race to become the game’s fictional mayor.`,
    body: [`Staff at ${d.place} said the newcomer “seemed keen”, which in Felixstowe is high praise.`, 'The race to the Town Hall steps is a long one. Observers will be watching for staying power.'] }),
  mission_business: (n, d) => ({ section: 'Business', tone: 'good',
    headline: pick(['Local Shops See Fresh Interest Following Town-Wide Challenge', `${d.place || 'High Street'} Enjoys a Visit from the Campaign Trail`, 'Independent Traders Welcome a Busy Candidate'], n, d.id),
    standfirst: `${n} has completed “${d.title}”, and traders in the game are noticing.`,
    body: ['“It’s nice when someone actually comes in,” said one fictional shopkeeper, refusing to be named because the game hasn’t given her one.', 'Business Support counts for a lot on the road to the Town Hall.'] }),
  mission_trail: (n, d) => ({ section: 'Campaign', tone: 'good', breaking: true,
    headline: pick([`${n} Completes ${d.title}`, 'Trail Blazer: Candidate Ticks Off Every Stop', 'From Pier to Prom: Campaign Covers the Ground'], n, d.id),
    standfirst: `Every stop on ${d.title} has been visited. Rival candidates are said to be “checking their maps”.`,
    body: ['Trails take time and real legwork, so they impress both residents and traders.', 'Marjorie Quill (Seafront First, fictional) declined to comment, then commented at length.'] }),
  mission_community: (n, d) => ({ section: 'Community', tone: 'good',
    headline: pick(['Newcomer Wins Support from Felixstowe Residents', 'Candidate Rolls Up Sleeves for the Town', 'Community Spirit on Show'], n, d.id),
    standfirst: `${n} turned up for “${d.title}”. Residents in the game approve.`,
    body: ['Community Standing rises fastest for those who show up, not those who talk about showing up.'] }),
  mission_exploration: (n, d) => ({ section: 'Heritage', tone: 'good',
    headline: pick(['Candidate Brushes Up on Town History', 'Heritage Hunter Hits the Seafront', 'Know Your Town: Candidate Passes the Test'], n, d.id),
    standfirst: `${n} completed “${d.title}”.`, body: ['Knowing the difference between the Spa Pavilion and the pier building is a basic requirement for any would-be mayor.'] }),
  good_deed: (n, d) => ({ section: 'Community', tone: 'good',
    headline: pick(['Local Hero Lends a Hand', `${d.title}: Candidate Steps In`, 'Good Turn Gets Tongues Wagging (Nicely)'], n, d.id),
    standfirst: d.outcome, body: ['Small acts add up. Residents in the game remember who helped.'] }),
  refused: (n, d) => ({ section: 'Campaign', tone: 'good',
    headline: pick(['Candidate Says No to Temptation', 'Clean Hands on the Campaign Trail', 'Integrity Spotted in Felixstowe'], n, d.id),
    standfirst: `Sources inside the game say ${n} turned down “${d.title}”.`, body: [d.outcome, 'Public Trust is the one thing a candidate can’t buy back cheaply.'] }),
  exposed: (n, d) => ({ section: 'Investigation', tone: 'bad', breaking: true,
    headline: d.story === 'keys' ? 'Police Investigate Simulated Vehicle Theft in Mayor’s Race'
      : d.story === 'envelope' ? 'Questions Raised Over Candidate’s Campaign Funds'
        : d.story === 'crib' ? 'Quiz Answers Scandal Rocks the Race'
          : d.story === 'vehicle' ? 'Borrowed Vehicle Found Abandoned: Candidate Named'
            : pick(['Questions Raised Over Candidate’s Behaviour', `“${d.title}”: The Story ${n} Hoped Would Stay Hidden`, 'Campaign Hit by Embarrassing Revelation'], n, d.story),
    standfirst: `The fictional episode “${d.title}” has come to light${d.stage === 'finale' ? ' as the press digs into every candidate before the final' : ''}.`,
    body: ['Everything described happened inside the game, to invented characters.', d.mark ? 'The episode leaves a mark on the candidate’s record that only a proper redemption will clear.' : 'Residents are talking. Whether they keep talking depends on what happens next.'] }),
  confessed: (n, d) => ({ section: 'Campaign', tone: 'mixed',
    headline: pick(['Candidate Owns Up', `“I Got It Wrong”: ${n} Comes Clean`, 'Honesty After the Fact'], n, d.story),
    standfirst: `${n} pinned a confession to the Town Hall noticeboard about “${d.title}”.`, body: ['Owning up before being found out halves the damage, say campaign veterans.'] }),
  redemption: (n, d) => ({ section: 'Community', tone: 'good',
    headline: pick(['Redemption on the Prom', 'Putting It Right: Candidate Makes Amends', 'A Second Chance, Earned'], n, d.id),
    standfirst: `${n} has completed “${d.title}”.`, body: ['It won’t erase the past, but residents in the game appreciate the effort.'] }),
  rank: (n, d) => ({ section: 'Campaign', tone: 'good', breaking: d.rank === 'candidate',
    headline: d.rank === 'candidate' ? `${n} Declares: Race to Be Mayor Heats Up` : pick([`${n} Rises to ${d.name}`, 'Race to Be Mayor Heats Up as Candidate Gains Support', `Momentum Builds: ${n} Now a ${d.name}`], n, d.rank),
    standfirst: `${n} has reached the rank of ${d.name}.`, body: ['The Town Hall steps are a little closer.'] }),
  level_up: (n, d) => ({ section: 'Special report', tone: 'good', breaking: true, special: true,
    headline: d.level === 'pillar' ? `Pillar of the Town: How ${n} Won Felixstowe Over` : `From Newcomer to Trusted Local: The Rise of ${n}`,
    standfirst: `A special report on a candidate whose reputation has reached ${d.name}.`,
    body: ['Traders have posters in their windows. Residents wave across the Triangle.', 'Rivals in the game are, by all accounts, rattled.'] }),
  level_down: (n, d) => ({ section: 'Investigation', tone: 'bad', breaking: true,
    headline: d.level === 'pariah' ? `“Who Is This Person?” Town Turns on ${n}` : 'Candidate Under a Cloud',
    standfirst: `${n}’s reputation has slipped to ${d.name}.`, body: ['Recovery is possible, say observers, but it takes real redemption, not just a few good deeds.'] }),
  endorsement: (n, d) => ({ section: 'Campaign', tone: 'good',
    headline: `${d.name} Backs ${n}`, standfirst: `An endorsement for ${n} in the race to the Town Hall.`, body: ['Endorsements are earned, never bought.'] }),
  final_open: (n) => ({ section: 'Campaign', tone: 'mixed', breaking: true,
    headline: 'Who Will Become Felixstowe’s Next Fictional Mayor?', standfirst: `${n} has entered the final challenge.`, body: ['The fictional press has looked into every candidate. The rest is down to the Mayor’s Walk.'] }),
  mayor: (n) => ({ section: 'Front page', tone: 'good', breaking: true, special: true,
    headline: `${n} Wins the Race to Be Mayor`, standfirst: `${n} is the fictional Mayor of Felixstowe for this season of the game.`,
    body: ['Celebrations on the Town Hall steps, in the game. The title carries no real civic authority, and the bunting is entirely fictional.'] }),
  reckless: (n) => ({ section: 'Roads', tone: 'bad',
    headline: 'Reckless Driving Reported in the Game’s Town Centre', standfirst: `Residents in the game complain about ${n}’s driving.`, body: ['All driving happens inside the game. In real life, drive safely and follow the Highway Code.'] }),
};

/** Methods installed on Game.prototype. */
export const NewsMixin = {
  news() { return (this.p.news ||= []); },
  /** Publish an article for a game event. Returns the article (or null). Never changes reputation. */
  publish(type, data = {}) {
    const gen = STORIES[type]; if (!gen || !this.p.player) return null;
    const key = data.key || `${type}:${data.id || data.story || data.rank || data.level || ''}`;
    if (this.news().some((a) => a.key === key)) return null;
    const a = { id: 'n' + this.now().toString(36) + this.news().length, key, type, ts: this.now(), ...gen(this.p.player.name, data, this), link: data.link || null, read: false };
    this.news().unshift(a); this.news().length = Math.min(this.news().length, 60);
    this._event('news', { type });
    (this._newsOut ||= []).push(a);
    return a;
  },
  /** Articles published since the last call (for breaking-news pop-ups). */
  takeNews() { const out = this._newsOut || []; this._newsOut = []; return out; },
  latestHeadline() { return this.news()[0] || null; },
};
