# OCW Bookmarker

A tiny Chrome extension that remembers where you stopped in an MIT OpenCourseWare lecture, so you don't have to.

<p align="center">
  <img src="assets/kaneki-ken.jpeg" alt="Kaneki Ken" width="220">
</p>

## Why?

I was working through an MIT OCW lecture on stochastic gradient descent — the kind that runs 45 minutes and doesn't pause for you to make coffee. I'd close the tab, come back later, and have no idea whether I'd stopped at the part about learning rates or the part about mini-batches. Scrubbing through the timeline to find out got old fast.

So I built something to remember for me.

## What it does

- Detects the YouTube video currently playing
- Saves the playback position roughly every 5 seconds
- Restores it automatically the next time you open the same lecture
- Works whether YouTube is loaded directly or embedded (see below)

## The slightly annoying part

MIT OCW doesn't just show you a YouTube video — it hides one inside an iframe:

```
OCW lecture
    ↓
YouTube iframe
    ↓
/embed/VIDEO_ID
    ↓
<video>
    ↓
OCW Bookmarker
```

A normal YouTube URL looks like `youtube.com/watch?v=ID`. OCW's embedded player uses `youtube.com/embed/ID` instead, buried a frame deep. The extension didn't know this existed until it very confidently failed to find any video at all. Fixed by injecting the content script directly into the iframe.

## How it works

1. Grab the video ID from the page (watch or embed URL).
2. Find the actual `<video>` element once it exists — the player doesn't always load immediately.
3. Read `currentTime` every ~5 seconds and write it to `chrome.storage.local`, keyed by video ID.
4. On load, check storage for that ID and seek to the saved time if found.

## Installation

```bash
git clone https://github.com/Caramelizeed/ocw-bookmarker.git
cd ocw-bookmarker
npm install
npm run build
```

Then load it manually:

1. Go to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `dist/` folder

## Current limitations

- Saves periodically, not continuously — the last few seconds before closing a tab may be lost
- Resumes automatically, with no confirmation prompt
- No popup UI yet
- No course-level dashboard — it only knows about individual videos

## Roadmap

- Popup showing saved lectures
- Manual bookmarks
- Timestamped notes
- Course-level progress tracking
- A dashboard, eventually

## Tech stack

| | |
|---|---|
| Language | TypeScript |
| Build | Vite |
| Platform | Chrome Extension Manifest V3 |
| Storage | Chrome Storage API |
| Playback | HTML5 Video API |

## Privacy

Progress is stored locally with `chrome.storage.local`. No backend, no accounts, no playback data leaves your browser.

## License

MIT License — see [LICENSE](LICENSE).

## Artwork

The Kaneki Ken image is decorative and not covered by the project's software license.
