// Gamification: XP, levels, streaks and badges.
// Everything is stored locally with chrome.storage.local and never leaves the browser.
// Localised string lookup, shared with popup.js. Falls back to the key so a missing
// message is visible instead of blank.
const t = (key, subs) => (globalThis.chrome?.i18n?.getMessage(key, subs)) || key;

const Game = (() => {
  const LEVELS = [0, 50, 150, 350, 700, 1200, 2000].map((xp, i) => ({ xp, title: t(`level_${i + 1}`) }));

  const badge = (id, emoji, test) => ({ id, emoji, name: t(`badge_${id}_name`), hint: t(`badge_${id}_hint`), test });
  const BADGES = [
    badge('first', '🎉', (s) => s.exports >= 1),
    badge('copycat', '📋', (s, e) => e.format === 'copy'),
    badge('triple', '🎯', (s) => ['md', 'txt', 'copy'].every((f) => s.formats.includes(f))),
    badge('marathon', '🏃', (s, e) => e.durationMins >= 60 || e.words >= 8000),
    badge('crowd', '👥', (s, e) => e.speakers >= 5),
    badge('regular', '⭐', (s) => s.exports >= 10),
    badge('archivist', '🗄️', (s) => s.exports >= 50),
    badge('streak3', '🔥', (s) => s.streak >= 3),
    badge('streak7', '📅', (s) => s.streak >= 7),
    badge('owl', '🦉', (s, e) => e.hour < 5),
    badge('bird', '🐦', (s, e) => e.hour >= 5 && e.hour < 8),
    badge('hoarder', '📚', (s) => s.words >= 100000),
  ];

  const BADGE_XP = 25;

  const fresh = () => ({
    xp: 0, exports: 0, words: 0, meetings: [], formats: [],
    streak: 0, bestStreak: 0, lastDay: null, badges: {},
  });

  const dayKey = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

  const isWeekend = (d) => d.getDay() === 0 || d.getDay() === 6;

  // Weekends never break a streak: walk back from today until the most recent
  // weekday, and accept any day in that range as the previous streak day.
  function continuesStreak(lastDay, now) {
    if (!lastDay) return false;
    const d = new Date(now);
    do {
      d.setDate(d.getDate() - 1);
      if (dayKey(d) === lastDay) return true;
    } while (isWeekend(d));
    return false;
  }

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
    const firstToday = s.lastDay !== today;
    if (firstToday) {
      s.streak = continuesStreak(s.lastDay, now) ? s.streak + 1 : 1;
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
