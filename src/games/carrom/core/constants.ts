// ============================================================================
// CARROM GAME ENGINE - CONSTANTS
// AAA Mobile Game Quality - Rovio/Clash of Clans Standard
// ============================================================================

// Board dimensions (in game units, typically pixels)
export const BOARD = {
  WIDTH: 800,
  HEIGHT: 800,
  PADDING: 50,
  POCKET_RADIUS: 22,
  BASELINE_OFFSET: 70,        // Distance from edge to striker baseline
  CENTER_CIRCLE_RADIUS: 75,
  COIN_RADIUS: 12.5,
  STRIKER_RADIUS: 17.5,
  CUSHION_WIDTH: 15,
  
  // Real-world scale (for physics accuracy)
  REAL_WIDTH_MM: 737,         // Standard carrom board
  REAL_HEIGHT_MM: 737,
  REAL_COIN_DIAMETER_MM: 31,
  REAL_STRIKER_DIAMETER_MM: 41,
} as const;

// Coin configuration
export const COIN_CONFIG = {
  WHITE: {
    count: 9,
    points: 1,
    mass: 1,
    radius: BOARD.COIN_RADIUS,
    restitution: 0.92,
    friction: 0.985,
  },
  BLACK: {
    count: 9,
    points: 1,
    mass: 1,
    radius: BOARD.COIN_RADIUS,
    restitution: 0.92,
    friction: 0.985,
  },
  QUEEN: {
    count: 1,
    points: 3,
    mass: 1,
    radius: BOARD.COIN_RADIUS,
    restitution: 0.90,
    friction: 0.985,
  },
  STRIKER: {
    count: 1,
    points: 0,
    mass: 2.5,                // Striker is heavier
    radius: BOARD.STRIKER_RADIUS,
    restitution: 0.88,
    friction: 0.982,
  },
} as const;

// Physics constants
export const PHYSICS = {
  // Time stepping
  FIXED_DT: 1 / 60,           // 60 FPS
  MAX_SUBSTEPS: 8,            // For fast collisions
  MIN_SUBSTEPS: 1,
  
  // Velocity thresholds
  STOP_EPSILON: 0.05,         // Stop when below this
  MAX_VELOCITY: 50,           // Clamp to prevent tunneling
  
  // Friction
  TABLE_FRICTION: 0.987,      // Surface friction
  ROLLING_FRICTION: 0.995,    // Rolling resistance
  AIR_RESISTANCE: 0.999,      // Minimal air resistance
  
  // Cushion physics
  CUSHION_RESTITUTION: 0.75,
  CUSHION_FRICTION: 0.85,
  
  // Spin physics
  SPIN_DECAY: 0.96,
  SPIN_TRANSFER: 0.3,
  SPIN_EFFECT: 0.4,           // How much spin affects trajectory
  
  // Collision
  COLLISION_RESTITUTION: 0.92,
  COLLISION_SLOP: 0.01,       // Penetration allowance
  
  // Pocket detection
  POCKET_CAPTURE_RADIUS: 1.2, // Multiplier of pocket radius
  POCKET_DEPTH: 20,           // Visual depth
} as const;

// Game rules
export const RULES = {
  // Scoring
  WINNING_SCORE: 25,
  QUEEN_COVER_BONUS: 3,
  FOUL_PENALTY: 1,
  
  // Turn limits
  MAX_TURNS_WITHOUT_SCORE: 3,
  TURN_TIME_LIMIT: 30000,     // 30 seconds
  BREAK_TIME_LIMIT: 45000,    // 45 seconds for break
  
  // Break rules
  BREAK_MIN_POWER: 0.4,
  BREAK_MIN_COINS: 2,         // Minimum coins to hit on break
  
  // Queen rules
  QUEEN_MUST_COVER: true,
  QUEEN_COVER_WINDOW: 1,      // Turns to cover queen
  
  // Foul penalties
  STRIKER_POCKETED_PENALTY: 1,
  NO_COIN_HIT_PENALTY: 0,     // Just turn change
  WRONG_COIN_PENALTY: 1,
} as const;

// AI difficulty settings
export const AI_DIFFICULTY = {
  EASY: {
    aimAccuracy: 0.7,         // 0-1
    powerAccuracy: 0.6,
    spinUsage: 0,
    simulationDepth: 100,
    reactionTime: 2000,       // ms
    mistakeProbability: 0.3,
  },
  MEDIUM: {
    aimAccuracy: 0.85,
    powerAccuracy: 0.75,
    spinUsage: 0.3,
    simulationDepth: 500,
    reactionTime: 1500,
    mistakeProbability: 0.15,
  },
  HARD: {
    aimAccuracy: 0.95,
    powerAccuracy: 0.88,
    spinUsage: 0.6,
    simulationDepth: 2000,
    reactionTime: 1000,
    mistakeProbability: 0.05,
  },
  EXPERT: {
    aimAccuracy: 0.98,
    powerAccuracy: 0.95,
    spinUsage: 0.85,
    simulationDepth: 5000,
    reactionTime: 800,
    mistakeProbability: 0.02,
  },
  GRANDMASTER: {
    aimAccuracy: 0.995,
    powerAccuracy: 0.98,
    spinUsage: 1.0,
    simulationDepth: 10000,
    reactionTime: 500,
    mistakeProbability: 0.005,
  },
} as const;

// Monte Carlo simulation settings
export const MONTE_CARLO = {
  DEFAULT_ITERATIONS: 1000,
  MAX_ITERATIONS: 10000,
  TIME_LIMIT_MS: 100,         // Max time per decision
  POWER_STEPS: 20,
  ANGLE_STEPS: 360,
  SPIN_STEPS: 5,
  
  // Evaluation weights
  WEIGHT_POCKET_COIN: 10,
  WEIGHT_POCKET_QUEEN: 30,
  WEIGHT_COVER_QUEEN: 20,
  WEIGHT_POSITION: 5,
  WEIGHT_FOUL_PENALTY: -50,
  WEIGHT_STRIKER_POCKETED: -40,
} as const;

// Prediction line settings
export const PREDICTION = {
  MAX_BOUNCES: 3,
  MAX_TIME: 3,                // seconds to predict
  POINT_INTERVAL: 5,          // frames between points
  CONFIDENCE_DECAY: 0.9,      // per bounce
  
  // Visual
  LINE_SEGMENTS: 50,
  FADE_START: 0.7,
} as const;

// Network settings
export const NETWORK = {
  LOCKSTEP_INTERVAL: 3,       // frames between sync
  MAX_LATENCY_MS: 200,
  INPUT_DELAY_FRAMES: 2,
  
  // Anti-cheat
  HASH_ALGORITHM: "SHA-256",
  STATE_CHECK_INTERVAL: 10,
  
  // Replay
  REPLAY_SAMPLE_RATE: 10,     // 1 in N frames
  MAX_REPLAY_FRAMES: 60 * 60 * 10, // 10 minutes at 60fps
} as const;

// Visual effects
export const VFX = {
  COLLISION_PARTICLES: 8,
  POCKET_PARTICLES: 15,
  TRAIL_LENGTH: 10,
  
  // Camera
  SHAKE_INTENSITY: 5,
  SHAKE_DECAY: 0.9,
  ZOOM_ON_SHOT: 1.1,
} as const;

// Audio
export const AUDIO = {
  COLLISION_VOLUME: 0.5,
  POCKET_VOLUME: 0.7,
  CUSHION_VOLUME: 0.4,
  
  // Pitch variation for realism
  PITCH_VARIATION: 0.1,
} as const;

// Default game configuration
export const DEFAULT_GAME_CONFIG: import("./types").GameConfig = {
  maxPlayers: 2,
  winningScore: RULES.WINNING_SCORE,
  queenRequired: true,
  timeLimit: RULES.TURN_TIME_LIMIT,
  breakPowerMin: RULES.BREAK_MIN_POWER,
  enableSpin: true,
  enablePrediction: true,
  subSteps: 4,
  deterministic: true,
  seed: Date.now(),
};

// Pocket positions (normalized 0-1, will be scaled by board size)
export const POCKET_POSITIONS = [
  { x: 0, y: 0, corner: "tl" as const },
  { x: 1, y: 0, corner: "tr" as const },
  { x: 0, y: 1, corner: "bl" as const },
  { x: 1, y: 1, corner: "br" as const },
];

// Initial coin positions (relative to center)
export const INITIAL_COIN_LAYOUT = {
  // Queen at exact center
  queen: { x: 0, y: 0 },
  
  // Inner circle (6 coins alternating)
  inner: [
    { x: 0, y: -26, type: "white" as const },
    { x: 22.5, y: -13, type: "black" as const },
    { x: 22.5, y: 13, type: "white" as const },
    { x: 0, y: 26, type: "black" as const },
    { x: -22.5, y: 13, type: "white" as const },
    { x: -22.5, y: -13, type: "black" as const },
  ],
  
  // Outer circle (12 coins alternating)
  outer: [
    { x: 0, y: -52, type: "black" as const },
    { x: 26, y: -45, type: "white" as const },
    { x: 45, y: -26, type: "black" as const },
    { x: 52, y: 0, type: "white" as const },
    { x: 45, y: 26, type: "black" as const },
    { x: 26, y: 45, type: "white" as const },
    { x: 0, y: 52, type: "black" as const },
    { x: -26, y: 45, type: "white" as const },
    { x: -45, y: 26, type: "black" as const },
    { x: -52, y: 0, type: "white" as const },
    { x: -45, y: -26, type: "black" as const },
    { x: -26, y: -45, type: "white" as const },
  ],
};
