// Adapter: Otter.ai conversation pages (otter.ai/u/<id>)
// Otter's class names aren't stable, so this uses the timestamp heuristic from core.js:
// every transcript line shows a speaker label and a m:ss timestamp above the text.
TranscriptExporter.register({
  id: 'otter',
  name: 'Otter.ai',

  matches: (url) => /(^|\.)otter\.ai$/.test(url.hostname) && /^\/u\/[\w-]+/.test(url.pathname),

  async extract({ clean, pickRoot, timestampLeaves, scrollParent, scrollThrough, guessParagraphs }) {
    const root = pickRoot(['[class*="transcript" i]', '[id*="transcript" i]', 'main']);
    const first = timestampLeaves(root)[0];
    if (!first) return { error: 'No transcript found. Open the Transcript tab first.' };

    const collected = new Map();
    const grab = () => {
      guessParagraphs(root).forEach((p) => {
        const key = `${p.time}|${p.text.slice(0, 40)}`;
        if (!collected.has(key)) collected.set(key, p);
      });
    };

    await scrollThrough(scrollParent(first), grab);

    return {
      title: clean(document.querySelector('h1')?.textContent) || document.title.replace(/\s*[|-]\s*Otter(\.ai)?\s*$/i, ''),
      meta: {},
      paragraphs: [...collected.values()],
    };
  },
});
