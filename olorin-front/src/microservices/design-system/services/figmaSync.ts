/**
 * Figma Synchronization Service
 * Standalone service for syncing design tokens and components from Figma
 * Part of the Design System microservice (T030)
 */

import { EventBusManager } from '@shared/events/eventBus';
import { FigmaMCPClient } from '@shared/figma/figma-mcp';
import type { DesignTokens, FigmaComponent, FigmaSync } from '../types/design';

interface FigmaSyncConfig {
  fileId: string;
  accessToken: string;
  syncInterval: number;
  autoSync: boolean;
  debug: boolean;
}

interface SyncResult {
  success: boolean;
  timestamp: Date;
  tokensUpdated: number;
  componentsUpdated: number;
  errors: string[];
  changes: SyncChange[];
}

interface SyncChange {
  type: 'token' | 'component';
  action: 'added' | 'updated' | 'removed';
  name: string;
  oldValue?: any;
  newValue?: any;
}

export class FigmaSyncService {
  private static instance: FigmaSyncService | null = null;
  private eventBus: EventBusManager;
  private figmaClient: FigmaMCPClient;
  private config: FigmaSyncConfig;
  private syncInterval: NodeJS.Timeout | null = null;
  private lastSyncTime: Date | null = null;
  private isInitialized = false;

  private constructor(config: FigmaSyncConfig) {
    this.config = config;
    this.eventBus = EventBusManager.getInstance();
    this.figmaClient = new FigmaMCPClient({
      accessToken: config.accessToken,
      debug: config.debug
    });
  }

  /**
   * Get singleton instance
   */
  public static getInstance(config?: FigmaSyncConfig): FigmaSyncService {
    if (!FigmaSyncService.instance) {
      if (!config) {
        throw new Error('FigmaSyncService config required for first initialization');
      }
      FigmaSyncService.instance = new FigmaSyncService(config);
    }
    return FigmaSyncService.instance;
  }

  /**
   * Initialize the Figma sync service
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Test Figma connection
      await this.figmaClient.initialize();

      // Perform initial sync
      await this.performSync();

      // Set up auto-sync if enabled
      if (this.config.autoSync) {
        this.startAutoSync();
      }

      this.isInitialized = true;

      this.eventBus.emit('design:figma:initialized', {
        timestamp: new Date(),
        config: {
          fileId: this.config.fileId,
          autoSync: this.config.autoSync,
          syncInterval: this.config.syncInterval
        }
      });

      if (this.config.debug) {
        console.log('FigmaSyncService initialized successfully');
      }
    } catch (error) {
      console.error('Failed to initialize FigmaSyncService:', error);
      throw error;
    }
  }

  /**
   * Perform manual sync from Figma
   */
  public async sync(): Promise<SyncResult> {
    if (!this.isInitialized) {
      throw new Error('FigmaSyncService not initialized');
    }

    return this.performSync();
  }

  /**
   * Get current design tokens from Figma
   */
  public async getCurrentTokens(): Promise<DesignTokens> {
    try {
      const tokens = await this.figmaClient.extractDesignTokens(this.config.fileId);
      return tokens;
    } catch (error) {
      console.error('Failed to get current tokens from Figma:', error);
      throw error;
    }
  }

  /**
   * Get components from Figma
   */
  public async getComponents(): Promise<FigmaComponent[]> {
    try {
      const components = await this.figmaClient.getComponents(this.config.fileId);
      return components;
    } catch (error) {
      console.error('Failed to get components from Figma:', error);
      throw error;
    }
  }

  /**
   * Update sync configuration
   */
  public updateConfig(updates: Partial<FigmaSyncConfig>): void {
    this.config = { ...this.config, ...updates };

    // Restart auto-sync if interval changed
    if (updates.syncInterval && this.config.autoSync) {
      this.stopAutoSync();
      this.startAutoSync();
    }

    // Toggle auto-sync if changed
    if (updates.autoSync !== undefined) {
      if (updates.autoSync) {
        this.startAutoSync();
      } else {
        this.stopAutoSync();
      }
    }
  }

  /**
   * Get sync status and statistics
   */
  public getSyncStatus(): {
    isInitialized: boolean;
    lastSync: Date | null;
    autoSyncEnabled: boolean;
    syncInterval: number;
  } {
    return {
      isInitialized: this.isInitialized,
      lastSync: this.lastSyncTime,
      autoSyncEnabled: this.config.autoSync,
      syncInterval: this.config.syncInterval
    };
  }

  /**
   * Start automatic synchronization
   */
  private startAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(async () => {
      try {
        await this.performSync();
      } catch (error) {
        console.error('Auto-sync failed:', error);
        this.eventBus.emit('design:figma:sync:error', {
          error: error.message,
          timestamp: new Date()
        });
      }
    }, this.config.syncInterval);

    if (this.config.debug) {
      console.log(`Auto-sync started with interval: ${this.config.syncInterval}ms`);
    }
  }

  /**
   * Stop automatic synchronization
   */
  private stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    if (this.config.debug) {
      console.log('Auto-sync stopped');
    }
  }

  /**
   * Perform the actual synchronization
   */
  private async performSync(): Promise<SyncResult> {
    const startTime = new Date();
    const result: SyncResult = {
      success: false,
      timestamp: startTime,
      tokensUpdated: 0,
      componentsUpdated: 0,
      errors: [],
      changes: []
    };

    try {
      if (this.config.debug) {
        console.log('Starting Figma sync...');
      }

      // Sync design tokens
      const tokenResult = await this.syncDesignTokens();
      result.tokensUpdated = tokenResult.updated;
      result.changes.push(...tokenResult.changes);

      // Sync components
      const componentResult = await this.syncComponents();
      result.componentsUpdated = componentResult.updated;
      result.changes.push(...componentResult.changes);

      result.success = true;
      this.lastSyncTime = startTime;

      // Emit success event
      this.eventBus.emit('design:figma:synced', {
        result,
        timestamp: startTime,
        components: result.componentsUpdated,
        tokens: result.tokensUpdated
      });

      if (this.config.debug) {
        console.log('Figma sync completed successfully:', result);
      }

    } catch (error) {
      result.success = false;
      result.errors.push(error.message);

      this.eventBus.emit('design:figma:sync:error', {
        error: error.message,
        timestamp: startTime,
        result
      });

      console.error('Figma sync failed:', error);
    }

    return result;
  }

  /**
   * Sync design tokens from Figma
   */
  private async syncDesignTokens(): Promise<{ updated: number; changes: SyncChange[] }> {
    try {
      const currentTokens = await this.figmaClient.extractDesignTokens(this.config.fileId);
      const changes: SyncChange[] = [];

      // Compare with existing tokens and detect changes
      const existingTokens = this.getStoredTokens();
      const tokenChanges = this.compareTokens(existingTokens, currentTokens);

      changes.push(...tokenChanges);

      // Store updated tokens
      this.storeTokens(currentTokens);

      // Emit token update event
      this.eventBus.emit('design:tokens:updated', {
        tokens: currentTokens,
        changes: tokenChanges,
        timestamp: new Date(),
        source: 'figma_sync'
      });

      return {
        updated: changes.length,
        changes
      };

    } catch (error) {
      console.error('Failed to sync design tokens:', error);
      throw error;
    }
  }

  /**
   * Sync components from Figma
   */
  private async syncComponents(): Promise<{ updated: number; changes: SyncChange[] }> {
    try {
      const currentComponents = await this.figmaClient.getComponents(this.config.fileId);
      const changes: SyncChange[] = [];

      // Process each component
      for (const component of currentComponents) {
        const existingComponent = this.getStoredComponent(component.id);

        if (!existingComponent) {
          changes.push({
            type: 'component',
            action: 'added',
            name: component.name,
            newValue: component
          });
        } else if (this.hasComponentChanged(existingComponent, component)) {
          changes.push({
            type: 'component',
            action: 'updated',
            name: component.name,
            oldValue: existingComponent,
            newValue: component
          });
        }

        // Store/update component
        this.storeComponent(component);
      }

      // Emit component update events
      if (changes.length > 0) {
        this.eventBus.emit('design:component:generated', {
          components: currentComponents,
          changes,
          timestamp: new Date(),
          source: 'figma_sync'
        });
      }

      return {
        updated: changes.length,
        changes
      };

    } catch (error) {
      console.error('Failed to sync components:', error);
      throw error;
    }
  }

  /**
   * Compare tokens to detect changes
   */
  private compareTokens(existing: DesignTokens | null, current: DesignTokens): SyncChange[] {
    const changes: SyncChange[] = [];

    if (!existing) {
      changes.push({
        type: 'token',
        action: 'added',
        name: 'all_tokens',
        newValue: current
      });
      return changes;
    }

    // Compare color tokens
    if (JSON.stringify(existing.colors) !== JSON.stringify(current.colors)) {
      changes.push({
        type: 'token',
        action: 'updated',
        name: 'colors',
        oldValue: existing.colors,
        newValue: current.colors
      });
    }

    // Compare typography tokens
    if (JSON.stringify(existing.typography) !== JSON.stringify(current.typography)) {
      changes.push({
        type: 'token',
        action: 'updated',
        name: 'typography',
        oldValue: existing.typography,
        newValue: current.typography
      });
    }

    // Compare spacing tokens
    if (JSON.stringify(existing.spacing) !== JSON.stringify(current.spacing)) {
      changes.push({
        type: 'token',
        action: 'updated',
        name: 'spacing',
        oldValue: existing.spacing,
        newValue: current.spacing
      });
    }

    // Compare shadow tokens
    if (JSON.stringify(existing.shadows) !== JSON.stringify(current.shadows)) {
      changes.push({
        type: 'token',
        action: 'updated',
        name: 'shadows',
        oldValue: existing.shadows,
        newValue: current.shadows
      });
    }

    return changes;
  }

  /**
   * Check if component has changed
   */
  private hasComponentChanged(existing: FigmaComponent, current: FigmaComponent): boolean {
    return JSON.stringify(existing) !== JSON.stringify(current);
  }

  /**
   * Storage methods for tokens and components
   */
  private getStoredTokens(): DesignTokens | null {
    try {
      const stored = localStorage.getItem('figma_design_tokens');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  private storeTokens(tokens: DesignTokens): void {
    try {
      localStorage.setItem('figma_design_tokens', JSON.stringify(tokens));
    } catch (error) {
      console.error('Failed to store design tokens:', error);
    }
  }

  private getStoredComponent(id: string): FigmaComponent | null {
    try {
      const stored = localStorage.getItem(`figma_component_${id}`);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  private storeComponent(component: FigmaComponent): void {
    try {
      localStorage.setItem(`figma_component_${component.id}`, JSON.stringify(component));
    } catch (error) {
      console.error('Failed to store component:', error);
    }
  }

  /**
   * Cleanup and destroy the service
   */
  public destroy(): void {
    this.stopAutoSync();
    this.isInitialized = false;
    FigmaSyncService.instance = null;
  }
}

// Export convenience functions
export const createFigmaSyncService = (config: FigmaSyncConfig): FigmaSyncService => {
  return FigmaSyncService.getInstance(config);
};

export const getFigmaSyncService = (): FigmaSyncService => {
  return FigmaSyncService.getInstance();
};

// Default configuration
export const defaultFigmaSyncConfig: Partial<FigmaSyncConfig> = {
  syncInterval: 300000, // 5 minutes
  autoSync: false,
  debug: process.env.NODE_ENV === 'development'
};