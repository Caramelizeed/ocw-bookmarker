<div align="center">

# 🔖 OCW Bookmarker

### *pick up exactly where the lecture left you hanging*

<img src="assets/kaneki-ken.jpeg" alt="Kaneki Ken" width="200">

A tiny Chrome extension that never forgets your place in an MIT OpenCourseWare lecture — and hands you the readings, notes, and problem sets that go with it.

`TypeScript` · `Vite` · `Manifest V3` · `Chrome Storage API`

---

</div>

## 😩 The Problem

MIT OCW lectures run long. You bail out at minute 38 to make dinner, come back three days later, and now you're on a scavenger hunt — scrubbing the timeline, guessing where you stopped, half-remembering whether you actually finished the bit on stochastic gradient descent or just dozed off during it.

**OCW Bookmarker remembers so you don't have to.**

---

## ✨ What It Actually Does

<table>
<tr>
<td width="33%" valign="top">

### ⏱️ Lecture Progress
- Tracks both `youtube.com/watch` and OCW's embedded `youtube.com/embed/VIDEO_ID`
- Autosaves position every ~5s
- Resumes right where you left off
- Stored locally, per video ID

</td>
<td width="33%" valign="top">

### 🎓 OCW Context
- Course title, number & term
- Current lecture + sequence
- Linked readings & notes
- Problem sets, correctly ordered

</td>
<td width="33%" valign="top">

### 📚 Study Resources
- Pulls readings & lecture notes into the popup
- One-click PDF downloads
- Jump between lectures without leaving the video

</td>
</tr>
</table>

---

## 🧩 How OCW & YouTube Fit Together

MIT OpenCourseWare doesn't host video itself — it wraps a YouTube player inside its course pages. That layering is exactly what makes "just remember my timestamp" harder than it sounds:

```
   MIT OpenCourseWare
          │
          ▼
     YouTube iframe
          │
          ▼
youtube.com/embed/VIDEO_ID
          │
          ▼
        <video>
          │
          ▼
    OCW Bookmarker  ← you are here
```

The extension leans on the **YouTube video ID** for playback tracking, and on the **OCW page itself** for the academic context wrapped around it — two data sources, one seamless popup.

---

## ⚙️ Under the Hood

| Step | What Happens |
|---|---|
| **1. Spot the video** | Content script pulls the video ID from either `/watch?v=` or `/embed/` URLs |
| **2. Wait it out** | YouTube doesn't render `<video>` instantly — the extension waits for the player before touching anything |
| **3. Save, quietly** | Every ~5s: video ID, position, duration, timestamp → `chrome.storage.local` |
| **4. Pick up where you left off** | Same video reopened → player seeks straight to your saved position |
| **5. Read the room** | A separate script parses the OCW page for readings, notes, problem sets & nav |
| **6. Grab the PDFs** | Background service worker fires off downloads via the Chrome Downloads API |

---

## 🚀 Getting It Running

```bash
git clone https://github.com/Caramelizeed/ocw-bookmarker.git
cd ocw-bookmarker
npm install
npm run build
```

Then:

1. Open `chrome://extensions`
2. Flip on **Developer mode**
3. **Load unpacked** → select `dist/`

Made a change? `npm run build`, then hit **Reload** on the extension card. That's the whole loop.

---

## 🛠️ Development

```bash
npx tsc --noEmit   # type-check without emitting
npm run build      # ship it to dist/
```

<details>
<summary><b>📁 Project structure</b> (click to expand)</summary>

```
ocw-bookmarker/
├── assets/
│   └── kaneki-ken.jpeg
├── public/
│   ├── manifest.json
│   ├── popup.css
│   └── popup.html
├── src/
│   ├── background.ts   # privileged ops — PDF downloads
│   ├── content.ts      # tracks & restores YouTube playback
│   ├── ocw.ts           # extracts OCW course/resource data
│   └── popup.ts        # powers the popup UI
├── vite.background.config.mts
├── vite.content.config.mts
├── vite.ocw.config.mts
├── vite.popup.config.mts
└── package.json
```

| File | Purpose |
|---|---|
| `content.ts` | Tracks and restores YouTube playback |
| `ocw.ts` | Extracts MIT OCW course and resource info |
| `popup.ts` | Powers the extension popup |
| `background.ts` | Handles privileged background ops (PDF downloads) |

</details>

---

## 🔐 Permissions & Privacy

**Requests:** `storage`, `downloads`

**Host access:** `youtube.com/*`, `ocw.mit.edu/*` — needed to read playback state and course structure.

> 🕶️ **No backend. No accounts. No tracking.**
> Everything lives in `chrome.storage.local`, on your machine, full stop. The extension never phones home with your viewing history or study data.

---

<div align="center">

**License:** MIT — see [`LICENSE`](LICENSE)

*The Kaneki Ken artwork is decorative and not covered by the project's software license.*

</div>
