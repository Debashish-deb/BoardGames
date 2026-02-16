// ============================================================================
// NETWORK SYNC MANAGER
// Real-Time Multiplayer State Synchronization
// ============================================================================

import type {
  GameState,
  Move,
  StateDiff,
  Checksum,
  Version,
  EngineError
} from './core';

// ============================================================================
// TYPES
// ============================================================================

export interface SyncMessage<TPayload = any> {
  type: SyncMessageType;
  senderId: string;
  timestamp: number;
  data: any;
  messageId: string;
  sequenceNumber: number;
}

export type SyncMessageType =
  | 'STATE_SYNC'        // Full state sync
  | 'DIFF_SYNC'         // Incremental diff
  | 'MOVE'              // Player move
  | 'ACK'               // Acknowledgment
  | 'SYNC_REQUEST'      // Request sync
  | 'HEARTBEAT'         // Keep-alive
  | 'CONFLICT'          // Conflict detected
  | 'ROLLBACK';         // Request rollback

export interface SyncConfig {
  syncInterval: number;           // ms between syncs
  diffThreshold: number;          // Version diff before full sync
  maxRetries: number;             // Max retransmission attempts
  timeout: number;                // Message timeout (ms)
  enablePrediction: boolean;      // Client-side prediction
  enableRollback: boolean;        // Rollback on conflict
  conflictResolution: ConflictResolutionStrategy;
}

export type ConflictResolutionStrategy =
  | 'server-wins'                 // Server state is authoritative
  | 'client-wins'                 // Client state is authoritative
  | 'last-write-wins'             // Most recent timestamp wins
  | 'merge'                       // Attempt to merge changes
  | 'manual';                     // Require manual resolution

export interface SyncState {
  localVersion: Version;
  remoteVersion: Version;
  lastSyncTime: number;
  pendingMoves: Move[];
  pendingAcks: Map<string, number>;  // messageId -> timestamp
  inSync: boolean;
  latency: number;                    // Round-trip time (ms)
  desyncCount: number;
}

// ============================================================================
// NETWORK SYNC MANAGER
// ============================================================================

export class NetworkSyncManager<TPayload = any> {
  private config: Required<SyncConfig>;
  private syncState: SyncState;
  private messageQueue: SyncMessage<TPayload>[] = [];
  private sequenceNumber = 0;
  private syncInterval?: NodeJS.Timeout;
  
  // Callbacks
  private onStateUpdate?: (state: GameState<TPayload>) => void;
  private onConflict?: (localState: GameState<TPayload>, remoteState: GameState<TPayload>) => void;
  private onDesync?: (error: EngineError) => void;
  
  constructor(config?: Partial<SyncConfig>) {
    this.config = {
      syncInterval: config?.syncInterval ?? 100,
      diffThreshold: config?.diffThreshold ?? 10,
      maxRetries: config?.maxRetries ?? 3,
      timeout: config?.timeout ?? 5000,
      enablePrediction: config?.enablePrediction ?? true,
      enableRollback: config?.enableRollback ?? true,
      conflictResolution: config?.conflictResolution ?? 'server-wins'
    };
    
    this.syncState = {
      localVersion: 0,
      remoteVersion: 0,
      lastSyncTime: 0,
      pendingMoves: [],
      pendingAcks: new Map(),
      inSync: true,
      latency: 0,
      desyncCount: 0
    };
  }
  
  // ============================================================================
  // LIFECYCLE
  // ============================================================================
  
  start(): void {
    this.syncInterval = setInterval(() => {
      this.tick();
    }, this.config.syncInterval);
  }
  
  stop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = undefined;
    }
  }
  
  private tick(): void {
    // Process message queue
    this.processMessageQueue();
    
    // Check for timeouts
    this.checkTimeouts();
    
    // Send heartbeat if needed
    if (Date.now() - this.syncState.lastSyncTime > 1000) {
      this.sendHeartbeat();
    }
  }
  
  // ============================================================================
  // STATE SYNCHRONIZATION
  // ============================================================================
  
  /**
   * Sync local state to remote
   */
  synchronizeState(localState: GameState<TPayload>, remoteState: GameState<TPayload>): void {
    const versionDiff = Math.abs(localState.version - remoteState.version);
    
    if (versionDiff === 0) {
      // States are in sync
      this.syncState.inSync = true;
      return;
    }
    
    if (versionDiff < this.config.diffThreshold) {
      // Use diff sync
      this.sendDiffSync(localState, remoteState);
    } else {
      // Use full state sync
      this.sendFullSync(localState);
    }
    
    this.syncState.lastSyncTime = Date.now();
  }
  
  /**
   * Send full state sync
   */
  private sendFullSync(state: GameState<TPayload>): void {
    const message: SyncMessage<TPayload> = {
      type: 'STATE_SYNC',
      senderId: this.getClientId(),
      timestamp: Date.now(),
      data: state,
      messageId: this.generateMessageId(),
      sequenceNumber: this.sequenceNumber++
    };
    
    this.sendMessage(message);
  }
  
  /**
   * Send diff sync
   */
  private sendDiffSync(localState: GameState<TPayload>, remoteState: GameState<TPayload>): void {
    // Generate diff (would use actual diff engine here)
    const diff: StateDiff = {
      version: localState.version,
      operations: [],
      checksum: localState.checksum ?? '',
      timestamp: Date.now()
    };
    
    const message: SyncMessage<TPayload> = {
      type: 'DIFF_SYNC',
      senderId: this.getClientId(),
      timestamp: Date.now(),
      data: diff,
      messageId: this.generateMessageId(),
      sequenceNumber: this.sequenceNumber++
    };
    
    this.sendMessage(message);
  }
  
  /**
   * Request sync from remote
   */
  requestSync(): void {
    const message: SyncMessage = {
      type: 'SYNC_REQUEST',
      senderId: this.getClientId(),
      timestamp: Date.now(),
      data: { version: this.syncState.localVersion },
      messageId: this.generateMessageId(),
      sequenceNumber: this.sequenceNumber++
    };
    
    this.sendMessage(message);
  }
  
  // ============================================================================
  // MOVE SYNCHRONIZATION
  // ============================================================================
  
  /**
   * Send move to remote
   */
  sendMove(move: Move): void {
    // Add to pending moves
    this.syncState.pendingMoves.push(move);
    
    const message: SyncMessage = {
      type: 'MOVE',
      senderId: this.getClientId(),
      timestamp: Date.now(),
      data: move,
      messageId: this.generateMessageId(),
      sequenceNumber: this.sequenceNumber++
    };
    
    this.sendMessage(message);
    this.syncState.pendingAcks.set(message.messageId, Date.now());
  }
  
  /**
   * Receive move from remote
   */
  receiveMove(message: SyncMessage<Move>): void {
    const move = message.data;
    
    // Send ACK
    this.sendAck(message.messageId);
    
    // Validate move
    if (!this.validateMove(move)) {
      console.warn('Invalid move received:', move);
      return;
    }
    
    // Apply move (would delegate to game engine)
    // this.onStateUpdate?.(newState);
  }
  
  /**
   * Handle move acknowledgment
   */
  private handleAck(message: SyncMessage): void {
    const originalMessageId = message.data.originalMessageId;
    const sentTime = this.syncState.pendingAcks.get(originalMessageId);
    
    if (sentTime) {
      // Calculate latency
      const latency = Date.now() - sentTime;
      this.syncState.latency = latency;
      
      // Remove from pending
      this.syncState.pendingAcks.delete(originalMessageId);
      
      // Remove from pending moves
      const moveIndex = this.syncState.pendingMoves.findIndex(
        m => m.moveNumber === message.data.moveNumber
      );
      if (moveIndex !== -1) {
        this.syncState.pendingMoves.splice(moveIndex, 1);
      }
    }
  }
  
  // ============================================================================
  // CONFLICT RESOLUTION
  // ============================================================================
  
  /**
   * Detect conflicts between local and remote state
   */
  detectConflict(localState: GameState<TPayload>, remoteState: GameState<TPayload>): boolean {
    // Check version mismatch
    if (localState.version !== remoteState.version) {
      return true;
    }
    
    // Check checksum mismatch
    if (localState.checksum !== remoteState.checksum) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Resolve conflict between states
   */
  resolveConflict(
    localState: GameState<TPayload>,
    remoteState: GameState<TPayload>
  ): GameState<TPayload> {
    this.syncState.desyncCount++;
    
    switch (this.config.conflictResolution) {
      case 'server-wins':
        return remoteState;
      
      case 'client-wins':
        return localState;
      
      case 'last-write-wins':
        const localTime = localState.metadata?.lastModified ?? 0;
        const remoteTime = remoteState.metadata?.lastModified ?? 0;
        return localTime > remoteTime ? localState : remoteState;
      
      case 'merge':
        return this.mergeStates(localState, remoteState);
      
      case 'manual':
        this.onConflict?.(localState, remoteState);
        return localState; // Keep local until manual resolution
      
      default:
        return remoteState;
    }
  }
  
  /**
   * Merge two states (best effort)
   */
  private mergeStates(
    localState: GameState<TPayload>,
    remoteState: GameState<TPayload>
  ): GameState<TPayload> {
    // Simple merge strategy - take newer version
    return localState.version > remoteState.version ? localState : remoteState;
  }
  
  // ============================================================================
  // CLIENT-SIDE PREDICTION
  // ============================================================================
  
  /**
   * Apply move with prediction
   */
  applyMovePredictively(move: Move, currentState: GameState<TPayload>): GameState<TPayload> {
    if (!this.config.enablePrediction) {
      return currentState;
    }
    
    // Apply move locally first (optimistic)
    // When server confirms, reconcile
    this.syncState.pendingMoves.push(move);
    
    // Return predicted state
    // (Would actually apply move to state here)
    return currentState;
  }
  
  /**
   * Reconcile predicted state with server state
   */
  reconcilePrediction(
    predictedState: GameState<TPayload>,
    serverState: GameState<TPayload>
  ): GameState<TPayload> {
    if (!this.config.enableRollback) {
      return serverState;
    }
    
    // Check if prediction was correct
    if (predictedState.checksum === serverState.checksum) {
      // Prediction was correct
      this.syncState.pendingMoves = [];
      return serverState;
    }
    
    // Prediction was wrong - rollback and replay
    let state = serverState;
    
    // Replay pending moves on top of server state
    for (const move of this.syncState.pendingMoves) {
      // Would apply move to state
      // state = applyMove(state, move);
    }
    
    return state;
  }
  
  // ============================================================================
  // MESSAGE HANDLING
  // ============================================================================
  
  /**
   * Send message to remote
   */
  private sendMessage(message: SyncMessage): void {
    // Add to queue
    this.messageQueue.push(message);
    
    // In real implementation, would send via WebSocket/WebRTC
    // For now, just log
    // console.log('Sending message:', message.type);
  }
  
  /**
   * Receive message from remote
   */
  receiveMessage(message: SyncMessage): void {
    switch (message.type) {
      case 'STATE_SYNC':
        this.handleFullSync(message);
        break;
      
      case 'DIFF_SYNC':
        this.handleDiffSync(message);
        break;
      
      case 'MOVE':
        this.receiveMove(message);
        break;
      
      case 'ACK':
        this.handleAck(message);
        break;
      
      case 'SYNC_REQUEST':
        this.handleSyncRequest(message);
        break;
      
      case 'HEARTBEAT':
        this.handleHeartbeat(message);
        break;
      
      case 'CONFLICT':
        this.handleConflictMessage(message);
        break;
      
      case 'ROLLBACK':
        this.handleRollback(message);
        break;
    }
  }
  
  private handleFullSync(message: SyncMessage<GameState<TPayload>>): void {
    const remoteState = message.data;
    this.syncState.remoteVersion = remoteState.version;
    this.onStateUpdate?.(remoteState);
  }
  
  private handleDiffSync(message: SyncMessage<StateDiff>): void {
    const diff = message.data;
    // Would apply diff to current state
    // const newState = applyDiff(currentState, diff);
    // this.onStateUpdate?.(newState);
  }
  
  private handleSyncRequest(message: SyncMessage): void {
    // Respond with current state
    // this.sendFullSync(currentState);
  }
  
  private handleHeartbeat(message: SyncMessage): void {
    this.syncState.lastSyncTime = Date.now();
  }
  
  private handleConflictMessage(message: SyncMessage): void {
    // Handle conflict notification from server
    this.syncState.inSync = false;
    this.requestSync();
  }
  
  private handleRollback(message: SyncMessage): void {
    // Server requesting rollback to specific version
    const targetVersion = message.data.version;
    // Would rollback to that version
  }
  
  // ============================================================================
  // UTILITIES
  // ============================================================================
  
  private processMessageQueue(): void {
    // Process queued messages
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        // Send message (would use actual network layer)
        // websocket.send(JSON.stringify(message));
      }
    }
  }
  
  private checkTimeouts(): void {
    const now = Date.now();
    
    // Check for timed-out acknowledgments
    for (const [messageId, sentTime] of this.syncState.pendingAcks) {
      if (now - sentTime > this.config.timeout) {
        // Timeout - retry or handle
        console.warn('Message timeout:', messageId);
        this.syncState.pendingAcks.delete(messageId);
      }
    }
  }
  
  private sendHeartbeat(): void {
    const message: SyncMessage = {
      type: 'HEARTBEAT',
      senderId: this.getClientId(),
      timestamp: Date.now(),
      data: {},
      messageId: this.generateMessageId(),
      sequenceNumber: this.sequenceNumber++
    };
    
    this.sendMessage(message);
  }
  
  private sendAck(originalMessageId: string): void {
    const message: SyncMessage = {
      type: 'ACK',
      senderId: this.getClientId(),
      timestamp: Date.now(),
      data: { originalMessageId },
      messageId: this.generateMessageId(),
      sequenceNumber: this.sequenceNumber++
    };
    
    this.sendMessage(message);
  }
  
  private validateMove(move: Move): boolean {
    // Validate move structure and data
    return !!(
      move.playerId &&
      typeof move.moveNumber === 'number' &&
      move.type &&
      move.timestamp
    );
  }
  
  private generateMessageId(): string {
    return `${this.getClientId()}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private getClientId(): string {
    // In real implementation, would get actual client ID
    return 'client-' + Math.random().toString(36).substr(2, 9);
  }
  
  // ============================================================================
  // PUBLIC API
  // ============================================================================
  
  getSyncState(): SyncState {
    return { ...this.syncState };
  }
  
  isInSync(): boolean {
    return this.syncState.inSync;
  }
  
  getLatency(): number {
    return this.syncState.latency;
  }
  
  getPendingMoveCount(): number {
    return this.syncState.pendingMoves.length;
  }
  
  setStateUpdateCallback(callback: (state: GameState<TPayload>) => void): void {
    this.onStateUpdate = callback;
  }
  
  setConflictCallback(
    callback: (localState: GameState<TPayload>, remoteState: GameState<TPayload>) => void
  ): void {
    this.onConflict = callback;
  }
  
  setDesyncCallback(callback: (error: EngineError) => void): void {
    this.onDesync = callback;
  }
}

// ============================================================================
// NETWORK TRANSPORT LAYER
// ============================================================================

export interface NetworkTransport {
  connect(url: string): Promise<void>;
  disconnect(): void;
  send(message: SyncMessage): void;
  onMessage(callback: (message: SyncMessage) => void): void;
  onConnect(callback: () => void): void;
  onDisconnect(callback: () => void): void;
  onError(callback: (error: Error) => void): void;
  isConnected(): boolean;
}

/**
 * WebSocket transport implementation
 */
export class WebSocketTransport implements NetworkTransport {
  private ws?: WebSocket;
  private messageCallbacks: ((message: SyncMessage) => void)[] = [];
  private connectCallbacks: (() => void)[] = [];
  private disconnectCallbacks: (() => void)[] = [];
  private errorCallbacks: ((error: Error) => void)[] = [];
  
  async connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url);
      
      this.ws.onopen = () => {
        this.connectCallbacks.forEach(cb => cb());
        resolve();
      };
      
      this.ws.onerror = (event) => {
        const error = new Error('WebSocket error');
        this.errorCallbacks.forEach(cb => cb(error));
        reject(error);
      };
      
      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.messageCallbacks.forEach(cb => cb(message));
        } catch (error) {
          console.error('Failed to parse message:', error);
        }
      };
      
      this.ws.onclose = () => {
        this.disconnectCallbacks.forEach(cb => cb());
      };
    });
  }
  
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }
  }
  
  send(message: SyncMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }
  
  onMessage(callback: (message: SyncMessage) => void): void {
    this.messageCallbacks.push(callback);
  }
  
  onConnect(callback: () => void): void {
    this.connectCallbacks.push(callback);
  }
  
  onDisconnect(callback: () => void): void {
    this.disconnectCallbacks.push(callback);
  }
  
  onError(callback: (error: Error) => void): void {
    this.errorCallbacks.push(callback);
  }
  
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}