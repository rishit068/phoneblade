/**
 * Mulberry32 — a tiny seeded PRNG. Deterministic from a uint32 seed.
 *
 * Used so the fruit spawn stream is reproducible from a seed. That keeps
 * the door open for an authoritative-server multiplayer model later:
 * every peer ticking the same seed produces the same spawn timeline.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function range(rng: () => number, min: number, max: number): number {
  return min + (max - min) * rng();
}

export function pick<T>(rng: () => number, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length) % items.length];
}
