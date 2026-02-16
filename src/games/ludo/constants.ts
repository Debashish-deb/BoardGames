// ============================================================================
// ENHANCED LUDO - AAA Mobile Game Quality
// Inspired by Clash of Clans & Angry Birds Polish
// ============================================================================

export const COLORS = ['red', 'blue', 'green', 'yellow'] as const;
export type LudoColor = (typeof COLORS)[number];

// ============================================================================
// CORE GAME CONSTANTS
// ============================================================================

export const TOKENS_PER_PLAYER = 4;
export const MAIN_TRACK_LENGTH = 52;
export const HOME_PATH_LENGTH = 6;

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

// ============================================================================
// POWER-UP SYSTEM (Clash of Clans Style)
// ============================================================================

export type PowerUpType = 
  | 'DOUBLE_DICE'      // Roll 2 dice, choose one
  | 'SHIELD'           // Token can't be captured for 3 turns
  | 'TELEPORT'         // Jump to any safe cell
  | 'SWAP'             // Swap positions with opponent token
  | 'REVERSE'          // Send opponent back 6 steps
  | 'MAGNET'           // Pull all your tokens forward 2 steps
  | 'BOOST'            // Add +3 to your next roll
  | 'FREEZE'           // Freeze opponent for 1 turn
  | 'LUCKY_STAR'       // Auto-roll 6 (one time use)
  | 'EARTHQUAKE'       // Send all opponent tokens on unsafe cells back
  | 'RAINBOW_PATH'     // Create temporary safe path (5 cells)
  | 'TIME_WARP';       // Take 2 consecutive turns

export interface PowerUp {
  type: PowerUpType;
  id: string;
  name: string;
  description: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  cooldown: number;          // Turns before can use again
  duration?: number;         // For temporary effects
  charges?: number;          // How many uses
  icon: string;              // Icon identifier
  glowColor: string;         // Visual effect color
  particleEffect: ParticleEffectType;
  soundEffect: SoundEffectType;
  unlockLevel: number;       // Player level required
  cost: number;              // In-game currency to use
}

export const POWER_UPS: Record<PowerUpType, Omit<PowerUp, 'id'>> = {
  DOUBLE_DICE: {
    type: 'DOUBLE_DICE',
    name: 'Double Chance',
    description: 'Roll two dice and choose the best one',
    rarity: 'common',
    cooldown: 3,
    icon: 'dice-double',
    glowColor: '#4CAF50',
    particleEffect: 'SPARKLE',
    soundEffect: 'POWER_UP_ACTIVATE',
    unlockLevel: 1,
    cost: 50
  },
  SHIELD: {
    type: 'SHIELD',
    name: 'Guardian Shield',
    description: 'Protect your token from capture for 3 turns',
    rarity: 'rare',
    cooldown: 5,
    duration: 3,
    icon: 'shield',
    glowColor: '#2196F3',
    particleEffect: 'SHIELD_BUBBLE',
    soundEffect: 'SHIELD_ACTIVATE',
    unlockLevel: 3,
    cost: 100
  },
  TELEPORT: {
    type: 'TELEPORT',
    name: 'Quantum Jump',
    description: 'Teleport to any safe cell on the board',
    rarity: 'epic',
    cooldown: 8,
    icon: 'teleport',
    glowColor: '#9C27B0',
    particleEffect: 'TELEPORT_VORTEX',
    soundEffect: 'TELEPORT',
    unlockLevel: 5,
    cost: 200
  },
  SWAP: {
    type: 'SWAP',
    name: 'Position Swap',
    description: 'Switch places with an opponent token',
    rarity: 'rare',
    cooldown: 6,
    icon: 'swap',
    glowColor: '#FF9800',
    particleEffect: 'SWAP_SPIRAL',
    soundEffect: 'SWAP',
    unlockLevel: 4,
    cost: 150
  },
  REVERSE: {
    type: 'REVERSE',
    name: 'Reverse Curse',
    description: 'Send an opponent token back 6 steps',
    rarity: 'rare',
    cooldown: 5,
    icon: 'reverse',
    glowColor: '#F44336',
    particleEffect: 'CURSE_WAVE',
    soundEffect: 'REVERSE',
    unlockLevel: 4,
    cost: 120
  },
  MAGNET: {
    type: 'MAGNET',
    name: 'Magnetic Pull',
    description: 'Pull all your tokens forward 2 steps',
    rarity: 'epic',
    cooldown: 7,
    icon: 'magnet',
    glowColor: '#E91E63',
    particleEffect: 'MAGNETIC_FIELD',
    soundEffect: 'MAGNET',
    unlockLevel: 6,
    cost: 180
  },
  BOOST: {
    type: 'BOOST',
    name: 'Turbo Boost',
    description: 'Add +3 to your next dice roll',
    rarity: 'common',
    cooldown: 4,
    charges: 1,
    icon: 'boost',
    glowColor: '#FFC107',
    particleEffect: 'SPEED_LINES',
    soundEffect: 'BOOST',
    unlockLevel: 2,
    cost: 80
  },
  FREEZE: {
    type: 'FREEZE',
    name: 'Ice Prison',
    description: 'Freeze opponent for their next turn',
    rarity: 'rare',
    cooldown: 6,
    duration: 1,
    icon: 'freeze',
    glowColor: '#00BCD4',
    particleEffect: 'ICE_CRYSTALS',
    soundEffect: 'FREEZE',
    unlockLevel: 5,
    cost: 140
  },
  LUCKY_STAR: {
    type: 'LUCKY_STAR',
    name: 'Lucky Star',
    description: 'Guaranteed roll of 6 (one time)',
    rarity: 'legendary',
    cooldown: 10,
    charges: 1,
    icon: 'star',
    glowColor: '#FFD700',
    particleEffect: 'STAR_BURST',
    soundEffect: 'LUCKY_STAR',
    unlockLevel: 8,
    cost: 300
  },
  EARTHQUAKE: {
    type: 'EARTHQUAKE',
    name: 'Earthquake',
    description: 'Send all opponent tokens on unsafe cells back to base',
    rarity: 'legendary',
    cooldown: 12,
    icon: 'earthquake',
    glowColor: '#795548',
    particleEffect: 'GROUND_SHAKE',
    soundEffect: 'EARTHQUAKE',
    unlockLevel: 10,
    cost: 400
  },
  RAINBOW_PATH: {
    type: 'RAINBOW_PATH',
    name: 'Rainbow Bridge',
    description: 'Create a temporary safe path (5 cells)',
    rarity: 'epic',
    cooldown: 8,
    duration: 5,
    icon: 'rainbow',
    glowColor: 'linear-gradient(90deg, #FF0000, #00FF00, #0000FF)',
    particleEffect: 'RAINBOW_TRAIL',
    soundEffect: 'RAINBOW_PATH',
    unlockLevel: 7,
    cost: 220
  },
  TIME_WARP: {
    type: 'TIME_WARP',
    name: 'Time Warp',
    description: 'Take 2 consecutive turns',
    rarity: 'legendary',
    cooldown: 15,
    icon: 'time-warp',
    glowColor: '#673AB7',
    particleEffect: 'TIME_DISTORTION',
    soundEffect: 'TIME_WARP',
    unlockLevel: 12,
    cost: 500
  }
};

// ============================================================================
// VISUAL EFFECTS & ANIMATIONS
// ============================================================================

export type ParticleEffectType =
  | 'SPARKLE'
  | 'EXPLOSION'
  | 'SMOKE'
  | 'FIRE'
  | 'ELECTRIC'
  | 'CONFETTI'
  | 'DUST'
  | 'STARS'
  | 'HEARTS'
  | 'SHIELD_BUBBLE'
  | 'TELEPORT_VORTEX'
  | 'SWAP_SPIRAL'
  | 'CURSE_WAVE'
  | 'MAGNETIC_FIELD'
  | 'SPEED_LINES'
  | 'ICE_CRYSTALS'
  | 'STAR_BURST'
  | 'GROUND_SHAKE'
  | 'RAINBOW_TRAIL'
  | 'TIME_DISTORTION'
  | 'CAPTURE_BLAST'
  | 'VICTORY_FIREWORKS';

export interface ParticleEffect {
  type: ParticleEffectType;
  duration: number;        // milliseconds
  particleCount: number;
  gravity: number;
  spread: number;
  colors: string[];
  size: { min: number; max: number };
  velocity: { min: number; max: number };
  opacity: { start: number; end: number };
  scale: { start: number; end: number };
  rotation: boolean;
  blend: 'normal' | 'additive' | 'multiply';
}

export const PARTICLE_EFFECTS: Record<ParticleEffectType, ParticleEffect> = {
  SPARKLE: {
    type: 'SPARKLE',
    duration: 800,
    particleCount: 20,
    gravity: 0.5,
    spread: 360,
    colors: ['#FFD700', '#FFA500', '#FFFFFF'],
    size: { min: 2, max: 6 },
    velocity: { min: 2, max: 5 },
    opacity: { start: 1, end: 0 },
    scale: { start: 1, end: 0 },
    rotation: true,
    blend: 'additive'
  },
  EXPLOSION: {
    type: 'EXPLOSION',
    duration: 600,
    particleCount: 50,
    gravity: 1,
    spread: 360,
    colors: ['#FF4500', '#FF6347', '#FFD700'],
    size: { min: 3, max: 8 },
    velocity: { min: 5, max: 10 },
    opacity: { start: 1, end: 0 },
    scale: { start: 1, end: 0.5 },
    rotation: true,
    blend: 'additive'
  },
  CONFETTI: {
    type: 'CONFETTI',
    duration: 2000,
    particleCount: 100,
    gravity: 2,
    spread: 120,
    colors: ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF'],
    size: { min: 4, max: 10 },
    velocity: { min: 5, max: 15 },
    opacity: { start: 1, end: 1 },
    scale: { start: 1, end: 1 },
    rotation: true,
    blend: 'normal'
  },
  SHIELD_BUBBLE: {
    type: 'SHIELD_BUBBLE',
    duration: 1200,
    particleCount: 30,
    gravity: 0,
    spread: 360,
    colors: ['#2196F3', '#64B5F6', '#BBDEFB'],
    size: { min: 4, max: 12 },
    velocity: { min: 1, max: 3 },
    opacity: { start: 0.8, end: 0 },
    scale: { start: 0.5, end: 1.5 },
    rotation: false,
    blend: 'additive'
  },
  TELEPORT_VORTEX: {
    type: 'TELEPORT_VORTEX',
    duration: 1000,
    particleCount: 60,
    gravity: 0,
    spread: 360,
    colors: ['#9C27B0', '#BA68C8', '#E1BEE7'],
    size: { min: 2, max: 8 },
    velocity: { min: 3, max: 8 },
    opacity: { start: 1, end: 0 },
    scale: { start: 1, end: 0.2 },
    rotation: true,
    blend: 'additive'
  },
  CAPTURE_BLAST: {
    type: 'CAPTURE_BLAST',
    duration: 800,
    particleCount: 40,
    gravity: 0.8,
    spread: 360,
    colors: ['#F44336', '#FF5722', '#FFC107'],
    size: { min: 4, max: 10 },
    velocity: { min: 6, max: 12 },
    opacity: { start: 1, end: 0 },
    scale: { start: 1, end: 0.3 },
    rotation: true,
    blend: 'additive'
  },
  VICTORY_FIREWORKS: {
    type: 'VICTORY_FIREWORKS',
    duration: 3000,
    particleCount: 200,
    gravity: 1.5,
    spread: 60,
    colors: ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'],
    size: { min: 6, max: 14 },
    velocity: { min: 8, max: 18 },
    opacity: { start: 1, end: 0 },
    scale: { start: 1, end: 0.5 },
    rotation: true,
    blend: 'additive'
  },
  SMOKE: {
    type: 'SMOKE',
    duration: 1500,
    particleCount: 15,
    gravity: -0.5,
    spread: 45,
    colors: ['#666666', '#999999', '#CCCCCC'],
    size: { min: 10, max: 20 },
    velocity: { min: 1, max: 3 },
    opacity: { start: 0.6, end: 0 },
    scale: { start: 0.5, end: 2 },
    rotation: true,
    blend: 'normal'
  },
  FIRE: {
    type: 'FIRE',
    duration: 800,
    particleCount: 25,
    gravity: -0.8,
    spread: 30,
    colors: ['#FF4500', '#FF6347', '#FFD700'],
    size: { min: 6, max: 12 },
    velocity: { min: 2, max: 5 },
    opacity: { start: 1, end: 0 },
    scale: { start: 1, end: 0.3 },
    rotation: false,
    blend: 'additive'
  },
  ELECTRIC: {
    type: 'ELECTRIC',
    duration: 500,
    particleCount: 30,
    gravity: 0,
    spread: 360,
    colors: ['#00FFFF', '#0099FF', '#FFFFFF'],
    size: { min: 2, max: 6 },
    velocity: { min: 4, max: 10 },
    opacity: { start: 1, end: 0 },
    scale: { start: 1, end: 0 },
    rotation: false,
    blend: 'additive'
  },
  DUST: {
    type: 'DUST',
    duration: 1000,
    particleCount: 20,
    gravity: 0.3,
    spread: 180,
    colors: ['#D2B48C', '#BC8F8F', '#F4A460'],
    size: { min: 3, max: 8 },
    velocity: { min: 1, max: 4 },
    opacity: { start: 0.8, end: 0 },
    scale: { start: 1, end: 1.5 },
    rotation: true,
    blend: 'normal'
  },
  STARS: {
    type: 'STARS',
    duration: 1200,
    particleCount: 15,
    gravity: 0.5,
    spread: 360,
    colors: ['#FFD700', '#FFA500', '#FFFF00'],
    size: { min: 6, max: 12 },
    velocity: { min: 3, max: 6 },
    opacity: { start: 1, end: 0 },
    scale: { start: 0.5, end: 1.2 },
    rotation: true,
    blend: 'additive'
  },
  HEARTS: {
    type: 'HEARTS',
    duration: 1500,
    particleCount: 10,
    gravity: -0.3,
    spread: 45,
    colors: ['#FF1493', '#FF69B4', '#FFB6C1'],
    size: { min: 8, max: 14 },
    velocity: { min: 1, max: 3 },
    opacity: { start: 1, end: 0 },
    scale: { start: 0.8, end: 1.2 },
    rotation: true,
    blend: 'normal'
  },
  SWAP_SPIRAL: {
    type: 'SWAP_SPIRAL',
    duration: 1000,
    particleCount: 40,
    gravity: 0,
    spread: 360,
    colors: ['#FF9800', '#FFB74D', '#FFE082'],
    size: { min: 3, max: 7 },
    velocity: { min: 4, max: 8 },
    opacity: { start: 1, end: 0 },
    scale: { start: 1, end: 0.5 },
    rotation: true,
    blend: 'additive'
  },
  CURSE_WAVE: {
    type: 'CURSE_WAVE',
    duration: 800,
    particleCount: 35,
    gravity: 0.2,
    spread: 120,
    colors: ['#F44336', '#E91E63', '#9C27B0'],
    size: { min: 5, max: 10 },
    velocity: { min: 5, max: 10 },
    opacity: { start: 1, end: 0 },
    scale: { start: 1, end: 0.4 },
    rotation: true,
    blend: 'additive'
  },
  MAGNETIC_FIELD: {
    type: 'MAGNETIC_FIELD',
    duration: 1200,
    particleCount: 50,
    gravity: 0,
    spread: 360,
    colors: ['#E91E63', '#F48FB1', '#F8BBD0'],
    size: { min: 2, max: 6 },
    velocity: { min: 2, max: 6 },
    opacity: { start: 1, end: 0 },
    scale: { start: 1, end: 0.3 },
    rotation: false,
    blend: 'additive'
  },
  SPEED_LINES: {
    type: 'SPEED_LINES',
    duration: 600,
    particleCount: 20,
    gravity: 0,
    spread: 15,
    colors: ['#FFC107', '#FFEB3B', '#FFFFFF'],
    size: { min: 4, max: 12 },
    velocity: { min: 10, max: 20 },
    opacity: { start: 1, end: 0 },
    scale: { start: 1, end: 0.2 },
    rotation: false,
    blend: 'additive'
  },
  ICE_CRYSTALS: {
    type: 'ICE_CRYSTALS',
    duration: 1000,
    particleCount: 30,
    gravity: 0.5,
    spread: 360,
    colors: ['#00BCD4', '#4DD0E1', '#B2EBF2'],
    size: { min: 4, max: 10 },
    velocity: { min: 2, max: 5 },
    opacity: { start: 1, end: 0 },
    scale: { start: 0.5, end: 1.5 },
    rotation: true,
    blend: 'additive'
  },
  STAR_BURST: {
    type: 'STAR_BURST',
    duration: 1500,
    particleCount: 60,
    gravity: 0.3,
    spread: 360,
    colors: ['#FFD700', '#FFA500', '#FFFF00'],
    size: { min: 6, max: 14 },
    velocity: { min: 5, max: 12 },
    opacity: { start: 1, end: 0 },
    scale: { start: 1, end: 0.3 },
    rotation: true,
    blend: 'additive'
  },
  GROUND_SHAKE: {
    type: 'GROUND_SHAKE',
    duration: 1200,
    particleCount: 80,
    gravity: 1,
    spread: 180,
    colors: ['#795548', '#8D6E63', '#A1887F'],
    size: { min: 5, max: 12 },
    velocity: { min: 3, max: 8 },
    opacity: { start: 1, end: 0 },
    scale: { start: 1, end: 0.5 },
    rotation: true,
    blend: 'normal'
  },
  RAINBOW_TRAIL: {
    type: 'RAINBOW_TRAIL',
    duration: 2000,
    particleCount: 40,
    gravity: 0,
    spread: 30,
    colors: ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#9400D3'],
    size: { min: 4, max: 10 },
    velocity: { min: 2, max: 5 },
    opacity: { start: 1, end: 0 },
    scale: { start: 1, end: 0.5 },
    rotation: false,
    blend: 'additive'
  },
  TIME_DISTORTION: {
    type: 'TIME_DISTORTION',
    duration: 1500,
    particleCount: 70,
    gravity: 0,
    spread: 360,
    colors: ['#673AB7', '#9575CD', '#D1C4E9'],
    size: { min: 3, max: 9 },
    velocity: { min: 4, max: 9 },
    opacity: { start: 1, end: 0 },
    scale: { start: 1, end: 0.2 },
    rotation: true,
    blend: 'additive'
  }
};

// ============================================================================
// SOUND EFFECTS
// ============================================================================

export type SoundEffectType =
  | 'DICE_ROLL'
  | 'TOKEN_MOVE'
  | 'TOKEN_CAPTURE'
  | 'TOKEN_HOME'
  | 'TOKEN_COMPLETE'
  | 'POWER_UP_ACTIVATE'
  | 'SHIELD_ACTIVATE'
  | 'TELEPORT'
  | 'SWAP'
  | 'REVERSE'
  | 'MAGNET'
  | 'BOOST'
  | 'FREEZE'
  | 'LUCKY_STAR'
  | 'EARTHQUAKE'
  | 'RAINBOW_PATH'
  | 'TIME_WARP'
  | 'VICTORY'
  | 'COMBO_X2'
  | 'COMBO_X3'
  | 'COMBO_X4'
  | 'UI_CLICK'
  | 'UI_HOVER'
  | 'UI_ERROR'
  | 'TURN_START'
  | 'TURN_END';

export interface SoundEffect {
  type: SoundEffectType;
  path: string;
  volume: number;        // 0-1
  pitch: number;         // 0.5-2 (1 = normal)
  loop: boolean;
  priority: 'low' | 'medium' | 'high';
}

export const SOUND_EFFECTS: Record<SoundEffectType, Omit<SoundEffect, 'type'>> = {
  DICE_ROLL: { path: '/sounds/dice_roll.mp3', volume: 0.6, pitch: 1, loop: false, priority: 'high' },
  TOKEN_MOVE: { path: '/sounds/token_move.mp3', volume: 0.4, pitch: 1, loop: false, priority: 'medium' },
  TOKEN_CAPTURE: { path: '/sounds/capture.mp3', volume: 0.8, pitch: 1, loop: false, priority: 'high' },
  TOKEN_HOME: { path: '/sounds/home_entry.mp3', volume: 0.7, pitch: 1, loop: false, priority: 'high' },
  TOKEN_COMPLETE: { path: '/sounds/token_complete.mp3', volume: 0.8, pitch: 1, loop: false, priority: 'high' },
  POWER_UP_ACTIVATE: { path: '/sounds/powerup.mp3', volume: 0.7, pitch: 1, loop: false, priority: 'high' },
  SHIELD_ACTIVATE: { path: '/sounds/shield.mp3', volume: 0.6, pitch: 1, loop: false, priority: 'medium' },
  TELEPORT: { path: '/sounds/teleport.mp3', volume: 0.7, pitch: 1, loop: false, priority: 'high' },
  SWAP: { path: '/sounds/swap.mp3', volume: 0.6, pitch: 1, loop: false, priority: 'medium' },
  REVERSE: { path: '/sounds/reverse.mp3', volume: 0.7, pitch: 1, loop: false, priority: 'medium' },
  MAGNET: { path: '/sounds/magnet.mp3', volume: 0.6, pitch: 1, loop: false, priority: 'medium' },
  BOOST: { path: '/sounds/boost.mp3', volume: 0.6, pitch: 1.2, loop: false, priority: 'medium' },
  FREEZE: { path: '/sounds/freeze.mp3', volume: 0.7, pitch: 1, loop: false, priority: 'medium' },
  LUCKY_STAR: { path: '/sounds/lucky_star.mp3', volume: 0.8, pitch: 1, loop: false, priority: 'high' },
  EARTHQUAKE: { path: '/sounds/earthquake.mp3', volume: 0.9, pitch: 1, loop: false, priority: 'high' },
  RAINBOW_PATH: { path: '/sounds/rainbow.mp3', volume: 0.6, pitch: 1, loop: false, priority: 'medium' },
  TIME_WARP: { path: '/sounds/timewarp.mp3', volume: 0.7, pitch: 1, loop: false, priority: 'high' },
  VICTORY: { path: '/sounds/victory.mp3', volume: 1.0, pitch: 1, loop: false, priority: 'high' },
  COMBO_X2: { path: '/sounds/combo_x2.mp3', volume: 0.7, pitch: 1.1, loop: false, priority: 'high' },
  COMBO_X3: { path: '/sounds/combo_x3.mp3', volume: 0.8, pitch: 1.2, loop: false, priority: 'high' },
  COMBO_X4: { path: '/sounds/combo_x4.mp3', volume: 0.9, pitch: 1.3, loop: false, priority: 'high' },
  UI_CLICK: { path: '/sounds/ui_click.mp3', volume: 0.3, pitch: 1, loop: false, priority: 'low' },
  UI_HOVER: { path: '/sounds/ui_hover.mp3', volume: 0.2, pitch: 1, loop: false, priority: 'low' },
  UI_ERROR: { path: '/sounds/ui_error.mp3', volume: 0.5, pitch: 1, loop: false, priority: 'medium' },
  TURN_START: { path: '/sounds/turn_start.mp3', volume: 0.5, pitch: 1, loop: false, priority: 'medium' },
  TURN_END: { path: '/sounds/turn_end.mp3', volume: 0.4, pitch: 1, loop: false, priority: 'low' }
};

// ============================================================================
// ANIMATION STATES (Angry Birds Style)
// ============================================================================

export type AnimationState =
  | 'IDLE'
  | 'SELECTED'
  | 'MOVING'
  | 'CAPTURED'
  | 'ENTERING_HOME'
  | 'CELEBRATING'
  | 'FROZEN'
  | 'SHIELDED'
  | 'BOOSTED'
  | 'TELEPORTING_OUT'
  | 'TELEPORTING_IN'
  | 'SWAPPING'
  | 'REVERSING';

export interface AnimationConfig {
  state: AnimationState;
  duration: number;        // milliseconds
  easing: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'bounce' | 'elastic';
  scale: { from: number; to: number };
  rotation: { from: number; to: number };
  opacity: { from: number; to: number };
  position?: { x: number; y: number };
  loop: boolean;
  nextState?: AnimationState;
}

export const ANIMATIONS: Record<AnimationState, AnimationConfig> = {
  IDLE: {
    state: 'IDLE',
    duration: 2000,
    easing: 'easeInOut',
    scale: { from: 1, to: 1.05 },
    rotation: { from: 0, to: 0 },
    opacity: { from: 1, to: 1 },
    loop: true
  },
  SELECTED: {
    state: 'SELECTED',
    duration: 400,
    easing: 'bounce',
    scale: { from: 1, to: 1.2 },
    rotation: { from: 0, to: 5 },
    opacity: { from: 1, to: 1 },
    loop: false
  },
  MOVING: {
    state: 'MOVING',
    duration: 300,
    easing: 'easeOut',
    scale: { from: 1, to: 0.9 },
    rotation: { from: 0, to: 360 },
    opacity: { from: 1, to: 1 },
    loop: false,
    nextState: 'IDLE'
  },
  CAPTURED: {
    state: 'CAPTURED',
    duration: 600,
    easing: 'easeIn',
    scale: { from: 1, to: 0 },
    rotation: { from: 0, to: 720 },
    opacity: { from: 1, to: 0 },
    loop: false
  },
  ENTERING_HOME: {
    state: 'ENTERING_HOME',
    duration: 800,
    easing: 'easeInOut',
    scale: { from: 1, to: 0.7 },
    rotation: { from: 0, to: 180 },
    opacity: { from: 1, to: 0.8 },
    loop: false,
    nextState: 'CELEBRATING'
  },
  CELEBRATING: {
    state: 'CELEBRATING',
    duration: 1000,
    easing: 'bounce',
    scale: { from: 0.8, to: 1.1 },
    rotation: { from: -10, to: 10 },
    opacity: { from: 1, to: 1 },
    loop: true
  },
  FROZEN: {
    state: 'FROZEN',
    duration: 500,
    easing: 'easeOut',
    scale: { from: 1, to: 1 },
    rotation: { from: 0, to: 0 },
    opacity: { from: 1, to: 0.6 },
    loop: false
  },
  SHIELDED: {
    state: 'SHIELDED',
    duration: 1200,
    easing: 'easeInOut',
    scale: { from: 1, to: 1.15 },
    rotation: { from: 0, to: 0 },
    opacity: { from: 1, to: 1 },
    loop: true
  },
  BOOSTED: {
    state: 'BOOSTED',
    duration: 800,
    easing: 'elastic',
    scale: { from: 1, to: 1.3 },
    rotation: { from: 0, to: 360 },
    opacity: { from: 1, to: 1 },
    loop: false,
    nextState: 'MOVING'
  },
  TELEPORTING_OUT: {
    state: 'TELEPORTING_OUT',
    duration: 500,
    easing: 'easeIn',
    scale: { from: 1, to: 0.2 },
    rotation: { from: 0, to: 1080 },
    opacity: { from: 1, to: 0 },
    loop: false,
    nextState: 'TELEPORTING_IN'
  },
  TELEPORTING_IN: {
    state: 'TELEPORTING_IN',
    duration: 500,
    easing: 'easeOut',
    scale: { from: 0.2, to: 1 },
    rotation: { from: 0, to: 360 },
    opacity: { from: 0, to: 1 },
    loop: false,
    nextState: 'IDLE'
  },
  SWAPPING: {
    state: 'SWAPPING',
    duration: 800,
    easing: 'easeInOut',
    scale: { from: 1, to: 0.8 },
    rotation: { from: 0, to: 720 },
    opacity: { from: 1, to: 0.7 },
    loop: false,
    nextState: 'IDLE'
  },
  REVERSING: {
    state: 'REVERSING',
    duration: 600,
    easing: 'easeOut',
    scale: { from: 1, to: 0.9 },
    rotation: { from: 0, to: -360 },
    opacity: { from: 1, to: 1 },
    loop: false,
    nextState: 'IDLE'
  }
};

// ============================================================================
// COMBO SYSTEM
// ============================================================================

export interface Combo {
  multiplier: number;
  actions: number;       // Consecutive successful actions
  timeWindow: number;    // ms to maintain combo
  bonusPoints: number;
  particleEffect: ParticleEffectType;
  soundEffect: SoundEffectType;
}

export const COMBO_TIERS: Combo[] = [
  {
    multiplier: 2,
    actions: 3,
    timeWindow: 15000,
    bonusPoints: 100,
    particleEffect: 'SPARKLE',
    soundEffect: 'COMBO_X2'
  },
  {
    multiplier: 3,
    actions: 5,
    timeWindow: 20000,
    bonusPoints: 300,
    particleEffect: 'STARS',
    soundEffect: 'COMBO_X3'
  },
  {
    multiplier: 4,
    actions: 8,
    timeWindow: 25000,
    bonusPoints: 600,
    particleEffect: 'STAR_BURST',
    soundEffect: 'COMBO_X4'
  }
];

// ============================================================================
// PLAYER PROGRESSION
// ============================================================================

export interface PlayerLevel {
  level: number;
  xpRequired: number;
  rewards: {
    coins: number;
    powerUps: PowerUpType[];
    unlockedFeatures: string[];
  };
  title: string;
}

export const LEVEL_PROGRESSION: PlayerLevel[] = [
  { level: 1, xpRequired: 0, rewards: { coins: 0, powerUps: ['DOUBLE_DICE'], unlockedFeatures: ['basic_game'] }, title: 'Novice' },
  { level: 2, xpRequired: 100, rewards: { coins: 50, powerUps: ['BOOST'], unlockedFeatures: [] }, title: 'Apprentice' },
  { level: 3, xpRequired: 250, rewards: { coins: 100, powerUps: ['SHIELD'], unlockedFeatures: ['daily_quests'] }, title: 'Skilled' },
  { level: 4, xpRequired: 500, rewards: { coins: 150, powerUps: ['SWAP', 'REVERSE'], unlockedFeatures: [] }, title: 'Expert' },
  { level: 5, xpRequired: 1000, rewards: { coins: 200, powerUps: ['TELEPORT', 'FREEZE'], unlockedFeatures: ['tournaments'] }, title: 'Master' },
  { level: 6, xpRequired: 1800, rewards: { coins: 300, powerUps: ['MAGNET'], unlockedFeatures: [] }, title: 'Champion' },
  { level: 7, xpRequired: 3000, rewards: { coins: 400, powerUps: ['RAINBOW_PATH'], unlockedFeatures: ['clan_wars'] }, title: 'Legend' },
  { level: 8, xpRequired: 5000, rewards: { coins: 500, powerUps: ['LUCKY_STAR'], unlockedFeatures: [] }, title: 'Mythic' },
  { level: 10, xpRequired: 8000, rewards: { coins: 750, powerUps: ['EARTHQUAKE'], unlockedFeatures: ['ranked_mode'] }, title: 'Titan' },
  { level: 12, xpRequired: 12000, rewards: { coins: 1000, powerUps: ['TIME_WARP'], unlockedFeatures: ['ultimate_skins'] }, title: 'Godlike' }
];

// ============================================================================
// ACHIEVEMENTS
// ============================================================================

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  requirement: {
    type: 'captures' | 'wins' | 'perfect_games' | 'power_ups_used' | 'combo' | 'streak';
    value: number;
  };
  rewards: {
    xp: number;
    coins: number;
    powerUp?: PowerUpType;
  };
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_capture',
    name: 'First Blood',
    description: 'Capture your first opponent token',
    icon: 'trophy',
    rarity: 'common',
    requirement: { type: 'captures', value: 1 },
    rewards: { xp: 50, coins: 25 }
  },
  {
    id: 'capture_master',
    name: 'Hunter',
    description: 'Capture 100 opponent tokens',
    icon: 'hunter',
    rarity: 'rare',
    requirement: { type: 'captures', value: 100 },
    rewards: { xp: 500, coins: 250, powerUp: 'REVERSE' }
  },
  {
    id: 'perfect_victory',
    name: 'Flawless Victory',
    description: 'Win without losing any tokens',
    icon: 'perfect',
    rarity: 'epic',
    requirement: { type: 'perfect_games', value: 1 },
    rewards: { xp: 1000, coins: 500, powerUp: 'SHIELD' }
  },
  {
    id: 'combo_master',
    name: 'Combo King',
    description: 'Achieve a 4x combo',
    icon: 'combo',
    rarity: 'legendary',
    requirement: { type: 'combo', value: 4 },
    rewards: { xp: 2000, coins: 1000, powerUp: 'TIME_WARP' }
  }
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function wrapIndex(value: number): number {
  return ((value % MAIN_TRACK_LENGTH) + MAIN_TRACK_LENGTH) % MAIN_TRACK_LENGTH;
}

export function calculateXPForLevel(level: number): number {
  // Exponential XP curve
  return Math.floor(100 * Math.pow(1.5, level - 1));
}

export function getLevelFromXP(xp: number): number {
  for (let i = LEVEL_PROGRESSION.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_PROGRESSION[i].xpRequired) {
      return LEVEL_PROGRESSION[i].level;
    }
  }
  return 1;
}

export function getPowerUpById(type: PowerUpType): PowerUp {
  return {
    ...POWER_UPS[type],
    id: `${type}-${Date.now()}`
  };
}