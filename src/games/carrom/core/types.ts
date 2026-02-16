// ============================================================================
// CARROM GAME ENGINE - TYPES
// AAA Mobile Game Quality - Rovio/Clash of Clans Standard
// ============================================================================

export type PlayerId = 0 | 1 | 2 | 3;
export type TeamId = 0 | 1;

export type CoinType = "white" | "black" | "queen" | "striker" | "red";

export type GamePhase = 
  | "menu"
  | "lobby" 
  | "aim" 
  | "simulate" 
  | "resolve" 
  | "break" 
  | "gameover"
  | "paused";

export type QueenState = "center" | "taken" | "covered" | "pending_cover";

export interface Vector2 {
  x: number;
  y: number;
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

// Spin component for realistic physics
export interface Spin {
  x: number;  // topspin/backspin
  y: number;  // sidespin
  z: number;  // rotational velocity
}

export interface Body {
  id: string;
  type: CoinType;
  pos: Vector2;
  vel: Vector2;
  radius: number;
  mass: number;
  active: boolean;
  owner?: PlayerId;
  
  // Advanced physics properties
  spin?: Spin;
  angularVel?: number;
  restitution?: number;
  friction?: number;
  
  // Visual properties
  visualScale?: number;
  shadowOffset?: Vector2;
}

export interface Pocket {
  id: number;
  pos: Vector2;
  radius: number;
  corner: "tl" | "tr" | "bl" | "br";
}

export interface Cushion {
  id: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  normal: Vector2;
  restitution: number;
}

export interface Board {
  width: number;
  height: number;
  pocketRadius: number;
  baselineY: number;  // Striker baseline position
  centerCircleRadius: number;
  pockets: Pocket[];
  cushions: Cushion[];
}

export interface ShotInput {
  angle: number;           // radians, 0 = right
  power: number;           // 0-1 normalized
  spin?: Spin;             // optional spin
  strikerPos?: Vector2;    // striker placement
}

export interface ShotResult {
  pocketed: Body[];
  foul: boolean;
  foulType?: FoulType;
  queenCovered: boolean;
  queenPending: boolean;
  breakShot: boolean;
  consecutivePockets: number;
  strikerPocketed: boolean;
}

export type FoulType = 
  | "striker_pocketed"
  | "no_coin_hit"
  | "opponent_coin_only"
  | "queer_not_covered"
  | "invalid_break"
  | "time_out";

export interface TurnResult {
  shot: ShotResult;
  nextPlayer: PlayerId;
  turnChanged: boolean;
  bonusTurn: boolean;
  scores: Record<PlayerId, number>;
}

export interface Player {
  id: PlayerId;
  name: string;
  team: TeamId;
  coinType: CoinType;
  score: number;
  isBot: boolean;
  botDifficulty?: BotDifficulty;
  consecutiveMisses: number;
  totalShots: number;
  successfulShots: number;
}

export type BotDifficulty = "easy" | "medium" | "hard" | "expert" | "grandmaster";

export interface GameConfig {
  maxPlayers: number;
  winningScore: number;
  queenRequired: boolean;
  timeLimit: number;       // seconds per turn
  breakPowerMin: number;
  enableSpin: boolean;
  enablePrediction: boolean;
  subSteps: number;
  deterministic: boolean;
  seed?: number;
}

export interface GameState {
  // Core game data
  bodies: Body[];
  players: Player[];
  currentPlayer: PlayerId;
  scores: Record<PlayerId, number>;
  
  // Game flow
  phase: GamePhase;
  turn: number;
  turnStartTime: number;
  
  // Queen mechanics
  queenState: QueenState;
  queenOwner?: PlayerId;
  
  // Board configuration
  board: Board;
  
  // Deterministic sync
  seed: number;
  frame: number;
  hash: string;           // State hash for anti-cheat
  
  // History for replay
  history: FrameState[];
  shots: ShotRecord[];
  
  // Config
  config: GameConfig;
  
  // Metadata
  createdAt: number;
  lastUpdate: number;
}

// For replay system
export interface FrameState {
  frame: number;
  bodies: SerializedBody[];
  hash: string;
}

export interface SerializedBody {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  active: boolean;
  spin?: [number, number, number];
}

export interface ShotRecord {
  frame: number;
  player: PlayerId;
  input: ShotInput;
  result: ShotResult;
  duration: number;       // ms
}

// Prediction system
export interface PredictionPoint {
  pos: Vector2;
  time: number;
  collision?: boolean;
  collisionType?: "coin" | "cushion" | "pocket";
}

export interface AimPrediction {
  path: PredictionPoint[];
  confidence: number;     // 0-1 based on physics uncertainty
  targetCoin?: Body;
  targetPocket?: Pocket;
  suggestedPower: number;
  suggestedSpin?: Spin;
}

// AI types
export interface AIMonteCarloResult {
  input: ShotInput;
  successRate: number;
  expectedValue: number;
  simulations: number;
  bestOutcome: ShotResult;
  confidence: number;
}

export interface AIEvaluation {
  score: number;
  pocketedCoins: number;
  queenPocketed: boolean;
  queenCovered: boolean;
  foulRisk: number;
  positionAdvantage: number;
}

// Network types
export interface NetworkInput {
  playerId: PlayerId;
  frame: number;
  input: ShotInput;
  hash: string;
  timestamp: number;
}

export interface LockstepFrame {
  frame: number;
  inputs: NetworkInput[];
  stateHash: string;
  confirmed: boolean;
}

export interface GameSnapshot {
  frame: number;
  state: GameState;
  checksum: string;
}

// Visual/FX types
export interface CollisionEvent {
  bodyA: Body;
  bodyB: Body;
  point: Vector2;
  impulse: number;
  type: "coin-coin" | "coin-cushion" | "coin-striker";
}

export interface PocketEvent {
  body: Body;
  pocket: Pocket;
  frame: number;
}

// Statistics
export interface PlayerStats {
  gamesPlayed: number;
  gamesWon: number;
  totalShots: number;
  accuracy: number;
  queenCoverage: number;
  breakSuccess: number;
  averageShotTime: number;
  highestScore: number;
}
