# OCW Bookmarker 🔖

<p align="center">
  <img src="assets/kaneki-ken.jpeg" alt="Kaneki Ken" width="260">
</p>

<h3 align="center">Never lose your place in an MIT OpenCourseWare lecture again.</h3>

<p align="center">
  A lightweight Chrome/Chromium extension that automatically saves and restores
  your playback position in MIT OpenCourseWare's embedded YouTube lectures.
</p>

## Why does this exist?

I use MIT OpenCourseWare to study, and I wanted a dead-simple workflow:

**Watch a lecture → close the tab → come back later → pick up right where you left off.**

No re-scrubbing through 40 minutes of linear algebra to find the one part you actually needed. This extension exists so you can be lazy about timestamps and diligent about everything else.

At first glance, this looked like a tiny weekend extension. Famous last words.

The plan was simple:

```
YouTube video
     ↓
Get video ID
     ↓
Read currentTime
     ↓
Save it
     ↓
Open video later
     ↓
Seek back to saved position
```

Easy, right? *Right?*

## Plot twist: MIT OCW doesn't just embed YouTube, it hides it

A normal YouTube video lives at a nice, honest URL:

```
https://www.youtube.com/watch?v=VIDEO_ID
```

My first implementation happily assumed this was the URL to watch for. It was not. It was, in fact, watching the wrong thing entirely — the extension equivalent of waiting at the wrong bus stop.

An OCW lecture is actually a YouTube video wearing an **iframe disguise**:

```
MIT OpenCourseWare
        │
        ▼
   YouTube iframe   🥸 (nice try)
        │
        ▼
youtube.com/embed/VIDEO_ID
        │
        ▼
    <video>
```

The browser tab says "OCW," but the actual video player is quietly minding its own business inside a nested YouTube iframe. Classic case of mistaken identity, and it's exactly what broke version one.

The fix: make the extension sneak *into* the embedded YouTube frame itself, detect `/embed/VIDEO_ID`, grab the real `<video>` element, and store progress locally. No more knocking on the wrong door.

## Features

### Current
- Detects YouTube videos embedded in MIT OpenCourseWare (no more iframe-induced identity crises)
- Supports both `/watch?v=...` and `/embed/...` URLs, because this extension doesn't play favorites
- Saves playback position roughly every 5 seconds — frequent enough to matter, lazy enough to be efficient
- Restores your previous position when the lecture reopens, like a very reliable bookmark that never falls out of the book
- Keeps progress separate for every video (your quantum mechanics lecture won't accidentally think it's your econ lecture)
- Persists progress using `chrome.storage.local`
- Handles YouTube navigation without needing a manual extension restart
- Built with TypeScript and Manifest V3 — modern tooling for a very old problem (forgetting where you paused)

### Roadmap
- Popup interface
  - Show saved lectures
  - Display course and lecture names
  - "Resume from 23:41" prompt
- Manual timestamp bookmarks
- Timestamped notes
- Lecture completion tracking
- Course-level progress
- Progress dashboard
- Import/export saved progress
- Better handling of completed videos
- Chrome Web Store release

## How it works

Each lecture is identified by its YouTube video ID. For example:

```
https://www.youtube.com/embed/xyz
                              └──────────┘
                               video ID
```

Progress is stored under a video-specific key, like a locker with its own combination:

```
video_xyz
```

with data like:

```json
{
  "position": 120.5,
  "duration": 7132.4,
  "updatedAt": 1750000000000
}
```

The architecture, in one diagram (the extension's whole life story):

```
┌─────────────────────────┐
│   MIT OpenCourseWare    │
│                         │
│   Lecture page          │
└────────────┬────────────┘
             │
             │ embeds
             ▼
┌─────────────────────────┐
│      YouTube iframe     │
│                         │
│ /embed/VIDEO_ID         │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│     OCW Bookmarker      │
├─────────────────────────┤
│ Detect video ID         │
│ Find <video>            │
│ Read currentTime        │
│ Save progress           │
│ Restore progress        │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  chrome.storage.local   │
└─────────────────────────┘
```

## Project structure

```
ocw-bookmarker/
├── assets/
│   └── kaneki-ken.jpeg
├── public/
│   └── manifest.json
├── src/
│   └── content.ts
├── .gitignore
├── LICENSE
├── README.md
├── package.json
├── package-lock.json
├── tsconfig.json
└── vite.config.mts
```

## Tech stack

| Technology | Purpose |
|---|---|
| TypeScript | Extension source code (because `any` felt like giving up) |
| Vite | Build system, fast enough that you won't lose your place waiting for it |
| Chrome Extensions API | Browser integration |
| Manifest V3 | Extension platform |
| `chrome.storage.local` | Persistent progress storage |
| HTML5 Video API | Reading and restoring playback position |

## Installation

### Requirements
- Node.js
- npm
- Chrome or another Chromium-based browser

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/ocw-bookmarker.git
cd ocw-bookmarker
```

### 2. Install dependencies

```bash
npm install
```

### 3. Build the extension

```bash
npm run build
```

The compiled extension lands in:

```
dist/
```

### 4. Load the extension

Open:

```
chrome://extensions
```

Then:

1. Enable **Developer mode**.
2. Click **Load unpacked**.
3. Select the project's `dist/` directory.
4. Open an MIT OpenCourseWare lecture and start watching. Your future self, mid-lecture, will thank your past self for this.

## Development

Type-check the project:

```bash
npx tsc --noEmit
```

Build the extension:

```bash
npm run build
```

Build automatically on source file changes:

```bash
npm run dev
```

After rebuilding, hit the **Reload** button for the extension on `chrome://extensions`. (No, restarting your whole browser isn't required — save that dramatic gesture for something that deserves it.)

## Testing

A basic test, no lab coat required:

1. Open an MIT OpenCourseWare lecture.
2. Open the browser developer console.
3. Start the video.
4. Watch for at least 10 seconds (a small sacrifice for science).
5. Confirm the extension logs a saved position.
6. Close the tab.
7. Reopen the same lecture.
8. Confirm the video resumes from approximately the previous position.

Expected console output:

```
[OCW Bookmarker] Extension loaded.
[OCW Bookmarker] New video detected: PzeCGelnheE
[OCW Bookmarker] Progress saving started.
[OCW Bookmarker] Saved 10.2s for PzeCGelnheE
[OCW Bookmarker] Saved 15.3s for PzeCGelnheE
```

When returning to a previously watched lecture:

```
[OCW Bookmarker] Found saved position: 120.0s
[OCW Bookmarker] Resumed PzeCGelnheE at 120.0s
```

## The important implementation detail

The extension handles both YouTube URL formats:

- `/watch?v=VIDEO_ID`
- `/embed/VIDEO_ID`

The second format is the one that actually matters for MIT OCW — it's the whole reason this project has a "plot twist" section above.

The extension injects its content script directly into YouTube's embedded player frames:

```json
{
  "matches": [
    "https://www.youtube.com/watch*",
    "https://www.youtube.com/embed/*"
  ],
  "all_frames": true
}
```

Without the embedded-player match and frame injection, an extension running only on the OCW page would be stuck outside the iframe, pressing its face against the glass, unable to reach the actual `<video>` element.

## Privacy

OCW Bookmarker stores lecture progress locally using `chrome.storage.local`.

- No account required.
- No external server.
- The extension does not send playback progress anywhere. Your questionable 3 a.m. cramming habits stay between you and your laptop.

## Known limitations

This is an early version, still finding its footing:

- Progress is saved periodically rather than on every playback event.
- The final few seconds before a tab closes may not be saved (the extension's version of "I'll remember this" right before forgetting it).
- The extension currently resumes automatically — no confirmation prompt yet.
- No popup or graphical progress interface yet.
- Course and lecture metadata aren't displayed yet.
- Built primarily around the YouTube players MIT OCW actually uses.

## Contributing

Contributions, bug reports, and feature ideas are welcome — this extension would love some company.

If you use MIT OpenCourseWare and have an idea that would make studying easier, open an issue. For larger changes, pull requests are welcome too.

### Possible contribution areas

- Better YouTube/OCW navigation detection
- Course and lecture metadata extraction
- Popup UI
- Bookmark management
- Timestamped notes
- Progress visualization
- Additional embedded video platforms
- Automated tests

## License

Intended to be released under the MIT License (no relation to MIT OpenCourseWare, but a fun coincidence). See [LICENSE](LICENSE) for details.

## Artwork

The Kaneki Ken artwork displayed in this README is separate from the OCW Bookmarker source code and is not covered by the project's software license. Copyright remains with the respective rights holder.

<p align="center">
  Built while trying to make studying with MIT OpenCourseWare slightly less annoying — and, evidently, slightly punnier.
</p>
