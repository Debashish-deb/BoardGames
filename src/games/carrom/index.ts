// ============================================================================
// CARROM GAME ENGINE - MAIN EXPORTS
// AAA Mobile Game Quality - Rovio/Clash of Clans Standard
// ============================================================================

// ============================================================================
// CORE TYPES
// ============================================================================
export type {
  PlayerId,
  TeamId,
  CoinType,
  GamePhase,
  QueenState,
  Vector2,
  Vector3,
  Spin,
  Body,
  Pocket,
  Cushion,
  Board,
  ShotInput,
  ShotResult,
  FoulType,
  TurnResult,
  Player,
  BotDifficulty,
  GameConfig,
  GameState,
  FrameState,
  SerializedBody,
  ShotRecord,
  PredictionPoint,
  AimPrediction,
  AIMonteCarloResult,
  AIEvaluation,
  NetworkInput,
  LockstepFrame,
  GameSnapshot,
  CollisionEvent,
  PocketEvent,
  PlayerStats,
} from "./core/types";

// ============================================================================
// CORE CONSTANTS
// ============================================================================
export {
  BOARD,
  COIN_CONFIG,
  PHYSICS,
  RULES,
  AI_DIFFICULTY,
  MONTE_CARLO,
  PREDICTION,
  NETWORK,
  VFX,
  AUDIO,
  DEFAULT_GAME_CONFIG,
  POCKET_POSITIONS,
  INITIAL_COIN_LAYOUT,
} from "./core/constants";

// ============================================================================
// MATH UTILITIES
// ============================================================================
export {
  Vec2,
  Vec3,
  SpinMath,
  Geometry,
  Num,
  Matrix2,
  PhysicsMath,
} from "./utils/math";

export type { Matrix2x2 } from "./utils/math";

// ============================================================================
// DETERMINISTIC RNG
// ============================================================================
export {
  DeterministicRNG,
  initGlobalRNG,
  getGlobalRNG,
  setGlobalRNG,
  SeededRandom,
  PhysicsVariation,
} from "./core/rng";

// ============================================================================
// PHYSICS ENGINE
// ============================================================================
export {
  PhysicsWorld,
  createBody,
  createCushion,
  createPocket,
  DEFAULT_PHYSICS_CONFIG,
} from "./core/physics";

export type { PhysicsConfig, CollisionPair } from "./core/physics";

// ============================================================================
// GAME RULES
// ============================================================================
export {
  RuleEngine,
  detectPocketed,
  calculateScore,
  isValidBreak,
} from "./core/rules";

// ============================================================================
// STATE SERIALIZER
// ============================================================================
export {
  BinarySerializer,
  StateSerializer,
  StateHasher,
  FrameRecorder,
  ShotRecorder,
  Compression,
} from "./core/serializer";

// ============================================================================
// GAME ENGINE
// ============================================================================
export {
  CarromEngine,
  createGame,
  createBotGame,
} from "./core/engine";

export type { GameEvents } from "./core/engine";

// ============================================================================
// AI BOT
// ============================================================================
export {
  CarromBot,
  computeBotShot,
  BotManager,
} from "./ai/bot";

// ============================================================================
// AIM PREDICTION
// ============================================================================
export {
  AimPredictionEngine,
  predictTrajectory,
  findBestShots,
} from "./ai/prediction";

// ============================================================================
// NETWORK SYNC
// ============================================================================
export {
  LockstepEngine,
  AntiCheatValidator,
  NetworkGameManager,
} from "./net/lockstep";

// ============================================================================
// REPLAY SYSTEM
// ============================================================================
export {
  ReplayRecorder,
  ReplayPlayer,
  SpectatorSystem,
  ReplayExport,
} from "./net/replay";

export type {
  ReplayData,
  ReplayEvent,
  ReplayMetadata,
} from "./net/replay";

// ============================================================================
// VERSION
// ============================================================================
export const VERSION = "1.0.0";
export const ENGINE_NAME = "Carrom Engine Pro";

// ============================================================================
// QUICK START HELPERS
// ============================================================================

import { CarromEngine, createGame, createBotGame } from "./core/engine";
import { GameState, PlayerId, ShotInput } from "./core/types";

/**
 * Quick start: Create a new 2-player game
 */
export function quickStart(
  player1Name: string = "Player 1",
  player2Name: string = "Player 2",
  options: {
    seed?: number;
    enableSpin?: boolean;
  } = {}
): CarromEngine {
  return createGame([player1Name, player2Name], options);
}

/**
 * Quick start: Play against AI
 */
export function quickBotGame(
  playerName: string = "Player",
  difficulty: import("./core/types").BotDifficulty = "medium",
  options: {
    seed?: number;
  } = {}
): CarromEngine {
  return createBotGame(playerName, difficulty, options);
}

/**
 * Simulate a shot and return the result without affecting the game
 */
export function simulateShot(
  state: GameState,
  input: ShotInput
): {
  finalPositions: Array<{ id: string; x: number; y: number; active: boolean }>;
  pocketed: string[];
  duration: number;
} {
  const { PhysicsWorld } = require("./core/physics");
  const { Vec2 } = require("./utils/math");
  const { PHYSICS } = require("./core/constants");

  // Clone bodies
  const bodies = state.bodies.map(b => ({
    ...b,
    pos: Vec2.clone(b.pos),
    vel: Vec2.clone(b.vel),
    spin: b.spin ? { ...b.spin } : undefined,
  }));

  // Create physics world
  const physics = new PhysicsWorld({
    subSteps: state.config.subSteps,
    enableSpin: state.config.enableSpin,
  });
  physics.bodies = bodies;
  physics.cushions = state.board.cushions;
  physics.pockets = state.board.pockets;

  // Apply shot
  const striker = bodies.find((b: any) => b.type === "striker");
  if (striker) {
    const maxSpeed = 25;
    striker.vel.x = Math.cos(input.angle) * input.power * maxSpeed;
    striker.vel.y = Math.sin(input.angle) * input.power * maxSpeed;
    if (input.spin) {
      striker.spin = { ...input.spin };
    }
  }

  // Simulate
  let frames = 0;
  const maxFrames = 300;
  
  while (!physics.allStopped() && frames < maxFrames) {
    physics.step(PHYSICS.FIXED_DT);
    frames++;
  }

  return {
    finalPositions: bodies.map((b: any) => ({
      id: b.id,
      x: b.pos.x,
      y: b.pos.y,
      active: b.active,
    })),
    pocketed: physics.pocketEvents.map((e: any) => e.body.id),
    duration: frames * PHYSICS.FIXED_DT * 1000,
  };
}

// ============================================================================
// DEBUG UTILITIES
// ============================================================================

export const Debug = {
  /**
   * Validate game state integrity
   */
  validateState(state: GameState): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required fields
    if (!state.bodies || state.bodies.length === 0) {
      errors.push("No bodies in state");
    }

    if (!state.players || state.players.length === 0) {
      errors.push("No players in state");
    }

    // Check striker exists
    const striker = state.bodies.find(b => b.type === "striker");
    if (!striker) {
      errors.push("No striker in state");
    }

    // Check queen exists
    const queen = state.bodies.find(b => b.type === "queen");
    if (!queen) {
      errors.push("No queen in state");
    }

    // Check coin counts
    const whiteCoins = state.bodies.filter(b => b.type === "white").length;
    const blackCoins = state.bodies.filter(b => b.type === "black").length;

    if (whiteCoins !== 9) {
      errors.push(`Expected 9 white coins, found ${whiteCoins}`);
    }

    if (blackCoins !== 9) {
      errors.push(`Expected 9 black coins, found ${blackCoins}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },

  /**
   * Print game state summary
   */
  printState(state: GameState): void {
    console.log("=== Game State ===");
    console.log(`Phase: ${state.phase}`);
    console.log(`Frame: ${state.frame}`);
    console.log(`Turn: ${state.turn}`);
    console.log(`Current Player: ${state.currentPlayer}`);
    console.log(`Scores:`, state.scores);
    console.log(`Queen State: ${state.queenState}`);
    console.log(`Active Coins: ${state.bodies.filter(b => b.active && b.type !== "striker").length}`);
    console.log(`Hash: ${state.hash}`);
    console.log("==================");
  },

  /**
   * Measure performance of physics simulation
   */
  benchmarkPhysics(iterations: number = 1000): {
    totalTime: number;
    averageTime: number;
    fps: number;
  } {
    const { PhysicsWorld } = require("./core/physics");
    const { createBody } = require("./core/physics");
    const { PHYSICS } = require("./core/constants");

    const physics = new PhysicsWorld();
    
    // Add some bodies
    for (let i = 0; i < 10; i++) {
      physics.bodies.push(createBody(
        `coin_${i}`,
        i === 0 ? "striker" : "white",
        { x: 100 + i * 30, y: 100 + i * 20 },
        12.5,
        1
      ));
    }

    const start = performance.now();
    
    for (let i = 0; i < iterations; i++) {
      physics.step(PHYSICS.FIXED_DT);
    }

    const end = performance.now();
    const totalTime = end - start;

    return {
      totalTime,
      averageTime: totalTime / iterations,
      fps: 1000 / (totalTime / iterations),
    };
  },
};

// ============================================================================
// DEFAULT EXPORT
// ============================================================================
export default {
  VERSION,
  ENGINE_NAME,
  quickStart,
  quickBotGame,
  simulateShot,
  Debug,
};
