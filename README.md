# Media Controller

![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue?style=flat-square)
![Version](https://img.shields.io/badge/version-1.0-green?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-lightgrey?style=flat-square)
![Platform](https://img.shields.io/badge/platform-Chrome-yellow?style=flat-square&logo=googlechrome)

> Control playback speed and loop behavior for any video or audio element on any webpage.

---

## Overview

Media Controller is a Chrome extension (Manifest V3) that lets you adjust the playback rate and loop setting of every `<video>` and `<audio>` element on the current page from a single popup. It works on sites that use standard HTML media elements, dynamically injected players, blob URLs, and components hidden inside Shadow DOM trees — covering cases where browser DevTools or simpler extensions fall short.

---

## Features

- **6 speed presets** — 0.5×, 0.75×, 1×, 1.25×, 1.5×, 2× with visual active-state highlighting
- **Loop toggle** — enable or disable looping on all media elements at once, with an On/Off label
- **Shadow DOM traversal** — recursively walks into shadow roots to find media elements that `querySelector` cannot reach
- **Dynamic media detection** — a `MutationObserver` watches for `<video>` and `<audio>` elements added after page load
- **Polling fallback** — if no media is found when the popup opens, it polls every second and enables controls the moment media appears
- **Late-straggler refresh** — when media is found immediately, a one-time 1.5 s refresh catches any elements that appear slightly after the initial scan
- **Blob URL support** — players that use `blob:` URLs are included in the registry without filtering
- **Applies to all media** — commands target every discovered element on the page simultaneously
- **Dark minimal UI** — 300 px fixed-width popup with a dark theme and pulsing "Scanning for media…" animation while waiting
- **Clean teardown** — the polling interval is cancelled when the popup closes

---

## How It Works

```
┌─────────────┐   open popup    ┌─────────────┐   chrome.tabs.sendMessage   ┌──────────────┐
│   User      │ ──────────────► │  popup.js   │ ─────────────────────────► │ content.js   │
│  (Chrome)   │                 │             │ ◄───── { media: [...] } ──── │  (page)      │
└─────────────┘                 └─────────────┘                             └──────────────┘
```

1. **content.js** is injected into every page at `document_idle`. It performs an initial scan, sets up a `MutationObserver`, and listens for messages from the popup.
2. **popup.js** queries the active tab on open, sends a `getMediaState` message, and renders the current speed and loop state of the first discovered element.
3. User interactions (speed button clicks, loop toggle) send `setSpeed` or `setLoop` messages. `content.js` applies the change to every element in its registry and responds with the updated state.
4. The **background service worker** (`service-worker.js`) handles the extension lifecycle (`onInstalled`) and stays dormant otherwise.

### Message API

| Message type    | Payload            | Response               |
|-----------------|--------------------|------------------------|
| `getMediaState` | —                  | `{ media: MediaItem[] }` |
| `setSpeed`      | `{ value: number }` | `{ media: MediaItem[] }` |
| `setLoop`       | `{ value: boolean }` | `{ media: MediaItem[] }` |

**`MediaItem` shape:**
```json
{
  "index": 0,
  "tag": "video",
  "src": "https://example.com/video.mp4",
  "playbackRate": 1.5,
  "loop": false
}
```

---

## Prerequisites

| Requirement | Details |
|-------------|---------|
| Browser | Google Chrome 109 or later (Manifest V3 support) |
| OS | Windows, macOS, or Linux |
| Node / npm | Not required — no build step |

---

## Installation

### Load as an unpacked extension (development)

1. Clone or download this repository:
   ```bash
   git clone <repo-url>
   cd media-controller
   ```

2. Open Chrome and navigate to:
   ```
   chrome://extensions
   ```

3. Enable **Developer mode** (toggle in the top-right corner).

4. Click **Load unpacked** and select the `media-controller/` directory (the folder containing `manifest.json`).

5. The extension icon appears in the Chrome toolbar. Pin it for easy access.

### Icons (optional, before publishing)

The `icons/` directory is a placeholder. Add PNG files at the following sizes before submitting to the Chrome Web Store:

| File | Size |
|------|------|
| `icons/icon16.png` | 16 × 16 px |
| `icons/icon48.png` | 48 × 48 px |
| `icons/icon128.png` | 128 × 128 px |

Then add an `"icons"` field and `"default_icon"` inside `"action"` to `manifest.json`.

---

## Configuration

This extension has no environment variables or user-facing configuration files. All behavior is controlled through the popup UI.

| Setting | Where | Options |
|---------|-------|---------|
| Playback speed | Popup — speed buttons | 0.5×, 0.75×, 1×, 1.25×, 1.5×, 2× |
| Loop | Popup — toggle switch | On / Off |

---

## Usage

1. Navigate to any page that contains a `<video>` or `<audio>` element (e.g. YouTube, a podcast site, a local HTML file).
2. Click the **Media Controller** icon in the Chrome toolbar.
3. The popup shows how many media elements were detected.
4. Click a speed button to change the playback rate immediately.
5. Flip the loop toggle to enable or disable looping.

If the popup opens before the media element exists on the page (e.g. on single-page apps that load the player lazily), the status line shows **"Scanning for media…"** with a pulsing animation and controls stay disabled until at least one element is found.

---

## Examples

### Example 1 — Speed up a podcast

1. Open a podcast player page.
2. Click the extension icon.
3. Status: `1 media element found`
4. Click **1.5×** — the podcast immediately plays at 1.5× speed.
5. The 1.5× button is highlighted in indigo.

### Example 2 — Loop a background video

1. Open a page with an ambient or background video.
2. Click the extension icon.
3. Status: `1 media element found`
4. Flip the **Loop** toggle — label changes from `Off` to `On`.
5. The video now repeats indefinitely.

### Example 3 — Late-loading audio (e.g. turboscribe.ai)

1. Open a page where the audio player is created dynamically after interaction.
2. Click the extension icon before the player appears.
3. Status shows **"Scanning for media…"** with a pulse animation.
4. Start playback on the page — the audio element is created.
5. Within 1 second the popup detects it, enables controls, and shows `1 media element found`.

---

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| "Unable to access this tab" | Extension opened on a `chrome://` or `chrome-extension://` page | Navigate to a regular `http`/`https` page |
| Controls stay disabled indefinitely | The page uses a non-standard player (Flash, iframe with cross-origin restrictions) | No fix — the extension can only control native `<video>`/`<audio>` elements |
| Speed reverts after seeking | Some players (e.g. YouTube) reset `playbackRate` programmatically | Click the speed button again after seeking |
| Extension not listed after loading | `manifest.json` has a syntax error | Check the error banner on `chrome://extensions` and validate the JSON |
| Shadow DOM media not detected | Deeply nested custom elements beyond the recursive traversal depth | Open an issue with the site URL |

---

## Contributing

1. Fork the repository and create a feature branch:
   ```bash
   git checkout -b feat/your-feature
   ```
2. Make your changes. No build step is required — edit the source files directly.
3. Test by reloading the extension at `chrome://extensions` (click the refresh icon on the extension card).
4. Open a pull request with a clear description of what changed and why.

Please keep pull requests focused: one feature or fix per PR. Bug reports are welcome as GitHub Issues — include the affected site URL and Chrome version.

---

## License

No `LICENSE` file is present in the repository. All rights reserved unless a license is added by the project maintainer.
