export interface Point2 {
  x: number;
  y: number;
}

export type Handedness = "Left" | "Right";

export interface FistState {
  detected: boolean;
  /** Palm centroid in user-mirrored normalized coords [0..1]. */
  fistPosition: Point2;
  /** 0..1 proxy for "how close" — derived from hand bbox area vs frame area. */
  fistDepth: number;
  /** Detected as a closed fist (>= FIST_CURL_THRESHOLD fingers curled). */
  isFist: boolean;
  /** MediaPipe handedness score (0..1). */
  confidence: number;
  /** Velocity in normalized units / sec, averaged over the last few samples. */
  velocity: Point2;
  /** Bounding box of the tracked hand in user-mirrored normalized coords. */
  handBounds: { minX: number; minY: number; maxX: number; maxY: number };
  handedness: Handedness | null;
  /** All 21 landmarks for visualization. */
  landmarks: Array<{ x: number; y: number; z: number }>;
  /** Per-frame perf time (ms). */
  t: number;
  /** Number of fingers detected as curled (0..5). */
  curledFingers: number;
}

export interface FistTuning {
  /** EMA smoothing for the fist position. 0 = raw, 1 = frozen. */
  positionSmoothing: number;
  /** Curl ratio below which a finger is considered curled. */
  curlRatioThreshold: number;
  /** Min curled-finger count to classify as a fist. */
  fistCurlCount: number;
  /** Min handedness confidence to accept a hand at all. */
  minConfidence: number;
  /** How many frames to average velocity over (>=2). */
  velocitySamples: number;
}

export const DEFAULT_FIST_TUNING: FistTuning = {
  positionSmoothing: 0.45,
  curlRatioThreshold: 1.55,
  fistCurlCount: 3,
  minConfidence: 0.55,
  velocitySamples: 3,
};

export const EMPTY_FIST_STATE: FistState = {
  detected: false,
  fistPosition: { x: 0.5, y: 0.5 },
  fistDepth: 0,
  isFist: false,
  confidence: 0,
  velocity: { x: 0, y: 0 },
  handBounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
  handedness: null,
  landmarks: [],
  t: 0,
  curledFingers: 0,
};
