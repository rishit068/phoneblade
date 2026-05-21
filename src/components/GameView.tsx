import { useEffect, useRef, useState } from "react";
import { GameScene, type FrameStats } from "../game/Scene";
import { DEFAULT_GAME_TUNING, type GameTuning } from "../game/types";
import { SwingDetector, type FrameData } from "../swing/SwingDetector";
import type { SwingEvent } from "../swing/types";
import { SoundEngine } from "../game/sound";
import { useTuning } from "../store/tuning";

type Status =
  | { kind: "idle" }
  | { kind: "loading"; msg: string }
  | { kind: "ready" }
  | { kind: "error"; msg: string };

const BURST_LIFE_MS = 380;
const LIVE_TRAIL_TAIL = 14; // recent samples drawn for the in-progress swing

interface Point {
  x: number;
  y: number;
}

interface Burst {
  /** performance.now() when emitted */
  at: number;
  pathPixels: Point[];
  intensity: number;
}

export function GameView() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const glCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<GameScene | null>(null);
  const detectorRef = useRef<SwingDetector | null>(null);
  const soundRef = useRef<SoundEngine>(new SoundEngine());
  const rafRef = useRef<number | null>(null);
  const statsRef = useRef<FrameStats>({
    fruitCount: 0,
    shardCount: 0,
    hitboxes: [],
  });
  const liveFrameRef = useRef<FrameData | null>(null);
  const burstRef = useRef<Burst | null>(null);
  const tuningRef = useRef<GameTuning>(DEFAULT_GAME_TUNING);
  const swingTuning = useTuning();
  const swingTuningRef = useRef(swingTuning);
  swingTuningRef.current = swingTuning;
  const cleanupRef = useRef<(() => void) | null>(null);
  const lastUiUpdateRef = useRef<number>(0);

  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [tuning, setTuning] = useState<GameTuning>(DEFAULT_GAME_TUNING);
  const [hud, setHud] = useState({ fruit: 0, shards: 0, sliced: 0 });
  const slicedTotalRef = useRef(0);

  useEffect(() => {
    tuningRef.current = tuning;
    sceneRef.current?.setTuning(tuning);
  }, [tuning]);

  // Live-push swing thresholds into the detector.
  useEffect(() => {
    const d = detectorRef.current;
    if (!d) return;
    d.setTuning({
      enterThreshold: swingTuning.enterThreshold,
      exitThreshold: swingTuning.exitThreshold,
      minDurationMs: swingTuning.minDurationMs,
      maxDurationMs: swingTuning.maxDurationMs,
      velocitySmoothing: swingTuning.velocitySmoothing,
      intensityCeiling: swingTuning.intensityCeiling,
      trackedLandmark: swingTuning.trackedLandmark,
    });
  }, [
    swingTuning.enterThreshold,
    swingTuning.exitThreshold,
    swingTuning.minDurationMs,
    swingTuning.maxDurationMs,
    swingTuning.velocitySmoothing,
    swingTuning.intensityCeiling,
    swingTuning.trackedLandmark,
  ]);

  const start = async () => {
    if (status.kind === "loading" || status.kind === "ready") return;
    // User gesture — prime audio.
    soundRef.current.prime();
    setStatus({ kind: "loading", msg: "Requesting camera…" });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: false,
      });
      const video = videoRef.current;
      const glCanvas = glCanvasRef.current;
      if (!video || !glCanvas) throw new Error("Canvas/video not mounted");
      video.srcObject = stream;
      await video.play();

      setStatus({ kind: "loading", msg: "Loading hand model…" });
      const detector = new SwingDetector();
      detector.setTuning(swingTuningRef.current);
      await detector.init();
      detector.attach(video);
      detector.on("frame", (f) => {
        liveFrameRef.current = f;
      });
      detector.on("swing", (ev) => onSwing(ev));
      detector.start();
      detectorRef.current = detector;

      const scene = new GameScene(glCanvas, tuningRef.current);
      sceneRef.current = scene;

      const resize = () => {
        const rect = glCanvas.getBoundingClientRect();
        scene.resize(rect.width, rect.height);
        const overlay = overlayRef.current;
        if (overlay) {
          overlay.width = Math.floor(rect.width * devicePixelRatio);
          overlay.height = Math.floor(rect.height * devicePixelRatio);
        }
      };
      resize();
      window.addEventListener("resize", resize);
      cleanupRef.current = () => window.removeEventListener("resize", resize);

      setStatus({ kind: "ready" });

      const loop = (nowMs: number) => {
        const s = sceneRef.current;
        if (!s) return;
        const stats = s.step(nowMs);
        statsRef.current = stats;
        s.render();
        drawOverlay(nowMs, stats);
        if (nowMs - lastUiUpdateRef.current > 200) {
          lastUiUpdateRef.current = nowMs;
          setHud({
            fruit: stats.fruitCount,
            shards: stats.shardCount,
            sliced: slicedTotalRef.current,
          });
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus({ kind: "error", msg });
    }
  };

  const onSwing = (ev: SwingEvent) => {
    const overlay = overlayRef.current;
    const scene = sceneRef.current;
    if (!overlay || !scene) return;
    const w = overlay.width / devicePixelRatio;
    const h = overlay.height / devicePixelRatio;
    const pathPixels: Point[] = ev.path.map((p) => ({
      x: p.x * w,
      y: p.y * h,
    }));
    burstRef.current = {
      at: performance.now(),
      pathPixels,
      intensity: ev.intensity,
    };
    soundRef.current.playSwing(ev.intensity);
    const hits = scene.attemptSlice(pathPixels, ev.intensity);
    if (hits.length > 0) {
      slicedTotalRef.current += hits.length;
      // Slight pitch variation per hit for chord-y feel on combos.
      hits.forEach((_, i) => soundRef.current.playSlice(1 + i * 0.07));
    }
  };

  const drawOverlay = (nowMs: number, stats: FrameStats) => {
    const canvas = overlayRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = devicePixelRatio;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1) Live trail while a swing is in progress.
    const frame = liveFrameRef.current;
    if (frame && frame.state === "active" && frame.buffer.length >= 2) {
      const tail = frame.buffer.slice(-LIVE_TRAIL_TAIL);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
      ctx.lineWidth = 6 * dpr;
      ctx.beginPath();
      for (let i = 0; i < tail.length; i++) {
        const x = tail[i].x * canvas.width;
        const y = tail[i].y * canvas.height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.strokeStyle = "rgba(150, 220, 255, 0.45)";
      ctx.lineWidth = 14 * dpr;
      ctx.stroke();
    }

    // 2) Burst trail for ~380ms after a swing emits.
    const burst = burstRef.current;
    if (burst) {
      const age = nowMs - burst.at;
      if (age >= BURST_LIFE_MS) {
        burstRef.current = null;
      } else {
        const t = age / BURST_LIFE_MS;
        const fade = 1 - t;
        const baseWidth = (10 + burst.intensity * 22) * dpr;
        // Tapered: stroke 3 layers — wide cyan glow, mid white, thin core.
        strokeTaperedPolyline(
          ctx,
          burst.pathPixels.map((p) => ({ x: p.x * dpr, y: p.y * dpr })),
          baseWidth * 1.6,
          `rgba(140, 220, 255, ${(0.45 * fade).toFixed(3)})`,
        );
        strokeTaperedPolyline(
          ctx,
          burst.pathPixels.map((p) => ({ x: p.x * dpr, y: p.y * dpr })),
          baseWidth,
          `rgba(255, 255, 255, ${(0.85 * fade).toFixed(3)})`,
        );
        strokeTaperedPolyline(
          ctx,
          burst.pathPixels.map((p) => ({ x: p.x * dpr, y: p.y * dpr })),
          baseWidth * 0.45,
          `rgba(255, 255, 255, ${(1.0 * fade).toFixed(3)})`,
        );
      }
    }

    // 3) Hitbox debug overlay.
    if (tuningRef.current.showHitboxes) {
      ctx.lineWidth = 2 * dpr;
      ctx.strokeStyle = "rgba(255, 235, 120, 0.9)";
      ctx.font = `${12 * dpr}px ui-monospace, Menlo, monospace`;
      ctx.fillStyle = "rgba(255, 235, 120, 0.9)";
      for (const h of stats.hitboxes) {
        const cx = h.box.cx * dpr;
        const cy = h.box.cy * dpr;
        const r = h.box.r * dpr;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillText(`${h.kind} #${h.id}`, cx + r + 4, cy);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      cleanupRef.current?.();
      detectorRef.current?.dispose();
      detectorRef.current = null;
      sceneRef.current?.dispose();
      sceneRef.current = null;
      const v = videoRef.current;
      const stream = v?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div style={styles.root}>
      <video ref={videoRef} style={styles.video} playsInline muted />
      <canvas ref={glCanvasRef} style={styles.canvas} />
      <canvas ref={overlayRef} style={styles.canvas} />

      {status.kind !== "ready" && (
        <div style={styles.overlay}>
          <h1 style={{ margin: 0, fontSize: 22 }}>PhoneBlade — Phase 3</h1>
          <p style={{ opacity: 0.85, maxWidth: 480, textAlign: "center" }}>
            Swing your hand across fruit to slice it. The live trail tracks
            your hand mid-swing; the bright burst marks the completed slash.
            Score and lives come in Phase 4.
          </p>
          {status.kind === "loading" && <p>{status.msg}</p>}
          {status.kind === "error" && (
            <p style={{ color: "#ff8d8d" }}>Error: {status.msg}</p>
          )}
          {(status.kind === "idle" || status.kind === "error") && (
            <button style={styles.startBtn} onClick={start}>
              Start
            </button>
          )}
        </div>
      )}

      <div style={styles.hud}>
        <div>
          sliced: <b>{hud.sliced}</b>
        </div>
        <div style={styles.dim}>
          fruit: {hud.fruit} · shards: {hud.shards}
        </div>
        <hr style={styles.sep} />
        <label style={styles.row}>
          <span>spawn / sec</span>
          <input
            type="range"
            min={0.2}
            max={4}
            step={0.1}
            value={tuning.spawnRate}
            onChange={(e) =>
              setTuning((t) => ({ ...t, spawnRate: parseFloat(e.target.value) }))
            }
          />
          <span style={styles.val}>{tuning.spawnRate.toFixed(1)}</span>
        </label>
        <label style={styles.row}>
          <span>gravity</span>
          <input
            type="range"
            min={2}
            max={14}
            step={0.5}
            value={tuning.gravity}
            onChange={(e) =>
              setTuning((t) => ({ ...t, gravity: parseFloat(e.target.value) }))
            }
          />
          <span style={styles.val}>{tuning.gravity.toFixed(1)}</span>
        </label>
        <label style={styles.checkRow}>
          <input
            type="checkbox"
            checked={tuning.showHitboxes}
            onChange={(e) =>
              setTuning((t) => ({ ...t, showHitboxes: e.target.checked }))
            }
          />
          show hitboxes
        </label>
        <button
          style={styles.reroll}
          onClick={() =>
            setTuning((t) => ({ ...t, seed: (Math.random() * 0xffffffff) >>> 0 }))
          }
        >
          reroll seed
        </button>
        <div style={styles.dim}>seed: {tuning.seed.toString(16)}</div>
        <hr style={styles.sep} />
        <div style={styles.dim}>
          Tune <i>swing</i> thresholds on the Debug tab — they persist here.
        </div>
      </div>
    </div>
  );
}

function strokeTaperedPolyline(
  ctx: CanvasRenderingContext2D,
  pts: Point[],
  baseWidth: number,
  color: string,
) {
  if (pts.length < 2) return;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = color;
  // We stroke per-segment with a width that tapers from baseWidth (oldest)
  // to baseWidth*1.1 (newest) — newer is slightly fatter, suggesting follow-through.
  for (let i = 1; i < pts.length; i++) {
    const t = i / (pts.length - 1);
    ctx.lineWidth = baseWidth * (0.35 + 0.75 * t);
    ctx.beginPath();
    ctx.moveTo(pts[i - 1].x, pts[i - 1].y);
    ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
  }
}

const styles = {
  root: {
    position: "relative",
    width: "100%",
    height: "100%",
    background: "#000",
    overflow: "hidden",
  } as React.CSSProperties,
  video: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transform: "scaleX(-1)",
  } as React.CSSProperties,
  canvas: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    pointerEvents: "none",
  } as React.CSSProperties,
  overlay: {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    background: "rgba(0,0,0,0.55)",
    padding: 24,
  } as React.CSSProperties,
  startBtn: {
    background: "#7af0c8",
    color: "#0b0d10",
    border: 0,
    padding: "10px 22px",
    fontSize: 16,
    fontWeight: 600,
    borderRadius: 8,
    cursor: "pointer",
  } as React.CSSProperties,
  hud: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 260,
    padding: 12,
    background: "rgba(11,13,16,0.78)",
    borderRadius: 8,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    fontSize: 13,
    fontFamily: "ui-monospace, Menlo, monospace",
  } as React.CSSProperties,
  row: {
    display: "grid",
    gridTemplateColumns: "1fr 90px 32px",
    alignItems: "center",
    gap: 6,
  } as React.CSSProperties,
  checkRow: {
    display: "flex",
    gap: 6,
    alignItems: "center",
  } as React.CSSProperties,
  val: {
    textAlign: "right",
    opacity: 0.85,
  } as React.CSSProperties,
  reroll: {
    background: "transparent",
    color: "#cfd6df",
    border: "1px solid #2c3542",
    borderRadius: 6,
    padding: "4px 8px",
    cursor: "pointer",
    fontSize: 12,
  } as React.CSSProperties,
  sep: {
    border: 0,
    borderTop: "1px solid #2c3542",
    margin: "4px 0",
    width: "100%",
  } as React.CSSProperties,
  dim: {
    opacity: 0.55,
    fontSize: 11,
  } as React.CSSProperties,
};
