# Contributing

The most useful contribution is an **adapter** for a new transcription app. An adapter is one JavaScript file that tells the extension how to find the transcript on that app's pages.

## Adding an adapter

1. Copy `src/adapters/_template.js` to `src/adapters/<app>.js`.
2. Fill in:
   - `id`: unique, lowercase (e.g. `otter`)
   - `name`: display name shown in the popup
   - `matches(url)`: return `true` for the app's transcript pages
   - `extract(helpers)`: return `{ title, meta, paragraphs }`, where each paragraph is `{ speaker, time, text }`
3. Add the file to `ADAPTER_FILES` at the top of `popup.js`.
4. Add the app to the table in `README.md`.
5. Reload the extension in `chrome://extensions` and test on a real meeting.

### Available helpers

| Helper | What it does |
|---|---|
| `clean(str)` | Collapses whitespace and trims |
| `sleep(ms)` | Waits |
| `isTimestamp(str)` | True for `mm:ss` or `hh:mm:ss` |
| `scrollThrough(container, grab)` | Scrolls a container top to bottom, calling `grab()` at each step, for apps that only render visible lines |
| `readJsonScript(id)` | Parses a `<script type="application/json">` element by id |
| `scrollParent(el)` | Nearest ancestor that actually scrolls, to pass to `scrollThrough` |
| `timestampLeaves(root)` | Leaf elements whose whole text is a timestamp |
| `pickRoot(selectors)` | First matching element that contains timestamps, else `document.body` |
| `guessParagraphs(root)` | Builds `{ speaker, time, text }` lines from timestamp elements when the app's markup is unstable; see `otter.js` |

### Tips for finding selectors

- Open DevTools on a transcript page and inspect a transcript line.
- Prefer stable hooks: `id`, `data-*` attributes, ARIA roles, and semantic class names. Avoid auto-generated class names like `sc-a1b2c3` or `css-xyz123`, which change on every deploy.
- Check whether all lines exist in the DOM at once, or only the visible ones. If it's the latter, use `scrollThrough`.
- Look for JSON embedded in the page (e.g. `__NEXT_DATA__`); it's often more reliable than the DOM.
- Collect lines into a `Map` keyed by a stable id so scrolling doesn't create duplicates.

## Adding a language

UI strings live in `_locales/<lang>/messages.json` in Chrome's i18n format. Chrome picks the folder from the browser UI language and falls back to `en`.

1. Copy `_locales/en/messages.json` to `_locales/<lang>/messages.json` (Chrome locale codes, e.g. `it`, `nl`, `pt_BR`).
2. Translate every `message`. Keep the `$1`, `$2` placeholders, they are filled in by the code.
3. Add the language to the README feature list.
4. Reload the extension with the browser set to that language to check that nothing overflows the 300px popup.

New strings in code go through `t('key')` in the popup and `helpers.t('key')` in adapters, with the English text added to `_locales/en/messages.json`.

## Pull request checklist

- [ ] Tested on at least one real meeting, short and long if possible
- [ ] No real transcripts, names, screenshots with private data, or tokens in the PR
- [ ] Works without extra permissions
- [ ] README table updated

## Fixing a broken adapter

If an app changed its layout, open an issue with the app name and what happens, or send a PR with updated selectors. Please don't paste full page HTML from real meetings, since it contains private conversation data.
