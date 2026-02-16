// ============================================================================
// CHESS GAME ENGINE - UTILITIES
// AAA Mobile Game Quality - Lichess/Chess.com Standard
// ============================================================================

import { FILES, RANKS, SQUARES } from './constants';
import type { Square, PieceColor, PieceType, Move, SanMove, GameState, Piece, Result } from './types';

// ============================================================================
// SQUARE UTILITIES
// ============================================================================

export function squareToIndex(square: Square): number {
  const file = square.charCodeAt(0) - 97; // 'a' = 0
  const rank = parseInt(square[1]) - 1;   // '1' = 0
  return rank * 8 + file;
}

export function indexToSquare(index: number): Square {
  const file = FILES[index % 8];
  const rank = RANKS[Math.floor(index / 8)];
  return `${file}${rank}` as Square;
}

export function squareToCoords(square: Square): { x: number; y: number } {
  return {
    x: square.charCodeAt(0) - 97,  // 0-7
    y: parseInt(square[1]) - 1      // 0-7
  };
}

export function coordsToSquare(x: number, y: number): Square | null {
  if (x < 0 || x > 7 || y < 0 || y > 7) return null;
  return indexToSquare(y * 8 + x);
}

export function getFile(square: Square): string {
  return square[0];
}

export function getRank(square: Square): string {
  return square[1];
}

export function isLightSquare(square: Square): boolean {
  const { x, y } = squareToCoords(square);
  return (x + y) % 2 === 1;
}

export function isDarkSquare(square: Square): boolean {
  return !isLightSquare(square);
}

export function mirrorSquare(square: Square): Square {
  const { x, y } = squareToCoords(square);
  return coordsToSquare(x, 7 - y)!;
}

export function getAdjacentSquares(square: Square): Square[] {
  const { x, y } = squareToCoords(square);
  const adjacent: Square[] = [];
  
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue;
      const sq = coordsToSquare(x + dx, y + dy);
      if (sq) adjacent.push(sq);
    }
  }
  
  return adjacent;
}

// ============================================================================
// COLOR UTILITIES
// ============================================================================

export function oppositeColor(color: PieceColor): PieceColor {
  return color === 'w' ? 'b' : 'w';
}

export function colorToString(color: PieceColor): string {
  return color === 'w' ? 'White' : 'Black';
}

// ============================================================================
// PIECE UTILITIES
// ============================================================================

export function pieceValue(type: PieceType): number {
  const values: Record<PieceType, number> = {
    p: 1, n: 3, b: 3, r: 5, q: 9, k: 0
  };
  return values[type];
}

export function isSlider(type: PieceType): boolean {
  return type === 'b' || type === 'r' || type === 'q';
}

export function isMajorPiece(type: PieceType): boolean {
  return type === 'r' || type === 'q';
}

export function isMinorPiece(type: PieceType): boolean {
  return type === 'n' || type === 'b';
}

// ============================================================================
// FEN UTILITIES
// ============================================================================

export function parseFen(fen: string): {
  pieces: Map<Square, { type: PieceType; color: PieceColor }>;
  activeColor: PieceColor;
  castling: string;
  enPassant: Square | null;
  halfmove: number;
  fullmove: number;
} {
  const parts = fen.split(' ');
  const [piecePlacement, activeColor, castling, enPassant, halfmove, fullmove] = parts;
  
  const pieces = new Map<Square, { type: PieceType; color: PieceColor }>();
  const ranks = piecePlacement.split('/');
  
  for (let rankIndex = 0; rankIndex < 8; rankIndex++) {
    const rank = ranks[7 - rankIndex];
    let fileIndex = 0;
    
    for (const char of rank) {
      if (/\d/.test(char)) {
        fileIndex += parseInt(char);
      } else {
        const square = coordsToSquare(fileIndex, rankIndex)!;
        const color: PieceColor = char === char.toUpperCase() ? 'w' : 'b';
        const type = char.toLowerCase() as PieceType;
        pieces.set(square, { type, color });
        fileIndex++;
      }
    }
  }
  
  return {
    pieces,
    activeColor: activeColor as PieceColor,
    castling,
    enPassant: enPassant === '-' ? null : enPassant as Square,
    halfmove: parseInt(halfmove),
    fullmove: parseInt(fullmove)
  };
}

export function generateFen(
  pieces: Map<Square, { type: PieceType; color: PieceColor }>,
  activeColor: PieceColor,
  castling: string,
  enPassant: Square | null,
  halfmove: number,
  fullmove: number
): string {
  let fen = '';
  
  // Piece placement
  for (let rank = 7; rank >= 0; rank--) {
    let emptyCount = 0;
    
    for (let file = 0; file < 8; file++) {
      const square = coordsToSquare(file, rank)!;
      const piece = pieces.get(square);
      
      if (piece) {
        if (emptyCount > 0) {
          fen += emptyCount;
          emptyCount = 0;
        }
        const char = piece.type;
        fen += piece.color === 'w' ? char.toUpperCase() : char;
      } else {
        emptyCount++;
      }
    }
    
    if (emptyCount > 0) {
      fen += emptyCount;
    }
    
    if (rank > 0) {
      fen += '/';
    }
  }
  
  // Other fields
  fen += ` ${activeColor} ${castling || '-'} ${enPassant || '-'} ${halfmove} ${fullmove}`;
  
  return fen;
}

// ============================================================================
// MOVE UTILITIES
// ============================================================================

export function sanToLan(san: string, from: Square, to: Square, promotion?: PieceType): string {
  let lan = from + to;
  if (promotion) {
    lan += promotion;
  }
  return lan;
}

export function lanToSquares(lan: string): { from: Square; to: Square; promotion?: PieceType } {
  const from = lan.slice(0, 2) as Square;
  const to = lan.slice(2, 4) as Square;
  const promotion = lan.length > 4 ? lan[4] as PieceType : undefined;
  return { from, to, promotion };
}

export function formatSan(
  piece: PieceType,
  from: Square,
  to: Square,
  isCapture: boolean,
  isCheck: boolean,
  isCheckmate: boolean,
  isCastling: boolean,
  isEnPassant: boolean,
  promotion?: PieceType,
  disambiguation?: string
): string {
  if (isCastling) {
    return to === 'g1' || to === 'g8' ? 'O-O' : 'O-O-O';
  }
  
  let san = '';
  
  // Piece letter (except pawns)
  if (piece !== 'p') {
    san += piece.toUpperCase();
  }
  
  // Disambiguation
  if (disambiguation) {
    san += disambiguation;
  }
  
  // Capture
  if (isCapture) {
    if (piece === 'p') {
      san += from[0]; // File for pawn captures
    }
    san += 'x';
  }
  
  // Destination
  san += to;
  
  // Promotion
  if (promotion) {
    san += '=' + promotion.toUpperCase();
  }
  
  // Check/checkmate
  if (isCheckmate) {
    san += '#';
  } else if (isCheck) {
    san += '+';
  }
  
  return san;
}

export function parseSan(san: string): {
  piece?: PieceType;
  fromFile?: string;
  fromRank?: string;
  to: Square;
  promotion?: PieceType;
  isCheck: boolean;
  isCheckmate: boolean;
} | null {
  // Castling
  if (san === 'O-O' || san === 'O-O-O') {
    return {
      to: san === 'O-O' ? 'g1' : 'c1', // Simplified, doesn't handle black
      isCheck: san.includes('+'),
      isCheckmate: san.includes('#')
    };
  }
  
  const match = san.match(/^([NBRQK])?([a-h])?([1-8])?x?([a-h][1-8])(=?[NBRQK])?(\+|#)?$/);
  if (!match) return null;
  
  const [, piece, fromFile, fromRank, to, promo] = match;
  
  return {
    piece: piece?.toLowerCase() as PieceType,
    fromFile,
    fromRank,
    to: to as Square,
    promotion: promo?.[1]?.toLowerCase() as PieceType,
    isCheck: san.includes('+'),
    isCheckmate: san.includes('#')
  };
}

// ============================================================================
// GAME STATE UTILITIES
// ============================================================================

export function getResultFromStatus(
  status: GameState['status'],
  winner?: PieceColor
): Result {
  switch (status) {
    case 'checkmate':
    case 'resigned':
    case 'timeout':
      return winner === 'w' ? '1-0' : '0-1';
    case 'stalemate':
    case 'draw_insufficient':
    case 'draw_repetition':
    case 'draw_fifty_move':
    case 'draw_agreement':
      return '1/2-1/2';
    default:
      return '*';
  }
}

export function getGameStatusText(status: GameState['status'], winner?: PieceColor): string {
  switch (status) {
    case 'checkmate':
      return `Checkmate! ${winner === 'w' ? 'White' : 'Black'} wins.`;
    case 'stalemate':
      return 'Stalemate! The game is a draw.';
    case 'draw_insufficient':
      return 'Draw by insufficient material.';
    case 'draw_repetition':
      return 'Draw by threefold repetition.';
    case 'draw_fifty_move':
      return 'Draw by 50-move rule.';
    case 'draw_agreement':
      return 'Draw by agreement.';
    case 'resigned':
      return `${winner === 'w' ? 'Black' : 'White'} resigned. ${winner === 'w' ? 'White' : 'Black'} wins.`;
    case 'timeout':
      return `${winner === 'w' ? 'Black' : 'White'} ran out of time. ${winner === 'w' ? 'White' : 'Black'} wins.`;
    case 'aborted':
      return 'Game aborted.';
    default:
      return 'Game in progress.';
  }
}

export function isGameOver(status: GameState['status']): boolean {
  return status !== 'in_progress';
}

export function canOfferDraw(state: GameState, playerId: string): boolean {
  if (state.status !== 'in_progress') return false;
  if (state.pendingDrawOffer) return false;
  
  // Can't offer draw on first move
  if (state.moveHistory.length < 2) return false;
  
  return true;
}

export function canRequestTakeback(state: GameState, playerId: string): boolean {
  if (state.status !== 'in_progress') return false;
  if (state.moveHistory.length === 0) return false;
  
  // Can only request takeback for your own last move
  const lastMove = state.moveHistory[state.moveHistory.length - 1];
  return lastMove.playerId === playerId;
}

// ============================================================================
// TIME UTILITIES
// ============================================================================

export function formatTime(ms: number): string {
  if (ms < 0) ms = 0;
  
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function formatTimePrecise(ms: number): string {
  if (ms < 0) ms = 0;
  
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const deciseconds = Math.floor((ms % 1000) / 100);
  
  if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
  
  return `${seconds}.${deciseconds}`;
}

export function parseTimeControl(tc: string): { initial: number; increment: number } {
  // Format: "5+3" or "300+3" or "5"
  const parts = tc.split('+');
  const initial = parseInt(parts[0]);
  const increment = parts[1] ? parseInt(parts[1]) : 0;
  
  return {
    initial: initial > 100 ? initial * 1000 : initial * 60 * 1000,
    increment: increment * 1000
  };
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

export function isValidSquare(square: string): square is Square {
  return SQUARES.includes(square as Square);
}

export function isValidPieceType(char: string): char is PieceType {
  return ['p', 'n', 'b', 'r', 'q', 'k'].includes(char.toLowerCase());
}

export function isValidColor(char: string): char is PieceColor {
  return char === 'w' || char === 'b';
}

export function isValidFen(fen: string): boolean {
  const parts = fen.split(' ');
  if (parts.length !== 6) return false;
  
  const [pieces, color, castling, enPassant, halfmove, fullmove] = parts;
  
  // Validate piece placement
  const ranks = pieces.split('/');
  if (ranks.length !== 8) return false;
  
  for (const rank of ranks) {
    let count = 0;
    for (const char of rank) {
      if (/\d/.test(char)) {
        count += parseInt(char);
      } else if (/[pnbrqkPNBRQK]/.test(char)) {
        count++;
      } else {
        return false;
      }
    }
    if (count !== 8) return false;
  }
  
  // Validate active color
  if (color !== 'w' && color !== 'b') return false;
  
  // Validate castling
  if (castling !== '-' && !/^[KQkq]+$/.test(castling)) return false;
  
  // Validate en passant
  if (enPassant !== '-' && !isValidSquare(enPassant)) return false;
  
  // Validate move counters
  if (isNaN(parseInt(halfmove)) || isNaN(parseInt(fullmove))) return false;
  
  return true;
}

// ============================================================================
// HASHING
// ============================================================================

export function hashPosition(fen: string): string {
  // Simple hash for position comparison
  // In production, use a proper Zobrist hash
  const parts = fen.split(' ');
  return parts.slice(0, 4).join(' '); // Exclude move counters
}

export function computeChecksum(data: unknown): string {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

// ============================================================================
// RANDOM
// ============================================================================

export function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
