import type { AntiCheatSignal } from '../types';
import type { GameState } from '@/games/engine/core';
import type { EngineMove } from '@/games/types';
import type { LudoPayload } from '@/games/ludo/types';

export interface SuspicionContext {
  state: GameState<LudoPayload>;
  move: EngineMove & { checksum?: string };
  diceValue?: number;
  captureOccurred?: boolean;
  action: 'ROLL' | 'MOVE' | 'POWER_UP';
}

export function detectLudoSuspicion(context: SuspicionContext): AntiCheatSignal | null {
  const suspicions: string[] = [];

  if (context.action === 'ROLL' && context.diceValue !== undefined) {
    const history = context.state.payload.diceHistory;
    const lastThree = history.slice(-3).map((entry) => entry.value);
    if (lastThree.length === 3 && lastThree.every((value) => value === context.diceValue && value === 6)) {
      suspicions.push('TRIPLE_SIX');
    }
  }

  if (context.action === 'MOVE' && context.captureOccurred) {
    const lastMove = context.state.payload.lastMove;
    const safeCells = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
    const captureOnSafe = typeof lastMove?.to === 'number' && safeCells.has(lastMove.to);
    if (captureOnSafe) {
      suspicions.push('CAPTURE_ON_SAFE_CELL');
    }
  }

  if (!suspicions.length) {
    return null;
  }

  return {
    gameId: context.state.metadata?.gameId ?? 'local-game',
    playerId: context.move.playerId,
    move: context.move,
    severity: 'warning',
    code: suspicions.join('+'),
    description: 'Potential suspicious behaviour detected in Ludo match',
    createdAt: Date.now(),
    metadata: {
      gameType: context.state.metadata?.gameType ?? 'ludo',
      version: context.state.version,
      diceValue: context.diceValue,
      captureOnSafeCell: context.action === 'MOVE' && context.captureOccurred
    }
  };
}
