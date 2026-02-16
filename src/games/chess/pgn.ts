// ============================================================================
// CHESS GAME ENGINE - PGN IMPORT/EXPORT
// AAA Mobile Game Quality - Lichess/Chess.com Standard
//
// Features:
// - PGN export with full headers
// - PGN import with move parsing
// - Game validation
// - Comment and annotation support
// - Variation support
// ============================================================================

import { Chess } from 'chess.js';
import type { GameState, PGNHeaders, PGNGame, SanMove, Result } from './types';
import { INITIAL_FEN } from './constants';
import { getResultFromStatus, getGameStatusText } from './utils';

export class PGNHandler {
  /**
   * Export a game to PGN format
   */
  static exportGame(
    state: GameState,
    extraHeaders: Partial<PGNHeaders> = {}
  ): string {
    const headers = this.generateHeaders(state, extraHeaders);
    const moveText = this.generateMoveText(state);
    const result = state.result || getResultFromStatus(state.status, state.winner);

    let pgn = '';

    // Headers
    for (const [key, value] of Object.entries(headers)) {
      if (value !== undefined) {
        pgn += `[${key} "${value}"]\n`;
      }
    }

    pgn += '\n';

    // Move text with line wrapping
    const wrappedMoves = this.wrapText(moveText + ' ' + result, 80);
    pgn += wrappedMoves;

    return pgn;
  }

  /**
   * Import a game from PGN format
   */
  static importGame(pgn: string): PGNGame | null {
    try {
      const lines = pgn.split('\n').map(l => l.trim()).filter(l => l);
      
      const headers: PGNHeaders = {};
      const moveLines: string[] = [];
      let inHeaders = true;

      for (const line of lines) {
        if (line.startsWith('[') && line.endsWith(']')) {
          if (inHeaders) {
            const match = line.match(/^\[(\w+)\s+"([^"]*)"\]$/);
            if (match) {
              headers[match[1] as keyof PGNHeaders] = match[2];
            }
          }
        } else {
          inHeaders = false;
          moveLines.push(line);
        }
      }

      const moveText = moveLines.join(' ');
      const moves = this.parseMoveText(moveText);
      const result = this.extractResult(moveText);

      return {
        headers,
        moves,
        result
      };
    } catch (error) {
      console.error('Failed to import PGN:', error);
      return null;
    }
  }

  /**
   * Load a PGN game into a chess.js instance
   */
  static loadGame(pgn: string): Chess | null {
    const chess = new Chess();
    
    try {
      const game = this.importGame(pgn);
      if (!game) return null;

      // Set starting position if specified
      if (game.headers.SetUp === '1' && game.headers.FEN) {
        chess.load(game.headers.FEN);
      }

      // Play through moves
      for (const san of game.moves) {
        const result = chess.move(san);
        if (!result) {
          console.warn(`Invalid move in PGN: ${san}`);
          return null;
        }
      }

      return chess;
    } catch (error) {
      console.error('Failed to load PGN game:', error);
      return null;
    }
  }

  /**
   * Validate a PGN string
   */
  static validate(pgn: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    try {
      const game = this.importGame(pgn);
      if (!game) {
        errors.push('Failed to parse PGN');
        return { valid: false, errors };
      }

      // Validate required headers
      const requiredHeaders = ['Event', 'Site', 'Date', 'Round', 'White', 'Black', 'Result'];
      for (const header of requiredHeaders) {
        if (!game.headers[header as keyof PGNHeaders]) {
          errors.push(`Missing required header: ${header}`);
        }
      }

      // Validate moves by playing through them
      const chess = new Chess();
      if (game.headers.SetUp === '1' && game.headers.FEN) {
        chess.load(game.headers.FEN);
      }

      for (let i = 0; i < game.moves.length; i++) {
        const san = game.moves[i];
        const result = chess.move(san);
        if (!result) {
          errors.push(`Invalid move at position ${i + 1}: ${san}`);
          break;
        }
      }

      // Validate result matches position
      if (errors.length === 0) {
        const expectedResult = this.getExpectedResult(chess);
        if (game.result !== expectedResult && game.result !== '*') {
          errors.push(`Result ${game.result} does not match position (${expectedResult})`);
        }
      }

    } catch (error) {
      errors.push(`Validation error: ${error}`);
    }

    return { valid: errors.length === 0, errors };
  }

  private static generateHeaders(
    state: GameState,
    extraHeaders: Partial<PGNHeaders>
  ): PGNHeaders {
    const now = new Date();
    const date = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;

    return {
      Event: 'Casual Game',
      Site: 'Online',
      Date: date,
      Round: '-',
      White: state.players.white.name,
      Black: state.players.black.name,
      Result: state.result || getResultFromStatus(state.status, state.winner),
      WhiteElo: state.players.white.rating?.toString(),
      BlackElo: state.players.black.rating?.toString(),
      TimeControl: this.formatTimeControl(state.timeControl),
      Termination: getGameStatusText(state.status, state.winner),
      ...extraHeaders
    };
  }

  private static generateMoveText(state: GameState): string {
    let text = '';
    let moveNumber = 1;

    for (let i = 0; i < state.moveHistory.length; i += 2) {
      text += `${moveNumber}. `;

      // White's move
      const whiteMove = state.moveHistory[i];
      text += whiteMove.san + ' ';

      // Black's move (if exists)
      const blackMove = state.moveHistory[i + 1];
      if (blackMove) {
        text += blackMove.san + ' ';
      }

      moveNumber++;
    }

    return text.trim();
  }

  private static parseMoveText(moveText: string): string[] {
    // Remove result
    moveText = moveText.replace(/\s*(1-0|0-1|1\/2-1\/2|\*)\s*$/, '');
    
    // Remove move numbers
    moveText = moveText.replace(/\d+\./g, '');
    
    // Remove comments { ... }
    moveText = moveText.replace(/\{[^}]*\}/g, '');
    
    // Remove variations ( ... )
    moveText = moveText.replace(/\([^)]*\)/g, '');
    
    // Remove annotations
    moveText = moveText.replace(/\$\d+/g, '');
    moveText = moveText.replace(/[!?]+/g, '');
    
    // Split into moves
    const moves = moveText
      .split(/\s+/)
      .map(m => m.trim())
      .filter(m => m.length > 0);

    return moves;
  }

  private static extractResult(moveText: string): Result {
    const match = moveText.match(/(1-0|0-1|1\/2-1\/2|\*)\s*$/);
    return (match?.[1] as Result) || '*';
  }

  private static getExpectedResult(chess: Chess): Result {
    if (chess.isCheckmate()) {
      return chess.turn() === 'w' ? '0-1' : '1-0';
    }
    if (chess.isDraw() || chess.isStalemate()) {
      return '1/2-1/2';
    }
    return '*';
  }

  private static formatTimeControl(tc: { initial: number; increment: number }): string {
    const initialSeconds = Math.floor(tc.initial / 1000);
    const incrementSeconds = Math.floor(tc.increment / 1000);
    
    if (incrementSeconds > 0) {
      return `${initialSeconds}+${incrementSeconds}`;
    }
    return initialSeconds.toString();
  }

  private static wrapText(text: string, maxLength: number): string {
    const words = text.split(' ');
    let result = '';
    let currentLine = '';

    for (const word of words) {
      if (currentLine.length + word.length + 1 > maxLength) {
        result += currentLine.trim() + '\n';
        currentLine = word + ' ';
      } else {
        currentLine += word + ' ';
      }
    }

    result += currentLine.trim();
    return result;
  }

  /**
   * Export multiple games to a single PGN file
   */
  static exportDatabase(games: GameState[]): string {
    return games.map(game => this.exportGame(game)).join('\n\n');
  }

  /**
   * Import multiple games from a PGN database
   */
  static importDatabase(pgn: string): PGNGame[] {
    const games: PGNGame[] = [];
    const gameTexts = pgn.split(/\n\n(?=\[)/);

    for (const gameText of gameTexts) {
      const game = this.importGame(gameText.trim());
      if (game) {
        games.push(game);
      }
    }

    return games;
  }

  /**
   * Add comments to a PGN
   */
  static addComments(pgn: string, comments: Map<number, string>): string {
    const game = this.importGame(pgn);
    if (!game) return pgn;

    let moveText = '';
    let moveNumber = 1;

    for (let i = 0; i < game.moves.length; i += 2) {
      moveText += `${moveNumber}. `;

      const whiteMove = game.moves[i];
      const whiteComment = comments.get(i);
      moveText += whiteMove;
      if (whiteComment) {
        moveText += ` { ${whiteComment} }`;
      }
      moveText += ' ';

      const blackMove = game.moves[i + 1];
      if (blackMove) {
        const blackComment = comments.get(i + 1);
        moveText += blackMove;
        if (blackComment) {
          moveText += ` { ${blackComment} }`;
        }
        moveText += ' ';
      }

      moveNumber++;
    }

    moveText += game.result;

    // Reconstruct PGN
    let result = '';
    for (const [key, value] of Object.entries(game.headers)) {
      if (value !== undefined) {
        result += `[${key} "${value}"]\n`;
      }
    }
    result += '\n' + this.wrapText(moveText, 80);

    return result;
  }

  /**
   * Get FEN at a specific move number
   */
  static getFenAtMove(pgn: string, moveNumber: number): string | null {
    const chess = new Chess();
    const game = this.importGame(pgn);
    
    if (!game) return null;

    if (game.headers.SetUp === '1' && game.headers.FEN) {
      chess.load(game.headers.FEN);
    }

    for (let i = 0; i < Math.min(moveNumber, game.moves.length); i++) {
      chess.move(game.moves[i]);
    }

    return chess.fen();
  }

  /**
   * Convert game state to FEN history
   */
  static getFenHistory(state: GameState): string[] {
    const chess = new Chess(state.moveHistory[0]?.fenBefore || INITIAL_FEN);
    const history: string[] = [chess.fen()];

    for (const move of state.moveHistory) {
      chess.move(move.san);
      history.push(chess.fen());
    }

    return history;
  }
}

// Quick export function
export function exportToPGN(
  state: GameState,
  extraHeaders?: Partial<PGNHeaders>
): string {
  return PGNHandler.exportGame(state, extraHeaders);
}

// Quick import function
export function importFromPGN(pgn: string): PGNGame | null {
  return PGNHandler.importGame(pgn);
}

// Validate PGN
export function validatePGN(pgn: string): { valid: boolean; errors: string[] } {
  return PGNHandler.validate(pgn);
}
