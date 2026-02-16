// ============================================================================
// ENHANCED LUDO - COMPREHENSIVE TYPE DEFINITIONS
// AAA Mobile Game Quality Types
// ============================================================================

import type {
  LudoColor,
  PowerUpType,
  ParticleEffectType,
  SoundEffectType,
  AnimationState
} from './constants';

// ============================================================================
// CORE GAME STATE
// ============================================================================

export interface TokenState {
  id: string;
  stepsTaken: number;
  isHome: boolean;
  isCompleted: boolean;
  
  // Enhanced properties
  animationState: AnimationState;
  effects: TokenEffect[];
  shield?: ShieldEffect;
  frozen?: FrozenEffect;
  combo: number;              // Current combo multiplier
  consecutiveMoves: number;   // For combo tracking
  lastMoveTimestamp: number;
}

export interface TokenEffect {
  type: 'SHIELD' | 'FROZEN' | 'BOOST' | 'MAGNET_PULL' | 'RAINBOW_SAFE';
  duration: number;           // Remaining turns/ms
  startTime: number;
  endTime: number;
  visualEffect: ParticleEffectType;
  metadata?: Record<string, any>;
}

export interface ShieldEffect extends TokenEffect {
  type: 'SHIELD';
  turnsRemaining: number;
  strength: number;           // 1 = normal shield, 2 = double shield
}

export interface FrozenEffect extends TokenEffect {
  type: 'FROZEN';
  turnsRemaining: number;
}

export interface PlayerTrackState {
  playerId: string;
  color: LudoColor;
  tokens: TokenState[];
  finishedTokens: number;
  
  // Enhanced properties
  powerUps: ActivePowerUp[];
  powerUpCooldowns: Map<PowerUpType, number>;
  score: number;              // Match score
  xp: number;                 // XP earned this match
  combo: ComboState;
  statistics: PlayerMatchStats;
}

export interface ActivePowerUp {
  type: PowerUpType;
  id: string;
  chargesRemaining: number;
  cooldownRemaining: number;
  isActive: boolean;
  activatedAt?: number;
}

export interface ComboState {
  multiplier: number;
  actions: number;            // Consecutive successful actions
  lastActionTime: number;
  timeRemaining: number;      // Window to maintain combo
  bonusPoints: number;
}

export interface PlayerMatchStats {
  captures: number;
  capturedBy: number;
  moves: number;
  powerUpsUsed: number;
  maxCombo: number;
  perfectMoves: number;       // Moves that captured or reached home
  timeSpent: number;          // milliseconds
}

export interface LudoPayload {
  track: Record<LudoColor, PlayerTrackState>;
  turnOrder: LudoColor[];
  currentTurnIndex: number;
  
  // Core game state
  pendingDice?: number;
  diceHistory: DiceRoll[];
  lastMove?: SerializedMove;
  events: LudoEvent[];
  
  // Enhanced state
  activeEffects: GlobalEffect[];
  rainbowPath?: RainbowPath;
  turnNumber: number;
  matchStartTime: number;
  matchDuration: number;       // milliseconds elapsed
  
  // Visual queue
  animationQueue: AnimationQueueItem[];
  pendingEffects: PendingEffect[];
}

export interface DiceRoll {
  value: number;
  timestamp: number;
  playerId: string;
  wasLuckyRoll: boolean;      // From LUCKY_STAR power-up
  wasBoostRoll: boolean;      // From BOOST power-up
  actualValue?: number;       // Original value if boosted
}

export interface GlobalEffect {
  type: 'EARTHQUAKE' | 'TIME_WARP' | 'RAINBOW_PATH';
  playerId: string;
  startTime: number;
  endTime: number;
  affectedTokens: string[];
  visualEffect: ParticleEffectType;
}

export interface RainbowPath {
  cells: number[];            // Safe cells created by power-up
  startTime: number;
  endTime: number;
  createdBy: string;
}

// ============================================================================
// MOVE TYPES & VALIDATION
// ============================================================================

export interface SerializedMove {
  tokenId: string;
  color: LudoColor;
  from: number | 'base' | 'home';
  to: number | 'base' | 'home';
  dice: number;
  
  // Enhanced move data
  powerUpUsed?: PowerUpType;
  capture?: CaptureInfo;
  combo?: ComboInfo;
  scoreGained: number;
  xpGained: number;
  effects: MoveEffect[];
}

export interface CaptureInfo {
  victimTokenId: string;
  victimColor: LudoColor;
  bonusPoints: number;
  comboMultiplier: number;
}

export interface ComboInfo {
  multiplier: number;
  actions: number;
  bonusPoints: number;
  tier: number;               // 1, 2, 3, 4
}

export interface MoveEffect {
  type: 'MOVE' | 'CAPTURE' | 'HOME_ENTRY' | 'HOME' | 'COMPLETION' | 'COMPLETE' | 'POWER_UP' | 'COMBO';
  particleEffect: ParticleEffectType;
  soundEffect: SoundEffectType;
  duration: number;
  metadata?: Record<string, any>;
}

export interface MoveValidationResult {
  allowed: boolean;
  reason?: string;
  warnings?: string[];
  suggestions?: string[];
}

// ============================================================================
// ANIMATION & VISUAL EFFECTS
// ============================================================================

export interface AnimationQueueItem {
  id: string;
  type: 'TOKEN_MOVE' | 'CAPTURE' | 'POWER_UP' | 'EFFECT';
  tokenId?: string;
  duration: number;
  delay: number;              // ms to wait before starting
  animation: AnimationConfig;
  particleEffect?: ParticleEffectType;
  soundEffect?: SoundEffectType;
  onComplete?: () => void;
}

export interface AnimationConfig {
  state: AnimationState;
  duration: number;
  easing: EasingFunction;
  keyframes: Keyframe[];
  loop: boolean;
}

export type EasingFunction = 
  | 'linear'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut'
  | 'bounce'
  | 'elastic'
  | 'spring';

export interface Keyframe {
  time: number;               // 0-1 (percentage of animation)
  scale: number;
  rotation: number;           // degrees
  opacity: number;
  position: { x: number; y: number };
  color?: string;
}

export interface PendingEffect {
  id: string;
  type: ParticleEffectType;
  position: { x: number; y: number };
  startTime: number;
  duration: number;
  config: ParticleEffectConfig;
}

export interface ParticleEffectConfig {
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

// ============================================================================
// EVENT SYSTEM
// ============================================================================

export type LudoEventType = 
  | 'ROLL'
  | 'MOVE'
  | 'CAPTURE'
  | 'PASS'
  | 'POWER_UP_ACTIVATED'
  | 'POWER_UP_EXPIRED'
  | 'SHIELD_BLOCKED'
  | 'TOKEN_HOME'
  | 'TOKEN_COMPLETE'
  | 'COMBO_ACHIEVED'
  | 'COMBO_BROKEN'
  | 'ACHIEVEMENT_UNLOCKED'
  | 'LEVEL_UP';

export interface LudoEvent {
  id: string;
  type: LudoEventType;
  timestamp: number;
  playerId: string;
  moveNumber: number;
  
  payload: 
    | RollEventPayload
    | MoveEventPayload
    | CaptureEventPayload
    | PowerUpEventPayload
    | ComboEventPayload
    | AchievementEventPayload
    | GenericEventPayload;
  
  checksum: string;
  
  // Visual feedback
  visualEffects: VisualEffect[];
  soundEffects: SoundEffectType[];
  
  // For replay system
  isReplayable: boolean;
  replayData?: any;
}

export interface RollEventPayload {
  dice: number;
  wasLucky: boolean;
  wasBoosted: boolean;
  originalValue?: number;
}

export interface MoveEventPayload extends SerializedMove {}

export interface CaptureEventPayload {
  capturer: string;
  victim: string;
  position: number;
  bonusPoints: number;
  comboMultiplier: number;
}

export interface PowerUpEventPayload {
  powerUpType: PowerUpType;
  targetTokenId?: string;
  targetColor?: LudoColor;
  effects: string[];
}

export interface ComboEventPayload {
  multiplier: number;
  actions: number;
  tier: number;
  bonusPoints: number;
  broken: boolean;
}

export interface AchievementEventPayload {
  achievementId: string;
  name: string;
  rarity: string;
  rewards: {
    xp: number;
    coins: number;
  };
}

export interface GenericEventPayload {
  [key: string]: any;
}

export interface VisualEffect {
  type: ParticleEffectType;
  position: { x: number; y: number };
  duration: number;
  delay: number;
}

// ============================================================================
// PLAYER PROGRESSION & REWARDS
// ============================================================================

export interface PlayerProfile {
  userId: string;
  username: string;
  level: number;
  xp: number;
  coins: number;
  
  // Statistics
  stats: PlayerStats;
  
  // Unlocks
  unlockedPowerUps: PowerUpType[];
  unlockedSkins: string[];
  unlockedBoards: string[];
  
  // Achievements
  achievements: UnlockedAchievement[];
  
  // Progression
  dailyQuests: DailyQuest[];
  seasonPass: SeasonPass;
}

export interface PlayerStats {
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  winRate: number;
  
  totalCaptures: number;
  totalCaptured: number;
  perfectGames: number;
  
  powerUpsUsed: Record<PowerUpType, number>;
  maxCombo: number;
  totalXP: number;
  
  avgGameDuration: number;
  longestWinStreak: number;
  currentWinStreak: number;
}

export interface UnlockedAchievement {
  id: string;
  unlockedAt: number;
  progress: number;
  completed: boolean;
}

export interface DailyQuest {
  id: string;
  name: string;
  description: string;
  type: 'WINS' | 'CAPTURES' | 'POWER_UPS' | 'GAMES';
  requirement: number;
  progress: number;
  rewards: {
    xp: number;
    coins: number;
  };
  expiresAt: number;
}

export interface SeasonPass {
  season: number;
  tier: number;
  xp: number;
  rewards: SeasonReward[];
  isPremium: boolean;
}

export interface SeasonReward {
  tier: number;
  free?: {
    coins?: number;
    xp?: number;
    powerUps?: PowerUpType[];
  };
  premium?: {
    coins?: number;
    xp?: number;
    powerUps?: PowerUpType[];
    skins?: string[];
    emotes?: string[];
  };
  unlocked: boolean;
}

// ============================================================================
// MATCHMAKING & MULTIPLAYER
// ============================================================================

export interface MatchmakingRequest {
  playerId: string;
  gameMode: 'QUICK' | 'RANKED' | 'TOURNAMENT' | 'FRIENDS';
  rating: number;
  region: string;
  preferences: MatchPreferences;
}

export interface MatchPreferences {
  allowPowerUps: boolean;
  boardTheme: string;
  maxWaitTime: number;        // seconds
}

export interface MatchResult {
  matchId: string;
  players: MatchPlayerResult[];
  duration: number;
  winner: string;
  matchData: {
    totalMoves: number;
    totalCaptures: number;
    powerUpsUsed: number;
    maxCombo: number;
  };
}

export interface MatchPlayerResult {
  playerId: string;
  placement: number;          // 1st, 2nd, 3rd, 4th
  score: number;
  xpGained: number;
  coinsGained: number;
  stats: PlayerMatchStats;
  ratingChange: number;
}

// ============================================================================
// UI STATE & INTERACTION
// ============================================================================

export interface UIState {
  selectedToken?: string;
  hoveredToken?: string;
  hoveredCell?: number;
  
  showingPowerUpMenu: boolean;
  selectedPowerUp?: PowerUpType;
  
  activeModal?: ModalType;
  activeToast?: ToastMessage;
  
  animating: boolean;
  interactionLocked: boolean;
}

export type ModalType =
  | 'POWER_UP_SELECT'
  | 'ACHIEVEMENT'
  | 'LEVEL_UP'
  | 'MATCH_RESULT'
  | 'SETTINGS'
  | 'SHOP'
  | 'QUIT_CONFIRM';

export interface ToastMessage {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'combo';
  message: string;
  duration: number;
  icon?: string;
  position: 'top' | 'center' | 'bottom';
}

// ============================================================================
// CAMERA & VIEWPORT
// ============================================================================

export interface CameraState {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  zoom: number;
  rotation: number;
  
  // Animation
  isAnimating: boolean;
  animationProgress: number;
  targetPosition?: { x: number; y: number; z: number };
}

export interface ViewportConfig {
  width: number;
  height: number;
  aspectRatio: number;
  devicePixelRatio: number;
  isMobile: boolean;
  isTablet: boolean;
  orientation: 'portrait' | 'landscape';
}

// ============================================================================
// GAME SETTINGS & CONFIG
// ============================================================================

export interface GameSettings {
  audio: AudioSettings;
  graphics: GraphicsSettings;
  gameplay: GameplaySettings;
  accessibility: AccessibilitySettings;
}

export interface AudioSettings {
  masterVolume: number;       // 0-1
  musicVolume: number;
  sfxVolume: number;
  voiceVolume: number;
  muted: boolean;
}

export interface GraphicsSettings {
  quality: 'low' | 'medium' | 'high' | 'ultra';
  particleQuality: 'low' | 'medium' | 'high';
  shadowQuality: 'off' | 'low' | 'high';
  antialiasing: boolean;
  bloom: boolean;
  motionBlur: boolean;
  vSync: boolean;
  frameRateCap: 30 | 60 | 120 | 'unlimited';
}

export interface GameplaySettings {
  autoRoll: boolean;
  quickMove: boolean;         // Auto-select token if only one can move
  showHints: boolean;
  confirmPowerUps: boolean;
  animationSpeed: number;     // 0.5 - 2.0
  cameraFollowToken: boolean;
}

export interface AccessibilitySettings {
  colorBlindMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
  highContrast: boolean;
  reducedMotion: boolean;
  screenReader: boolean;
  textSize: 'small' | 'medium' | 'large' | 'xlarge';
  hapticFeedback: boolean;
}

// ============================================================================
// ANALYTICS & TELEMETRY
// ============================================================================

export interface AnalyticsEvent {
  eventType: string;
  timestamp: number;
  playerId: string;
  sessionId: string;
  data: Record<string, any>;
}

export interface PerformanceMetrics {
  fps: number;
  drawCalls: number;
  triangles: number;
  memoryUsage: number;        // MB
  loadTime: number;           // ms
  latency: number;            // ms (for online play)
}

// ============================================================================
// REPLAY SYSTEM
// ============================================================================

export interface ReplayData {
  replayId: string;
  matchId: string;
  version: string;
  
  players: ReplayPlayerInfo[];
  initialState: any;
  moves: ReplayMove[];
  
  duration: number;
  createdAt: number;
  
  metadata: {
    gameMode: string;
    winner: string;
    highlights: ReplayHighlight[];
  };
}

export interface ReplayPlayerInfo {
  playerId: string;
  username: string;
  color: LudoColor;
  level: number;
}

export interface ReplayMove {
  moveNumber: number;
  timestamp: number;
  playerId: string;
  action: any;
  stateAfter: any;           // Compressed state snapshot
}

export interface ReplayHighlight {
  timestamp: number;
  type: 'CAPTURE' | 'COMBO' | 'POWER_UP' | 'VICTORY';
  description: string;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isTokenEffect(effect: any): effect is TokenEffect {
  return effect && typeof effect === 'object' && 'type' in effect && 'duration' in effect;
}

export function isShieldEffect(effect: TokenEffect): effect is ShieldEffect {
  return effect.type === 'SHIELD';
}

export function isFrozenEffect(effect: TokenEffect): effect is FrozenEffect {
  return effect.type === 'FROZEN';
}

export function isCaptureEvent(event: LudoEvent): event is LudoEvent & { payload: CaptureEventPayload } {
  return event.type === 'CAPTURE';
}

export function isPowerUpEvent(event: LudoEvent): event is LudoEvent & { payload: PowerUpEventPayload } {
  return event.type === 'POWER_UP_ACTIVATED' || event.type === 'POWER_UP_EXPIRED';
}