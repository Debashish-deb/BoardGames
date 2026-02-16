// ============================================================================
// CARROM GAME ENGINE - ADVANCED PHYSICS
// AAA Mobile Game Quality - Rovio/Clash of Clans Standard
//
// Features:
// - Sub-stepping for stable collisions
// - Spin physics (topspin, backspin, sidespin)
// - Realistic cushion physics with friction
// - Continuous collision detection (CCD)
// - Position/velocity Verlet integration
// ============================================================================

import { Body, Vector2, Spin, Cushion, Pocket, CollisionEvent } from "./types";
import { Vec2, SpinMath, Num, PhysicsMath } from "../utils/math";
import { PHYSICS } from "./constants";

// Physics configuration
export interface PhysicsConfig {
  subSteps: number;
  enableSpin: boolean;
  enableCCD: boolean;
  maxVelocity: number;
  restitution: number;
  friction: number;
}

export const DEFAULT_PHYSICS_CONFIG: PhysicsConfig = {
  subSteps: 4,
  enableSpin: true,
  enableCCD: true,
  maxVelocity: PHYSICS.MAX_VELOCITY,
  restitution: PHYSICS.COLLISION_RESTITUTION,
  friction: PHYSICS.TABLE_FRICTION,
};

// Collision pair for efficient detection
export interface CollisionPair {
  a: Body;
  b: Body;
  dist: number;
  normal: Vector2;
}

// Physics world state
export class PhysicsWorld {
  bodies: Body[] = [];
  cushions: Cushion[] = [];
  pockets: Pocket[] = [];
  config: PhysicsConfig;
  
  // Events
  collisionEvents: CollisionEvent[] = [];
  pocketEvents: { body: Body; pocket: Pocket }[] = [];
  
  // Statistics
  totalCollisions: number = 0;
  subStepsPerformed: number = 0;

  constructor(config: Partial<PhysicsConfig> = {}) {
    this.config = { ...DEFAULT_PHYSICS_CONFIG, ...config };
  }

  // Main step function with sub-stepping
  step(dt: number): void {
    const subDt = dt / this.config.subSteps;
    
    this.collisionEvents = [];
    this.pocketEvents = [];
    
    for (let i = 0; i < this.config.subSteps; i++) {
      this.subStep(subDt);
    }
    
    this.subStepsPerformed += this.config.subSteps;
  }

  private subStep(dt: number): void {
    // Apply forces and integrate
    for (const body of this.bodies) {
      if (!body.active) continue;
      this.integrate(body, dt);
    }
    
    // Detect and resolve collisions
    this.resolveCollisions();
    
    // Resolve cushion collisions
    this.resolveCushionCollisions();
    
    // Check pocket captures
    this.checkPockets();
    
    // Clamp velocities
    for (const body of this.bodies) {
      if (!body.active) continue;
      body.vel = Vec2.clampLength(body.vel, this.config.maxVelocity);
    }
  }

  // Velocity Verlet integration with spin
  private integrate(body: Body, dt: number): void {
    // Apply friction
    const speed = Vec2.length(body.vel);
    if (speed > 0) {
      // Table friction
      const frictionFactor = Math.pow(
        body.friction ?? this.config.friction, 
        dt * 60
      );
      body.vel = Vec2.mul(body.vel, frictionFactor);
      
      // Apply spin effect to velocity
      if (this.config.enableSpin && body.spin) {
        const spinEffect = SpinMath.applyToVelocity(
          body.vel, 
          body.spin, 
          PHYSICS.SPIN_EFFECT * dt
        );
        body.vel = Vec2.lerp(body.vel, spinEffect, 0.3);
        
        // Decay spin
        body.spin = SpinMath.decay(body.spin, Math.pow(PHYSICS.SPIN_DECAY, dt * 60));
      }
      
      // Rolling friction (angular)
      if (body.angularVel) {
        body.angularVel *= Math.pow(PHYSICS.ROLLING_FRICTION, dt * 60);
        if (Math.abs(body.angularVel) < 0.01) {
          body.angularVel = 0;
        }
      }
    }
    
    // Stop threshold
    if (speed < PHYSICS.STOP_EPSILON) {
      body.vel = Vec2.zero();
      body.angularVel = 0;
    }
    
    // Update position
    body.pos = Vec2.add(body.pos, Vec2.mul(body.vel, dt));
  }

  // Resolve coin-coin collisions
  private resolveCollisions(): void {
    const pairs: CollisionPair[] = [];
    
    // Broad phase: find potential collisions
    for (let i = 0; i < this.bodies.length; i++) {
      for (let j = i + 1; j < this.bodies.length; j++) {
        const a = this.bodies[i];
        const b = this.bodies[j];
        
        if (!a.active || !b.active) continue;
        
        const dx = b.pos.x - a.pos.x;
        const dy = b.pos.y - a.pos.y;
        const distSq = dx * dx + dy * dy;
        const minDist = a.radius + b.radius;
        
        if (distSq < minDist * minDist && distSq > 0) {
          const dist = Math.sqrt(distSq);
          pairs.push({
            a,
            b,
            dist,
            normal: { x: dx / dist, y: dy / dist },
          });
        }
      }
    }
    
    // Narrow phase: resolve collisions
    for (const pair of pairs) {
      this.resolveCoinCollision(pair);
    }
  }

  private resolveCoinCollision(pair: CollisionPair): void {
    const { a, b, dist, normal } = pair;
    const minDist = a.radius + b.radius;
    
    // Relative velocity
    const relVel = Vec2.sub(b.vel, a.vel);
    const velAlongNormal = Vec2.dot(relVel, normal);
    
    // Don't resolve if separating
    if (velAlongNormal > 0) return;
    
    // Calculate restitution
    const restitution = Math.min(
      a.restitution ?? this.config.restitution,
      b.restitution ?? this.config.restitution
    );
    
    // Calculate impulse
    const massA = a.mass;
    const massB = b.mass;
    const j = PhysicsMath.calculateImpulse(
      a.vel, b.vel, massA, massB, normal, restitution
    );
    
    // Apply impulse
    const impulse = Vec2.mul(normal, j);
    a.vel = Vec2.sub(a.vel, Vec2.mul(impulse, 1 / massA));
    b.vel = Vec2.add(b.vel, Vec2.mul(impulse, 1 / massB));
    
    // Apply spin transfer
    if (this.config.enableSpin) {
      this.applySpinTransfer(a, b, normal, j);
    }
    
    // Positional correction
    const overlap = minDist - dist;
    const correction = overlap / (1 / massA + 1 / massB) * 0.4;
    const correctionVec = Vec2.mul(normal, correction);
    
    a.pos = Vec2.sub(a.pos, Vec2.mul(correctionVec, 1 / massA));
    b.pos = Vec2.add(b.pos, Vec2.mul(correctionVec, 1 / massB));
    
    // Record collision event
    this.collisionEvents.push({
      bodyA: a,
      bodyB: b,
      point: Vec2.add(a.pos, Vec2.mul(normal, a.radius)),
      impulse: j,
      type: a.type === "striker" || b.type === "striker" 
        ? "coin-striker" 
        : "coin-coin",
    });
    
    this.totalCollisions++;
  }

  private applySpinTransfer(a: Body, b: Body, normal: Vector2, impulse: number): void {
    if (!a.spin) a.spin = SpinMath.zero();
    if (!b.spin) b.spin = SpinMath.zero();
    
    // Tangential direction for sidespin
    const tangent = Vec2.perpendicular(normal);
    
    // Calculate spin change based on impact point and impulse
    const spinChangeA = impulse * PHYSICS.SPIN_TRANSFER / a.mass;
    const spinChangeB = impulse * PHYSICS.SPIN_TRANSFER / b.mass;
    
    // Update spins
    a.spin.z += spinChangeB;
    b.spin.z -= spinChangeA;
    
    // Sidespin from off-center hits
    const relVel = Vec2.sub(b.vel, a.vel);
    const velAlongTangent = Vec2.dot(relVel, tangent);
    
    a.spin.y += velAlongTangent * 0.1;
    b.spin.y -= velAlongTangent * 0.1;
  }

  // Resolve cushion collisions with realistic physics
  private resolveCushionCollisions(): void {
    for (const body of this.bodies) {
      if (!body.active) continue;
      
      for (const cushion of this.cushions) {
        const collision = this.checkCushionCollision(body, cushion);
        if (collision) {
          this.resolveCushionCollision(body, cushion, collision);
        }
      }
    }
  }

  private checkCushionCollision(
    body: Body, 
    cushion: Cushion
  ): { point: Vector2; normal: Vector2; penetration: number } | null {
    // Project body center onto cushion line
    const cushionVec = Vec2.sub(
      { x: cushion.x2, y: cushion.y2 },
      { x: cushion.x1, y: cushion.y1 }
    );
    const cushionLen = Vec2.length(cushionVec);
    const cushionDir = Vec2.div(cushionVec, cushionLen);
    
    const toBody = Vec2.sub(body.pos, { x: cushion.x1, y: cushion.y1 });
    const projection = Vec2.dot(toBody, cushionDir);
    
    // Check if projection is within cushion segment
    if (projection < 0 || projection > cushionLen) return null;
    
    // Find closest point on cushion
    const closestPoint = Vec2.add(
      { x: cushion.x1, y: cushion.y1 },
      Vec2.mul(cushionDir, projection)
    );
    
    const dist = Vec2.distance(body.pos, closestPoint);
    
    if (dist < body.radius) {
      const normal = Vec2.normalize(Vec2.sub(body.pos, closestPoint));
      return {
        point: closestPoint,
        normal,
        penetration: body.radius - dist,
      };
    }
    
    return null;
  }

  private resolveCushionCollision(
    body: Body,
    cushion: Cushion,
    collision: { point: Vector2; normal: Vector2; penetration: number }
  ): void {
    const { normal } = collision;
    
    // Relative velocity
    const velAlongNormal = Vec2.dot(body.vel, normal);
    
    // Don't resolve if separating
    if (velAlongNormal > 0) return;
    
    // Cushion restitution (lower than coin-coin)
    const restitution = cushion.restitution * (body.restitution ?? 1);
    
    // Calculate impulse
    const j = -(1 + restitution) * velAlongNormal * body.mass;
    
    // Apply impulse
    const impulse = Vec2.mul(normal, j / body.mass);
    body.vel = Vec2.add(body.vel, impulse);
    
    // Apply cushion friction (reduces tangential velocity)
    const tangent = Vec2.perpendicular(normal);
    const velAlongTangent = Vec2.dot(body.vel, tangent);
    const frictionImpulse = -velAlongTangent * PHYSICS.CUSHION_FRICTION;
    
    body.vel = Vec2.add(
      body.vel,
      Vec2.mul(tangent, frictionImpulse)
    );
    
    // Spin effect on cushion hit
    if (this.config.enableSpin && body.spin) {
      // Backspin/topspin affects rebound angle
      const spinEffect = body.spin.x * PHYSICS.SPIN_EFFECT;
      body.vel = Vec2.rotate(body.vel, spinEffect * 0.1);
      
      // Cushion reduces spin
      body.spin = SpinMath.mul(body.spin, 0.7);
    }
    
    // Positional correction
    body.pos = Vec2.add(
      body.pos,
      Vec2.mul(normal, collision.penetration * 1.1)
    );
    
    // Record collision
    this.collisionEvents.push({
      bodyA: body,
      bodyB: null as any,
      point: collision.point,
      impulse: j,
      type: "coin-cushion",
    });
  }

  // Check for pocketed coins
  private checkPockets(): void {
    for (const body of this.bodies) {
      if (!body.active || body.type === "striker") continue;
      
      for (const pocket of this.pockets) {
        const dist = Vec2.distance(body.pos, pocket.pos);
        
        if (dist < pocket.radius * PHYSICS.POCKET_CAPTURE_RADIUS) {
          // Coin is pocketed!
          body.active = false;
          body.vel = Vec2.zero();
          
          this.pocketEvents.push({ body, pocket });
        }
      }
    }
  }

  // Continuous Collision Detection for fast-moving objects
  detectCCD(body: Body, dt: number): { collision: boolean; time: number; normal: Vector2 } | null {
    const moveDist = Vec2.length(body.vel) * dt;
    
    // Only use CCD for fast-moving objects
    if (moveDist < body.radius * 2) return null;
    
    const startPos = Vec2.clone(body.pos);
    const endPos = Vec2.add(body.pos, Vec2.mul(body.vel, dt));
    
    // Check against all other bodies
    let earliestCollision: { time: number; normal: Vector2; body: Body } | null = null;
    
    for (const other of this.bodies) {
      if (other === body || !other.active) continue;
      
      const result = this.sweepCircleCircle(
        startPos, endPos, body.radius,
        other.pos, other.pos, other.radius
      );
      
      if (result && (!earliestCollision || result.time < earliestCollision.time)) {
        earliestCollision = { ...result, body: other };
      }
    }
    
    if (earliestCollision && earliestCollision.time <= 1) {
      return {
        collision: true,
        time: earliestCollision.time,
        normal: earliestCollision.normal,
      };
    }
    
    return null;
  }

  private sweepCircleCircle(
    a1: Vector2, a2: Vector2, ra: number,
    b1: Vector2, b2: Vector2, rb: number
  ): { time: number; normal: Vector2 } | null {
    // Relative motion
    const va = Vec2.sub(a2, a1);
    const vb = Vec2.sub(b2, b1);
    const v = Vec2.sub(va, vb);
    
    const r = ra + rb;
    const rSq = r * r;
    
    const startOffset = Vec2.sub(b1, a1);
    const c = Vec2.dot(startOffset, startOffset) - rSq;
    
    if (c < 0) {
      // Already overlapping
      return { time: 0, normal: Vec2.normalize(startOffset) };
    }
    
    const a = Vec2.dot(v, v);
    const b = -2 * Vec2.dot(startOffset, v);
    const discriminant = b * b - 4 * a * c;
    
    if (discriminant < 0 || a === 0) return null;
    
    const sqrtDisc = Math.sqrt(discriminant);
    const t1 = (b - sqrtDisc) / (2 * a);
    const t2 = (b + sqrtDisc) / (2 * a);
    
    const t = t1 >= 0 && t1 <= 1 ? t1 : t2 >= 0 && t2 <= 1 ? t2 : null;
    
    if (t === null) return null;
    
    const collisionPointA = Vec2.add(a1, Vec2.mul(va, t));
    const collisionPointB = Vec2.add(b1, Vec2.mul(vb, t));
    const normal = Vec2.normalize(Vec2.sub(collisionPointB, collisionPointA));
    
    return { time: t, normal };
  }

  // Check if all bodies have stopped
  allStopped(): boolean {
    return this.bodies.every(
      (b) => !b.active || 
        (Math.abs(b.vel.x) < PHYSICS.STOP_EPSILON && 
         Math.abs(b.vel.y) < PHYSICS.STOP_EPSILON)
    );
  }

  // Get active bodies only
  getActiveBodies(): Body[] {
    return this.bodies.filter(b => b.active);
  }

  // Reset world
  reset(): void {
    this.collisionEvents = [];
    this.pocketEvents = [];
    this.totalCollisions = 0;
    this.subStepsPerformed = 0;
  }
}

// Utility functions
export function createBody(
  id: string,
  type: import("./types").CoinType,
  pos: Vector2,
  radius: number,
  mass: number,
  options: Partial<Body> = {}
): Body {
  return {
    id,
    type,
    pos: Vec2.clone(pos),
    vel: Vec2.zero(),
    radius,
    mass,
    active: true,
    spin: SpinMath.zero(),
    angularVel: 0,
    restitution: PHYSICS.COLLISION_RESTITUTION,
    friction: PHYSICS.TABLE_FRICTION,
    ...options,
  };
}

export function createCushion(
  id: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): Cushion {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  
  return {
    id,
    x1,
    y1,
    x2,
    y2,
    normal: { x: -dy / len, y: dx / len },
    restitution: PHYSICS.CUSHION_RESTITUTION,
  };
}

export function createPocket(
  id: number,
  x: number,
  y: number,
  radius: number,
  corner: Pocket["corner"]
): Pocket {
  return {
    id,
    pos: { x, y },
    radius,
    corner,
  };
}
