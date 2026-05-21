import * as THREE from "three";
import { Fruit } from "./Fruit";
import { FruitSpawner } from "./FruitSpawner";
import { DEFAULT_GAME_TUNING, type GameTuning, type ScreenHitbox } from "./types";

/** Once a fruit falls below this y, it's culled. */
const DESPAWN_Y = -5;

export interface FrameStats {
  fruitCount: number;
  hitboxes: Array<{ id: number; kind: Fruit["kind"]; box: ScreenHitbox }>;
}

export class GameScene {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  private spawner: FruitSpawner;
  private tuning: GameTuning;
  private fruits = new Map<number, Fruit>();
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

    // Lighting — needed for MeshStandardMaterial to show color.
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
      // Re-seeding mid-game wipes accumulator + reroll; rarely needed in play.
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
    const dt = Math.min(0.05, (nowMs - last) / 1000); // clamp to 50ms to survive tab pauses
    this.lastTickMs = nowMs;

    // Spawn
    const newFruits = this.spawner.tick(dt);
    for (const f of newFruits) {
      const id = this.nextId++;
      this.fruits.set(id, f);
      this.scene.add(f.mesh);
    }

    // Update + cull
    for (const [id, f] of this.fruits) {
      f.update(dt, this.tuning.gravity);
      if (f.mesh.position.y < DESPAWN_Y || Math.abs(f.mesh.position.x) > 8) {
        f.alive = false;
        this.scene.remove(f.mesh);
        f.dispose();
        this.fruits.delete(id);
      }
    }

    // Hitboxes (used by Phase 3+ slicing; exposed now so we can debug-draw them)
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

    return { fruitCount: this.fruits.size, hitboxes };
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
    this.renderer.dispose();
  }
}
