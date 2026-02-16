// ============================================================================
// CARROM GAME ENGINE - AIM PREDICTION LINE (PRO FEATURE)
// AAA Mobile Game Quality - Rovio/Clash of Clans Standard
//
// Features:
// - Real-time trajectory prediction
// - Multi-bounce path calculation
// - Collision point visualization
// - Confidence scoring
// - Ghost ball visualization
// ============================================================================

import { 
  GameState, 
  Body, 
  Vector2, 
  Pocket, 
  PredictionPoint, 
  AimPrediction,
  Spin,
  Cushion
} from "../core/types";
import { Vec2, Num, Geometry } from "../utils/math";
import { PHYSICS, PREDICTION, COIN_CONFIG } from "../core/constants";

// Prediction engine class
export class AimPredictionEngine {
  private state: GameState;

  constructor(state: GameState) {
    this.state = state;
  }

  // Main entry: predict shot trajectory
  predictShot(
    strikerPos: Vector2,
    angle: number,
    power: number,
    spin?: Spin
  ): AimPrediction {
    const path: PredictionPoint[] = [];
    const maxSpeed = 25;
    const speed = power * maxSpeed;
    
    // Initial velocity
    let vel: Vector2 = {
      x: Math.cos(angle) * speed,
      y: Math.sin(angle) * speed,
    };
    
    // Apply spin effect
    if (spin && this.state.config.enableSpin) {
      vel = SpinMath.applyToVelocity(vel, spin, PHYSICS.SPIN_EFFECT);
    }

    // Current position
    let pos = Vec2.clone(strikerPos);
    let currentSpin = spin ? { ...spin } : { x: 0, y: 0, z: 0 };
    
    // Simulation parameters
    const dt = PHYSICS.FIXED_DT * 2; // Larger steps for prediction
    const maxTime = PREDICTION.MAX_TIME;
    let time = 0;
    let bounces = 0;
    let confidence = 1.0;
    
    // Add starting point
    path.push({
      pos: Vec2.clone(pos),
      time: 0,
      collision: false,
    });

    // Simulate trajectory
    while (time < maxTime && bounces < PREDICTION.MAX_BOUNCES) {
      // Step physics
      const result = this.simulateStep(
        pos,
        vel,
        currentSpin,
        dt,
        strikerPos
      );
      
      pos = result.pos;
      vel = result.vel;
      currentSpin = result.spin;
      time += dt;
      
      // Add point to path
      if (Math.floor(time / dt) % PREDICTION.POINT_INTERVAL === 0) {
        path.push({
          pos: Vec2.clone(pos),
          time,
          collision: result.collision,
          collisionType: result.collisionType,
        });
      }

      // Handle collision
      if (result.collision) {
        bounces++;
        confidence *= PREDICTION.CONFIDENCE_DECAY;
        
        // Stop if pocketed
        if (result.collisionType === "pocket") {
          break;
        }
      }

      // Stop if velocity too low
      if (Vec2.length(vel) < PHYSICS.STOP_EPSILON * 2) {
        break;
      }
    }

    // Find target coin and pocket
    const { targetCoin, targetPocket } = this.identifyTarget(
      path,
      strikerPos
    );

    // Calculate suggested power and spin
    const { suggestedPower, suggestedSpin } = this.calculateOptimalShot(
      strikerPos,
      targetCoin,
      targetPocket
    );

    return {
      path,
      confidence,
      targetCoin: targetCoin || undefined,
      targetPocket: targetPocket || undefined,
      suggestedPower,
      suggestedSpin,
    };
  }

  // Simulate one physics step
  private simulateStep(
    pos: Vector2,
    vel: Vector2,
    spin: Spin,
    dt: number,
    strikerPos: Vector2
  ): {
    pos: Vector2;
    vel: Vector2;
    spin: Spin;
    collision: boolean;
    collisionType?: "coin" | "cushion" | "pocket";
  } {
    let newPos = Vec2.add(pos, Vec2.mul(vel, dt));
    let newVel = Vec2.clone(vel);
    let newSpin = { ...spin };
    let collision = false;
    let collisionType: "coin" | "cushion" | "pocket" | undefined;

    // Apply friction
    const speed = Vec2.length(newVel);
    if (speed > 0) {
      newVel = Vec2.mul(newVel, Math.pow(PHYSICS.TABLE_FRICTION, dt * 60));
      
      // Apply spin effect
      if (this.state.config.enableSpin) {
        const spinEffect = {
          x: -spin.y * PHYSICS.SPIN_EFFECT * dt,
          y: spin.x * PHYSICS.SPIN_EFFECT * dt,
        };
        newVel = Vec2.add(newVel, spinEffect);
        
        // Decay spin
        newSpin = {
          x: spin.x * Math.pow(PHYSICS.SPIN_DECAY, dt * 60),
          y: spin.y * Math.pow(PHYSICS.SPIN_DECAY, dt * 60),
          z: spin.z * Math.pow(PHYSICS.SPIN_DECAY, dt * 60),
        };
      }
    }

    // Check pocket collision
    for (const pocket of this.state.board.pockets) {
      if (Vec2.distance(newPos, pocket.pos) < pocket.radius) {
        collision = true;
        collisionType = "pocket";
        newVel = Vec2.zero();
        break;
      }
    }

    // Check coin collision
    if (!collision) {
      for (const body of this.state.bodies) {
        if (!body.active) continue;
        if (body.type === "striker") continue;
        if (Vec2.distance(body.pos, strikerPos) < 1) continue; // Ignore striker

        const dist = Vec2.distance(newPos, body.pos);
        const minDist = COIN_CONFIG.STRIKER.radius + body.radius;

        if (dist < minDist) {
          collision = true;
          collisionType = "coin";
          
          // Calculate reflection
          const normal = Vec2.normalize(Vec2.sub(newPos, body.pos));
          newVel = Vec2.reflect(newVel, normal);
          newVel = Vec2.mul(newVel, body.restitution || PHYSICS.COLLISION_RESTITUTION);
          
          // Position correction
          const overlap = minDist - dist;
          newPos = Vec2.add(newPos, Vec2.mul(normal, overlap));
          
          break;
        }
      }
    }

    // Check cushion collision
    if (!collision) {
      for (const cushion of this.state.board.cushions) {
        const collisionResult = this.checkCushionCollision(
          newPos,
          COIN_CONFIG.STRIKER.radius,
          cushion
        );
        
        if (collisionResult) {
          collision = true;
          collisionType = "cushion";
          
          // Reflect velocity
          newVel = Vec2.reflect(newVel, cushion.normal);
          newVel = Vec2.mul(newVel, cushion.restitution);
          
          // Apply cushion friction
          const tangent = Vec2.perpendicular(cushion.normal);
          const velAlongTangent = Vec2.dot(newVel, tangent);
          newVel = Vec2.add(
            newVel,
            Vec2.mul(tangent, -velAlongTangent * (1 - PHYSICS.CUSHION_FRICTION))
          );
          
          // Reduce spin on cushion hit
          newSpin = Vec3.mul(newSpin, 0.7);
          
          // Position correction
          newPos = Vec2.add(
            newPos,
            Vec2.mul(cushion.normal, collisionResult.penetration * 1.1)
          );
          
          break;
        }
      }
    }

    return {
      pos: newPos,
      vel: newVel,
      spin: newSpin,
      collision,
      collisionType,
    };
  }

  // Check cushion collision
  private checkCushionCollision(
    pos: Vector2,
    radius: number,
    cushion: Cushion
  ): { penetration: number } | null {
    const result = Geometry.pointToSegmentDistance(
      pos,
      { x: cushion.x1, y: cushion.y1 },
      { x: cushion.x2, y: cushion.y2 }
    );

    if (result.distance < radius) {
      return { penetration: radius - result.distance };
    }

    return null;
  }

  // Identify target coin and pocket from path
  private identifyTarget(
    path: PredictionPoint[],
    strikerPos: Vector2
  ): { targetCoin: Body | null; targetPocket: Pocket | null } {
    let targetCoin: Body | null = null;
    let targetPocket: Pocket | null = null;

    // Find first coin collision
    for (let i = 0; i < path.length; i++) {
      const point = path[i];
      
      if (point.collisionType === "coin") {
        // Find which coin was hit
        for (const body of this.state.bodies) {
          if (!body.active || body.type === "striker") continue;
          
          const dist = Vec2.distance(point.pos, body.pos);
          if (dist < COIN_CONFIG.STRIKER.radius + body.radius + 5) {
            targetCoin = body;
            
            // Look ahead for pocket
            for (let j = i + 1; j < path.length; j++) {
              if (path[j].collisionType === "pocket") {
                targetPocket = this.state.board.pockets.find(
                  p => Vec2.distance(path[j].pos, p.pos) < p.radius
                ) || null;
                break;
              }
            }
            
            break;
          }
        }
        break;
      }
    }

    return { targetCoin, targetPocket };
  }

  // Calculate optimal shot parameters
  private calculateOptimalShot(
    strikerPos: Vector2,
    targetCoin: Body | null,
    targetPocket: Pocket | null
  ): { suggestedPower: number; suggestedSpin?: Spin } {
    if (!targetCoin || !targetPocket) {
      return { suggestedPower: 0.5 };
    }

    // Calculate distance to target
    const distance = Vec2.distance(strikerPos, targetCoin.pos);
    
    // Base power on distance
    let suggestedPower = Num.clamp(distance / 400, 0.3, 0.9);
    
    // Adjust for pocket distance
    const pocketDistance = Vec2.distance(targetCoin.pos, targetPocket.pos);
    suggestedPower = Num.clamp(
      suggestedPower * (1 + pocketDistance / 500),
      0.3,
      0.95
    );

    // Suggest spin for better control
    const coinToPocket = Vec2.sub(targetPocket.pos, targetCoin.pos);
    const angle = Vec2.angle(coinToPocket);
    
    const suggestedSpin: Spin = {
      x: 0.1,
      y: Math.sin(angle) * 0.05,
      z: 0,
    };

    return { suggestedPower, suggestedSpin };
  }

  // Predict break shot trajectory
  predictBreak(
    strikerPos: Vector2,
    angle: number,
    power: number
  ): AimPrediction {
    // Break prediction is similar but with higher confidence decay
    const prediction = this.predictShot(strikerPos, angle, power);
    
    // Breaks are less predictable
    prediction.confidence *= 0.7;
    
    return prediction;
  }

  // Find best shot for current situation
  findBestShot(
    strikerPos: Vector2,
    targetCoin: Body,
    targetPocket: Pocket
  ): { angle: number; power: number; confidence: number } {
    // Calculate ghost ball position
    const pocketToCoin = Vec2.sub(targetCoin.pos, targetPocket.pos);
    const pocketToCoinDir = Vec2.normalize(pocketToCoin);
    
    const ghostBallPos = Vec2.add(
      targetCoin.pos,
      Vec2.mul(pocketToCoinDir, targetCoin.radius + COIN_CONFIG.STRIKER.radius + 1)
    );

    // Calculate angle
    const strikerToGhost = Vec2.sub(ghostBallPos, strikerPos);
    const angle = Vec2.angle(strikerToGhost);

    // Calculate power
    const distance = Vec2.length(strikerToGhost);
    const power = Num.clamp(distance / 400, 0.3, 0.9);

    // Check if path is clear
    const pathClear = this.isPathClear(strikerPos, ghostBallPos, targetCoin);
    const confidence = pathClear ? 0.9 : 0.3;

    return { angle, power, confidence };
  }

  private isPathClear(
    from: Vector2,
    to: Vector2,
    ignoreBody: Body
  ): boolean {
    for (const body of this.state.bodies) {
      if (!body.active) continue;
      if (body === ignoreBody) continue;
      if (body.type === "striker") continue;

      const dist = Geometry.pointToSegmentDistance(
        body.pos,
        from,
        to
      ).distance;

      if (dist < body.radius * 2) {
        return false;
      }
    }
    return true;
  }

  // Get ghost ball position for visualization
  getGhostBallPosition(
    targetCoin: Body,
    targetPocket: Pocket
  ): Vector2 {
    const pocketToCoin = Vec2.sub(targetCoin.pos, targetPocket.pos);
    const pocketToCoinDir = Vec2.normalize(pocketToCoin);
    
    return Vec2.add(
      targetCoin.pos,
      Vec2.mul(pocketToCoinDir, targetCoin.radius + COIN_CONFIG.STRIKER.radius + 1)
    );
  }

  // Get aim line (from striker through ghost ball)
  getAimLine(
    strikerPos: Vector2,
    ghostBallPos: Vector2
  ): { start: Vector2; end: Vector2 } {
    const dir = Vec2.sub(ghostBallPos, strikerPos);
    const extendedEnd = Vec2.add(
      ghostBallPos,
      Vec2.mul(Vec2.normalize(dir), 200)
    );

    return {
      start: strikerPos,
      end: extendedEnd,
    };
  }
}

// Simple prediction function
export function predictTrajectory(
  state: GameState,
  strikerPos: Vector2,
  angle: number,
  power: number,
  spin?: Spin
): AimPrediction {
  const engine = new AimPredictionEngine(state);
  return engine.predictShot(strikerPos, angle, power, spin);
}

// Find best shots for all available coins
export function findBestShots(
  state: GameState,
  strikerPos: Vector2
): Array<{
  coin: Body;
  pocket: Pocket;
  angle: number;
  power: number;
  confidence: number;
}> {
  const engine = new AimPredictionEngine(state);
  const results = [];

  const player = state.players.find(p => p.id === state.currentPlayer);
  if (!player) return [];

  const myCoins = state.bodies.filter(
    b => b.active && b.type === player.coinType
  );

  for (const coin of myCoins) {
    for (const pocket of state.board.pockets) {
      const shot = engine.findBestShot(strikerPos, coin, pocket);
      if (shot.confidence > 0.5) {
        results.push({
          coin,
          pocket,
          ...shot,
        });
      }
    }
  }

  // Sort by confidence
  return results.sort((a, b) => b.confidence - a.confidence);
}

// Import needed for SpinMath
import { SpinMath, Vec3 } from "../utils/math";
