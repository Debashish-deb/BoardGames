// ============================================================================
// CHESS GAME ENGINE - CORE ENGINE (FIXED)
// AAA Mobile Game Quality - Lichess/Chess.com Standard
//
// Bug Fixes:
// - Clock now properly decrements (was stored but never updated)
// - Draw by repetition now properly tracked
// - Insufficient material detection added
// - 50-move rule properly implemented
// - Resign functionality added
// - Draw offer/accept/decline added
// - Takeback functionality added
// - Move validation improved
// - Event system enhanced
// ============================================================================

import { Chess } from 'chess.js';
import type { 
  GameState, 
  Player, 
  Move, 
  SanMove, 
  ChessEvent, 
  EngineMove,
  GameConfig,
  PieceColor,
  DrawOffer,
  TimeControl,
  Square
} from './types';
import { 
  INITIAL_FEN, 
  DEFAULT_TIME_CONTROL, 
  RULES,
  TIME_CONTROLS
} from './constants';
import { 
  generateFen, 
  hashPosition, 
  formatSan, 
  getResultFromStatus,
  computeChecksum,
  oppositeColor
} from './utils';
import { ChessClock, ClockFactory } from './clock';

export interface EngineEvents {
  onMove?: (move: SanMove, state: GameState) => void;
  onCapture?: (piece: string, square: string) => void;
  onCheck?: (color: PieceColor) => void;
  onCheckmate?: (winner: PieceColor) => void;
  onDraw?: (reason: string) => void;
  onGameStart?: (state: GameState) => void;
  onGameEnd?: (result: string, reason: string, state: GameState) => void;
  onClockUpdate?: (color: PieceColor, timeMs: number) => void;
  onTimeForfeit?: (color: PieceColor) => void;
  onDrawOffer?: (playerId: string) => void;
  onDrawAccept?: () => void;
  onDrawDecline?: () => void;
  onResign?: (playerId: string) => void;
  onTakebackRequest?: (playerId: string) => void;
  onTakeback?: (moveCount: number) => void;
  onEvent?: (event: ChessEvent) => void;
}

export class ChessEngine {
  private state: GameState;
  private chess: Chess;
  private clock: ChessClock;
  private events: EngineEvents;
  private gameId: string;
  
  // Draw offer tracking
  private pendingDrawOffer: DrawOffer | null = null;
  
  // Takeback tracking
  private pendingTakeback: { playerId: string; requestedAt: number } | null = null;
  
  // Clock interval for ticking
  private clockInterval: NodeJS.Timeout | null = null;

  constructor(config: GameConfig = {}, events: EngineEvents = {}) {
    this.gameId = config.gameId || this.generateGameId();
    this.events = events;
    
    // Initialize chess.js
    this.chess = new Chess(config.startPosition);
    
    // Initialize clock
    const timeControl = config.timeControl || DEFAULT_TIME_CONTROL;
    this.clock = ChessClock.fromTimeControl(timeControl);
    this.setupClockCallbacks();
    
    // Initialize state
    this.state = this.createInitialState(config);
    
    // Start clock interval
    this.startClockInterval();
    
    // Emit game start
    this.events.onGameStart?.(this.state);
  }

  private generateGameId(): string {
    return `chess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private createInitialState(config: GameConfig): GameState {
    const whitePlayer: Player = {
      id: config.whitePlayer?.id || 'white',
      color: 'w',
      name: config.whitePlayer?.name || 'White',
      rating: config.whitePlayer?.rating,
      isBot: config.whitePlayer?.isBot || false,
      botLevel: config.whitePlayer?.botLevel,
      connected: true
    };

    const blackPlayer: Player = {
      id: config.blackPlayer?.id || 'black',
      color: 'b',
      name: config.blackPlayer?.name || 'Black',
      rating: config.blackPlayer?.rating,
      isBot: config.blackPlayer?.isBot || false,
      botLevel: config.blackPlayer?.botLevel,
      connected: true
    };

    return {
      fen: this.chess.fen(),
      ply: 0,
      players: { white: whitePlayer, black: blackPlayer },
      status: 'in_progress',
      clock: this.clock.getState(),
      timeControl: config.timeControl || DEFAULT_TIME_CONTROL,
      moveHistory: [],
      positionHistory: [hashPosition(this.chess.fen())],
      events: [this.createEvent('GAME_START', { fen: this.chess.fen() })],
      startTime: Date.now(),
      lastMoveTime: Date.now(),
      gameId: this.gameId
    };
  }

  private setupClockCallbacks(): void {
    this.clock.onTimeUpdate = (update) => {
      this.events.onClockUpdate?.(update.color, update.remainingTime);
    };

    this.clock.onTimeForfeit = (color) => {
      this.handleTimeForfeit(color);
    };

    this.clock.onLowTime = (color, remainingMs) => {
      // Could emit low time warning event
    };
  }

  private startClockInterval(): void {
    this.clockInterval = setInterval(() => {
      this.clock.tick();
    }, 100); // Update every 100ms
  }

  private stopClockInterval(): void {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
      this.clockInterval = null;
    }
  }

  // ============================================================================
  // MOVE HANDLING
  // ============================================================================

  /**
   * Make a move
   */
  makeMove(move: EngineMove, playerId: string): SanMove {
    // Validate game state
    if (this.state.status !== 'in_progress') {
      throw new Error('Game is not in progress');
    }

    // Validate it's the player's turn
    const activePlayer = this.getActivePlayer();
    if (activePlayer.id !== playerId) {
      throw new Error('Not your turn');
    }

    // Validate move
    if (!this.isValidMove(move)) {
      throw new Error('Invalid move');
    }

    // Stop clock for current player
    this.clock.switch();

    // Execute move
    const result = this.chess.move({
      from: move.from,
      to: move.to,
      promotion: move.promotion
    });

    if (!result) {
      throw new Error('Illegal move');
    }

    // Create move record
    const sanMove = this.createSanMove(result, playerId);
    
    // Update state
    this.updateStateAfterMove(sanMove, result);

    // Emit events
    this.events.onMove?.(sanMove, this.state);
    
    if (result.captured) {
      this.events.onCapture?.(result.captured, result.to);
    }

    // Start clock for next player
    this.clock.start(this.chess.turn());

    return sanMove;
  }

  /**
   * Make a move by SAN notation
   */
  makeSanMove(san: string, playerId: string): SanMove {
    const move = this.chess.move(san);
    if (!move) {
      throw new Error('Invalid SAN move');
    }

    return this.makeMove({
      from: move.from as EngineMove['from'],
      to: move.to as EngineMove['to'],
      promotion: move.promotion as EngineMove['promotion']
    }, playerId);
  }

  /**
   * Check if a move is valid
   */
  isValidMove(move: EngineMove): boolean {
    const moves = this.chess.moves({ verbose: true });
    return moves.some(m => 
      m.from === move.from && 
      m.to === move.to && 
      m.promotion === (move.promotion || undefined)
    );
  }

  /**
   * Get all legal moves
   */
  getLegalMoves(): Move[] {
    return this.chess.moves({ verbose: true }).map(m => ({
      from: m.from as EngineMove['from'],
      to: m.to as EngineMove['to'],
      piece: m.piece.charAt(0) as Move['piece'],
      captured: m.captured as Move['captured'],
      san: m.san,
      lan: `${m.from}${m.to}${m.promotion || ''}`,
      flags: m.flags,
      isCapture: m.flags.includes('c') || m.flags.includes('e'),
      isCheck: m.san.includes('+'),
      isCheckmate: m.san.includes('#'),
      isEnPassant: m.flags.includes('e'),
      isCastling: m.flags.includes('k') || m.flags.includes('q'),
      isPromotion: m.flags.includes('p')
    }));
  }

  /**
   * Get legal moves for a specific square
   */
  getLegalMovesFrom(square: string): string[] {
    const moves = this.chess.moves({ square: square as Square, verbose: true });
    return moves.map(m => m.to);
  }

  // ============================================================================
  // STATE UPDATES
  // ============================================================================

  private createSanMove(result: ReturnType<Chess['move']>, playerId: string): SanMove {
    const color = this.chess.turn() === 'w' ? 'b' : 'w';
    
    return {
      moveNumber: Math.floor(this.state.moveHistory.length / 2) + 1,
      san: result!.san,
      lan: `${result!.from}${result!.to}${result!.promotion || ''}`,
      fenBefore: this.state.fen,
      fenAfter: this.chess.fen(),
      playerId,
      color,
      timestamp: Date.now(),
      timeSpent: Date.now() - this.state.lastMoveTime,
      isCheck: result!.san.includes('+'),
      isCheckmate: result!.san.includes('#'),
      isCapture: result!.flags.includes('c') || result!.flags.includes('e')
    };
  }

  private updateStateAfterMove(sanMove: SanMove, result: ReturnType<Chess['move']>): void {
    // Update position history for repetition detection
    const positionHash = hashPosition(this.chess.fen());
    this.state.positionHistory.push(positionHash);

    // Update move history
    this.state.moveHistory.push(sanMove);

    // Update FEN and ply
    this.state.fen = this.chess.fen();
    this.state.ply = this.chess.history().length;

    // Update clock state
    this.state.clock = this.clock.getState();
    this.state.lastMoveTime = Date.now();

    // Create events
    const events: ChessEvent[] = [];
    events.push(this.createEvent('MOVE', { 
      san: sanMove.san, 
      from: result!.from, 
      to: result!.to 
    }));

    if (result!.captured) {
      events.push(this.createEvent('CAPTURE', { 
        piece: result!.captured, 
        square: result!.to 
      }));
    }

    // Check for game end conditions
    this.checkGameEnd(events);

    // Add events to state
    this.state.events.push(...events);
  }

  private checkGameEnd(events: ChessEvent[]): void {
    // Check for checkmate
    if (this.chess.isCheckmate()) {
      const winner = this.chess.turn() === 'w' ? 'b' : 'w';
      this.state.status = 'checkmate';
      this.state.winner = winner;
      this.state.result = getResultFromStatus('checkmate', winner);
      
      events.push(this.createEvent('CHECKMATE', { winner }));
      this.endGame('checkmate');
      return;
    }

    // Check for stalemate
    if (this.chess.isStalemate()) {
      this.state.status = 'stalemate';
      this.state.result = '1/2-1/2';
      
      events.push(this.createEvent('STALEMATE', {}));
      this.endGame('stalemate');
      return;
    }

    // Check for draw by repetition
    if (this.isThreefoldRepetition()) {
      this.state.status = 'draw_repetition';
      this.state.result = '1/2-1/2';
      
      events.push(this.createEvent('DRAW_REPETITION', {}));
      this.endGame('draw_repetition');
      return;
    }

    // Check for 50-move rule
    if (this.chess.isDraw() && this.chess.history().length >= RULES.FIFTY_MOVE_LIMIT) {
      this.state.status = 'draw_fifty_move';
      this.state.result = '1/2-1/2';
      
      events.push(this.createEvent('DRAW_FIFTY_MOVE', {}));
      this.endGame('draw_fifty_move');
      return;
    }

    // Check for insufficient material
    if (this.isInsufficientMaterial()) {
      this.state.status = 'draw_insufficient';
      this.state.result = '1/2-1/2';
      
      events.push(this.createEvent('DRAW_INSUFFICIENT', {}));
      this.endGame('draw_insufficient');
      return;
    }

    // Check for check
    if (this.chess.inCheck()) {
      events.push(this.createEvent('CHECK', { fen: this.chess.fen() }));
      this.events.onCheck?.(this.chess.turn());
    }
  }

  private endGame(reason: string): void {
    this.clock.stop();
    this.stopClockInterval();
    
    this.events.onGameEnd?.(
      this.state.result || '*',
      reason,
      this.state
    );
  }

  // ============================================================================
  // DRAW DETECTION
  // ============================================================================

  /**
   * Check for threefold repetition
   */
  private isThreefoldRepetition(): boolean {
    const currentHash = hashPosition(this.chess.fen());
    const count = this.state.positionHistory.filter(h => h === currentHash).length;
    return count >= RULES.REPETITION_LIMIT;
  }

  /**
   * Check for insufficient material
   */
  private isInsufficientMaterial(): boolean {
    const pieces: { type: string; color: string }[] = [];
    
    // Count pieces
    for (let i = 0; i < 64; i++) {
      const piece = this.chess.board()[Math.floor(i / 8)][i % 8];
      if (piece) {
        pieces.push(piece);
      }
    }

    // King vs King
    if (pieces.length === 2) {
      return true;
    }

    // King and minor piece vs King
    if (pieces.length === 3) {
      const nonKing = pieces.find(p => p.type !== 'k');
      if (nonKing && (nonKing.type === 'n' || nonKing.type === 'b')) {
        return true;
      }
    }

    // King and bishop vs King and bishop (same color bishops)
    if (pieces.length === 4) {
      const bishops = pieces.filter(p => p.type === 'b');
      const others = pieces.filter(p => p.type !== 'k' && p.type !== 'b');
      
      if (bishops.length === 2 && others.length === 0) {
        // Check if bishops are on same color squares
        const board = this.chess.board();
        const bishopSquares: { file: number; rank: number }[] = [];
        
        for (let rank = 0; rank < 8; rank++) {
          for (let file = 0; file < 8; file++) {
            const piece = board[rank][file];
            if (piece?.type === 'b') {
              bishopSquares.push({ file, rank });
            }
          }
        }
        
        if (bishopSquares.length === 2) {
          const color1 = (bishopSquares[0].file + bishopSquares[0].rank) % 2;
          const color2 = (bishopSquares[1].file + bishopSquares[1].rank) % 2;
          return color1 === color2;
        }
      }
    }

    return false;
  }

  // ============================================================================
  // DRAW OFFERS
  // ============================================================================

  /**
   * Offer a draw
   */
  offerDraw(playerId: string): boolean {
    if (this.state.status !== 'in_progress') {
      return false;
    }

    // Can't offer draw on first few moves
    if (this.state.moveHistory.length < RULES.MIN_MOVES_FOR_RESULT) {
      return false;
    }

    // Can't offer if already pending
    if (this.pendingDrawOffer) {
      return false;
    }

    this.pendingDrawOffer = {
      offeredBy: playerId,
      offeredAt: Date.now(),
      expiresAt: Date.now() + RULES.DRAW_OFFER_TIMEOUT_MS
    };

    this.state.pendingDrawOffer = this.pendingDrawOffer;
    
    this.events.onDrawOffer?.(playerId);
    this.state.events.push(this.createEvent('DRAW_OFFER', { playerId }));

    return true;
  }

  /**
   * Accept a draw offer
   */
  acceptDraw(playerId: string): boolean {
    if (!this.pendingDrawOffer) {
      return false;
    }

    // Can't accept your own offer
    if (this.pendingDrawOffer.offeredBy === playerId) {
      return false;
    }

    this.state.status = 'draw_agreement';
    this.state.result = '1/2-1/2';
    
    this.state.events.push(this.createEvent('DRAW_ACCEPT', { playerId }));
    this.endGame('draw_agreement');
    
    this.events.onDrawAccept?.();
    this.events.onDraw?.('agreement');

    return true;
  }

  /**
   * Decline a draw offer
   */
  declineDraw(playerId: string): boolean {
    if (!this.pendingDrawOffer) {
      return false;
    }

    this.pendingDrawOffer = null;
    this.state.pendingDrawOffer = undefined;

    this.state.events.push(this.createEvent('DRAW_DECLINE', { playerId }));
    this.events.onDrawDecline?.();

    return true;
  }

  // ============================================================================
  // RESIGNATION
  // ============================================================================

  /**
   * Resign the game
   */
  resign(playerId: string): boolean {
    if (this.state.status !== 'in_progress') {
      return false;
    }

    const player = this.getPlayer(playerId);
    if (!player) {
      return false;
    }

    const winner = oppositeColor(player.color);
    
    this.state.status = 'resigned';
    this.state.winner = winner;
    this.state.result = getResultFromStatus('resigned', winner);

    this.state.events.push(this.createEvent('RESIGN', { playerId, winner }));
    this.endGame('resigned');
    
    this.events.onResign?.(playerId);

    return true;
  }

  // ============================================================================
  // TAKEBACKS
  // ============================================================================

  /**
   * Request a takeback
   */
  requestTakeback(playerId: string): boolean {
    if (this.state.status !== 'in_progress') {
      return false;
    }

    if (this.state.moveHistory.length === 0) {
      return false;
    }

    // Can only request takeback for your own last move
    const lastMove = this.state.moveHistory[this.state.moveHistory.length - 1];
    if (lastMove.playerId !== playerId) {
      return false;
    }

    this.pendingTakeback = {
      playerId,
      requestedAt: Date.now()
    };

    this.state.events.push(this.createEvent('TAKEBACK_REQUEST', { playerId }));
    this.events.onTakebackRequest?.(playerId);

    return true;
  }

  /**
   * Accept a takeback request
   */
  acceptTakeback(playerId: string): boolean {
    if (!this.pendingTakeback) {
      return false;
    }

    // Can't accept your own request
    if (this.pendingTakeback.playerId === playerId) {
      return false;
    }

    // Undo the move
    this.chess.undo();
    
    // Update state
    this.state.moveHistory.pop();
    this.state.positionHistory.pop();
    this.state.fen = this.chess.fen();
    this.state.ply = this.chess.history().length;

    this.pendingTakeback = null;

    this.state.events.push(this.createEvent('TAKEBACK_ACCEPT', { playerId }));
    this.events.onTakeback?.(1);

    return true;
  }

  /**
   * Decline a takeback request
   */
  declineTakeback(playerId: string): boolean {
    if (!this.pendingTakeback) {
      return false;
    }

    this.pendingTakeback = null;
    
    this.state.events.push(this.createEvent('TAKEBACK_DECLINE', { playerId }));

    return true;
  }

  // ============================================================================
  // TIME FORFEIT
  // ============================================================================

  private handleTimeForfeit(color: PieceColor): void {
    const winner = oppositeColor(color);
    
    this.state.status = 'timeout';
    this.state.winner = winner;
    this.state.result = getResultFromStatus('timeout', winner);

    this.state.events.push(this.createEvent('TIMEOUT', { color, winner }));
    this.endGame('timeout');
    
    this.events.onTimeForfeit?.(color);
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private createEvent(type: ChessEvent['type'], payload: Record<string, unknown>): ChessEvent {
    return {
      id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      type,
      payload,
      timestamp: Date.now()
    };
  }

  private getActivePlayer(): Player {
    const color = this.chess.turn();
    return color === 'w' ? this.state.players.white : this.state.players.black;
  }

  private getPlayer(playerId: string): Player | null {
    if (this.state.players.white.id === playerId) {
      return this.state.players.white;
    }
    if (this.state.players.black.id === playerId) {
      return this.state.players.black;
    }
    return null;
  }

  // ============================================================================
  // GETTERS
  // ============================================================================

  getState(): GameState {
    // Update clock before returning
    this.state.clock = this.clock.getState();
    return this.state;
  }

  getFen(): string {
    return this.chess.fen();
  }

  getPgn(): string {
    return this.chess.pgn();
  }

  isGameOver(): boolean {
    return this.state.status !== 'in_progress';
  }

  getTurn(): PieceColor {
    return this.chess.turn();
  }

  inCheck(): boolean {
    return this.chess.inCheck();
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  destroy(): void {
    this.clock.stop();
    this.stopClockInterval();
  }
}

// Factory function
export function createGame(
  config: GameConfig = {},
  events: EngineEvents = {}
): ChessEngine {
  return new ChessEngine(config, events);
}

// Quick start functions
export function quickStart(
  whiteName: string = 'White',
  blackName: string = 'Black',
  timeControl: TimeControl = TIME_CONTROLS.BLITZ_5_0
): ChessEngine {
  return createGame({
    whitePlayer: { name: whiteName },
    blackPlayer: { name: blackName },
    timeControl
  });
}

export function quickBotGame(
  playerName: string = 'Player',
  botLevel: number = 4,
  timeControl: TimeControl = TIME_CONTROLS.BLITZ_5_0
): ChessEngine {
  return createGame({
    whitePlayer: { name: playerName, isBot: false },
    blackPlayer: { name: `Bot (Level ${botLevel})`, isBot: true, botLevel },
    timeControl
  });
}
