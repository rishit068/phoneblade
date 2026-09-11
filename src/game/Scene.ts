import * as THREE from "three";
import { Fruit } from "./Fruit";
import { FruitSpawner } from "./FruitSpawner";
import { Shard } from "./Shard";
import {
  DEFAULT_GAME_TUNING,
  type FruitKind,
  type GameTuning,
  type ScreenHitbox,
} from "./types";

/** Once a fruit (or shard) falls below this y, it's culled. */
const DESPAWN_Y = -5;

export interface FrameStats {
  fruitCount: number;
  shardCount: number;
  hitboxes: Array<{ id: number; kind: FruitKind; box: ScreenHitbox }>;
}

export interface SliceResult {
  fruitId: number;
  kind: FruitKind;
  /** Screen pixel position of the fruit at slice time. */
  screen: { x: number; y: number };
  /** Pass-through of the swing event intensity (0..1). */
  intensity: number;
}

interface PathPoint {
  x: number;
  y: number;
}

export class GameScene {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  private spawner: FruitSpawner;
  private tuning: GameTuning;
  private fruits = new Map<number, Fruit>();
  private shards: Shard[] = [];
  private nextId = 1;
  private lastTickMs: number | null = null;
  private hitboxScratch = {
    a: new THREE.Vector3(),
    b: new THREE.Vector3(),
  };

  constructor(canvas: HTMLCanvasElement, tuning: GameTuning = DEFAULT_GAME_TUNING) {
    this.tuning = { ...tuning };

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      premultipliedAlpha: false,
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    this.camera.position.set(0, 0, 5);
    this.camera.lookAt(0, 0, 0);

    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    this.scene.add(ambient);
    const key = new THREE.DirectionalLight(0xffffff, 1.15);
    key.position.set(3, 5, 4);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0x9bbcff, 0.45);
    fill.position.set(-3, -1, 2);
    this.scene.add(fill);

    this.spawner = new FruitSpawner({
      seed: this.tuning.seed,
      spawnRate: this.tuning.spawnRate,
    });
  }

  resize(w: number, h: number): void {
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
  }

  setTuning(partial: Partial<GameTuning>): void {
    if (partial.spawnRate !== undefined) this.spawner.setSpawnRate(partial.spawnRate);
    if (partial.seed !== undefined && partial.seed !== this.tuning.seed) {
      this.spawner = new FruitSpawner({
        seed: partial.seed,
        spawnRate: partial.spawnRate ?? this.tuning.spawnRate,
      });
    }
    this.tuning = { ...this.tuning, ...partial };
  }

  getTuning(): GameTuning {
    return this.tuning;
  }

  step(nowMs: number): FrameStats {
    const last = this.lastTickMs ?? nowMs;
    const dt = Math.min(0.05, (nowMs - last) / 1000);
    this.lastTickMs = nowMs;

    // Spawn
    const newFruits = this.spawner.tick(dt);
    for (const f of newFruits) {
      const id = this.nextId++;
      this.fruits.set(id, f);
      this.scene.add(f.mesh);
    }

    // Update fruits + cull
    for (const [id, f] of this.fruits) {
      f.update(dt, this.tuning.gravity);
      if (f.mesh.position.y < DESPAWN_Y || Math.abs(f.mesh.position.x) > 8) {
        f.alive = false;
        this.scene.remove(f.mesh);
        f.dispose();
        this.fruits.delete(id);
      }
    }

    // Update shards + cull
    for (let i = this.shards.length - 1; i >= 0; i--) {
      const s = this.shards[i];
      const alive = s.update(dt, this.tuning.gravity);
      if (!alive || s.mesh.position.y < DESPAWN_Y) {
        this.scene.remove(s.mesh);
        s.dispose();
        this.shards.splice(i, 1);
      }
    }

    // Compute hitboxes for this frame
    const w = this.renderer.domElement.clientWidth;
    const h = this.renderer.domElement.clientHeight;
    const hitboxes: FrameStats["hitboxes"] = [];
    for (const [id, f] of this.fruits) {
      hitboxes.push({
        id,
        kind: f.kind,
        box: f.screenHitbox(this.camera, w, h, this.hitboxScratch),
      });
    }

    return { fruitCount: this.fruits.size, shardCount: this.shards.length, hitboxes };
  }

  /**
   * Test a slash polyline (in screen pixels) against all active fruit hitboxes.
   * Hit fruits are removed and replaced by two split shards. Returns slice info.
   */
  attemptSlice(pathPixels: PathPoint[], intensity: number, bladeRadius = 32): SliceResult[] {
    if (pathPixels.length < 1) return [];
    const results: SliceResult[] = [];
    const w = this.renderer.domElement.clientWidth;
    const h = this.renderer.domElement.clientHeight;

    // Overall slash direction in screen space.
    let splitAxis: THREE.Vector3;
    if (pathPixels.length >= 2) {
      const p0 = pathPixels[0];
      const pN = pathPixels[pathPixels.length - 1];
      const sxRaw = pN.x - p0.x;
      const syRaw = pN.y - p0.y;
      const mag = Math.hypot(sxRaw, syRaw) || 1;
      const sx = sxRaw / mag;
      const sy = syRaw / mag;
      // World-space split axis: perpendicular to slash, screen→world Y flip.
      splitAxis = new THREE.Vector3(-sy, -sx, 0);
    } else {
      splitAxis = new THREE.Vector3(1, 0.4, 0);
    }
    if (splitAxis.lengthSq() < 1e-6) splitAxis.set(1, 0, 0);
    splitAxis.normalize();

    const toRemove: number[] = [];
    for (const [id, fruit] of this.fruits) {
      const hb = fruit.screenHitbox(this.camera, w, h, this.hitboxScratch);
      if (!pathHitsCircle(pathPixels, hb, bladeRadius)) continue;

      results.push({
        fruitId: id,
        kind: fruit.kind,
        screen: { x: hb.cx, y: hb.cy },
        intensity,
      });

      // Spawn 2 shards
      for (const side of [-1, 1] as const) {
        const baseVel = fruit.velocity.clone().multiplyScalar(0.6);
        baseVel.addScaledVector(splitAxis, side * 2.4);
        baseVel.y += 1.2; // pop upward
        const angVel = new THREE.Vector3(
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 6,
        );
        const shard = new Shard({
          kind: fruit.kind,
          position: fruit.mesh.position.clone(),
          velocity: baseVel,
          angularVelocity: angVel,
          radius: fruit.radius,
          side,
          splitAxis,
        });
        this.shards.push(shard);
        this.scene.add(shard.mesh);
      }

      toRemove.push(id);
    }

    for (const id of toRemove) {
      const f = this.fruits.get(id);
      if (f) {
        this.scene.remove(f.mesh);
        f.dispose();
        this.fruits.delete(id);
      }
    }

    return results;
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    for (const [, f] of this.fruits) {
      this.scene.remove(f.mesh);
      f.dispose();
    }
    this.fruits.clear();
    for (const s of this.shards) {
      this.scene.remove(s.mesh);
      s.dispose();
    }
    this.shards.length = 0;
    this.renderer.dispose();
  }
}

function pathHitsCircle(path: PathPoint[], hb: ScreenHitbox, bladeRadius = 32): boolean {
  if (path.length === 1) {
    const dist = Math.hypot(path[0].x - hb.cx, path[0].y - hb.cy);
    return dist <= hb.r + bladeRadius;
  }
  for (let i = 1; i < path.length; i++) {
    if (segmentHitsCircle(path[i - 1], path[i], hb, bladeRadius)) return true;
  }
  return false;
}

function segmentHitsCircle(a: PathPoint, b: PathPoint, hb: ScreenHitbox, bladeRadius = 32): boolean {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const fx = a.x - hb.cx;
  const fy = a.y - hb.cy;
  const A = dx * dx + dy * dy;
  const B = 2 * (fx * dx + fy * dy);
  const effectiveR = hb.r + bladeRadius;
  const C = fx * fx + fy * fy - effectiveR * effectiveR;
  if (A < 1e-6) return Math.hypot(fx, fy) <= effectiveR;
  const disc = B * B - 4 * A * C;
  if (disc < 0) return false;
  const sq = Math.sqrt(disc);
  const t1 = (-B - sq) / (2 * A);
  const t2 = (-B + sq) / (2 * A);
  if (t1 >= 0 && t1 <= 1) return true;
  if (t2 >= 0 && t2 <= 1) return true;
  if (t1 < 0 && t2 > 1) return true; // segment fully inside circle
  return false;
}
