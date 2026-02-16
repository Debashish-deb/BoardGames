// ============================================================================
// ENHANCED LUDO ENGINE - AAA Mobile Game Quality
// Advanced Game Logic, Power-Ups, Combos, and Visual Effects
// ============================================================================

import { DeterministicEngine, type GameState } from '@/games/engine/core';
import type { EngineMove, GameEngine, PlayerState } from '@/games/types';
import {
  COLORS,
  ENTRY_INDEX,
  HOME_PATH_LENGTH,
  type LudoColor,
  MAIN_TRACK_LENGTH,
  SAFE_CELLS,
  TOKENS_PER_PLAYER,
  wrapIndex,
  type PowerUpType,
  POWER_UPS,
  COMBO_TIERS,
  type ParticleEffectType,
  type SoundEffectType,
  PARTICLE_EFFECTS,
  SOUND_EFFECTS,
  ANIMATIONS,
  type AnimationState
} from './constants';
import type {
  LudoEvent,
  LudoEventType,
  LudoPayload,
  MoveValidationResult,
  PlayerTrackState,
  SerializedMove,
  TokenState,
  TokenEffect,
  ActivePowerUp,
  ComboState,
  PlayerMatchStats,
  AnimationQueueItem,
  PendingEffect,
  DiceRoll,
  GlobalEffect,
  CaptureInfo,
  MoveEffect,
  AnimationConfig,
  RainbowPath
} from './types';

// ============================================================================
// MOVE TYPES
// ============================================================================

interface RollMove extends EngineMove<{ dice?: number; powerUp?: PowerUpType }> {
  type: 'ROLL';
}

interface MoveToken extends EngineMove<{ 
  tokenId: string; 
  dice: number;
  powerUp?: PowerUpType;
}> {
  type: 'MOVE_TOKEN';
}

interface PassMove extends EngineMove {
  type: 'PASS';
}

interface PowerUpMove extends EngineMove<{
  powerUpType: PowerUpType;
  targetTokenId?: string;
  targetColor?: LudoColor;
  targetCell?: number;
}> {
  type: 'USE_POWER_UP';
}

export type LudoEngineMove = RollMove | MoveToken | PassMove | PowerUpMove;

type LudoState = GameState<LudoPayload>;

// ============================================================================
// INITIALIZATION HELPERS
// ============================================================================

function createInitialTokens(color: LudoColor): TokenState[] {
  return Array.from({ length: TOKENS_PER_PLAYER }).map((_, index) => ({
    id: `${color}-${index}`,
    stepsTaken: -1,
    isHome: false,
    isCompleted: false,
    animationState: 'IDLE' as AnimationState,
    effects: [],
    combo: 1,
    consecutiveMoves: 0,
    lastMoveTimestamp: 0
  }));
}

function createInitialPowerUps(): ActivePowerUp[] {
  // Start with basic power-ups
  return [
    {
      type: 'DOUBLE_DICE',
      id: 'double-dice-1',
      chargesRemaining: 3,
      cooldownRemaining: 0,
      isActive: false
    },
    {
      type: 'SHIELD',
      id: 'shield-1',
      chargesRemaining: 2,
      cooldownRemaining: 0,
      isActive: false
    }
  ];
}

function createInitialStats(): PlayerMatchStats {
  return {
    captures: 0,
    capturedBy: 0,
    moves: 0,
    powerUpsUsed: 0,
    maxCombo: 1,
    perfectMoves: 0,
    timeSpent: 0
  };
}

function createInitialCombo(): ComboState {
  return {
    multiplier: 1,
    actions: 0,
    lastActionTime: 0,
    timeRemaining: 0,
    bonusPoints: 0
  };
}

function createTrack(players: PlayerState[]): Record<LudoColor, PlayerTrackState> {
  const track: Partial<Record<LudoColor, PlayerTrackState>> = {};
  players.slice(0, COLORS.length).forEach((player, idx) => {
    const color = COLORS[idx];
    track[color] = {
      playerId: player.id,
      color,
      tokens: createInitialTokens(color),
      finishedTokens: 0,
      powerUps: createInitialPowerUps(),
      powerUpCooldowns: new Map(),
      score: 0,
      xp: 0,
      combo: createInitialCombo(),
      statistics: createInitialStats()
    };
  });
  return track as Record<LudoColor, PlayerTrackState>;
}

// ============================================================================
// POSITION & MOVEMENT HELPERS
// ============================================================================

function absolutePosition(color: LudoColor, stepsTaken: number): number | 'home' | 'base' {
  if (stepsTaken < 0) return 'base';
  if (stepsTaken >= MAIN_TRACK_LENGTH + HOME_PATH_LENGTH) return 'home';
  if (stepsTaken >= MAIN_TRACK_LENGTH) return 'home';
  const entry = ENTRY_INDEX[color];
  return wrapIndex(entry + stepsTaken);
}

function canMoveToken(token: TokenState, dice: number, powerUpBoost = 0): boolean {
  if (token.isCompleted) return false;
  
  // Check if frozen
  if (token.effects.some(e => e.type === 'FROZEN')) return false;
  
  const totalMove = dice + powerUpBoost;
  
  if (token.stepsTaken < 0) {
    return dice === 6 || powerUpBoost > 0;
  }
  
  return token.stepsTaken + totalMove <= MAIN_TRACK_LENGTH + HOME_PATH_LENGTH;
}

function advanceToken(token: TokenState, dice: number, powerUpBoost = 0): TokenState {
  const totalMove = dice + powerUpBoost;
  
  let nextSteps: number;
  if (token.stepsTaken < 0) {
    // Token at base
    if (dice === 6 || powerUpBoost > 0) {
      nextSteps = 0;
    } else {
      nextSteps = token.stepsTaken;
    }
  } else {
    nextSteps = token.stepsTaken + totalMove;
  }
  
  const totalSteps = nextSteps;
  const isCompleted = totalSteps >= MAIN_TRACK_LENGTH + HOME_PATH_LENGTH;
  const isHome = totalSteps >= MAIN_TRACK_LENGTH;
  
  return {
    ...token,
    stepsTaken: isCompleted ? MAIN_TRACK_LENGTH + HOME_PATH_LENGTH : totalSteps,
    isHome,
    isCompleted,
    animationState: (isCompleted ? 'CELEBRATING' : 'MOVING') as AnimationState
  };
}

function isSafeCell(position: number | 'base' | 'home', rainbowPath?: RainbowPath): boolean {
  if (typeof position !== 'number') return true;
  
  // Check rainbow path
  if (rainbowPath && rainbowPath.cells.includes(position)) {
    return true;
  }
  
  return SAFE_CELLS.has(position);
}

// ============================================================================
// POWER-UP LOGIC
// ============================================================================

function canUsePowerUp(
  powerUp: ActivePowerUp,
  track: PlayerTrackState,
  payload: LudoPayload
): { allowed: boolean; reason?: string } {
  if (powerUp.cooldownRemaining > 0) {
    return { allowed: false, reason: `Cooldown: ${powerUp.cooldownRemaining} turns` };
  }
  
  if (powerUp.chargesRemaining <= 0) {
    return { allowed: false, reason: 'No charges remaining' };
  }
  
  // Special checks per power-up type
  switch (powerUp.type) {
    case 'TELEPORT':
      // Need at least one token not at base
      if (track.tokens.every(t => t.stepsTaken < 0 || t.isCompleted)) {
        return { allowed: false, reason: 'No tokens to teleport' };
      }
      break;
      
    case 'SWAP':
      // Need opponent tokens on board
      const hasOpponentTokens = Object.values(payload.track).some(
        t => t.color !== track.color && t.tokens.some(token => token.stepsTaken >= 0 && !token.isCompleted)
      );
      if (!hasOpponentTokens) {
        return { allowed: false, reason: 'No opponent tokens to swap with' };
      }
      break;
  }
  
  return { allowed: true };
}

// ============================================================================
// COMBO SYSTEM
// ============================================================================

type ComboAction = 'MOVE' | 'CAPTURE' | 'HOME' | 'COMPLETE' | 'POWER_UP';

function updateCombo(
  combo: ComboState,
  actionType: ComboAction,
  currentTime: number
): ComboState {
  const timeSinceLastAction = currentTime - combo.lastActionTime;
  
  // Check if combo should break
  if (timeSinceLastAction > combo.timeRemaining && combo.actions > 0) {
    // Combo broken
    return {
      multiplier: 1,
      actions: 0,
      lastActionTime: currentTime,
      timeRemaining: 0,
      bonusPoints: 0
    };
  }
  
  // Increment combo
  const newActions = combo.actions + 1;
  
  // Find combo tier
  let newMultiplier = 1;
  let newTimeWindow = 0;
  let newBonusPoints = 0;
  
  for (const tier of COMBO_TIERS) {
    if (newActions >= tier.actions) {
      newMultiplier = tier.multiplier;
      newTimeWindow = tier.timeWindow;
      newBonusPoints = tier.bonusPoints;
    }
  }
  
  return {
    multiplier: newMultiplier,
    actions: newActions,
    lastActionTime: currentTime,
    timeRemaining: newTimeWindow,
    bonusPoints: newBonusPoints
  };
}

function calculateScore(
  actionType: 'MOVE' | 'CAPTURE' | 'HOME' | 'COMPLETE',
  combo: ComboState
): number {
  const baseScores = {
    MOVE: 10,
    CAPTURE: 50,
    HOME: 30,
    COMPLETE: 100
  };
  
  return Math.floor(baseScores[actionType] * combo.multiplier) + combo.bonusPoints;
}

// ============================================================================
// VISUAL EFFECTS GENERATION
// ============================================================================

function createMoveEffects(
  actionType: 'MOVE' | 'CAPTURE' | 'HOME' | 'COMPLETE',
  combo: ComboState
): MoveEffect[] {
  const effects: MoveEffect[] = [];
  
  // Base effect for action type
  const baseEffects: Record<string, { particle: ParticleEffectType; sound: SoundEffectType }> = {
    MOVE: { particle: 'DUST', sound: 'TOKEN_MOVE' },
    CAPTURE: { particle: 'CAPTURE_BLAST', sound: 'TOKEN_CAPTURE' },
    HOME: { particle: 'STARS', sound: 'TOKEN_HOME' },
    COMPLETE: { particle: 'VICTORY_FIREWORKS', sound: 'TOKEN_COMPLETE' }
  };
  
  const base = baseEffects[actionType];
  effects.push({
    type: actionType,
    particleEffect: base.particle,
    soundEffect: base.sound,
    duration: PARTICLE_EFFECTS[base.particle].duration
  });
  
  // Add combo effect if active
  if (combo.multiplier > 1) {
    const comboSound = combo.multiplier === 2 ? 'COMBO_X2' :
                       combo.multiplier === 3 ? 'COMBO_X3' : 'COMBO_X4';
    
    effects.push({
      type: 'COMBO',
      particleEffect: 'STAR_BURST',
      soundEffect: comboSound as SoundEffectType,
      duration: 1200,
      metadata: { multiplier: combo.multiplier }
    });
  }
  
  return effects;
}

// ============================================================================
// MAIN ENGINE CLASS
// ============================================================================

export class EnhancedLudoEngine extends DeterministicEngine implements GameEngine<LudoState> {
  constructor(seed = Date.now()) {
    super(seed);
  }

  getInitialState(players: PlayerState[], seed = Date.now()): LudoState {
    if (seed !== undefined) {
      this.resetSeed(seed);
    }
    
    const activePlayers = players.slice(0, COLORS.length);
    if (activePlayers.length < 2) {
      throw new Error('Ludo requires at least two players');
    }
    
    const payload: LudoPayload = {
      track: createTrack(activePlayers),
      turnOrder: COLORS.slice(0, activePlayers.length),
      currentTurnIndex: 0,
      diceHistory: [],
      pendingDice: undefined,
      events: [],
      activeEffects: [],
      turnNumber: 1,
      matchStartTime: Date.now(),
      matchDuration: 0,
      animationQueue: [],
      pendingEffects: []
    };
    
    const currentColor = payload.turnOrder[0];
    return {
      version: 0,
      payload,
      currentPlayerId: payload.track[currentColor].playerId
    };
  }

  getAvailableMoves(state: LudoState, playerId: string): string[] {
    const { payload } = state;
    const currentColor = payload.turnOrder[payload.currentTurnIndex];
    const track = payload.track[currentColor];
    
    if (!track || track.playerId !== playerId) {
      return [];
    }
    
    const moves: string[] = [];
    
    // Check if can use power-ups
    for (const powerUp of track.powerUps) {
      const { allowed } = canUsePowerUp(powerUp, track, payload);
      if (allowed) {
        moves.push(`USE_POWER_UP:${powerUp.type}`);
      }
    }
    
    // Check if can roll
    if (!payload.pendingDice) {
      moves.push('ROLL');
      return moves;
    }
    
    // Check movable tokens
    const movableTokens = track.tokens.filter(token => canMoveToken(token, payload.pendingDice!));
    
    if (movableTokens.length === 0) {
      moves.push('PASS');
    } else {
      movableTokens.forEach(token => {
        moves.push(`MOVE_TOKEN:${token.id}`);
      });
    }
    
    return moves;
  }

  applyMove(state: LudoState, move: LudoEngineMove): LudoState {
    const { payload } = state;
    const currentColor = payload.turnOrder[payload.currentTurnIndex];
    const track = payload.track[currentColor];
    
    if (!track || track.playerId !== move.playerId) {
      throw new Error('Not your turn');
    }

    // Update match duration
    const updatedPayload = {
      ...payload,
      matchDuration: Date.now() - payload.matchStartTime
    };

    switch (move.type) {
      case 'ROLL':
        return this.handleRoll(state, move, track, updatedPayload);
      
      case 'MOVE_TOKEN':
        return this.handleMoveToken(state, move, track, updatedPayload);
      
      case 'PASS':
        return this.handlePass(state, move, track, updatedPayload);
      
      case 'USE_POWER_UP':
        return this.handlePowerUp(state, move, track, updatedPayload);
      
      default:
        return state;
    }
  }

  // ============================================================================
  // ROLL HANDLER
  // ============================================================================

  private handleRoll(
    state: LudoState,
    move: RollMove,
    track: PlayerTrackState,
    payload: LudoPayload
  ): LudoState {
    const currentTime = Date.now();
    
    // Check for power-ups affecting dice
    const hasLuckyStar = move.data?.powerUp === 'LUCKY_STAR';
    const hasBoost = move.data?.powerUp === 'BOOST';
    
    let dice: number;
    let actualDice: number | undefined;
    
    if (hasLuckyStar) {
      dice = 6;
      actualDice = undefined;
    } else {
      actualDice = move.data?.dice ?? this.rollDice();
      dice = actualDice;
      
      if (hasBoost) {
        dice = Math.min(dice + 3, 6);
      }
    }
    
    const diceRoll: DiceRoll = {
      value: dice,
      timestamp: currentTime,
      playerId: move.playerId,
      wasLuckyRoll: hasLuckyStar,
      wasBoostRoll: hasBoost,
      actualValue: actualDice
    };
    
    const nextPayload: LudoPayload = {
      ...payload,
      pendingDice: dice,
      diceHistory: [...payload.diceHistory, diceRoll],
      events: this.appendEvent(
        payload.events,
        this.createEvent('ROLL', move, {
          dice,
          wasLucky: hasLuckyStar,
          wasBoosted: hasBoost,
          originalValue: actualDice
        })
      )
    };
    
    return this.nextState(state, nextPayload, { currentPlayerId: track.playerId });
  }

  // ============================================================================
  // MOVE TOKEN HANDLER
  // ============================================================================

  private handleMoveToken(
    state: LudoState,
    move: MoveToken,
    track: PlayerTrackState,
    payload: LudoPayload
  ): LudoState {
    if (payload.pendingDice === undefined) {
      throw new Error('Must roll before moving');
    }
    
    const dice = move.data.dice;
    if (dice !== payload.pendingDice) {
      throw new Error('Dice mismatch');
    }
    
    const token = track.tokens.find(t => t.id === move.data.tokenId);
    if (!token) {
      throw new Error('Token not found');
    }
    
    const validation = this.validateMove(token, dice);
    if (!validation.allowed) {
      throw new Error(validation.reason ?? 'Illegal move');
    }
    
    const currentTime = Date.now();
    const fromPos = absolutePosition(track.color, token.stepsTaken);
    const updatedToken = advanceToken(token, dice);
    const toPos = absolutePosition(track.color, updatedToken.stepsTaken);
    
    // Determine action type
    let actionType: 'MOVE' | 'HOME' | 'COMPLETE' = 'MOVE';
    if (updatedToken.isCompleted && !token.isCompleted) {
      actionType = 'COMPLETE';
    } else if (updatedToken.isHome && !token.isHome) {
      actionType = 'HOME';
    }
    
    // Update combo
    const isComboAction = actionType === 'HOME' || actionType === 'COMPLETE';
    let newCombo = track.combo;
    if (isComboAction) {
      newCombo = updateCombo(track.combo, actionType, currentTime);
    }
    
    // Calculate score
    const scoreGained = calculateScore(actionType, newCombo);
    const xpGained = Math.floor(scoreGained * 0.5);
    
    // Handle captures
    const { capture, trackUpdates } = this.handleCaptures(
      payload,
      track.color,
      toPos,
      updatedToken.id,
      newCombo
    );
    
    if (capture) {
      newCombo = updateCombo(newCombo, 'CAPTURE', currentTime);
    }
    
    // Create visual effects
    const effects = createMoveEffects(
      capture ? 'CAPTURE' : actionType,
      newCombo
    );
    
    // Update track
    const updatedTrack: PlayerTrackState = {
      ...track,
      tokens: track.tokens.map(t => (t.id === token.id ? updatedToken : t)),
      finishedTokens: updatedToken.isCompleted ? track.finishedTokens + 1 : track.finishedTokens,
      score: track.score + scoreGained,
      xp: track.xp + xpGained,
      combo: newCombo,
      statistics: {
        ...track.statistics,
        moves: track.statistics.moves + 1,
        captures: capture ? track.statistics.captures + 1 : track.statistics.captures,
        maxCombo: Math.max(track.statistics.maxCombo, newCombo.multiplier),
        perfectMoves: (capture || actionType === 'HOME' || actionType === 'COMPLETE')
          ? track.statistics.perfectMoves + 1
          : track.statistics.perfectMoves
      }
    };
    
    // Determine next turn
    const shouldGrantExtraTurn = this.shouldGrantExtraTurn(dice, updatedToken, capture);
    const nextTurnIndex = shouldGrantExtraTurn
      ? payload.currentTurnIndex
      : (payload.currentTurnIndex + 1) % payload.turnOrder.length;
    const nextColor = payload.turnOrder[nextTurnIndex];
    
    // Create serialized move
    const serializedMove: SerializedMove = {
      tokenId: updatedToken.id,
      color: track.color,
      from: fromPos,
      to: toPos,
      dice,
      capture,
      scoreGained,
      xpGained,
      effects
    };
    
    // Create events
    const moveEvent = this.createEvent('MOVE', move, serializedMove);
    const captureEvent = capture
      ? this.createEvent('CAPTURE', move, {
          capturer: track.playerId,
          victim: capture.victimColor,
          position: typeof toPos === 'number' ? toPos : -1,
          bonusPoints: capture.bonusPoints,
          comboMultiplier: newCombo.multiplier
        })
      : null;
    
    const events = captureEvent
      ? [moveEvent, captureEvent]
      : [moveEvent];
    
    const nextPayload: LudoPayload = {
      ...payload,
      track: {
        ...payload.track,
        ...trackUpdates,
        [track.color]: updatedTrack
      },
      currentTurnIndex: nextTurnIndex,
      pendingDice: undefined,
      lastMove: serializedMove,
      events: this.appendEvent(payload.events, ...events),
      turnNumber: shouldGrantExtraTurn ? payload.turnNumber : payload.turnNumber + 1
    };
    
    return this.nextState(state, nextPayload, {
      currentPlayerId: payload.track[nextColor].playerId
    });
  }

  // ============================================================================
  // PASS HANDLER
  // ============================================================================

  private handlePass(
    state: LudoState,
    move: PassMove,
    track: PlayerTrackState,
    payload: LudoPayload
  ): LudoState {
    if (payload.pendingDice === undefined) {
      throw new Error('Cannot pass without pending dice');
    }
    
    const hasMovable = track.tokens.some(token => canMoveToken(token, payload.pendingDice!));
    if (hasMovable) {
      throw new Error('Passing not allowed when a move exists');
    }
    
    const nextTurnIndex = (payload.currentTurnIndex + 1) % payload.turnOrder.length;
    const nextColor = payload.turnOrder[nextTurnIndex];
    
    const nextPayload: LudoPayload = {
      ...payload,
      currentTurnIndex: nextTurnIndex,
      pendingDice: undefined,
      lastMove: undefined,
      events: this.appendEvent(
        payload.events,
        this.createEvent('PASS', move, { reason: 'NO_MOVES_AVAILABLE' })
      ),
      turnNumber: payload.turnNumber + 1
    };
    
    return this.nextState(state, nextPayload, {
      currentPlayerId: payload.track[nextColor].playerId
    });
  }

  // ============================================================================
  // POWER-UP HANDLER
  // ============================================================================

  private handlePowerUp(
    state: LudoState,
    move: PowerUpMove,
    track: PlayerTrackState,
    payload: LudoPayload
  ): LudoState {
    const powerUpType = move.data.powerUpType;
    const powerUp = track.powerUps.find(p => p.type === powerUpType);
    
    if (!powerUp) {
      throw new Error('Power-up not found');
    }
    
    const { allowed, reason } = canUsePowerUp(powerUp, track, payload);
    if (!allowed) {
      throw new Error(reason);
    }
    
    // Apply power-up effect based on type
    let updatedPayload = payload;
    let updatedTrack = track;
    
    switch (powerUpType) {
      case 'SHIELD':
        updatedTrack = this.applyShield(track, move.data.targetTokenId!);
        break;
      
      case 'TELEPORT':
        updatedPayload = this.applyTeleport(payload, track, move.data.targetTokenId!, move.data.targetCell!);
        break;
      
      case 'EARTHQUAKE':
        updatedPayload = this.applyEarthquake(payload, track.color);
        break;
      
      // Add more power-up handlers...
    }
    
    // Consume power-up charge
    const updatedPowerUps = track.powerUps.map(p =>
      p.type === powerUpType
        ? {
            ...p,
            chargesRemaining: p.chargesRemaining - 1,
            cooldownRemaining: POWER_UPS[powerUpType].cooldown
          }
        : p
    );
    
    updatedTrack = {
      ...updatedTrack,
      powerUps: updatedPowerUps,
      statistics: {
        ...updatedTrack.statistics,
        powerUpsUsed: updatedTrack.statistics.powerUpsUsed + 1
      }
    };
    
    const nextPayload: LudoPayload = {
      ...updatedPayload,
      track: {
        ...updatedPayload.track,
        [track.color]: updatedTrack
      },
      events: this.appendEvent(
        updatedPayload.events,
        this.createEvent('POWER_UP_ACTIVATED', move, {
          powerUpType,
          targetTokenId: move.data.targetTokenId,
          targetColor: move.data.targetColor,
          effects: []
        })
      )
    };
    
    return this.nextState(state, nextPayload, { currentPlayerId: track.playerId });
  }

  // ============================================================================
  // POWER-UP SPECIFIC HANDLERS
  // ============================================================================

  private applyShield(track: PlayerTrackState, tokenId: string): PlayerTrackState {
    const updatedTokens = track.tokens.map(token => {
      if (token.id === tokenId) {
        const shieldEffect: TokenEffect = {
          type: 'SHIELD',
          duration: 3,
          startTime: Date.now(),
          endTime: Date.now() + 180000, // 3 turns * 60 sec
          visualEffect: 'SHIELD_BUBBLE'
        };
        return {
          ...token,
          effects: [...token.effects, shieldEffect],
          animationState: 'SHIELDED' as AnimationState
        };
      }
      return token;
    });
    
    return {
      ...track,
      tokens: updatedTokens
    };
  }

  private applyTeleport(
    payload: LudoPayload,
    track: PlayerTrackState,
    tokenId: string,
    targetCell: number
  ): LudoPayload {
    // Implementation for teleport
    return payload;
  }

  private applyEarthquake(payload: LudoPayload, originColor: LudoColor): LudoPayload {
    // Send all opponent tokens on unsafe cells back to base
    const updatedTrack = { ...payload.track };
    
    Object.entries(payload.track).forEach(([color, track]) => {
      if (color !== originColor) {
        const updatedTokens = track.tokens.map(token => {
          if (token.stepsTaken >= 0 && !token.isCompleted) {
            const pos = absolutePosition(color as LudoColor, token.stepsTaken);
            if (!isSafeCell(pos)) {
              return {
                ...token,
                stepsTaken: -1,
                isHome: false,
                animationState: 'CAPTURED' as AnimationState
              };
            }
          }
          return token;
        });
        
        updatedTrack[color as LudoColor] = {
          ...track,
          tokens: updatedTokens
        };
      }
    });
    
    return {
      ...payload,
      track: updatedTrack
    };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private validateMove(token: TokenState, dice: number): MoveValidationResult {
    if (!canMoveToken(token, dice)) {
      if (token.stepsTaken < 0 && dice !== 6) {
        return { allowed: false, reason: 'Need a six to leave base' };
      }
      if (token.effects.some(e => e.type === 'FROZEN')) {
        return { allowed: false, reason: 'Token is frozen' };
      }
      return { allowed: false, reason: 'Move exceeds track range' };
    }
    return { allowed: true };
  }

  private handleCaptures(
    payload: LudoPayload,
    color: LudoColor,
    destination: number | 'home' | 'base',
    movingTokenId: string,
    combo: ComboState
  ) {
    if (typeof destination !== 'number' || isSafeCell(destination, payload.rainbowPath)) {
      return { capture: undefined, trackUpdates: {} } as const;
    }

    for (const [otherColor, track] of Object.entries(payload.track) as [LudoColor, PlayerTrackState][]) {
      if (otherColor === color) continue;
      
      for (const token of track.tokens) {
        if (token.stepsTaken < 0 || token.isCompleted) continue;
        
        // Check for shield
        if (token.effects.some(e => e.type === 'SHIELD')) continue;
        
        const pos = absolutePosition(otherColor, token.stepsTaken);
        if (pos === destination) {
          const resetToken: TokenState = {
            ...token,
            stepsTaken: -1,
            isHome: false,
            animationState: 'CAPTURED'
          };
          
          const victimTrack: PlayerTrackState = {
            ...track,
            tokens: track.tokens.map(t => (t.id === token.id ? resetToken : t)),
            statistics: {
              ...track.statistics,
              capturedBy: track.statistics.capturedBy + 1
            }
          };
          
          const bonusPoints = 50 * combo.multiplier;
          
          const capture: CaptureInfo = {
            victimTokenId: token.id,
            victimColor: otherColor,
            bonusPoints,
            comboMultiplier: combo.multiplier
          };
          
          return {
            capture,
            trackUpdates: {
              [otherColor]: victimTrack
            }
          } as const;
        }
      }
    }
    
    return { capture: undefined, trackUpdates: {} } as const;
  }

  private shouldGrantExtraTurn(
    dice: number,
    token: TokenState,
    capture?: CaptureInfo
  ): boolean {
    if (dice === 6) return true;
    if (capture) return true;
    if (token.isCompleted) return true;
    return false;
  }

  private createEvent(
    type: LudoEventType,
    move: EngineMove,
    payload: any
  ): LudoEvent {
    // Determine visual effects based on event type
    const visualEffects: any[] = [];
    const soundEffects: SoundEffectType[] = [];
    
    if (type === 'CAPTURE') {
      visualEffects.push({
        type: 'CAPTURE_BLAST',
        position: { x: 0, y: 0 },
        duration: 800,
        delay: 0
      });
      soundEffects.push('TOKEN_CAPTURE');
    }
    
    return {
      id: `${type}-${move.moveNumber}-${Date.now()}`,
      type,
      timestamp: move.timestamp ?? Date.now(),
      playerId: move.playerId,
      moveNumber: move.moveNumber,
      payload,
      checksum: this.computeChecksum({ type, payload, moveNumber: move.moveNumber }, move.moveNumber),
      visualEffects,
      soundEffects,
      isReplayable: true
    };
  }

  private appendEvent(events: LudoEvent[], ...newEvents: LudoEvent[]): LudoEvent[] {
    if (!newEvents.length) return events;
    return [...events, ...newEvents];
  }

  isTerminal(state: LudoState): boolean {
    return Object.values(state.payload.track).some(
      track => track.finishedTokens >= TOKENS_PER_PLAYER
    );
  }
  
  getWinner(state: LudoState): string | null {
    const winner = Object.values(state.payload.track).find(
      track => track.finishedTokens >= TOKENS_PER_PLAYER
    );
    return winner?.playerId ?? null;
  }
  
  getScore(state: LudoState, playerId: string): number {
    const track = Object.values(state.payload.track).find(t => t.playerId === playerId);
    return track?.score ?? 0;
  }
}