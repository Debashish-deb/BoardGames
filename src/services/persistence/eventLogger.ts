import { encode as base64Encode } from 'base64-arraybuffer';
import type { GameEventEnvelope, SnapshotEnvelope, PersistenceResult, PersistenceMedium } from '../types';

const DEFAULT_SCYLLA_ENDPOINT = process.env.EXPO_PUBLIC_SCYLLA_ENDPOINT ?? 'https://api.boardgamelegends.com/scylla/events';
const DEFAULT_S3_ENDPOINT = process.env.EXPO_PUBLIC_S3_ENDPOINT ?? 'https://api.boardgamelegends.com/storage/snapshots';
const MAX_RETRIES = 3;

export async function persistGameEvent(envelope: GameEventEnvelope, endpoint = DEFAULT_SCYLLA_ENDPOINT): Promise<PersistenceResult> {
  return persistWithRetry(envelope, endpoint, 'scylla');
}

export async function persistSnapshot<T>(snapshot: SnapshotEnvelope<T>, endpoint = DEFAULT_S3_ENDPOINT): Promise<PersistenceResult> {
  const encodedPayload = new TextEncoder().encode(JSON.stringify(snapshot.state.payload));
  const payloadBuffer = encodedPayload.buffer.slice(encodedPayload.byteOffset, encodedPayload.byteOffset + encodedPayload.byteLength);
  const payload = {
    ...snapshot,
    state: {
      ...snapshot.state,
      payload: base64Encode(payloadBuffer)
    }
  };
  return persistWithRetry(payload, endpoint, 's3');
}

async function persistWithRetry(body: unknown, endpoint: string, medium: PersistenceMedium, attempt = 1): Promise<PersistenceResult> {
  try {
    const start = Date.now();
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`Persistence failed (${response.status})`);
    }

    const { identifier, checksum } = await response.json();
    return {
      medium,
      identifier,
      checksum,
      durationMs: Date.now() - start
    };
  } catch (error) {
    if (attempt >= MAX_RETRIES) {
      throw error;
    }
    await new Promise(resolve => setTimeout(resolve, attempt * 250));
    return persistWithRetry(body, endpoint, medium, attempt + 1);
  }
}
