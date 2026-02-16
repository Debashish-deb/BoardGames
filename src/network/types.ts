export type GameType = 'ludo' | 'carrom' | 'chess';

export type MessageType = 'UNKNOWN' | 'JOIN' | 'STATE_UPDATE' | 'MOVE' | 'HEARTBEAT' | 'ACK';

export interface PlayerIdentity {
  playerId: string;
  displayName: string;
}

export interface GameStatePayload {
  gameId: string;
  gameType: GameType;
  payload: Uint8Array;
  version: number;
}

export interface MovePayload {
  gameId: string;
  gameType: GameType;
  playerId: string;
  moveType: string;
  moveData: Uint8Array;
  moveNumber: number;
}

export interface Envelope {
  type: MessageType;
  player?: PlayerIdentity;
  state?: GameStatePayload;
  move?: MovePayload;
  timestamp: number;
  requestId?: string;
  ackId?: string;
}

export type ClientGameStatePayload = Omit<GameStatePayload, 'payload'> & { payload: unknown };

export function createHeartbeatEnvelope(player: PlayerIdentity): Envelope {
  return {
    type: 'HEARTBEAT',
    player,
    timestamp: Date.now()
  };
}

export function isMoveEnvelope(envelope: Envelope): envelope is Envelope & { move: MovePayload } {
  return envelope.type === 'MOVE' && !!envelope.move;
}

export function isStateEnvelope(envelope: Envelope): envelope is Envelope & { state: GameStatePayload } {
  return envelope.type === 'STATE_UPDATE' && !!envelope.state;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function encodePayload(data: unknown): Uint8Array {
  if (data instanceof Uint8Array) return data;
  return encoder.encode(JSON.stringify(data ?? {}));
}

export function decodePayload<T = unknown>(bytes?: Uint8Array | null): T {
  if (!bytes || bytes.length === 0) {
    return {} as T;
  }
  try {
    return JSON.parse(decoder.decode(bytes));
  } catch (err) {
    console.warn('Failed to decode payload', err);
    return {} as T;
  }
}
