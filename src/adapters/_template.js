// Template for a new adapter. Copy to src/adapters/<app>.js,
// fill it in, and add the file to ADAPTER_FILES in popup.js.
TranscriptExporter.register({
  id: 'example',            // unique, lowercase
  name: 'Example App',      // shown in the popup

  // Return true for pages of this app that show a transcript.
  matches: (url) => url.hostname === 'app.example.com' && url.pathname.startsWith('/meeting/'),

  // helpers: clean, sleep, isTimestamp, scrollThrough, readJsonScript
  async extract({ clean, scrollThrough }) {
    const container = document.querySelector('.transcript-list');
    if (!container) return { error: 'Open the transcript view first.' };

    const collected = new Map(); // key -> { speaker, time, text }
    const grab = () => {
      container.querySelectorAll('.transcript-row').forEach((row, i) => {
        const key = row.dataset.id || i;
        if (collected.has(key)) return;
        collected.set(key, {
          speaker: clean(row.querySelector('.speaker')?.textContent),
          time: clean(row.querySelector('.time')?.textContent),
          text: clean(row.querySelector('.text')?.textContent),
        });
      });
    };

    // Use scrollThrough if the app only renders visible rows; otherwise just grab().
    await scrollThrough(container, grab);

    return {
      title: clean(document.querySelector('h1')?.textContent),
      meta: {},                         // optional: { date, durationMins }
      paragraphs: [...collected.values()],
    };
  },
});
