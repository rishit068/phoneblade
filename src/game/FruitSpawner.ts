import * as THREE from "three";
import { Fruit } from "./Fruit";
import { mulberry32, pick, range } from "./prng";
import { FRUIT_KINDS } from "./types";

export interface SpawnerOptions {
  seed: number;
  spawnRate: number;
}

/**
 * Deterministic spawner. Given the same seed and the same dt-tick sequence,
 * produces the same Fruit timeline — a property we'll lean on later when
 * adding authoritative-server multiplayer.
 */
export class FruitSpawner {
  private rng: () => number;
  private accumulator = 0;
  private spawnInterval: number;
  /** Total elapsed game time, used for future difficulty ramps. */
  elapsed = 0;

  constructor(opts: SpawnerOptions) {
    this.rng = mulberry32(opts.seed);
    this.spawnInterval = 1 / Math.max(0.01, opts.spawnRate);
  }

  setSpawnRate(rate: number): void {
    this.spawnInterval = 1 / Math.max(0.01, rate);
  }

  /**
   * Advance the spawner. Returns any new Fruit instances created this tick.
   * The caller is responsible for adding their meshes to the scene.
   */
  tick(dt: number): Fruit[] {
    this.elapsed += dt;
    this.accumulator += dt;
    const out: Fruit[] = [];
    while (this.accumulator >= this.spawnInterval) {
      this.accumulator -= this.spawnInterval;
      out.push(this.makeFruit());
    }
    return out;
  }

  private makeFruit(): Fruit {
    const kind = pick(this.rng, FRUIT_KINDS);

    // Launch from below the visible frame, arcing across.
    const launchX = range(this.rng, -2.5, 2.5);
    const z = range(this.rng, -1.5, 0.8);
    const position = new THREE.Vector3(launchX, -3.2, z);

    // Aim roughly toward the upper half of the play area.
    const targetX = range(this.rng, -1.8, 1.8);
    const peakY = range(this.rng, 1.0, 2.2);
    const flightTime = range(this.rng, 1.3, 1.9);
    // Solve for initial velocity to reach (targetX, peakY) at apex.
    // peakY = y0 + vy*t - 0.5*g*t² ; apex when vy_remaining = 0 → t_peak = vy/g
    // Use a fixed gravity assumption here (matches GameTuning default 7.0).
    const g = 7.0;
    const t = flightTime * 0.5; // time to apex ≈ half flight
    const vy = (peakY - position.y) / t + 0.5 * g * t;
    const vx = (targetX - position.x) / flightTime;
    const vz = range(this.rng, -0.3, 0.3);

    const angVel = new THREE.Vector3(
      range(this.rng, -3, 3),
      range(this.rng, -3, 3),
      range(this.rng, -2, 2),
    );

    const radius = range(this.rng, 0.32, 0.55);

    return new Fruit({
      kind,
      position,
      velocity: new THREE.Vector3(vx, vy, vz),
      angularVelocity: angVel,
      radius,
    });
  }
}
