// ============================================================================
// CHESS GAME ENGINE - CLOCK MANAGEMENT
// AAA Mobile Game Quality - Lichess/Chess.com Standard
//
// Features:
// - Accurate time tracking
// - Increment and delay support
// - Time forfeit detection
// - Low time warnings
// ============================================================================

import { ClockState, TimeControl, PieceColor } from './types';
import { formatTime, formatTimePrecise } from './utils';

export interface ClockConfig {
  initialTime: number;    // ms
  increment: number;      // ms added after each move
  delay: number;          // ms delay before clock starts
}

export interface ClockUpdate {
  color: PieceColor;
  remainingTime: number;
  isRunning: boolean;
  isLowTime: boolean;
  formattedTime: string;
}

export class ChessClock {
  private whiteTime: number;
  private blackTime: number;
  private increment: number;
  private delay: number;
  
  private activeColor: PieceColor | null = null;
  private lastUpdateTime: number = 0;
  private isRunning: boolean = false;
  
  // Callbacks
  onTimeUpdate?: (update: ClockUpdate) => void;
  onTimeForfeit?: (color: PieceColor) => void;
  onLowTime?: (color: PieceColor, remainingMs: number) => void;

  constructor(config: ClockConfig) {
    this.whiteTime = config.initialTime;
    this.blackTime = config.initialTime;
    this.increment = config.increment;
    this.delay = config.delay;
  }

  static fromTimeControl(tc: TimeControl): ChessClock {
    return new ChessClock({
      initialTime: tc.initial,
      increment: tc.increment,
      delay: tc.delay
    });
  }

  // Start the clock for a color
  start(color: PieceColor): void {
    if (this.isRunning && this.activeColor === color) return;
    
    this.activeColor = color;
    this.lastUpdateTime = Date.now();
    this.isRunning = true;
    
    // Apply delay if configured
    if (this.delay > 0) {
      setTimeout(() => {
        if (this.isRunning && this.activeColor === color) {
          this.lastUpdateTime = Date.now();
        }
      }, this.delay);
    }
  }

  // Stop the clock
  stop(): void {
    if (!this.isRunning) return;
    
    this.updateTime();
    this.isRunning = false;
    this.activeColor = null;
  }

  // Switch clock to other player (after a move)
  switch(): void {
    if (!this.isRunning || !this.activeColor) return;
    
    // Update current player's time
    this.updateTime();
    
    // Add increment to the player who just moved
    if (this.increment > 0) {
      if (this.activeColor === 'w') {
        this.whiteTime += this.increment;
      } else {
        this.blackTime += this.increment;
      }
    }
    
    // Switch to other player
    const nextColor = this.activeColor === 'w' ? 'b' : 'w';
    this.activeColor = nextColor;
    this.lastUpdateTime = Date.now();
    
    // Notify time update
    this.notifyTimeUpdate(nextColor);
  }

  // Update the active player's time
  private updateTime(): void {
    if (!this.isRunning || !this.activeColor) return;
    
    const now = Date.now();
    const elapsed = now - this.lastUpdateTime;
    
    if (this.activeColor === 'w') {
      this.whiteTime -= elapsed;
      
      // Check for time forfeit
      if (this.whiteTime <= 0) {
        this.whiteTime = 0;
        this.onTimeForfeit?.('w');
      }
      
      // Check for low time (under 10 seconds)
      if (this.whiteTime <= 10_000 && this.whiteTime + elapsed > 10_000) {
        this.onLowTime?.('w', this.whiteTime);
      }
    } else {
      this.blackTime -= elapsed;
      
      if (this.blackTime <= 0) {
        this.blackTime = 0;
        this.onTimeForfeit?.('b');
      }
      
      if (this.blackTime <= 10_000 && this.blackTime + elapsed > 10_000) {
        this.onLowTime?.('b', this.blackTime);
      }
    }
    
    this.lastUpdateTime = now;
  }

  // Get current time for a color
  getTime(color: PieceColor): number {
    this.updateTime();
    return color === 'w' ? this.whiteTime : this.blackTime;
  }

  // Get formatted time for display
  getFormattedTime(color: PieceColor): string {
    const time = this.getTime(color);
    return time < 10_000 ? formatTimePrecise(time) : formatTime(time);
  }

  // Get clock state
  getState(): ClockState {
    this.updateTime();
    return {
      white: this.whiteTime,
      black: this.blackTime,
      whiteDelay: this.delay,
      blackDelay: this.delay,
      lastUpdate: this.lastUpdateTime
    };
  }

  // Set clock state (for restoring from saved game)
  setState(state: ClockState): void {
    this.whiteTime = state.white;
    this.blackTime = state.black;
    this.lastUpdateTime = state.lastUpdate;
  }

  // Add time to a player (for penalties/bonuses)
  addTime(color: PieceColor, ms: number): void {
    if (color === 'w') {
      this.whiteTime = Math.max(0, this.whiteTime + ms);
    } else {
      this.blackTime = Math.max(0, this.blackTime + ms);
    }
  }

  // Check if a player is in time trouble
  isLowTime(color: PieceColor, thresholdMs: number = 10_000): boolean {
    const time = this.getTime(color);
    return time <= thresholdMs;
  }

  // Get total time remaining for both players
  getTotalTimeRemaining(): number {
    return this.whiteTime + this.blackTime;
  }

  // Check if clock is running
  getIsRunning(): boolean {
    return this.isRunning;
  }

  // Get active color
  getActiveColor(): PieceColor | null {
    return this.activeColor;
  }

  // Pause the clock (for takebacks, analysis, etc.)
  pause(): void {
    this.updateTime();
    this.isRunning = false;
  }

  // Resume the clock
  resume(): void {
    if (this.activeColor) {
      this.lastUpdateTime = Date.now();
      this.isRunning = true;
    }
  }

  // Notify time update
  private notifyTimeUpdate(color: PieceColor): void {
    const remainingTime = this.getTime(color);
    
    this.onTimeUpdate?.({
      color,
      remainingTime,
      isRunning: this.isRunning,
      isLowTime: this.isLowTime(color),
      formattedTime: this.getFormattedTime(color)
    });
  }

  // Tick function - call this regularly for accurate time updates
  tick(): void {
    if (this.isRunning && this.activeColor) {
      this.notifyTimeUpdate(this.activeColor);
    }
  }

  // Get time advantage for white (positive = white has more time)
  getTimeAdvantage(): number {
    return this.whiteTime - this.blackTime;
  }

  // Estimate time usage per move (based on game progress)
  getEstimatedTimePerMove(color: PieceColor, movesPlayed: number): number {
    if (movesPlayed === 0) return 0;
    
    const initialTime = this.whiteTime + this.blackTime + (movesPlayed * this.increment);
    const timeUsed = initialTime - (this.whiteTime + this.blackTime);
    
    return timeUsed / movesPlayed;
  }

  // Serialize clock for network transmission
  serialize(): {
    white: number;
    black: number;
    increment: number;
    delay: number;
    activeColor: PieceColor | null;
    isRunning: boolean;
  } {
    return {
      white: this.whiteTime,
      black: this.blackTime,
      increment: this.increment,
      delay: this.delay,
      activeColor: this.activeColor,
      isRunning: this.isRunning
    };
  }

  // Deserialize clock from network
  static deserialize(data: ReturnType<ChessClock['serialize']>): ChessClock {
    const clock = new ChessClock({
      initialTime: data.white, // Use white's time as initial
      increment: data.increment,
      delay: data.delay
    });
    
    clock.whiteTime = data.white;
    clock.blackTime = data.black;
    clock.activeColor = data.activeColor;
    clock.isRunning = data.isRunning;
    
    if (clock.isRunning) {
      clock.lastUpdateTime = Date.now();
    }
    
    return clock;
  }
}

// Factory functions for common time controls
export const ClockFactory = {
  bullet1_0(): ChessClock {
    return new ChessClock({ initialTime: 60_000, increment: 0, delay: 0 });
  },
  
  bullet2_1(): ChessClock {
    return new ChessClock({ initialTime: 120_000, increment: 1_000, delay: 0 });
  },
  
  blitz3_0(): ChessClock {
    return new ChessClock({ initialTime: 180_000, increment: 0, delay: 0 });
  },
  
  blitz5_0(): ChessClock {
    return new ChessClock({ initialTime: 300_000, increment: 0, delay: 0 });
  },
  
  blitz5_3(): ChessClock {
    return new ChessClock({ initialTime: 300_000, increment: 3_000, delay: 0 });
  },
  
  rapid10_0(): ChessClock {
    return new ChessClock({ initialTime: 600_000, increment: 0, delay: 0 });
  },
  
  rapid15_10(): ChessClock {
    return new ChessClock({ initialTime: 900_000, increment: 10_000, delay: 0 });
  },
  
  classical30_0(): ChessClock {
    return new ChessClock({ initialTime: 1_800_000, increment: 0, delay: 0 });
  },
  
  fromString(tc: string): ChessClock {
    // Parse "5+3" or "5" format
    const parts = tc.split('+');
    const minutes = parseInt(parts[0]);
    const increment = parts[1] ? parseInt(parts[1]) : 0;
    
    return new ChessClock({
      initialTime: minutes * 60_000,
      increment: increment * 1_000,
      delay: 0
    });
  }
};

// Clock manager for multiple games
export class ClockManager {
  private clocks = new Map<string, ChessClock>();

  create(gameId: string, config: ClockConfig): ChessClock {
    const clock = new ChessClock(config);
    this.clocks.set(gameId, clock);
    return clock;
  }

  get(gameId: string): ChessClock | undefined {
    return this.clocks.get(gameId);
  }

  remove(gameId: string): boolean {
    const clock = this.clocks.get(gameId);
    if (clock) {
      clock.stop();
      this.clocks.delete(gameId);
      return true;
    }
    return false;
  }

  tickAll(): void {
    for (const clock of this.clocks.values()) {
      clock.tick();
    }
  }

  pauseAll(): void {
    for (const clock of this.clocks.values()) {
      clock.pause();
    }
  }

  resumeAll(): void {
    for (const clock of this.clocks.values()) {
      clock.resume();
    }
  }

  getActiveGames(): string[] {
    return Array.from(this.clocks.keys());
  }

  clear(): void {
    for (const clock of this.clocks.values()) {
      clock.stop();
    }
    this.clocks.clear();
  }
}
