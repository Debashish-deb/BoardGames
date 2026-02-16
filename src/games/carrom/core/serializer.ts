// ============================================================================
// CARROM GAME ENGINE - STATE SERIALIZER
// AAA Mobile Game Quality - Rovio/Clash of Clans Standard
//
// Features:
// - Deterministic state serialization for multiplayer sync
// - Move encoding/decoding
// - State hashing for anti-cheat
// - Compression for network efficiency
// ============================================================================

import { 
  GameState, 
  Body, 
  ShotInput, 
  SerializedBody, 
  FrameState,
  ShotRecord,
  Player,
  Vector2,
  Spin,
  PlayerId
} from "./types";
import { BOARD, COIN_CONFIG } from "./constants";
import { Vec2 } from "../utils/math";

// Binary serializer for efficient network transfer
export class BinarySerializer {
  private buffer: ArrayBuffer;
  private view: DataView;
  private offset: number = 0;

  constructor(size: number = 4096) {
    this.buffer = new ArrayBuffer(size);
    this.view = new DataView(this.buffer);
  }

  // Write methods
  writeFloat32(value: number): void {
    this.view.setFloat32(this.offset, value, true); // little-endian
    this.offset += 4;
  }

  writeFloat64(value: number): void {
    this.view.setFloat64(this.offset, value, true);
    this.offset += 8;
  }

  writeInt32(value: number): void {
    this.view.setInt32(this.offset, value, true);
    this.offset += 4;
  }

  writeUint32(value: number): void {
    this.view.setUint32(this.offset, value, true);
    this.offset += 4;
  }

  writeUint16(value: number): void {
    this.view.setUint16(this.offset, value, true);
    this.offset += 2;
  }

  writeInt16(value: number): void {
    this.view.setInt16(this.offset, value, true);
    this.offset += 2;
  }

  writeUint8(value: number): void {
    this.view.setUint8(this.offset, value);
    this.offset += 1;
  }

  writeBool(value: boolean): void {
    this.writeUint8(value ? 1 : 0);
  }

  writeString(value: string): void {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(value);
    this.writeUint16(bytes.length);
    for (const byte of bytes) {
      this.writeUint8(byte);
    }
  }

  // Read methods
  readFloat32(): number {
    const value = this.view.getFloat32(this.offset, true);
    this.offset += 4;
    return value;
  }

  readFloat64(): number {
    const value = this.view.getFloat64(this.offset, true);
    this.offset += 8;
    return value;
  }

  readInt32(): number {
    const value = this.view.getInt32(this.offset, true);
    this.offset += 4;
    return value;
  }

  readUint32(): number {
    const value = this.view.getUint32(this.offset, true);
    this.offset += 4;
    return value;
  }

  readUint16(): number {
    const value = this.view.getUint16(this.offset, true);
    this.offset += 2;
    return value;
  }

  readInt16(): number {
    const value = this.view.getInt16(this.offset, true);
    this.offset += 2;
    return value;
  }

  readUint8(): number {
    const value = this.view.getUint8(this.offset);
    this.offset += 1;
    return value;
  }

  readBool(): boolean {
    return this.readUint8() === 1;
  }

  readString(): string {
    const length = this.readUint16();
    const bytes = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
      bytes[i] = this.readUint8();
    }
    const decoder = new TextDecoder();
    return decoder.decode(bytes);
  }

  // Get serialized data
  getBytes(): Uint8Array {
    return new Uint8Array(this.buffer, 0, this.offset);
  }

  // Load from bytes
  loadBytes(bytes: Uint8Array): void {
    const copy = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(copy).set(bytes);
    this.buffer = copy;
    this.view = new DataView(this.buffer);
    this.offset = 0;
  }

  reset(): void {
    this.offset = 0;
  }

  getOffset(): number {
    return this.offset;
  }
}

// State serializer
export class StateSerializer {
  private serializer: BinarySerializer;

  constructor() {
    this.serializer = new BinarySerializer(8192);
  }

  // Serialize game state for network transfer
  serializeState(state: GameState): Uint8Array {
    this.serializer.reset();

    // Header
    this.serializer.writeUint32(state.seed);
    this.serializer.writeUint32(state.frame);
    this.serializer.writeUint8(state.currentPlayer);
    this.serializer.writeUint8(state.turn);
    this.serializer.writeUint8(state.phase === "menu" ? 0 :
      state.phase === "lobby" ? 1 :
      state.phase === "aim" ? 2 :
      state.phase === "simulate" ? 3 :
      state.phase === "resolve" ? 4 :
      state.phase === "break" ? 5 :
      state.phase === "gameover" ? 6 : 7);

    // Scores
    for (let i = 0; i < 4; i++) {
      this.serializer.writeInt32(state.scores[i as 0 | 1 | 2 | 3] || 0);
    }

    // Queen state
    this.serializer.writeUint8(
      state.queenState === "center" ? 0 :
      state.queenState === "taken" ? 1 :
      state.queenState === "covered" ? 2 : 3
    );
    this.serializer.writeUint8(state.queenOwner ?? 255);

    // Bodies
    this.serializer.writeUint8(state.bodies.length);
    for (const body of state.bodies) {
      this.serializeBody(body);
    }

    return this.serializer.getBytes();
  }

  private serializeBody(body: Body): void {
    // Encode type in 2 bits
    const typeCode = body.type === "white" ? 0 :
      body.type === "black" ? 1 :
      body.type === "queen" ? 2 : 3;

    // Pack active and type into one byte
    const packed = (typeCode << 1) | (body.active ? 1 : 0);
    this.serializer.writeUint8(packed);

    // Position (quantized to save space)
    this.serializer.writeUint16(Math.round(body.pos.x * 10));
    this.serializer.writeUint16(Math.round(body.pos.y * 10));

    // Velocity (only if moving)
    const speed = Math.hypot(body.vel.x, body.vel.y);
    if (speed > 0.01) {
      this.serializer.writeBool(true);
      this.serializer.writeInt16(Math.round(body.vel.x * 100));
      this.serializer.writeInt16(Math.round(body.vel.y * 100));
    } else {
      this.serializer.writeBool(false);
    }

    // Spin (optional)
    if (body.spin && (body.spin.x !== 0 || body.spin.y !== 0 || body.spin.z !== 0)) {
      this.serializer.writeBool(true);
      this.serializer.writeInt16(Math.round(body.spin.x * 1000));
      this.serializer.writeInt16(Math.round(body.spin.y * 1000));
      this.serializer.writeInt16(Math.round(body.spin.z * 1000));
    } else {
      this.serializer.writeBool(false);
    }
  }

  // Deserialize game state
  deserializeState(bytes: Uint8Array): Partial<GameState> {
    this.serializer.loadBytes(bytes);

    const phaseCodes = ["menu", "lobby", "aim", "simulate", "resolve", "break", "gameover", "paused"] as const;
    const queenStateCodes = ["center", "taken", "covered", "pending_cover"] as const;

    const emptyScores: Record<PlayerId, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };

    const state: Partial<GameState> = {
      seed: this.serializer.readUint32(),
      frame: this.serializer.readUint32(),
      currentPlayer: this.serializer.readUint8() as 0 | 1 | 2 | 3,
      turn: this.serializer.readUint8(),
      phase: phaseCodes[this.serializer.readUint8()],
      scores: { ...emptyScores },
      bodies: [],
    };

    // Scores
    for (let i = 0; i < 4; i++) {
      state.scores![i as 0 | 1 | 2 | 3] = this.serializer.readInt32();
    }

    // Queen state
    state.queenState = queenStateCodes[this.serializer.readUint8()];
    const queenOwner = this.serializer.readUint8();
    state.queenOwner = queenOwner === 255 ? undefined : queenOwner as PlayerId;

    // Bodies
    const bodyCount = this.serializer.readUint8();
    for (let i = 0; i < bodyCount; i++) {
      state.bodies!.push(this.deserializeBody());
    }

    return state;
  }

  private deserializeBody(): Body {
    const packed = this.serializer.readUint8();
    const typeCode = (packed >> 1) & 0x3;
    const active = (packed & 0x1) === 1;

    const type = typeCode === 0 ? "white" :
      typeCode === 1 ? "black" :
      typeCode === 2 ? "queen" : "striker";

    const pos = {
      x: this.serializer.readUint16() / 10,
      y: this.serializer.readUint16() / 10,
    };

    let vel = { x: 0, y: 0 };
    if (this.serializer.readBool()) {
      vel = {
        x: this.serializer.readInt16() / 100,
        y: this.serializer.readInt16() / 100,
      };
    }

    let spin: Spin | undefined;
    if (this.serializer.readBool()) {
      spin = {
        x: this.serializer.readInt16() / 1000,
        y: this.serializer.readInt16() / 1000,
        z: this.serializer.readInt16() / 1000,
      };
    }

    const radius = type === "striker" ? COIN_CONFIG.STRIKER.radius : COIN_CONFIG.WHITE.radius;
    const mass = type === "striker" ? COIN_CONFIG.STRIKER.mass : COIN_CONFIG.WHITE.mass;

    return {
      id: `coin_${Math.random().toString(36).substr(2, 9)}`,
      type,
      pos,
      vel,
      radius,
      mass,
      active,
      spin,
    };
  }

  // Serialize shot input
  serializeShotInput(input: ShotInput): Uint8Array {
    this.serializer.reset();

    this.serializer.writeFloat32(input.angle);
    this.serializer.writeFloat32(input.power);

    if (input.spin) {
      this.serializer.writeBool(true);
      this.serializer.writeFloat32(input.spin.x);
      this.serializer.writeFloat32(input.spin.y);
      this.serializer.writeFloat32(input.spin.z);
    } else {
      this.serializer.writeBool(false);
    }

    if (input.strikerPos) {
      this.serializer.writeBool(true);
      this.serializer.writeFloat32(input.strikerPos.x);
      this.serializer.writeFloat32(input.strikerPos.y);
    } else {
      this.serializer.writeBool(false);
    }

    return this.serializer.getBytes();
  }

  // Deserialize shot input
  deserializeShotInput(bytes: Uint8Array): ShotInput {
    this.serializer.loadBytes(bytes);

    const input: ShotInput = {
      angle: this.serializer.readFloat32(),
      power: this.serializer.readFloat32(),
    };

    if (this.serializer.readBool()) {
      input.spin = {
        x: this.serializer.readFloat32(),
        y: this.serializer.readFloat32(),
        z: this.serializer.readFloat32(),
      };
    }

    if (this.serializer.readBool()) {
      input.strikerPos = {
        x: this.serializer.readFloat32(),
        y: this.serializer.readFloat32(),
      };
    }

    return input;
  }
}

// State hashing for anti-cheat
export class StateHasher {
  // Simple but effective hash for state verification
  static hashState(state: GameState): string {
    const parts: string[] = [];

    // Frame and seed
    parts.push(state.frame.toString());
    parts.push(state.seed.toString());

    // Body states (only active bodies)
    const activeBodies = state.bodies
      .filter(b => b.active)
      .sort((a, b) => a.id.localeCompare(b.id));

    for (const body of activeBodies) {
      parts.push(body.id);
      parts.push(Math.round(body.pos.x).toString());
      parts.push(Math.round(body.pos.y).toString());
      parts.push(Math.round(body.vel.x * 100).toString());
      parts.push(Math.round(body.vel.y * 100).toString());
    }

    // Scores
    for (let i = 0; i < 4; i++) {
      parts.push((state.scores[i as 0 | 1 | 2 | 3] || 0).toString());
    }

    // Queen state
    parts.push(state.queenState);
    parts.push((state.queenOwner ?? "none").toString());

    // Create hash string
    const combined = parts.join("|");
    return this.simpleHash(combined);
  }

  // FNV-1a hash variant
  private static simpleHash(str: string): string {
    let hash = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }

  // Verify state integrity
  static verifyState(state: GameState, expectedHash: string): boolean {
    return this.hashState(state) === expectedHash;
  }
}

// Frame state recorder for replays
export class FrameRecorder {
  private frames: FrameState[] = [];
  private maxFrames: number;

  constructor(maxFrames: number = 60 * 60 * 10) { // 10 minutes at 60fps
    this.maxFrames = maxFrames;
  }

  recordFrame(state: GameState): void {
    const frameState: FrameState = {
      frame: state.frame,
      bodies: state.bodies.map(b => ({
        id: b.id,
        x: Math.round(b.pos.x * 100) / 100,
        y: Math.round(b.pos.y * 100) / 100,
        vx: Math.round(b.vel.x * 100) / 100,
        vy: Math.round(b.vel.y * 100) / 100,
        active: b.active,
        spin: b.spin ? [b.spin.x, b.spin.y, b.spin.z] : undefined,
      })),
      hash: StateHasher.hashState(state),
    };

    this.frames.push(frameState);

    // Remove old frames if exceeding max
    if (this.frames.length > this.maxFrames) {
      this.frames.shift();
    }
  }

  getFrames(): FrameState[] {
    return [...this.frames];
  }

  getFrameAt(frameNumber: number): FrameState | undefined {
    return this.frames.find(f => f.frame === frameNumber);
  }

  clear(): void {
    this.frames = [];
  }

  // Serialize for storage/transmission
  serialize(): string {
    return JSON.stringify(this.frames);
  }

  // Deserialize
  deserialize(data: string): void {
    this.frames = JSON.parse(data);
  }
}

// Shot record for replay
export class ShotRecorder {
  private shots: ShotRecord[] = [];

  recordShot(
    frame: number,
    player: import("./types").PlayerId,
    input: ShotInput,
    result: import("./types").ShotResult,
    duration: number
  ): void {
    this.shots.push({
      frame,
      player,
      input,
      result,
      duration,
    });
  }

  getShots(): ShotRecord[] {
    return [...this.shots];
  }

  getShotsByPlayer(player: import("./types").PlayerId): ShotRecord[] {
    return this.shots.filter(s => s.player === player);
  }

  clear(): void {
    this.shots = [];
  }

  serialize(): string {
    return JSON.stringify(this.shots);
  }

  deserialize(data: string): void {
    this.shots = JSON.parse(data);
  }
}

// Compression utilities
export const Compression = {
  // Simple RLE for position data
  compressPositions(positions: number[]): number[] {
    const result: number[] = [];
    let count = 1;
    let current = positions[0];

    for (let i = 1; i < positions.length; i++) {
      if (positions[i] === current && count < 255) {
        count++;
      } else {
        result.push(count, current);
        current = positions[i];
        count = 1;
      }
    }
    result.push(count, current);

    return result;
  },

  // Delta encoding for sequential frames
  deltaEncode(values: number[]): number[] {
    const result = [values[0]];
    for (let i = 1; i < values.length; i++) {
      result.push(values[i] - values[i - 1]);
    }
    return result;
  },

  // Delta decode
  deltaDecode(deltas: number[]): number[] {
    const result = [deltas[0]];
    for (let i = 1; i < deltas.length; i++) {
      result.push(result[i - 1] + deltas[i]);
    }
    return result;
  },
};
