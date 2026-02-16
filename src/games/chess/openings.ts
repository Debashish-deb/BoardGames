// ============================================================================
// CHESS GAME ENGINE - OPENING BOOK
// AAA Mobile Game Quality - Lichess/Chess.com Standard
//
// Features:
// - Built-in opening database
// - ECO code classification
// - Move lookup by position
// - Opening name detection
// ============================================================================

import type { Square, PieceType } from './types';
import { hashPosition } from './utils';

export interface OpeningEntry {
  eco: string;
  name: string;
  moves: string[];
  category: string;
  fen: string;
}

export interface BookMove {
  san: string;
  weight: number;
  wins: number;
  draws: number;
  losses: number;
}

// ECO (Encyclopedia of Chess Openings) classification
export const ECO_CODES: Record<string, { name: string; moves: string[] }> = {
  // A00 - Irregular Openings
  'A00': { name: 'Irregular Openings', moves: [] },
  'A01': { name: 'Nimzovich-Larsen Attack', moves: ['b3'] },
  'A02': { name: "Bird's Opening", moves: ['f4'] },
  'A03': { name: "Bird's Opening", moves: ['f4', 'd5'] },
  'A04': { name: 'Reti Opening', moves: ['Nf3'] },
  'A05': { name: 'Reti Opening', moves: ['Nf3', 'Nf6'] },
  'A06': { name: 'Reti Opening', moves: ['Nf3', 'd5'] },
  'A07': { name: "King's Indian Attack", moves: ['Nf3', 'd5', 'g3'] },
  'A08': { name: "King's Indian Attack", moves: ['Nf3', 'd5', 'g3', 'c5', 'Bg2'] },
  'A09': { name: 'Reti Opening', moves: ['Nf3', 'd5', 'c4'] },
  
  // A10-A39 - English Opening
  'A10': { name: 'English Opening', moves: ['c4'] },
  'A11': { name: 'English Opening', moves: ['c4', 'c6'] },
  'A12': { name: 'English Opening', moves: ['c4', 'c6', 'Nf3', 'd5', 'b3'] },
  'A13': { name: 'English Opening', moves: ['c4', 'e6'] },
  'A14': { name: 'English Opening', moves: ['c4', 'e6', 'Nf3', 'd5', 'g3', 'Nf6', 'Bg2', 'Be7', 'O-O'] },
  'A15': { name: 'English Opening', moves: ['c4', 'Nf6'] },
  'A16': { name: 'English Opening', moves: ['c4', 'Nf6', 'Nc3'] },
  'A17': { name: 'English Opening', moves: ['c4', 'Nf6', 'Nc3', 'e6'] },
  'A18': { name: 'English Opening', moves: ['c4', 'Nf6', 'Nc3', 'e6', 'e4'] },
  'A19': { name: 'English Opening', moves: ['c4', 'Nf6', 'Nc3', 'e6', 'e4', 'c5'] },
  'A20': { name: 'English Opening', moves: ['c4', 'e5'] },
  'A21': { name: 'English Opening', moves: ['c4', 'e5', 'Nc3'] },
  'A22': { name: 'English Opening', moves: ['c4', 'e5', 'Nc3', 'Nf6'] },
  'A23': { name: 'English Opening', moves: ['c4', 'e5', 'Nc3', 'Nf6', 'g3', 'c6'] },
  'A24': { name: 'English Opening', moves: ['c4', 'e5', 'Nc3', 'Nf6', 'g3', 'g6'] },
  'A25': { name: 'English Opening', moves: ['c4', 'e5', 'Nc3', 'Nc6'] },
  'A26': { name: 'English Opening', moves: ['c4', 'e5', 'Nc3', 'Nc6', 'g3', 'g6', 'Bg2', 'Bg7'] },
  'A27': { name: 'English Opening', moves: ['c4', 'e5', 'Nc3', 'Nc6', 'Nf3'] },
  'A28': { name: 'English Opening', moves: ['c4', 'e5', 'Nc3', 'Nc6', 'Nf3', 'Nf6'] },
  'A29': { name: 'English Opening', moves: ['c4', 'e5', 'Nc3', 'Nc6', 'Nf3', 'Nf6', 'g3'] },
  'A30': { name: 'English Opening', moves: ['c4', 'c5'] },
  'A31': { name: 'English Opening', moves: ['c4', 'c5', 'Nf3', 'Nf6'] },
  'A32': { name: 'English Opening', moves: ['c4', 'c5', 'Nf3', 'Nf6', 'd4'] },
  'A33': { name: 'English Opening', moves: ['c4', 'c5', 'Nf3', 'Nf6', 'd4', 'cxd4', 'Nxd4', 'e6'] },
  'A34': { name: 'English Opening', moves: ['c4', 'c5', 'Nc3'] },
  'A35': { name: 'English Opening', moves: ['c4', 'c5', 'Nc3', 'Nc6'] },
  'A36': { name: 'English Opening', moves: ['c4', 'c5', 'Nc3', 'Nc6', 'g3'] },
  'A37': { name: 'English Opening', moves: ['c4', 'c5', 'Nc3', 'Nc6', 'g3', 'g6', 'Bg2', 'Bg7'] },
  'A38': { name: 'English Opening', moves: ['c4', 'c5', 'Nc3', 'Nc6', 'g3', 'g6', 'Bg2', 'Bg7', 'Nf3', 'Nf6'] },
  'A39': { name: 'English Opening', moves: ['c4', 'c5', 'Nc3', 'Nc6', 'g3', 'g6', 'Bg2', 'Bg7', 'Nf3', 'Nf6', 'O-O', 'O-O', 'd4'] },
  
  // B00 - B19 - King's Pawn Opening (without 1...e5, 1...c5, 1...e6, 1...c6)
  'B00': { name: "King's Pawn Opening", moves: ['e4'] },
  'B01': { name: 'Scandinavian Defense', moves: ['e4', 'd5'] },
  'B02': { name: "Alekhine's Defense", moves: ['e4', 'Nf6'] },
  'B03': { name: "Alekhine's Defense", moves: ['e4', 'Nf6', 'e5', 'Nd5', 'd4'] },
  'B04': { name: "Alekhine's Defense", moves: ['e4', 'Nf6', 'e5', 'Nd5', 'd4', 'd6'] },
  'B05': { name: "Alekhine's Defense", moves: ['e4', 'Nf6', 'e5', 'Nd5', 'd4', 'd6', 'Nf3', 'g6'] },
  'B06': { name: 'Modern Defense', moves: ['e4', 'g6'] },
  'B07': { name: 'Pirc Defense', moves: ['e4', 'd6', 'd4', 'Nf6'] },
  'B08': { name: 'Pirc Defense', moves: ['e4', 'd6', 'd4', 'Nf6', 'Nc3', 'g6'] },
  'B09': { name: 'Pirc Defense', moves: ['e4', 'd6', 'd4', 'Nf6', 'Nc3', 'g6', 'f4'] },
  'B10': { name: 'Caro-Kann Defense', moves: ['e4', 'c6'] },
  'B11': { name: 'Caro-Kann Defense', moves: ['e4', 'c6', 'Nc3', 'd5', 'Nf3', 'Bg4'] },
  'B12': { name: 'Caro-Kann Defense', moves: ['e4', 'c6', 'd4', 'd5'] },
  'B13': { name: 'Caro-Kann Defense', moves: ['e4', 'c6', 'd4', 'd5', 'exd5'] },
  'B14': { name: 'Caro-Kann Defense', moves: ['e4', 'c6', 'd4', 'd5', 'exd5', 'cxd5', 'c4', 'Nf6', 'Nc3'] },
  'B15': { name: 'Caro-Kann Defense', moves: ['e4', 'c6', 'd4', 'd5', 'Nc3'] },
  'B16': { name: 'Caro-Kann Defense', moves: ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Nf6', 'Nxf6+', 'gxf6'] },
  'B17': { name: 'Caro-Kann Defense', moves: ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Nd7'] },
  'B18': { name: 'Caro-Kann Defense', moves: ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Bf5'] },
  'B19': { name: 'Caro-Kann Defense', moves: ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Bf5', 'Ng3', 'Bg6', 'h4', 'h6', 'Nf3', 'Nd7'] },
  
  // C00 - C19 - French Defense
  'C00': { name: 'French Defense', moves: ['e4', 'e6'] },
  'C01': { name: 'French Defense', moves: ['e4', 'e6', 'd4', 'd5', 'exd5'] },
  'C02': { name: 'French Defense', moves: ['e4', 'e6', 'd4', 'd5', 'e5'] },
  'C03': { name: 'French Defense', moves: ['e4', 'e6', 'd4', 'd5', 'Nd2'] },
  'C04': { name: 'French Defense', moves: ['e4', 'e6', 'd4', 'd5', 'Nd2', 'Nc6', 'Ngf3', 'Nf6'] },
  'C05': { name: 'French Defense', moves: ['e4', 'e6', 'd4', 'd5', 'Nd2', 'Nf6'] },
  'C06': { name: 'French Defense', moves: ['e4', 'e6', 'd4', 'd5', 'Nd2', 'Nf6', 'e5', 'Nfd7', 'Bd3', 'c5', 'c3', 'Nc6'] },
  'C07': { name: 'French Defense', moves: ['e4', 'e6', 'd4', 'd5', 'Nd2', 'c5'] },
  'C08': { name: 'French Defense', moves: ['e4', 'e6', 'd4', 'd5', 'Nd2', 'c5', 'exd5', 'exd5'] },
  'C09': { name: 'French Defense', moves: ['e4', 'e6', 'd4', 'd5', 'Nd2', 'c5', 'exd5', 'exd5', 'Ngf3', 'Nc6'] },
  'C10': { name: 'French Defense', moves: ['e4', 'e6', 'd4', 'd5', 'Nc3'] },
  'C11': { name: 'French Defense', moves: ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Nf6'] },
  'C12': { name: 'French Defense', moves: ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Nf6', 'Bg5', 'Bb4'] },
  'C13': { name: 'French Defense', moves: ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Nf6', 'Bg5', 'dxe4'] },
  'C14': { name: 'French Defense', moves: ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Nf6', 'Bg5', 'Be7'] },
  'C15': { name: 'French Defense', moves: ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Bb4'] },
  'C16': { name: 'French Defense', moves: ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Bb4', 'e5'] },
  'C17': { name: 'French Defense', moves: ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Bb4', 'e5', 'c5'] },
  'C18': { name: 'French Defense', moves: ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Bb4', 'e5', 'c5', 'a3'] },
  'C19': { name: 'French Defense', moves: ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Bb4', 'e5', 'c5', 'a3', 'Bxc3+', 'bxc3', 'Ne7'] },
  
  // D00 - D99 - Queen's Pawn Game
  'D00': { name: "Queen's Pawn Game", moves: ['d4', 'd5'] },
  'D01': { name: "Queen's Pawn Game", moves: ['d4', 'd5', 'Nc3', 'Nf6', 'Bg5'] },
  'D02': { name: "Queen's Pawn Game", moves: ['d4', 'd5', 'Nf3'] },
  'D03': { name: "Queen's Pawn Game", moves: ['d4', 'd5', 'Nf3', 'Nf6', 'Bg5'] },
  'D04': { name: "Queen's Pawn Game", moves: ['d4', 'd5', 'Nf3', 'Nf6', 'e3'] },
  'D05': { name: "Queen's Pawn Game", moves: ['d4', 'd5', 'Nf3', 'Nf6', 'e3', 'e6', 'Bd3'] },
  'D06': { name: "Queen's Gambit Declined", moves: ['d4', 'd5', 'c4'] },
  'D07': { name: "Queen's Gambit Declined", moves: ['d4', 'd5', 'c4', 'Nc6'] },
  'D08': { name: "Queen's Gambit Declined", moves: ['d4', 'd5', 'c4', 'e5'] },
  'D09': { name: "Queen's Gambit Declined", moves: ['d4', 'd5', 'c4', 'e5', 'dxe5', 'd4', 'Nf3'] },
  'D10': { name: "Queen's Gambit Declined", moves: ['d4', 'd5', 'c4', 'c6'] },
  'D11': { name: "Queen's Gambit Declined", moves: ['d4', 'd5', 'c4', 'c6', 'Nf3'] },
  'D12': { name: "Queen's Gambit Declined", moves: ['d4', 'd5', 'c4', 'c6', 'Nf3', 'Nf6', 'e3'] },
  'D13': { name: "Queen's Gambit Declined", moves: ['d4', 'd5', 'c4', 'c6', 'Nf3', 'Nf6', 'e3', 'Bf5'] },
  'D14': { name: "Queen's Gambit Declined", moves: ['d4', 'd5', 'c4', 'c6', 'Nf3', 'Nf6', 'e3', 'Bf5', 'cxd5', 'cxd5', 'Qb3', 'Qc8', 'Bd1'] },
  'D15': { name: "Queen's Gambit Declined", moves: ['d4', 'd5', 'c4', 'c6', 'Nf3', 'Nf6', 'Nc3'] },
  'D16': { name: "Queen's Gambit Declined", moves: ['d4', 'd5', 'c4', 'c6', 'Nf3', 'Nf6', 'Nc3', 'dxc4', 'a4'] },
  'D17': { name: "Queen's Gambit Declined", moves: ['d4', 'd5', 'c4', 'c6', 'Nf3', 'Nf6', 'Nc3', 'dxc4', 'a4', 'Bf5'] },
  'D18': { name: "Queen's Gambit Declined", moves: ['d4', 'd5', 'c4', 'c6', 'Nf3', 'Nf6', 'Nc3', 'dxc4', 'a4', 'Bf5', 'e3'] },
  'D19': { name: "Queen's Gambit Declined", moves: ['d4', 'd5', 'c4', 'c6', 'Nf3', 'Nf6', 'Nc3', 'dxc4', 'a4', 'Bf5', 'e3', 'e6', 'Bxc4'] },
  
  // E00 - E99 - Indian Defenses
  'E00': { name: "Queen's Pawn Game", moves: ['d4', 'Nf6', 'c4'] },
  'E01': { name: 'Catalan Opening', moves: ['d4', 'Nf6', 'c4', 'e6', 'g3'] },
  'E02': { name: 'Catalan Opening', moves: ['d4', 'Nf6', 'c4', 'e6', 'g3', 'd5', 'Bg2'] },
  'E03': { name: 'Catalan Opening', moves: ['d4', 'Nf6', 'c4', 'e6', 'g3', 'd5', 'Bg2', 'dxc4', 'Qa4+', 'Nbd7', 'Qxc4'] },
  'E04': { name: 'Catalan Opening', moves: ['d4', 'Nf6', 'c4', 'e6', 'g3', 'd5', 'Bg2', 'dxc4', 'Nf3'] },
  'E05': { name: 'Catalan Opening', moves: ['d4', 'Nf6', 'c4', 'e6', 'g3', 'd5', 'Bg2', 'dxc4', 'Nf3', 'Be7'] },
  'E06': { name: 'Catalan Opening', moves: ['d4', 'Nf6', 'c4', 'e6', 'g3', 'd5', 'Bg2', 'Be7', 'Nf3'] },
  'E07': { name: 'Catalan Opening', moves: ['d4', 'Nf6', 'c4', 'e6', 'g3', 'd5', 'Bg2', 'Be7', 'Nf3', 'O-O', 'O-O', 'Nbd7'] },
  'E08': { name: 'Catalan Opening', moves: ['d4', 'Nf6', 'c4', 'e6', 'g3', 'd5', 'Bg2', 'Be7', 'Nf3', 'O-O', 'O-O', 'Nbd7', 'Qc2'] },
  'E09': { name: 'Catalan Opening', moves: ['d4', 'Nf6', 'c4', 'e6', 'g3', 'd5', 'Bg2', 'Be7', 'Nf3', 'O-O', 'O-O', 'Nbd7', 'Qc2', 'c5', 'Rd1'] },
  'E10': { name: "Queen's Pawn Game", moves: ['d4', 'Nf6', 'c4', 'e6', 'Nf3'] },
  'E11': { name: 'Bogo-Indian Defense', moves: ['d4', 'Nf6', 'c4', 'e6', 'Nf3', 'Bb4+'] },
  'E12': { name: "Queen's Indian Defense", moves: ['d4', 'Nf6', 'c4', 'e6', 'Nf3', 'b6'] },
  'E13': { name: "Queen's Indian Defense", moves: ['d4', 'Nf6', 'c4', 'e6', 'Nf3', 'b6', 'Nc3', 'Bb7', 'Bg5', 'h6', 'Bh4', 'Bb4'] },
  'E14': { name: "Queen's Indian Defense", moves: ['d4', 'Nf6', 'c4', 'e6', 'Nf3', 'b6', 'e3'] },
  'E15': { name: "Queen's Indian Defense", moves: ['d4', 'Nf6', 'c4', 'e6', 'Nf3', 'b6', 'g3'] },
  'E16': { name: "Queen's Indian Defense", moves: ['d4', 'Nf6', 'c4', 'e6', 'Nf3', 'b6', 'g3', 'Bb7', 'Bg2', 'Bb4+'] },
  'E17': { name: "Queen's Indian Defense", moves: ['d4', 'Nf6', 'c4', 'e6', 'Nf3', 'b6', 'g3', 'Bb7', 'Bg2', 'Be7'] },
  'E18': { name: "Queen's Indian Defense", moves: ['d4', 'Nf6', 'c4', 'e6', 'Nf3', 'b6', 'g3', 'Bb7', 'Bg2', 'Be7', 'O-O', 'O-O', 'Nc3'] },
  'E19': { name: "Queen's Indian Defense", moves: ['d4', 'Nf6', 'c4', 'e6', 'Nf3', 'b6', 'g3', 'Bb7', 'Bg2', 'Be7', 'O-O', 'O-O', 'Nc3', 'Ne4', 'Qc2', 'Nxc3', 'Qxc3'] },
  'E20': { name: 'Nimzo-Indian Defense', moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4'] },
  'E21': { name: 'Nimzo-Indian Defense', moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'Nf3'] },
  'E22': { name: 'Nimzo-Indian Defense', moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'Qb3'] },
  'E23': { name: 'Nimzo-Indian Defense', moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'Qb3', 'c5', 'dxc5', 'Nc6', 'Nf3', 'Ne4', 'Bd2', 'Nxd2'] },
  'E24': { name: 'Nimzo-Indian Defense', moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'a3'] },
  'E25': { name: 'Nimzo-Indian Defense', moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'a3', 'Bxc3+', 'bxc3', 'c5', 'f3'] },
  'E26': { name: 'Nimzo-Indian Defense', moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'a3', 'Bxc3+', 'bxc3', 'c5', 'e3'] },
  'E27': { name: 'Nimzo-Indian Defense', moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'a3', 'Bxc3+', 'bxc3', 'O-O'] },
  'E28': { name: 'Nimzo-Indian Defense', moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'a3', 'Bxc3+', 'bxc3', 'O-O', 'e3'] },
  'E29': { name: 'Nimzo-Indian Defense', moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'a3', 'Bxc3+', 'bxc3', 'O-O', 'e3', 'c5', 'Bd3', 'Nc6'] },
  'E30': { name: 'Nimzo-Indian Defense', moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'Bg5'] },
  'E31': { name: 'Nimzo-Indian Defense', moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'Bg5', 'h6', 'Bh4', 'c5', 'd5', 'b5'] },
  'E32': { name: 'Nimzo-Indian Defense', moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'Qc2'] },
  'E33': { name: 'Nimzo-Indian Defense', moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'Qc2', 'Nc6', 'Nf3', 'd6'] },
  'E34': { name: 'Nimzo-Indian Defense', moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'Qc2', 'd5'] },
  'E35': { name: 'Nimzo-Indian Defense', moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'Qc2', 'd5', 'cxd5', 'exd5'] },
  'E36': { name: 'Nimzo-Indian Defense', moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'Qc2', 'd5', 'a3'] },
  'E37': { name: 'Nimzo-Indian Defense', moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'Qc2', 'd5', 'a3', 'Bxc3+', 'Qxc3', 'Ne4', 'Qc2'] },
  'E38': { name: 'Nimzo-Indian Defense', moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'Qc2', 'c5'] },
  'E39': { name: 'Nimzo-Indian Defense', moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'Qc2', 'c5', 'dxc5', 'O-O'] },
  'E40': { name: 'Nimzo-Indian Defense', moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'e3'] },
  'E41': { name: 'Nimzo-Indian Defense', moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'e3', 'c5'] },
  'E42': { name: 'Nimzo-Indian Defense', moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'e3', 'c5', 'Ne2'] },
  'E43': { name: 'Nimzo-Indian Defense', moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'e3', 'b6'] },
  'E44': { name: 'Nimzo-Indian Defense', moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'e3', 'b6', 'Ne2'] },
  'E45': { name: 'Nimzo-Indian Defense', moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'e3', 'Ne4', 'Ne2'] },
  'E46': { name: 'Nimzo-Indian Defense', moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'e3', 'O-O'] },
  'E47': { name: 'Nimzo-Indian Defense', moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'e3', 'O-O', 'Bd3'] },
  'E48': { name: 'Nimzo-Indian Defense', moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'e3', 'O-O', 'Bd3', 'd5'] },
  'E49': { name: 'Nimzo-Indian Defense', moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'e3', 'O-O', 'Bd3', 'd5', 'a3', 'Bxc3+', 'bxc3'] },
  'E50': { name: 'Nimzo-Indian Defense', moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'e3', 'O-O', 'Nf3'] },
  'E51': { name: 'Nimzo-Indian Defense', moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'e3', 'O-O', 'Nf3', 'd5'] },
  'E52': { name: 'Nimzo-Indian Defense', moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'e3', 'O-O', 'Nf3', 'd5', 'Bd3', 'b6', 'O-O', 'Bb7'] },
  'E53': { name: 'Nimzo-Indian Defense', moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'e3', 'O-O', 'Nf3', 'd5', 'Bd3', 'c5', 'O-O', 'cxd4', 'exd4'] },
  'E54': { name: 'Nimzo-Indian Defense', moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'e3', 'O-O', 'Nf3', 'd5', 'Bd3', 'c5', 'O-O', 'dxc4', 'Bxc4'] },
  'E55': { name: 'Nimzo-Indian Defense', moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'e3', 'O-O', 'Nf3', 'd5', 'Bd3', 'c5', 'O-O', 'dxc4', 'Bxc4', 'Nc6', 'a3'] },
  'E56': { name: 'Nimzo-Indian Defense', moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'e3', 'O-O', 'Nf3', 'd5', 'Bd3', 'c5', 'O-O', 'Nc6', 'a3', 'Ba5'] },
  'E57': { name: 'Nimzo-Indian Defense', moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'e3', 'O-O', 'Nf3', 'd5', 'Bd3', 'c5', 'O-O', 'Nc6', 'a3', 'dxc4', 'Bxc4'] },
  'E58': { name: 'Nimzo-Indian Defense', moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'e3', 'O-O', 'Nf3', 'd5', 'Bd3', 'c5', 'O-O', 'Nc6', 'a3', 'Bxc3', 'bxc3'] },
  'E59': { name: 'Nimzo-Indian Defense', moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'e3', 'O-O', 'Nf3', 'd5', 'Bd3', 'c5', 'O-O', 'Nc6', 'a3', 'Bxc3', 'bxc3', 'dxc4', 'Bxc4'] },
  'E60': { name: "King's Indian Defense", moves: ['d4', 'Nf6', 'c4', 'g6'] },
  'E61': { name: "King's Indian Defense", moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3'] },
  'E62': { name: "King's Indian Defense", moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'Nf3', 'd6', 'g3'] },
  'E63': { name: "King's Indian Defense", moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'Nf3', 'd6', 'g3', 'O-O', 'Bg2', 'Nc6', 'O-O'] },
  'E64': { name: "King's Indian Defense", moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'Nf3', 'd6', 'g3', 'O-O', 'Bg2', 'c5'] },
  'E65': { name: "King's Indian Defense", moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'Nf3', 'd6', 'g3', 'O-O', 'Bg2', 'c5', 'O-O'] },
  'E66': { name: "King's Indian Defense", moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'Nf3', 'd6', 'g3', 'O-O', 'Bg2', 'c5', 'O-O', 'Nc6', 'd5'] },
  'E67': { name: "King's Indian Defense", moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'Nf3', 'd6', 'g3', 'O-O', 'Bg2', 'Nc6', 'O-O', 'Bf5'] },
  'E68': { name: "King's Indian Defense", moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'Nf3', 'd6', 'g3', 'O-O', 'Bg2', 'Nc6', 'O-O', 'Bf5', 'd5', 'Na5', 'Nd2', 'c5', 'Qc2', 'Rc8', 'b3'] },
  'E69': { name: "King's Indian Defense", moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'Nf3', 'd6', 'g3', 'O-O', 'Bg2', 'Nc6', 'O-O', 'e5', 'd5', 'Ne7', 'e4'] },
  'E70': { name: "King's Indian Defense", moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4'] },
  'E71': { name: "King's Indian Defense", moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'h3'] },
  'E72': { name: "King's Indian Defense", moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'g3'] },
  'E73': { name: "King's Indian Defense", moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'Be2'] },
  'E74': { name: "King's Indian Defense", moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'Be2', 'Nbd7', 'Bf4'] },
  'E75': { name: "King's Indian Defense", moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'Be2', 'Nbd7', 'Bg5'] },
  'E76': { name: "King's Indian Defense", moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'f4'] },
  'E77': { name: "King's Indian Defense", moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'f4', 'O-O', 'Be2', 'c5', 'Nf3', 'cxd4', 'Nxd4', 'Nc6', 'Be3'] },
  'E78': { name: "King's Indian Defense", moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'f4', 'O-O', 'Be2', 'c5', 'Nf3', 'cxd4', 'Nxd4', 'Nc6', 'Be3'] },
  'E79': { name: "King's Indian Defense", moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'f4', 'O-O', 'Be2', 'c5', 'Nf3', 'cxd4', 'Nxd4', 'Nc6', 'Be3'] },
  'E80': { name: "King's Indian Defense", moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'f3'] },
  'E81': { name: "King's Indian Defense", moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'f3', 'O-O'] },
  'E82': { name: "King's Indian Defense", moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'f3', 'O-O', 'Be3', 'b6'] },
  'E83': { name: "King's Indian Defense", moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'f3', 'O-O', 'Be3', 'Nc6'] },
  'E84': { name: "King's Indian Defense", moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'f3', 'O-O', 'Be3', 'Nc6', 'Nge2', 'Rb8', 'Qd2'] },
  'E85': { name: "King's Indian Defense", moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'f3', 'O-O', 'Be3', 'e5'] },
  'E86': { name: "King's Indian Defense", moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'f3', 'O-O', 'Be3', 'e5', 'Nge2', 'c6'] },
  'E87': { name: "King's Indian Defense", moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'f3', 'O-O', 'Be3', 'e5', 'd5'] },
  'E88': { name: "King's Indian Defense", moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'f3', 'O-O', 'Be3', 'e5', 'd5', 'Nc6'] },
  'E89': { name: "King's Indian Defense", moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'f3', 'O-O', 'Be3', 'e5', 'd5', 'Nc6', 'Nge2'] },
  'E90': { name: "King's Indian Defense", moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'Nf3'] },
  'E91': { name: "King's Indian Defense", moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'Nf3', 'O-O', 'Be2'] },
  'E92': { name: "King's Indian Defense", moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'Nf3', 'O-O', 'Be2', 'e5'] },
  'E93': { name: "King's Indian Defense", moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'Nf3', 'O-O', 'Be2', 'e5', 'd5'] },
  'E94': { name: "King's Indian Defense", moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'Nf3', 'O-O', 'Be2', 'e5', 'O-O'] },
  'E95': { name: "King's Indian Defense", moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'Nf3', 'O-O', 'Be2', 'e5', 'O-O', 'Nbd7'] },
  'E96': { name: "King's Indian Defense", moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'Nf3', 'O-O', 'Be2', 'e5', 'O-O', 'Nbd7', 'Re1'] },
  'E97': { name: "King's Indian Defense", moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'Nf3', 'O-O', 'Be2', 'e5', 'O-O', 'Nc6'] },
  'E98': { name: "King's Indian Defense", moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'Nf3', 'O-O', 'Be2', 'e5', 'O-O', 'Nc6', 'd5', 'Ne7'] },
  'E99': { name: "King's Indian Defense", moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'Nf3', 'O-O', 'Be2', 'e5', 'O-O', 'Nc6', 'd5', 'Ne7', 'Ne1', 'Nd7', 'f3', 'f5'] },
};

// Opening book for common positions
export class OpeningBook {
  private positions = new Map<string, BookMove[]>();

  constructor() {
    this.initializeBook();
  }

  private initializeBook(): void {
    // Starting position
    this.addPosition('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -', [
      { san: 'e4', weight: 45, wins: 1000, draws: 500, losses: 800 },
      { san: 'd4', weight: 40, wins: 900, draws: 550, losses: 750 },
      { san: 'Nf3', weight: 8, wins: 200, draws: 150, losses: 180 },
      { san: 'c4', weight: 7, wins: 180, draws: 140, losses: 160 },
    ]);

    // After 1.e4
    this.addPosition('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3', [
      { san: 'e5', weight: 40, wins: 800, draws: 400, losses: 600 },
      { san: 'c5', weight: 35, wins: 700, draws: 450, losses: 550 },
      { san: 'e6', weight: 15, wins: 300, draws: 200, losses: 250 },
      { san: 'c6', weight: 8, wins: 150, draws: 100, losses: 130 },
      { san: 'd6', weight: 2, wins: 50, draws: 30, losses: 40 },
    ]);

    // After 1.d4
    this.addPosition('rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3', [
      { san: 'd5', weight: 45, wins: 900, draws: 500, losses: 700 },
      { san: 'Nf6', weight: 40, wins: 800, draws: 550, losses: 650 },
      { san: 'f5', weight: 8, wins: 150, draws: 100, losses: 130 },
      { san: 'g6', weight: 5, wins: 100, draws: 70, losses: 90 },
      { san: 'e6', weight: 2, wins: 50, draws: 30, losses: 40 },
    ]);

    // Add more positions as needed...
  }

  private addPosition(fen: string, moves: BookMove[]): void {
    const key = hashPosition(fen);
    this.positions.set(key, moves);
  }

  /**
   * Get book moves for a position
   */
  getMoves(fen: string): BookMove[] {
    const key = hashPosition(fen);
    return this.positions.get(key) || [];
  }

  /**
   * Check if position is in book
   */
  hasPosition(fen: string): boolean {
    const key = hashPosition(fen);
    return this.positions.has(key);
  }

  /**
   * Get a random book move weighted by frequency
   */
  getRandomMove(fen: string): string | null {
    const moves = this.getMoves(fen);
    if (moves.length === 0) return null;

    const totalWeight = moves.reduce((sum, m) => sum + m.weight, 0);
    let random = Math.random() * totalWeight;

    for (const move of moves) {
      random -= move.weight;
      if (random <= 0) {
        return move.san;
      }
    }

    return moves[moves.length - 1].san;
  }

  /**
   * Get the best book move (highest win rate)
   */
  getBestMove(fen: string): string | null {
    const moves = this.getMoves(fen);
    if (moves.length === 0) return null;

    return moves.reduce((best, move) => {
      const bestRate = best.wins / (best.wins + best.draws + best.losses);
      const moveRate = move.wins / (move.wins + move.draws + move.losses);
      return moveRate > bestRate ? move : best;
    }).san;
  }
}

// Opening classifier
export class OpeningClassifier {
  private ecoCodes = ECO_CODES;

  /**
   * Classify an opening based on move history
   */
  classify(moves: string[]): { eco: string; name: string } | null {
    for (const [eco, data] of Object.entries(this.ecoCodes)) {
      if (this.matchesMoves(moves, data.moves)) {
        return { eco, name: data.name };
      }
    }
    return null;
  }

  private matchesMoves(gameMoves: string[], openingMoves: string[]): boolean {
    if (gameMoves.length < openingMoves.length) return false;
    
    for (let i = 0; i < openingMoves.length; i++) {
      if (gameMoves[i] !== openingMoves[i]) return false;
    }
    
    return true;
  }

  /**
   * Get ECO code for a position
   */
  getECO(moves: string[]): string {
    const classification = this.classify(moves);
    return classification?.eco || 'A00';
  }

  /**
   * Get opening name for a position
   */
  getName(moves: string[]): string {
    const classification = this.classify(moves);
    return classification?.name || 'Irregular Opening';
  }
}

// Export singleton instances
export const openingBook = new OpeningBook();
export const openingClassifier = new OpeningClassifier();
