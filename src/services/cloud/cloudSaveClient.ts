import type { CloudSaveSnapshot, SnapshotEnvelope } from '../types';
import { persistSnapshot } from '../persistence/eventLogger';
import { encodePayload, decodePayload } from '@/network/types';

const DEFAULT_CLOUD_SAVE_ENDPOINT = process.env.EXPO_PUBLIC_CLOUD_SAVE_ENDPOINT ?? 'https://api.boardgamelegends.com/cloud-save';

export async function uploadCloudSave<TPayload>(snapshot: CloudSaveSnapshot<TPayload>) {
  const snapshotEnvelope: SnapshotEnvelope<TPayload> = {
    id: snapshot.id,
    gameId: `${snapshot.gameType}-${snapshot.playerId}`,
    version: snapshot.payload.version,
    state: snapshot.payload,
    createdAt: snapshot.createdAt,
    tags: ['cloud-save', snapshot.playerId, snapshot.gameType]
  };

  const persistResult = await persistSnapshot(snapshotEnvelope);
  const response = await fetch(DEFAULT_CLOUD_SAVE_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...snapshot,
      payload: {
        ...snapshot.payload,
        payload: encodePayload(snapshot.payload.payload)
      },
      storage: persistResult
    })
  });

  if (!response.ok) {
    throw new Error('Failed to upload cloud save');
  }

  return response.json();
}

export async function fetchCloudSave<TPayload>(playerId: string, gameType: string, endpoint = DEFAULT_CLOUD_SAVE_ENDPOINT) {
  const response = await fetch(`${endpoint}/${playerId}/${gameType}`);
  if (!response.ok) {
    throw new Error('Failed to fetch cloud save');
  }
  const data = await response.json();
  return {
    ...data,
    payload: {
      ...data.payload,
      payload: decodePayload<TPayload>(data.payload.payload)
    }
  } as CloudSaveSnapshot<TPayload>;
}

export async function deleteCloudSave(playerId: string, gameType: string, endpoint = DEFAULT_CLOUD_SAVE_ENDPOINT) {
  const response = await fetch(`${endpoint}/${playerId}/${gameType}`, { method: 'DELETE' });
  if (!response.ok) {
    throw new Error('Failed to delete cloud save');
  }
}
