import type { AntiCheatSignal } from '../types';
import { persistGameEvent } from '../persistence/eventLogger';

const DEFAULT_ANTICHEAT_ENDPOINT = process.env.EXPO_PUBLIC_ANTICHEAT_ENDPOINT ?? 'https://api.boardgamelegends.com/anti-cheat/signal';

export async function reportAntiCheatSignal(signal: AntiCheatSignal) {
  await persistGameEvent(
    {
      id: `${signal.gameId}-${signal.move.moveNumber}-${signal.code}`,
      gameId: signal.gameId,
      gameType: (signal.metadata?.gameType as string) ?? 'ludo',
      playerId: signal.playerId,
      moveNumber: signal.move.moveNumber,
      eventType: `ANTICHEAT_${signal.code}`,
      createdAt: signal.createdAt,
      payload: new TextEncoder().encode(JSON.stringify(signal)),
      checksum: signal.move.checksum ?? '',
      metadata: signal.metadata
    },
    DEFAULT_ANTICHEAT_ENDPOINT
  );

  await fetch(DEFAULT_ANTICHEAT_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(signal)
  });
}
