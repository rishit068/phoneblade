import { useEffect, useRef, useState } from "react";
import { GameScene, type FrameStats } from "../game/Scene";
import { DEFAULT_GAME_TUNING, type GameTuning, type FruitKind } from "../game/types";
import { SwingDetector, type FrameData } from "../swing/SwingDetector";
import type { SwingEvent } from "../swing/types";
import { SoundEngine } from "../game/sound";
import { useTuning } from "../store/tuning";
import { CyberHeader } from "./CyberHeader";
import { StartGameModal } from "./StartGameModal";
import { VictoryModal } from "./VictoryModal";

type Status =
  | { kind: "idle" }
  | { kind: "loading"; msg: string }
  | { kind: "ready" }
  | { kind: "error"; msg: string };

interface Point {
  x: number;
  y: number;
}

interface TrailSample extends Point {
  t: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  bornAt: number;
  lifeMs: number;
}

interface ScorePopup {
  x: number;
  y: number;
  text: string;
  color: string;
  bornAt: number;
  lifeMs: number;
}

interface Burst {
  at: number;
  pathPixels: Point[];
  intensity: number;
}

const BURST_LIFE_MS = 380;
const TRAIL_MAX_AGE_MS = 160;

function mapVideoToScreen(
  nx: number,
  ny: number,
  screenWidth: number,
  screenHeight: number,
  videoWidth: number,
  videoHeight: number,
): Point {
  if (!videoWidth || !videoHeight) {
    return { x: nx * screenWidth, y: ny * screenHeight };
  }
  const screenAspect = screenWidth / screenHeight;
  const videoAspect = videoWidth / videoHeight;
  let renderW = screenWidth;
  let renderH = screenHeight;
  let offsetX = 0;
  let offsetY = 0;

  if (screenAspect > videoAspect) {
    renderW = screenWidth;
    renderH = screenWidth / videoAspect;
    offsetY = (screenHeight - renderH) / 2;
  } else {
    renderH = screenHeight;
    renderW = screenHeight * videoAspect;
    offsetX = (screenWidth - renderW) / 2;
  }

  return {
    x: offsetX + nx * renderW,
    y: offsetY + ny * renderH,
  };
}

const FRUIT_COLORS: Record<FruitKind, string[]> = {
  apple: ["#ff3344", "#ff6b81", "#ffffff", "#e02020"],
  orange: ["#ff9900", "#ffcc00", "#ffffff", "#e07700"],
  watermelon: ["#ff2a55", "#44dd66", "#ffffff", "#cc1133"],
};

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
  const trailRef = useRef<TrailSample[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const popupsRef = useRef<ScorePopup[]>([]);
  const lastBladePosRef = useRef<TrailSample | null>(null);
  const lastWhooshMsRef = useRef<number>(0);
  const comboRef = useRef<{ count: number; lastHitAt: number }>({ count: 0, lastHitAt: 0 });
  const maxComboRef = useRef<number>(1);

  const tuningRef = useRef<GameTuning>(DEFAULT_GAME_TUNING);
  const swingTuning = useTuning();
  const swingTuningRef = useRef(swingTuning);
  swingTuningRef.current = swingTuning;

  const cleanupRef = useRef<(() => void) | null>(null);
  const lastUiUpdateRef = useRef<number>(0);

  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [tuning, setTuning] = useState<GameTuning>(DEFAULT_GAME_TUNING);
  const [hud, setHud] = useState({ fruit: 0, shards: 0, sliced: 0, combo: 0, score: 0 });
  const [audioMuted, setAudioMuted] = useState(false);
  const [showVictory, setShowVictory] = useState(false);
  const [showTuningDrawer, setShowTuningDrawer] = useState(false);
  const [gameMode, setGameMode] = useState("classic");
  const slicedTotalRef = useRef(0);
  const scoreTotalRef = useRef(0);

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

  const toggleAudio = () => {
    const next = !audioMuted;
    setAudioMuted(next);
    soundRef.current.enabled = !next;
  };

  const spawnSliceParticles = (x: number, y: number, kind: FruitKind) => {
    const colors = FRUIT_COLORS[kind] ?? ["#ff4444", "#ffffff"];
    const count = 20;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 90 + Math.random() * 340;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 60,
        size: 3 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        bornAt: performance.now(),
        lifeMs: 380 + Math.random() * 300,
      });
    }
  };

  const start = async () => {
    if (status.kind === "loading" || status.kind === "ready") return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus({
        kind: "error",
        msg: "Camera access requires a secure context. Please open http://localhost:5173 in your browser instead of using the network IP.",
      });
      return;
    }
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

      setStatus({ kind: "loading", msg: "Calibrating hand engine…" });
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
      setShowVictory(false);

      const loop = (nowMs: number) => {
        const s = sceneRef.current;
        if (!s) return;

        const stats = s.step(nowMs);
        statsRef.current = stats;

        processHandSlicing(nowMs, s);

        s.render();
        drawOverlay(nowMs, stats);

        if (nowMs - lastUiUpdateRef.current > 150) {
          lastUiUpdateRef.current = nowMs;
          setHud({
            fruit: stats.fruitCount,
            shards: stats.shardCount,
            sliced: slicedTotalRef.current,
            combo: comboRef.current.count,
            score: scoreTotalRef.current,
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

  const processHandSlicing = (nowMs: number, scene: GameScene) => {
    const video = videoRef.current;
    const overlay = overlayRef.current;
    const frame = liveFrameRef.current;
    if (!video || !overlay || !frame) return;

    const screenW = overlay.width / devicePixelRatio;
    const screenH = overlay.height / devicePixelRatio;

    if (!frame.handPresent || !frame.landmarks || frame.landmarks.length < 9) {
      lastBladePosRef.current = null;
      return;
    }

    const tipLandmark = frame.landmarks[8] ?? frame.landmarks[9];
    const screenPos = mapVideoToScreen(
      tipLandmark.x,
      tipLandmark.y,
      screenW,
      screenH,
      video.videoWidth,
      video.videoHeight,
    );

    const currSample: TrailSample = {
      x: screenPos.x,
      y: screenPos.y,
      t: nowMs,
    };

    trailRef.current.push(currSample);
    const minT = nowMs - TRAIL_MAX_AGE_MS;
    trailRef.current = trailRef.current.filter((p) => p.t >= minT);

    const prev = lastBladePosRef.current;
    if (prev) {
      const dt = Math.max(0.001, (nowMs - prev.t) / 1000);
      const dx = currSample.x - prev.x;
      const dy = currSample.y - prev.y;
      const dist = Math.hypot(dx, dy);
      const speedPx = dist / dt;

      if (speedPx > 60 && dist > 1.5) {
        const intensity = Math.min(1, Math.max(0.25, speedPx / 1200));

        if (speedPx > 500 && nowMs - lastWhooshMsRef.current > 240) {
          soundRef.current.playSwing(intensity);
          lastWhooshMsRef.current = nowMs;
        }

        const hits = scene.attemptSlice([prev, currSample], intensity, 38);
        if (hits.length > 0) {
          slicedTotalRef.current += hits.length;

          const combo = comboRef.current;
          if (nowMs - combo.lastHitAt < 650) {
            combo.count += hits.length;
          } else {
            combo.count = hits.length;
          }
          combo.lastHitAt = nowMs;
          if (combo.count > maxComboRef.current) {
            maxComboRef.current = combo.count;
          }

          const pointsEarned = hits.length * 10 * combo.count;
          scoreTotalRef.current += pointsEarned;

          hits.forEach((_, i) => {
            soundRef.current.playSlice(1 + Math.min(1.0, (combo.count - 1) * 0.08 + i * 0.05));
          });

          for (const hit of hits) {
            spawnSliceParticles(hit.screen.x, hit.screen.y, hit.kind);
            const scoreText = combo.count > 1 ? `COMBO x${combo.count}! +${pointsEarned}` : `+10`;
            popupsRef.current.push({
              x: hit.screen.x,
              y: hit.screen.y - 15,
              text: scoreText,
              color: combo.count > 1 ? "#ffd66b" : "#7af0c8",
              bornAt: nowMs,
              lifeMs: 500,
            });
          }
        }
      }
    }

    lastBladePosRef.current = currSample;
  };

  const onSwing = (ev: SwingEvent) => {
    const overlay = overlayRef.current;
    const video = videoRef.current;
    if (!overlay || !video) return;
    const screenW = overlay.width / devicePixelRatio;
    const screenH = overlay.height / devicePixelRatio;

    const pathPixels: Point[] = ev.path.map((p) =>
      mapVideoToScreen(p.x, p.y, screenW, screenH, video.videoWidth, video.videoHeight),
    );

    burstRef.current = {
      at: performance.now(),
      pathPixels,
      intensity: ev.intensity,
    };
  };

  const drawOverlay = (nowMs: number, stats: FrameStats) => {
    const canvas = overlayRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = devicePixelRatio;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1) Smooth glowing neon blade trail
    const trail = trailRef.current;
    if (trail.length >= 2) {
      const trailPixels = trail.map((p) => ({ x: p.x * dpr, y: p.y * dpr }));

      strokeTaperedPolyline(ctx, trailPixels, 20 * dpr, "rgba(0, 240, 255, 0.35)");
      strokeTaperedPolyline(ctx, trailPixels, 10 * dpr, "rgba(122, 240, 200, 0.75)");
      strokeTaperedPolyline(ctx, trailPixels, 4 * dpr, "rgba(255, 255, 255, 0.98)");

      const tip = trailPixels[trailPixels.length - 1];
      ctx.save();
      ctx.beginPath();
      ctx.arc(tip.x, tip.y, 8 * dpr, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0, 240, 255, 0.85)";
      ctx.shadowColor = "#00f0ff";
      ctx.shadowBlur = 18 * dpr;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(tip.x, tip.y, 3.5 * dpr, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.restore();
    }

    // 2) Burst trail on swing completion
    const burst = burstRef.current;
    if (burst) {
      const age = nowMs - burst.at;
      if (age >= BURST_LIFE_MS) {
        burstRef.current = null;
      } else {
        const t = age / BURST_LIFE_MS;
        const fade = 1 - t;
        const baseWidth = (12 + burst.intensity * 24) * dpr;
        strokeTaperedPolyline(
          ctx,
          burst.pathPixels.map((p) => ({ x: p.x * dpr, y: p.y * dpr })),
          baseWidth * 1.5,
          `rgba(0, 240, 255, ${(0.45 * fade).toFixed(3)})`,
        );
        strokeTaperedPolyline(
          ctx,
          burst.pathPixels.map((p) => ({ x: p.x * dpr, y: p.y * dpr })),
          baseWidth,
          `rgba(255, 255, 255, ${(0.9 * fade).toFixed(3)})`,
        );
      }
    }

    // 3) Slice juice & spark particles
    const particles = particlesRef.current;
    const aliveParticles: Particle[] = [];
    const dtSec = 0.016;
    for (const p of particles) {
      const age = nowMs - p.bornAt;
      if (age < p.lifeMs) {
        const progress = age / p.lifeMs;
        const alpha = Math.max(0, 1 - progress);
        p.x += p.vx * dtSec;
        p.y += p.vy * dtSec;
        p.vy += 380 * dtSec;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x * dpr, p.y * dpr, p.size * (1 - progress * 0.4) * dpr, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        aliveParticles.push(p);
      }
    }
    particlesRef.current = aliveParticles;

    // 4) Floating Score Popups
    const popups = popupsRef.current;
    const alivePopups: ScorePopup[] = [];
    for (const popup of popups) {
      const age = nowMs - popup.bornAt;
      if (age < popup.lifeMs) {
        const progress = age / popup.lifeMs;
        const alpha = Math.max(0, 1 - progress);
        const yOff = progress * 40;

        ctx.save();
        ctx.font = `bold ${Math.floor(18 * dpr)}px 'Space Grotesk', system-ui, sans-serif`;
        ctx.fillStyle = popup.color;
        ctx.globalAlpha = alpha;
        ctx.shadowColor = "#000";
        ctx.shadowBlur = 8 * dpr;
        ctx.textAlign = "center";
        ctx.fillText(popup.text, popup.x * dpr, (popup.y - yOff) * dpr);
        ctx.restore();

        alivePopups.push(popup);
      }
    }
    popupsRef.current = alivePopups;

    // 5) Active Combo Banner
    const combo = comboRef.current;
    if (combo.count > 1 && nowMs - combo.lastHitAt < 800) {
      ctx.save();
      const comboAlpha = Math.min(1, Math.max(0, (800 - (nowMs - combo.lastHitAt)) / 400));
      ctx.font = `900 ${Math.floor(28 * dpr)}px 'Space Grotesk', system-ui, sans-serif`;
      ctx.fillStyle = "#ffd600";
      ctx.shadowColor = "rgba(255, 214, 0, 0.8)";
      ctx.shadowBlur = 14 * dpr;
      ctx.textAlign = "center";
      ctx.globalAlpha = comboAlpha;
      ctx.fillText(`⚡ COMBO x${combo.count}!`, canvas.width / 2, 105 * dpr);
      ctx.restore();
    }

    // 6) Hitbox debug overlay
    if (tuningRef.current.showHitboxes) {
      ctx.lineWidth = 2 * dpr;
      ctx.strokeStyle = "rgba(255, 235, 120, 0.9)";
      ctx.font = `${12 * dpr}px 'JetBrains Mono', monospace`;
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
    <div className="relative w-full h-full bg-surface-container-lowest overflow-hidden select-none">
      {/* Cyber Header Navigation */}
      <CyberHeader
        activeTab={gameMode}
        onTabSelect={(tab) => {
          setGameMode(tab);
          if (tab === "dojo") setShowTuningDrawer(true);
        }}
        audioMuted={audioMuted}
        onToggleAudio={toggleAudio}
        fps={60}
        cameraReady={status.kind === "ready"}
      />

      {/* Camera Video & Canvases */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
        playsInline
        muted
      />
      <canvas ref={glCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
      <canvas ref={overlayRef} className="absolute inset-0 w-full h-full pointer-events-none z-10" />

      {/* Cyberpunk Sci-Fi Corner L-Brackets */}
      <div className="absolute top-20 left-6 w-8 h-8 pointer-events-none z-20">
        <div className="w-full h-full border-t-2 border-l-2 border-primary-container/70 shadow-[0_0_8px_rgba(0,240,255,0.4)]" />
      </div>
      <div className="absolute top-20 right-6 w-8 h-8 pointer-events-none z-20">
        <div className="w-full h-full border-t-2 border-r-2 border-primary-container/70 shadow-[0_0_8px_rgba(0,240,255,0.4)]" />
      </div>
      <div className="absolute bottom-6 left-6 w-8 h-8 pointer-events-none z-20">
        <div className="w-full h-full border-b-2 border-l-2 border-secondary/70 shadow-[0_0_8px_rgba(100,219,180,0.4)]" />
      </div>
      <div className="absolute bottom-6 right-6 w-8 h-8 pointer-events-none z-20">
        <div className="w-full h-full border-b-2 border-r-2 border-secondary/70 shadow-[0_0_8px_rgba(100,219,180,0.4)]" />
      </div>

      {/* In-Game Active Arena HUD */}
      {status.kind === "ready" && (
        <>
          {/* Top Left Score Card */}
          <div className="absolute top-20 left-10 z-20 bg-surface-container-lowest/80 backdrop-blur-xl px-4 py-2.5 rounded-xl border border-primary-container/30 shadow-2xl flex flex-col">
            <span className="font-label-sm text-[10px] text-outline uppercase tracking-widest">
              SCORE
            </span>
            <span className="font-display-hero text-2xl font-extrabold text-primary drop-shadow-[0_0_12px_rgba(0,240,255,0.5)]">
              {hud.score.toLocaleString()} <span className="text-xs text-primary-container font-bold">PTS</span>
            </span>
          </div>

          {/* Top Right Stats Pill & Controls */}
          <div className="absolute top-20 right-10 z-20 flex items-center gap-3">
            <div className="bg-surface-container-lowest/80 backdrop-blur-xl px-4 py-2.5 rounded-xl border border-outline-variant flex items-center gap-4 text-xs font-label-md">
              <div className="flex flex-col">
                <span className="text-[10px] text-outline uppercase">SLICED</span>
                <span className="text-secondary font-bold text-base">{hud.sliced}</span>
              </div>
              <div className="h-6 w-px bg-outline-variant/40" />
              <div className="flex flex-col">
                <span className="text-[10px] text-outline uppercase">FLYING</span>
                <span className="text-primary font-bold text-base">{hud.fruit}</span>
              </div>
            </div>

            <button
              onClick={() => setShowTuningDrawer((prev) => !prev)}
              className="p-2.5 rounded-xl bg-surface-container-lowest/80 backdrop-blur-xl border border-outline-variant hover:border-primary-container/50 text-on-surface-variant hover:text-primary transition-all cursor-pointer shadow-lg"
              title="Calibration & Settings"
            >
              <span className="material-symbols-outlined text-[20px]">tune</span>
            </button>

            <button
              onClick={() => setShowVictory(true)}
              className="px-3 py-2 rounded-xl bg-surface-container-lowest/80 backdrop-blur-xl border border-secondary/40 hover:bg-secondary/10 text-secondary text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-lg flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">flag</span>
              <span>FINISH</span>
            </button>
          </div>

          {/* Center Gesture Hint Banner */}
          {hud.sliced < 4 && (
            <div className="absolute top-24 left-1/2 -translate-x-1/2 z-20 pointer-events-none bg-surface-container-lowest/80 backdrop-blur-md px-5 py-2 rounded-full border border-primary-container/30 text-xs font-semibold tracking-wide text-primary shadow-[0_0_16px_rgba(0,240,255,0.2)] animate-pulse">
              👋 Swipe your hand or index finger across fruit to slice!
            </div>
          )}

          {/* Bottom Left Telemetry Pill */}
          <div className="absolute bottom-8 left-10 z-20 flex items-center gap-2 bg-surface-container-lowest/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-outline-variant/40 font-label-sm text-[10px] text-outline">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
            <span>OPTICAL SENSOR: 60 FPS</span>
            <span className="text-outline-variant">•</span>
            <span className="text-primary-container">TRACKED: INDEX TIP</span>
          </div>
        </>
      )}

      {/* Start Game Hero Modal from Stitch */}
      {status.kind !== "ready" && (
        <StartGameModal
          status={status.kind}
          errorMsg={status.kind === "error" ? status.msg : undefined}
          onStart={start}
          selectedMode={gameMode}
          onSelectMode={setGameMode}
        />
      )}

      {/* Match Victory Modal from Stitch */}
      {showVictory && (
        <VictoryModal
          score={hud.score}
          maxCombo={maxComboRef.current}
          totalSliced={hud.sliced}
          onPlayAgain={() => {
            setShowVictory(false);
            slicedTotalRef.current = 0;
            scoreTotalRef.current = 0;
            maxComboRef.current = 1;
            comboRef.current = { count: 0, lastHitAt: 0 };
            setHud({ fruit: 0, shards: 0, sliced: 0, combo: 0, score: 0 });
          }}
          onOpenArmory={() => setGameMode("armory")}
        />
      )}

      {/* Slide-out Calibration / Tuning Drawer */}
      {showTuningDrawer && (
        <div className="absolute top-20 right-10 z-30 w-72 bg-surface-container-lowest/95 backdrop-blur-2xl rounded-2xl border border-outline-variant/60 shadow-2xl p-4 flex flex-col gap-3 font-label-md text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-outline-variant/40">
            <span className="font-bold text-primary tracking-wider uppercase flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">tune</span>
              Calibration
            </span>
            <button
              onClick={() => setShowTuningDrawer(false)}
              className="text-on-surface-variant hover:text-error p-1"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          <label className="flex flex-col gap-1">
            <div className="flex justify-between text-[11px] text-outline">
              <span>Spawn Rate</span>
              <span className="text-primary font-bold">{tuning.spawnRate.toFixed(1)} /s</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={5}
              step={0.1}
              value={tuning.spawnRate}
              onChange={(e) =>
                setTuning((t) => ({ ...t, spawnRate: parseFloat(e.target.value) }))
              }
              className="w-full accent-primary-container"
            />
          </label>

          <label className="flex flex-col gap-1">
            <div className="flex justify-between text-[11px] text-outline">
              <span>Gravity</span>
              <span className="text-primary font-bold">{tuning.gravity.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min={2}
              max={14}
              step={0.5}
              value={tuning.gravity}
              onChange={(e) =>
                setTuning((t) => ({ ...t, gravity: parseFloat(e.target.value) }))
              }
              className="w-full accent-primary-container"
            />
          </label>

          <label className="flex items-center gap-2 pt-1 cursor-pointer">
            <input
              type="checkbox"
              checked={tuning.showHitboxes}
              onChange={(e) =>
                setTuning((t) => ({ ...t, showHitboxes: e.target.checked }))
              }
              className="accent-primary-container"
            />
            <span className="text-outline text-[11px]">Show Collision Hitboxes</span>
          </label>

          <button
            onClick={() =>
              setTuning((t) => ({ ...t, seed: (Math.random() * 0xffffffff) >>> 0 }))
            }
            className="mt-1 py-1.5 px-3 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant text-[11px] text-on-surface-variant hover:text-primary transition-all cursor-pointer"
          >
            Reroll Spawner Seed
          </button>
        </div>
      )}
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
  for (let i = 1; i < pts.length; i++) {
    const t = i / (pts.length - 1);
    ctx.lineWidth = Math.max(1, baseWidth * (0.2 + 0.8 * t));
    ctx.beginPath();
    ctx.moveTo(pts[i - 1].x, pts[i - 1].y);
    ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
  }
}
