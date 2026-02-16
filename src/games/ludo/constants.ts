export const COLORS = ['red', 'blue', 'green', 'yellow'] as const;
export type LudoColor = (typeof COLORS)[number];

export const TOKENS_PER_PLAYER = 4;
export const MAIN_TRACK_LENGTH = 52;
export const HOME_PATH_LENGTH = 6; // indices 0..5 once player enters home stretch

export const ENTRY_INDEX: Record<LudoColor, number> = {
  red: 0,
  blue: 13,
  green: 26,
  yellow: 39
};

export const SAFE_CELLS = new Set<number>([0, 8, 13, 21, 26, 34, 39, 47]);

export const COLOR_ORDER: Record<LudoColor, number> = {
  red: 0,
  blue: 1,
  green: 2,
  yellow: 3
};

export function wrapIndex(value: number): number {
  return ((value % MAIN_TRACK_LENGTH) + MAIN_TRACK_LENGTH) % MAIN_TRACK_LENGTH;
}
