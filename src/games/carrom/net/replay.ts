// ============================================================================
// CARROM GAME ENGINE - SPECTATOR REPLAY SYSTEM
// AAA Mobile Game Quality - Rovio/Clash of Clans Standard
//
// Features:
// - Full game recording and playback
// - Seek to any point in time
// - Slow-motion and fast-forward
// - Shot analysis
// - Export/share replays
// ============================================================================

import { 
  GameState, 
  FrameState, 
  ShotRecord, 
  Body,
  PlayerId,
  CollisionEvent,
  PocketEvent
} from "../core/types";
import { FrameRecorder, ShotRecorder, StateSerializer } from "../core/serializer";
import { NETWORK } from "../core/constants";

// Replay data structure
export interface ReplayData {
  version: string;
  gameId: string;
  createdAt: number;
  duration: number; // milliseconds
  totalFrames: number;
  players: Array<{
    id: PlayerId;
    name: string;
    coinType: "white" | "black";
    isBot: boolean;
  }>;
  initialState: Partial<GameState>;
  frames: FrameState[];
  shots: ShotRecord[];
  events: ReplayEvent[];
  metadata: ReplayMetadata;
}

// Replay event types
export type ReplayEvent =
  | { type: "shot"; frame: number; player: PlayerId; input: import("../core/types").ShotInput }
  | { type: "pocket"; frame: number; coinId: string; pocketId: number }
  | { type: "collision"; frame: number; bodyA: string; bodyB: string }
  | { type: "foul"; frame: number; player: PlayerId; foulType: string }
  | { type: "queen_covered"; frame: number; player: PlayerId }
  | { type: "game_over"; frame: number; winner: PlayerId; reason: string };

// Replay metadata
export interface ReplayMetadata {
  gameMode: "classic" | "rapid" | "tournament";
  boardSize: "standard" | "large";
  enableSpin: boolean;
  seed: number;
  finalScores: Record<PlayerId, number>;
  totalShots: number;
  gameDuration: number;
}

// Replay recorder
export class ReplayRecorder {
  private frameRecorder: FrameRecorder;
  private shotRecorder: ShotRecorder;
  private events: ReplayEvent[] = [];
  private startTime: number;
  private gameId: string;
  private initialState: Partial<GameState> | null = null;

  constructor(gameId?: string) {
    this.gameId = gameId || this.generateGameId();
    this.frameRecorder = new FrameRecorder(NETWORK.MAX_REPLAY_FRAMES);
    this.shotRecorder = new ShotRecorder();
    this.startTime = Date.now();
  }

  private generateGameId(): string {
    return `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Set initial state
  setInitialState(state: GameState): void {
    this.initialState = {
      seed: state.seed,
      players: state.players.map(p => ({
        ...p,
        score: 0,
        consecutiveMisses: 0,
        totalShots: 0,
        successfulShots: 0,
      })),
      board: state.board,
      config: state.config,
    };
  }

  // Record frame
  recordFrame(state: GameState): void {
    if (!this.initialState) {
      this.setInitialState(state);
    }
    this.frameRecorder.recordFrame(state);
  }

  // Record shot
  recordShot(shot: ShotRecord): void {
    this.shotRecorder.recordShot(
      shot.frame,
      shot.player,
      shot.input,
      shot.result,
      shot.duration
    );
  }

  // Record event
  recordEvent(event: ReplayEvent): void {
    this.events.push(event);
  }

  // Get replay data
  getReplayData(): ReplayData {
    const frames = this.frameRecorder.getFrames();
    const shots = this.shotRecorder.getShots();
    const duration = Date.now() - this.startTime;

    return {
      version: "1.0.0",
      gameId: this.gameId,
      createdAt: this.startTime,
      duration,
      totalFrames: frames.length,
      players: this.initialState?.players?.map(p => ({
        id: p.id,
        name: p.name,
        coinType: (p.coinType === "black" ? "black" : "white"),
        isBot: p.isBot,
      })) || [],
      initialState: this.initialState || {},
      frames,
      shots,
      events: this.events,
      metadata: {
        gameMode: "classic",
        boardSize: "standard",
        enableSpin: this.initialState?.config?.enableSpin ?? true,
        seed: this.initialState?.seed ?? 0,
        finalScores: {
          0: this.initialState?.scores?.[0] ?? 0,
          1: this.initialState?.scores?.[1] ?? 0,
          2: this.initialState?.scores?.[2] ?? 0,
          3: this.initialState?.scores?.[3] ?? 0,
        },
        totalShots: shots.length,
        gameDuration: duration,
      },
    };
  }

  // Export to JSON
  exportToJSON(): string {
    return JSON.stringify(this.getReplayData());
  }

  // Export to binary (compressed)
  exportToBinary(): Uint8Array {
    const data = this.getReplayData();
    const json = JSON.stringify(data);
    
    // Simple compression - in production, use proper compression
    const encoder = new TextEncoder();
    return encoder.encode(json);
  }

  // Clear recording
  clear(): void {
    this.frameRecorder.clear();
    this.shotRecorder.clear();
    this.events = [];
    this.initialState = null;
    this.startTime = Date.now();
  }
}

// Replay player
export class ReplayPlayer {
  private replay: ReplayData;
  private currentFrameIndex: number = 0;
  private isPlaying: boolean = false;
  private playbackSpeed: number = 1;
  private lastUpdateTime: number = 0;

  // Callbacks
  onFrame?: (frame: FrameState, state: Partial<GameState>) => void;
  onShot?: (shot: ShotRecord) => void;
  onEvent?: (event: ReplayEvent) => void;
  onComplete?: () => void;

  constructor(replayData: ReplayData) {
    this.replay = replayData;
  }

  // Load replay from JSON
  static fromJSON(json: string): ReplayPlayer {
    const data = JSON.parse(json) as ReplayData;
    return new ReplayPlayer(data);
  }

  // Load replay from binary
  static fromBinary(data: Uint8Array): ReplayPlayer {
    const json = new TextDecoder().decode(data);
    return ReplayPlayer.fromJSON(json);
  }

  // Playback controls
  play(): void {
    this.isPlaying = true;
    this.lastUpdateTime = Date.now();
  }

  pause(): void {
    this.isPlaying = false;
  }

  stop(): void {
    this.isPlaying = false;
    this.currentFrameIndex = 0;
  }

  // Seek to specific frame
  seekToFrame(frameNumber: number): void {
    const index = this.replay.frames.findIndex(f => f.frame >= frameNumber);
    this.currentFrameIndex = Math.max(0, index);
    this.emitCurrentFrame();
  }

  // Seek to specific time (in seconds)
  seekToTime(timeSeconds: number): void {
    const frameNumber = Math.floor(timeSeconds * 60); // Assuming 60fps
    this.seekToFrame(frameNumber);
  }

  // Seek to specific shot
  seekToShot(shotIndex: number): void {
    const shot = this.replay.shots[shotIndex];
    if (shot) {
      this.seekToFrame(shot.frame);
    }
  }

  // Set playback speed
  setSpeed(speed: number): void {
    this.playbackSpeed = Math.max(0.25, Math.min(4, speed));
  }

  // Update playback
  update(): void {
    if (!this.isPlaying) return;

    const now = Date.now();
    const deltaTime = (now - this.lastUpdateTime) / 1000;
    this.lastUpdateTime = now;

    // Calculate frames to advance
    const framesToAdvance = Math.floor(deltaTime * 60 * this.playbackSpeed);

    for (let i = 0; i < framesToAdvance; i++) {
      if (this.currentFrameIndex >= this.replay.frames.length - 1) {
        this.isPlaying = false;
        this.onComplete?.();
        return;
      }

      this.currentFrameIndex++;
      this.emitCurrentFrame();
    }
  }

  private emitCurrentFrame(): void {
    const frame = this.replay.frames[this.currentFrameIndex];
    if (!frame) return;

    // Reconstruct partial state
    const state = this.reconstructState(frame);

    // Emit frame
    this.onFrame?.(frame, state);

    // Check for events at this frame
    const events = this.replay.events.filter(e => e.frame === frame.frame);
    for (const event of events) {
      this.onEvent?.(event);
    }

    // Check for shots at this frame
    const shots = this.replay.shots.filter(s => s.frame === frame.frame);
    for (const shot of shots) {
      this.onShot?.(shot);
    }
  }

  private reconstructState(frame: FrameState): Partial<GameState> {
    // Reconstruct bodies from frame data
    const bodies: Body[] = frame.bodies.map(b => ({
      id: b.id,
      type: "white" as const, // Would need to store type in frame
      pos: { x: b.x, y: b.y },
      vel: { x: b.vx, y: b.vy },
      radius: 12.5,
      mass: 1,
      active: b.active,
      spin: b.spin ? { x: b.spin[0], y: b.spin[1], z: b.spin[2] } : undefined,
    }));

    return {
      frame: frame.frame,
      bodies,
    };
  }

  // Get current playback info
  getPlaybackInfo(): {
    currentFrame: number;
    totalFrames: number;
    currentTime: number;
    totalTime: number;
    isPlaying: boolean;
    speed: number;
    progress: number;
  } {
    const currentFrame = this.replay.frames[this.currentFrameIndex]?.frame || 0;
    const totalFrames = this.replay.totalFrames;
    const currentTime = currentFrame / 60;
    const totalTime = totalFrames / 60;

    return {
      currentFrame,
      totalFrames,
      currentTime,
      totalTime,
      isPlaying: this.isPlaying,
      speed: this.playbackSpeed,
      progress: totalFrames > 0 ? currentFrame / totalFrames : 0,
    };
  }

  // Get replay statistics
  getStatistics(): {
    totalShots: number;
    totalFouls: number;
    queenCoverage: boolean;
    averageShotTime: number;
    longestShot: number;
  } {
    const shots = this.replay.shots;
    const foulEvents = this.replay.events.filter(e => e.type === "foul");
    const queenCovered = this.replay.events.some(e => e.type === "queen_covered");

    const totalDuration = shots.reduce((sum, s) => sum + s.duration, 0);
    const averageShotTime = shots.length > 0 ? totalDuration / shots.length : 0;
    const longestShot = shots.length > 0 
      ? Math.max(...shots.map(s => s.duration)) 
      : 0;

    return {
      totalShots: shots.length,
      totalFouls: foulEvents.length,
      queenCoverage: queenCovered,
      averageShotTime,
      longestShot,
    };
  }

  // Get shot analysis
  getShotAnalysis(shotIndex: number): {
    shot: ShotRecord;
    accuracy: number;
    powerRating: number;
    wasOptimal: boolean;
  } | null {
    const shot = this.replay.shots[shotIndex];
    if (!shot) return null;

    // Analyze shot quality
    const pocketedCount = shot.result.pocketed.length;
    const accuracy = pocketedCount > 0 ? 1 : 0;
    const powerRating = shot.input.power;
    const wasOptimal = pocketedCount > 0 && !shot.result.foul;

    return {
      shot,
      accuracy,
      powerRating,
      wasOptimal,
    };
  }

  // Get all shots by player
  getPlayerShots(playerId: PlayerId): ShotRecord[] {
    return this.replay.shots.filter(s => s.player === playerId);
  }

  // Export highlights (key moments)
  getHighlights(): Array<{
    type: string;
    frame: number;
    description: string;
  }> {
    const highlights = [];

    for (const event of this.replay.events) {
      switch (event.type) {
        case "queen_covered":
          highlights.push({
            type: "queen_cover",
            frame: event.frame,
            description: `Player ${event.player} covered the queen!`,
          });
          break;
        case "game_over":
          highlights.push({
            type: "game_end",
            frame: event.frame,
            description: `Player ${event.winner} wins!`,
          });
          break;
        case "foul":
          highlights.push({
            type: "foul",
            frame: event.frame,
            description: `Foul by player ${event.player}`,
          });
          break;
      }
    }

    // Add multi-pocket shots
    for (const shot of this.replay.shots) {
      if (shot.result.pocketed.length >= 2) {
        highlights.push({
          type: "multi_pocket",
          frame: shot.frame,
          description: `${shot.result.pocketed.length} coins pocketed in one shot!`,
        });
      }
    }

    return highlights.sort((a, b) => a.frame - b.frame);
  }
}

// Spectator system
export class SpectatorSystem {
  private activeReplays: Map<string, ReplayPlayer> = new Map();
  private liveGames: Map<string, { recorder: ReplayRecorder; state: GameState }> = new Map();

  // Start spectating a live game
  spectateGame(gameId: string, state: GameState): void {
    const recorder = new ReplayRecorder(gameId);
    recorder.setInitialState(state);
    
    this.liveGames.set(gameId, { recorder, state });
  }

  // Update live game
  updateLiveGame(gameId: string, state: GameState): void {
    const game = this.liveGames.get(gameId);
    if (game) {
      game.state = state;
      game.recorder.recordFrame(state);
    }
  }

  // Record shot in live game
  recordLiveShot(gameId: string, shot: ShotRecord): void {
    const game = this.liveGames.get(gameId);
    if (game) {
      game.recorder.recordShot(shot);
    }
  }

  // End live game and get replay
  endLiveGame(gameId: string): ReplayData | null {
    const game = this.liveGames.get(gameId);
    if (game) {
      const replay = game.recorder.getReplayData();
      this.liveGames.delete(gameId);
      return replay;
    }
    return null;
  }

  // Load replay for viewing
  loadReplay(replayData: ReplayData): ReplayPlayer {
    const player = new ReplayPlayer(replayData);
    this.activeReplays.set(replayData.gameId, player);
    return player;
  }

  // Unload replay
  unloadReplay(gameId: string): void {
    this.activeReplays.delete(gameId);
  }

  // Get active replays
  getActiveReplays(): Array<{ gameId: string; info: ReturnType<ReplayPlayer["getPlaybackInfo"]> }> {
    return Array.from(this.activeReplays.entries()).map(([gameId, player]) => ({
      gameId,
      info: player.getPlaybackInfo(),
    }));
  }

  // Get live games
  getLiveGames(): string[] {
    return Array.from(this.liveGames.keys());
  }
}

// Export formats
export const ReplayExport = {
  // Export as JSON file
  toJSONFile(replay: ReplayData): Blob {
    const json = JSON.stringify(replay, null, 2);
    return new Blob([json], { type: "application/json" });
  },

  // Export as binary file
  toBinaryFile(replay: ReplayData): Blob {
    const data = new StateSerializer().serializeState(replay as any);
    const buffer = new ArrayBuffer(data.byteLength);
    new Uint8Array(buffer).set(data);
    return new Blob([buffer], { type: "application/octet-stream" });
  },

  // Export highlight video data (for external rendering)
  toVideoData(replay: ReplayData): {
    frames: FrameState[];
    shots: ShotRecord[];
    highlights: ReturnType<ReplayPlayer["getHighlights"]>;
  } {
    const player = new ReplayPlayer(replay);
    
    return {
      frames: replay.frames,
      shots: replay.shots,
      highlights: player.getHighlights(),
    };
  },
};
