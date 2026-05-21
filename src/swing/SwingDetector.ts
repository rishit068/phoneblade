import {
  FilesetResolver,
  HandLandmarker,
  type HandLandmarkerResult,
} from "@mediapipe/tasks-vision";
import {
  DEFAULT_TUNING,
  type HandSample,
  type SwingDirection,
  type SwingEvent,
  type SwingTuning,
} from "./types";

const WASM_BASE =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

/** Max samples kept in the rolling buffer for path / velocity smoothing. */
const BUFFER_CAPACITY = 32;

export type DetectorState = "idle" | "active";

export interface FrameData {
  /** All hand landmarks for the first detected hand, in user-mirrored normalized coords. Empty if no hand. */
  landmarks: Array<{ x: number; y: number; z: number }>;
  tracked: HandSample | null;
  smoothedVelocity: { vx: number; vy: number; speed: number };
  state: DetectorState;
  buffer: HandSample[];
  /** Wall-clock perf time of this frame. */
  t: number;
  /** True if a hand was detected this frame. */
  handPresent: boolean;
}

type EventMap = {
  swing: SwingEvent;
  frame: FrameData;
};

type Listener<E extends keyof EventMap> = (payload: EventMap[E]) => void;

export class SwingDetector {
  private landmarker: HandLandmarker | null = null;
  private video: HTMLVideoElement | null = null;
  private rafHandle: number | null = null;
  private lastVideoTime = -1;
  private running = false;

  private tuning: SwingTuning = { ...DEFAULT_TUNING };
  private buffer: HandSample[] = [];
  private smoothedVx = 0;
  private smoothedVy = 0;
  private state: DetectorState = "idle";
  private swingStartT = 0;
  private peakSpeed = 0;
  private peakVx = 0;
  private peakVy = 0;
  private swingPath: HandSample[] = [];

  private listeners: { [E in keyof EventMap]: Set<Listener<E>> } = {
    swing: new Set(),
    frame: new Set(),
  };

  async init(): Promise<void> {
    const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
    this.landmarker = await HandLandmarker.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath: MODEL_URL,
        delegate: "GPU",
      },
      numHands: 1,
      runningMode: "VIDEO",
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
  }

  attach(video: HTMLVideoElement): void {
    this.video = video;
  }

  setTuning(partial: Partial<SwingTuning>): void {
    this.tuning = { ...this.tuning, ...partial };
  }

  getTuning(): SwingTuning {
    return this.tuning;
  }

  on<E extends keyof EventMap>(event: E, cb: Listener<E>): () => void {
    this.listeners[event].add(cb);
    return () => this.listeners[event].delete(cb);
  }

  private emit<E extends keyof EventMap>(event: E, payload: EventMap[E]): void {
    for (const cb of this.listeners[event]) cb(payload);
  }

  start(): void {
    if (this.running) return;
    if (!this.landmarker) throw new Error("SwingDetector.init() not called");
    if (!this.video) throw new Error("SwingDetector.attach(video) not called");
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

    const handLandmarks = result.landmarks?.[0];
    const handPresent = Array.isArray(handLandmarks) && handLandmarks.length > 0;

    let tracked: HandSample | null = null;
    let mirroredLandmarks: Array<{ x: number; y: number; z: number }> = [];
    if (handPresent) {
      // Mirror x so a user moving their hand to their right shows as
      // x increasing — matches what they'd see in a selfie preview.
      mirroredLandmarks = handLandmarks.map((p) => ({
        x: 1 - p.x,
        y: p.y,
        z: p.z,
      }));
      const idx = Math.min(
        Math.max(this.tuning.trackedLandmark | 0, 0),
        mirroredLandmarks.length - 1,
      );
      const lm = mirroredLandmarks[idx];
      tracked = { x: lm.x, y: lm.y, t: now };
      this.pushSample(tracked);
    } else {
      // Hand lost mid-swing — end the swing now so we don't carry stale state.
      if (this.state === "active") this.endSwing(now, "lost");
      this.buffer.length = 0;
      this.smoothedVx = 0;
      this.smoothedVy = 0;
    }

    const speed = Math.hypot(this.smoothedVx, this.smoothedVy);
    this.updateStateMachine(now, speed);

    this.emit("frame", {
      landmarks: mirroredLandmarks,
      tracked,
      smoothedVelocity: {
        vx: this.smoothedVx,
        vy: this.smoothedVy,
        speed,
      },
      state: this.state,
      buffer: this.buffer.slice(),
      t: now,
      handPresent,
    });
  };

  private pushSample(s: HandSample): void {
    const prev = this.buffer[this.buffer.length - 1];
    this.buffer.push(s);
    if (this.buffer.length > BUFFER_CAPACITY) this.buffer.shift();

    if (!prev) return;
    const dt = (s.t - prev.t) / 1000;
    if (dt <= 0) return;
    const vx = (s.x - prev.x) / dt;
    const vy = (s.y - prev.y) / dt;
    // EMA smoothing
    const a = 1 - this.tuning.velocitySmoothing;
    this.smoothedVx = this.smoothedVx * (1 - a) + vx * a;
    this.smoothedVy = this.smoothedVy * (1 - a) + vy * a;

    if (this.state === "active") {
      this.swingPath.push(s);
      const cur = Math.hypot(this.smoothedVx, this.smoothedVy);
      if (cur > this.peakSpeed) {
        this.peakSpeed = cur;
        this.peakVx = this.smoothedVx;
        this.peakVy = this.smoothedVy;
      }
    }
  }

  private updateStateMachine(now: number, speed: number): void {
    if (this.state === "idle") {
      if (speed >= this.tuning.enterThreshold) {
        this.state = "active";
        this.swingStartT = now;
        this.peakSpeed = speed;
        this.peakVx = this.smoothedVx;
        this.peakVy = this.smoothedVy;
        this.swingPath = this.buffer.slice(-4); // include lead-in samples
      }
      return;
    }

    // Active
    const dur = now - this.swingStartT;
    if (dur > this.tuning.maxDurationMs) {
      this.endSwing(now, "timeout");
      return;
    }
    if (speed <= this.tuning.exitThreshold) {
      this.endSwing(now, "exit");
    }
  }

  private endSwing(now: number, _reason: "exit" | "timeout" | "lost"): void {
    const dur = now - this.swingStartT;
    const path = this.swingPath;
    this.state = "idle";
    this.swingPath = [];

    if (dur < this.tuning.minDurationMs) return;
    if (this.peakSpeed < this.tuning.enterThreshold) return;

    const direction = classifyDirection(this.peakVx, this.peakVy);
    const intensity = Math.max(
      0,
      Math.min(1, this.peakSpeed / Math.max(0.001, this.tuning.intensityCeiling)),
    );

    const event: SwingEvent = {
      detected: true,
      direction,
      intensity,
      timestamp: now,
      durationMs: dur,
      path: path.map((p) => ({ x: p.x, y: p.y, t: p.t })),
    };
    this.emit("swing", event);
  }
}

function classifyDirection(vx: number, vy: number): SwingDirection {
  // Image-space y grows downward.
  const angle = (Math.atan2(vy, vx) * 180) / Math.PI;
  // Normalize to [-180, 180); bucket into 8 sectors of 45deg.
  const a = ((angle + 360) % 360);
  if (a < 22.5 || a >= 337.5) return "right";
  if (a < 67.5) return "down-right";
  if (a < 112.5) return "down";
  if (a < 157.5) return "down-left";
  if (a < 202.5) return "left";
  if (a < 247.5) return "up-left";
  if (a < 292.5) return "up";
  return "up-right";
}
