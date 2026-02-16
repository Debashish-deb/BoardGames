export type Seed = number;

export interface GameState<TPayload = Record<string, unknown>> {
  version: number;
  payload: TPayload;
  checksum?: string;
  currentPlayerId?: string;
}

export interface Move {
  playerId: string;
  moveNumber: number;
  type: string;
  data: Record<string, unknown>;
  timestamp: number;
}

export class DeterministicEngine {
  private seed: Seed;
  private stage: number;

  constructor(initialSeed: Seed) {
    this.seed = initialSeed;
    this.stage = 0;
  }

  protected rand(max: number): number {
    // Simple linear congruential generator
    const a = 9301;
    const c = 49297;
    const m = 233280;
    this.seed = (this.seed * a + c) % m;
    return Math.floor((this.seed / m) * max);
  }

  public rollDice(sides = 6): number {
    this.stage += 1;
    return this.rand(sides) + 1;
  }

  protected nextState<TPayload>(state: GameState<TPayload>, payload: TPayload, meta?: Partial<Omit<GameState<TPayload>, 'payload' | 'version'>>): GameState<TPayload> {
    return {
      version: state.version + 1,
      payload,
      checksum: this.computeChecksum(payload, state.version + 1),
      ...meta
    };
  }

  protected computeChecksum(payload: unknown, version: number): string {
    const serialized = JSON.stringify({ payload, version, stage: this.stage });
    let hash = 0;
    for (let i = 0; i < serialized.length; i += 1) {
      hash = (hash << 5) - hash + serialized.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16);
  }
}
