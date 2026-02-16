// ============================================================================
// CHESS GAME ENGINE - TYPES
// AAA Mobile Game Quality - Lichess/Chess.com Standard
// ============================================================================

export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type PieceColor = 'w' | 'b';
export type Square = 
  | 'a1' | 'b1' | 'c1' | 'd1' | 'e1' | 'f1' | 'g1' | 'h1'
  | 'a2' | 'b2' | 'c2' | 'd2' | 'e2' | 'f2' | 'g2' | 'h2'
  | 'a3' | 'b3' | 'c3' | 'd3' | 'e3' | 'f3' | 'g3' | 'h3'
  | 'a4' | 'b4' | 'c4' | 'd4' | 'e4' | 'f4' | 'g4' | 'h4'
  | 'a5' | 'b5' | 'c5' | 'd5' | 'e5' | 'f5' | 'g5' | 'h5'
  | 'a6' | 'b6' | 'c6' | 'd6' | 'e6' | 'f6' | 'g6' | 'h6'
  | 'a7' | 'b7' | 'c7' | 'd7' | 'e7' | 'f7' | 'g7' | 'h7'
  | 'a8' | 'b8' | 'c8' | 'd8' | 'e8' | 'f8' | 'g8' | 'h8';

export type GameStatus = 
  | 'in_progress'
  | 'checkmate'
  | 'stalemate'
  | 'draw_insufficient'
  | 'draw_repetition'
  | 'draw_fifty_move'
  | 'draw_agreement'
  | 'resigned'
  | 'timeout'
  | 'aborted';

export type Result = '1-0' | '0-1' | '1/2-1/2' | '*';

export interface Piece {
  type: PieceType;
  color: PieceColor;
  square: Square;
}

export interface Move {
  from: Square;
  to: Square;
  promotion?: PieceType;
  piece: PieceType;
  captured?: PieceType;
  san: string;
  lan: string;
  flags: string;
  isCapture: boolean;
  isCheck: boolean;
  isCheckmate: boolean;
  isEnPassant: boolean;
  isCastling: boolean;
  isPromotion: boolean;
}

export interface ClockState {
  white: number;  // remaining ms
  black: number;
  whiteDelay: number;  // increment/delay ms
  blackDelay: number;
  lastUpdate: number;
}

export interface TimeControl {
  initial: number;      // initial time in ms
  increment: number;    // increment per move in ms
  delay: number;        // delay before clock starts
  type: 'standard' | 'blitz' | 'bullet' | 'rapid' | 'classical';
}

export interface Player {
  id: string;
  color: PieceColor;
  name: string;
  rating?: number;
  isBot: boolean;
  botLevel?: number;  // 1-8 for Stockfish-like levels
  connected: boolean;
}

export interface DrawOffer {
  offeredBy: string;
  offeredAt: number;
  expiresAt: number;
}

export interface GameState {
  // Position
  fen: string;
  ply: number;  // half-move count
  
  // Players
  players: {
    white: Player;
    black: Player;
  };
  
  // Game status
  status: GameStatus;
  winner?: PieceColor;
  result?: Result;
  terminationReason?: string;
  
  // Clock
  clock: ClockState;
  timeControl: TimeControl;
  
  // Move history
  moveHistory: SanMove[];
  positionHistory: string[];  // FEN history for repetition detection
  
  // Draw offers
  pendingDrawOffer?: DrawOffer;
  
  // Events
  events: ChessEvent[];
  
  // Metadata
  startTime: number;
  lastMoveTime: number;
  gameId: string;
}

export interface SanMove {
  moveNumber: number;
  san: string;
  lan?: string;
  fenBefore: string;
  fenAfter: string;
  playerId: string;
  color: PieceColor;
  timestamp: number;
  timeSpent?: number;  // ms spent on this move
  isCheck?: boolean;
  isCheckmate?: boolean;
  isCapture?: boolean;
}

export interface ChessEvent {
  id: string;
  type: ChessEventType;
  playerId?: string;
  moveNumber?: number;
  payload: Record<string, unknown>;
  timestamp: number;
}

export type ChessEventType = 
  | 'MOVE'
  | 'CAPTURE'
  | 'CHECK'
  | 'CHECKMATE'
  | 'STALEMATE'
  | 'DRAW_OFFER'
  | 'DRAW_ACCEPT'
  | 'DRAW_DECLINE'
  | 'DRAW_REPETITION'
  | 'DRAW_FIFTY_MOVE'
  | 'DRAW_INSUFFICIENT'
  | 'RESIGN'
  | 'TIMEOUT'
  | 'TAKEBACK_REQUEST'
  | 'TAKEBACK_ACCEPT'
  | 'TAKEBACK_DECLINE'
  | 'GAME_START'
  | 'GAME_END'
  | 'ABORT';

export interface EngineMove {
  from: Square;
  to: Square;
  promotion?: PieceType;
}

export interface EngineInfo {
  depth: number;
  score: number;  // centipawns
  mate?: number;  // mate in N
  pv: string[];   // principal variation
  nodes: number;
  time: number;
  nps: number;
}

export interface Evaluation {
  type: 'cp' | 'mate';
  value: number;
  mate?: number;
}

export interface SquareHighlight {
  square: Square;
  type: 'move' | 'capture' | 'check' | 'lastMove' | 'premove' | 'hover';
  color?: string;
}

export interface GameConfig {
  gameId?: string;
  timeControl?: TimeControl;
  whitePlayer?: Partial<Player>;
  blackPlayer?: Partial<Player>;
  startPosition?: string;
  enableBot?: boolean;
  botLevel?: number;
}

export interface PGNHeaders {
  Event?: string;
  Site?: string;
  Date?: string;
  Round?: string;
  White?: string;
  Black?: string;
  Result?: Result;
  WhiteElo?: string;
  BlackElo?: string;
  TimeControl?: string;
  Termination?: string;
  [key: string]: string | undefined;
}

export interface PGNGame {
  headers: PGNHeaders;
  moves: string[];
  result: Result;
}

export interface Opening {
  eco: string;
  name: string;
  fen: string;
  moves: string[];
}

export interface BookEntry {
  move: string;
  weight: number;
  wins: number;
  draws: number;
  losses: number;
}
