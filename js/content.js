/* Companion Club — versioned content: companions, activities, themes,
 * decor catalog, journey, challenges, practice presets, tutorial lessons,
 * daily ruleset generator, achievements.
 * Shared browser (window.CCContent) / Node. Content is data-only; all
 * randomness enters through the config seed.
 */
(function (root, factory) {
  var RNG = (typeof module === 'object' && module.exports) ? require('./rng.js') : root.CCRNG;
  var api = factory(RNG);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CCContent = api;
})(typeof self !== 'undefined' ? self : this, function (RNG) {
  'use strict';

  var CONTENT_VERSION = 1;

  // ---------- companions (original characters; shape + icon reinforce color) ----------
  var COMPANION_ORDER = ['pip', 'momo', 'bramble', 'lumi'];
  var COMPANIONS = {
    pip:     { label: 'Pip',     icon: '\u{1F98A}', color: 0xe07b39, colorHC: 0xe6611a, shape: 'fox',
               blurb: 'A quick little fox who is always first to the snack counter.' },
    momo:    { label: 'Momo',    icon: '\u{1F431}', color: 0xf0d9a8, colorHC: 0xf5d90a, shape: 'cat',
               blurb: 'A round cream cat who naps anywhere the sun lands.' },
    bramble: { label: 'Bramble', icon: '\u{1F994}', color: 0x9a7248, colorHC: 0x8d6e63, shape: 'hog',
               blurb: 'A gentle hedgehog who tends the garden planter.' },
    lumi:    { label: 'Lumi',    icon: '\u{1F426}', color: 0x6fa8dc, colorHC: 0x2e6fe4, shape: 'bird',
               blurb: 'A bright blue bird who hums along with every tune.' }
  };

  // ---------- activities / stations ----------
  var ACTIVITY_ORDER = ['snack', 'paint', 'music', 'nap', 'garden', 'read'];
  var ACTIVITIES = {
    snack:  { label: 'Snack',  icon: '\u{1F34E}', color: 0xd9534f, colorHC: 0xe4572e, station: 'Snack Counter' },
    paint:  { label: 'Paint',  icon: '\u{1F3A8}', color: 0x8e6fc0, colorHC: 0x8e24aa, station: 'Easel' },
    music:  { label: 'Music',  icon: '\u{1F941}', color: 0xe8a84b, colorHC: 0xb7791f, station: 'Drum Kit' },
    nap:    { label: 'Nap',    icon: '\u{1F4A4}', color: 0x6f8fb8, colorHC: 0x3949ab, station: 'Beanbag' },
    garden: { label: 'Garden', icon: '\u{1F331}', color: 0x5d9c59, colorHC: 0x17a398, station: 'Planter' },
    read:   { label: 'Read',   icon: '\u{1F4D6}', color: 0xb8734f, colorHC: 0x6d4c41, station: 'Bookcase' }
  };

  // ---------- themes (cosmetic only: materials, light, ambience) ----------
  var THEMES = [
    { id: 'hearth', name: 'Hearth Club', unlockLevel: 1,
      palette: { wall: 0x3a2a24, floor: 0x4a352a, floorAlt: 0x53402f, wood: 0x8a5a34, woodDark: 0x5d3a20,
                 light: 0xffc98a, accent: 0xffb066, metal: 0xa08050, fog: 0x2a1d18 } },
    { id: 'lagoon', name: 'Lagoon Loft', unlockLevel: 2,
      palette: { wall: 0x22333a, floor: 0x2e4550, floorAlt: 0x36525e, wood: 0x5a7a6a, woodDark: 0x3c5548,
                 light: 0xb0f0e0, accent: 0x7fe0c8, metal: 0x709088, fog: 0x18242a } },
    { id: 'duskberry', name: 'Duskberry Den', unlockLevel: 4,
      palette: { wall: 0x2e2438, floor: 0x3a2e48, floorAlt: 0x443654, wood: 0x6a5a78, woodDark: 0x463a52,
                 light: 0xd0b0ff, accent: 0xb090ff, metal: 0x8878a0, fog: 0x1e1826 } },
    { id: 'meadow', name: 'Meadow House', unlockLevel: 6,
      palette: { wall: 0x2a3324, floor: 0x3a4a30, floorAlt: 0x445538, wood: 0x7a6a3a, woodDark: 0x4f4526,
                 light: 0xe0ffb0, accent: 0xaee080, metal: 0x90a060, fog: 0x1c2418 } },
    { id: 'starlit', name: 'Starlit Attic', unlockLevel: 8,
      palette: { wall: 0x1e2434, floor: 0x28304a, floorAlt: 0x303a58, wood: 0x50608a, woodDark: 0x36405e,
                 light: 0xa0c8ff, accent: 0x80b0ff, metal: 0x7080a8, fog: 0x141a28 } }
  ];

  // ---------- decor catalog (cosmetic clubhouse upgrades) ----------
  var DECOR = [
    { id: 'rug',       name: 'Sunbeam Rug',     icon: '\u{1F7E0}', cost: 150 },
    { id: 'fern',      name: 'Potted Fern',     icon: '\u{1FAB4}', cost: 120 },
    { id: 'lamp',      name: 'Glow Lamp',       icon: '\u{1F4A1}', cost: 200 },
    { id: 'banner',    name: 'Club Banner',     icon: '\u{1F3F3}', cost: 250 },
    { id: 'cushion',   name: 'Cloud Cushion',   icon: '\u{1F6CB}', cost: 300 },
    { id: 'teaset',    name: 'Tea Set',         icon: '\u{1FAD6}', cost: 350 },
    { id: 'shelf',     name: 'Story Shelf',     icon: '\u{1F4DA}', cost: 400 },
    { id: 'kite',      name: 'Wall Kite',       icon: '\u{1FA81}', cost: 280 },
    { id: 'jukebox',   name: 'Jukebox',         icon: '\u{1F3B6}', cost: 550 },
    { id: 'aquarium',  name: 'Bubble Aquarium', icon: '\u{1F41F}', cost: 800 },
    { id: 'fountain',  name: 'Pebble Fountain', icon: '\u{26F2}',  cost: 1000 },
    { id: 'telescope', name: 'Star Telescope',  icon: '\u{1F52D}', cost: 1200 }
  ];
  function clubLevel(ownedCount) { return 1 + Math.floor(ownedCount / 2); }

  // ---------- journey ----------
  // Compact authored rows:
  // [id, name, seed, cols, rows, activities[], blocked, nCompanions,
  //  patienceLo, patienceHi, cooldown, dayLength(turns), goal, missLimit, themeIdx, intro]
  var J = [
    ['j01','Welcome Mat',     101,4,4,['snack','paint'],                      0,2,10,13,2,30, 3,5,0,'Guide a companion with arrow keys or taps. Stand on a station and serve the matching wish.'],
    ['j02','Second Breakfast',102,4,4,['snack','paint'],                      0,2,10,13,2,32, 4,5,0,''],
    ['j03','First Jam',       103,4,5,['snack','paint','music'],              0,2,10,13,2,36, 4,5,0,'A new station: the Drum Kit. Music wishes need it.'],
    ['j04','Sofa in the Way', 104,4,5,['snack','paint','music'],              1,2,10,13,2,36, 5,5,0,'Furniture blocks the floor. Route around it.'],
    ['j05','Club Routine',    105,5,5,['snack','paint','music'],              1,2,10,13,2,40, 5,5,0,''],
    ['j06','Busy Floor',      106,5,5,['snack','paint','music'],              2,2, 9,12,2,40, 6,5,0,''],
    ['j07','Bramble Arrives', 107,5,5,['snack','paint','music'],              1,3,10,13,2,44, 6,5,0,'A third companion joins. Wishes decay for everyone, every turn.'],
    ['j08','Quiet Corner',    108,5,5,['snack','paint','music','nap'],        2,3,10,13,2,46, 6,5,0,'A new station: the Beanbag. Some companions just want a nap.'],
    ['j09','Serving Streaks', 109,5,5,['snack','paint','music','nap'],        2,3, 9,12,2,46, 7,4,0,'Serve wishes back-to-back: streaks earn bonus sparkle.'],
    ['j10','Club Trial',      110,5,6,['snack','paint','music','nap'],        2,3, 9,12,2,48, 7,4,1,'MASTERY: everything so far, tighter harmony.'],
    ['j11','Long Cooldown',   111,5,6,['snack','paint','music','nap'],        3,3, 9,12,3,50, 7,4,1,'Companions daydream longer after being served.'],
    ['j12','Green Fingers',   112,5,6,['snack','paint','music','nap','garden'],2,3, 9,12,2,50, 8,4,1,'A new station: the Planter.'],
    ['j13','Full Calendar',   113,5,6,['snack','paint','music','nap','garden'],3,3, 9,12,2,52, 8,4,1,''],
    ['j14','Bigger Room',     114,6,6,['snack','paint','music','nap','garden'],3,3, 9,12,2,54, 8,4,1,''],
    ['j15','Short Fuses',     115,6,6,['snack','paint','music','nap','garden'],4,3, 8,11,2,54, 9,4,1,'Wishes expire faster now. Prioritize the lowest patience.'],
    ['j16','Book Nook',       116,6,6,['snack','paint','music','nap','garden','read'],3,3,9,12,2,56,9,4,2,'A new station: the Bookcase. The full club set.'],
    ['j17','Heavy Schedule',  117,6,6,['snack','paint','music','nap','garden','read'],4,3,9,12,2,56,10,4,2,''],
    ['j18','Lumi Arrives',    118,6,6,['snack','paint','music','nap','garden','read'],4,4,9,12,2,60,10,4,2,'A fourth companion. Serve beside a friend for a together bonus.'],
    ['j19','Crowded Wishes',  119,6,6,['snack','paint','music','nap','garden','read'],5,4,9,12,2,60,11,4,2,''],
    ['j20','Harmony Test',    120,6,6,['snack','paint','music','nap','garden','read'],5,4,8,11,2,62,11,3,2,'MASTERY: only three misses allowed.'],
    ['j21','Daydreamers',     121,6,6,['snack','paint','music','nap','garden','read'],6,4,9,12,3,62,11,4,2,''],
    ['j22','Twin Counters',   122,6,6,['snack','snack','paint','music','nap','garden'],5,4,9,12,2,62,12,4,3,'Two Snack Counters. Duplicates ease the rush.'],
    ['j23','Grand Floor',     123,6,7,['snack','paint','music','nap','garden','read'],6,4,9,12,2,64,12,4,3,''],
    ['j24','Impatience',      124,6,7,['snack','paint','music','nap','garden','read'],6,4,8,11,2,64,13,3,3,''],
    ['j25','Twin Easels',     125,6,7,['snack','paint','paint','music','nap','garden','read'],6,4,9,12,2,66,13,4,3,''],
    ['j26','Narrow Halls',    126,6,7,['snack','paint','music','nap','garden','read'],7,4,8,11,2,66,13,3,3,''],
    ['j27','Great Hall',      127,7,7,['snack','paint','music','nap','garden','read'],7,4,9,12,2,68,14,4,3,''],
    ['j28','Slow Mornings',   128,7,7,['snack','paint','music','nap','garden','read'],8,4,8,11,3,68,14,3,3,''],
    ['j29','Twin Beanbags',   129,7,7,['snack','paint','music','nap','nap','garden','read'],7,4,8,11,2,70,15,3,4,''],
    ['j30','The Big Day',     130,7,7,['snack','paint','music','nap','garden','read'],8,4,8,11,2,70,15,3,4,'MASTERY: fifteen wishes, three misses.'],
    ['j31','Cluttered Club',  131,7,7,['snack','paint','music','nap','garden','read'],9,4,8,11,2,70,15,3,4,''],
    ['j32','Double Drums',    132,7,7,['snack','paint','music','music','nap','garden','read','read'],8,4,8,11,2,72,16,3,4,''],
    ['j33','Hair Triggers',   133,7,7,['snack','paint','music','nap','garden','read'],8,4,7,10,2,72,16,3,4,'Very short patience. Plan two wishes ahead.'],
    ['j34','Small but Mighty',134,6,6,['snack','paint','music','nap','garden','read'],9,4,8,11,2,70,16,3,4,'A cramped room with sixteen wishes to fulfill.'],
    ['j35','Long Cooldown II',135,7,7,['snack','snack','paint','music','nap','garden','read'],9,4,8,11,3,72,16,3,4,''],
    ['j36','Obstacle Course', 136,7,7,['snack','paint','music','nap','garden','read'],10,4,8,11,2,74,17,3,4,''],
    ['j37','Twin Gardens',    137,7,7,['snack','paint','music','nap','garden','garden','read'],10,4,7,10,2,74,17,3,4,''],
    ['j38','Frayed Nerves',   138,7,7,['snack','paint','music','nap','garden','read'],10,4,7,10,3,76,18,2,4,'Only two misses. Every route matters.'],
    ['j39','Rush Weekend',    139,7,7,['snack','snack','paint','paint','music','nap','garden','read'],11,4,7,10,2,76,18,2,4,''],
    ['j40','Star Clubhouse',  140,7,7,['snack','paint','music','nap','garden','read'],12,4,7,10,2,78,20,2,0,'MASTERY: the definitive club day. Good luck.']
  ];

  function expandLevel(row, idx) {
    var nComp = row[7];
    var parTurns = Math.ceil(row[12] * 4.2);
    return {
      id: row[0], version: CONTENT_VERSION, kind: 'journey', index: idx,
      name: row[1], seed: row[2],
      board: { cols: row[3], rows: row[4] },
      fixedLayout: null,
      activities: row[5].slice(),
      blocked: row[6],
      companions: COMPANION_ORDER.slice(0, nComp),
      fixedCompanions: null,
      patience: [row[8], row[9]],
      cooldown: row[10],
      dayLength: row[11],
      goal: row[12],
      missLimit: row[13],
      goalStep: 0, dayBonusTurns: 0,
      par: { turns: parTurns, timeSec: parTurns * 4 },
      mechanics: { undo: true, hint: true },
      endless: false,
      theme: THEMES[row[14]].id,
      intro: row[15] || '',
      mastery: /MASTERY/.test(row[15] || '')
    };
  }

  var JOURNEY = J.map(expandLevel);

  // ---------- challenges ----------
  function challenge(o) {
    o.version = CONTENT_VERSION;
    o.kind = 'challenge';
    o.fixedLayout = null;
    o.fixedCompanions = null;
    o.goalStep = 0; o.dayBonusTurns = 0;
    o.endless = false;
    o.par = { turns: Math.ceil(o.goal * 4), timeSec: Math.ceil(o.goal * 16) };
    return o;
  }
  var CHALLENGES = [
    challenge({ id: 'c1', name: 'Tidy Sprint', seed: 501,
      board: { cols: 5, rows: 5 }, activities: ['snack', 'paint', 'music'], blocked: 1,
      companions: COMPANION_ORDER.slice(0, 2), patience: [8, 10], cooldown: 2,
      dayLength: 40, goal: 6, missLimit: 3,
      mechanics: { undo: false, hint: true }, theme: 'hearth',
      intro: 'Six wishes in forty turns. No undo.' }),
    challenge({ id: 'c2', name: 'Minimal Steps', seed: 502,
      board: { cols: 5, rows: 5 }, activities: ['snack', 'paint', 'music', 'nap'], blocked: 1,
      companions: COMPANION_ORDER.slice(0, 3), patience: [9, 12], cooldown: 2,
      dayLength: 32, goal: 5, missLimit: 4,
      mechanics: { undo: false, hint: true }, theme: 'lagoon',
      intro: 'A very short day. Every step must pay.' }),
    challenge({ id: 'c3', name: 'Crowded Club', seed: 503,
      board: { cols: 5, rows: 5 }, activities: ['snack', 'paint', 'music', 'nap'], blocked: 8,
      companions: COMPANION_ORDER.slice(0, 4), patience: [9, 12], cooldown: 2,
      dayLength: 60, goal: 8, missLimit: 4,
      mechanics: { undo: true, hint: true }, theme: 'duskberry',
      intro: 'Furniture everywhere. Routing is the puzzle.' }),
    challenge({ id: 'c4', name: 'Full House', seed: 504,
      board: { cols: 6, rows: 6 }, activities: ['snack', 'paint', 'music', 'nap', 'garden', 'read'], blocked: 4,
      companions: COMPANION_ORDER.slice(0, 4), patience: [9, 12], cooldown: 2,
      dayLength: 66, goal: 12, missLimit: 3,
      mechanics: { undo: true, hint: true }, theme: 'meadow',
      intro: 'All six stations, all four companions.' }),
    challenge({ id: 'c5', name: 'Short Tempers', seed: 505,
      board: { cols: 6, rows: 6 }, activities: ['snack', 'paint', 'music', 'nap', 'garden', 'read'], blocked: 5,
      companions: COMPANION_ORDER.slice(0, 4), patience: [6, 8], cooldown: 2,
      dayLength: 70, goal: 10, missLimit: 3,
      mechanics: { undo: false, hint: false }, theme: 'starlit',
      intro: 'Wishes barely wait. No assists.' }),
    challenge({ id: 'c6', name: 'Grand Constraint', seed: 506,
      board: { cols: 7, rows: 7 }, activities: ['snack', 'paint', 'music', 'nap', 'garden', 'read'], blocked: 10,
      companions: COMPANION_ORDER.slice(0, 4), patience: [7, 9], cooldown: 3,
      dayLength: 72, goal: 14, missLimit: 2,
      mechanics: { undo: false, hint: false }, theme: 'duskberry',
      intro: 'Short patience, long cooldowns, two misses. The full test.' })
  ];

  // ---------- practice presets (unranked) ----------
  function practice(o) {
    o.version = CONTENT_VERSION;
    o.kind = 'practice';
    o.fixedLayout = null;
    o.fixedCompanions = null;
    o.goalStep = 0; o.dayBonusTurns = 0;
    o.endless = false;
    o.mechanics = { undo: true, hint: true };
    o.par = { turns: Math.ceil(o.goal * 4.2), timeSec: Math.ceil(o.goal * 17) };
    return o;
  }
  var PRACTICE = [
    practice({ id: 'casual', name: 'Casual', seed: 0,
      board: { cols: 4, rows: 4 }, activities: ['snack', 'paint'], blocked: 0,
      companions: COMPANION_ORDER.slice(0, 2), patience: [11, 14], cooldown: 2,
      dayLength: 32, goal: 3, missLimit: 6, theme: 'hearth' }),
    practice({ id: 'clubnight', name: 'Club Night', seed: 0,
      board: { cols: 5, rows: 5 }, activities: ['snack', 'paint', 'music', 'nap'], blocked: 2,
      companions: COMPANION_ORDER.slice(0, 3), patience: [9, 12], cooldown: 2,
      dayLength: 48, goal: 6, missLimit: 5, theme: 'lagoon' }),
    practice({ id: 'expert', name: 'Expert', seed: 0,
      board: { cols: 6, rows: 6 }, activities: ['snack', 'paint', 'music', 'nap', 'garden', 'read'], blocked: 4,
      companions: COMPANION_ORDER.slice(0, 4), patience: [8, 11], cooldown: 2,
      dayLength: 64, goal: 10, missLimit: 4, theme: 'duskberry' })
  ];

  // ---------- score chase ruleset (endless open club) ----------
  var SCORE_CHASE = {
    id: 'score-std', version: CONTENT_VERSION, kind: 'score', name: 'Open Club',
    board: { cols: 6, rows: 6 },
    fixedLayout: null,
    activities: ['snack', 'paint', 'music', 'nap', 'garden', 'read'],
    blocked: 4,
    companions: COMPANION_ORDER.slice(0, 4),
    fixedCompanions: null,
    patience: [8, 11], cooldown: 2,
    dayLength: 40, goal: 5, missLimit: 5,
    goalStep: 2, dayBonusTurns: 20,
    par: null, mechanics: { undo: false, hint: false }, endless: true, theme: 'hearth',
    intro: 'Wishes never stop. Each wave raises the goal and extends the day. Play until harmony breaks.'
  };

  // ---------- daily ----------
  // One immutable ruleset per UTC day, derived purely from the date string.
  function dailyConfig(dateStr) {
    var seed = RNG.hashString('companionclub-daily-v' + CONTENT_VERSION + '-' + dateStr);
    var day = Math.floor(Date.parse(dateStr + 'T00:00:00Z') / 86400000);
    var rot = ((day % 7) + 7) % 7;
    var size = [[5, 5], [5, 6], [6, 6], [6, 6], [6, 7], [7, 7], [5, 5]][rot];
    var nActs = 3 + (rot % 3); // 3..5
    var acts = ACTIVITY_ORDER.slice(0, nActs);
    if (rot % 2 === 1) acts.push(acts[rot % nActs]); // one duplicate station on odd days
    var nComp = 2 + (rot % 3); // 2..4
    var pLo = 8 + (rot % 3);
    var goal = 5 + (rot % 5);
    return {
      id: 'daily-' + dateStr, version: CONTENT_VERSION, kind: 'daily',
      name: 'Daily ' + dateStr, seed: seed, date: dateStr,
      board: { cols: size[0], rows: size[1] },
      fixedLayout: null,
      activities: acts,
      blocked: 2 + (rot % 4),
      companions: COMPANION_ORDER.slice(0, nComp),
      fixedCompanions: null,
      patience: [pLo, pLo + 4],
      cooldown: 2,
      dayLength: Math.ceil(goal * 8),
      goal: goal,
      missLimit: 4,
      goalStep: 0, dayBonusTurns: 0,
      par: { turns: Math.ceil(goal * 4.2), timeSec: Math.ceil(goal * 17) },
      mechanics: { undo: true, hint: true }, endless: false,
      theme: THEMES[rot % THEMES.length].id,
      intro: 'One shared seed for everyone, today only.'
    };
  }

  function utcDateString(nowMs) {
    var d = new Date(nowMs == null ? Date.now() : nowMs);
    return d.getUTCFullYear() + '-' +
      String(d.getUTCMonth() + 1).padStart(2, '0') + '-' +
      String(d.getUTCDate()).padStart(2, '0');
  }

  // ---------- tutorial (Learn) ----------
  // Scripted fixed layouts: '.' floor, '#' furniture, S/P/M/N/G/R stations.
  function lessonCfg(id, seed, layout, companions, extra) {
    return Object.assign({
      id: id, version: CONTENT_VERSION, kind: 'tutorial', seed: seed,
      board: { cols: layout[0].length, rows: layout.length },
      fixedLayout: layout,
      activities: ACTIVITY_ORDER.slice(0, 1),
      blocked: 0,
      companions: companions.map(function (c) { return c.id; }),
      fixedCompanions: companions,
      patience: [8, 12], cooldown: 2,
      dayLength: 40, goal: 99, missLimit: 0,
      goalStep: 0, dayBonusTurns: 0,
      par: null, mechanics: { undo: false, hint: false }, endless: false, theme: 'hearth'
    }, extra || {});
  }

  function tutorialLessons() {
    return [
      { id: 't1', title: 'Stretch your paws',
        text: 'Companions move one step per turn. Tap Pip (or press Enter), then tap a glowing floor cell — or use the arrow keys. Take two steps to finish.',
        goal: { event: 'move', count: 2 },
        cfg: lessonCfg('t1', 9001, [
          '....',
          '.S..',
          '....'
        ], [{ id: 'pip', x: 3, y: 2, wish: { activity: 'snack', patience: 30 } }]) },
      { id: 't2', title: 'Serve a wish',
        text: 'Pip is standing on the Snack Counter and wishes for a snack. Select Pip and press the Serve button (or tap Pip again) to serve the wish.',
        goal: { event: 'serve', count: 1 },
        cfg: lessonCfg('t2', 9002, [
          '...',
          '.S.',
          '...'
        ], [{ id: 'pip', x: 1, y: 1, wish: { activity: 'snack', patience: 30 } }]) },
      { id: 't3', title: 'Tidy up',
        text: 'Serving leaves a station messy, and messy stations cannot be used. Pip is on the messy Snack Counter — tidy it (Tidy button or T) to finish.',
        goal: { event: 'tidy', count: 1 },
        cfg: lessonCfg('t3', 9003, [
          '...',
          '.S.',
          '...'
        ], [{ id: 'pip', x: 1, y: 1, wish: { activity: 'snack', patience: 30 } }],
          { fixedMessy: [[1, 1]] }) },
      { id: 't4', title: 'Mind the patience',
        text: 'Every wish has patience that ticks down each turn — an expired wish is a miss. Pip wants a snack, six turns remain, and the counter is four steps away. Go!',
        goal: { event: 'serve', count: 1 },
        cfg: lessonCfg('t4', 9004, [
          '.....',
          'S....',
          '.....'
        ], [{ id: 'pip', x: 4, y: 1, wish: { activity: 'snack', patience: 6 } }]) },
      { id: 't5', title: 'Together, then undo',
        text: 'Serving beside a friend earns a together bonus. Serve Pip’s snack wish with Momo beside him, then undo it (U) to see how second chances work.',
        goal: { event: 'undo', count: 1 },
        cfg: lessonCfg('t5', 9005, [
          '...',
          'SP.',
          '...'
        ], [{ id: 'pip', x: 1, y: 1, wish: { activity: 'snack', patience: 30 } },
            { id: 'momo', x: 2, y: 1, wish: { activity: 'snack', patience: 30 } }],
          { mechanics: { undo: true, hint: true } }) }
    ];
  }

  // ---------- achievements (stable lowercase keys, idempotent) ----------
  var ACHIEVEMENTS = [
    { key: 'first-serve',  name: 'First Wish',       desc: 'Serve your first wish.' },
    { key: 'first-win',    name: 'Club Hero',        desc: 'Complete a club day goal.' },
    { key: 'streak-5',     name: 'On a Roll',        desc: 'Reach a 5-serve streak.' },
    { key: 'serves-100',   name: 'Wish Veteran',     desc: 'Serve 100 wishes in total.' },
    { key: 'journey-half', name: 'Half the Journey', desc: 'Finish 20 journey stages.' },
    { key: 'journey-done', name: 'Star Member',      desc: 'Finish all 40 journey stages.' },
    { key: 'daily-7',      name: 'Regular',          desc: 'Finish 7 daily challenges.' },
    { key: 'decor-6',      name: 'Interior Designer',desc: 'Own 6 decor items.' },
    { key: 'club-5',       name: 'Club Level 5',     desc: 'Raise the clubhouse to level 5.' },
    { key: 'sparkle-5000', name: 'Sparkling',        desc: 'Bank 5000 sparkle over all play.' }
  ];

  return {
    CONTENT_VERSION: CONTENT_VERSION,
    COMPANIONS: COMPANIONS,
    COMPANION_ORDER: COMPANION_ORDER,
    ACTIVITIES: ACTIVITIES,
    ACTIVITY_ORDER: ACTIVITY_ORDER,
    THEMES: THEMES,
    DECOR: DECOR,
    clubLevel: clubLevel,
    JOURNEY: JOURNEY,
    CHALLENGES: CHALLENGES,
    PRACTICE: PRACTICE,
    SCORE_CHASE: SCORE_CHASE,
    ACHIEVEMENTS: ACHIEVEMENTS,
    dailyConfig: dailyConfig,
    utcDateString: utcDateString,
    tutorialLessons: tutorialLessons
  };
});
