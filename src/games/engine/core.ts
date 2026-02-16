// ============================================================================
// AAA DETERMINISTIC GAME ENGINE
// Enterprise-Grade Core for Multi-Game Platform
// ============================================================================

import { produce } from 'immer';
import { compress, decompress } from 'lz-string';

// ============================================================================
// CORE TYPES
// ============================================================================

export type Seed = number;
export type Checksum = string;
export type Version = number;

export interface GameState<TPayload = Record<string, unknown>> {
  version: Version;
  payload: TPayload;
  checksum?: Checksum;
  currentPlayerId?: string;
  
  // Enhanced metadata
  metadata?: GameMetadata;
  analytics?: GameAnalytics;
}

export interface GameMetadata {
  gameId: string;
  gameType: string;
  createdAt: number;
  lastModified: number;
  seed: Seed;
  playerIds: string[];
  tags?: string[];
  customData?: Record<string, unknown>;
}

export interface GameAnalytics {
  totalMoves: number;
  averageMoveTime: number;
  stateSize: number;           // bytes
  compressionRatio: number;
  checksumFailures: number;
  undoCount: number;
  redoCount: number;
  snapshotCount: number;
}

export interface Move<TData = Record<string, unknown>> {
  playerId: string;
  moveNumber: number;
  type: string;
  data: TData;
  timestamp: number;
  
  // Enhanced fields
  checksum?: Checksum;
  duration?: number;           // How long move took (ms)
  device?: DeviceInfo;
  validated?: boolean;
}

export interface DeviceInfo {
  platform: 'ios' | 'android' | 'web' | 'desktop';
  browser?: string;
  userAgent?: string;
  screenResolution?: string;
}

// ============================================================================
// SNAPSHOT SYSTEM
// ============================================================================

export interface StateSnapshot<TPayload = Record<string, unknown>> {
  id: string;
  version: Version;
  state: GameState<TPayload>;
  timestamp: number;
  compressed: boolean;
  size: number;                // bytes
  label?: string;              // "checkpoint", "autosave", "manual"
}

export interface SnapshotManager<TPayload> {
  createSnapshot(state: GameState<TPayload>, label?: string): StateSnapshot<TPayload>;
  restoreSnapshot(snapshotId: string): GameState<TPayload> | null;
  listSnapshots(): StateSnapshot<TPayload>[];
  deleteSnapshot(snapshotId: string): boolean;
  compressSnapshot(snapshot: StateSnapshot<TPayload>): StateSnapshot<TPayload>;
  getSnapshotSize(snapshotId: string): number;
}

// ============================================================================
// REPLAY SYSTEM
// ============================================================================

export interface ReplayData<TPayload = Record<string, unknown>> {
  replayId: string;
  gameId: string;
  initialState: GameState<TPayload>;
  moves: Move[];
  finalState: GameState<TPayload>;
  
  metadata: {
    duration: number;
    playerCount: number;
    winner?: string;
    createdAt: number;
  };
  
  compressed: boolean;
  version: string;             // Engine version
}

export interface ReplayPlayer<TPayload> {
  load(replayData: ReplayData<TPayload>): void;
  play(): void;
  pause(): void;
  step(count?: number): void;
  seek(version: number): void;
  setSpeed(speed: number): void;
  getCurrentState(): GameState<TPayload>;
  getProgress(): number;       // 0-1
}

// ============================================================================
// STATE DIFFING (for network sync)
// ============================================================================

export interface StateDiff {
  version: Version;
  operations: DiffOperation[];
  checksum: Checksum;
  timestamp: number;
}

export type DiffOperation = 
  | { op: 'add'; path: string; value: any }
  | { op: 'remove'; path: string }
  | { op: 'replace'; path: string; value: any }
  | { op: 'move'; from: string; path: string }
  | { op: 'copy'; from: string; path: string };

// ============================================================================
// ERROR HANDLING
// ============================================================================

export class EngineError extends Error {
  constructor(
    message: string,
    public code: EngineErrorCode,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'EngineError';
  }
}

export enum EngineErrorCode {
  INVALID_MOVE = 'INVALID_MOVE',
  CHECKSUM_MISMATCH = 'CHECKSUM_MISMATCH',
  VERSION_CONFLICT = 'VERSION_CONFLICT',
  REPLAY_FAILED = 'REPLAY_FAILED',
  SNAPSHOT_NOT_FOUND = 'SNAPSHOT_NOT_FOUND',
  DESYNC = 'DESYNC',
  INVALID_STATE = 'INVALID_STATE',
  UNDO_NOT_AVAILABLE = 'UNDO_NOT_AVAILABLE',
  REDO_NOT_AVAILABLE = 'REDO_NOT_AVAILABLE'
}

// ============================================================================
// RNG SYSTEM (Better than simple LCG)
// ============================================================================

export class AdvancedRNG {
  private state: Uint32Array;
  private index: number;
  
  constructor(seed: Seed) {
    this.state = new Uint32Array(4);
    this.index = 0;
    this.setSeed(seed);
  }
  
  /**
   * Xoshiro128** algorithm - Much better than LCG
   * Fast, high-quality, period of 2^128-1
   */
  private next(): number {
    const result = this.rotl(this.state[1] * 5, 7) * 9;
    const t = this.state[1] << 9;

    this.state[2] ^= this.state[0];
    this.state[3] ^= this.state[1];
    this.state[1] ^= this.state[2];
    this.state[0] ^= this.state[3];

    this.state[2] ^= t;
    this.state[3] = this.rotl(this.state[3], 11);

    return result >>> 0;
  }
  
  private rotl(x: number, k: number): number {
    return (x << k) | (x >>> (32 - k));
  }
  
  private setSeed(seed: Seed): void {
    // SplitMix64 to initialize state from seed
    let s = seed;
    for (let i = 0; i < 4; i++) {
      s += 0x9e3779b97f4a7c15;
      let z = s;
      z = (z ^ (z >>> 30)) * 0xbf58476d1ce4e5b9;
      z = (z ^ (z >>> 27)) * 0x94d049bb133111eb;
      this.state[i] = (z ^ (z >>> 31)) >>> 0;
    }
  }
  
  /**
   * Random number [0, 1)
   */
  random(): number {
    return this.next() / 0x100000000;
  }
  
  /**
   * Random integer [0, max)
   */
  randomInt(max: number): number {
    return Math.floor(this.random() * max);
  }
  
  /**
   * Random integer [min, max]
   */
  randomRange(min: number, max: number): number {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }
  
  /**
   * Random float [min, max]
   */
  randomFloat(min: number, max: number): number {
    return this.random() * (max - min) + min;
  }
  
  /**
   * Random boolean with probability
   */
  randomBool(probability = 0.5): boolean {
    return this.random() < probability;
  }
  
  /**
   * Shuffle array in-place (Fisher-Yates)
   */
  shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = this.randomInt(i + 1);
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
  
  /**
   * Pick random element from array
   */
  choice<T>(array: T[]): T {
    return array[this.randomInt(array.length)];
  }
  
  /**
   * Weighted random choice
   */
  weightedChoice<T>(items: T[], weights: number[]): T {
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = this.random() * totalWeight;
    
    for (let i = 0; i < items.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return items[i];
      }
    }
    
    return items[items.length - 1];
  }
  
  /**
   * Save RNG state for replay
   */
  saveState(): Uint32Array {
    return new Uint32Array(this.state);
  }
  
  /**
   * Restore RNG state
   */
  restoreState(state: Uint32Array): void {
    this.state.set(state);
  }
}

// ============================================================================
// ENHANCED DETERMINISTIC ENGINE
// ============================================================================

export interface EngineConfig {
  enableSnapshots?: boolean;
  snapshotInterval?: number;      // Create snapshot every N moves
  maxSnapshots?: number;           // Keep only last N snapshots
  enableCompression?: boolean;     // Compress snapshots
  enableAnalytics?: boolean;       // Track performance metrics
  validateChecksums?: boolean;     // Verify state integrity
  enableUndo?: boolean;            // Allow undo/redo
  maxUndoSteps?: number;           // Maximum undo history
  enableReplay?: boolean;          // Record for replay
  enableStateDiff?: boolean;       // Generate state diffs
}

export class DeterministicEngine {
  protected rng: AdvancedRNG;
  protected seed: Seed;
  protected stage: number = 0;
  
  // State history for undo/redo
  protected history: GameState<any>[] = [];
  protected historyIndex: number = -1;
  
  // Snapshot system
  protected snapshots: Map<string, StateSnapshot<any>> = new Map();
  
  // Replay recording
  protected recordedMoves: Move[] = [];
  protected initialStateForReplay?: GameState<any>;
  
  // Configuration
  protected config: Required<EngineConfig>;
  
  // Analytics
  protected analytics: GameAnalytics = {
    totalMoves: 0,
    averageMoveTime: 0,
    stateSize: 0,
    compressionRatio: 1,
    checksumFailures: 0,
    undoCount: 0,
    redoCount: 0,
    snapshotCount: 0
  };
  
  constructor(initialSeed: Seed, config?: EngineConfig) {
    this.seed = initialSeed;
    this.rng = new AdvancedRNG(initialSeed);
    
    this.config = {
      enableSnapshots: config?.enableSnapshots ?? true,
      snapshotInterval: config?.snapshotInterval ?? 10,
      maxSnapshots: config?.maxSnapshots ?? 50,
      enableCompression: config?.enableCompression ?? true,
      enableAnalytics: config?.enableAnalytics ?? true,
      validateChecksums: config?.validateChecksums ?? true,
      enableUndo: config?.enableUndo ?? true,
      maxUndoSteps: config?.maxUndoSteps ?? 100,
      enableReplay: config?.enableReplay ?? true,
      enableStateDiff: config?.enableStateDiff ?? false
    };
  }
  
  // ============================================================================
  // RANDOM NUMBER GENERATION
  // ============================================================================
  
  /**
   * Random number [0, 1)
   */
  protected random(): number {
    this.stage++;
    return this.rng.random();
  }
  
  /**
   * Roll a dice (default 6-sided)
   */
  public rollDice(sides = 6): number {
    this.stage++;
    return this.rng.randomRange(1, sides);
  }
  
  /**
   * Roll multiple dice and return sum
   */
  public rollDiceMultiple(count: number, sides = 6): number {
    let sum = 0;
    for (let i = 0; i < count; i++) {
      sum += this.rollDice(sides);
    }
    return sum;
  }
  
  /**
   * Random integer [0, max)
   */
  protected randomInt(max: number): number {
    this.stage++;
    return this.rng.randomInt(max);
  }
  
  /**
   * Random range [min, max]
   */
  protected randomRange(min: number, max: number): number {
    this.stage++;
    return this.rng.randomRange(min, max);
  }
  
  /**
   * Random float [min, max]
   */
  protected randomFloat(min: number, max: number): number {
    this.stage++;
    return this.rng.randomFloat(min, max);
  }
  
  /**
   * Random boolean
   */
  protected randomBool(probability = 0.5): boolean {
    this.stage++;
    return this.rng.randomBool(probability);
  }
  
  /**
   * Shuffle array
   */
  protected shuffle<T>(array: T[]): T[] {
    this.stage++;
    return this.rng.shuffle([...array]);
  }
  
  /**
   * Pick random element
   */
  protected choice<T>(array: T[]): T {
    this.stage++;
    return this.rng.choice(array);
  }
  
  /**
   * Weighted random choice
   */
  protected weightedChoice<T>(items: T[], weights: number[]): T {
    this.stage++;
    return this.rng.weightedChoice(items, weights);
  }
  
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  /**
   * Reset engine to initial seed
   */
  protected resetSeed(seed: Seed): void {
    this.seed = seed;
    this.rng = new AdvancedRNG(seed);
    this.stage = 0;
    this.history = [];
    this.historyIndex = -1;
    this.recordedMoves = [];
    this.initialStateForReplay = undefined;
  }
  
  /**
   * Create next state (immutable)
   */
  protected nextState<TPayload>(
    state: GameState<TPayload>,
    payload: TPayload,
    meta?: Partial<Omit<GameState<TPayload>, 'payload' | 'version'>>
  ): GameState<TPayload> {
    const nextVersion = state.version + 1;
    const nextState: GameState<TPayload> = {
      version: nextVersion,
      payload,
      checksum: this.computeChecksum(payload, nextVersion),
      currentPlayerId: meta?.currentPlayerId ?? state.currentPlayerId,
      metadata: {
        ...state.metadata,
        lastModified: Date.now()
      } as GameMetadata,
      analytics: this.config.enableAnalytics ? this.analytics : undefined
    };
    
    // Update history for undo/redo
    if (this.config.enableUndo) {
      this.addToHistory(nextState);
    }
    
    // Create snapshot if needed
    if (this.config.enableSnapshots && nextVersion % this.config.snapshotInterval === 0) {
      this.createSnapshot(nextState, 'auto');
    }
    
    // Validate checksum
    if (this.config.validateChecksums && state.checksum) {
      this.validateChecksum(state);
    }
    
    return nextState;
  }
  
  /**
   * Create state using Immer (immutable updates)
   */
  protected produceState<TPayload>(
    state: GameState<TPayload>,
    recipe: (draft: TPayload) => void,
    meta?: Partial<Omit<GameState<TPayload>, 'payload' | 'version'>>
  ): GameState<TPayload> {
    const nextPayload = produce(state.payload, recipe);
    return this.nextState(state, nextPayload, meta);
  }
  
  // ============================================================================
  // CHECKSUM & VALIDATION
  // ============================================================================
  
  /**
   * Compute state checksum (SHA-256 like hash)
   */
  protected computeChecksum(payload: unknown, version: Version): Checksum {
    const serialized = JSON.stringify({
      payload,
      version,
      stage: this.stage,
      seed: this.seed
    });
    
    // FNV-1a hash (fast and good distribution)
    let hash = 2166136261;
    for (let i = 0; i < serialized.length; i++) {
      hash ^= serialized.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    
    return (hash >>> 0).toString(16).padStart(8, '0');
  }
  
  /**
   * Validate state checksum
   */
  protected validateChecksum<TPayload>(state: GameState<TPayload>): boolean {
    if (!state.checksum) return true;
    
    const expectedChecksum = this.computeChecksum(state.payload, state.version);
    const isValid = expectedChecksum === state.checksum;
    
    if (!isValid) {
      this.analytics.checksumFailures++;
      throw new EngineError(
        'Checksum validation failed - possible state corruption',
        EngineErrorCode.CHECKSUM_MISMATCH,
        {
          expected: expectedChecksum,
          actual: state.checksum,
          version: state.version
        }
      );
    }
    
    return true;
  }
  
  /**
   * Verify state integrity
   */
  public verifyState<TPayload>(state: GameState<TPayload>): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    // Check version
    if (state.version < 0) {
      errors.push('Invalid version number');
    }
    
    // Check checksum
    try {
      this.validateChecksum(state);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Checksum validation failed: ${message}`);
    }
    
    // Check payload
    if (!state.payload || typeof state.payload !== 'object') {
      errors.push('Invalid payload');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  private verifyReplayMoves(moves: Move[], engine: DeterministicEngine): void {
    if (!engine) {
      throw new EngineError('Engine instance required for replay verification', EngineErrorCode.REPLAY_FAILED);
    }

    if (!Array.isArray(moves) || moves.length === 0) {
      throw new EngineError('Replay contains no moves', EngineErrorCode.REPLAY_FAILED);
    }

    let expectedMoveNumber = moves[0].moveNumber;

    for (const move of moves) {
      if (move.moveNumber !== expectedMoveNumber) {
        throw new EngineError(
          `Replay move order mismatch: expected ${expectedMoveNumber}, received ${move.moveNumber}`,
          EngineErrorCode.REPLAY_FAILED
        );
      }

      if (!move.playerId) {
        throw new EngineError('Replay move missing playerId', EngineErrorCode.REPLAY_FAILED);
      }

      expectedMoveNumber++;
    }
  }
  
  // ============================================================================
  // UNDO/REDO SYSTEM
  // ============================================================================
  
  private addToHistory<TPayload>(state: GameState<TPayload>): void {
    // Remove any states after current index (when undoing then making new move)
    this.history = this.history.slice(0, this.historyIndex + 1);
    
    // Add new state
    this.history.push(state);
    this.historyIndex++;
    
    // Trim history if too large
    if (this.history.length > this.config.maxUndoSteps) {
      this.history.shift();
      this.historyIndex--;
    }
  }
  
  /**
   * Undo last move
   */
  public undo<TPayload>(): GameState<TPayload> | null {
    if (!this.config.enableUndo) {
      throw new EngineError('Undo is disabled', EngineErrorCode.UNDO_NOT_AVAILABLE);
    }
    
    if (this.historyIndex <= 0) {
      return null;
    }
    
    this.historyIndex--;
    this.analytics.undoCount++;
    
    return this.history[this.historyIndex] as GameState<TPayload>;
  }
  
  /**
   * Redo last undone move
   */
  public redo<TPayload>(): GameState<TPayload> | null {
    if (!this.config.enableUndo) {
      throw new EngineError('Redo is disabled', EngineErrorCode.REDO_NOT_AVAILABLE);
    }
    
    if (this.historyIndex >= this.history.length - 1) {
      return null;
    }
    
    this.historyIndex++;
    this.analytics.redoCount++;
    
    return this.history[this.historyIndex] as GameState<TPayload>;
  }
  
  /**
   * Check if undo is available
   */
  public canUndo(): boolean {
    return this.config.enableUndo && this.historyIndex > 0;
  }
  
  /**
   * Check if redo is available
   */
  public canRedo(): boolean {
    return this.config.enableUndo && this.historyIndex < this.history.length - 1;
  }
  
  /**
   * Get history length
   */
  public getHistoryLength(): number {
    return this.history.length;
  }
  
  /**
   * Clear history
   */
  public clearHistory(): void {
    this.history = [];
    this.historyIndex = -1;
  }
  
  // ============================================================================
  // SNAPSHOT SYSTEM
  // ============================================================================
  
  /**
   * Create state snapshot
   */
  public createSnapshot<TPayload>(
    state: GameState<TPayload>,
    label = 'manual'
  ): StateSnapshot<TPayload> {
    const id = `snapshot-${state.version}-${Date.now()}`;
    
    let snapshotState = state;
    let compressed = false;
    
    if (this.config.enableCompression) {
      const serialized = JSON.stringify(state);
      const compressedData = compress(serialized);
      
      // Only use compression if it actually reduces size
      if (compressedData.length < serialized.length) {
        compressed = true;
        snapshotState = compressedData as any;
      }
    }
    
    const snapshot: StateSnapshot<TPayload> = {
      id,
      version: state.version,
      state: snapshotState,
      timestamp: Date.now(),
      compressed,
      size: JSON.stringify(snapshotState).length,
      label
    };
    
    this.snapshots.set(id, snapshot);
    this.analytics.snapshotCount++;
    
    // Trim old snapshots
    if (this.snapshots.size > this.config.maxSnapshots) {
      const oldestId = Array.from(this.snapshots.keys())[0];
      this.snapshots.delete(oldestId);
    }
    
    return snapshot;
  }
  
  /**
   * Restore from snapshot
   */
  public restoreSnapshot<TPayload>(snapshotId: string): GameState<TPayload> | null {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) {
      throw new EngineError(
        `Snapshot ${snapshotId} not found`,
        EngineErrorCode.SNAPSHOT_NOT_FOUND
      );
    }
    
    let state = snapshot.state;
    
    if (snapshot.compressed) {
      const decompressed = decompress(state as any);
      state = JSON.parse(decompressed);
    }
    
    return state as GameState<TPayload>;
  }
  
  /**
   * List all snapshots
   */
  public listSnapshots(): StateSnapshot<any>[] {
    return Array.from(this.snapshots.values());
  }
  
  /**
   * Delete snapshot
   */
  public deleteSnapshot(snapshotId: string): boolean {
    return this.snapshots.delete(snapshotId);
  }
  
  /**
   * Get snapshot by version
   */
  public getSnapshotByVersion<TPayload>(version: Version): StateSnapshot<TPayload> | null {
    for (const snapshot of this.snapshots.values()) {
      if (snapshot.version === version) {
        return snapshot as StateSnapshot<TPayload>;
      }
    }
    return null;
  }
  
  /**
   * Get nearest snapshot to version
   */
  public getNearestSnapshot<TPayload>(
    version: Version
  ): StateSnapshot<TPayload> | null {
    let nearest: StateSnapshot<any> | null = null;
    let minDiff = Infinity;
    
    for (const snapshot of this.snapshots.values()) {
      const diff = Math.abs(snapshot.version - version);
      if (diff < minDiff && snapshot.version <= version) {
        minDiff = diff;
        nearest = snapshot;
      }
    }
    
    return nearest as StateSnapshot<TPayload> | null;
  }
  
  // ============================================================================
  // REPLAY SYSTEM
  // ============================================================================
  
  /**
   * Start recording for replay
   */
  public startRecording<TPayload>(initialState: GameState<TPayload>): void {
    if (!this.config.enableReplay) return;
    
    this.initialStateForReplay = initialState;
    this.recordedMoves = [];
  }
  
  /**
   * Record a move
   */
  public recordMove(move: Move): void {
    if (!this.config.enableReplay || !this.initialStateForReplay) return;
    
    this.recordedMoves.push(move);
  }
  
  /**
   * Stop recording and get replay data
   */
  public stopRecording<TPayload>(
    finalState: GameState<TPayload>,
    metadata?: Partial<ReplayData<TPayload>['metadata']>
  ): ReplayData<TPayload> {
    if (!this.initialStateForReplay) {
      throw new EngineError('No recording in progress', EngineErrorCode.REPLAY_FAILED);
    }
    
    const replayData: ReplayData<TPayload> = {
      replayId: `replay-${Date.now()}`,
      gameId: finalState.metadata?.gameId ?? '',
      initialState: this.initialStateForReplay as GameState<TPayload>,
      moves: this.recordedMoves,
      finalState,
      metadata: {
        duration: Date.now() - (this.initialStateForReplay.metadata?.createdAt ?? 0),
        playerCount: this.initialStateForReplay.metadata?.playerIds?.length ?? 0,
        winner: metadata?.winner,
        createdAt: Date.now()
      },
      compressed: this.config.enableCompression,
      version: '1.0.0'
    };
    
    // Clear recording
    this.initialStateForReplay = undefined;
    this.recordedMoves = [];
    
    return replayData;
  }
  
  /**
   * Verify replay integrity
   */
  public verifyReplay<TPayload>(
    replayData: ReplayData<TPayload>,
    engine: DeterministicEngine
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    try {
      this.verifyReplayMoves(replayData.moves, engine);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Replay verification failed: ${message}`);
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  // ============================================================================
  // STATE COMPRESSION
  // ============================================================================
  
  /**
   * Compress state for storage/network
   */
  public compressState<TPayload>(state: GameState<TPayload>): string {
    const serialized = JSON.stringify(state);
    return compress(serialized);
  }
  
  /**
   * Decompress state
   */
  public decompressState<TPayload>(compressed: string): GameState<TPayload> {
    const decompressed = decompress(compressed);
    return JSON.parse(decompressed);
  }
  
  /**
   * Get compression ratio
   */
  public getCompressionRatio<TPayload>(state: GameState<TPayload>): number {
    const original = JSON.stringify(state);
    const compressed = this.compressState(state);
    return compressed.length / original.length;
  }
  
  // ============================================================================
  // STATE DIFFING (for efficient sync)
  // ============================================================================
  
  /**
   * Generate diff between two states
   */
  public generateDiff<TPayload>(
    oldState: GameState<TPayload>,
    newState: GameState<TPayload>
  ): StateDiff {
    const operations: DiffOperation[] = [];
    
    // Simple implementation - in production, use a proper diff library
    this.diffObjects('', oldState.payload as any, newState.payload as any, operations);
    
    return {
      version: newState.version,
      operations,
      checksum: this.computeChecksum(newState.payload, newState.version),
      timestamp: Date.now()
    };
  }
  
  private diffObjects(path: string, oldObj: any, newObj: any, operations: DiffOperation[]): void {
    // Simplified diff - in production use json-patch or similar
    const oldKeys = new Set(Object.keys(oldObj || {}));
    const newKeys = new Set(Object.keys(newObj || {}));
    
    // Added or changed keys
    for (const key of newKeys) {
      const fullPath = path ? `${path}.${key}` : key;
      
      if (!oldKeys.has(key)) {
        operations.push({ op: 'add', path: fullPath, value: newObj[key] });
      } else if (JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key])) {
        if (typeof newObj[key] === 'object' && typeof oldObj[key] === 'object') {
          this.diffObjects(fullPath, oldObj[key], newObj[key], operations);
        } else {
          operations.push({ op: 'replace', path: fullPath, value: newObj[key] });
        }
      }
    }
    
    // Removed keys
    for (const key of oldKeys) {
      if (!newKeys.has(key)) {
        const fullPath = path ? `${path}.${key}` : key;
        operations.push({ op: 'remove', path: fullPath });
      }
    }
  }
  
  /**
   * Apply diff to state
   */
  public applyDiff<TPayload>(
    state: GameState<TPayload>,
    diff: StateDiff
  ): GameState<TPayload> {
    let payload = JSON.parse(JSON.stringify(state.payload));
    
    for (const op of diff.operations) {
      const pathParts = op.path.split('.');
      
      switch (op.op) {
        case 'add':
        case 'replace':
          this.setValueAtPath(payload, pathParts, op.value);
          break;
        case 'remove':
          this.deleteValueAtPath(payload, pathParts);
          break;
      }
    }
    
    return this.nextState(state, payload as TPayload);
  }
  
  private setValueAtPath(obj: any, path: string[], value: any): void {
    let current = obj;
    for (let i = 0; i < path.length - 1; i++) {
      if (!(path[i] in current)) {
        current[path[i]] = {};
      }
      current = current[path[i]];
    }
    current[path[path.length - 1]] = value;
  }
  
  private deleteValueAtPath(obj: any, path: string[]): void {
    let current = obj;
    for (let i = 0; i < path.length - 1; i++) {
      if (!(path[i] in current)) return;
      current = current[path[i]];
    }
    delete current[path[path.length - 1]];
  }
  
  // ============================================================================
  // ANALYTICS & DEBUGGING
  // ============================================================================
  
  /**
   * Get engine analytics
   */
  public getAnalytics(): GameAnalytics {
    return { ...this.analytics };
  }
  
  /**
   * Reset analytics
   */
  public resetAnalytics(): void {
    this.analytics = {
      totalMoves: 0,
      averageMoveTime: 0,
      stateSize: 0,
      compressionRatio: 1,
      checksumFailures: 0,
      undoCount: 0,
      redoCount: 0,
      snapshotCount: 0
    };
  }
  
  /**
   * Get current RNG state (for debugging)
   */
  public getRNGState(): Uint32Array {
    return this.rng.saveState();
  }
  
  /**
   * Restore RNG state (for debugging/testing)
   */
  public restoreRNGState(state: Uint32Array): void {
    this.rng.restoreState(state);
  }
  
  /**
   * Get engine info
   */
  public getEngineInfo(): {
    seed: Seed;
    stage: number;
    historySize: number;
    snapshotCount: number;
    config: EngineConfig;
  } {
    return {
      seed: this.seed,
      stage: this.stage,
      historySize: this.history.length,
      snapshotCount: this.snapshots.size,
      config: this.config
    };
  }
}