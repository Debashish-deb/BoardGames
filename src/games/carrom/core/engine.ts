// ============================================================================
// CARROM GAME ENGINE - MAIN GAME ENGINE
// AAA Mobile Game Quality - Rovio/Clash of Clans Standard
//
// Features:
// - Complete game lifecycle management
// - Shot execution with physics simulation
// - Turn resolution
// - State management
// - Event system
// ============================================================================

import { 
  GameState, 
  Body, 
  ShotInput, 
  Player, 
  GamePhase,
  PlayerId,
  Board,
  Pocket,
  Cushion,
  CollisionEvent,
  PocketEvent
} from "./types";
import { PhysicsWorld, createBody, createCushion, createPocket } from "./physics";
import { RuleEngine } from "./rules";
import { 
  BOARD, 
  COIN_CONFIG, 
  INITIAL_COIN_LAYOUT, 
  POCKET_POSITIONS,
  DEFAULT_GAME_CONFIG,
  PHYSICS
} from "./constants";
import { Vec2, Num } from "../utils/math";
import { DeterministicRNG, getGlobalRNG, initGlobalRNG } from "./rng";
import { StateHasher, FrameRecorder, ShotRecorder } from "./serializer";

// Event callbacks
export interface GameEvents {
  onShotStart?: (player: PlayerId, input: ShotInput) => void;
  onShotEnd?: (result: import("./types").ShotResult) => void;
  onTurnChange?: (from: PlayerId, to: PlayerId) => void;
  onCoinPocketed?: (coin: Body, pocket: Pocket) => void;
  onFoul?: (type: import("./types").FoulType, player: PlayerId) => void;
  onQueenCovered?: (player: PlayerId) => void;
  onGameOver?: (winner: PlayerId, reason: string) => void;
  onCollision?: (event: CollisionEvent) => void;
  onPhaseChange?: (from: GamePhase, to: GamePhase) => void;
}

export class CarromEngine {
  state: GameState;
  physics: PhysicsWorld;
  rules: RuleEngine;
  events: GameEvents;
  
  // Timing
  private lastUpdateTime: number = 0;
  private accumulator: number = 0;
  private fixedDt: number = PHYSICS.FIXED_DT;
  
  // Recording
  private frameRecorder: FrameRecorder;
  private shotRecorder: ShotRecorder;
  
  // Shot tracking
  private shotStartTime: number = 0;
  private shotStartFrame: number = 0;
  private currentShotInput: ShotInput | null = null;

  constructor(
    players: Player[],
    seed?: number,
    events: GameEvents = {}
  ) {
    this.events = events;
    
    // Initialize RNG
    initGlobalRNG(seed);
    
    // Create board
    const board = this.createBoard();
    
    // Initialize game state
    this.state = {
      bodies: this.createInitialBodies(board),
      players: players.map(p => ({ ...p, score: 0, consecutiveMisses: 0, totalShots: 0, successfulShots: 0 })),
      currentPlayer: 0 as PlayerId,
      scores: { 0: 0, 1: 0, 2: 0, 3: 0 },
      phase: "break",
      turn: 1,
      turnStartTime: Date.now(),
      queenState: "center",
      board,
      seed: seed ?? Date.now(),
      frame: 0,
      hash: "",
      history: [],
      shots: [],
      config: DEFAULT_GAME_CONFIG,
      createdAt: Date.now(),
      lastUpdate: Date.now(),
    };
    
    // Initialize physics
    this.physics = new PhysicsWorld({
      subSteps: this.state.config.subSteps,
      enableSpin: this.state.config.enableSpin,
    });
    this.physics.bodies = this.state.bodies;
    this.physics.cushions = board.cushions;
    this.physics.pockets = board.pockets;
    
    // Initialize rules
    this.rules = new RuleEngine(this.state);
    
    // Initialize recorders
    this.frameRecorder = new FrameRecorder();
    this.shotRecorder = new ShotRecorder();
    
    // Initial hash
    this.updateStateHash();
  }

  private createBoard(): Board {
    const width = BOARD.WIDTH;
    const height = BOARD.HEIGHT;
    const pocketRadius = BOARD.POCKET_RADIUS;
    
    // Create pockets
    const pockets: Pocket[] = POCKET_POSITIONS.map((pos, i) => 
      createPocket(
        i,
        pos.x * width,
        pos.y * height,
        pocketRadius,
        pos.corner
      )
    );
    
    // Create cushions
    const cushionPadding = pocketRadius * 1.5;
    const cushions: Cushion[] = [
      // Top
      createCushion(0, cushionPadding, 0, width - cushionPadding, 0),
      // Right
      createCushion(1, width, cushionPadding, width, height - cushionPadding),
      // Bottom
      createCushion(2, width - cushionPadding, height, cushionPadding, height),
      // Left
      createCushion(3, 0, height - cushionPadding, 0, cushionPadding),
    ];
    
    return {
      width,
      height,
      pocketRadius,
      baselineY: BOARD.BASELINE_OFFSET,
      centerCircleRadius: BOARD.CENTER_CIRCLE_RADIUS,
      pockets,
      cushions,
    };
  }

  private createInitialBodies(board: Board): Body[] {
    const bodies: Body[] = [];
    const centerX = board.width / 2;
    const centerY = board.height / 2;
    const rng = getGlobalRNG();
    
    // Create queen at center
    bodies.push(createBody(
      "queen",
      "queen",
      { x: centerX, y: centerY },
      COIN_CONFIG.QUEEN.radius,
      COIN_CONFIG.QUEEN.mass,
      { restitution: COIN_CONFIG.QUEEN.restitution, friction: COIN_CONFIG.QUEEN.friction }
    ));
    
    // Create inner circle coins
    for (const coin of INITIAL_COIN_LAYOUT.inner) {
      const offset = rng.nextPointInCircle(0.5);
      bodies.push(createBody(
        `coin_${bodies.length}`,
        coin.type,
        { 
          x: centerX + coin.x + offset.x, 
          y: centerY + coin.y + offset.y 
        },
        COIN_CONFIG.WHITE.radius,
        COIN_CONFIG.WHITE.mass,
        { restitution: COIN_CONFIG.WHITE.restitution, friction: COIN_CONFIG.WHITE.friction }
      ));
    }
    
    // Create outer circle coins
    for (const coin of INITIAL_COIN_LAYOUT.outer) {
      const offset = rng.nextPointInCircle(0.5);
      bodies.push(createBody(
        `coin_${bodies.length}`,
        coin.type,
        { 
          x: centerX + coin.x + offset.x, 
          y: centerY + coin.y + offset.y 
        },
        COIN_CONFIG.BLACK.radius,
        COIN_CONFIG.BLACK.mass,
        { restitution: COIN_CONFIG.BLACK.restitution, friction: COIN_CONFIG.BLACK.friction }
      ));
    }
    
    // Create striker (initially inactive, positioned on break)
    const striker = createBody(
      "striker",
      "striker",
      { x: centerX, y: board.baselineY },
      COIN_CONFIG.STRIKER.radius,
      COIN_CONFIG.STRIKER.mass,
      { restitution: COIN_CONFIG.STRIKER.restitution, friction: COIN_CONFIG.STRIKER.friction }
    );
    bodies.push(striker);
    
    return bodies;
  }

  // Place striker for shot
  placeStriker(position: { x: number; y: number }): boolean {
    if (this.state.phase !== "aim" && this.state.phase !== "break") {
      return false;
    }
    
    if (!this.rules.validateStrikerPosition(position)) {
      return false;
    }
    
    const striker = this.getStriker();
    striker.pos = Vec2.clone(position);
    
    return true;
  }

  // Execute a shot
  applyShot(input: ShotInput): boolean {
    if (this.state.phase !== "aim" && this.state.phase !== "break") {
      return false;
    }
    
    // Validate break power
    if (this.state.phase === "break") {
      const breakValidation = this.rules.validateBreak(input.power);
      if (!breakValidation.valid) {
        return false;
      }
    }
    
    const striker = this.getStriker();
    
    // Apply striker position if provided
    if (input.strikerPos) {
      if (!this.placeStriker(input.strikerPos)) {
        return false;
      }
    }
    
    // Calculate shot velocity
    const maxSpeed = 25; // Maximum striker speed
    const speed = input.power * maxSpeed;
    
    striker.vel.x = Math.cos(input.angle) * speed;
    striker.vel.y = Math.sin(input.angle) * speed;
    
    // Apply spin if enabled
    if (this.state.config.enableSpin && input.spin) {
      striker.spin = { ...input.spin };
    }
    
    // Track shot
    this.currentShotInput = input;
    this.shotStartTime = Date.now();
    this.shotStartFrame = this.state.frame;
    
    // Change phase
    this.setPhase("simulate");
    
    // Emit event
    this.events.onShotStart?.(this.state.currentPlayer, input);
    
    return true;
  }

  // Main update loop
  update(deltaTime: number): void {
    const now = Date.now();
    this.state.lastUpdate = now;
    
    // Fixed timestep with accumulator
    this.accumulator += deltaTime;
    
    while (this.accumulator >= this.fixedDt) {
      this.fixedUpdate(this.fixedDt);
      this.accumulator -= this.fixedDt;
    }
  }

  private fixedUpdate(dt: number): void {
    if (this.state.phase === "simulate") {
      // Step physics
      this.physics.step(dt);
      
      // Emit collision events
      for (const event of this.physics.collisionEvents) {
        this.events.onCollision?.(event);
      }
      
      // Emit pocket events
      for (const event of this.physics.pocketEvents) {
        this.events.onCoinPocketed?.(event.body, event.pocket);
      }
      
      // Check if simulation complete
      if (this.physics.allStopped()) {
        this.endShot();
      }
    }
    
    // Increment frame counter
    this.state.frame++;
    
    // Record frame for replay
    this.frameRecorder.recordFrame(this.state);
    
    // Update state hash
    this.updateStateHash();
  }

  private endShot(): void {
    const pocketed = this.physics.pocketEvents.map(e => e.body);
    const breakShot = this.state.phase === "break";
    
    // Evaluate shot
    const result = this.rules.evaluateShot(pocketed, breakShot);
    
    // Record shot
    if (this.currentShotInput) {
      this.shotRecorder.recordShot(
        this.shotStartFrame,
        this.state.currentPlayer,
        this.currentShotInput,
        result,
        Date.now() - this.shotStartTime
      );
    }
    
    // Emit events
    this.events.onShotEnd?.(result);
    
    if (result.foul && result.foulType) {
      this.events.onFoul?.(result.foulType, this.state.currentPlayer);
    }
    
    if (result.queenCovered) {
      this.events.onQueenCovered?.(this.state.currentPlayer);
    }
    
    // Resolve turn
    const turnResult = this.rules.resolveTurn(result);
    
    if (turnResult.turnChanged) {
      const prevPlayer = this.state.currentPlayer;
      this.state.currentPlayer = turnResult.nextPlayer;
      this.events.onTurnChange?.(prevPlayer, this.state.currentPlayer);
    }
    
    // Check win condition
    const winCheck = this.rules.checkWinCondition();
    if (winCheck.gameOver) {
      this.setPhase("gameover");
      this.events.onGameOver?.(winCheck.winner!, winCheck.reason);
      return;
    }
    
    // Reset striker
    this.resetStriker();
    
    // Change phase
    this.state.turn++;
    this.state.turnStartTime = Date.now();
    this.setPhase("aim");
    
    // Clear current shot
    this.currentShotInput = null;
  }

  private resetStriker(): void {
    const striker = this.getStriker();
    striker.active = true;
    striker.vel = Vec2.zero();
    striker.spin = { x: 0, y: 0, z: 0 };
    striker.angularVel = 0;
    
    // Position striker for next player
    const validPos = this.rules.getValidStrikerPositions();
    striker.pos = { 
      x: validPos.minX + (validPos.maxX - validPos.minX) / 2, 
      y: validPos.y 
    };
  }

  private setPhase(newPhase: GamePhase): void {
    const oldPhase = this.state.phase;
    this.state.phase = newPhase;
    this.events.onPhaseChange?.(oldPhase, newPhase);
  }

  private updateStateHash(): void {
    this.state.hash = StateHasher.hashState(this.state);
  }

  // Getters
  getStriker(): Body {
    return this.state.bodies.find(b => b.type === "striker")!;
  }

  getCurrentPlayer(): Player {
    return this.state.players.find(p => p.id === this.state.currentPlayer)!;
  }

  getActiveCoins(): Body[] {
    return this.state.bodies.filter(b => b.active && b.type !== "striker");
  }

  getPocketedCoins(): Body[] {
    return this.state.bodies.filter(b => !b.active && b.type !== "striker");
  }

  getScore(playerId: PlayerId): number {
    return this.state.scores[playerId] || 0;
  }

  // State management
  getState(): GameState {
    return this.state;
  }

  setState(state: GameState): void {
    this.state = state;
    this.physics.bodies = state.bodies;
  }

  // Replay data
  getReplayData(): { frames: import("./types").FrameState[]; shots: import("./types").ShotRecord[] } {
    return {
      frames: this.frameRecorder.getFrames(),
      shots: this.shotRecorder.getShots(),
    };
  }

  // Statistics
  getStatistics(): {
    totalShots: number;
    successfulShots: number;
    fouls: number;
    totalCollisions: number;
  } {
    const ruleStats = this.rules.getStatistics();
    return {
      ...ruleStats,
      totalCollisions: this.physics.totalCollisions,
    };
  }

  // Debug
  getDebugInfo(): {
    phase: GamePhase;
    frame: number;
    bodyCount: number;
    activeBodies: number;
    hash: string;
  } {
    return {
      phase: this.state.phase,
      frame: this.state.frame,
      bodyCount: this.state.bodies.length,
      activeBodies: this.physics.getActiveBodies().length,
      hash: this.state.hash,
    };
  }
}

// Factory function for creating new game
export function createGame(
  playerNames: string[],
  options: {
    seed?: number;
    enableSpin?: boolean;
    subSteps?: number;
    events?: GameEvents;
  } = {}
): CarromEngine {
  const players: Player[] = playerNames.map((name, i) => ({
    id: i as PlayerId,
    name,
    team: (i % 2) as 0 | 1,
    coinType: i % 2 === 0 ? "white" : "black",
    score: 0,
    isBot: false,
    consecutiveMisses: 0,
    totalShots: 0,
    successfulShots: 0,
  }));

  return new CarromEngine(players, options.seed, options.events);
}

// Factory for bot games
export function createBotGame(
  playerName: string,
  botDifficulty: import("./types").BotDifficulty = "medium",
  options: {
    seed?: number;
    events?: GameEvents;
  } = {}
): CarromEngine {
  const players: Player[] = [
    {
      id: 0,
      name: playerName,
      team: 0,
      coinType: "white",
      score: 0,
      isBot: false,
      consecutiveMisses: 0,
      totalShots: 0,
      successfulShots: 0,
    },
    {
      id: 1,
      name: `Bot (${botDifficulty})`,
      team: 1,
      coinType: "black",
      score: 0,
      isBot: true,
      botDifficulty,
      consecutiveMisses: 0,
      totalShots: 0,
      successfulShots: 0,
    },
  ];

  return new CarromEngine(players, options.seed, options.events);
}
