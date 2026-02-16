import type { LudoColor } from './constants';

export interface TokenState {
  id: string;
  stepsTaken: number; // total steps on track, including home path
  isHome: boolean;
  isCompleted: boolean;
}

export interface PlayerTrackState {
  playerId: string;
  color: LudoColor;
  tokens: TokenState[];
  finishedTokens: number;
}

export interface LudoPayload {
  track: Record<LudoColor, PlayerTrackState>;
  turnOrder: LudoColor[];
  currentTurnIndex: number;
  pendingDice?: number;
  diceHistory: number[];
  lastMove?: SerializedMove;
}

export interface SerializedMove {
  tokenId: string;
  color: LudoColor;
  from: number | 'base' | 'home';
  to: number | 'base' | 'home';
  dice: number;
  capture?: {
    victimTokenId: string;
    victimColor: LudoColor;
  };
}

export interface MoveValidationResult {
  allowed: boolean;
  reason?: string;
}
