import { DeterministicEngine, type GameState } from '@/games/engine/core';
import type { EngineMove, GameEngine, PlayerState } from '@/games/types';
import {
  COLORS,
  COLOR_ORDER,
  ENTRY_INDEX,
  HOME_PATH_LENGTH,
  LudoColor,
  MAIN_TRACK_LENGTH,
  SAFE_CELLS,
  TOKENS_PER_PLAYER,
  wrapIndex
} from './constants';
import type { LudoPayload, MoveValidationResult, PlayerTrackState, SerializedMove, TokenState } from './types';

interface RollMove extends EngineMove<{ dice?: number }> {
  type: 'ROLL';
}

interface MoveToken extends EngineMove<{ tokenId: string; dice: number }> {
  type: 'MOVE_TOKEN';
}

export type LudoEngineMove = RollMove | MoveToken;

type LudoState = GameState<LudoPayload>;

function createInitialTokens(color: LudoColor): TokenState[] {
  return Array.from({ length: TOKENS_PER_PLAYER }).map((_, index) => ({
    id: `${color}-${index}`,
    stepsTaken: -1,
    isHome: false,
    isCompleted: false
  }));
}

function createTrack(players: PlayerState[]): Record<LudoColor, PlayerTrackState> {
  const track: Partial<Record<LudoColor, PlayerTrackState>> = {};
  players.slice(0, COLORS.length).forEach((player, idx) => {
    const color = COLORS[idx];
    track[color] = {
      playerId: player.id,
      color,
      tokens: createInitialTokens(color),
      finishedTokens: 0
    };
  });
  return track as Record<LudoColor, PlayerTrackState>;
}

function absolutePosition(color: LudoColor, stepsTaken: number): number | 'home' | 'base' {
  if (stepsTaken < 0) return 'base';
  if (stepsTaken >= MAIN_TRACK_LENGTH + HOME_PATH_LENGTH) return 'home';
  if (stepsTaken >= MAIN_TRACK_LENGTH) return 'home';
  const entry = ENTRY_INDEX[color];
  return wrapIndex(entry + stepsTaken);
}

function canMoveToken(token: TokenState, dice: number): boolean {
  if (token.isCompleted) return false;
  if (token.stepsTaken < 0) {
    return dice === 6;
  }
  return token.stepsTaken + dice <= MAIN_TRACK_LENGTH + HOME_PATH_LENGTH;
}

function advanceToken(token: TokenState, dice: number): TokenState {
  const nextSteps = token.stepsTaken < 0 ? dice === 6 ? 0 : token.stepsTaken : token.stepsTaken + dice;
  const updatedSteps = token.stepsTaken < 0 && dice === 6 ? 0 : nextSteps;
  const totalSteps = updatedSteps;
  const isCompleted = totalSteps >= MAIN_TRACK_LENGTH + HOME_PATH_LENGTH;
  return {
    ...token,
    stepsTaken: isCompleted ? MAIN_TRACK_LENGTH + HOME_PATH_LENGTH : totalSteps,
    isHome: totalSteps >= MAIN_TRACK_LENGTH,
    isCompleted
  };
}

function isSafeCell(position: number | 'base' | 'home') {
  return typeof position === 'number' && SAFE_CELLS.has(position);
}

function serializeMove(token: TokenState, color: LudoColor, from: number | 'base' | 'home', to: number | 'base' | 'home', dice: number, capture?: { victimTokenId: string; victimColor: LudoColor }): SerializedMove {
  return {
    tokenId: token.id,
    color,
    from,
    to,
    dice,
    capture
  };
}

export class LudoEngine extends DeterministicEngine implements GameEngine<LudoState> {
  private ensurePlayerColor(payload: LudoPayload, playerId: string): LudoColor {
    const entry = Object.values(payload.track).find(track => track.playerId === playerId);
    if (!entry) {
      throw new Error('Player not part of this match');
    }
    return entry.color;
  }

  getInitialState(players: PlayerState[], seed = Date.now()): LudoState {
    super.constructor(seed);
    const activePlayers = players.slice(0, COLORS.length);
    if (activePlayers.length < 2) {
      throw new Error('Ludo requires at least two players');
    }
    const payload: LudoPayload = {
      track: createTrack(activePlayers),
      turnOrder: COLORS.slice(0, activePlayers.length),
      currentTurnIndex: 0,
      diceHistory: [],
      pendingDice: undefined
    };
    const currentColor = payload.turnOrder[0];
    return {
      version: 0,
      payload,
      currentPlayerId: payload.track[currentColor].playerId
    };
  }

  getAvailableMoves(state: LudoState, playerId: string): string[] {
    const { payload } = state;
    const currentColor = payload.turnOrder[payload.currentTurnIndex];
    const track = payload.track[currentColor];
    if (!track || track.playerId !== playerId) {
      return [];
    }
    if (!payload.pendingDice) {
      return ['ROLL'];
    }
    const movableTokens = track.tokens.filter(token => canMoveToken(token, payload.pendingDice!));
    if (movableTokens.length === 0) {
      return ['PASS'];
    }
    return movableTokens.map(token => `MOVE_TOKEN:${token.id}`);
  }

  applyMove(state: LudoState, move: LudoEngineMove): LudoState {
    const { payload } = state;
    const currentColor = payload.turnOrder[payload.currentTurnIndex];
    const track = payload.track[currentColor];
    if (!track || track.playerId !== move.playerId) {
      throw new Error('It is not this player\'s turn');
    }

    if (move.type === 'ROLL') {
      const dice = move.data?.dice ?? this.rollDice();
      const nextPayload: LudoPayload = {
        ...payload,
        pendingDice: dice,
        diceHistory: [...payload.diceHistory, dice]
      };
      return this.nextState(state, nextPayload, { currentPlayerId: track.playerId });
    }

    if (move.type === 'MOVE_TOKEN') {
      if (payload.pendingDice === undefined) {
        throw new Error('Must roll before moving');
      }
      const dice = move.data.dice;
      if (dice !== payload.pendingDice) {
        throw new Error('Dice mismatch');
      }
      const token = track.tokens.find(t => t.id === move.data.tokenId);
      if (!token) {
        throw new Error('Token not found');
      }
      const validation = this.validateMove(token, dice);
      if (!validation.allowed) {
        throw new Error(validation.reason ?? 'Illegal move');
      }
      const fromPos = absolutePosition(track.color, token.stepsTaken);
      const updatedToken = advanceToken(token, dice);
      const toPos = absolutePosition(track.color, updatedToken.stepsTaken);

      const updatedTrack: PlayerTrackState = {
        ...track,
        tokens: track.tokens.map(t => (t.id === token.id ? updatedToken : t)),
        finishedTokens: updatedToken.isCompleted ? track.finishedTokens + 1 : track.finishedTokens
      };

      const capture = this.handleCaptures(payload, track.color, toPos, updatedToken.id);

      const nextTurnIndex = this.shouldGrantExtraTurn(dice, updatedToken, capture)
        ? payload.currentTurnIndex
        : (payload.currentTurnIndex + 1) % payload.turnOrder.length;
      const nextColor = payload.turnOrder[nextTurnIndex];

      const nextPayload: LudoPayload = {
        ...payload,
        track: {
          ...payload.track,
          [track.color]: updatedTrack
        },
        currentTurnIndex: nextTurnIndex,
        pendingDice: undefined,
        lastMove: serializeMove(updatedToken, track.color, fromPos, toPos, dice, capture ?? undefined)
      };

      return this.nextState(state, nextPayload, {
        currentPlayerId: payload.track[nextColor].playerId
      });
    }

    return state;
  }

  private validateMove(token: TokenState, dice: number): MoveValidationResult {
    if (!canMoveToken(token, dice)) {
      if (token.stepsTaken < 0 && dice !== 6) {
        return { allowed: false, reason: 'Need a six to leave base' };
      }
      return { allowed: false, reason: 'Move exceeds track range' };
    }
    return { allowed: true };
  }

  private handleCaptures(payload: LudoPayload, color: LudoColor, destination: number | 'home' | 'base', movingTokenId: string) {
    if (typeof destination !== 'number' || isSafeCell(destination)) {
      return undefined;
    }

    for (const [otherColor, track] of Object.entries(payload.track) as [LudoColor, PlayerTrackState][]) {
      if (otherColor === color) continue;
      for (const token of track.tokens) {
        if (token.stepsTaken < 0 || token.isCompleted) continue;
        const pos = absolutePosition(otherColor, token.stepsTaken);
        if (pos === destination) {
          const resetToken: TokenState = { ...token, stepsTaken: -1, isHome: false };
          payload.track[otherColor] = {
            ...track,
            tokens: track.tokens.map(t => (t.id === token.id ? resetToken : t))
          };
          return {
            victimTokenId: token.id,
            victimColor: otherColor
          };
        }
      }
    }
    return undefined;
  }

  private shouldGrantExtraTurn(dice: number, token: TokenState, capture?: { victimTokenId: string; victimColor: LudoColor }) {
    if (dice === 6) return true;
    if (capture) return true;
    if (token.isCompleted) return true;
    return false;
  }

  isTerminal(state: LudoState): boolean {
    return Object.values(state.payload.track).some(track => track.finishedTokens >= TOKENS_PER_PLAYER);
  }
}
