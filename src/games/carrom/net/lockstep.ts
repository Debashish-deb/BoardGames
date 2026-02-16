// ============================================================================
// CARROM GAME ENGINE - LOCKSTEP MULTIPLAYER SYNC
// AAA Mobile Game Quality - Rovio/Clash of Clans Standard
//
// Features:
// - Deterministic lockstep synchronization
// - Input delay for lag compensation
// - State hash verification (anti-cheat)
// - Desync detection and recovery
// - Network prediction
// ============================================================================

import { 
  GameState, 
  PlayerId, 
  ShotInput, 
  NetworkInput, 
  LockstepFrame,
  GameSnapshot
} from "../core/types";
import { StateHasher, StateSerializer } from "../core/serializer";
import { NETWORK } from "../core/constants";
import { DeterministicRNG } from "../core/rng";

// Network player info
interface NetworkPlayer {
  id: PlayerId;
  latency: number;
  lastPing: number;
  connected: boolean;
  desyncCount: number;
}

// Lockstep engine
export class LockstepEngine {
  private localPlayerId: PlayerId;
  private players: Map<PlayerId, NetworkPlayer> = new Map();
  
  // Frame management
  private currentFrame: number = 0;
  private confirmedFrame: number = 0;
  private inputDelay: number = NETWORK.INPUT_DELAY_FRAMES;
  
  // Input buffers
  private inputBuffer: Map<number, Map<PlayerId, NetworkInput>> = new Map();
  private pendingInputs: NetworkInput[] = [];
  
  // State history for rollback
  private stateHistory: GameSnapshot[] = [];
  private maxHistoryFrames: number = 60; // 1 second
  
  // Sync
  private serializer: StateSerializer;
  private desyncDetected: boolean = false;
  private desyncFrame: number = -1;
  
  // Callbacks
  onDesync?: (frame: number, expected: string, actual: string) => void;
  onPlayerJoin?: (playerId: PlayerId) => void;
  onPlayerLeave?: (playerId: PlayerId) => void;
  onStateRequest?: (frame: number) => void;

  constructor(localPlayerId: PlayerId) {
    this.localPlayerId = localPlayerId;
    this.serializer = new StateSerializer();
  }

  // Register a player
  registerPlayer(playerId: PlayerId, latency: number = 0): void {
    this.players.set(playerId, {
      id: playerId,
      latency,
      lastPing: Date.now(),
      connected: true,
      desyncCount: 0,
    });
    this.onPlayerJoin?.(playerId);
  }

  // Unregister a player
  unregisterPlayer(playerId: PlayerId): void {
    this.players.delete(playerId);
    this.onPlayerLeave?.(playerId);
  }

  // Update player latency
  updateLatency(playerId: PlayerId, latency: number): void {
    const player = this.players.get(playerId);
    if (player) {
      player.latency = latency;
      player.lastPing = Date.now();
    }
  }

  // Queue local input
  queueInput(input: ShotInput): NetworkInput {
    const networkInput: NetworkInput = {
      playerId: this.localPlayerId,
      frame: this.currentFrame + this.inputDelay,
      input,
      hash: "", // Will be filled when processed
      timestamp: Date.now(),
    };

    this.pendingInputs.push(networkInput);
    return networkInput;
  }

  // Receive remote input
  receiveInput(networkInput: NetworkInput): void {
    // Validate input
    if (!this.players.has(networkInput.playerId)) {
      console.warn(`Received input from unknown player: ${networkInput.playerId}`);
      return;
    }

    // Store in buffer
    const frame = networkInput.frame;
    if (!this.inputBuffer.has(frame)) {
      this.inputBuffer.set(frame, new Map());
    }

    this.inputBuffer.get(frame)!.set(networkInput.playerId, networkInput);
  }

  // Process a frame
  processFrame(state: GameState): {
    inputs: NetworkInput[];
    shouldAdvance: boolean;
    desyncDetected: boolean;
  } {
    this.currentFrame = state.frame;

    // Add local inputs to buffer
    this.flushPendingInputs();

    // Check if we have all inputs for the frame to process
    const targetFrame = this.confirmedFrame + 1;
    const frameInputs = this.inputBuffer.get(targetFrame);

    const allInputsReceived = this.checkAllInputsReceived(frameInputs);

    if (!allInputsReceived) {
      // Wait for more inputs
      return { inputs: [], shouldAdvance: false, desyncDetected: false };
    }

    // Get inputs for this frame
    const inputs: NetworkInput[] = frameInputs 
      ? Array.from(frameInputs.values()) 
      : [];

    // Verify state hash if provided
    const localHash = StateHasher.hashState(state);
    
    for (const input of inputs) {
      if (input.hash && input.hash !== localHash) {
        this.handleDesync(targetFrame, input.hash, localHash);
        return { inputs, shouldAdvance: false, desyncDetected: true };
      }
    }

    // Save state snapshot
    this.saveSnapshot(state);

    // Clean up old buffers
    this.cleanupBuffers(targetFrame);

    // Advance confirmed frame
    this.confirmedFrame = targetFrame;

    return { inputs, shouldAdvance: true, desyncDetected: false };
  }

  private flushPendingInputs(): void {
    for (const input of this.pendingInputs) {
      if (!this.inputBuffer.has(input.frame)) {
        this.inputBuffer.set(input.frame, new Map());
      }
      this.inputBuffer.get(input.frame)!.set(input.playerId, input);
    }
    this.pendingInputs = [];
  }

  private checkAllInputsReceived(
    frameInputs: Map<PlayerId, NetworkInput> | undefined
  ): boolean {
    for (const [playerId, player] of this.players) {
      if (!player.connected) continue;
      
      // Local player always has input
      if (playerId === this.localPlayerId) continue;

      // Check if we have input from this player
      if (!frameInputs?.has(playerId)) {
        // Check if input is late based on latency
        const timeout = player.latency * 2 + 100; // 2x latency + 100ms buffer
        if (Date.now() - player.lastPing > timeout) {
          // Player is lagging, we'll proceed without their input
          console.warn(`Player ${playerId} is lagging, proceeding without input`);
          continue;
        }
        return false;
      }
    }

    return true;
  }

  private handleDesync(
    frame: number,
    remoteHash: string,
    localHash: string
  ): void {
    this.desyncDetected = true;
    this.desyncFrame = frame;

    // Increment desync count for all players
    for (const player of this.players.values()) {
      player.desyncCount++;
    }

    console.error(`Desync detected at frame ${frame}!`);
    console.error(`Remote hash: ${remoteHash}`);
    console.error(`Local hash: ${localHash}`);

    this.onDesync?.(frame, remoteHash, localHash);

    // Request state from host/other players
    this.onStateRequest?.(frame);
  }

  private saveSnapshot(state: GameState): void {
    const snapshot: GameSnapshot = {
      frame: state.frame,
      state: JSON.parse(JSON.stringify(state)), // Deep clone
      checksum: StateHasher.hashState(state),
    };

    this.stateHistory.push(snapshot);

    // Remove old snapshots
    while (this.stateHistory.length > this.maxHistoryFrames) {
      this.stateHistory.shift();
    }
  }

  private cleanupBuffers(confirmedFrame: number): void {
    // Remove old input buffers
    for (const frame of this.inputBuffer.keys()) {
      if (frame < confirmedFrame) {
        this.inputBuffer.delete(frame);
      }
    }
  }

  // Get state snapshot for frame
  getSnapshot(frame: number): GameSnapshot | undefined {
    return this.stateHistory.find(s => s.frame === frame);
  }

  // Rollback to a previous state
  rollback(targetFrame: number): GameState | null {
    const snapshot = this.getSnapshot(targetFrame);
    if (snapshot) {
      this.confirmedFrame = targetFrame;
      this.currentFrame = targetFrame;
      return snapshot.state;
    }
    return null;
  }

  // Synchronize state from remote
  synchronizeState(state: GameState, frame: number): void {
    // Verify the state
    const hash = StateHasher.hashState(state);
    const snapshot = this.getSnapshot(frame);

    if (snapshot && snapshot.checksum !== hash) {
      console.warn(`Received state doesn't match local history at frame ${frame}`);
    }

    // Clear desync flag
    this.desyncDetected = false;
    this.desyncFrame = -1;

    // Reset confirmed frame
    this.confirmedFrame = frame;
    this.currentFrame = frame;
  }

  // Get sync status
  getSyncStatus(): {
    currentFrame: number;
    confirmedFrame: number;
    inputDelay: number;
    desyncDetected: boolean;
    desyncFrame: number;
    playerCount: number;
    bufferedFrames: number;
  } {
    return {
      currentFrame: this.currentFrame,
      confirmedFrame: this.confirmedFrame,
      inputDelay: this.inputDelay,
      desyncDetected: this.desyncDetected,
      desyncFrame: this.desyncFrame,
      playerCount: this.players.size,
      bufferedFrames: this.inputBuffer.size,
    };
  }

  // Check if game is in sync
  isInSync(): boolean {
    return !this.desyncDetected;
  }

  // Get recommended input delay based on latencies
  calculateOptimalInputDelay(): number {
    let maxLatency = 0;
    for (const player of this.players.values()) {
      maxLatency = Math.max(maxLatency, player.latency);
    }

    // Convert latency to frames (at 60fps)
    const latencyFrames = Math.ceil(maxLatency / (1000 / 60));
    return Math.max(NETWORK.INPUT_DELAY_FRAMES, latencyFrames + 1);
  }

  // Update input delay
  setInputDelay(delay: number): void {
    this.inputDelay = Math.max(1, delay);
  }

  // Serialize inputs for network
  serializeInputs(inputs: NetworkInput[]): Uint8Array {
    // Simple serialization - in production, use proper binary protocol
    const data = JSON.stringify(inputs);
    return new TextEncoder().encode(data);
  }

  // Deserialize inputs from network
  deserializeInputs(data: Uint8Array): NetworkInput[] {
    const json = new TextDecoder().decode(data);
    return JSON.parse(json);
  }
}

// Anti-cheat validator
export class AntiCheatValidator {
  private stateHistory: Map<number, { hash: string; timestamp: number }> = new Map();
  private violations: Array<{
    frame: number;
    playerId: PlayerId;
    type: string;
    details: string;
  }> = [];

  // Validate state transition
  validateStateTransition(
    fromState: GameState,
    toState: GameState,
    inputs: NetworkInput[]
  ): boolean {
    // Check frame continuity
    if (toState.frame !== fromState.frame + 1) {
      this.logViolation(
        toState.frame,
        inputs[0]?.playerId ?? 0,
        "FRAME_SKIP",
        `Frame jumped from ${fromState.frame} to ${toState.frame}`
      );
      return false;
    }

    // Check state hash
    const expectedHash = StateHasher.hashState(fromState);
    if (toState.hash !== expectedHash) {
      this.logViolation(
        toState.frame,
        inputs[0]?.playerId ?? 0,
        "STATE_HASH_MISMATCH",
        `State hash mismatch: expected ${expectedHash}, got ${toState.hash}`
      );
      return false;
    }

    // Validate inputs
    for (const input of inputs) {
      if (!this.validateInput(input, fromState)) {
        return false;
      }
    }

    return true;
  }

  private validateInput(input: NetworkInput, state: GameState): boolean {
    // Check player exists
    const player = state.players.find(p => p.id === input.playerId);
    if (!player) {
      this.logViolation(
        input.frame,
        input.playerId,
        "INVALID_PLAYER",
        `Player ${input.playerId} not found`
      );
      return false;
    }

    // Check it's player's turn
    if (state.currentPlayer !== input.playerId) {
      this.logViolation(
        input.frame,
        input.playerId,
        "NOT_PLAYER_TURN",
        `Not player ${input.playerId}'s turn`
      );
      return false;
    }

    // Validate shot parameters
    if (input.input.power < 0 || input.input.power > 1) {
      this.logViolation(
        input.frame,
        input.playerId,
        "INVALID_POWER",
        `Invalid power value: ${input.input.power}`
      );
      return false;
    }

    return true;
  }

  private logViolation(
    frame: number,
    playerId: PlayerId,
    type: string,
    details: string
  ): void {
    this.violations.push({
      frame,
      playerId,
      type,
      details,
    });
    console.error(`Anti-cheat violation: ${type} - ${details}`);
  }

  getViolations(): typeof this.violations {
    return [...this.violations];
  }

  clearViolations(): void {
    this.violations = [];
  }

  // Check if player should be penalized
  shouldPenalize(playerId: PlayerId): boolean {
    const playerViolations = this.violations.filter(v => v.playerId === playerId);
    return playerViolations.length >= 3; // 3 strikes
  }
}

// Network game manager
export class NetworkGameManager {
  private lockstep: LockstepEngine;
  private validator: AntiCheatValidator;
  private isHost: boolean;

  constructor(localPlayerId: PlayerId, isHost: boolean = false) {
    this.lockstep = new LockstepEngine(localPlayerId);
    this.validator = new AntiCheatValidator();
    this.isHost = isHost;
  }

  // Start a network game
  startGame(players: PlayerId[]): void {
    for (const playerId of players) {
      this.lockstep.registerPlayer(playerId);
    }

    // Set up callbacks
    this.lockstep.onDesync = (frame, expected, actual) => {
      console.error(`Desync at frame ${frame}: ${expected} vs ${actual}`);
      this.handleDesync(frame);
    };
  }

  private handleDesync(frame: number): void {
    if (this.isHost) {
      // Host sends authoritative state
      this.broadcastState(frame);
    } else {
      // Client requests state from host
      this.requestState(frame);
    }
  }

  private broadcastState(frame: number): void {
    // Implementation depends on network layer
    console.log(`Broadcasting state for frame ${frame}`);
  }

  private requestState(frame: number): void {
    // Implementation depends on network layer
    console.log(`Requesting state for frame ${frame}`);
  }

  // Submit player input
  submitInput(input: ShotInput): void {
    const networkInput = this.lockstep.queueInput(input);
    this.broadcastInput(networkInput);
  }

  private broadcastInput(input: NetworkInput): void {
    // Implementation depends on network layer
    console.log(`Broadcasting input for frame ${input.frame}`);
  }

  // Receive network data
  receiveNetworkData(data: Uint8Array, fromPlayer: PlayerId): void {
    // Parse message type
    const message = JSON.parse(new TextDecoder().decode(data));

    switch (message.type) {
      case "INPUT":
        this.lockstep.receiveInput(message.data);
        break;
      case "STATE":
        this.lockstep.synchronizeState(message.data, message.frame);
        break;
      case "PING":
        this.lockstep.updateLatency(fromPlayer, message.latency);
        break;
    }
  }

  // Update game state
  update(state: GameState): { 
    shouldAdvance: boolean; 
    inputs: NetworkInput[];
    stateValid: boolean;
  } {
    const result = this.lockstep.processFrame(state);

    if (result.shouldAdvance) {
      // Validate state transition
      const previousSnapshot = this.lockstep.getSnapshot(state.frame - 1);
      if (previousSnapshot) {
        const valid = this.validator.validateStateTransition(
          previousSnapshot.state,
          state,
          result.inputs
        );

        if (!valid) {
          return { ...result, stateValid: false };
        }
      }
    }

    return { ...result, stateValid: true };
  }

  // Get sync status
  getStatus() {
    return this.lockstep.getSyncStatus();
  }
}
