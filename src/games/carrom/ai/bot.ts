// ============================================================================
// CARROM GAME ENGINE - MONTE CARLO AI BOT
// AAA Mobile Game Quality - Rovio/Clash of Clans Standard
//
// Features:
// - Monte Carlo Tree Search for shot selection
// - Difficulty-based decision making
// - Spin optimization
// - Position evaluation
// - Break shot optimization
// ============================================================================

import { 
  GameState, 
  ShotInput, 
  Body, 
  PlayerId, 
  BotDifficulty,
  AIMonteCarloResult,
  AIEvaluation,
  Spin,
  Vector2,
  Pocket
} from "../core/types";
import { PhysicsWorld, createBody } from "../core/physics";
import { RuleEngine } from "../core/rules";
import { 
  AI_DIFFICULTY, 
  MONTE_CARLO, 
  COIN_CONFIG,
  PHYSICS 
} from "../core/constants";
import { Vec2, Num, SpinMath } from "../utils/math";
import { DeterministicRNG } from "../core/rng";

// AI Bot class
export class CarromBot {
  private state: GameState;
  private playerId: PlayerId;
  private difficulty: BotDifficulty;
  private config: (typeof AI_DIFFICULTY)[keyof typeof AI_DIFFICULTY];
  private rng: DeterministicRNG;

  constructor(
    state: GameState,
    playerId: PlayerId,
    difficulty: BotDifficulty = "medium"
  ) {
    this.state = state;
    this.playerId = playerId;
    this.difficulty = difficulty;
    this.config = AI_DIFFICULTY[difficulty.toUpperCase() as keyof typeof AI_DIFFICULTY];
    this.rng = new DeterministicRNG(state.seed + playerId);
  }

  // Main entry: compute best shot
  computeShot(): ShotInput {
    const startTime = Date.now();
    const timeLimit = MONTE_CARLO.TIME_LIMIT_MS;
    
    // Determine shot type
    const isBreak = this.state.phase === "break";
    
    if (isBreak) {
      return this.computeBreakShot();
    }

    // Get my coins
    const myCoins = this.getMyCoins();
    if (myCoins.length === 0) {
      // No coins left, just try to cover queen if needed
      return this.computeQueenCoverShot();
    }

    // Run Monte Carlo simulation
    const result = this.monteCarloSearch(timeLimit);
    
    // Apply difficulty-based noise
    return this.applyDifficultyNoise(result.input);
  }

  // Monte Carlo Tree Search
  private monteCarloSearch(timeLimitMs: number): AIMonteCarloResult {
    const startTime = Date.now();
    const simulations: { input: ShotInput; result: AIEvaluation }[] = [];
    
    // Get candidate shots
    const candidates = this.generateCandidateShots();
    
    // Run simulations
    let iteration = 0;
    while (Date.now() - startTime < timeLimitMs && iteration < this.config.simulationDepth) {
      for (const candidate of candidates) {
        const evaluation = this.simulateShot(candidate);
        simulations.push({ input: candidate, result: evaluation });
      }
      iteration++;
    }

    // Find best shot
    let bestResult = simulations[0];
    let bestScore = -Infinity;
    
    for (const sim of simulations) {
      const score = this.evaluateSimulation(sim.result);
      if (score > bestScore) {
        bestScore = score;
        bestResult = sim;
      }
    }

    // Calculate success rate
    const successfulSims = simulations.filter(s => s.result.pocketedCoins > 0);
    const successRate = successfulSims.length / simulations.length;

    return {
      input: bestResult.input,
      successRate,
      expectedValue: bestScore,
      simulations: simulations.length,
      bestOutcome: {
        pocketed: [],
        foul: false,
        queenCovered: bestResult.result.queenCovered,
        queenPending: false,
        breakShot: false,
        consecutivePockets: bestResult.result.pocketedCoins,
        strikerPocketed: false,
      },
      confidence: successRate,
    };
  }

  // Generate candidate shots
  private generateCandidateShots(): ShotInput[] {
    const candidates: ShotInput[] = [];
    const myCoins = this.getMyCoins();
    const striker = this.getStriker();
    const pockets = this.state.board.pockets;
    
    // For each of my coins
    for (const coin of myCoins.slice(0, 3)) { // Limit to first 3 coins for performance
      // For each pocket
      for (const pocket of pockets) {
        // Calculate direct shot
        const directShot = this.calculateDirectShot(coin, pocket, striker);
        if (directShot) {
          candidates.push(directShot);
        }
        
        // Calculate bank shots (1-2 cushions)
        const bankShots = this.calculateBankShots(coin, pocket, striker);
        candidates.push(...bankShots);
      }
    }
    
    // Add queen cover shots if needed
    if (this.state.queenState === "pending_cover" && 
        this.state.queenOwner === this.playerId) {
      const queen = this.getQueen();
      if (queen) {
        for (const pocket of pockets) {
          const coverShot = this.calculateDirectShot(queen, pocket, striker);
          if (coverShot) {
            candidates.push(coverShot);
          }
        }
      }
    }

    return candidates.slice(0, 50); // Limit candidates
  }

  // Calculate direct shot to pocket a coin
  private calculateDirectShot(
    targetCoin: Body,
    pocket: Pocket,
    striker: Body
  ): ShotInput | null {
    // Calculate where striker needs to hit coin
    const pocketToCoin = Vec2.sub(targetCoin.pos, pocket.pos);
    const pocketToCoinDir = Vec2.normalize(pocketToCoin);
    
    // Aim point is on the opposite side of coin from pocket
    const aimPoint = Vec2.add(
      targetCoin.pos,
      Vec2.mul(pocketToCoinDir, targetCoin.radius + striker.radius + 1)
    );
    
    // Calculate angle from striker position
    const strikerToAim = Vec2.sub(aimPoint, striker.pos);
    const angle = Vec2.angle(strikerToAim);
    
    // Calculate power based on distance
    const distance = Vec2.length(strikerToAim);
    const power = Num.clamp(distance / 400, 0.3, 0.9);
    
    // Check if path is clear
    if (!this.isPathClear(striker.pos, aimPoint, targetCoin)) {
      return null;
    }

    // Calculate optimal spin
    const spin = this.calculateOptimalSpin(targetCoin, pocket);

    return {
      angle,
      power,
      spin,
      strikerPos: striker.pos,
    };
  }

  // Calculate bank shots (off cushions)
  private calculateBankShots(
    targetCoin: Body,
    pocket: Pocket,
    striker: Body
  ): ShotInput[] {
    const shots: ShotInput[] = [];
    const cushions = this.state.board.cushions;
    
    // Try one-cushion banks
    for (const cushion of cushions) {
      const reflection = this.calculateCushionReflection(
        targetCoin.pos,
        pocket.pos,
        cushion
      );
      
      if (reflection) {
        const strikerToReflection = Vec2.sub(reflection, striker.pos);
        const angle = Vec2.angle(strikerToReflection);
        const distance = Vec2.length(strikerToReflection) + 
                        Vec2.distance(reflection, targetCoin.pos);
        const power = Num.clamp(distance / 350, 0.4, 0.95);
        
        if (this.isPathClear(striker.pos, reflection, null)) {
          shots.push({
            angle,
            power,
            spin: { x: 0.2, y: 0, z: 0 }, // Add topspin for cushion
            strikerPos: striker.pos,
          });
        }
      }
    }
    
    return shots.slice(0, 4); // Limit bank shots
  }

  // Calculate reflection point on cushion
  private calculateCushionReflection(
    source: Vector2,
    target: Vector2,
    cushion: import("../core/types").Cushion
  ): Vector2 | null {
    // Mirror target across cushion line
    const cushionVec = Vec2.sub(
      { x: cushion.x2, y: cushion.y2 },
      { x: cushion.x1, y: cushion.y1 }
    );
    const cushionLen = Vec2.length(cushionVec);
    const cushionDir = Vec2.div(cushionVec, cushionLen);
    const cushionNormal = Vec2.perpendicular(cushionDir);
    
    // Project target onto cushion
    const toTarget = Vec2.sub(target, { x: cushion.x1, y: cushion.y1 });
    const distToCushion = Vec2.dot(toTarget, cushionNormal);
    
    // Mirror
    const mirroredTarget = Vec2.sub(
      target,
      Vec2.mul(cushionNormal, distToCushion * 2)
    );
    
    // Find intersection of source-mirroredTarget with cushion
    const sourceToMirror = Vec2.sub(mirroredTarget, source);
    const sourceToCushion = Vec2.sub({ x: cushion.x1, y: cushion.y1 }, source);
    
    const t = Vec2.dot(sourceToCushion, cushionNormal) / 
              Vec2.dot(sourceToMirror, cushionNormal);
    
    if (t < 0 || t > 1) return null;
    
    const intersection = Vec2.add(source, Vec2.mul(sourceToMirror, t));
    
    // Check if intersection is within cushion segment
    const alongCushion = Vec2.dot(
      Vec2.sub(intersection, { x: cushion.x1, y: cushion.y1 }),
      cushionDir
    );
    
    if (alongCushion < 0 || alongCushion > cushionLen) return null;
    
    return intersection;
  }

  // Check if path is clear of obstacles
  private isPathClear(
    from: Vector2,
    to: Vector2,
    ignoreBody: Body | null
  ): boolean {
    for (const body of this.state.bodies) {
      if (!body.active) continue;
      if (body === ignoreBody) continue;
      if (body.type === "striker") continue;
      
      const dist = this.pointToLineDistance(body.pos, from, to);
      if (dist < body.radius * 2) {
        return false;
      }
    }
    return true;
  }

  private pointToLineDistance(
    point: Vector2,
    lineStart: Vector2,
    lineEnd: Vector2
  ): number {
    const lineVec = Vec2.sub(lineEnd, lineStart);
    const pointVec = Vec2.sub(point, lineStart);
    const lineLen = Vec2.length(lineVec);
    
    if (lineLen === 0) return Vec2.length(pointVec);
    
    const t = Math.max(0, Math.min(1, Vec2.dot(pointVec, lineVec) / (lineLen * lineLen)));
    const projection = Vec2.add(lineStart, Vec2.mul(lineVec, t));
    
    return Vec2.distance(point, projection);
  }

  // Calculate optimal spin for shot
  private calculateOptimalSpin(targetCoin: Body, pocket: Pocket): Spin {
    const coinToPocket = Vec2.sub(pocket.pos, targetCoin.pos);
    const angle = Vec2.angle(coinToPocket);
    
    // Add slight sidespin to help coin enter pocket
    return {
      x: 0.1,  // Light topspin
      y: Math.sin(angle) * 0.1,
      z: 0,
    };
  }

  // Simulate a shot and evaluate outcome
  private simulateShot(input: ShotInput): AIEvaluation {
    // Clone state for simulation
    const simBodies = this.state.bodies.map(b => ({
      ...b,
      pos: Vec2.clone(b.pos),
      vel: Vec2.clone(b.vel),
      spin: b.spin ? { ...b.spin } : undefined,
    }));

    // Create physics world for simulation
    const simPhysics = new PhysicsWorld({
      subSteps: 2, // Reduced for performance
      enableSpin: this.state.config.enableSpin,
    });
    simPhysics.bodies = simBodies;
    simPhysics.cushions = this.state.board.cushions;
    simPhysics.pockets = this.state.board.pockets;

    // Apply shot
    const striker = simBodies.find(b => b.type === "striker")!;
    const maxSpeed = 25;
    striker.vel.x = Math.cos(input.angle) * input.power * maxSpeed;
    striker.vel.y = Math.sin(input.angle) * input.power * maxSpeed;
    if (input.spin) {
      striker.spin = { ...input.spin };
    }

    // Run simulation
    let frames = 0;
    const maxFrames = 300; // 5 seconds at 60fps
    
    while (!simPhysics.allStopped() && frames < maxFrames) {
      simPhysics.step(PHYSICS.FIXED_DT);
      frames++;
    }

    // Evaluate outcome
    return this.evaluateOutcome(simPhysics, simBodies);
  }

  // Evaluate simulation outcome
  private evaluateOutcome(
    physics: PhysicsWorld,
    bodies: Body[]
  ): AIEvaluation {
    const myCoinType = this.getCurrentPlayer().coinType;
    let pocketedCoins = 0;
    let queenPocketed = false;
    let queenCovered = false;
    let foulRisk = 0;
    let positionAdvantage = 0;

    // Count pocketed coins
    for (const body of bodies) {
      if (!body.active && body.type !== "striker") {
        if (body.type === myCoinType) {
          pocketedCoins++;
        } else if (body.type === "queen") {
          queenPocketed = true;
        }
      }
    }

    // Check for striker pocketed (foul)
    const striker = bodies.find(b => b.type === "striker")!;
    if (!striker.active) {
      foulRisk = 1;
    }

    // Evaluate remaining positions
    const myRemaining = bodies.filter(
      b => b.active && b.type === myCoinType
    );
    
    for (const coin of myRemaining) {
      // Check proximity to pockets
      for (const pocket of this.state.board.pockets) {
        const dist = Vec2.distance(coin.pos, pocket.pos);
        if (dist < 150) {
          positionAdvantage += (150 - dist) / 150;
        }
      }
    }

    // Queen cover check
    if (this.state.queenState === "pending_cover" && 
        this.state.queenOwner === this.playerId &&
        pocketedCoins > 0) {
      queenCovered = true;
    }

    return {
      score: this.calculateScore(
        pocketedCoins,
        queenPocketed,
        queenCovered,
        foulRisk,
        positionAdvantage
      ),
      pocketedCoins,
      queenPocketed,
      queenCovered,
      foulRisk,
      positionAdvantage,
    };
  }

  private calculateScore(
    pocketedCoins: number,
    queenPocketed: boolean,
    queenCovered: boolean,
    foulRisk: number,
    positionAdvantage: number
  ): number {
    let score = 0;
    
    score += pocketedCoins * MONTE_CARLO.WEIGHT_POCKET_COIN;
    
    if (queenPocketed) {
      score += MONTE_CARLO.WEIGHT_POCKET_QUEEN;
    }
    
    if (queenCovered) {
      score += MONTE_CARLO.WEIGHT_COVER_QUEEN;
    }
    
    score += positionAdvantage * MONTE_CARLO.WEIGHT_POSITION;
    score += foulRisk * MONTE_CARLO.WEIGHT_FOUL_PENALTY;
    
    return score;
  }

  private evaluateSimulation(result: AIEvaluation): number {
    return result.score;
  }

  // Compute optimal break shot
  private computeBreakShot(): ShotInput {
    const striker = this.getStriker();
    const centerX = this.state.board.width / 2;
    const centerY = this.state.board.height / 2;
    
    // Aim at center cluster
    const angle = Math.atan2(
      centerY - striker.pos.y,
      centerX - striker.pos.x
    );
    
    // Use high power for break
    const power = 0.7 + this.rng.nextFloat(0, 0.15);
    
    // Add slight spin
    const spin: Spin = {
      x: 0.2,
      y: this.rng.nextFloat(-0.1, 0.1),
      z: 0,
    };

    return {
      angle,
      power: Num.clamp(power, 0, 1),
      spin,
      strikerPos: striker.pos,
    };
  }

  // Compute queen cover shot
  private computeQueenCoverShot(): ShotInput {
    const queen = this.getQueen();
    const striker = this.getStriker();
    
    if (!queen || !queen.active) {
      // Fallback to random shot
      return this.computeRandomShot();
    }

    // Find best pocket for queen
    let bestShot: ShotInput | null = null;
    let bestScore = -Infinity;

    for (const pocket of this.state.board.pockets) {
      const shot = this.calculateDirectShot(queen, pocket, striker);
      if (shot) {
        const score = 1 / Vec2.distance(queen.pos, pocket.pos);
        if (score > bestScore) {
          bestScore = score;
          bestShot = shot;
        }
      }
    }

    return bestShot || this.computeRandomShot();
  }

  // Fallback random shot
  private computeRandomShot(): ShotInput {
    const striker = this.getStriker();
    
    return {
      angle: this.rng.next() * Math.PI * 2,
      power: 0.4 + this.rng.next() * 0.4,
      strikerPos: striker.pos,
    };
  }

  // Apply difficulty-based noise to shot
  private applyDifficultyNoise(input: ShotInput): ShotInput {
    const noise = 1 - this.config.aimAccuracy;
    
    return {
      angle: Num.normalizeAngle(
        input.angle + (this.rng.next() - 0.5) * noise * 0.5
      ),
      power: Num.clamp(
        input.power + (this.rng.next() - 0.5) * noise * 0.3,
        0.1,
        1
      ),
      spin: this.config.spinUsage > 0 ? input.spin : undefined,
      strikerPos: input.strikerPos,
    };
  }

  // Getters
  private getMyCoins(): Body[] {
    const player = this.getCurrentPlayer();
    return this.state.bodies.filter(
      b => b.active && b.type === player.coinType
    );
  }

  private getStriker(): Body {
    return this.state.bodies.find(b => b.type === "striker")!;
  }

  private getQueen(): Body | undefined {
    return this.state.bodies.find(b => b.type === "queen");
  }

  private getCurrentPlayer() {
    return this.state.players.find(p => p.id === this.playerId)!;
  }
}

// Simple bot function for quick use
export function computeBotShot(
  state: GameState,
  difficulty: BotDifficulty = "medium"
): ShotInput {
  const bot = new CarromBot(state, state.currentPlayer, difficulty);
  return bot.computeShot();
}

// Bot manager for multiple bots
export class BotManager {
  private bots: Map<PlayerId, CarromBot> = new Map();

  registerBot(
    state: GameState,
    playerId: PlayerId,
    difficulty: BotDifficulty
  ): void {
    this.bots.set(playerId, new CarromBot(state, playerId, difficulty));
  }

  computeShot(playerId: PlayerId): ShotInput {
    const bot = this.bots.get(playerId);
    if (!bot) {
      throw new Error(`Bot not registered for player ${playerId}`);
    }
    return bot.computeShot();
  }

  unregisterBot(playerId: PlayerId): void {
    this.bots.delete(playerId);
  }

  clear(): void {
    this.bots.clear();
  }
}
