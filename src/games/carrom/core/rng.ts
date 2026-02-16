// ============================================================================
// CARROM GAME ENGINE - DETERMINISTIC RNG
// AAA Mobile Game Quality - Rovio/Clash of Clans Standard
// 
// Mulberry32: Fast, high-quality 32-bit PRNG
// Perfect for lockstep multiplayer - same seed = same sequence on all clients
// ============================================================================

export class DeterministicRNG {
  private state: number;
  private initialSeed: number;
  private callCount: number = 0;

  constructor(seed: number = Date.now()) {
    this.initialSeed = seed;
    this.state = seed;
  }

  // Mulberry32 algorithm - excellent distribution, fast
  next(): number {
    this.callCount++;
    let z = (this.state += 0x6D2B79F5);
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  }

  // Get integer in range [min, max]
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  // Get float in range [min, max)
  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  // Get boolean with given probability
  nextBool(probability: number = 0.5): boolean {
    return this.next() < probability;
  }

  // Get random item from array
  nextItem<T>(array: T[]): T {
    return array[this.nextInt(0, array.length - 1)];
  }

  // Shuffle array in place (Fisher-Yates)
  shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  // Gaussian random (Box-Muller transform)
  nextGaussian(mean: number = 0, stdDev: number = 1): number {
    const u1 = this.next();
    const u2 = this.next();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z * stdDev;
  }

  // Perturb a value with noise
  perturb(value: number, amount: number): number {
    return value + (this.next() - 0.5) * 2 * amount;
  }

  // Random angle in radians
  nextAngle(): number {
    return this.next() * Math.PI * 2;
  }

  // Random point in circle
  nextPointInCircle(radius: number = 1): { x: number; y: number } {
    const r = radius * Math.sqrt(this.next());
    const theta = this.nextAngle();
    return {
      x: r * Math.cos(theta),
      y: r * Math.sin(theta),
    };
  }

  // Random point on circle edge
  nextPointOnCircle(radius: number = 1): { x: number; y: number } {
    const theta = this.nextAngle();
    return {
      x: radius * Math.cos(theta),
      y: radius * Math.sin(theta),
    };
  }

  // Reset to initial seed
  reset(): void {
    this.state = this.initialSeed;
    this.callCount = 0;
  }

  // Get current state for serialization
  getState(): { seed: number; calls: number } {
    return {
      seed: this.initialSeed,
      calls: this.callCount,
    };
  }

  // Restore state from serialization
  setState(state: { seed: number; calls: number }): void {
    this.initialSeed = state.seed;
    this.state = state.seed;
    this.callCount = 0;
    // Advance to previous position
    for (let i = 0; i < state.calls; i++) {
      this.next();
    }
  }

  // Create a new RNG from current state (for branching)
  branch(): DeterministicRNG {
    const newRng = new DeterministicRNG(this.state);
    newRng.callCount = 0;
    return newRng;
  }

  // Hash function for state verification
  static hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  // Generate seed from multiple sources
  static generateSeed(...sources: (string | number)[]): number {
    const combined = sources.join('|');
    return DeterministicRNG.hashString(combined);
  }
}

// Global RNG instance for the game
let globalRNG: DeterministicRNG | null = null;

export function initGlobalRNG(seed?: number): DeterministicRNG {
  globalRNG = new DeterministicRNG(seed);
  return globalRNG;
}

export function getGlobalRNG(): DeterministicRNG {
  if (!globalRNG) {
    globalRNG = new DeterministicRNG();
  }
  return globalRNG;
}

export function setGlobalRNG(rng: DeterministicRNG): void {
  globalRNG = rng;
}

// Seeded random functions that use global RNG
export const SeededRandom = {
  next: (): number => getGlobalRNG().next(),
  nextInt: (min: number, max: number): number => getGlobalRNG().nextInt(min, max),
  nextFloat: (min: number, max: number): number => getGlobalRNG().nextFloat(min, max),
  nextBool: (prob: number = 0.5): boolean => getGlobalRNG().nextBool(prob),
  nextItem: <T>(arr: T[]): T => getGlobalRNG().nextItem(arr),
  shuffle: <T>(arr: T[]): T[] => getGlobalRNG().shuffle([...arr]),
  nextGaussian: (mean: number = 0, stdDev: number = 1): number => 
    getGlobalRNG().nextGaussian(mean, stdDev),
  perturb: (value: number, amount: number): number => 
    getGlobalRNG().perturb(value, amount),
};

// Utility for deterministic physics variations
export const PhysicsVariation = {
  // Small random offset for break setup (simulates hand placement variance)
  breakPositionOffset: (maxOffset: number = 2): { x: number; y: number } => {
    return getGlobalRNG().nextPointInCircle(maxOffset);
  },

  // Slight power variation (simulates human inconsistency)
  powerVariation: (basePower: number, variance: number = 0.05): number => {
    return Num.clamp(
      getGlobalRNG().perturb(basePower, variance),
      0,
      1
    );
  },

  // Aim jitter for AI mistakes
  aimJitter: (baseAngle: number, maxJitter: number): number => {
    return baseAngle + (getGlobalRNG().next() - 0.5) * 2 * maxJitter;
  },
};

import { Num } from "../utils/math";
