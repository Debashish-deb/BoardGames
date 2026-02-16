import { io, Socket } from 'socket.io-client';
import type { Envelope, PlayerIdentity } from './types';
import { createHeartbeatEnvelope } from './types';
import { encodeEnvelope, decodeEnvelope } from './envelopeCodec';

export type MessageListener = (message: Envelope) => void;
export type AckListener = (ackId: string) => void;

class GameSocketClient {
  private socket: Socket | null = null;
  private listeners = new Set<MessageListener>();
  private ackListeners = new Set<AckListener>();
  private player?: PlayerIdentity;
  private heartbeatTimer?: ReturnType<typeof setInterval>;
  private heartbeatIntervalMs = 10000;

  connect(url: string, player: PlayerIdentity) {
    if (this.socket) return;
    this.player = player;
    this.socket = io(url, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000
    });
    this.socket.on('connect', () => this.startHeartbeat());
    this.socket.on('disconnect', () => this.stopHeartbeat());
    this.socket.on('message', (payload: ArrayBuffer) => {
      const envelope = decodeEnvelope(payload);
      this.handleIncoming(envelope);
    });
  }

  disconnect() {
    if (!this.socket) return;
    this.stopHeartbeat();
    this.socket.disconnect();
    this.socket = null;
  }

  send(envelope: Envelope) {
    if (!this.socket) throw new Error('Socket not connected');
    const enriched: Envelope = {
      ...envelope,
      timestamp: envelope.timestamp ?? Date.now(),
      player: envelope.player ?? this.player
    };
    const payload = encodeEnvelope(enriched);
    this.socket.emit('message', payload);
  }

  onMessage(listener: MessageListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onAck(listener: AckListener) {
    this.ackListeners.add(listener);
    return () => this.ackListeners.delete(listener);
  }

  private handleIncoming(envelope: Envelope) {
    if (envelope.type === 'ACK' && envelope.ackId) {
      this.ackListeners.forEach((listener) => listener(envelope.ackId!));
      return;
    }

    this.listeners.forEach((listener) => listener(envelope));
    if (envelope.requestId) {
      this.sendAck(envelope.requestId);
    }
  }

  private sendAck(requestId: string) {
    if (!this.player) return;
    this.send({
      type: 'ACK',
      player: this.player,
      ackId: requestId,
      timestamp: Date.now()
    });
  }

  private startHeartbeat() {
    if (this.heartbeatTimer || !this.player) return;
    this.heartbeatTimer = setInterval(() => {
      if (!this.socket || !this.player || !this.socket.connected) return;
      this.send(createHeartbeatEnvelope(this.player));
    }, this.heartbeatIntervalMs);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }
}

export const gameSocket = new GameSocketClient();
