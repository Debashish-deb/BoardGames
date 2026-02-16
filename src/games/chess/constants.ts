// ============================================================================
// CHESS GAME ENGINE - CONSTANTS
// AAA Mobile Game Quality - Lichess/Chess.com Standard
// ============================================================================

import { TimeControl, Square, PieceType, PieceColor } from './types';

// ============================================================================
// TIME CONTROLS
// ============================================================================

export const TIME_CONTROLS = {
  BULLET_1_0: { initial: 60_000, increment: 0, delay: 0, type: 'bullet' as const },
  BULLET_2_1: { initial: 120_000, increment: 1_000, delay: 0, type: 'bullet' as const },
  BLITZ_3_0: { initial: 180_000, increment: 0, delay: 0, type: 'blitz' as const },
  BLITZ_3_2: { initial: 180_000, increment: 2_000, delay: 0, type: 'blitz' as const },
  BLITZ_5_0: { initial: 300_000, increment: 0, delay: 0, type: 'blitz' as const },
  BLITZ_5_3: { initial: 300_000, increment: 3_000, delay: 0, type: 'blitz' as const },
  RAPID_10_0: { initial: 600_000, increment: 0, delay: 0, type: 'rapid' as const },
  RAPID_10_5: { initial: 600_000, increment: 5_000, delay: 0, type: 'rapid' as const },
  RAPID_15_10: { initial: 900_000, increment: 10_000, delay: 0, type: 'rapid' as const },
  CLASSICAL_30_0: { initial: 1_800_000, increment: 0, delay: 0, type: 'classical' as const },
  CLASSICAL_30_20: { initial: 1_800_000, increment: 20_000, delay: 0, type: 'classical' as const },
} as const;

export const DEFAULT_TIME_CONTROL: TimeControl = TIME_CONTROLS.BLITZ_5_0;

// ============================================================================
// GAME RULES
// ============================================================================

export const RULES = {
  // Draw by 50-move rule
  FIFTY_MOVE_LIMIT: 100,  // 50 full moves = 100 half-moves
  
  // Draw by repetition
  REPETITION_LIMIT: 3,
  
  // Draw offer timeout
  DRAW_OFFER_TIMEOUT_MS: 30_000,
  
  // Takeback timeout
  TAKEBACK_TIMEOUT_MS: 30_000,
  
  // Minimum moves before resignation counts as loss
  MIN_MOVES_FOR_RESULT: 2,
  
  // Time forfeit threshold
  TIME_FORFEIT_THRESHOLD_MS: 0,
  
  // Auto-abort if no moves
  AUTO_ABORT_MS: 60_000,
} as const;

// ============================================================================
// PIECE VALUES (centipawns)
// ============================================================================

export const PIECE_VALUES: Record<PieceType, number> = {
  p: 100,   // pawn
  n: 320,   // knight
  b: 330,   // bishop
  r: 500,   // rook
  q: 900,   // queen
  k: 20_000 // king (infinite value in practice)
} as const;

// Piece-Square Tables (simplified, for white, mirror for black)
export const PST: Record<PieceType, number[]> = {
  p: [
    0,  0,  0,  0,  0,  0,  0,  0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
    5,  5, 10, 25, 25, 10,  5,  5,
    0,  0,  0, 20, 20,  0,  0,  0,
    5, -5,-10,  0,  0,-10, -5,  5,
    5, 10, 10,-20,-20, 10, 10,  5,
    0,  0,  0,  0,  0,  0,  0,  0
  ],
  n: [
    -50,-40,-30,-30,-30,-30,-40,-50,
    -40,-20,  0,  0,  0,  0,-20,-40,
    -30,  0, 10, 15, 15, 10,  0,-30,
    -30,  5, 15, 20, 20, 15,  5,-30,
    -30,  0, 15, 20, 20, 15,  0,-30,
    -30,  5, 10, 15, 15, 10,  5,-30,
    -40,-20,  0,  5,  5,  0,-20,-40,
    -50,-40,-30,-30,-30,-30,-40,-50
  ],
  b: [
    -20,-10,-10,-10,-10,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5, 10, 10,  5,  0,-10,
    -10,  5,  5, 10, 10,  5,  5,-10,
    -10,  0, 10, 10, 10, 10,  0,-10,
    -10, 10, 10, 10, 10, 10, 10,-10,
    -10,  5,  0,  0,  0,  0,  5,-10,
    -20,-10,-10,-10,-10,-10,-10,-20
  ],
  r: [
    0,  0,  0,  0,  0,  0,  0,  0,
    5, 10, 10, 10, 10, 10, 10,  5,
   -5,  0,  0,  0,  0,  0,  0, -5,
   -5,  0,  0,  0,  0,  0,  0, -5,
   -5,  0,  0,  0,  0,  0,  0, -5,
   -5,  0,  0,  0,  0,  0,  0, -5,
   -5,  0,  0,  0,  0,  0,  0, -5,
    0,  0,  0,  5,  5,  0,  0,  0
  ],
  q: [
    -20,-10,-10, -5, -5,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5,  5,  5,  5,  0,-10,
     -5,  0,  5,  5,  5,  5,  0, -5,
      0,  0,  5,  5,  5,  5,  0, -5,
    -10,  5,  5,  5,  5,  5,  0,-10,
    -10,  0,  5,  0,  0,  0,  0,-10,
    -20,-10,-10, -5, -5,-10,-10,-20
  ],
  k: [
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -20,-30,-30,-40,-40,-30,-30,-20,
    -10,-20,-20,-20,-20,-20,-20,-10,
     20, 20,  0,  0,  0,  0, 20, 20,
     20, 30, 10,  0,  0, 10, 30, 20
  ]
} as const;

// ============================================================================
// SQUARES
// ============================================================================

export const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
export const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8'] as const;

export const SQUARES: Square[] = [
  'a1', 'b1', 'c1', 'd1', 'e1', 'f1', 'g1', 'h1',
  'a2', 'b2', 'c2', 'd2', 'e2', 'f2', 'g2', 'h2',
  'a3', 'b3', 'c3', 'd3', 'e3', 'f3', 'g3', 'h3',
  'a4', 'b4', 'c4', 'd4', 'e4', 'f4', 'g4', 'h4',
  'a5', 'b5', 'c5', 'd5', 'e5', 'f5', 'g5', 'h5',
  'a6', 'b6', 'c6', 'd6', 'e6', 'f6', 'g6', 'h6',
  'a7', 'b7', 'c7', 'd7', 'e7', 'f7', 'g7', 'h7',
  'a8', 'b8', 'c8', 'd8', 'e8', 'f8', 'g8', 'h8'
] as const;

// ============================================================================
// CASTLING
// ============================================================================

export const CASTLING_RIGHTS = {
  WHITE_KINGSIDE: 'K',
  WHITE_QUEENSIDE: 'Q',
  BLACK_KINGSIDE: 'k',
  BLACK_QUEENSIDE: 'q'
} as const;

export const CASTLING_SQUARES = {
  w: { king: 'e1', kingsideRook: 'h1', queensideRook: 'a1' },
  b: { king: 'e8', kingsideRook: 'h8', queensideRook: 'a8' }
} as const;

// ============================================================================
// INITIAL POSITION
// ============================================================================

export const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export const STARTING_POSITION: Record<Square, { type: PieceType; color: PieceColor } | null> = {
  a1: { type: 'r', color: 'w' }, b1: { type: 'n', color: 'w' },
  c1: { type: 'b', color: 'w' }, d1: { type: 'q', color: 'w' },
  e1: { type: 'k', color: 'w' }, f1: { type: 'b', color: 'w' },
  g1: { type: 'n', color: 'w' }, h1: { type: 'r', color: 'w' },
  a2: { type: 'p', color: 'w' }, b2: { type: 'p', color: 'w' },
  c2: { type: 'p', color: 'w' }, d2: { type: 'p', color: 'w' },
  e2: { type: 'p', color: 'w' }, f2: { type: 'p', color: 'w' },
  g2: { type: 'p', color: 'w' }, h2: { type: 'p', color: 'w' },
  a3: null, b3: null, c3: null, d3: null, e3: null, f3: null, g3: null, h3: null,
  a4: null, b4: null, c4: null, d4: null, e4: null, f4: null, g4: null, h4: null,
  a5: null, b5: null, c5: null, d5: null, e5: null, f5: null, g5: null, h5: null,
  a6: null, b6: null, c6: null, d6: null, e6: null, f6: null, g6: null, h6: null,
  a7: { type: 'p', color: 'b' }, b7: { type: 'p', color: 'b' },
  c7: { type: 'p', color: 'b' }, d7: { type: 'p', color: 'b' },
  e7: { type: 'p', color: 'b' }, f7: { type: 'p', color: 'b' },
  g7: { type: 'p', color: 'b' }, h7: { type: 'p', color: 'b' },
  a8: { type: 'r', color: 'b' }, b8: { type: 'n', color: 'b' },
  c8: { type: 'b', color: 'b' }, d8: { type: 'q', color: 'b' },
  e8: { type: 'k', color: 'b' }, f8: { type: 'b', color: 'b' },
  g8: { type: 'n', color: 'b' }, h8: { type: 'r', color: 'b' }
};

// ============================================================================
// AI SETTINGS
// ============================================================================

export const AI_LEVELS = {
  1: { depth: 1, randomness: 0.3 },   // Beginner
  2: { depth: 2, randomness: 0.2 },   // Novice
  3: { depth: 3, randomness: 0.1 },   // Intermediate
  4: { depth: 4, randomness: 0.05 },  // Advanced
  5: { depth: 5, randomness: 0.02 },  // Expert
  6: { depth: 6, randomness: 0.01 },  // Master
  7: { depth: 8, randomness: 0 },     // Grandmaster
  8: { depth: 12, randomness: 0 },    // Maximum strength
} as const;

export const DEFAULT_AI_LEVEL = 4;

// ============================================================================
// UI CONSTANTS
// ============================================================================

export const BOARD_SIZE = 8;
export const SQUARE_SIZE = 60; // pixels
export const PIECE_SYMBOLS: Record<PieceColor, Record<PieceType, string>> = {
  w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
  b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' }
};

export const PIECE_NAMES: Record<PieceType, string> = {
  k: 'King',
  q: 'Queen',
  r: 'Rook',
  b: 'Bishop',
  n: 'Knight',
  p: 'Pawn'
};

// ============================================================================
// SAN REGEX
// ============================================================================

export const SAN_REGEX = /^([NBRQK])?([a-h])?([1-8])?x?([a-h][1-8])(=?[NBRQK])?(\+|#)?$/;
export const CASTLING_REGEX = /^(O-O|O-O-O)(\+|#)?$/;
