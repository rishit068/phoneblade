import { useEffect, useRef, useState } from "react";
import { SwingDetector, type FrameData } from "../swing/SwingDetector";
import type { SwingEvent } from "../swing/types";
import { useTuning } from "../store/tuning";

type Status =
  | { kind: "idle" }
  | { kind: "loading"; msg: string }
  | { kind: "ready" }
  | { kind: "error"; msg: string };

const MAX_LOG = 12;

export function DebugScreen() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const detectorRef = useRef<SwingDetector | null>(null);
  const frameRef = useRef<FrameData | null>(null);
  const swingPulseRef = useRef<{ at: number; ev: SwingEvent } | null>(null);

  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [recentSwings, setRecentSwings] = useState<SwingEvent[]>([]);
  const [liveFrame, setLiveFrame] = useState<FrameData | null>(null);

  const tuning = useTuning();

  // Push live tuning values into the active detector.
  useEffect(() => {
    const d = detectorRef.current;
    if (!d) return;
    d.setTuning({
      enterThreshold: tuning.enterThreshold,
      exitThreshold: tuning.exitThreshold,
      minDurationMs: tuning.minDurationMs,
      maxDurationMs: tuning.maxDurationMs,
      velocitySmoothing: tuning.velocitySmoothing,
      intensityCeiling: tuning.intensityCeiling,
      trackedLandmark: tuning.trackedLandmark,
    });
  }, [
    tuning.enterThreshold,
    tuning.exitThreshold,
    tuning.minDurationMs,
    tuning.maxDurationMs,
    tuning.velocitySmoothing,
    tuning.intensityCeiling,
    tuning.trackedLandmark,
  ]);

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
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: false,
      });
      const video = videoRef.current;
      if (!video) throw new Error("Video element not mounted");
      video.srcObject = stream;
      await video.play();

      setStatus({ kind: "loading", msg: "Loading hand model…" });
      const detector = new SwingDetector();
      detector.setTuning(tuning);
      await detector.init();
      detector.attach(video);

      detector.on("frame", (f) => {
        frameRef.current = f;
        // Throttle React state updates to ~20Hz for the readout panel.
        const now = f.t;
        if (!lastUiUpdateRef.current || now - lastUiUpdateRef.current > 50) {
          lastUiUpdateRef.current = now;
          setLiveFrame(f);
        }
      });
      detector.on("swing", (ev) => {
        swingPulseRef.current = { at: performance.now(), ev };
        setRecentSwings((prev) => [ev, ...prev].slice(0, MAX_LOG));
      });

      detectorRef.current = detector;
      detector.start();
      setStatus({ kind: "ready" });
      requestAnimationFrame(drawLoop);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus({ kind: "error", msg });
    }
  };

  const lastUiUpdateRef = useRef<number>(0);

  const drawLoop = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const frame = frameRef.current;
    if (!canvas || !video) return;

    const rect = canvas.getBoundingClientRect();
    const w = (canvas.width = Math.floor(rect.width * devicePixelRatio));
    const h = (canvas.height = Math.floor(rect.height * devicePixelRatio));
    const ctx = canvas.getContext("2d");
    if (ctx && frame) {
      ctx.clearRect(0, 0, w, h);

      // Path trail of recent tracked samples.
      if (frame.buffer.length >= 2) {
        ctx.lineWidth = Math.max(2, 4 * devicePixelRatio);
        ctx.strokeStyle = frame.state === "active" ? "#7af0c8" : "#5b8def";
        ctx.beginPath();
        for (let i = 0; i < frame.buffer.length; i++) {
          const s = frame.buffer[i];
          const x = s.x * w;
          const y = s.y * h;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // Tracked landmark crosshair.
      if (frame.tracked) {
        const x = frame.tracked.x * w;
        const y = frame.tracked.y * h;
        ctx.fillStyle = "#ffd66b";
        ctx.beginPath();
        ctx.arc(x, y, 10 * devicePixelRatio, 0, Math.PI * 2);
        ctx.fill();
      }

      // All landmarks as faint dots.
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      for (const lm of frame.landmarks) {
        ctx.beginPath();
        ctx.arc(lm.x * w, lm.y * h, 3 * devicePixelRatio, 0, Math.PI * 2);
        ctx.fill();
      }

      // Velocity vector from tracked landmark.
      if (frame.tracked) {
        const x = frame.tracked.x * w;
        const y = frame.tracked.y * h;
        const scale = 60 * devicePixelRatio;
        const ex = x + frame.smoothedVelocity.vx * scale;
        const ey = y + frame.smoothedVelocity.vy * scale;
        ctx.strokeStyle = "#ff6b9a";
        ctx.lineWidth = 3 * devicePixelRatio;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(ex, ey);
        ctx.stroke();
      }

      // Recent swing flash.
      const pulse = swingPulseRef.current;
      if (pulse) {
        const age = performance.now() - pulse.at;
        const ttl = 380;
        if (age < ttl) {
          const a = 1 - age / ttl;
          ctx.strokeStyle = `rgba(255, 235, 120, ${a.toFixed(3)})`;
          ctx.lineWidth = 6 * devicePixelRatio * (0.5 + pulse.ev.intensity);
          ctx.beginPath();
          const path = pulse.ev.path;
          for (let i = 0; i < path.length; i++) {
            const p = path[i];
            const x = p.x * w;
            const y = p.y * h;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        } else {
          swingPulseRef.current = null;
        }
      }
    }
    requestAnimationFrame(drawLoop);
  };

  useEffect(() => {
    return () => {
      detectorRef.current?.dispose();
      const v = videoRef.current;
      const stream = v?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div style={styles.root}>
      <div style={styles.stage}>
        <video
          ref={videoRef}
          style={styles.video}
          playsInline
          muted
        />
        <canvas ref={canvasRef} style={styles.canvas} />
        {status.kind !== "ready" && (
          <div style={styles.overlay}>
            <h1 style={{ margin: 0, fontSize: 22 }}>PhoneBlade — Phase 1</h1>
            <p style={{ opacity: 0.8, maxWidth: 460, textAlign: "center" }}>
              Webcam-based swing detection. Click <b>Start</b>, allow camera
              access, then swing your open hand in front of the camera. Tune
              thresholds in the sidebar until your natural swings register
              cleanly.
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
        <Readout frame={liveFrame} />
      </div>

      <aside style={styles.sidebar}>
        <h2 style={styles.h2}>Tuning</h2>
        <Slider
          label="Enter threshold"
          help="Speed (per-sec, normalized) needed to START a swing."
          value={tuning.enterThreshold}
          min={0.2}
          max={6}
          step={0.05}
          onChange={(v) => tuning.set("enterThreshold", v)}
        />
        <Slider
          label="Exit threshold"
          help="Speed below which an active swing ENDS (hysteresis)."
          value={tuning.exitThreshold}
          min={0.05}
          max={4}
          step={0.05}
          onChange={(v) => tuning.set("exitThreshold", v)}
        />
        <Slider
          label="Min duration (ms)"
          help="Swings shorter than this are rejected as jitter."
          value={tuning.minDurationMs}
          min={20}
          max={400}
          step={10}
          onChange={(v) => tuning.set("minDurationMs", v)}
        />
        <Slider
          label="Max duration (ms)"
          help="Swings longer than this are cut off."
          value={tuning.maxDurationMs}
          min={200}
          max={2000}
          step={10}
          onChange={(v) => tuning.set("maxDurationMs", v)}
        />
        <Slider
          label="Velocity smoothing"
          help="EMA factor. Higher = smoother but laggier."
          value={tuning.velocitySmoothing}
          min={0}
          max={0.9}
          step={0.05}
          onChange={(v) => tuning.set("velocitySmoothing", v)}
        />
        <Slider
          label="Intensity ceiling"
          help="Peak speed that maps to intensity = 1.0."
          value={tuning.intensityCeiling}
          min={1}
          max={12}
          step={0.1}
          onChange={(v) => tuning.set("intensityCeiling", v)}
        />
        <Slider
          label="Tracked landmark"
          help="0 = wrist, 9 = middle knuckle (recommended), 12 = middle fingertip."
          value={tuning.trackedLandmark}
          min={0}
          max={20}
          step={1}
          onChange={(v) => tuning.set("trackedLandmark", Math.round(v))}
        />
        <button style={styles.resetBtn} onClick={tuning.reset}>
          Reset to defaults
        </button>

        <h2 style={styles.h2}>Recent swings</h2>
        <ol style={styles.log}>
          {recentSwings.length === 0 && (
            <li style={{ opacity: 0.6 }}>No swings yet.</li>
          )}
          {recentSwings.map((s, i) => (
            <li key={`${s.timestamp}-${i}`} style={styles.logItem}>
              <span style={styles.dir}>{s.direction}</span>
              <span style={styles.dim}>
                {Math.round(s.durationMs)}ms · int{" "}
                {(s.intensity * 100).toFixed(0)}%
              </span>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}

function Readout({ frame }: { frame: FrameData | null }) {
  if (!frame) return null;
  const sp = frame.smoothedVelocity.speed.toFixed(2);
  const vx = frame.smoothedVelocity.vx.toFixed(2);
  const vy = frame.smoothedVelocity.vy.toFixed(2);
  return (
    <div style={styles.readout}>
      <div>
        state: <b style={{ color: frame.state === "active" ? "#7af0c8" : "#cfd6df" }}>{frame.state}</b>
      </div>
      <div>speed: {sp}</div>
      <div>
        v: ({vx}, {vy})
      </div>
      <div>hand: {frame.handPresent ? "yes" : "—"}</div>
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
}: {
  label: string;
  help: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <label style={styles.slider}>
      <div style={styles.sliderHead}>
        <span>{label}</span>
        <span style={styles.sliderVal}>
          {Number.isInteger(step) ? value.toFixed(0) : value.toFixed(2)}
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
    gridTemplateColumns: "minmax(0, 1fr) 360px",
    height: "100vh",
    width: "100vw",
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
  readout: {
    position: "absolute",
    top: 12,
    left: 12,
    padding: "8px 12px",
    background: "rgba(11,13,16,0.7)",
    borderRadius: 8,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: 13,
    lineHeight: 1.5,
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
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    opacity: 0.85,
  } as React.CSSProperties,
  sliderHelp: {
    fontSize: 11,
    opacity: 0.55,
    marginTop: 2,
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
  log: {
    margin: 0,
    paddingLeft: 18,
    fontSize: 13,
  } as React.CSSProperties,
  logItem: {
    display: "flex",
    justifyContent: "space-between",
    padding: "2px 0",
  } as React.CSSProperties,
  dir: {
    fontWeight: 600,
  } as React.CSSProperties,
  dim: {
    opacity: 0.6,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: 12,
  } as React.CSSProperties,
};
