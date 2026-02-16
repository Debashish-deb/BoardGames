// ============================================================================
// CHESS GAME ENGINE - MAIN EXPORTS
// AAA Mobile Game Quality - Lichess/Chess.com Standard
// ============================================================================

// ============================================================================
// TYPES
// ============================================================================
export type {
  PieceType,
  PieceColor,
  Square,
  GameStatus,
  Result,
  Piece,
  Move,
  ClockState,
  TimeControl,
  Player,
  DrawOffer,
  GameState,
  SanMove,
  ChessEvent,
  ChessEventType,
  EngineMove,
  EngineInfo,
  Evaluation,
  SquareHighlight,
  GameConfig,
  PGNHeaders,
  PGNGame,
  Opening,
  BookEntry,
} from './types';

// ============================================================================
// CONSTANTS
// ============================================================================
export {
  TIME_CONTROLS,
  DEFAULT_TIME_CONTROL,
  RULES,
  PIECE_VALUES,
  PST,
  FILES,
  RANKS,
  SQUARES,
  CASTLING_RIGHTS,
  CASTLING_SQUARES,
  INITIAL_FEN,
  STARTING_POSITION,
  AI_LEVELS,
  DEFAULT_AI_LEVEL,
  BOARD_SIZE,
  SQUARE_SIZE,
  PIECE_SYMBOLS,
  PIECE_NAMES,
  SAN_REGEX,
  CASTLING_REGEX,
} from './constants';

// ============================================================================
// UTILITIES
// ============================================================================
export {
  squareToIndex,
  indexToSquare,
  squareToCoords,
  coordsToSquare,
  getFile,
  getRank,
  isLightSquare,
  isDarkSquare,
  mirrorSquare,
  getAdjacentSquares,
  oppositeColor,
  colorToString,
  pieceValue,
  isSlider,
  isMajorPiece,
  isMinorPiece,
  parseFen,
  generateFen,
  sanToLan,
  lanToSquares,
  formatSan,
  parseSan,
  getResultFromStatus,
  getGameStatusText,
  isGameOver,
  canOfferDraw,
  canRequestTakeback,
  formatTime,
  formatTimePrecise,
  parseTimeControl,
  isValidSquare,
  isValidPieceType,
  isValidColor,
  isValidFen,
  hashPosition,
  computeChecksum,
  randomChoice,
  shuffleArray,
} from './utils';

// ============================================================================
// CLOCK
// ============================================================================
export {
  ChessClock,
  ClockFactory,
  ClockManager,
} from './clock';

export type { ClockConfig, ClockUpdate } from './clock';

// ============================================================================
// ENGINE
// ============================================================================
export {
  ChessEngine,
  createGame,
  quickStart,
  quickBotGame,
} from './engine';

export type { EngineEvents } from './engine';

// ============================================================================
// AI
// ============================================================================
export {
  ChessAI,
  createAI,
  evaluatePosition,
  findBestMove,
} from './ai';

// ============================================================================
// PGN
// ============================================================================
export {
  PGNHandler,
  exportToPGN,
  importFromPGN,
  validatePGN,
} from './pgn';

// ============================================================================
// OPENINGS
// ============================================================================
export {
  ECO_CODES,
  OpeningBook,
  OpeningClassifier,
  openingBook,
  openingClassifier,
} from './openings';

// ============================================================================
// VALIDATOR
// ============================================================================
export {
  MoveValidator,
  isValidMove,
  getLegalMoves,
  isCheck,
  isCheckmate,
  isStalemate,
  isDraw,
  validator,
} from './validator';

export type { ValidationResult, PositionAnalysis } from './validator';

// ============================================================================
// VERSION
// ============================================================================
export const VERSION = '1.0.0';
export const ENGINE_NAME = 'Chess Engine Pro';

// ============================================================================
// QUICK START
// ============================================================================

import { ChessEngine } from './engine';
import { GameState, EngineMove, PieceColor } from './types';

/**
 * Quick start: Create a new game
 */
export function createChessGame(
  whiteName: string = 'White',
  blackName: string = 'Black',
  timeControlMinutes: number = 5
): ChessEngine {
  return quickStart(whiteName, blackName, { initial: timeControlMinutes * 60_000, increment: 0, delay: 0, type: 'blitz' });
}

/**
 * Play against AI
 */
export function playAgainstAI(
  playerName: string = 'Player',
  aiLevel: number = 4,
  playerColor: PieceColor = 'w'
): ChessEngine {
  const white = playerColor === 'w' 
    ? { name: playerName, isBot: false }
    : { name: `Bot (Level ${aiLevel})`, isBot: true, botLevel: aiLevel };
  
  const black = playerColor === 'b'
    ? { name: playerName, isBot: false }
    : { name: `Bot (Level ${aiLevel})`, isBot: true, botLevel: aiLevel };

  return createGame({
    whitePlayer: white,
    blackPlayer: black,
    timeControl: TIME_CONTROLS.BLITZ_5_0
  });
}

/**
 * Load a game from PGN
 */
export function loadFromPGN(pgn: string): ChessEngine | null {
  const { PGNHandler } = require('./pgn');
  const game = PGNHandler.importGame(pgn);
  
  if (!game) return null;

  const engine = createGame({
    whitePlayer: { name: game.headers.White || 'White' },
    blackPlayer: { name: game.headers.Black || 'Black' }
  });

  // Replay moves
  for (const san of game.moves) {
    try {
      engine.makeSanMove(san, engine.getTurn() === 'w' 
        ? engine.getState().players.white.id 
        : engine.getState().players.black.id
      );
    } catch {
      break;
    }
  }

  return engine;
}

// ============================================================================
// DEBUG UTILITIES
// ============================================================================

export const Debug = {
  /**
   * Validate game state integrity
   */
  validateState(state: GameState): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!state.fen) {
      errors.push('No FEN in state');
    }

    if (!state.players.white || !state.players.black) {
      errors.push('Missing players');
    }

    const { Chess } = require('chess.js');
    try {
      const chess = new Chess(state.fen);
      if (chess.fen() !== state.fen) {
        errors.push('Invalid FEN');
      }
    } catch {
      errors.push('Invalid FEN format');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  },

  /**
   * Print game state summary
   */
  printState(state: GameState): void {
    console.log('=== Chess Game State ===');
    console.log(`Status: ${state.status}`);
    console.log(`Turn: ${state.fen.split(' ')[1]}`);
    console.log(`Move: ${Math.floor(state.moveHistory.length / 2) + 1}`);
    console.log(`White: ${state.players.white.name} (${formatTime(state.clock.white)})`);
    console.log(`Black: ${state.players.black.name} (${formatTime(state.clock.black)})`);
    console.log(`Last move: ${state.moveHistory[state.moveHistory.length - 1]?.san || 'none'}`);
    console.log('=======================');
  },

  /**
   * Benchmark AI performance
   */
  benchmarkAI(depth: number = 4, iterations: number = 10): {
    totalTime: number;
    averageTime: number;
    nodesPerSecond: number;
  } {
    const { ChessAI } = require('./ai');
    const ai = new ChessAI(depth);
    
    const start = performance.now();
    let totalNodes = 0;

    for (let i = 0; i < iterations; i++) {
      const result = ai.findBestMove(INITIAL_FEN);
      if (result) {
        totalNodes += result.info.nodes;
      }
    }

    const totalTime = performance.now() - start;

    return {
      totalTime,
      averageTime: totalTime / iterations,
      nodesPerSecond: Math.floor(totalNodes / (totalTime / 1000))
    };
  }
};

// ============================================================================
// IMPORTS FOR INTERNAL USE
// ============================================================================
import { formatTime } from './utils';
import { quickStart, createGame } from './engine';
import { TIME_CONTROLS } from './constants';
import { INITIAL_FEN } from './constants';

// ============================================================================
// DEFAULT EXPORT
// ============================================================================
export default {
  VERSION,
  ENGINE_NAME,
  createChessGame,
  playAgainstAI,
  loadFromPGN,
  Debug,
};
