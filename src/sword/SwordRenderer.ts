import type { FistState, Point2 } from "../fist/types";

export interface SwordTuning {
  /** Blade length as a fraction of viewport height (0..1). */
  bladeLengthFrac: number;
  /** Thickness of the bright core stroke, in CSS pixels. */
  coreThickness: number;
  /** Glow intensity multiplier (0..2). 1 = default. */
  glowIntensity: number;
  /** Afterimage trail length, in ms. */
  trailMs: number;
  /** Wobble amplitude as a fraction of blade length (0..0.05). */
  wobble: number;
  /** Pulse amount (0..0.3) — modulates glow alpha when stationary. */
  pulse: number;
  /**
   * Velocity (norm/sec) at/above which the blade aligns to the velocity
   * vector. Below this, it eases toward hand orientation.
   */
  velocityAlignThreshold: number;
  /** EMA factor for blade direction smoothing (0..0.95). */
  directionSmoothing: number;
}

export const DEFAULT_SWORD_TUNING: SwordTuning = {
  bladeLengthFrac: 0.4,
  coreThickness: 4,
  glowIntensity: 1.0,
  trailMs: 90,
  wobble: 0.012,
  pulse: 0.18,
  velocityAlignThreshold: 0.35,
  directionSmoothing: 0.7,
};

export interface BladeGeometry {
  /** Start (at the fist), in CSS pixels. */
  start: Point2;
  /** End (tip), in CSS pixels. */
  end: Point2;
  /** Unit direction (start → end), CSS-pixel space. */
  dir: Point2;
  /** Pixel length. */
  length: number;
}

interface TrailEntry {
  start: Point2;
  end: Point2;
  t: number;
}

const MIDDLE_MCP = 9;
const WRIST = 0;

/**
 * Pure renderer. Holds smoothed direction + trail history; otherwise stateless.
 * The caller drives it once per frame with a FistState and a 2D canvas.
 */
export class SwordRenderer {
  private dirX = 0;
  private dirY = -1;
  private hasDir = false;
  private trail: TrailEntry[] = [];
  private tuning: SwordTuning = { ...DEFAULT_SWORD_TUNING };

  setTuning(partial: Partial<SwordTuning>): void {
    this.tuning = { ...this.tuning, ...partial };
  }

  getTuning(): SwordTuning {
    return this.tuning;
  }

  /** Reset internal smoothing/trail. Call when the hand re-appears after a gap. */
  reset(): void {
    this.hasDir = false;
    this.trail.length = 0;
  }

  /**
   * Compute the blade geometry (in CSS pixels) for this frame. Returns null
   * when there's no blade to draw (open hand, no hand, etc.).
   */
  computeBlade(
    state: FistState,
    viewportW: number,
    viewportH: number,
    nowMs: number,
  ): BladeGeometry | null {
    if (!state.detected || !state.isFist) {
      // Decay the trail so it fades out instead of clipping when the hand opens.
      this.cullTrail(nowMs);
      return null;
    }
    const sx = state.fistPosition.x * viewportW;
    const sy = state.fistPosition.y * viewportH;

    const speed = Math.hypot(state.velocity.x, state.velocity.y);

    // Hand orientation: wrist → middle MCP (normalized).
    let hoX = 0;
    let hoY = -1;
    const wrist = state.landmarks[WRIST];
    const mcp = state.landmarks[MIDDLE_MCP];
    if (wrist && mcp) {
      hoX = mcp.x - wrist.x;
      hoY = mcp.y - wrist.y;
      const hoMag = Math.hypot(hoX, hoY);
      if (hoMag > 0.001) {
        hoX /= hoMag;
        hoY /= hoMag;
      } else {
        hoX = 0;
        hoY = -1;
      }
    }

    // Choose target direction: velocity-aligned (above threshold) or hand orientation.
    // We CSS-pixel-space the direction by scaling vy by aspect... actually
    // since both velocity components and hand-orientation deltas come from the
    // same normalized space, scaling by viewport dims gives the correct pixel
    // direction.
    let tx: number;
    let ty: number;
    const speedNorm = speed;
    if (speedNorm > this.tuning.velocityAlignThreshold) {
      tx = state.velocity.x * viewportW;
      ty = state.velocity.y * viewportH;
    } else {
      // Below threshold: blend velocity → hand orientation.
      const blend = clamp01(speedNorm / this.tuning.velocityAlignThreshold);
      const vx = state.velocity.x * viewportW;
      const vy = state.velocity.y * viewportH;
      const hox = hoX * viewportW;
      const hoy = hoY * viewportH;
      tx = vx * blend + hox * (1 - blend);
      ty = vy * blend + hoy * (1 - blend);
    }
    let tmag = Math.hypot(tx, ty);
    if (tmag < 0.001) {
      tx = hoX * viewportW;
      ty = hoY * viewportH;
      tmag = Math.hypot(tx, ty) || 1;
    }
    tx /= tmag;
    ty /= tmag;

    if (!this.hasDir) {
      this.dirX = tx;
      this.dirY = ty;
      this.hasDir = true;
    } else {
      const a = 1 - this.tuning.directionSmoothing;
      this.dirX = this.dirX * (1 - a) + tx * a;
      this.dirY = this.dirY * (1 - a) + ty * a;
      const dmag = Math.hypot(this.dirX, this.dirY) || 1;
      this.dirX /= dmag;
      this.dirY /= dmag;
    }

    const length = this.tuning.bladeLengthFrac * viewportH;

    // Wobble: small perpendicular displacement at tip, scales down with speed.
    const restFactor = 1 - clamp01(speedNorm / (this.tuning.velocityAlignThreshold * 2));
    const wob =
      Math.sin(nowMs * 0.008) * this.tuning.wobble * length * restFactor;
    const px = -this.dirY;
    const py = this.dirX;

    const ex = sx + this.dirX * length + px * wob;
    const ey = sy + this.dirY * length + py * wob;

    const geom: BladeGeometry = {
      start: { x: sx, y: sy },
      end: { x: ex, y: ey },
      dir: { x: this.dirX, y: this.dirY },
      length,
    };

    this.trail.push({
      start: { x: sx, y: sy },
      end: { x: ex, y: ey },
      t: nowMs,
    });
    this.cullTrail(nowMs);
    return geom;
  }

  /**
   * Draw the blade to a 2D context. Caller is responsible for clearing the
   * canvas. Coordinates in `geom` are CSS pixels; this method multiplies by
   * `dpr` internally so callers can pass `devicePixelRatio` once.
   */
  draw(
    ctx: CanvasRenderingContext2D,
    geom: BladeGeometry | null,
    nowMs: number,
    dpr: number,
  ): void {
    // Trail draws even after blade disappears, letting the afterimage fade.
    this.drawTrail(ctx, nowMs, dpr);
    if (!geom) return;

    const sx = geom.start.x * dpr;
    const sy = geom.start.y * dpr;
    const ex = geom.end.x * dpr;
    const ey = geom.end.y * dpr;
    const core = this.tuning.coreThickness * dpr;
    const pulseFactor =
      1 + Math.sin(nowMs * 0.006) * this.tuning.pulse;
    const g = this.tuning.glowIntensity * pulseFactor;

    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    // Outer glow
    ctx.strokeStyle = `rgba(60, 180, 255, ${(0.18 * g).toFixed(3)})`;
    ctx.lineWidth = core * 7;
    ctx.lineCap = "round";
    line(ctx, sx, sy, ex, ey);

    // Mid glow
    ctx.strokeStyle = `rgba(160, 230, 255, ${(0.45 * g).toFixed(3)})`;
    ctx.lineWidth = core * 3;
    line(ctx, sx, sy, ex, ey);

    // Bright inner glow
    ctx.strokeStyle = `rgba(220, 245, 255, ${(0.8 * g).toFixed(3)})`;
    ctx.lineWidth = core * 1.5;
    line(ctx, sx, sy, ex, ey);

    // Sharp core
    ctx.strokeStyle = `rgba(255, 255, 255, ${Math.min(1, 0.95 * g).toFixed(3)})`;
    ctx.lineWidth = core * 0.5;
    line(ctx, sx, sy, ex, ey);

    // Tip flare
    ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, 0.9 * g).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(ex, ey, core * 1.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(120, 220, 255, ${(0.5 * g).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(ex, ey, core * 3, 0, Math.PI * 2);
    ctx.fill();

    // Hilt (no glow — solid pommel)
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "rgba(255, 215, 130, 0.95)";
    ctx.beginPath();
    ctx.arc(sx, sy, core * 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(120, 80, 30, 0.9)";
    ctx.lineWidth = core * 0.5;
    ctx.stroke();

    ctx.restore();
  }

  private drawTrail(
    ctx: CanvasRenderingContext2D,
    nowMs: number,
    dpr: number,
  ): void {
    if (this.trail.length === 0) return;
    const trailMs = this.tuning.trailMs;
    if (trailMs <= 0) return;
    const core = this.tuning.coreThickness * dpr;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    for (let i = 0; i < this.trail.length - 1; i++) {
      const t = this.trail[i];
      const age = nowMs - t.t;
      if (age > trailMs) continue;
      const k = 1 - age / trailMs;
      ctx.strokeStyle = `rgba(160, 220, 255, ${(0.35 * k * this.tuning.glowIntensity).toFixed(3)})`;
      ctx.lineWidth = core * 3 * k;
      line(
        ctx,
        t.start.x * dpr,
        t.start.y * dpr,
        t.end.x * dpr,
        t.end.y * dpr,
      );
    }
    ctx.restore();
  }

  private cullTrail(nowMs: number): void {
    const trailMs = this.tuning.trailMs;
    while (this.trail.length > 0 && nowMs - this.trail[0].t > trailMs) {
      this.trail.shift();
    }
  }
}

function line(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
