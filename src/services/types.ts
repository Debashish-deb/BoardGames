import type { GameState } from '@/games/engine/core';
import type { EngineMove } from '@/games/types';

export type PersistenceMedium = 'scylla' | 's3';

export interface GameEventEnvelope {
  id: string;
  gameId: string;
  gameType: string;
  playerId: string;
  moveNumber: number;
  eventType: string;
  createdAt: number;
  payload: Uint8Array;
  checksum: string;
  metadata?: Record<string, unknown>;
}

export interface SnapshotEnvelope<TPayload = Record<string, unknown>> {
  id: string;
  gameId: string;
  version: number;
  state: GameState<TPayload>;
  createdAt: number;
  expiresAt?: number;
  tags?: string[];
}

export interface PersistenceResult {
  medium: PersistenceMedium;
  identifier: string;
  checksum: string;
  durationMs: number;
}

export interface AntiCheatSignal {
  gameId: string;
  playerId: string;
  move: EngineMove & { checksum?: string };
  severity: 'info' | 'warning' | 'critical';
  code: string;
  description: string;
  createdAt: number;
  metadata?: Record<string, unknown>;
}

export interface CloudSaveSnapshot<TPayload = Record<string, unknown>> {
  id: string;
  playerId: string;
  gameType: string;
  payload: GameState<TPayload>;
  createdAt: number;
  updatedAt: number;
  checksum: string;
  sizeBytes: number;
  versionTag: string;
}
