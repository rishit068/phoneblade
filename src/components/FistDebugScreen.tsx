import { useEffect, useRef, useState } from "react";
import { FistTracker } from "../fist/FistTracker";
import {
  DEFAULT_FIST_TUNING,
  EMPTY_FIST_STATE,
  type FistState,
  type FistTuning,
} from "../fist/types";

type Status =
  | { kind: "idle" }
  | { kind: "loading"; msg: string }
  | { kind: "ready" }
  | { kind: "error"; msg: string };

// 21-landmark connection topology (MediaPipe Hands).
const HAND_CONNECTIONS: Array<[number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4], // thumb
  [0, 5], [5, 6], [6, 7], [7, 8], // index
  [5, 9], [9, 10], [10, 11], [11, 12], // middle
  [9, 13], [13, 14], [14, 15], [15, 16], // ring
  [13, 17], [17, 18], [18, 19], [19, 20], // pinky
  [0, 17], // palm base
];

export function FistDebugScreen() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const trackerRef = useRef<FistTracker | null>(null);
  const stateRef = useRef<FistState>(EMPTY_FIST_STATE);
  const rafRef = useRef<number | null>(null);

  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [tuning, setTuning] = useState<FistTuning>(DEFAULT_FIST_TUNING);
  const [liveState, setLiveState] = useState<FistState>(EMPTY_FIST_STATE);
  const lastUiUpdateRef = useRef<number>(0);

  useEffect(() => {
    trackerRef.current?.setTuning(tuning);
  }, [tuning]);

  const start = async () => {
    if (status.kind === "loading" || status.kind === "ready") return;
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
      if (!video) throw new Error("Video element not mounted");
      video.srcObject = stream;
      await video.play();

      setStatus({ kind: "loading", msg: "Loading hand model…" });
      const tracker = new FistTracker();
      tracker.setTuning(tuning);
      await tracker.init();
      tracker.attach(video);
      tracker.onState((s) => {
        stateRef.current = s;
        if (s.t - lastUiUpdateRef.current > 80) {
          lastUiUpdateRef.current = s.t;
          setLiveState(s);
        }
      });
      tracker.start();
      trackerRef.current = tracker;
      setStatus({ kind: "ready" });

      const loop = () => {
        draw(stateRef.current);
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus({ kind: "error", msg });
    }
  };

  const draw = (s: FistState) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const w = (canvas.width = Math.floor(rect.width * devicePixelRatio));
    const h = (canvas.height = Math.floor(rect.height * devicePixelRatio));
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    if (!s.detected) return;

    // Hand bbox
    const bbX = s.handBounds.minX * w;
    const bbY = s.handBounds.minY * h;
    const bbW = (s.handBounds.maxX - s.handBounds.minX) * w;
    const bbH = (s.handBounds.maxY - s.handBounds.minY) * h;
    ctx.strokeStyle = s.isFist ? "rgba(255,180,90,0.85)" : "rgba(150,220,255,0.85)";
    ctx.lineWidth = 2 * devicePixelRatio;
    ctx.strokeRect(bbX, bbY, bbW, bbH);

    // Skeleton
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 2 * devicePixelRatio;
    for (const [a, b] of HAND_CONNECTIONS) {
      const p1 = s.landmarks[a];
      const p2 = s.landmarks[b];
      if (!p1 || !p2) continue;
      ctx.beginPath();
      ctx.moveTo(p1.x * w, p1.y * h);
      ctx.lineTo(p2.x * w, p2.y * h);
      ctx.stroke();
    }
    // Landmarks
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    for (const lm of s.landmarks) {
      ctx.beginPath();
      ctx.arc(lm.x * w, lm.y * h, 3 * devicePixelRatio, 0, Math.PI * 2);
      ctx.fill();
    }

    // Fist position (large dot)
    const fx = s.fistPosition.x * w;
    const fy = s.fistPosition.y * h;
    ctx.fillStyle = s.isFist ? "#ffb45a" : "#7ad8ff";
    ctx.beginPath();
    ctx.arc(fx, fy, 14 * devicePixelRatio, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#0b0d10";
    ctx.font = `${10 * devicePixelRatio}px ui-monospace, Menlo, monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(s.isFist ? "FIST" : "OPEN", fx, fy);
    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";

    // Velocity vector
    const scale = 60 * devicePixelRatio;
    ctx.strokeStyle = "#ff6b9a";
    ctx.lineWidth = 3 * devicePixelRatio;
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(fx + s.velocity.x * scale, fy + s.velocity.y * scale);
    ctx.stroke();
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
            <h1 style={{ margin: 0, fontSize: 22 }}>PhoneBlade — Fist Tracking</h1>
            <p style={{ opacity: 0.85, maxWidth: 480, textAlign: "center" }}>
              Standalone fist detector. The dot turns <b>orange</b> for a
              closed fist, <b>blue</b> for an open hand. Make sure tracking is
              stable at arm's length before we wire the sword in.
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

        <div style={styles.readout}>
          <Row k="detected" v={liveState.detected ? "yes" : "—"} />
          <Row
            k="state"
            v={liveState.detected ? (liveState.isFist ? "FIST" : "OPEN") : "—"}
            color={liveState.isFist ? "#ffb45a" : "#7ad8ff"}
          />
          <Row k="curled" v={`${liveState.curledFingers}/5`} />
          <Row k="conf" v={liveState.confidence.toFixed(2)} />
          <Row
            k="pos"
            v={`(${liveState.fistPosition.x.toFixed(2)}, ${liveState.fistPosition.y.toFixed(2)})`}
          />
          <Row k="depth" v={liveState.fistDepth.toFixed(2)} />
          <Row
            k="vel"
            v={`(${liveState.velocity.x.toFixed(2)}, ${liveState.velocity.y.toFixed(2)})`}
          />
          <Row k="speed" v={Math.hypot(liveState.velocity.x, liveState.velocity.y).toFixed(2)} />
          <Row k="hand" v={liveState.handedness ?? "—"} />
        </div>
      </div>

      <aside style={styles.sidebar}>
        <h2 style={styles.h2}>Tuning</h2>
        <Slider
          label="Position smoothing"
          help="EMA factor on fist position. Higher = smoother but laggier."
          value={tuning.positionSmoothing}
          min={0}
          max={0.9}
          step={0.05}
          onChange={(v) => setTuning((t) => ({ ...t, positionSmoothing: v }))}
        />
        <Slider
          label="Curl ratio threshold"
          help="Per-finger ratio (tip→MCP / pip→MCP) BELOW which the finger is 'curled'."
          value={tuning.curlRatioThreshold}
          min={1.0}
          max={2.2}
          step={0.05}
          onChange={(v) => setTuning((t) => ({ ...t, curlRatioThreshold: v }))}
        />
        <Slider
          label="Fist curl count"
          help="Min curled fingers (incl. thumb) to register as a fist. 5 = strict."
          value={tuning.fistCurlCount}
          min={2}
          max={5}
          step={1}
          onChange={(v) => setTuning((t) => ({ ...t, fistCurlCount: Math.round(v) }))}
        />
        <Slider
          label="Min confidence"
          help="MediaPipe handedness score floor."
          value={tuning.minConfidence}
          min={0}
          max={0.95}
          step={0.05}
          onChange={(v) => setTuning((t) => ({ ...t, minConfidence: v }))}
        />
        <Slider
          label="Velocity samples"
          help="Frames averaged for velocity. Higher = smoother, more lag."
          value={tuning.velocitySamples}
          min={2}
          max={8}
          step={1}
          onChange={(v) => setTuning((t) => ({ ...t, velocitySamples: Math.round(v) }))}
        />
        <button style={styles.resetBtn} onClick={() => setTuning(DEFAULT_FIST_TUNING)}>
          Reset to defaults
        </button>

        <h2 style={styles.h2}>What to verify</h2>
        <ul style={styles.help}>
          <li>Dot snaps cleanly between OPEN (blue) and FIST (orange) as you open/close your hand.</li>
          <li>Position stays smooth — not jittery — while you hold still.</li>
          <li>Velocity vector points roughly the right way when you move.</li>
          <li>Tracking holds at arm's length and at near-camera distance.</li>
          <li>If two hands are visible, the larger/closer one wins.</li>
        </ul>
      </aside>
    </div>
  );
}

function Row({ k, v, color }: { k: string; v: string; color?: string }) {
  return (
    <div style={readoutRow}>
      <span style={{ opacity: 0.6 }}>{k}</span>
      <span style={{ color: color ?? "#e8eef5", fontWeight: 600 }}>{v}</span>
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
  const isInt = step >= 1;
  return (
    <label style={styles.slider}>
      <div style={styles.sliderHead}>
        <span>{label}</span>
        <span style={styles.sliderVal}>{isInt ? value.toFixed(0) : value.toFixed(2)}</span>
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

const readoutRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
};

const styles = {
  root: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 360px",
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
  readout: {
    position: "absolute",
    top: 12,
    left: 12,
    padding: "10px 14px",
    background: "rgba(11,13,16,0.78)",
    borderRadius: 8,
    fontFamily: "ui-monospace, Menlo, monospace",
    fontSize: 13,
    lineHeight: 1.6,
    minWidth: 200,
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
  help: {
    margin: 0,
    paddingLeft: 18,
    fontSize: 12,
    lineHeight: 1.55,
    opacity: 0.8,
  } as React.CSSProperties,
};
