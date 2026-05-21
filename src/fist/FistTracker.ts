import {
  FilesetResolver,
  HandLandmarker,
  type HandLandmarkerResult,
} from "@mediapipe/tasks-vision";
import {
  DEFAULT_FIST_TUNING,
  type FistState,
  type FistTuning,
  type Handedness,
  EMPTY_FIST_STATE,
} from "./types";

const WASM_BASE =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

/** Landmark index constants for the 21 MediaPipe hand landmarks. */
const WRIST = 0;
const THUMB_MCP = 2;
const THUMB_IP = 3;
const THUMB_TIP = 4;
const FINGER_LANDMARKS: Array<{ tip: number; pip: number; mcp: number }> = [
  // index
  { tip: 8, pip: 6, mcp: 5 },
  // middle
  { tip: 12, pip: 10, mcp: 9 },
  // ring
  { tip: 16, pip: 14, mcp: 13 },
  // pinky
  { tip: 20, pip: 18, mcp: 17 },
];
const PALM_LANDMARKS = [0, 5, 9, 13, 17];

type Listener = (s: FistState) => void;

export class FistTracker {
  private landmarker: HandLandmarker | null = null;
  private video: HTMLVideoElement | null = null;
  private rafHandle: number | null = null;
  private lastVideoTime = -1;
  private running = false;

  private tuning: FistTuning = { ...DEFAULT_FIST_TUNING };

  // Smoothed fist position (EMA).
  private smoothedX = 0.5;
  private smoothedY = 0.5;
  private hasSmoothed = false;

  // Recent samples for velocity (capacity = velocitySamples).
  private samples: Array<{ x: number; y: number; t: number }> = [];

  private listeners = new Set<Listener>();

  async init(): Promise<void> {
    const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
    this.landmarker = await HandLandmarker.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath: MODEL_URL,
        delegate: "GPU",
      },
      // Track up to 2 hands so we can pick the largest each frame.
      numHands: 2,
      runningMode: "VIDEO",
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
  }

  attach(video: HTMLVideoElement): void {
    this.video = video;
  }

  setTuning(partial: Partial<FistTuning>): void {
    this.tuning = { ...this.tuning, ...partial };
  }

  getTuning(): FistTuning {
    return this.tuning;
  }

  onState(cb: Listener): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  start(): void {
    if (this.running) return;
    if (!this.landmarker) throw new Error("FistTracker.init() not called");
    if (!this.video) throw new Error("FistTracker.attach(video) not called");
    this.running = true;
    this.loop();
  }

  stop(): void {
    this.running = false;
    if (this.rafHandle != null) {
      cancelAnimationFrame(this.rafHandle);
      this.rafHandle = null;
    }
  }

  dispose(): void {
    this.stop();
    this.landmarker?.close();
    this.landmarker = null;
    this.video = null;
  }

  private loop = (): void => {
    if (!this.running) return;
    this.rafHandle = requestAnimationFrame(this.loop);
    const video = this.video;
    const landmarker = this.landmarker;
    if (!video || !landmarker) return;
    if (video.readyState < 2) return;
    if (video.currentTime === this.lastVideoTime) return;
    this.lastVideoTime = video.currentTime;

    const now = performance.now();
    let result: HandLandmarkerResult;
    try {
      result = landmarker.detectForVideo(video, now);
    } catch {
      return;
    }
    const state = this.buildState(result, now);
    this.emit(state);
  };

  private buildState(result: HandLandmarkerResult, t: number): FistState {
    const lists = result.landmarks ?? [];
    if (lists.length === 0) {
      this.samples.length = 0;
      this.hasSmoothed = false;
      return { ...EMPTY_FIST_STATE, t };
    }

    // Pick the largest hand (largest bbox area), subject to confidence floor.
    let bestIdx = -1;
    let bestArea = 0;
    for (let i = 0; i < lists.length; i++) {
      const hd = result.handednesses?.[i]?.[0];
      const conf = hd?.score ?? 1;
      if (conf < this.tuning.minConfidence) continue;
      const lm = lists[i];
      const bb = bbox(lm);
      const area = (bb.maxX - bb.minX) * (bb.maxY - bb.minY);
      if (area > bestArea) {
        bestArea = area;
        bestIdx = i;
      }
    }
    if (bestIdx < 0) {
      this.samples.length = 0;
      this.hasSmoothed = false;
      return { ...EMPTY_FIST_STATE, t };
    }

    const rawLandmarks = lists[bestIdx];
    // Mirror x so the user's right becomes screen-right.
    const lm = rawLandmarks.map((p) => ({ x: 1 - p.x, y: p.y, z: p.z }));
    const hd = result.handednesses?.[bestIdx]?.[0];
    const confidence = hd?.score ?? 0;
    // Handedness comes from the mirrored MediaPipe model perspective, so a
    // detected "Right" in mirrored coords corresponds to the user's right hand.
    const handedness: Handedness | null =
      hd?.categoryName === "Left" || hd?.categoryName === "Right"
        ? (hd.categoryName as Handedness)
        : null;

    const handBounds = bbox(lm);
    const fistDepth = Math.min(
      1,
      ((handBounds.maxX - handBounds.minX) * (handBounds.maxY - handBounds.minY)) / 0.18,
    );

    // Palm centroid for stable fist position.
    let cx = 0;
    let cy = 0;
    for (const i of PALM_LANDMARKS) {
      cx += lm[i].x;
      cy += lm[i].y;
    }
    cx /= PALM_LANDMARKS.length;
    cy /= PALM_LANDMARKS.length;

    // EMA smoothing.
    const a = 1 - this.tuning.positionSmoothing;
    if (!this.hasSmoothed) {
      this.smoothedX = cx;
      this.smoothedY = cy;
      this.hasSmoothed = true;
    } else {
      this.smoothedX = this.smoothedX * (1 - a) + cx * a;
      this.smoothedY = this.smoothedY * (1 - a) + cy * a;
    }
    const fistPosition = { x: this.smoothedX, y: this.smoothedY };

    // Velocity: backward diff across last N samples.
    this.samples.push({ x: fistPosition.x, y: fistPosition.y, t });
    while (this.samples.length > Math.max(2, this.tuning.velocitySamples)) {
      this.samples.shift();
    }
    let vx = 0;
    let vy = 0;
    if (this.samples.length >= 2) {
      const first = this.samples[0];
      const last = this.samples[this.samples.length - 1];
      const dt = (last.t - first.t) / 1000;
      if (dt > 0) {
        vx = (last.x - first.x) / dt;
        vy = (last.y - first.y) / dt;
      }
    }

    // Curl classification.
    const wrist = lm[WRIST];
    let curledCount = 0;
    for (const f of FINGER_LANDMARKS) {
      const tip = lm[f.tip];
      const pip = lm[f.pip];
      const mcp = lm[f.mcp];
      const tipToMcp = dist3(tip, mcp);
      const pipToMcp = dist3(pip, mcp);
      const ratio = pipToMcp > 0.001 ? tipToMcp / pipToMcp : 0;
      if (ratio < this.tuning.curlRatioThreshold) curledCount++;
    }
    // Thumb: compare thumb tip distance from wrist relative to thumb MCP→IP
    // distance — curled when tip is close to the rest of the hand.
    const thumbTip = lm[THUMB_TIP];
    const thumbIp = lm[THUMB_IP];
    const thumbMcp = lm[THUMB_MCP];
    const thumbExt = dist3(thumbTip, wrist) / Math.max(0.001, dist3(thumbMcp, wrist));
    const thumbFold = dist3(thumbTip, thumbMcp) / Math.max(0.001, dist3(thumbIp, thumbMcp));
    if (thumbExt < 1.45 && thumbFold < 1.55) curledCount++;

    const isFist = curledCount >= this.tuning.fistCurlCount;

    return {
      detected: true,
      fistPosition,
      fistDepth,
      isFist,
      confidence,
      velocity: { x: vx, y: vy },
      handBounds,
      handedness,
      landmarks: lm,
      t,
      curledFingers: curledCount,
    };
  }

  private emit(state: FistState): void {
    for (const cb of this.listeners) cb(state);
  }
}

function bbox(
  lm: Array<{ x: number; y: number }>,
): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of lm) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

function dist3(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
