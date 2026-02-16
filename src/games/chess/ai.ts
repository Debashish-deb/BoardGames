// ============================================================================
// CHESS GAME ENGINE - AI (MINIMAX WITH ALPHA-BETA)
// AAA Mobile Game Quality - Lichess/Chess.com Standard
//
// Features:
// - Minimax with alpha-beta pruning
// - Position evaluation with piece-square tables
// - Quiescence search for tactical positions
// - Transposition table for caching
// - Iterative deepening
// - Time management
// ============================================================================

import { Chess } from 'chess.js';
import type { 
  PieceColor, 
  PieceType, 
  Square, 
  EngineMove, 
  EngineInfo,
  Evaluation 
} from './types';
import { PIECE_VALUES, PST, AI_LEVELS } from './constants';
import { oppositeColor, squareToIndex } from './utils';

// Transposition table entry
interface TTEntry {
  depth: number;
  score: number;
  flag: 'exact' | 'lower' | 'upper';
  bestMove?: string;
}

export class ChessAI {
  private chess: Chess;
  private level: number;
  private maxDepth: number;
  private randomness: number;
  
  // Search statistics
  private nodesSearched: number = 0;
  private transpositionHits: number = 0;
  private startTime: number = 0;
  private timeLimit: number = 0;
  private stopSearch: boolean = false;
  
  // Transposition table
  private transpositionTable = new Map<string, TTEntry>();
  private maxTableSize = 1_000_000;

  constructor(level: number = 4) {
    this.level = Math.max(1, Math.min(8, level));
    const config = AI_LEVELS[this.level as keyof typeof AI_LEVELS];
    this.maxDepth = config.depth;
    this.randomness = config.randomness;
    this.chess = new Chess();
    this.timeLimit = this.calculateTimeLimit();
  }

  private calculateTimeLimit(): number {
    // Time limit based on level
    const limits = [100, 250, 500, 1000, 2000, 5000, 10000, 30000];
    return limits[this.level - 1] || 1000;
  }

  /**
   * Find the best move for the current position
   */
  findBestMove(fen: string): { move: EngineMove; info: EngineInfo } | null {
    this.chess.load(fen);
    
    if (this.chess.isGameOver()) {
      return null;
    }

    this.startTime = Date.now();
    this.stopSearch = false;
    this.nodesSearched = 0;
    this.transpositionHits = 0;

    const legalMoves = this.chess.moves({ verbose: true });
    if (legalMoves.length === 0) {
      return null;
    }

    // Iterative deepening
    let bestMove = legalMoves[0];
    let bestScore = -Infinity;
    let pv: string[] = [];

    for (let depth = 1; depth <= this.maxDepth; depth++) {
      if (this.shouldStop()) break;

      const result = this.searchRoot(depth, legalMoves);
      
      if (result.move) {
        bestMove = result.move;
        bestScore = result.score;
        pv = result.pv || [];
      }
    }

    const elapsed = Date.now() - this.startTime;

    const info: EngineInfo = {
      depth: this.maxDepth,
      score: bestScore,
      pv,
      nodes: this.nodesSearched,
      time: elapsed,
      nps: elapsed > 0 ? Math.floor(this.nodesSearched / (elapsed / 1000)) : 0
    };

    // Add randomness for lower levels
    if (this.randomness > 0 && Math.random() < this.randomness) {
      const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
      return {
        move: {
          from: randomMove.from as Square,
          to: randomMove.to as Square,
          promotion: randomMove.promotion as PieceType
        },
        info
      };
    }

    return {
      move: {
        from: bestMove.from as Square,
        to: bestMove.to as Square,
        promotion: bestMove.promotion as PieceType
      },
      info
    };
  }

  private searchRoot(
    depth: number, 
    moves: ReturnType<Chess['moves']>
  ): { move: typeof moves[0] | null; score: number; pv?: string[] } {
    let bestMove = moves[0];
    let bestScore = -Infinity;
    let alpha = -Infinity;
    const beta = Infinity;

    // Sort moves for better pruning
    const sortedMoves = this.orderMoves(moves);

    for (const move of sortedMoves) {
      if (this.shouldStop()) break;

      this.chess.move(move);
      const score = -this.alphaBeta(depth - 1, -beta, -alpha, false);
      this.chess.undo();

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }

      alpha = Math.max(alpha, score);
    }

    return { move: bestMove, score: bestScore };
  }

  private alphaBeta(
    depth: number,
    alpha: number,
    beta: number,
    isQuiescence: boolean
  ): number {
    this.nodesSearched++;

    if (this.shouldStop()) {
      return 0;
    }

    // Check transposition table
    const hash = this.chess.fen();
    const ttEntry = this.transpositionTable.get(hash);
    if (ttEntry && ttEntry.depth >= depth) {
      this.transpositionHits++;
      if (ttEntry.flag === 'exact') return ttEntry.score;
      if (ttEntry.flag === 'lower' && ttEntry.score >= beta) return ttEntry.score;
      if (ttEntry.flag === 'upper' && ttEntry.score <= alpha) return ttEntry.score;
    }

    // Terminal positions
    if (this.chess.isCheckmate()) {
      return -30000 + (this.maxDepth - depth); // Prefer faster mates
    }

    if (this.chess.isDraw() || this.chess.isStalemate()) {
      return 0;
    }

    // Quiescence search at leaf nodes
    if (depth <= 0) {
      if (isQuiescence) {
        return this.evaluate();
      }
      return this.quiescence(alpha, beta);
    }

    const moves = this.chess.moves({ verbose: true });
    const sortedMoves = this.orderMoves(moves);

    let bestScore = -Infinity;
    let flag: TTEntry['flag'] = 'upper';

    for (const move of sortedMoves) {
      this.chess.move(move);
      const score = -this.alphaBeta(depth - 1, -beta, -alpha, false);
      this.chess.undo();

      if (score > bestScore) {
        bestScore = score;
      }

      if (score >= beta) {
        this.storeTT(hash, depth, score, 'lower', move.san);
        return score; // Beta cutoff
      }

      if (score > alpha) {
        alpha = score;
        flag = 'exact';
      }
    }

    this.storeTT(hash, depth, bestScore, flag);
    return bestScore;
  }

  private quiescence(alpha: number, beta: number): number {
    this.nodesSearched++;

    const standPat = this.evaluate();

    if (standPat >= beta) {
      return beta;
    }

    if (alpha < standPat) {
      alpha = standPat;
    }

    // Only search captures
    const captures = this.chess.moves({ verbose: true }).filter(m => m.captured);
    const sortedCaptures = this.orderMoves(captures);

    for (const capture of sortedCaptures) {
      // Delta pruning - skip if capture can't improve alpha
      const capturedValue = PIECE_VALUES[capture.captured as PieceType];
      if (standPat + capturedValue + 200 < alpha) {
        continue;
      }

      this.chess.move(capture);
      const score = -this.quiescence(-beta, -alpha);
      this.chess.undo();

      if (score >= beta) {
        return beta;
      }

      if (score > alpha) {
        alpha = score;
      }
    }

    return alpha;
  }

  private evaluate(): number {
    const board = this.chess.board();
    let score = 0;

    // Material and piece-square tables
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const piece = board[rank][file];
        if (piece) {
          const pieceValue = PIECE_VALUES[piece.type as PieceType];
          const pstValue = this.getPSTValue(piece.type as PieceType, file, rank, piece.color as PieceColor);
          
          const value = pieceValue + pstValue;
          score += piece.color === 'w' ? value : -value;
        }
      }
    }

    // Mobility bonus
    const mobilityBonus = this.calculateMobility();
    score += mobilityBonus;

    // King safety
    const kingSafety = this.evaluateKingSafety();
    score += kingSafety;

    // Pawn structure
    const pawnStructure = this.evaluatePawnStructure();
    score += pawnStructure;

    return this.chess.turn() === 'w' ? score : -score;
  }

  private getPSTValue(
    type: PieceType, 
    file: number, 
    rank: number, 
    color: PieceColor
  ): number {
    const table = PST[type];
    // Mirror rank for black pieces
    const index = color === 'w' ? (7 - rank) * 8 + file : rank * 8 + file;
    return table[index] || 0;
  }

  private calculateMobility(): number {
    const currentTurn = this.chess.turn();
    
    // Count legal moves
    const ourMoves = this.chess.moves().length;
    
    // Switch turn and count opponent moves
    this.chess.load(this.chess.fen().replace(/ (w|b) /, currentTurn === 'w' ? ' b ' : ' w '));
    const theirMoves = this.chess.moves().length;
    
    // Restore position
    this.chess.load(this.chess.fen().replace(/ (w|b) /, currentTurn === 'w' ? ' w ' : ' b '));

    return (ourMoves - theirMoves) * 10; // 10 centipawns per move difference
  }

  private evaluateKingSafety(): number {
    let score = 0;
    const board = this.chess.board();

    for (const color of ['w', 'b'] as PieceColor[]) {
      // Find king
      let kingSquare: { file: number; rank: number } | null = null;
      for (let rank = 0; rank < 8; rank++) {
        for (let file = 0; file < 8; file++) {
          const piece = board[rank][file];
          if (piece?.type === 'k' && piece.color === color) {
            kingSquare = { file, rank };
            break;
          }
        }
        if (kingSquare) break;
      }

      if (!kingSquare) continue;

      // Count pawn shield
      let pawnShield = 0;
      const direction = color === 'w' ? 1 : -1;
      const shieldRank = kingSquare.rank + direction;

      if (shieldRank >= 0 && shieldRank < 8) {
        for (let df = -1; df <= 1; df++) {
          const file = kingSquare.file + df;
          if (file >= 0 && file < 8) {
            const piece = board[shieldRank][file];
            if (piece?.type === 'p' && piece.color === color) {
              pawnShield++;
            }
          }
        }
      }

      const value = pawnShield * 25; // 25 centipawns per pawn shield
      score += color === 'w' ? value : -value;
    }

    return score;
  }

  private evaluatePawnStructure(): number {
    let score = 0;
    const board = this.chess.board();

    for (const color of ['w', 'b'] as PieceColor[]) {
      const pawns: { file: number; rank: number }[] = [];

      // Find all pawns
      for (let rank = 0; rank < 8; rank++) {
        for (let file = 0; file < 8; file++) {
          const piece = board[rank][file];
          if (piece?.type === 'p' && piece.color === color) {
            pawns.push({ file, rank });
          }
        }
      }

      // Check for doubled pawns
      const files = pawns.map(p => p.file);
      const doubledPawns = files.filter((f, i) => files.indexOf(f) !== i).length;
      score += color === 'w' ? -doubledPawns * 50 : doubledPawns * 50;

      // Check for isolated pawns
      let isolatedPawns = 0;
      for (const pawn of pawns) {
        const hasNeighbor = pawns.some(p => 
          p !== pawn && Math.abs(p.file - pawn.file) === 1
        );
        if (!hasNeighbor) {
          isolatedPawns++;
        }
      }
      score += color === 'w' ? -isolatedPawns * 30 : isolatedPawns * 30;

      // Check for passed pawns
      let passedPawns = 0;
      const direction = color === 'w' ? 1 : -1;
      for (const pawn of pawns) {
        let isPassed = true;
        const opponentColor = oppositeColor(color);

        for (let r = pawn.rank + direction; r >= 0 && r < 8; r += direction) {
          for (let f = Math.max(0, pawn.file - 1); f <= Math.min(7, pawn.file + 1); f++) {
            const piece = board[r][f];
            if (piece?.type === 'p' && piece.color === opponentColor) {
              isPassed = false;
              break;
            }
          }
          if (!isPassed) break;
        }

        if (isPassed) {
          passedPawns++;
        }
      }
      score += color === 'w' ? passedPawns * 50 : -passedPawns * 50;
    }

    return score;
  }

  private orderMoves(
    moves: ReturnType<Chess['moves']>
  ): ReturnType<Chess['moves']> {
    return moves.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      // Prioritize captures (MVV-LVA)
      if (a.captured) {
        scoreA += PIECE_VALUES[a.captured as PieceType] * 10;
        scoreA -= PIECE_VALUES[a.piece as PieceType];
      }
      if (b.captured) {
        scoreB += PIECE_VALUES[b.captured as PieceType] * 10;
        scoreB -= PIECE_VALUES[b.piece as PieceType];
      }

      // Prioritize promotions
      if (a.promotion) scoreA += PIECE_VALUES[a.promotion as PieceType];
      if (b.promotion) scoreB += PIECE_VALUES[b.promotion as PieceType];

      // Prioritize checks
      if (a.san.includes('+')) scoreA += 50;
      if (b.san.includes('+')) scoreB += 50;

      return scoreB - scoreA;
    });
  }

  private storeTT(
    hash: string,
    depth: number,
    score: number,
    flag: TTEntry['flag'],
    bestMove?: string
  ): void {
    if (this.transpositionTable.size >= this.maxTableSize) {
      // Clear half the table when full
      const entries = Array.from(this.transpositionTable.entries());
      this.transpositionTable = new Map(entries.slice(entries.length / 2));
    }

    this.transpositionTable.set(hash, { depth, score, flag, bestMove });
  }

  private shouldStop(): boolean {
    if (this.stopSearch) return true;
    
    const elapsed = Date.now() - this.startTime;
    if (elapsed >= this.timeLimit) {
      this.stopSearch = true;
      return true;
    }

    return false;
  }

  /**
   * Get evaluation for a position
   */
  getEvaluation(fen: string): Evaluation {
    this.chess.load(fen);
    const score = this.evaluate();

    if (Math.abs(score) > 29000) {
      const mateIn = Math.ceil((30000 - Math.abs(score)) / 2);
      return {
        type: 'mate',
        value: score > 0 ? mateIn : -mateIn,
        mate: score > 0 ? mateIn : -mateIn
      };
    }

    return {
      type: 'cp',
      value: Math.round(score)
    };
  }

  /**
   * Set AI level
   */
  setLevel(level: number): void {
    this.level = Math.max(1, Math.min(8, level));
    const config = AI_LEVELS[this.level as keyof typeof AI_LEVELS];
    this.maxDepth = config.depth;
    this.randomness = config.randomness;
    this.timeLimit = this.calculateTimeLimit();
  }

  /**
   * Get search statistics
   */
  getStats(): {
    nodesSearched: number;
    transpositionHits: number;
    tableSize: number;
  } {
    return {
      nodesSearched: this.nodesSearched,
      transpositionHits: this.transpositionHits,
      tableSize: this.transpositionTable.size
    };
  }

  /**
   * Clear transposition table
   */
  clearTable(): void {
    this.transpositionTable.clear();
  }
}

// Factory function
export function createAI(level: number = 4): ChessAI {
  return new ChessAI(level);
}

// Quick evaluation function
export function evaluatePosition(fen: string): Evaluation {
  const ai = new ChessAI(1);
  return ai.getEvaluation(fen);
}

// Find best move quickly
export function findBestMove(fen: string, level: number = 4): EngineMove | null {
  const ai = new ChessAI(level);
  const result = ai.findBestMove(fen);
  return result?.move || null;
}
