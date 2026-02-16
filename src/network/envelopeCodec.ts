import { Root, Type } from 'protobufjs';
import schema from './proto/envelope.json';
import type { Envelope, GameType } from './types';

const root = Root.fromJSON(schema as any);
const EnvelopeMessage = root.lookupType('boardgamelegends.Envelope') as Type;

type ProtoGameType = 'LUDO' | 'CARROM' | 'CHESS';

export function encodeEnvelope(envelope: Envelope): Uint8Array {
  const message = EnvelopeMessage.create(normalizeEnvelope(envelope));
  return EnvelopeMessage.encode(message).finish();
}

export function decodeEnvelope(buffer: ArrayBuffer | Uint8Array): Envelope {
  const data = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const decoded = EnvelopeMessage.decode(data);
  const object = EnvelopeMessage.toObject(decoded, {
    longs: Number,
    enums: String,
    defaults: true
  });
  return denormalizeEnvelope(object as Record<string, unknown>);
}

function normalizeEnvelope(envelope: Envelope) {
  return {
    ...envelope,
    player: envelope.player
      ? { player_id: envelope.player.playerId, display_name: envelope.player.displayName }
      : undefined,
    state: envelope.state
      ? {
          game_id: envelope.state.gameId,
          game_type: toProtoGameType(envelope.state.gameType),
          payload: envelope.state.payload,
          version: envelope.state.version
        }
      : undefined,
    move: envelope.move
      ? {
          game_id: envelope.move.gameId,
          game_type: toProtoGameType(envelope.move.gameType),
          player_id: envelope.move.playerId,
          move_type: envelope.move.moveType,
          move_data: envelope.move.moveData,
          move_number: envelope.move.moveNumber
        }
      : undefined
  };
}

function denormalizeEnvelope(object: Record<string, unknown>): Envelope {
  return {
    type: object.type as Envelope['type'],
    player: object.player
      ? {
          playerId: (object.player as any).player_id,
          displayName: (object.player as any).display_name
        }
      : undefined,
    state: object.state
      ? {
          gameId: (object.state as any).game_id,
          gameType: fromProtoGameType((object.state as any).game_type),
          payload: (object.state as any).payload ?? new Uint8Array(),
          version: Number((object.state as any).version ?? 0)
        }
      : undefined,
    move: object.move
      ? {
          gameId: (object.move as any).game_id,
          gameType: fromProtoGameType((object.move as any).game_type),
          playerId: (object.move as any).player_id,
          moveType: (object.move as any).move_type,
          moveData: (object.move as any).move_data ?? new Uint8Array(),
          moveNumber: Number((object.move as any).move_number ?? 0)
        }
      : undefined,
    timestamp: Number(object.timestamp ?? Date.now()),
    requestId: object.request_id as string | undefined,
    ackId: object.ack_id as string | undefined
  };
}

function toProtoGameType(gameType: GameType): ProtoGameType {
  switch (gameType) {
    case 'carrom':
      return 'CARROM';
    case 'chess':
      return 'CHESS';
    default:
      return 'LUDO';
  }
}

function fromProtoGameType(value?: unknown): GameType {
  switch (value) {
    case 'CARROM':
    case 1:
      return 'carrom';
    case 'CHESS':
    case 2:
      return 'chess';
    default:
      return 'ludo';
  }
}
