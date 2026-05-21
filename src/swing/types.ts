export type SwingDirection =
  | "left"
  | "right"
  | "up"
  | "down"
  | "up-left"
  | "up-right"
  | "down-left"
  | "down-right";

export interface SwingEvent {
  detected: true;
  direction: SwingDirection;
  /** 0..1 normalized peak intensity */
  intensity: number;
  /** performance.now() timestamp (ms) of the swing peak */
  timestamp: number;
  /** Duration of the swing in ms */
  durationMs: number;
  /** Path in normalized image coords [0..1], oldest to newest */
  path: Array<{ x: number; y: number; t: number }>;
}

export interface SwingTuning {
  /** Peak speed (normalized image units per second) above which a swing begins */
  enterThreshold: number;
  /** Speed at which an active swing is considered ended */
  exitThreshold: number;
  /** Reject swings shorter than this (ms) — filters jitter / taps */
  minDurationMs: number;
  /** Reject swings longer than this (ms) — filters slow drags */
  maxDurationMs: number;
  /** EMA smoothing factor for velocity. 0 = no smoothing, 1 = frozen */
  velocitySmoothing: number;
  /** Speed that maps to intensity = 1.0 */
  intensityCeiling: number;
  /** Which hand landmark to track (0 = wrist, 9 = middle MCP knuckle) */
  trackedLandmark: number;
}

export const DEFAULT_TUNING: SwingTuning = {
  enterThreshold: 1.8,
  exitThreshold: 0.7,
  minDurationMs: 80,
  maxDurationMs: 900,
  velocitySmoothing: 0.35,
  intensityCeiling: 5.0,
  trackedLandmark: 9,
};

export interface HandSample {
  x: number;
  y: number;
  t: number;
}
