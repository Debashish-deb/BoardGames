# Enhanced Ludo - Implementation Guide
## AAA Mobile Game Quality Integration

This guide explains how to integrate all the enhanced features into your game.

---

## 📁 File Structure

```
src/games/ludo/
├── enhanced-constants.ts    # All constants, power-ups, effects
├── enhanced-types.ts         # Type definitions
├── enhanced-engine.ts        # Core game engine
├── visual-effects.ts         # Particle system & animations
├── sound-manager.ts          # Audio system
├── ui-components.tsx         # React components
└── hooks/
    ├── useGameState.ts
    ├── usePowerUps.ts
    ├── useAnimations.ts
    └── useCombo.ts
```

---

## 🎮 Core Features Added

### 1. **Power-Up System**
12 unique power-ups with different rarities:
- Common: DOUBLE_DICE, BOOST
- Rare: SHIELD, SWAP, REVERSE, FREEZE
- Epic: TELEPORT, MAGNET, RAINBOW_PATH
- Legendary: LUCKY_STAR, EARTHQUAKE, TIME_WARP

### 2. **Combo System**
- 4-tier combo system (x2, x3, x4)
- Time-based combo windows
- Bonus points and XP multipliers
- Visual feedback for each tier

### 3. **Visual Effects**
22 particle effects:
- Movement effects (dust, speed lines)
- Power-up effects (shield, teleport, etc.)
- Celebration effects (fireworks, confetti)
- Combat effects (capture blast, explosion)

### 4. **Animation States**
14 animation states for smooth transitions:
- IDLE, SELECTED, MOVING, CAPTURED
- CELEBRATING, FROZEN, SHIELDED, BOOSTED
- TELEPORTING_IN/OUT, SWAPPING, REVERSING

### 5. **Sound System**
28 sound effects organized by priority:
- Game actions (dice, moves, captures)
- Power-up sounds
- UI feedback
- Victory/combo sounds

### 6. **Progression System**
- 12+ player levels with unlockable content
- XP and coin rewards
- Achievement system
- Daily quests
- Season pass

---

## 🚀 Quick Start

### Step 1: Initialize Enhanced Engine

```typescript
import { EnhancedLudoEngine } from './enhanced-engine';
import type { PlayerState } from '@/games/types';

// Create engine instance
const engine = new EnhancedLudoEngine(Date.now());

// Initialize game
const players: PlayerState[] = [
  { id: 'player-1', name: 'Alice' },
  { id: 'player-2', name: 'Bob' },
  { id: 'player-3', name: 'Charlie' },
  { id: 'player-4', name: 'Diana' }
];

const initialState = engine.getInitialState(players);
```

### Step 2: Render Game Board with Effects

```tsx
import { Canvas } from '@react-three/fiber';
import { GameBoard } from './components/GameBoard';
import { ParticleSystem } from './visual-effects';
import { SoundManager } from './sound-manager';

function LudoGame() {
  const [gameState, setGameState] = useState(initialState);
  const [soundManager] = useState(() => new SoundManager());
  
  return (
    <div className="game-container">
      <Canvas>
        <GameBoard state={gameState} />
        <ParticleSystem effects={gameState.payload.pendingEffects} />
      </Canvas>
      
      <PowerUpBar 
        powerUps={getCurrentPlayerPowerUps(gameState)}
        onUsePowerUp={handlePowerUp}
      />
      
      <ComboIndicator combo={getCurrentCombo(gameState)} />
    </div>
  );
}
```

### Step 3: Handle User Actions

```typescript
function handleDiceRoll(powerUp?: PowerUpType) {
  const move: RollMove = {
    type: 'ROLL',
    playerId: currentPlayer.id,
    moveNumber: gameState.version + 1,
    timestamp: Date.now(),
    data: { powerUp }
  };
  
  const newState = engine.applyMove(gameState, move);
  
  // Play sound
  soundManager.play('DICE_ROLL');
  
  // Update UI
  setGameState(newState);
}

function handleTokenMove(tokenId: string, dice: number) {
  const move: MoveToken = {
    type: 'MOVE_TOKEN',
    playerId: currentPlayer.id,
    moveNumber: gameState.version + 1,
    timestamp: Date.now(),
    data: { tokenId, dice }
  };
  
  const newState = engine.applyMove(gameState, move);
  
  // Trigger animations
  const lastMove = newState.payload.lastMove;
  if (lastMove) {
    animateTokenMove(lastMove);
    
    // Play effects
    lastMove.effects.forEach(effect => {
      particleSystem.emit(effect.particleEffect);
      soundManager.play(effect.soundEffect);
    });
  }
  
  setGameState(newState);
}
```

---

## 🎨 Visual Effects Implementation

### Particle System

```typescript
// visual-effects.ts
import * as THREE from 'three';
import { PARTICLE_EFFECTS, type ParticleEffectType } from './enhanced-constants';

export class ParticleSystem {
  private particles: Particle[] = [];
  
  emit(effectType: ParticleEffectType, position: THREE.Vector3) {
    const config = PARTICLE_EFFECTS[effectType];
    
    for (let i = 0; i < config.particleCount; i++) {
      const particle = this.createParticle(config, position);
      this.particles.push(particle);
    }
  }
  
  private createParticle(config: ParticleEffect, position: THREE.Vector3): Particle {
    const angle = Math.random() * Math.PI * 2;
    const speed = THREE.MathUtils.randFloat(config.velocity.min, config.velocity.max);
    
    return {
      position: position.clone(),
      velocity: new THREE.Vector3(
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        0
      ),
      size: THREE.MathUtils.randFloat(config.size.min, config.size.max),
      color: config.colors[Math.floor(Math.random() * config.colors.length)],
      opacity: config.opacity.start,
      scale: config.scale.start,
      life: 0,
      maxLife: config.duration,
      rotation: config.rotation ? Math.random() * Math.PI * 2 : 0,
      gravity: config.gravity
    };
  }
  
  update(deltaTime: number) {
    this.particles = this.particles.filter(particle => {
      particle.life += deltaTime;
      
      if (particle.life > particle.maxLife) {
        return false;
      }
      
      // Update position
      particle.velocity.y -= particle.gravity * deltaTime / 1000;
      particle.position.add(particle.velocity.clone().multiplyScalar(deltaTime / 1000));
      
      // Update opacity and scale
      const progress = particle.life / particle.maxLife;
      const config = PARTICLE_EFFECTS[effectType];
      particle.opacity = THREE.MathUtils.lerp(config.opacity.start, config.opacity.end, progress);
      particle.scale = THREE.MathUtils.lerp(config.scale.start, config.scale.end, progress);
      
      if (particle.rotation) {
        particle.rotation += 0.1 * deltaTime / 1000;
      }
      
      return true;
    });
  }
  
  render(scene: THREE.Scene) {
    this.particles.forEach(particle => {
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          color: new THREE.Color(particle.color),
          opacity: particle.opacity,
          transparent: true,
          blending: THREE.AdditiveBlending
        })
      );
      
      sprite.position.copy(particle.position);
      sprite.scale.setScalar(particle.size * particle.scale);
      sprite.rotation = particle.rotation;
      
      scene.add(sprite);
    });
  }
}

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  size: number;
  color: string;
  opacity: number;
  scale: number;
  life: number;
  maxLife: number;
  rotation: number;
  gravity: number;
}
```

### Animation System

```typescript
// animation-system.ts
import { ANIMATIONS, type AnimationState } from './enhanced-constants';
import type { AnimationConfig, Keyframe } from './enhanced-types';

export class AnimationController {
  private currentState: AnimationState = 'IDLE';
  private stateStartTime: number = 0;
  private progress: number = 0;
  
  setState(newState: AnimationState) {
    this.currentState = newState;
    this.stateStartTime = Date.now();
    this.progress = 0;
  }
  
  update(): AnimationResult {
    const config = ANIMATIONS[this.currentState];
    const elapsed = Date.now() - this.stateStartTime;
    this.progress = Math.min(elapsed / config.duration, 1);
    
    // Apply easing
    const easedProgress = this.applyEasing(this.progress, config.easing);
    
    // Interpolate values
    const scale = THREE.MathUtils.lerp(config.scale.from, config.scale.to, easedProgress);
    const rotation = THREE.MathUtils.lerp(config.rotation.from, config.rotation.to, easedProgress);
    const opacity = THREE.MathUtils.lerp(config.opacity.from, config.opacity.to, easedProgress);
    
    // Check if animation complete
    if (this.progress >= 1) {
      if (config.loop) {
        this.stateStartTime = Date.now();
        this.progress = 0;
      } else if (config.nextState) {
        this.setState(config.nextState);
      }
    }
    
    return { scale, rotation, opacity, progress: this.progress };
  }
  
  private applyEasing(t: number, easing: string): number {
    switch (easing) {
      case 'linear':
        return t;
      case 'easeIn':
        return t * t;
      case 'easeOut':
        return t * (2 - t);
      case 'easeInOut':
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      case 'bounce':
        if (t < 0.5) {
          return 8 * Math.pow(t, 2);
        } else {
          return 1 - 8 * Math.pow(t - 1, 2);
        }
      case 'elastic':
        const c4 = (2 * Math.PI) / 3;
        return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
      default:
        return t;
    }
  }
}

interface AnimationResult {
  scale: number;
  rotation: number;
  opacity: number;
  progress: number;
}
```

---

## 🔊 Sound Manager

```typescript
// sound-manager.ts
import { Howl, Howler } from 'howler';
import { SOUND_EFFECTS, type SoundEffectType } from './enhanced-constants';

export class SoundManager {
  private sounds: Map<SoundEffectType, Howl> = new Map();
  private settings: AudioSettings;
  
  constructor(settings?: AudioSettings) {
    this.settings = settings ?? {
      masterVolume: 1,
      musicVolume: 0.7,
      sfxVolume: 0.8,
      voiceVolume: 1,
      muted: false
    };
    
    this.preloadSounds();
  }
  
  private preloadSounds() {
    Object.entries(SOUND_EFFECTS).forEach(([type, config]) => {
      const sound = new Howl({
        src: [config.path],
        volume: config.volume * this.settings.sfxVolume * this.settings.masterVolume,
        rate: config.pitch,
        loop: config.loop
      });
      
      this.sounds.set(type as SoundEffectType, sound);
    });
  }
  
  play(type: SoundEffectType, options?: { volume?: number; pitch?: number }) {
    if (this.settings.muted) return;
    
    const sound = this.sounds.get(type);
    if (!sound) return;
    
    if (options?.volume !== undefined) {
      sound.volume(options.volume * this.settings.sfxVolume * this.settings.masterVolume);
    }
    
    if (options?.pitch !== undefined) {
      sound.rate(options.pitch);
    }
    
    sound.play();
  }
  
  stop(type: SoundEffectType) {
    const sound = this.sounds.get(type);
    if (sound) sound.stop();
  }
  
  setMasterVolume(volume: number) {
    this.settings.masterVolume = volume;
    Howler.volume(volume);
  }
  
  mute() {
    this.settings.muted = true;
    Howler.mute(true);
  }
  
  unmute() {
    this.settings.muted = false;
    Howler.mute(false);
  }
}
```

---

## 🎯 React Hooks

### useGameState Hook

```typescript
// hooks/useGameState.ts
import { useState, useCallback } from 'react';
import { EnhancedLudoEngine } from '../enhanced-engine';
import type { LudoState, LudoEngineMove } from '../enhanced-types';

export function useGameState(engine: EnhancedLudoEngine, initialState: LudoState) {
  const [state, setState] = useState(initialState);
  const [history, setHistory] = useState<LudoState[]>([initialState]);
  
  const applyMove = useCallback((move: LudoEngineMove) => {
    try {
      const newState = engine.applyMove(state, move);
      setState(newState);
      setHistory(prev => [...prev, newState]);
      return { success: true, state: newState };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, [state, engine]);
  
  const undo = useCallback(() => {
    if (history.length > 1) {
      const newHistory = history.slice(0, -1);
      setState(newHistory[newHistory.length - 1]);
      setHistory(newHistory);
    }
  }, [history]);
  
  const reset = useCallback(() => {
    setState(initialState);
    setHistory([initialState]);
  }, [initialState]);
  
  return {
    state,
    applyMove,
    undo,
    reset,
    canUndo: history.length > 1
  };
}
```

### usePowerUps Hook

```typescript
// hooks/usePowerUps.ts
import { useMemo, useCallback } from 'react';
import type { PlayerTrackState, ActivePowerUp } from '../enhanced-types';
import type { PowerUpType } from '../enhanced-constants';

export function usePowerUps(track: PlayerTrackState) {
  const availablePowerUps = useMemo(() => {
    return track.powerUps.filter(p => p.chargesRemaining > 0 && p.cooldownRemaining === 0);
  }, [track.powerUps]);
  
  const canUsePowerUp = useCallback((type: PowerUpType) => {
    const powerUp = track.powerUps.find(p => p.type === type);
    return powerUp && powerUp.chargesRemaining > 0 && powerUp.cooldownRemaining === 0;
  }, [track.powerUps]);
  
  const getPowerUpCooldown = useCallback((type: PowerUpType) => {
    const powerUp = track.powerUps.find(p => p.type === type);
    return powerUp?.cooldownRemaining ?? 0;
  }, [track.powerUps]);
  
  return {
    availablePowerUps,
    canUsePowerUp,
    getPowerUpCooldown
  };
}
```

### useCombo Hook

```typescript
// hooks/useCombo.ts
import { useEffect, useState } from 'react';
import type { ComboState } from '../enhanced-types';

export function useCombo(combo: ComboState) {
  const [timeRemaining, setTimeRemaining] = useState(combo.timeRemaining);
  const [isExpiring, setIsExpiring] = useState(false);
  
  useEffect(() => {
    if (combo.timeRemaining <= 0) {
      setTimeRemaining(0);
      return;
    }
    
    const interval = setInterval(() => {
      const elapsed = Date.now() - combo.lastActionTime;
      const remaining = Math.max(0, combo.timeRemaining - elapsed);
      
      setTimeRemaining(remaining);
      setIsExpiring(remaining < 3000 && remaining > 0);
      
      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 100);
    
    return () => clearInterval(interval);
  }, [combo]);
  
  return {
    multiplier: combo.multiplier,
    actions: combo.actions,
    timeRemaining,
    isExpiring,
    isActive: combo.multiplier > 1
  };
}
```

---

## 🎨 UI Components

### Power-Up Button

```tsx
// ui-components/PowerUpButton.tsx
import React from 'react';
import { POWER_UPS, type PowerUpType } from '../enhanced-constants';
import type { ActivePowerUp } from '../enhanced-types';

interface Props {
  powerUp: ActivePowerUp;
  onUse: (type: PowerUpType) => void;
  disabled?: boolean;
}

export function PowerUpButton({ powerUp, onUse, disabled }: Props) {
  const config = POWER_UPS[powerUp.type];
  const canUse = powerUp.chargesRemaining > 0 && powerUp.cooldownRemaining === 0 && !disabled;
  
  return (
    <button
      className={`power-up-btn ${powerUp.type.toLowerCase()} ${!canUse ? 'disabled' : ''}`}
      onClick={() => canUse && onUse(powerUp.type)}
      disabled={!canUse}
      style={{
        background: canUse ? config.glowColor : '#666',
        boxShadow: canUse ? `0 0 20px ${config.glowColor}` : 'none'
      }}
    >
      <div className="icon">{config.icon}</div>
      <div className="charges">{powerUp.chargesRemaining}</div>
      {powerUp.cooldownRemaining > 0 && (
        <div className="cooldown">{powerUp.cooldownRemaining}</div>
      )}
      <div className="tooltip">
        <h4>{config.name}</h4>
        <p>{config.description}</p>
        <span className={`rarity ${config.rarity}`}>{config.rarity}</span>
      </div>
    </button>
  );
}
```

### Combo Indicator

```tsx
// ui-components/ComboIndicator.tsx
import React from 'react';
import { useCombo } from '../hooks/useCombo';
import type { ComboState } from '../enhanced-types';

interface Props {
  combo: ComboState;
}

export function ComboIndicator({ combo }: Props) {
  const { multiplier, actions, timeRemaining, isExpiring, isActive } = useCombo(combo);
  
  if (!isActive) return null;
  
  return (
    <div className={`combo-indicator ${isExpiring ? 'expiring' : ''}`}>
      <div className="multiplier">
        <span className="value">×{multiplier}</span>
        <span className="label">COMBO</span>
      </div>
      
      <div className="actions">
        {Array.from({ length: actions }).map((_, i) => (
          <div key={i} className="action-dot" />
        ))}
      </div>
      
      <div className="timer">
        <div 
          className="timer-fill"
          style={{ width: `${(timeRemaining / combo.timeRemaining) * 100}%` }}
        />
      </div>
      
      {combo.bonusPoints > 0 && (
        <div className="bonus">+{combo.bonusPoints} pts</div>
      )}
    </div>
  );
}
```

---

## 📊 Performance Optimization

### Tips for 60 FPS

1. **Object Pooling**: Reuse particle objects instead of creating new ones
2. **LOD System**: Reduce particle count on low-end devices
3. **Batching**: Combine draw calls for particles
4. **Web Workers**: Run game logic in separate thread
5. **Lazy Loading**: Load sounds and assets on demand

```typescript
// Performance settings based on device
function detectDeviceCapability(): GraphicsQuality {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl');
  
  if (!gl) return 'low';
  
  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
  
  // Detect GPU tier
  if (renderer.includes('Mali') || renderer.includes('Adreno 5')) {
    return 'medium';
  } else if (renderer.includes('Apple') || renderer.includes('NVIDIA')) {
    return 'ultra';
  }
  
  return 'high';
}

const graphicsSettings = {
  low: {
    particleQuality: 'low',
    maxParticles: 100,
    shadowQuality: 'off',
    antialiasing: false
  },
  medium: {
    particleQuality: 'medium',
    maxParticles: 300,
    shadowQuality: 'low',
    antialiasing: true
  },
  high: {
    particleQuality: 'high',
    maxParticles: 500,
    shadowQuality: 'high',
    antialiasing: true
  },
  ultra: {
    particleQuality: 'high',
    maxParticles: 1000,
    shadowQuality: 'high',
    antialiasing: true
  }
};
```

---

## 🧪 Testing

```typescript
// __tests__/enhanced-engine.test.ts
import { EnhancedLudoEngine } from '../enhanced-engine';

describe('EnhancedLudoEngine', () => {
  let engine: EnhancedLudoEngine;
  
  beforeEach(() => {
    engine = new EnhancedLudoEngine(12345); // Fixed seed
  });
  
  test('power-ups are properly initialized', () => {
    const state = engine.getInitialState(mockPlayers);
    const track = Object.values(state.payload.track)[0];
    
    expect(track.powerUps.length).toBeGreaterThan(0);
    expect(track.powerUps[0].chargesRemaining).toBeGreaterThan(0);
  });
  
  test('combo system tracks consecutive actions', () => {
    const state = engine.getInitialState(mockPlayers);
    
    // Simulate multiple captures
    let currentState = state;
    for (let i = 0; i < 3; i++) {
      // ... perform moves that trigger combo
    }
    
    const track = Object.values(currentState.payload.track)[0];
    expect(track.combo.multiplier).toBeGreaterThan(1);
  });
  
  test('shield protects token from capture', () => {
    // Test implementation
  });
});
```

---

## 🚀 Deployment Checklist

- [ ] Compress all audio files (use Opus codec)
- [ ] Optimize textures (use Basis Universal)
- [ ] Enable code splitting
- [ ] Set up CDN for assets
- [ ] Configure analytics events
- [ ] Test on low-end devices
- [ ] Implement error boundary
- [ ] Add loading states
- [ ] Test offline mode
- [ ] Verify payment integration

---

## 📈 Analytics Events to Track

```typescript
const analyticsEvents = {
  // Game Events
  'game_started': { mode: string, players: number },
  'game_completed': { winner: string, duration: number, moves: number },
  'token_captured': { capturer: string, victim: string, combo: number },
  
  // Power-up Events
  'power_up_used': { type: PowerUpType, effectiveness: string },
  'power_up_unlocked': { type: PowerUpType, level: number },
  
  // Combo Events
  'combo_achieved': { multiplier: number, actions: number },
  'combo_broken': { maxMultiplier: number, totalActions: number },
  
  // Progression Events
  'level_up': { newLevel: number, xpGained: number },
  'achievement_unlocked': { achievementId: string, rarity: string },
  
  // Monetization Events
  'purchase_initiated': { product: string, price: number },
  'purchase_completed': { product: string, price: number }
};
```

---

## 🎓 Best Practices

1. **Always use TypeScript** for type safety
2. **Test with different seeds** for deterministic behavior
3. **Profile regularly** to catch performance issues
4. **Use object pooling** for particles
5. **Implement progressive enhancement** (start with basics, add effects)
6. **Cache frequently accessed data** (current player, available moves)
7. **Debounce user inputs** to prevent spam
8. **Add haptic feedback** for mobile devices
9. **Support keyboard shortcuts** for power users
10. **Make UI accessible** (WCAG 2.1 AA compliance)

---

## 📚 Additional Resources

- [React Three Fiber Docs](https://docs.pmnd.rs/react-three-fiber)
- [Howler.js Documentation](https://howlerjs.com/)
- [Game Programming Patterns](https://gameprogrammingpatterns.com/)
- [The Art of Game Design](https://www.schellgames.com/art-of-game-design)

---
