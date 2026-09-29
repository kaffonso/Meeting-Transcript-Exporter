// Adapter: Fathom call pages (fathom.video/calls/<id>) and share links (fathom.video/share/<token>)
// Fathom's class names aren't stable, so this uses the timestamp heuristic from core.js:
// each transcript line in the sidebar shows a speaker name, a timestamp and the text.
TranscriptExporter.register({
  id: 'fathom',
  name: 'Fathom',

  matches: (url) => /(^|\.)fathom\.video$/.test(url.hostname) && /^\/(calls|share)\/[\w-]+/.test(url.pathname),

  async extract({ clean, pickRoot, timestampLeaves, scrollParent, scrollThrough, guessParagraphs }) {
    const root = pickRoot(['[class*="transcript" i]', '[id*="transcript" i]', 'aside', 'main']);
    const first = timestampLeaves(root)[0];
    if (!first) return { error: 'No transcript found. Open the Transcript panel first.' };

    const collected = new Map();
    const grab = () => {
      guessParagraphs(root).forEach((p) => {
        const key = `${p.time}|${p.text.slice(0, 40)}`;
        if (!collected.has(key)) collected.set(key, p);
      });
    };

    await scrollThrough(scrollParent(first), grab);

    return {
      title: clean(document.querySelector('h1')?.textContent) || document.title.replace(/\s*[|-]\s*Fathom\s*$/i, ''),
      meta: {},
      paragraphs: [...collected.values()],
    };
  },
});
