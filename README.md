# PhoneBlade

A desktop, browser-based fruit-slicing game where you swing your **hand in front of a webcam** to slice virtual fruit. The original brief targeted a phone-as-sword AR mobile game; this build pivots to desktop + webcam hand tracking per the agreed scope change.

> ⚠️ Phase 1 only. Today this is a swing-detection debug harness. The fruit and slicing come in later phases.

## Stack

- **Vite + React + TypeScript** — dev / build
- **@mediapipe/tasks-vision** (`HandLandmarker`) — webcam hand tracking
- **Zustand** — state (shape kept serializable for future netcode)
- **Three.js** — coming in Phase 2 for realistic 3D fruit
- **Howler.js** — coming in Phase 3 for audio
- Browser-only distribution. No Electron.

## Prerequisites

- Node 18+ (tested on Node 24)
- A working webcam
- A modern Chromium-based browser, Safari 16+, or Firefox 110+
- The page must be served over `http://localhost` or `https://` for `getUserMedia` to work — Vite's dev server already satisfies this.

## Setup

```bash
cd phoneblade
npm install
npm run dev
```

Then open the URL Vite prints (usually <http://localhost:5173>).

## Testing Phase 1

1. Click **Start**. Allow camera access when the browser prompts.
2. After ~1–3s, the hand model loads and the camera preview turns on (mirrored, like a selfie).
3. Hold your open hand in front of the camera. You should see:
   - Faint white dots on each of the 21 hand landmarks.
   - A **yellow circle** on the tracked landmark (default: middle-knuckle).
   - A **blue trail** of recent positions, turning **green** while an active swing is in progress.
   - A **pink velocity vector** projecting from the tracked landmark.
4. Swing your hand. Each swing should:
   - Briefly flash a **yellow arc** along the swing path.
   - Add an entry to the **Recent swings** log on the right, with direction + duration + intensity.

If swings aren't registering, lower the **Enter threshold** in the sidebar. If random tiny motions are being detected, raise it. See [SENSOR_TUNING.md](./SENSOR_TUNING.md) for the full tuning guide.

## Known Phase 1 limitations

- Single hand only (`numHands: 1`).
- The first model load fetches ~6 MB from Google's CDN. Subsequent loads are cached by the browser.
- Direction classification operates in the user-frame (after mirroring), so "right" in the swing log means the user swung to their right.

## Roadmap (not built yet)

- Phase 2: 3D fruit spawning with depth simulation
- Phase 3: Slash-trail rendering, hitbox intersection, slice particles
- Phase 4: Score, combo, lives, difficulty ramp, bombs, golden fruit
- Phase 5: Menus, high scores (localStorage), music, settings polish
