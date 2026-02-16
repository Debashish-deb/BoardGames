// ============================================================================
// CHESS GAME ENGINE - MOVE VALIDATOR
// AAA Mobile Game Quality - Lichess/Chess.com Standard
//
// Features:
// - Comprehensive move validation
// - Legal move generation
// - Check detection
// - Pin detection
// ============================================================================

import { Chess } from 'chess.js';
import type { Square, PieceColor, PieceType, EngineMove } from './types';
import { isValidSquare, squareToCoords, coordsToSquare } from './utils';

export interface ValidationResult {
  valid: boolean;
  error?: string;
  legalMoves?: string[];
}

export interface PositionAnalysis {
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;
  pinnedPieces: Array<{ square: Square; pinnedTo: Square }>;
  attackedSquares: Square[];
  defenders: Map<Square, Square[]>;
}

export class MoveValidator {
  private chess: Chess;

  constructor(fen?: string) {
    this.chess = new Chess(fen);
  }

  /**
   * Validate a move
   */
  validateMove(move: EngineMove): ValidationResult {
    // Check squares are valid
    if (!isValidSquare(move.from)) {
      return { valid: false, error: `Invalid from square: ${move.from}` };
    }
    if (!isValidSquare(move.to)) {
      return { valid: false, error: `Invalid to square: ${move.to}` };
    }

    // Check there's a piece at from square
    const piece = this.chess.get(move.from);
    if (!piece) {
      return { valid: false, error: `No piece at ${move.from}` };
    }

    // Check it's the right color's turn
    if (piece.color !== this.chess.turn()) {
      return { valid: false, error: `Not ${piece.color === 'w' ? 'white' : 'black'}'s turn` };
    }

    // Check promotion is valid for pawns
    if (move.promotion) {
      if (piece.type !== 'p') {
        return { valid: false, error: 'Only pawns can promote' };
      }
      const validPromotions: PieceType[] = ['q', 'r', 'b', 'n'];
      if (!validPromotions.includes(move.promotion)) {
        return { valid: false, error: `Invalid promotion piece: ${move.promotion}` };
      }
    }

    // Try the move
    const result = this.chess.move({
      from: move.from,
      to: move.to,
      promotion: move.promotion
    });

    if (!result) {
      // Get legal moves for helpful error message
      const legalMoves = this.chess.moves({ square: move.from, verbose: true });
      const legalDestinations = legalMoves.map(m => m.to);
      
      return {
        valid: false,
        error: `Illegal move from ${move.from} to ${move.to}. Legal destinations: ${legalDestinations.join(', ') || 'none'}`,
        legalMoves: legalDestinations
      };
    }

    // Undo the move
    this.chess.undo();

    return { valid: true };
  }

  /**
   * Validate a SAN move
   */
  validateSan(san: string): ValidationResult {
    try {
      const result = this.chess.move(san);
      
      if (!result) {
        return {
          valid: false,
          error: `Invalid SAN move: ${san}`,
          legalMoves: this.chess.moves()
        };
      }

      this.chess.undo();
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: `Invalid SAN move: ${san}`,
        legalMoves: this.chess.moves()
      };
    }
  }

  /**
   * Get all legal moves
   */
  getLegalMoves(): string[] {
    return this.chess.moves();
  }

  /**
   * Get legal moves from a specific square
   */
  getLegalMovesFrom(square: Square): string[] {
    if (!isValidSquare(square)) return [];
    
    const moves = this.chess.moves({ square, verbose: true });
    return moves.map(m => m.to);
  }

  /**
   * Check if a square is attacked
   */
  isSquareAttacked(square: Square, byColor: PieceColor): boolean {
    if (!isValidSquare(square)) return false;
    return this.chess.isAttacked(square, byColor);
  }

  /**
   * Get attackers of a square
   */
  getAttackers(square: Square, byColor: PieceColor): Square[] {
    if (!isValidSquare(square)) return [];
    
    const attackers: Square[] = [];
    const board = this.chess.board();

    // Check all squares for attackers
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const piece = board[rank][file];
        if (piece && piece.color === byColor) {
          const from = coordsToSquare(file, rank)!;
          const moves = this.chess.moves({ square: from, verbose: true });
          
          if (moves.some(m => m.to === square)) {
            attackers.push(from);
          }
        }
      }
    }

    return attackers;
  }

  /**
   * Get defenders of a square
   */
  getDefenders(square: Square): Square[] {
    const piece = this.chess.get(square);
    if (!piece) return [];
    
    return this.getAttackers(square, piece.color);
  }

  /**
   * Analyze the current position
   */
  analyze(): PositionAnalysis {
    const board = this.chess.board();
    const turn = this.chess.turn();
    
    // Find pinned pieces
    const pinnedPieces = this.findPinnedPieces();
    
    // Find attacked squares
    const attackedSquares = this.findAttackedSquares(turn === 'w' ? 'b' : 'w');
    
    // Find defenders for each piece
    const defenders = new Map<Square, Square[]>();
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const piece = board[rank][file];
        if (piece) {
          const square = coordsToSquare(file, rank)!;
          defenders.set(square, this.getDefenders(square));
        }
      }
    }

    return {
      isCheck: this.chess.inCheck(),
      isCheckmate: this.chess.isCheckmate(),
      isStalemate: this.chess.isStalemate(),
      isDraw: this.chess.isDraw(),
      pinnedPieces,
      attackedSquares,
      defenders
    };
  }

  /**
   * Find all pinned pieces
   */
  private findPinnedPieces(): Array<{ square: Square; pinnedTo: Square }> {
    const pinned: Array<{ square: Square; pinnedTo: Square }> = [];
    const turn = this.chess.turn();
    const board = this.chess.board();

    // Find king
    let kingSquare: Square | null = null;
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const piece = board[rank][file];
        if (piece?.type === 'k' && piece.color === turn) {
          kingSquare = coordsToSquare(file, rank);
          break;
        }
      }
      if (kingSquare) break;
    }

    if (!kingSquare) return pinned;

    // For each of our pieces, check if moving it exposes the king
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const piece = board[rank][file];
        if (piece && piece.color === turn && piece.type !== 'k') {
          const square = coordsToSquare(file, rank)!;
          
          // Temporarily remove the piece
          const fen = this.chess.fen();
          const newChess = new Chess(fen);
          newChess.remove(square);
          
          // Check if king is now in check
          if (newChess.isCheck()) {
            pinned.push({ square, pinnedTo: kingSquare });
          }
        }
      }
    }

    return pinned;
  }

  /**
   * Find all squares attacked by a color
   */
  private findAttackedSquares(byColor: PieceColor): Square[] {
    const attacked: Square[] = [];
    
    for (const square of this.getAllSquares()) {
      if (this.chess.isAttacked(square, byColor)) {
        attacked.push(square);
      }
    }

    return attacked;
  }

  /**
   * Get all squares
   */
  private getAllSquares(): Square[] {
    const squares: Square[] = [];
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const square = coordsToSquare(file, rank);
        if (square) squares.push(square);
      }
    }
    return squares;
  }

  /**
   * Check if a move gives check
   */
  givesCheck(move: EngineMove): boolean {
    this.chess.move({
      from: move.from,
      to: move.to,
      promotion: move.promotion
    });
    
    const inCheck = this.chess.inCheck();
    this.chess.undo();
    
    return inCheck;
  }

  /**
   * Check if a move gives checkmate
   */
  givesCheckmate(move: EngineMove): boolean {
    this.chess.move({
      from: move.from,
      to: move.to,
      promotion: move.promotion
    });
    
    const isCheckmate = this.chess.isCheckmate();
    this.chess.undo();
    
    return isCheckmate;
  }

  /**
   * Check if a move captures a piece
   */
  isCapture(move: EngineMove): boolean {
    return this.getPiece(move.to) !== null;
  }

  /**
   * Get the piece at a square
   */
  getPiece(square: Square): { type: PieceType; color: PieceColor } | null {
    const piece = this.chess.get(square);
    return piece ?? null;
  }

  /**
   * Load a new position
   */
  load(fen: string): void {
    this.chess.load(fen);
  }

  /**
   * Get current FEN
   */
  getFen(): string {
    return this.chess.fen();
  }
}

// Quick validation functions
export function isValidMove(fen: string, move: EngineMove): boolean {
  const validator = new MoveValidator(fen);
  return validator.validateMove(move).valid;
}

export function getLegalMoves(fen: string): string[] {
  const validator = new MoveValidator(fen);
  return validator.getLegalMoves();
}

export function isCheck(fen: string): boolean {
  const chess = new Chess(fen);
  return chess.inCheck();
}

export function isCheckmate(fen: string): boolean {
  const chess = new Chess(fen);
  return chess.isCheckmate();
}

export function isStalemate(fen: string): boolean {
  const chess = new Chess(fen);
  return chess.isStalemate();
}

export function isDraw(fen: string): boolean {
  const chess = new Chess(fen);
  return chess.isDraw();
}

// Export singleton for quick use
export const validator = new MoveValidator();
