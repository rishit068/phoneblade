# Sensor Tuning

PhoneBlade's swing detector turns a stream of webcam hand-landmark positions into discrete swing events. Tuning these thresholds is the single biggest factor in how the game feels. Everything here is **live-editable** from the sidebar of the Phase 1 debug screen; values are persisted to `localStorage` under `phoneblade.tuning.v1`.

## Units

- **Coordinates** are normalized image space, `[0, 1]` for both x and y. (0, 0) is top-left, (1, 1) is bottom-right.
- **Speed** is in those normalized units **per second**. A speed of `1.0` means the tracked landmark crosses the full width (or height) of the camera in one second.
- **Durations** are milliseconds.

## Parameters

| Param | Default | Range | What it does |
|---|---|---|---|
| `enterThreshold` | `1.8` | 0.2–6 | Smoothed speed required to **start** a swing. Lower = more sensitive. |
| `exitThreshold` | `0.7` | 0.05–4 | Speed below which an active swing **ends**. Should be < `enterThreshold` (hysteresis). |
| `minDurationMs` | `80` | 20–400 | Swings shorter than this are discarded (filters jitter / accidental flicks). |
| `maxDurationMs` | `900` | 200–2000 | Swings longer than this auto-end (filters slow drags being treated as one giant swing). |
| `velocitySmoothing` | `0.35` | 0–0.9 | EMA factor applied to the velocity vector. Higher = smoother but laggier. 0 = raw frame-to-frame, very twitchy. |
| `intensityCeiling` | `5.0` | 1–12 | The peak speed that maps to `intensity = 1.0`. Anything faster also reads as 1.0. |
| `trackedLandmark` | `9` | 0–20 | Which of the 21 MediaPipe hand landmarks to track. `0` = wrist, `9` = middle MCP knuckle (recommended — most stable), `12` = middle fingertip (most expressive, more jittery). |

## How to tune for your setup

1. **Start with defaults.** Open the debug screen, click **Start**, and just watch the readout while making natural slicing motions.
2. **Calibrate the floor.** If small natural movements (e.g. shifting your hand at rest) are triggering swings, raise `enterThreshold` by ~0.2 at a time until they stop. If genuine swings aren't registering, lower it.
3. **Calibrate the release.** If a single swing is being reported as 2–3 micro-swings, raise `exitThreshold` (toward, but below, `enterThreshold`).
4. **Filter junk.** If you see swings logged with durations under ~60ms, raise `minDurationMs`. If long sweeping motions get cut off, raise `maxDurationMs`.
5. **Set the intensity feel.** Make a few maximum-effort swings and look at their `int %` in the log. If you can only ever hit ~40%, lower `intensityCeiling` so a hard swing reads near 100%.
6. **Pick a landmark.** Swap `trackedLandmark` to `12` (middle fingertip) if you want twitchier, more expressive swings. Stay on `9` for clean and stable. `0` (wrist) is most stable but feels disconnected because your wrist barely moves when you flick from the elbow.

## Why these defaults

- **`enterThreshold: 1.8`** — corresponds to roughly the speed of a deliberate but not maximum-effort slice across half the camera frame in ~0.3s. Sensitive enough for casual play, not so sensitive that picking up a coffee triggers a slice.
- **`exitThreshold: 0.7`** — well below enter, but above the residual smoothed velocity after a swing finishes, which would otherwise cause the swing to "ring" and re-trigger.
- **`velocitySmoothing: 0.35`** — 65% weight on the new frame's velocity, 35% on the EMA. Just enough to suppress single-frame noise without adding visible lag.
- **`minDurationMs: 80`** — covers ~2–3 frames at 30fps. Below this, you're almost certainly looking at landmark jitter, not a real swing.

## Cross-machine notes

Webcam frame rates vary (15–60 fps). A faster camera means more samples per swing and slightly higher measured peak speeds, so you may want a marginally higher `enterThreshold` on a 60fps webcam vs. a 15fps one. Lighting affects landmark stability — in dim rooms you may want more `velocitySmoothing`.

## Where this lives in code

- Default values: [`src/swing/types.ts`](src/swing/types.ts) — `DEFAULT_TUNING`
- Live store: [`src/store/tuning.ts`](src/store/tuning.ts) — `useTuning`
- Consumer: [`src/swing/SwingDetector.ts`](src/swing/SwingDetector.ts) — reads `this.tuning` per-frame
- UI: [`src/components/DebugScreen.tsx`](src/components/DebugScreen.tsx) — sliders
