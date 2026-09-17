// Gamification: XP, levels, streaks and badges.
// Everything is stored locally with chrome.storage.local and never leaves the browser.
const Game = (() => {
  const LEVELS = [
    { xp: 0, title: 'Note Newbie' },
    { xp: 50, title: 'Minute Taker' },
    { xp: 150, title: 'Quote Collector' },
    { xp: 350, title: 'Transcript Tamer' },
    { xp: 700, title: 'Meeting Historian' },
    { xp: 1200, title: 'Keeper of Words' },
    { xp: 2000, title: 'Legendary Scribe' },
  ];

  const BADGES = [
    { id: 'first', emoji: '🎉', name: 'First Words', hint: 'Export your first transcript', test: (s) => s.exports >= 1 },
    { id: 'copycat', emoji: '📋', name: 'Copycat', hint: 'Copy a transcript to the clipboard', test: (s, e) => e.format === 'copy' },
    { id: 'triple', emoji: '🎯', name: 'Triple Threat', hint: 'Use Markdown, .txt and Copy', test: (s) => ['md', 'txt', 'copy'].every((f) => s.formats.includes(f)) },
    { id: 'marathon', emoji: '🏃', name: 'Marathon Meeting', hint: 'Export a meeting of an hour or 8,000 words', test: (s, e) => e.durationMins >= 60 || e.words >= 8000 },
    { id: 'crowd', emoji: '👥', name: 'Full House', hint: 'Export a meeting with 5+ speakers', test: (s, e) => e.speakers >= 5 },
    { id: 'regular', emoji: '⭐', name: 'Regular', hint: 'Export 10 transcripts', test: (s) => s.exports >= 10 },
    { id: 'archivist', emoji: '🗄️', name: 'Archivist', hint: 'Export 50 transcripts', test: (s) => s.exports >= 50 },
    { id: 'streak3', emoji: '🔥', name: 'Hat Trick', hint: 'Export on 3 days in a row', test: (s) => s.streak >= 3 },
    { id: 'streak7', emoji: '📅', name: 'Week Warrior', hint: 'Export on 7 days in a row', test: (s) => s.streak >= 7 },
    { id: 'owl', emoji: '🦉', name: 'Night Owl', hint: 'Export between midnight and 5am', test: (s, e) => e.hour < 5 },
    { id: 'bird', emoji: '🐦', name: 'Early Bird', hint: 'Export between 5am and 8am', test: (s, e) => e.hour >= 5 && e.hour < 8 },
    { id: 'hoarder', emoji: '📚', name: 'Word Hoarder', hint: 'Export 100,000 words in total', test: (s) => s.words >= 100000 },
  ];

  const BADGE_XP = 25;

  const fresh = () => ({
    xp: 0, exports: 0, words: 0, meetings: [], formats: [],
    streak: 0, bestStreak: 0, lastDay: null, badges: {},
  });

  const dayKey = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

  async function load() {
    const { game } = await chrome.storage.local.get('game');
    return { ...fresh(), ...(game || {}) };
  }

  const save = (state) => chrome.storage.local.set({ game: state });

  function levelFor(xp) {
    let index = 0;
    LEVELS.forEach((l, i) => { if (xp >= l.xp) index = i; });
    const floor = LEVELS[index].xp;
    const next = LEVELS[index + 1]?.xp ?? null;
    return {
      index,
      number: index + 1,
      title: LEVELS[index].title,
      floor,
      next,
      progress: next === null ? 1 : (xp - floor) / (next - floor),
    };
  }

  async function record({ format, words, speakers, durationMins, key }) {
    const s = await load();
    const now = new Date();
    const before = levelFor(s.xp);

    const today = dayKey(now);
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const firstToday = s.lastDay !== today;
    if (firstToday) {
      s.streak = s.lastDay === dayKey(yesterday) ? s.streak + 1 : 1;
      s.lastDay = today;
      s.bestStreak = Math.max(s.bestStreak, s.streak);
    }

    const newMeeting = key && !s.meetings.includes(key);
    if (newMeeting) s.meetings = [...s.meetings, key].slice(-500);
    if (!s.formats.includes(format)) s.formats.push(format);
    s.exports += 1;
    s.words += words;

    let gained = 10 + Math.min(20, Math.floor(words / 100));
    if (newMeeting) gained += 5;
    if (firstToday && s.streak >= 2) gained += 5;

    const event = { format, words, speakers, durationMins: Number(durationMins) || 0, hour: now.getHours() };
    const unlocked = BADGES.filter((b) => !s.badges[b.id] && b.test(s, event));
    unlocked.forEach((b) => { s.badges[b.id] = now.getTime(); });
    gained += unlocked.length * BADGE_XP;

    s.xp += gained;
    await save(s);

    const after = levelFor(s.xp);
    return { state: s, gained, unlocked, leveledUp: after.index > before.index, level: after };
  }

  async function reset() {
    await save(fresh());
    return fresh();
  }

  return { BADGES, load, record, reset, levelFor };
})();
