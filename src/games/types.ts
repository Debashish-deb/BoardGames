export type SupportedGame = 'ludo' | 'carrom' | 'chess';

export interface PlayerState {
  id: string;
  displayName: string;
  rating: number;
  isLocal: boolean;
  metadata?: Record<string, unknown>;
}

export interface SerializedGameState<TPayload = unknown> {
  gameId: string;
  version: number;
  currentTurn: string;
  activePlayers: PlayerState[];
  payload: TPayload;
}

export interface EngineMove<TData = Record<string, unknown>> {
  playerId: string;
  moveNumber: number;
  type: string;
  data: TData;
  timestamp: number;
}

export interface GameEngine<TState = SerializedGameState> {
  getInitialState(players: PlayerState[], seed?: number): TState;
  applyMove(state: TState, move: EngineMove): TState;
  getAvailableMoves(state: TState, playerId: string): string[];
  isTerminal(state: TState): boolean;
}
