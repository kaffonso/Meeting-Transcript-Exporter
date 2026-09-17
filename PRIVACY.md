# Privacy Policy

_Last updated: September 17, 2026_

Meeting Transcript Exporter ("the extension") is designed to work entirely inside your browser.

## What the extension does
When you click one of its buttons, the extension reads the transcript shown on the current tab and creates a Markdown or text file, or copies it to your clipboard.

## Data collection
The extension does **not** collect, transmit, sell, or share any data. Specifically:

- Transcript content is processed only in your browser and saved only where you choose (your downloads folder or clipboard).
- No analytics, tracking, cookies, or remote servers are used.
- No account or sign-in is required.

## Data stored on your device
To power levels and badges, the extension stores the following in `chrome.storage.local`, on your device only:

- XP total, number of exports, total word count, and daily streak
- Which badges you have unlocked
- Which export formats you have used
- The addresses (URL without query string) of meetings you exported, used only to award XP for new meetings

No transcript text, speaker names, or meeting titles are stored. You can erase this data at any time with **Reset progress** in the Badges section, or by removing the extension.

## Permissions
- `activeTab` and `scripting`: read the transcript on the tab you are using, only when you click the extension.
- `storage`: save your progress locally, as described above.

## Contact
Questions or concerns: open an issue at [GITHUB_REPO_URL]/issues.
