// Shared runtime injected into the page before the adapters.
// Adapters register themselves here; the popup then calls run().
(() => {
  if (window.TranscriptExporter) return;

  const adapters = new Map();

  const helpers = {
    clean: (s) => (s || '').replace(/\s+/g, ' ').trim(),

    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),

    isTimestamp: (s) => /^\d{1,2}:\d{2}(:\d{2})?$/.test((s || '').trim()),

    // Scrolls a container from top to bottom, calling grab() at each step.
    // Needed for apps that only render the lines currently on screen.
    async scrollThrough(container, grab, { stepMs = 150 } = {}) {
      if (!container) { grab(); return; }
      const original = container.scrollTop;
      container.scrollTop = 0;
      await helpers.sleep(200);
      grab();
      let last = -1;
      while (container.scrollTop !== last) {
        last = container.scrollTop;
        container.scrollTop += Math.max(200, container.clientHeight * 0.8);
        await helpers.sleep(stepMs);
        grab();
      }
      container.scrollTop = original;
    },

    readJsonScript(id) {
      try { return JSON.parse(document.getElementById(id)?.textContent || 'null'); }
      catch { return null; }
    },

    // Nearest ancestor that actually scrolls, for scrollThrough().
    scrollParent(el) {
      for (let n = el?.parentElement; n; n = n.parentElement) {
        const { overflowY } = getComputedStyle(n);
        if (/auto|scroll/.test(overflowY) && n.scrollHeight > n.clientHeight) return n;
      }
      return null;
    },

    // Leaf elements whose whole text is a timestamp. One per transcript line in most apps.
    timestampLeaves(root = document.body) {
      return [...root.querySelectorAll('*')].filter(
        (el) => el.childElementCount === 0 && helpers.isTimestamp(el.textContent)
      );
    },

    // First selector whose element contains at least `min` timestamps, else document.body.
    // Lets an adapter narrow the search to the transcript panel without knowing its exact markup.
    pickRoot(selectors, min = 2) {
      for (const sel of selectors) {
        const hit = [...document.querySelectorAll(sel)].find((el) => helpers.timestampLeaves(el).length >= min);
        if (hit) return hit;
      }
      return document.body;
    },

    // For apps whose markup isn't pinned down. Each timestamp leaf anchors one paragraph:
    // the paragraph is the outermost ancestor that still holds only that timestamp. The
    // speaker is the longest name-like leaf before the timestamp (avatars render initials
    // there too, and the full name is always longer), falling back to the first name-like
    // leaf after it. The rest is text. Lines without a speaker inherit the previous one.
    guessParagraphs(root = document.body) {
      const stamps = helpers.timestampLeaves(root);
      const stampsWithin = new Map();
      for (const stamp of stamps) {
        for (let n = stamp; n && n !== root; n = n.parentElement) {
          stampsWithin.set(n, (stampsWithin.get(n) || 0) + 1);
        }
      }

      const looksLikeName = (t) => t.length > 0 && t.length <= 40 && !/[.!?,;]$/.test(t) && /\p{L}/u.test(t);
      const rows = new Set();
      const out = [];
      let lastSpeaker = '';

      for (const stamp of stamps) {
        let row = stamp;
        while (row.parentElement && row.parentElement !== root && stampsWithin.get(row.parentElement) === 1) {
          row = row.parentElement;
        }
        if (rows.has(row)) continue;
        rows.add(row);

        const leaves = row.childElementCount === 0
          ? [row]
          : [...row.querySelectorAll('*')].filter((el) => el.childElementCount === 0);
        const at = leaves.indexOf(stamp);
        const textOf = (els) => els.map((el) => helpers.clean(el.textContent)).filter(Boolean);
        const before = textOf(leaves.slice(0, at)).filter(looksLikeName);
        const after = textOf(leaves.slice(at + 1));

        let speaker = before.sort((a, b) => b.length - a.length)[0] || '';
        if (!speaker && after.length && looksLikeName(after[0])) speaker = after.shift();
        const text = helpers.clean(after.join(' '));
        if (!text) continue;

        if (speaker) lastSpeaker = speaker;
        out.push({ speaker: speaker || lastSpeaker, time: helpers.clean(stamp.textContent), text });
      }
      return out;
    },
  };

  window.TranscriptExporter = {
    helpers,

    register(adapter) {
      if (!adapter?.id || typeof adapter.matches !== 'function' || typeof adapter.extract !== 'function') {
        console.warn('[TranscriptExporter] invalid adapter', adapter);
        return;
      }
      adapters.set(adapter.id, adapter);
    },

    find(url = new URL(location.href)) {
      return [...adapters.values()].find((a) => a.matches(url)) || null;
    },

    detect() {
      const a = this.find();
      return a ? { id: a.id, name: a.name } : null;
    },

    async run() {
      const adapter = this.find();
      if (!adapter) return { error: 'This site is not supported yet. See CONTRIBUTING.md to add it.' };
      const result = await adapter.extract(helpers);
      if (result?.error) return result;
      const paragraphs = (result?.paragraphs || []).filter((p) => p && p.text);
      if (!paragraphs.length) return { error: `No transcript found on this ${adapter.name} page.` };
      return {
        source: adapter.name,
        title: result.title || document.title || 'Transcript',
        meta: result.meta || {},
        paragraphs: paragraphs.map((p) => ({
          speaker: p.speaker || 'Unknown',
          time: p.time || '',
          text: p.text,
        })),
      };
    },
  };
})();
