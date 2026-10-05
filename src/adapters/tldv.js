// Adapter: tl;dv meeting pages (tldv.io/app/meetings/<id>)
// Markup: #transcript-container > p[data-index], each with a [data-speaker="true"]
// header (timestamp in an <a>, name in a <span>) followed by one span per word.
TranscriptExporter.register({
  id: 'tldv',
  name: 'tl;dv',

  matches: (url) => /(^|\.)tldv\.io$/.test(url.hostname) && /\/meetings\/[\w-]+/.test(url.pathname),

  async extract({ t, clean, scrollThrough }) {
    const container = document.getElementById('transcript-container');
    if (!container) return { error: t('errOpenTranscriptTab') };

    const collected = new Map();
    const grab = () => {
      container.querySelectorAll('p[data-index]').forEach((p) => {
        const idx = parseInt(p.dataset.index, 10);
        if (Number.isNaN(idx) || collected.has(idx)) return;
        const header = p.querySelector('[data-speaker="true"]');
        const time = clean(header?.querySelector('a')?.textContent);
        const speaker = clean(header?.querySelector('span:not(.hidden)')?.textContent)
          || clean(header?.textContent).replace(time, '').replace(/^[:\s]+|[:\s]+$/g, '');
        const text = clean(
          [...p.querySelectorAll('span[data-speaker="false"]')].map((s) => s.textContent).join(' ')
        );
        if (text) collected.set(idx, { speaker, time, text });
      });
    };

    await scrollThrough(container, grab);

    return {
      title: clean(document.querySelector('h1')?.textContent) || document.title.replace(/\s*[|-]\s*tl;dv\s*$/i, ''),
      meta: {},
      paragraphs: [...collected.entries()].sort((a, b) => a[0] - b[0]).map((e) => e[1]),
    };
  },
});
