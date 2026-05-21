import type * as THREE from "three";

export type FruitKind = "apple" | "orange" | "watermelon";

export const FRUIT_KINDS: readonly FruitKind[] = ["apple", "orange", "watermelon"];

/** Hitbox in screen-space pixels — circle approximation of the fruit's bounding sphere. */
export interface ScreenHitbox {
  cx: number;
  cy: number;
  r: number;
}

export interface SpawnParams {
  kind: FruitKind;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  angularVelocity: THREE.Vector3;
  radius: number;
}

export interface GameTuning {
  /** Fruits per second at game start. */
  spawnRate: number;
  /** Gravity in world units / sec². */
  gravity: number;
  /** Random seed for the spawner. Change to roll a different sequence. */
  seed: number;
  /** Show debug hitbox circles over each fruit. */
  showHitboxes: boolean;
}

export const DEFAULT_GAME_TUNING: GameTuning = {
  spawnRate: 1.0,
  gravity: 7.0,
  seed: 0xC0FFEE ^ Math.floor(Date.now() % 0xFFFF),
  showHitboxes: false,
};
