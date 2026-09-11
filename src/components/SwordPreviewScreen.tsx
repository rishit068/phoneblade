import { useEffect, useRef, useState } from "react";
import { FistTracker } from "../fist/FistTracker";
import { EMPTY_FIST_STATE, type FistState } from "../fist/types";
import {
  DEFAULT_SWORD_TUNING,
  SwordRenderer,
  type SwordTuning,
} from "../sword/SwordRenderer";

type Status =
  | { kind: "idle" }
  | { kind: "loading"; msg: string }
  | { kind: "ready" }
  | { kind: "error"; msg: string };

export function SwordPreviewScreen() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const trackerRef = useRef<FistTracker | null>(null);
  const swordRef = useRef<SwordRenderer>(new SwordRenderer());
  const stateRef = useRef<FistState>(EMPTY_FIST_STATE);
  const rafRef = useRef<number | null>(null);

  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [tuning, setTuning] = useState<SwordTuning>(DEFAULT_SWORD_TUNING);
  const [showHand, setShowHand] = useState(false);

  useEffect(() => {
    swordRef.current.setTuning(tuning);
  }, [tuning]);

  const start = async () => {
    if (status.kind === "loading" || status.kind === "ready") return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus({
        kind: "error",
        msg: "Camera access requires a secure context. Please open http://localhost:5173 in your browser instead of using the network IP.",
      });
      return;
    }
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
      if (!video) throw new Error("Video not mounted");
      video.srcObject = stream;
      await video.play();

      setStatus({ kind: "loading", msg: "Loading hand model…" });
      const tracker = new FistTracker();
      await tracker.init();
      tracker.attach(video);
      tracker.onState((s) => {
        stateRef.current = s;
      });
      tracker.start();
      trackerRef.current = tracker;
      swordRef.current.setTuning(tuning);
      setStatus({ kind: "ready" });

      const loop = (nowMs: number) => {
        draw(nowMs);
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus({ kind: "error", msg });
    }
  };

  const draw = (nowMs: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const w = (canvas.width = Math.floor(rect.width * devicePixelRatio));
    const h = (canvas.height = Math.floor(rect.height * devicePixelRatio));
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);

    const s = stateRef.current;

    // Optional hand skeleton (faint)
    if (showHand && s.detected) {
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 1.5 * devicePixelRatio;
      for (const lm of s.landmarks) {
        ctx.beginPath();
        ctx.arc(lm.x * w, lm.y * h, 2 * devicePixelRatio, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    const geom = swordRef.current.computeBlade(
      s,
      rect.width,
      rect.height,
      nowMs,
    );
    swordRef.current.draw(ctx, geom, nowMs, devicePixelRatio);

    // Tiny status pill so the user knows whether the fist is detected.
    if (s.detected) {
      ctx.font = `${11 * devicePixelRatio}px ui-monospace, Menlo, monospace`;
      ctx.fillStyle = s.isFist
        ? "rgba(255,180,90,0.95)"
        : "rgba(150,220,255,0.95)";
      ctx.fillText(
        s.isFist ? "FIST — sword active" : "OPEN — sword off",
        12 * devicePixelRatio,
        24 * devicePixelRatio,
      );
    }
  };

  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      trackerRef.current?.dispose();
      trackerRef.current = null;
      const v = videoRef.current;
      const stream = v?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div style={styles.root}>
      <div style={styles.stage}>
        <video ref={videoRef} style={styles.video} playsInline muted />
        <canvas ref={canvasRef} style={styles.canvas} />
        {status.kind !== "ready" && (
          <div style={styles.overlay}>
            <h1 style={{ margin: 0, fontSize: 22 }}>PhoneBlade — Sword Preview</h1>
            <p style={{ opacity: 0.85, maxWidth: 480, textAlign: "center" }}>
              Visual-only step. Make a fist to summon the blade, open your hand
              to dismiss it. Tune the look in the sidebar — slicing comes in
              Step 3.
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
      </div>

      <aside style={styles.sidebar}>
        <h2 style={styles.h2}>Blade</h2>
        <Slider
          label="Blade length (% screen)"
          help="Fraction of viewport height the blade extends."
          value={tuning.bladeLengthFrac}
          min={0.1}
          max={0.8}
          step={0.02}
          onChange={(v) => setTuning((t) => ({ ...t, bladeLengthFrac: v }))}
          fmt={(v) => `${(v * 100).toFixed(0)}%`}
        />
        <Slider
          label="Core thickness (px)"
          help="Stroke width of the sharp inner line. Glow layers scale off this."
          value={tuning.coreThickness}
          min={1}
          max={10}
          step={0.5}
          onChange={(v) => setTuning((t) => ({ ...t, coreThickness: v }))}
        />
        <Slider
          label="Glow intensity"
          help="Multiplier on all glow alphas. 0 = invisible, 2 = blown out."
          value={tuning.glowIntensity}
          min={0}
          max={2}
          step={0.05}
          onChange={(v) => setTuning((t) => ({ ...t, glowIntensity: v }))}
        />

        <h2 style={styles.h2}>Motion</h2>
        <Slider
          label="Velocity-align threshold"
          help="Speed (norm/sec) above which the blade locks to velocity. Below = eases to hand orientation."
          value={tuning.velocityAlignThreshold}
          min={0.05}
          max={1.5}
          step={0.05}
          onChange={(v) => setTuning((t) => ({ ...t, velocityAlignThreshold: v }))}
        />
        <Slider
          label="Direction smoothing"
          help="EMA on blade direction. Higher = smoother but laggier."
          value={tuning.directionSmoothing}
          min={0}
          max={0.95}
          step={0.05}
          onChange={(v) => setTuning((t) => ({ ...t, directionSmoothing: v }))}
        />
        <Slider
          label="Trail length (ms)"
          help="Afterimage duration. 0 disables the trail."
          value={tuning.trailMs}
          min={0}
          max={250}
          step={5}
          onChange={(v) => setTuning((t) => ({ ...t, trailMs: v }))}
          fmt={(v) => v.toFixed(0)}
        />

        <h2 style={styles.h2}>Idle feel</h2>
        <Slider
          label="Tip wobble"
          help="Sinusoidal tip jitter when stationary. Fades out as you move."
          value={tuning.wobble}
          min={0}
          max={0.04}
          step={0.002}
          onChange={(v) => setTuning((t) => ({ ...t, wobble: v }))}
        />
        <Slider
          label="Glow pulse"
          help="Sinusoidal glow modulation. 0 = steady."
          value={tuning.pulse}
          min={0}
          max={0.4}
          step={0.02}
          onChange={(v) => setTuning((t) => ({ ...t, pulse: v }))}
        />

        <h2 style={styles.h2}>Debug</h2>
        <label style={styles.checkRow}>
          <input
            type="checkbox"
            checked={showHand}
            onChange={(e) => setShowHand(e.target.checked)}
          />
          show hand landmarks
        </label>
        <button
          style={styles.resetBtn}
          onClick={() => setTuning(DEFAULT_SWORD_TUNING)}
        >
          Reset to defaults
        </button>
      </aside>
    </div>
  );
}

function Slider({
  label,
  help,
  value,
  min,
  max,
  step,
  onChange,
  fmt,
}: {
  label: string;
  help: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  fmt?: (v: number) => string;
}) {
  return (
    <label style={styles.slider}>
      <div style={styles.sliderHead}>
        <span>{label}</span>
        <span style={styles.sliderVal}>
          {fmt ? fmt(value) : value.toFixed(2)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
      <div style={styles.sliderHelp}>{help}</div>
    </label>
  );
}

const styles = {
  root: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 340px",
    height: "100%",
    width: "100%",
  } as React.CSSProperties,
  stage: {
    position: "relative",
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
  sidebar: {
    background: "#10141a",
    borderLeft: "1px solid #1f2630",
    padding: 16,
    overflowY: "auto",
  } as React.CSSProperties,
  h2: {
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 1,
    margin: "16px 0 8px",
    opacity: 0.7,
  } as React.CSSProperties,
  slider: {
    display: "block",
    marginBottom: 10,
    fontSize: 13,
  } as React.CSSProperties,
  sliderHead: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 2,
  } as React.CSSProperties,
  sliderVal: {
    fontFamily: "ui-monospace, Menlo, monospace",
    opacity: 0.85,
  } as React.CSSProperties,
  sliderHelp: {
    fontSize: 11,
    opacity: 0.55,
    marginTop: 2,
  } as React.CSSProperties,
  checkRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 13,
    marginBottom: 8,
  } as React.CSSProperties,
  resetBtn: {
    marginTop: 4,
    background: "transparent",
    color: "#cfd6df",
    border: "1px solid #2c3542",
    borderRadius: 6,
    padding: "6px 10px",
    cursor: "pointer",
    fontSize: 12,
  } as React.CSSProperties,
};
