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
