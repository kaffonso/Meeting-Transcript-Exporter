<p align="center">
  <img src="assets/logo.svg" width="120" alt="Transcript Exporter logo: a smiling speech bubble with a transcript sheet">
</p>

<h1 align="center">Meeting Transcript Exporter</h1>

A small Chrome extension that exports meeting transcripts you can already see in your browser to **Markdown** or **plain text**.

No AI, no API keys, no servers. It reads the transcript that the app has already rendered on the page and builds the file locally, so it is fast and your data never leaves your machine.

## Supported apps

| App | Status |
|---|---|
| Fireflies.ai | ✅ Supported |
| _Your app here_ | See [CONTRIBUTING.md](CONTRIBUTING.md) |

## Features

- Download as `.md` or `.txt`, or copy Markdown to the clipboard
- Speaker names and timestamps
- Optional merging of consecutive lines from the same speaker
- Handles long transcripts that only render visible lines, by scrolling through them automatically
- Adapter system, so adding a new app is one file
- XP, levels, daily streaks and 12 badges to unlock, just for fun

## Install

1. Download or clone this repository.
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and select the repository folder.
4. Pin the extension to the toolbar.

Works in Chromium-based browsers (Chrome, Edge, Brave, Arc).

## Usage

1. Open a meeting page in a supported app, with the transcript visible.
2. Click the extension icon.
3. Choose **Download .md**, **Download .txt**, or **Copy Markdown**.

## Example output

```markdown
# Weekly Sync

**Date:** 9/16/2026, 5:00:00 PM
**Duration:** ~31 min
**Speakers:** Alice, Bob
**Source:** Fireflies.ai

---

**Alice** (00:06): Hi Bob, can you walk me through the new dashboard?

**Bob** (00:12): Sure, let me share my screen.
```

## Levels and badges

Every export earns XP: 10 for the export, up to 20 more based on how many words it has, 5 for a meeting you haven't exported before, and 5 for keeping a daily streak going. Unlocking a badge adds 25.

Climb from **Note Newbie** to **Legendary Scribe**, keep a daily streak alive, and collect badges like Night Owl, Marathon Meeting and Triple Threat. Locked badges show a hint when you hover them.

Progress is saved only in your browser with `chrome.storage.local`. Nothing is sent anywhere, and you can reset it from the Badges section.

## How it works

When you click a button, the popup injects `src/core.js` and the adapters into the current tab. The adapter that matches the URL reads the transcript elements from the page, and the popup formats and downloads the result.

Permissions are limited to `activeTab`, `scripting` and `storage`: the extension only reads the tab you click it on, only when you click it, and `storage` is used just to remember your XP and badges locally.

## Limitations

Adapters depend on each app's page structure. When an app updates its interface, its adapter may stop working until the selectors are updated. Issues and pull requests are welcome.

## Disclaimer

This project is not affiliated with, endorsed by, or sponsored by Fireflies.ai or any other app it supports. All product names and trademarks belong to their owners and are used only to describe compatibility.

This tool is intended for exporting meetings you have legitimate access to, for personal use. You are responsible for complying with the terms of service of the apps you use it with and with any applicable laws, including consent and privacy rules for recorded conversations.

## License

[MIT](LICENSE)
