# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Media Controller is a Chrome Extension (Manifest V3) with no build step. All source files are plain JavaScript loaded directly by Chrome — edit files and reload the extension to test.

## Development Workflow

No package manager, no bundler, no compilation. To test changes:

1. Edit source files directly.
2. Open `chrome://extensions` in Chrome with Developer mode enabled.
3. Click the **Reload** icon on the Media Controller extension card (or press `R` while the card is focused).
4. Reopen the popup to see changes take effect.

To load for the first time: **Load unpacked** → select the repo root (the directory containing `manifest.json`).

## Architecture

Three isolated JS contexts communicate via the Chrome messaging API:

```
popup/popup.js  ──chrome.tabs.sendMessage──►  content/content.js  (injected into every page)
                ◄──── { media: [...] } ────
background/service-worker.js  (lifecycle only — dormant after onInstalled)
```

**`content/content.js`** — runs inside the page context.
- Maintains `mediaRegistry[]`: a live list of `<video>` and `<audio>` DOM elements.
- `deepQueryMediaElements()` walks the full DOM tree including Shadow DOM via `TreeWalker` + recursive shadow-root descent.
- A `MutationObserver` auto-registers elements added after page load.
- Responds to three message types: `getMediaState`, `setSpeed`, `setLoop` — always re-scans before responding.

**`popup/popup.js`** — runs inside the popup window.
- On open: sends `getMediaState`; if no media found, polls every 1 s until media appears (`startPolling` / `stopPolling`).
- If media found immediately: schedules a 1.5 s one-shot refresh to catch late-loading elements.
- Speed buttons use `data-speed` attributes; the active state is toggled via `.active` CSS class.
- Loop state drives both `loopToggle.checked` and the `#loop-state` text label.

**`background/service-worker.js`** — minimal; only logs on `onInstalled`.

## Message API

| `type`         | Extra payload          | Response                 |
|----------------|------------------------|--------------------------|
| `getMediaState` | —                     | `{ media: MediaItem[] }` |
| `setSpeed`     | `{ value: number }`    | `{ media: MediaItem[] }` |
| `setLoop`      | `{ value: boolean }`   | `{ media: MediaItem[] }` |

`MediaItem`: `{ index, tag, src, playbackRate, loop }`

## Permissions

Declared in `manifest.json`:
- `activeTab`, `scripting` — required for popup→content messaging.
- `host_permissions: ["<all_urls>"]` — content script runs on all pages.
