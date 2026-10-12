// Felixstowe's fictional residents and influence groups. Every character is invented: none
// represents a real person, and none speaks for any real resident, business or organisation.

export const GROUPS = [
  { id: 'business', name: 'Local business owners', short: 'Traders', colour: '#ef6a56', blurb: 'Value customers, reliability and support for independents.' },
  { id: 'families', name: 'Families and young people', short: 'Families', colour: '#4b6cb7', blurb: 'Want safe public spaces, things to do and a cleaner seafront.' },
  { id: 'volunteers', name: 'Community volunteers', short: 'Volunteers', colour: '#2e8a57', blurb: 'Notice who turns up and helps, not who talks about it.' },
  { id: 'coastal', name: 'Coastal and environmental advocates', short: 'Coastal', colour: '#0e7c7b', blurb: 'Care about the shingle, the reserve and the wildlife.' },
  { id: 'longstanding', name: 'Long-standing residents', short: 'Old hands', colour: '#7a5c99', blurb: 'Care about benches, buses, history and being listened to.' },
  { id: 'visitors', name: 'Visitors and tourism workers', short: 'Visitors', colour: '#f2b632', blurb: 'Want a welcoming, easy-to-explore town.' },
];
export const INF = { start: 35, endorse: 60, max: 100 };

const look = (o) => ({ body: 'c', height: 1, build: 1, skin: 2, hair: 'short', hairColour: 2, facial: 'none', glasses: false, top: 'tee', topColour: 0x24395c, outer: null, outerColour: 0x24395c, legs: 'trousers', legsColour: 0x2b2b30, shoes: 0x1a1a1a, bag: false, ...o });

// Dialogue: each node has what they say, their mood, and choices. A choice may change group support
// (eff), reputation (rep), set memory flags, make a promise, reveal a place, or offer a mission.
export const RESIDENTS = [
  { id: 'maggie', name: 'Maggie Thorne', role: 'Runs the Kittiwake Bakehouse (fictional)', group: 'business', at: 'kittiwake', personality: 'Brisk, warm, hates being let down',
    look: look({ body: 'b', skin: 1, hair: 'bun', hairColour: 6, top: 'tee', topColour: 0xf4f1ea, outer: null, legs: 'trousers', legsColour: 0x2b2b30, glasses: true, height: 0.95 }),
    greet: { pillar: 'There’s my favourite candidate! Bun’s on the house. In the game, mind.', trusted: 'Morning, love. You’re making a name for yourself.', known: 'Morning. What can I do you for?', cloud: 'Oh. It’s you. I’ve heard things.', pariah: 'I’d rather you didn’t hang about by the door, if it’s all the same.' },
    nodes: {
      start: { say: 'New, are you? Everyone says they’ll support local. Then they buy their bread at the big shop.', mood: 'suspicious', choices: [
        { label: 'I mean it. Small shops are the heart of a town.', reply: 'We’ll see. Words are cheap; sourdough isn’t.', eff: { business: 3 }, next: 'ask' },
        { label: 'Prices are a bit steep, though.', reply: 'Butter costs what butter costs. Good luck with your campaign.', mood: 'disappointed', eff: { business: -4 }, end: true },
      ] },
      ask: { say: 'Tell you what. Pop in properly some time, scan the code by the till, and I’ll know you’re not all talk.', mood: 'neutral', choices: [
        { label: 'I promise I’ll visit this week.', promise: { id: 'maggie_visit', text: 'Visit The Kittiwake Bakehouse in person (QR check-in)', check: 'visit:kittiwake', days: 7, keep: { business: 8 }, broke: { business: -6 } }, reply: 'Hold you to that.', mood: 'happy', end: true },
        { label: 'I can’t promise, but I’ll try.', reply: 'Honest, at least.', eff: { business: 1 }, end: true },
      ] },
      again: { say: 'Busy morning. The queue was out the door before the gulls were up.', mood: 'neutral', choices: [
        { label: 'What would help traders round here?', reply: 'Parking that doesn’t cost a fortune, and people who actually come in. You could start with the second one.', eff: { business: 2 }, end: true, set: ['maggie_asked'] },
        { label: 'See you later, Maggie.', end: true },
      ] },
      kept: { say: 'You came in. Most don’t. I’ve told the others on the High Street you’re all right.', mood: 'happy', choices: [{ label: 'Told you I would.', end: true }] },
      broken: { say: 'Said you’d pop in. Didn’t. People notice that sort of thing round here.', mood: 'disappointed', choices: [{ label: 'You’re right. Sorry, Maggie.', eff: { business: 1 }, rep: { trust: 1 }, end: true }, { label: 'I’ve been busy.', eff: { business: -2 }, end: true }] },
    } },
  { id: 'priya', name: 'Priya Desai', role: 'Coffee hatch at the Ferry (Tidewrack Coffee, fictional)', group: 'business', at: 'tidewrack', personality: 'Upbeat, practical, a bit of a gossip',
    look: look({ body: 'b', skin: 4, hair: 'ponytail', hairColour: 0, top: 'breton', topColour: 0x0e7c7b, legs: 'jeans', legsColour: 0x3a4f6b, shoes: 0xf4f2ee }),
    greet: { pillar: 'The candidate everyone’s talking about! Flat white?', trusted: 'Hiya! Walkers have been mentioning you.', known: 'Morning! Ferry’s running, tide’s in.', cloud: 'Hmm. The sailors had a lot to say about you.', pariah: 'Look, I don’t want trouble at the hatch.' },
    nodes: {
      start: { say: 'Half my customers are walkers off the river path. Ever done the walk to the Ferry?', mood: 'happy', choices: [
        { label: 'Not yet. Where should I start?', reply: 'From the golf course end. Watch the harbour boats on the way. I’ll mark it on your map.', discover: 'ferry', eff: { visitors: 3, business: 2 }, end: true },
        { label: 'Bit far out, isn’t it?', reply: 'That’s the point, love. It’s the best bit of the town.', eff: { visitors: -2 }, end: true },
      ] },
      again: { say: 'Did you hear? Someone saw a seal off the Ferry this morning. Or a log. Probably a log.', mood: 'happy', choices: [{ label: 'I’ll keep an eye out.', eff: { visitors: 1 }, end: true }, { label: 'Bye, Priya.', end: true }] },
    } },
  { id: 'bill', name: 'Bill Garrod', role: 'Retired docker, lifelong resident', group: 'longstanding', at: 'spa', personality: 'Sceptical, dry, secretly kind',
    look: look({ body: 'a', skin: 1, hair: 'buzz', hairColour: 7, facial: 'moustache', top: 'tee', topColour: 0x8a8f96, outer: 'peacoat', outerColour: 0x24395c, legs: 'trousers', legsColour: 0x3b3a3d, height: 0.97 }),
    greet: { pillar: 'Well, well. You’ve done all right, haven’t you.', trusted: 'Afternoon. Sit down a minute.', known: 'Another one running for mayor? Hmph.', cloud: 'Read about you in the paper. Not impressed.', pariah: 'I’ve nothing to say to you.' },
    nodes: {
      start: { say: 'Sixty years I’ve sat on this prom. They keep taking the benches away. Where’s an old man meant to sit?', mood: 'suspicious', choices: [
        { label: 'More benches, then. And somewhere to shelter from the wind.', reply: 'Now you’re talking sense. Don’t make promises you can’t keep, mind.', eff: { longstanding: 4 }, next: 'ask' },
        { label: 'Benches attract teenagers, though.', reply: 'So did I, once. Go on, off you go.', mood: 'disappointed', eff: { longstanding: -3, families: -2 }, end: true },
        { label: 'Tell me what it was like here in the old days.', reply: 'The pier used to go half a mile out, with a little electric tram. Look it up.', discover: 'pier', eff: { longstanding: 3 }, set: ['bill_story'], end: true },
      ] },
      ask: { say: 'Up at the Town Hall Garden there’s a proper shelter now. Mr. Felixstowe’s, they call it. Go and sit in it. Then tell me I’m wrong.', mood: 'neutral', choices: [
        { label: 'I promise I’ll go and see it.', promise: { id: 'bill_shelter', text: 'Visit the Town Hall Garden and Mr. Felixstowe’s Shelter (QR check-in)', check: 'visit:town_hall_garden', days: 10, keep: { longstanding: 8 }, broke: { longstanding: -5 } }, reply: 'We’ll see.', end: true },
        { label: 'Maybe another time.', end: true },
      ] },
      again: { say: 'Still here, then.', mood: 'neutral', choices: [{ label: 'Still here, Bill.', eff: { longstanding: 1 }, end: true }] },
      kept: { say: 'You went up to the shelter. Good view, isn’t it? Right. I might vote for you. Might.', mood: 'happy', choices: [{ label: 'I’ll take “might”.', end: true }] },
      broken: { say: 'Never went up to that shelter, did you. Thought not.', mood: 'disappointed', choices: [{ label: 'Fair point. I’ll go.', end: true }] },
    } },
  { id: 'jade', name: 'Jade Okafor', role: 'Parent of two, runs the school-gate group chat', group: 'families', at: 'martello_park', personality: 'Busy, direct, funny',
    look: look({ body: 'b', skin: 5, hair: 'curly', hairColour: 0, top: 'tee', topColour: 0xef6a56, outer: 'raincoat', outerColour: 0x24395c, legs: 'jeans', legsColour: 0x3a4f6b, shoes: 0xf4f2ee, bag: true }),
    greet: { pillar: 'The kids want your autograph. In crayon.', trusted: 'Oh hi! The group chat likes you.', known: 'Hi. Sorry, mid-snack-negotiation.', cloud: 'The group chat has… opinions about you.', pariah: 'Not in front of the children, please.' },
    nodes: {
      start: { say: 'What this town needs is somewhere safe for kids to play that isn’t next to a main road. Write that down.', mood: 'neutral', choices: [
        { label: 'Safe play spaces go on the list. What else?', reply: 'Toilets that are open. You’d be amazed how far that gets you with parents.', eff: { families: 4 }, set: ['jade_listened'], end: true },
        { label: 'Have you thought about a skate park instead?', reply: 'For my two? They’re four and six. Maybe in ten years.', eff: { families: 1 }, end: true },
        { label: 'That’s really a council matter.', reply: 'Then what are you running for?', mood: 'disappointed', eff: { families: -3 }, end: true },
      ] },
      again: { say: 'Did you do the litter pick? Kai said you might.', mood: 'neutral', choices: [{ label: 'Working on it.', end: true }, { label: 'Bye, Jade!', end: true }] },
    } },
  { id: 'kai', name: 'Kai Lowe', role: 'Sixth-former, skater, climate campaigner', group: 'families', at: 'triangle', personality: 'Earnest, impatient, very online', minor: true,
    look: look({ body: 'c', skin: 3, hair: 'afro', hairColour: 0, top: 'tee', topColour: 0x2b2d31, outer: null, legs: 'shorts', legsColour: 0x3a4f6b, shoes: 0xf4f2ee, height: 0.97 }),
    greet: { pillar: 'You’re actually kind of legendary now.', trusted: 'Oh, it’s you. Cool.', known: 'Hey.', cloud: 'Everyone’s posting about you. Not in a good way.', pariah: 'Yeah, no.' },
    nodes: {
      start: { say: 'Adults keep saying young people should get involved, then they don’t listen when we do.', mood: 'suspicious', choices: [
        { label: 'Go on then. I’m listening.', reply: 'More bins on the beach, a proper skate spot, and a bus after nine. That’s it. Not hard.', eff: { families: 4, coastal: 2 }, set: ['kai_listened'], next: 'ask' },
        { label: 'You’ll understand when you’re older.', reply: 'Wow. Okay.', mood: 'disappointed', eff: { families: -5 }, end: true },
      ] },
      ask: { say: 'There’s a litter pick by Martello Park. If you actually turn up, I’ll believe you.', mood: 'neutral', choices: [
        { label: 'Deal. I’ll be at the next one.', promise: { id: 'kai_litter', text: 'Join the organised litter pick (verified event check-in)', check: 'event:beach_clean', days: 14, keep: { families: 6, coastal: 4 }, broke: { families: -4 } }, accept: 'beach_clean', reply: 'Bring gloves.', end: true },
        { label: 'I’m more of an ideas person.', reply: 'Right.', eff: { families: -1 }, end: true },
      ] },
      again: { say: 'Bins are still overflowing, by the way.', mood: 'neutral', choices: [{ label: 'I know. I’m on it.', end: true }] },
      kept: { say: 'You actually came. Respect.', mood: 'happy', choices: [{ label: 'Told you.', end: true }] },
      broken: { say: 'Didn’t see you at the litter pick. Classic.', mood: 'disappointed', choices: [{ label: 'You’re right. Next time.', end: true }] },
    } },
  { id: 'elsie', name: 'Elsie Marsh', role: 'Organises the volunteer litter pick (fictional group)', group: 'volunteers', at: 'martello_park', personality: 'Cheerful, relentless, notices everything',
    look: look({ body: 'b', skin: 0, hair: 'bob', hairColour: 7, top: 'tee', topColour: 0x2e8a57, outer: 'raincoat', outerColour: 0xf2b632, legs: 'trousers', legsColour: 0x6b5b45, height: 0.94, glasses: true }),
    greet: { pillar: 'Our star volunteer! The bin bags are yours.', trusted: 'Hello, dear! Gloves are in the box.', known: 'Hello! Come to help?', cloud: 'We could do with the help. Whatever people are saying.', pariah: 'Everyone’s welcome to pick up litter. Even you.' },
    nodes: {
      start: { say: 'Saturday mornings we pick litter along the prom. Politicians come for the photo and leave before the bags are full.', mood: 'neutral', choices: [
        { label: 'No photos. Just tell me where to start.', reply: 'Ooh, I like you. Pier end first. Mind the gulls.', eff: { volunteers: 4 }, accept: 'beach_clean', end: true },
        { label: 'Could I get a photo with you, though?', reply: 'After you’ve filled a bag, dear.', mood: 'suspicious', eff: { volunteers: -1 }, end: true },
      ] },
      again: { say: 'We counted forty-three crisp packets last week. Forty-three!', mood: 'neutral', choices: [{ label: 'That’s outrageous.', eff: { volunteers: 1 }, end: true }] },
    } },
  { id: 'amara', name: 'Dr Amara Bello', role: 'Ecologist who volunteers at the nature reserve (fictional)', group: 'coastal', at: 'landguard_reserve', personality: 'Precise, passionate, hates litter and lazy facts',
    look: look({ body: 'b', skin: 6, hair: 'long', hairColour: 0, top: 'tee', topColour: 0x3d5a40, outer: 'raincoat', outerColour: 0x3d5a40, legs: 'trousers', legsColour: 0x6b5b45, glasses: true }),
    greet: { pillar: 'You’ve done more for this coast than most. Thank you.', trusted: 'Hello again. The terns are back.', known: 'Hello. Please keep to the paths.', cloud: 'I hear you’ve been cutting corners. Literally.', pariah: 'The reserve is open to everyone. I’ll leave it there.' },
    nodes: {
      start: { say: 'This shingle looks like nothing, but it’s one of the rarer habitats on this coast. People trample it without knowing.', mood: 'neutral', choices: [
        { label: 'What should visitors know?', reply: 'Stay on the paths, keep dogs on leads in nesting season, and look down. There’s more here than you’d think.', eff: { coastal: 4, visitors: 1 }, discover: 'landguard_reserve', end: true },
        { label: 'Could we build a café here?', reply: 'On the shingle? Absolutely not.', mood: 'disappointed', eff: { coastal: -5, business: 1 }, end: true },
      ] },
      again: { say: 'Have you done the heritage trail? The fort, the museum and the reserve tell one story.', mood: 'neutral', choices: [{ label: 'I’ll do it.', accept: 'landguard_trail', end: true }, { label: 'Another time.', end: true }] },
    } },
  { id: 'gus', name: 'Gus Ferreira', role: 'Runs an ice-cream kiosk on the prom (fictional)', group: 'visitors', at: 'pier', personality: 'Big laugh, bigger opinions',
    look: look({ body: 'a', skin: 3, hair: 'bald', facial: 'beard', hairColour: 1, top: 'tee', topColour: 0xf4f1ea, legs: 'shorts', legsColour: 0x3a4f6b, build: 1.15 }),
    greet: { pillar: 'Mayor-in-waiting! Two scoops, on me. Game scoops.', trusted: 'Ah, my friend!', known: 'Ice cream? It’s never too cold for ice cream.', cloud: 'Tourists don’t like a scandal, you know.', pariah: 'Bad for business, you are.' },
    nodes: {
      start: { say: 'Summer days, the prom is full. Autumn? You could fire a cannon down here. Visitors need reasons to come out of season.', mood: 'happy', choices: [
        { label: 'Events all year: lights, food, music on the prom.', reply: 'Yes! You get it. People come, they eat, they spend.', eff: { visitors: 4, business: 2 }, end: true },
        { label: 'Maybe the quiet is nice for residents.', reply: 'Quiet doesn’t pay the rent, my friend.', eff: { visitors: -2, longstanding: 2 }, end: true },
      ] },
      again: { say: 'Pistachio’s back on. You heard it here first.', mood: 'happy', choices: [{ label: 'Big news.', eff: { visitors: 1 }, end: true }] },
    } },
  { id: 'lucy', name: 'Lucy Chen', role: 'Runs a seafront B&B (fictional)', group: 'visitors', at: 'triangle', personality: 'Organised, polite, quietly ambitious',
    look: look({ body: 'b', skin: 1, hair: 'bob', hairColour: 0, top: 'tee', topColour: 0x7a5c99, outer: 'peacoat', outerColour: 0x8a8f96, legs: 'skirt', legsColour: 0x2b2b30 }),
    greet: { pillar: 'My guests keep asking if they can meet you.', trusted: 'Good morning! My guests loved your trail tips.', known: 'Good morning.', cloud: 'My guests read the news too, you know.', pariah: 'I’m afraid I’m very busy.' },
    nodes: {
      start: { say: 'Visitors arrive at the station and have no idea the seafront is ten minutes away. Signs would help. A map would help.', mood: 'neutral', choices: [
        { label: 'A walking trail from the station to the prom.', reply: 'That would genuinely help. I could put leaflets in every room.', eff: { visitors: 4 }, accept: 'seafront_explorer', end: true },
        { label: 'They can use their phones.', reply: 'Some of my guests are eighty-five.', mood: 'disappointed', eff: { visitors: -3, longstanding: -1 }, end: true },
      ] },
      again: { say: 'Fully booked next weekend. The town’s busier than people think.', mood: 'neutral', choices: [{ label: 'Good to hear.', end: true }] },
    } },
  { id: 'nadia', name: 'Nadia Price', role: 'Roving reporter, Felixstowe News Game Edition (fictional)', group: 'longstanding', at: 'town_hall', personality: 'Sharp, fair, remembers everything you say', reporter: true,
    look: look({ body: 'b', skin: 2, hair: 'long', hairColour: 5, top: 'tee', topColour: 0x0b0b0d, outer: 'raincoat', outerColour: 0xffdb00, legs: 'jeans', legsColour: 0x2b2b30, glasses: true }),
    greet: { pillar: 'Our readers voted you most likely to win. Comment?', trusted: 'Got a minute for Felixstowe News? Game edition, obviously.', known: 'Nadia Price, Felixstowe News. Game edition. Who are you?', cloud: 'I’ve some questions about recent events.', pariah: 'You want to give your side? Now’s the time.' },
    nodes: {
      start: { say: 'Every candidate says they’ll listen. What’s one thing you’ve actually done for this town?', mood: 'suspicious', choices: [
        { label: 'Not enough yet. Ask me again in a month.', reply: 'Honest. I’ll write that down. And I will ask.', rep: { trust: 2 }, eff: { longstanding: 2 }, set: ['nadia_honest'], end: true },
        { label: 'I’ve done loads. Too much to list.', reply: 'Mm. Readers like specifics.', mood: 'suspicious', eff: { longstanding: -1 }, end: true },
      ] },
      again: { say: 'Anything to say about your campaign this week?', mood: 'neutral', dynamic: 'reporter', choices: [
        { label: 'I’ve been listening to people. Bill wants benches; Jade wants safe play spaces.', need: { flags: ['jade_listened'] }, reply: 'You’ve actually spoken to people. That’s a story.', eff: { longstanding: 2, families: 2 }, end: true },
        { label: 'No comment.', reply: 'That’s a comment, you know.', end: true },
      ] },
    } },
  { id: 'tom', name: 'Tom Reeve', role: 'Volunteer coast-watcher (fictional group)', group: 'volunteers', at: 'landguard_fort', personality: 'Calm, safety-minded, few words',
    look: look({ body: 'a', skin: 2, hair: 'crop', hairColour: 1, facial: 'stubble', top: 'tee', topColour: 0x24395c, outer: 'raincoat', outerColour: 0x2f4a3f, legs: 'trousers', legsColour: 0x2b2b30 }),
    greet: { pillar: 'Good to see you.', trusted: 'All right?', known: 'Afternoon.', cloud: 'Hm.', pariah: '…' },
    nodes: {
      start: { say: 'Tide comes in faster than folk think out on the point. Most of my job is telling people to look at the tide times.', mood: 'neutral', choices: [
        { label: 'Worth a sign or two, then.', reply: 'Aye. And people reading them.', eff: { volunteers: 3, coastal: 2 }, end: true },
        { label: 'People should look after themselves.', reply: 'They should. They don’t.', eff: { volunteers: -2 }, end: true },
      ] },
      again: { say: 'Wind’s getting up.', mood: 'neutral', choices: [{ label: 'Stay safe, Tom.', end: true }] },
    } },
  { id: 'pam', name: 'Pam Hollis', role: 'Visiting for the week (fictional)', group: 'visitors', at: 'station', personality: 'Chatty, easily delighted',
    look: look({ body: 'b', skin: 0, hair: 'curly', hairColour: 7, top: 'breton', topColour: 0xb3262b, outer: 'raincoat', outerColour: 0xe0604f, legs: 'trousers', legsColour: 0x3a4f6b, height: 0.93, bag: true }),
    greet: { pillar: 'Ooh, are you the one from the paper? The nice one?', trusted: 'Hello again!', known: 'Excuse me, which way is the sea?', cloud: 'Are you the one from the paper? The… other story?', pariah: 'Oh dear. I think I’ll ask someone else.' },
    nodes: {
      start: { say: 'Excuse me, which way is the sea? We’ve walked round the shopping centre twice.', mood: 'embarrassed', choices: [
        { label: 'Down Hamilton Road and keep going. You can’t miss it.', reply: 'Oh, thank you, love! Felixstowe’s ever so friendly.', eff: { visitors: 3 }, rep: { community: 1 }, end: true },
        { label: 'Look it up on your phone.', reply: 'Oh. Right. Sorry to bother you.', mood: 'disappointed', eff: { visitors: -3 }, end: true },
      ] },
      again: { say: 'We found the sea! It was where you said.', mood: 'happy', choices: [{ label: 'Enjoy your stay!', end: true }] },
    } },
  // fictional rival candidates
  { id: 'dot', name: 'Dot Pennywhistle', role: 'Rival candidate, runs a tea hut (fictional)', group: 'longstanding', at: 'pier', rival: true, personality: 'Kind, competitive, makes excellent scones',
    look: look({ body: 'b', skin: 1, hair: 'bun', hairColour: 7, top: 'tee', topColour: 0xd8577d, outer: 'peacoat', outerColour: 0x7a5c99, legs: 'skirt', legsColour: 0x3b3a3d, height: 0.92 }),
    greet: { pillar: 'You’re winning, aren’t you? Have a scone anyway.', trusted: 'Hello, rival! Tea?', known: 'Oh, another candidate! Welcome.', cloud: 'Everyone deserves a second chance. Even you, dear.', pariah: 'Come and help at the hut sometime. It might do you good.' },
    nodes: {
      start: { say: 'I’m running too, you know. Mostly so somebody talks about the toilets on the prom.', mood: 'happy', choices: [
        { label: 'May the best candidate win. Good luck, Dot.', reply: 'And to you, dear. Play fair and I’ll make you a scone.', eff: { longstanding: 3 }, set: ['dot_fair'], end: true },
        { label: 'You haven’t got a chance.', reply: 'Oh! Well. We’ll see, won’t we.', mood: 'disappointed', eff: { longstanding: -4, volunteers: -2 }, end: true },
      ] },
      again: { say: 'Scone? They’re still warm.', mood: 'happy', choices: [{ label: 'Go on then.', end: true }] },
    } },
  { id: 'marjorie', name: 'Marjorie Quill', role: 'Rival candidate, Seafront First (fictional)', group: 'business', at: 'triangle', rival: true, personality: 'Polished, cutting, very well organised',
    look: look({ body: 'b', skin: 2, hair: 'bob', hairColour: 3, top: 'tee', topColour: 0xf4f1ea, outer: 'peacoat', outerColour: 0xb3262b, legs: 'skirt', legsColour: 0x24395c, glasses: true }),
    greet: { pillar: 'Fine. You’ve earned your place. I’ll see you on the steps.', trusted: 'You’re becoming a nuisance. Well done.', known: 'Another one. They come and go with the tide.', cloud: 'I read Felixstowe News too, you know.', pariah: 'I needn’t campaign at all, with you doing my job for me.' },
    nodes: {
      start: { say: 'I’ve lived here twenty years and run three campaigns. What makes you think a newcomer can win?', mood: 'suspicious', choices: [
        { label: 'Because I’m listening to people you’ve stopped hearing.', reply: 'Bold. Let’s see if anyone listens back.', eff: { business: 1, families: 2 }, end: true },
        { label: 'Because you’re past it.', reply: 'Charming. The town will remember that.', mood: 'disappointed', eff: { business: -3, longstanding: -3 }, rep: { community: -1 }, end: true },
      ] },
      again: { say: 'Still here? Persistent.', mood: 'confident', choices: [{ label: 'Always.', end: true }] },
    } },
  { id: 'rex', name: 'Rex Harbourne', role: 'Rival candidate, backed by a developer (fictional)', group: 'business', at: 'town_hall', rival: true, personality: 'Charming, slippery, always selling',
    look: look({ body: 'a', skin: 2, hair: 'quiff', hairColour: 1, top: 'tee', topColour: 0xffffff, outer: 'peacoat', outerColour: 0x2b2d31, legs: 'trousers', legsColour: 0x2b2d31, shoes: 0x5c4033 }),
    greet: { pillar: 'Let’s not be enemies. Lunch?', trusted: 'My favourite opponent!', known: 'Rex Harbourne. You’ll have heard of me.', cloud: 'Struggling? I could help. For a favour.', pariah: 'We should talk. People like us need to stick together.' },
    nodes: {
      start: { say: 'Flats on the Seafront Lawn. Jobs, homes, money. Back me, and there might be something in it for you.', mood: 'confident', choices: [
        { label: 'Not interested in “something in it for me”.', reply: 'Principles. How quaint.', rep: { trust: 2 }, eff: { coastal: 2, longstanding: 2 }, end: true },
        { label: 'What sort of something?', reply: 'Let’s just say my associate will find you. Outside the Town Hall.', mood: 'confident', eff: { business: 1 }, set: ['rex_curious'], end: true },
      ] },
      again: { say: 'Offer’s still open.', mood: 'confident', choices: [{ label: 'Still no.', end: true }] },
    } },
];

export const NEWS_REACTIONS = {
  good: ['Saw you in Felixstowe News this morning. Not bad.', 'You’re in the paper! The game edition, anyway.', 'My neighbour showed me that headline. Well done.'],
  bad: ['I read Felixstowe News, you know.', 'That headline… not your finest hour, was it?', 'People are talking about that story.'],
};
