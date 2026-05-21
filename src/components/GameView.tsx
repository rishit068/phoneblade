import { useEffect, useRef, useState } from "react";
import { GameScene, type FrameStats } from "../game/Scene";
import { DEFAULT_GAME_TUNING, type GameTuning } from "../game/types";

type Status =
  | { kind: "idle" }
  | { kind: "loading"; msg: string }
  | { kind: "ready" }
  | { kind: "error"; msg: string };

export function GameView() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const glCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<GameScene | null>(null);
  const rafRef = useRef<number | null>(null);
  const statsRef = useRef<FrameStats>({ fruitCount: 0, hitboxes: [] });

  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [tuning, setTuning] = useState<GameTuning>(DEFAULT_GAME_TUNING);
  const [fruitCount, setFruitCount] = useState(0);

  // Live-push tuning to the scene.
  useEffect(() => {
    sceneRef.current?.setTuning(tuning);
  }, [tuning]);

  const start = async () => {
    if (status.kind === "loading" || status.kind === "ready") return;
    setStatus({ kind: "loading", msg: "Requesting camera…" });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: false,
      });
      const video = videoRef.current;
      const glCanvas = glCanvasRef.current;
      if (!video || !glCanvas) throw new Error("Canvas/video not mounted");
      video.srcObject = stream;
      await video.play();

      const scene = new GameScene(glCanvas, tuning);
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
        drawOverlay(stats);
        // Throttle React update for the readout.
        if (nowMs - lastUiUpdateRef.current > 200) {
          lastUiUpdateRef.current = nowMs;
          setFruitCount(stats.fruitCount);
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus({ kind: "error", msg });
    }
  };

  const lastUiUpdateRef = useRef<number>(0);
  const cleanupRef = useRef<(() => void) | null>(null);

  const drawOverlay = (stats: FrameStats) => {
    const canvas = overlayRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!tuning.showHitboxes) return;
    ctx.lineWidth = 2 * devicePixelRatio;
    ctx.strokeStyle = "rgba(255, 235, 120, 0.9)";
    ctx.font = `${12 * devicePixelRatio}px ui-monospace, Menlo, monospace`;
    ctx.fillStyle = "rgba(255, 235, 120, 0.9)";
    for (const h of stats.hitboxes) {
      const cx = h.box.cx * devicePixelRatio;
      const cy = h.box.cy * devicePixelRatio;
      const r = h.box.r * devicePixelRatio;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillText(`${h.kind} #${h.id}`, cx + r + 4, cy);
    }
  };

  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      cleanupRef.current?.();
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
          <h1 style={{ margin: 0, fontSize: 22 }}>PhoneBlade — Phase 2</h1>
          <p style={{ opacity: 0.85, maxWidth: 480, textAlign: "center" }}>
            Fruit spawning on top of the webcam. Slicing comes in Phase 3 —
            for now the fruit just arcs through. Toggle <b>Show hitboxes</b>
            below to verify the screen-space hit circles track correctly.
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
        <div>fruit: {fruitCount}</div>
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
      </div>
    </div>
  );
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
    width: 240,
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
  dim: {
    opacity: 0.55,
    fontSize: 11,
  } as React.CSSProperties,
};
