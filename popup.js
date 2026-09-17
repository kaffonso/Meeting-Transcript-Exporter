// Add new adapter files here.
const ADAPTER_FILES = [
  'src/adapters/fireflies.js',
];

const $ = (id) => document.getElementById(id);
const app = $('app');
const statusEl = $('status');
const siteEl = $('site');

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const BUSY = ['Reading every word…', 'Scrolling through the chit-chat…', 'Collecting who said what…'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function setMood(mood, msg) {
  app.dataset.mood = 'none';
  void app.offsetWidth; // restart animations
  app.dataset.mood = mood;
  if (msg) statusEl.textContent = msg;
}

/* ---------- Page access ---------- */

async function getTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function inject(tabId) {
  await chrome.scripting.executeScript({ target: { tabId }, files: ['src/core.js', ...ADAPTER_FILES] });
}

async function callInPage(tabId, method) {
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    func: (m) => window.TranscriptExporter[m](),
    args: [method],
  });
  return result;
}

/* ---------- Formatting ---------- */

function mergeParagraphs(paragraphs) {
  const out = [];
  for (const p of paragraphs) {
    const prev = out[out.length - 1];
    if (prev && prev.speaker === p.speaker) prev.text += ' ' + p.text;
    else out.push({ ...p });
  }
  return out;
}

function toMarkdown({ title, meta, source, paragraphs }) {
  const lines = [`# ${title}`, ''];
  if (meta.date) lines.push(`**Date:** ${new Date(meta.date).toLocaleString()}  `);
  if (meta.durationMins) lines.push(`**Duration:** ~${Math.round(Number(meta.durationMins))} min  `);
  const speakers = [...new Set(paragraphs.map((p) => p.speaker))];
  lines.push(`**Speakers:** ${speakers.join(', ')}  `, `**Source:** ${source}`, '', '---', '');
  for (const p of paragraphs) {
    lines.push(`**${p.speaker}**${p.time ? ` (${p.time})` : ''}: ${p.text}`, '');
  }
  return lines.join('\n');
}

function toText({ title, paragraphs }) {
  return [title, '', ...paragraphs.map((p) => `${p.time ? `[${p.time}] ` : ''}${p.speaker}: ${p.text}`)].join('\n');
}

function slugify(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'transcript';
}

function download(content, filename, mime) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---------- Progress UI ---------- */

function renderProgress(state, newBadgeIds = []) {
  const level = Game.levelFor(state.xp);
  $('level-title').textContent = level.title;
  $('level-num').textContent = `Level ${level.number}`;
  $('xp-text').textContent = level.next === null ? `${state.xp} XP · max level` : `${state.xp} / ${level.next} XP`;

  const pct = Math.round(level.progress * 100);
  $('bar-fill').style.width = `${pct}%`;
  $('bar-fill').classList.toggle('full', pct >= 100);
  $('bar').setAttribute('aria-valuenow', String(pct));

  const streak = $('streak');
  streak.hidden = state.streak < 2;
  streak.textContent = `🔥 ${state.streak} day streak`;

  const list = $('badges');
  list.replaceChildren(...Game.BADGES.map((b) => {
    const li = document.createElement('li');
    const earned = Boolean(state.badges[b.id]);
    li.className = `badge${earned ? '' : ' locked'}${newBadgeIds.includes(b.id) ? ' new' : ''}`;
    li.textContent = earned ? b.emoji : '?';
    li.title = earned ? `${b.name}: ${b.hint}` : `Locked: ${b.hint}`;
    li.setAttribute('aria-label', li.title);
    return li;
  }));
  $('badge-count').textContent = `${Object.keys(state.badges).length} / ${Game.BADGES.length}`;

  $('totals').textContent =
    `${state.exports} exports, ${state.words.toLocaleString()} words saved, best streak ${state.bestStreak} ${state.bestStreak === 1 ? 'day' : 'days'}.`;
}

function floatXp(amount) {
  const el = $('xp-float');
  el.textContent = `+${amount} XP`;
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
}

async function showToasts(messages) {
  const toast = $('toast');
  for (const msg of messages) {
    toast.hidden = true;
    void toast.offsetWidth;
    toast.textContent = msg;
    toast.hidden = false;
    await sleep(2400);
  }
  toast.hidden = true;
}

/* ---------- Export ---------- */

async function run(format) {
  const buttons = document.querySelectorAll('.btn');
  buttons.forEach((b) => (b.disabled = true));
  setMood('busy', pick(BUSY));
  try {
    const tab = await getTab();
    await inject(tab.id);
    const result = await callInPage(tab.id, 'run');
    if (!result || result.error) throw new Error(result?.error || 'Extraction failed.');

    const words = result.paragraphs.reduce((n, p) => n + p.text.split(/\s+/).filter(Boolean).length, 0);
    const people = new Set(result.paragraphs.map((p) => p.speaker)).size;

    if ($('merge').checked) result.paragraphs = mergeParagraphs(result.paragraphs);

    const name = slugify(result.title);
    if (format === 'md') download(toMarkdown(result), `${name}.md`, 'text/markdown');
    if (format === 'txt') download(toText(result), `${name}.txt`, 'text/plain');
    if (format === 'copy') await navigator.clipboard.writeText(toMarkdown(result));

    const url = new URL(tab.url);
    const outcome = await Game.record({
      format,
      words,
      speakers: people,
      durationMins: result.meta?.durationMins,
      key: url.origin + url.pathname,
    });

    const done = format === 'copy' ? 'Copied' : 'Saved';
    setMood('happy', `${done}! ${words.toLocaleString()} words from ${people} ${people === 1 ? 'person' : 'people'}.`);
    renderProgress(outcome.state, outcome.unlocked.map((b) => b.id));
    floatXp(outcome.gained);

    const toasts = [];
    if (outcome.leveledUp) toasts.push(`⬆️ Level up! You're now a ${outcome.level.title}.`);
    outcome.unlocked.forEach((b) => toasts.push(`${b.emoji} Badge unlocked: ${b.name}`));
    if (toasts.length) showToasts(toasts);
  } catch (err) {
    setMood('confused', err.message.includes('Cannot access')
      ? 'Chrome doesn\'t let extensions read this page. Open a meeting page instead.'
      : err.message);
  } finally {
    buttons.forEach((b) => (b.disabled = false));
  }
}

/* ---------- Reset (click twice to confirm) ---------- */

let resetTimer;
$('reset').onclick = async () => {
  const btn = $('reset');
  if (!btn.classList.contains('armed')) {
    btn.classList.add('armed');
    btn.textContent = 'Click again to erase all XP and badges';
    resetTimer = setTimeout(() => {
      btn.classList.remove('armed');
      btn.textContent = 'Reset progress';
    }, 3000);
    return;
  }
  clearTimeout(resetTimer);
  btn.classList.remove('armed');
  btn.textContent = 'Reset progress';
  renderProgress(await Game.reset());
  setMood('idle', 'Progress reset. Fresh start!');
};

/* ---------- Init ---------- */

(async () => {
  try { renderProgress(await Game.load()); } catch { /* storage unavailable */ }

  try {
    const tab = await getTab();
    await inject(tab.id);
    const found = await callInPage(tab.id, 'detect');
    if (found) {
      siteEl.textContent = `Found ${found.name}`;
      setMood('idle', 'Ready when you are.');
      return;
    }
  } catch { /* unsupported or restricted page */ }
  siteEl.textContent = 'No supported app here';
  siteEl.classList.add('nope');
})();

$('md').onclick = () => run('md');
$('txt').onclick = () => run('txt');
$('copy').onclick = () => run('copy');
