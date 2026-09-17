// Adapter: Fireflies.ai meeting pages (app.fireflies.ai/view/...)
TranscriptExporter.register({
  id: 'fireflies',
  name: 'Fireflies.ai',

  matches: (url) => /(^|\.)fireflies\.ai$/.test(url.hostname) && url.pathname.startsWith('/view/'),

  async extract({ clean, isTimestamp, scrollThrough, readJsonScript }) {
    const first = document.querySelector('[id^="transcript-paragraph-"]');
    if (!first) return { error: 'No transcript found. Open the Transcript tab first.' };

    const collected = new Map();
    const grab = () => {
      document.querySelectorAll('[id^="transcript-paragraph-"]').forEach((p) => {
        const idx = parseInt(p.id.split('-').pop(), 10);
        if (Number.isNaN(idx) || collected.has(idx)) return;
        const speaker = clean(p.querySelector('.name')?.textContent);
        const time = [...p.querySelectorAll('span[role="button"]')]
          .map((e) => clean(e.textContent))
          .find(isTimestamp);
        const text = clean(
          [...p.querySelectorAll('.transcript-sentence > span')].map((s) => s.textContent).join(' ')
        );
        if (text) collected.set(idx, { speaker, time, text });
      });
    };

    await scrollThrough(first.closest('[data-radix-scroll-area-viewport]'), grab);

    const note = readJsonScript('__NEXT_DATA__')?.props?.pageProps?.initialMeetingNote || {};
    const title =
      clean(document.getElementById('edit-meeting-title-btn')?.textContent) ||
      document.title.replace(/\s*-\s*Meeting recording by Fireflies\.ai\s*$/, '');

    return {
      title,
      meta: { date: note.date, durationMins: note.durationMins },
      paragraphs: [...collected.entries()].sort((a, b) => a[0] - b[0]).map((e) => e[1]),
    };
  },
});
