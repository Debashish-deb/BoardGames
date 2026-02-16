// ============================================================================
// CARROM GAME ENGINE - MATH UTILITIES
// AAA Mobile Game Quality - Rovio/Clash of Clans Standard
// ============================================================================

import { Vector2, Vector3, Spin } from "../core/types";

// ============================================================================
// Vector2 Operations
// ============================================================================

export const Vec2 = {
  zero: (): Vector2 => ({ x: 0, y: 0 }),
  
  create: (x: number, y: number): Vector2 => ({ x, y }),
  
  clone: (v: Vector2): Vector2 => ({ x: v.x, y: v.y }),
  
  add: (a: Vector2, b: Vector2): Vector2 => ({
    x: a.x + b.x,
    y: a.y + b.y,
  }),
  
  sub: (a: Vector2, b: Vector2): Vector2 => ({
    x: a.x - b.x,
    y: a.y - b.y,
  }),
  
  mul: (v: Vector2, s: number): Vector2 => ({
    x: v.x * s,
    y: v.y * s,
  }),
  
  div: (v: Vector2, s: number): Vector2 => ({
    x: v.x / s,
    y: v.y / s,
  }),
  
  dot: (a: Vector2, b: Vector2): number => 
    a.x * b.x + a.y * b.y,
  
  cross: (a: Vector2, b: Vector2): number => 
    a.x * b.y - a.y * b.x,
  
  length: (v: Vector2): number => 
    Math.hypot(v.x, v.y),
  
  lengthSq: (v: Vector2): number => 
    v.x * v.x + v.y * v.y,
  
  normalize: (v: Vector2): Vector2 => {
    const len = Math.hypot(v.x, v.y);
    if (len === 0) return { x: 0, y: 0 };
    return { x: v.x / len, y: v.y / len };
  },
  
  distance: (a: Vector2, b: Vector2): number => 
    Math.hypot(a.x - b.x, a.y - b.y),
  
  distanceSq: (a: Vector2, b: Vector2): number => {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
  },
  
  lerp: (a: Vector2, b: Vector2, t: number): Vector2 => ({
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  }),
  
  reflect: (v: Vector2, normal: Vector2): Vector2 => {
    const dot = v.x * normal.x + v.y * normal.y;
    return {
      x: v.x - 2 * dot * normal.x,
      y: v.y - 2 * dot * normal.y,
    };
  },
  
  perpendicular: (v: Vector2): Vector2 => ({
    x: -v.y,
    y: v.x,
  }),
  
  rotate: (v: Vector2, angle: number): Vector2 => {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
      x: v.x * cos - v.y * sin,
      y: v.x * sin + v.y * cos,
    };
  },
  
  angle: (v: Vector2): number => Math.atan2(v.y, v.x),
  
  angleBetween: (a: Vector2, b: Vector2): number => {
    const dot = a.x * b.x + a.y * b.y;
    const det = a.x * b.y - a.y * b.x;
    return Math.atan2(det, dot);
  },
  
  clamp: (v: Vector2, min: Vector2, max: Vector2): Vector2 => ({
    x: Math.max(min.x, Math.min(max.x, v.x)),
    y: Math.max(min.y, Math.min(max.y, v.y)),
  }),
  
  clampLength: (v: Vector2, maxLen: number): Vector2 => {
    const len = Math.hypot(v.x, v.y);
    if (len <= maxLen) return v;
    const scale = maxLen / len;
    return { x: v.x * scale, y: v.y * scale };
  },
};

// ============================================================================
// Vector3 Operations
// ============================================================================

export const Vec3 = {
  zero: (): Vector3 => ({ x: 0, y: 0, z: 0 }),
  
  create: (x: number, y: number, z: number): Vector3 => ({ x, y, z }),
  
  add: (a: Vector3, b: Vector3): Vector3 => ({
    x: a.x + b.x,
    y: a.y + b.y,
    z: a.z + b.z,
  }),
  
  mul: (v: Vector3, s: number): Vector3 => ({
    x: v.x * s,
    y: v.y * s,
    z: v.z * s,
  }),
  
  length: (v: Vector3): number => 
    Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z),
  
  normalize: (v: Vector3): Vector3 => {
    const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    if (len === 0) return { x: 0, y: 0, z: 0 };
    return { x: v.x / len, y: v.y / len, z: v.z / len };
  },
};

// ============================================================================
// Spin Operations
// ============================================================================

export const SpinMath = {
  zero: (): Spin => ({ x: 0, y: 0, z: 0 }),
  
  create: (x: number, y: number, z: number): Spin => ({ x, y, z }),
  
  add: (a: Spin, b: Spin): Spin => ({
    x: a.x + b.x,
    y: a.y + b.y,
    z: a.z + b.z,
  }),
  
  mul: (s: Spin, factor: number): Spin => ({
    x: s.x * factor,
    y: s.y * factor,
    z: s.z * factor,
  }),
  
  decay: (s: Spin, factor: number): Spin => ({
    x: s.x * factor,
    y: s.y * factor,
    z: s.z * factor,
  }),
  
  // Apply spin effect to velocity
  applyToVelocity: (vel: Vector2, spin: Spin, effectStrength: number): Vector2 => {
    // Sidespin creates curve
    const curveX = -spin.y * effectStrength;
    const curveY = spin.x * effectStrength;
    return {
      x: vel.x + curveX,
      y: vel.y + curveY,
    };
  },
  
  // Calculate spin transfer during collision
  calculateTransfer: (
    spinA: Spin, 
    spinB: Spin, 
    massA: number, 
    massB: number,
    transferRatio: number
  ): { newSpinA: Spin; newSpinB: Spin } => {
    const totalMass = massA + massB;
    const transferA = spinB.z * (massB / totalMass) * transferRatio;
    const transferB = spinA.z * (massA / totalMass) * transferRatio;
    
    return {
      newSpinA: { ...spinA, z: spinA.z - transferA + transferB },
      newSpinB: { ...spinB, z: spinB.z - transferB + transferA },
    };
  },
};

// ============================================================================
// Geometry Utilities
// ============================================================================

export const Geometry = {
  // Line-circle intersection
  lineCircleIntersect: (
    lineStart: Vector2,
    lineEnd: Vector2,
    circleCenter: Vector2,
    radius: number
  ): Vector2[] => {
    const results: Vector2[] = [];
    const d = Vec2.sub(lineEnd, lineStart);
    const f = Vec2.sub(lineStart, circleCenter);
    
    const a = Vec2.dot(d, d);
    const b = 2 * Vec2.dot(f, d);
    const c = Vec2.dot(f, f) - radius * radius;
    
    const discriminant = b * b - 4 * a * c;
    
    if (discriminant < 0) return results;
    
    const sqrtDisc = Math.sqrt(discriminant);
    const t1 = (-b - sqrtDisc) / (2 * a);
    const t2 = (-b + sqrtDisc) / (2 * a);
    
    if (t1 >= 0 && t1 <= 1) {
      results.push(Vec2.add(lineStart, Vec2.mul(d, t1)));
    }
    if (t2 >= 0 && t2 <= 1 && t2 !== t1) {
      results.push(Vec2.add(lineStart, Vec2.mul(d, t2)));
    }
    
    return results;
  },
  
  // Circle-circle intersection
  circleCircleIntersect: (
    c1: Vector2, r1: number,
    c2: Vector2, r2: number
  ): Vector2[] => {
    const results: Vector2[] = [];
    const d = Vec2.distance(c1, c2);
    
    if (d > r1 + r2 || d < Math.abs(r1 - r2)) return results;
    
    const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
    const h = Math.sqrt(r1 * r1 - a * a);
    
    const p2 = Vec2.add(c1, Vec2.mul(Vec2.sub(c2, c1), a / d));
    
    const offset = Vec2.mul(
      Vec2.perpendicular(Vec2.normalize(Vec2.sub(c2, c1))),
      h
    );
    
    results.push(Vec2.add(p2, offset));
    if (h > 0) {
      results.push(Vec2.sub(p2, offset));
    }
    
    return results;
  },
  
  // Point to line segment distance
  pointToSegmentDistance: (
    point: Vector2,
    segStart: Vector2,
    segEnd: Vector2
  ): { distance: number; closestPoint: Vector2 } => {
    const segVec = Vec2.sub(segEnd, segStart);
    const pointVec = Vec2.sub(point, segStart);
    
    const segLenSq = Vec2.lengthSq(segVec);
    if (segLenSq === 0) {
      return {
        distance: Vec2.length(pointVec),
        closestPoint: segStart,
      };
    }
    
    let t = Math.max(0, Math.min(1, Vec2.dot(pointVec, segVec) / segLenSq));
    const closest = Vec2.add(segStart, Vec2.mul(segVec, t));
    
    return {
      distance: Vec2.distance(point, closest),
      closestPoint: closest,
    };
  },
  
  // Line intersection
  lineIntersect: (
    a1: Vector2, a2: Vector2,
    b1: Vector2, b2: Vector2
  ): Vector2 | null => {
    const d1 = Vec2.sub(a2, a1);
    const d2 = Vec2.sub(b2, b1);
    
    const det = d1.x * d2.y - d1.y * d2.x;
    if (det === 0) return null; // Parallel
    
    const diff = Vec2.sub(b1, a1);
    const t = (diff.x * d2.y - diff.y * d2.x) / det;
    
    return Vec2.add(a1, Vec2.mul(d1, t));
  },
  
  // Segment intersection
  segmentIntersect: (
    a1: Vector2, a2: Vector2,
    b1: Vector2, b2: Vector2
  ): Vector2 | null => {
    const result = Geometry.lineIntersect(a1, a2, b1, b2);
    if (!result) return null;
    
    // Check if intersection is within both segments
    const inA = 
      Math.min(a1.x, a2.x) <= result.x && result.x <= Math.max(a1.x, a2.x) &&
      Math.min(a1.y, a2.y) <= result.y && result.y <= Math.max(a1.y, a2.y);
    
    const inB = 
      Math.min(b1.x, b2.x) <= result.x && result.x <= Math.max(b1.x, b2.x) &&
      Math.min(b1.y, b2.y) <= result.y && result.y <= Math.max(b1.y, b2.y);
    
    return inA && inB ? result : null;
  },
};

// ============================================================================
// Numerical Utilities
// ============================================================================

export const Num = {
  clamp: (value: number, min: number, max: number): number =>
    Math.max(min, Math.min(max, value)),
  
  lerp: (a: number, b: number, t: number): number =>
    a + (b - a) * t,
  
  smoothStep: (edge0: number, edge1: number, x: number): number => {
    const t = Num.clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  },
  
  equals: (a: number, b: number, epsilon: number = 1e-6): boolean =>
    Math.abs(a - b) < epsilon,
  
  toDegrees: (radians: number): number => radians * 180 / Math.PI,
  
  toRadians: (degrees: number): number => degrees * Math.PI / 180,
  
  normalizeAngle: (angle: number): number => {
    while (angle > Math.PI) angle -= 2 * Math.PI;
    while (angle < -Math.PI) angle += 2 * Math.PI;
    return angle;
  },
  
  angleDifference: (a: number, b: number): number => {
    let diff = b - a;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    return diff;
  },
  
  // Gaussian random for more natural distributions
  gaussianRandom: (mean: number = 0, stdDev: number = 1): number => {
    const u1 = 1 - Math.random();
    const u2 = 1 - Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z * stdDev;
  },
  
  // Round to nearest value
  snap: (value: number, step: number): number =>
    Math.round(value / step) * step,
};

// ============================================================================
// Matrix2x2 for physics transformations
// ============================================================================

export interface Matrix2x2 {
  m00: number; m01: number;
  m10: number; m11: number;
}

export const Matrix2 = {
  identity: (): Matrix2x2 => ({
    m00: 1, m01: 0,
    m10: 0, m11: 1,
  }),
  
  fromRotation: (angle: number): Matrix2x2 => {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return {
      m00: c, m01: -s,
      m10: s, m11: c,
    };
  },
  
  mul: (m: Matrix2x2, v: Vector2): Vector2 => ({
    x: m.m00 * v.x + m.m01 * v.y,
    y: m.m10 * v.x + m.m11 * v.y,
  }),
  
  transpose: (m: Matrix2x2): Matrix2x2 => ({
    m00: m.m00, m01: m.m10,
    m10: m.m01, m11: m.m11,
  }),
};

// ============================================================================
// Physics-specific math
// ============================================================================

export const PhysicsMath = {
  // Calculate impulse for collision response
  calculateImpulse: (
    velA: Vector2, velB: Vector2,
    massA: number, massB: number,
    normal: Vector2,
    restitution: number
  ): number => {
    const relVel = Vec2.sub(velB, velA);
    const velAlongNormal = Vec2.dot(relVel, normal);
    
    if (velAlongNormal > 0) return 0;
    
    const invMassA = 1 / massA;
    const invMassB = 1 / massB;
    
    let j = -(1 + restitution) * velAlongNormal;
    j /= invMassA + invMassB;
    
    return j;
  },
  
  // Calculate friction impulse
  calculateFrictionImpulse: (
    tangent: Vector2,
    relVel: Vector2,
    normalImpulse: number,
    friction: number
  ): number => {
    const velAlongTangent = Vec2.dot(relVel, tangent);
    let jt = -velAlongTangent;
    jt /= 1; // Mass terms would go here
    
    // Clamp friction
    if (Math.abs(jt) > normalImpulse * friction) {
      jt = Math.sign(jt) * normalImpulse * friction;
    }
    
    return jt;
  },
  
  // Position correction for penetration resolution
  positionalCorrection: (
    posA: Vector2, posB: Vector2,
    massA: number, massB: number,
    penetration: number,
    percent: number = 0.4,
    slop: number = 0.01
  ): { correctionA: Vector2; correctionB: Vector2 } => {
    if (penetration < slop) {
      return { 
        correctionA: Vec2.zero(), 
        correctionB: Vec2.zero() 
      };
    }
    
    const normal = Vec2.normalize(Vec2.sub(posB, posA));
    const correction = Math.max(penetration - slop, 0) / (1 / massA + 1 / massB) * percent;
    
    return {
      correctionA: Vec2.mul(normal, -correction / massA),
      correctionB: Vec2.mul(normal, correction / massB),
    };
  },
};
