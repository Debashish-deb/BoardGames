import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { EngineMove } from '@/games/types';
import type { ClientGameStatePayload, Envelope } from '@/network/types';
import { decodePayload } from '@/network/types';
import { generateRequestId } from '@/network/utils';

interface PendingMove {
  requestId: string;
  move: EngineMove;
  status: 'queued' | 'sent';
}

interface GameState {
  gameId?: string;
  version: number;
  gameType?: string;
  payload: unknown;
  pendingMoves: PendingMove[];
  setStateFromServer: (state: ClientGameStatePayload) => void;
  queueMove: (move: EngineMove) => string;
  getMovesToSend: () => PendingMove[];
  ackMove: (requestId: string) => void;
  resetPendingMoves: () => void;
}

export const useGameStore = create<GameState>()(
  immer((set, get) => ({
    gameId: undefined,
    version: 0,
    gameType: undefined,
    payload: undefined,
    pendingMoves: [],
    setStateFromServer: (state: ClientGameStatePayload) =>
      set((draft) => {
        draft.gameId = state.gameId;
        draft.version = state.version;
        draft.gameType = state.gameType;
        draft.payload = state.payload;
      }),
    queueMove: (move: EngineMove) => {
      const requestId = generateRequestId();
      set((draft) => {
        draft.pendingMoves.push({ requestId, move, status: 'queued' });
      });
      return requestId;
    },
    getMovesToSend: () => {
      const moves = get().pendingMoves.filter((entry) => entry.status === 'queued');
      set((draft) => {
        draft.pendingMoves.forEach((entry) => {
          if (entry.status === 'queued') {
            entry.status = 'sent';
          }
        });
      });
      return moves;
    },
    ackMove: (requestId: string) =>
      set((draft) => {
        draft.pendingMoves = draft.pendingMoves.filter((entry) => entry.requestId !== requestId);
      }),
    resetPendingMoves: () =>
      set((draft) => {
        draft.pendingMoves.forEach((entry) => {
          entry.status = 'queued';
        });
      })
  }))
);

export function handleEnvelope(envelope: Envelope) {
  if (envelope.state) {
    const decoded: ClientGameStatePayload = {
      ...envelope.state,
      payload: decodePayload(envelope.state.payload)
    };
    useGameStore.getState().setStateFromServer(decoded);
  }
}
