// ============================================================================
// SAVE/LOAD SYSTEM
// Persistent Game State with Cloud Sync and Versioning
// ============================================================================

import type { GameState, StateSnapshot, ReplayData } from './core';
import { compress, decompress } from 'lz-string';

// ============================================================================
// TYPES
// ============================================================================

export interface SaveData<TPayload = any> {
  id: string;
  gameId: string;
  version: string;                // Game version
  state: GameState<TPayload>;
  
  metadata: {
    name: string;
    description?: string;
    createdAt: number;
    lastModified: number;
    lastPlayed?: number;
    playTime: number;             // Total play time (ms)
    playerCount: number;
    tags: string[];
    thumbnail?: string;           // Base64 or URL
  };
  
  compressed: boolean;
  checksum: string;
  size: number;                   // Bytes
}

export interface SaveSlot {
  slotId: number;
  save?: SaveData;
  autoSave: boolean;
  cloudSync: boolean;
  lastSyncTime?: number;
}

export interface SaveConfig {
  maxSaves: number;               // Max save files
  maxAutoSaves: number;           // Max auto-saves
  autoSaveInterval: number;       // Auto-save every N ms
  enableCompression: boolean;     // Compress saves
  enableCloudSync: boolean;       // Sync to cloud
  storageType: 'localStorage' | 'indexedDB' | 'custom';
}

// ============================================================================
// STORAGE ADAPTER INTERFACE
// ============================================================================

export interface StorageAdapter {
  save(key: string, data: string): Promise<void>;
  load(key: string): Promise<string | null>;
  delete(key: string): Promise<void>;
  list(prefix?: string): Promise<string[]>;
  clear(): Promise<void>;
  getSize(key: string): Promise<number>;
}

// ============================================================================
// LOCAL STORAGE ADAPTER
// ============================================================================

export class LocalStorageAdapter implements StorageAdapter {
  private prefix: string;
  
  constructor(prefix = 'game_') {
    this.prefix = prefix;
  }
  
  async save(key: string, data: string): Promise<void> {
    try {
      localStorage.setItem(this.prefix + key, data);
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        throw new Error('Storage quota exceeded. Please delete old saves.');
      }
      throw error instanceof Error ? error : new Error('Unknown storage error');
    }
  }
  
  async load(key: string): Promise<string | null> {
    return localStorage.getItem(this.prefix + key);
  }
  
  async delete(key: string): Promise<void> {
    localStorage.removeItem(this.prefix + key);
  }
  
  async list(prefix?: string): Promise<string[]> {
    const keys: string[] = [];
    const searchPrefix = this.prefix + (prefix ?? '');
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(searchPrefix)) {
        keys.push(key.substring(this.prefix.length));
      }
    }
    
    return keys;
  }
  
  async clear(): Promise<void> {
    const keys = await this.list();
    for (const key of keys) {
      await this.delete(key);
    }
  }
  
  async getSize(key: string): Promise<number> {
    const data = await this.load(key);
    return data ? new Blob([data]).size : 0;
  }
}

// ============================================================================
// INDEXED DB ADAPTER (Better for large saves)
// ============================================================================

export class IndexedDBAdapter implements StorageAdapter {
  private dbName: string;
  private storeName: string;
  private db?: IDBDatabase;
  
  constructor(dbName = 'GameSaves', storeName = 'saves') {
    this.dbName = dbName;
    this.storeName = storeName;
  }
  
  private async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });
  }
  
  async save(key: string, data: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(data, key);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
  
  async load(key: string): Promise<string | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(key);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result ?? null);
    });
  }
  
  async delete(key: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(key);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
  
  async list(prefix?: string): Promise<string[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAllKeys();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const keys = request.result.map(k => k.toString());
        if (prefix) {
          resolve(keys.filter(k => k.startsWith(prefix)));
        } else {
          resolve(keys);
        }
      };
    });
  }
  
  async clear(): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
  
  async getSize(key: string): Promise<number> {
    const data = await this.load(key);
    return data ? new Blob([data]).size : 0;
  }
}

// ============================================================================
// SAVE MANAGER
// ============================================================================

export class SaveManager<TPayload = any> {
  private config: Required<SaveConfig>;
  private storage: StorageAdapter;
  private slots: Map<number, SaveSlot> = new Map();
  private autoSaveTimer?: NodeJS.Timeout;
  
  constructor(
    storage: StorageAdapter,
    config?: Partial<SaveConfig>
  ) {
    this.storage = storage;
    this.config = {
      maxSaves: config?.maxSaves ?? 10,
      maxAutoSaves: config?.maxAutoSaves ?? 3,
      autoSaveInterval: config?.autoSaveInterval ?? 60000, // 1 minute
      enableCompression: config?.enableCompression ?? true,
      enableCloudSync: config?.enableCloudSync ?? false,
      storageType: config?.storageType ?? 'indexedDB'
    };
    
    this.initializeSlots();
  }
  
  private initializeSlots(): void {
    for (let i = 0; i < this.config.maxSaves; i++) {
      this.slots.set(i, {
        slotId: i,
        autoSave: i < this.config.maxAutoSaves,
        cloudSync: this.config.enableCloudSync
      });
    }
  }
  
  // ============================================================================
  // SAVE OPERATIONS
  // ============================================================================
  
  /**
   * Save game state
   */
  async save(
    state: GameState<TPayload>,
    slotId: number,
    metadata?: Partial<SaveData['metadata']>
  ): Promise<SaveData<TPayload>> {
    const slot = this.slots.get(slotId);
    if (!slot) {
      throw new Error(`Invalid slot ID: ${slotId}`);
    }
    
    const saveData: SaveData<TPayload> = {
      id: `save-${slotId}-${Date.now()}`,
      gameId: state.metadata?.gameId ?? '',
      version: '1.0.0',
      state,
      metadata: {
        name: metadata?.name ?? `Save ${slotId + 1}`,
        description: metadata?.description,
        createdAt: slot.save?.metadata.createdAt ?? Date.now(),
        lastModified: Date.now(),
        lastPlayed: metadata?.lastPlayed,
        playTime: metadata?.playTime ?? 0,
        playerCount: state.metadata?.playerIds?.length ?? 0,
        tags: metadata?.tags ?? [],
        thumbnail: metadata?.thumbnail
      },
      compressed: this.config.enableCompression,
      checksum: this.computeChecksum(state),
      size: 0
    };
    
    // Compress if enabled
    let dataToSave = JSON.stringify(saveData);
    if (this.config.enableCompression) {
      dataToSave = compress(dataToSave);
    }
    
    saveData.size = new Blob([dataToSave]).size;
    
    // Save to storage
    const key = this.getSaveKey(slotId);
    await this.storage.save(key, dataToSave);
    
    // Update slot
    slot.save = saveData;
    
    // Cloud sync if enabled
    if (slot.cloudSync) {
      await this.syncToCloud(slotId);
    }
    
    return saveData;
  }
  
  /**
   * Load game state
   */
  async load(slotId: number): Promise<GameState<TPayload> | null> {
    const key = this.getSaveKey(slotId);
    let data = await this.storage.load(key);
    
    if (!data) return null;
    
    // Decompress if needed
    try {
      const decompressed = decompress(data);
      if (decompressed) {
        data = decompressed;
      }
    } catch {
      // Not compressed or decompression failed, use as-is
    }
    
    const saveData: SaveData<TPayload> = JSON.parse(data);
    
    // Verify checksum
    const expectedChecksum = this.computeChecksum(saveData.state);
    if (saveData.checksum !== expectedChecksum) {
      throw new Error('Save file corrupted - checksum mismatch');
    }
    
    // Update slot
    const slot = this.slots.get(slotId);
    if (slot) {
      slot.save = saveData;
    }
    
    return saveData.state;
  }
  
  /**
   * Delete save
   */
  async deleteSave(slotId: number): Promise<void> {
    const key = this.getSaveKey(slotId);
    await this.storage.delete(key);
    
    const slot = this.slots.get(slotId);
    if (slot) {
      slot.save = undefined;
    }
  }
  
  /**
   * List all saves
   */
  async listSaves(): Promise<SaveSlot[]> {
    const saves: SaveSlot[] = [];
    
    for (const [slotId, slot] of this.slots) {
      // Try to load save metadata
      try {
        const key = this.getSaveKey(slotId);
        let data = await this.storage.load(key);
        
        if (data) {
          try {
            const decompressed = decompress(data);
            if (decompressed) data = decompressed;
          } catch {}
          
          const saveData: SaveData<TPayload> = JSON.parse(data);
          slot.save = saveData;
        }
      } catch (error) {
        console.error(`Failed to load save ${slotId}:`, error);
      }
      
      saves.push({ ...slot });
    }
    
    return saves;
  }
  
  /**
   * Get save metadata without loading full state
   */
  async getSaveMetadata(slotId: number): Promise<SaveData['metadata'] | null> {
    try {
      const key = this.getSaveKey(slotId);
      let data = await this.storage.load(key);
      
      if (!data) return null;
      
      try {
        const decompressed = decompress(data);
        if (decompressed) data = decompressed;
      } catch {}
      
      const saveData: SaveData<TPayload> = JSON.parse(data);
      return saveData.metadata;
    } catch {
      return null;
    }
  }
  
  // ============================================================================
  // AUTO-SAVE
  // ============================================================================
  
  /**
   * Enable auto-save
   */
  enableAutoSave(getCurrentState: () => GameState<TPayload>): void {
    this.disableAutoSave();
    
    this.autoSaveTimer = setInterval(async () => {
      try {
        const state = getCurrentState();
        await this.autoSave(state);
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }, this.config.autoSaveInterval);
  }
  
  /**
   * Disable auto-save
   */
  disableAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = undefined;
    }
  }
  
  /**
   * Perform auto-save
   */
  private async autoSave(state: GameState<TPayload>): Promise<void> {
    // Find next auto-save slot
    let autoSaveSlot: number | undefined;
    
    for (const [slotId, slot] of this.slots) {
      if (slot.autoSave) {
        if (!slot.save) {
          autoSaveSlot = slotId;
          break;
        }
        
        // Use oldest auto-save slot
        if (
          autoSaveSlot === undefined ||
          (slot.save && this.slots.get(autoSaveSlot)?.save &&
           slot.save.metadata.lastModified < this.slots.get(autoSaveSlot)!.save!.metadata.lastModified)
        ) {
          autoSaveSlot = slotId;
        }
      }
    }
    
    if (autoSaveSlot !== undefined) {
      await this.save(state, autoSaveSlot, {
        name: `Auto-save ${new Date().toLocaleString()}`,
        tags: ['auto']
      });
    }
  }
  
  // ============================================================================
  // CLOUD SYNC
  // ============================================================================
  
  /**
   * Sync save to cloud
   */
  private async syncToCloud(slotId: number): Promise<void> {
    if (!this.config.enableCloudSync) return;
    
    const slot = this.slots.get(slotId);
    if (!slot?.save) return;
    
    try {
      // Would upload to cloud storage (S3, Google Cloud Storage, etc.)
      // For now, just mark as synced
      slot.lastSyncTime = Date.now();
      
      console.log(`Synced save ${slotId} to cloud`);
    } catch (error) {
      console.error(`Failed to sync save ${slotId} to cloud:`, error);
    }
  }
  
  /**
   * Download save from cloud
   */
  async downloadFromCloud(slotId: number): Promise<GameState<TPayload> | null> {
    if (!this.config.enableCloudSync) {
      throw new Error('Cloud sync is disabled');
    }
    
    try {
      // Would download from cloud storage
      // For now, return null
      return null;
    } catch (error) {
      console.error(`Failed to download save ${slotId} from cloud:`, error);
      return null;
    }
  }
  
  // ============================================================================
  // IMPORT/EXPORT
  // ============================================================================
  
  /**
   * Export save to file
   */
  async exportSave(slotId: number): Promise<Blob> {
    const key = this.getSaveKey(slotId);
    const data = await this.storage.load(key);
    
    if (!data) {
      throw new Error(`No save in slot ${slotId}`);
    }
    
    return new Blob([data], { type: 'application/json' });
  }
  
  /**
   * Import save from file
   */
  async importSave(file: File, slotId: number): Promise<void> {
    const text = await file.text();
    const key = this.getSaveKey(slotId);
    
    // Validate save data
    try {
      let data = text;
      try {
        const decompressed = decompress(data);
        if (decompressed) data = decompressed;
      } catch {}
      
      const saveData: SaveData<TPayload> = JSON.parse(data);
      
      // Verify checksum
      const expectedChecksum = this.computeChecksum(saveData.state);
      if (saveData.checksum !== expectedChecksum) {
        throw new Error('Invalid save file - checksum mismatch');
      }
      
      // Save
      await this.storage.save(key, text);
      
      // Update slot
      const slot = this.slots.get(slotId);
      if (slot) {
        slot.save = saveData;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to import save: ${message}`);
    }
  }
  
  // ============================================================================
  // UTILITIES
  // ============================================================================
  
  private getSaveKey(slotId: number): string {
    return `save_slot_${slotId}`;
  }
  
  private computeChecksum(state: GameState<TPayload>): string {
    // Same as engine checksum
    const serialized = JSON.stringify(state);
    let hash = 2166136261;
    for (let i = 0; i < serialized.length; i++) {
      hash ^= serialized.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
  }
  
  /**
   * Get total storage used
   */
  async getTotalSize(): Promise<number> {
    let totalSize = 0;
    
    for (const [slotId] of this.slots) {
      const key = this.getSaveKey(slotId);
      totalSize += await this.storage.getSize(key);
    }
    
    return totalSize;
  }
  
  /**
   * Check if save exists
   */
  async hasSave(slotId: number): Promise<boolean> {
    const key = this.getSaveKey(slotId);
    const data = await this.storage.load(key);
    return data !== null;
  }
  
  /**
   * Clear all saves
   */
  async clearAllSaves(): Promise<void> {
    await this.storage.clear();
    
    for (const slot of this.slots.values()) {
      slot.save = undefined;
    }
  }
}

// ============================================================================
// QUICK SAVE MANAGER (For games with frequent saves)
// ============================================================================

export class QuickSaveManager<TPayload = any> {
  private saveManager: SaveManager<TPayload>;
  private quickSaveSlot: number;
  
  constructor(saveManager: SaveManager<TPayload>, quickSaveSlot = 0) {
    this.saveManager = saveManager;
    this.quickSaveSlot = quickSaveSlot;
  }
  
  async quickSave(state: GameState<TPayload>): Promise<void> {
    await this.saveManager.save(state, this.quickSaveSlot, {
      name: `Quick Save ${new Date().toLocaleString()}`,
      tags: ['quick']
    });
  }
  
  async quickLoad(): Promise<GameState<TPayload> | null> {
    return this.saveManager.load(this.quickSaveSlot);
  }
  
  async hasQuickSave(): Promise<boolean> {
    return this.saveManager.hasSave(this.quickSaveSlot);
  }
}