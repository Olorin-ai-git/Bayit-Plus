/**
 * Voice Shortcuts Manager
 * Manages voice shortcuts and macros for quick commands
 */

import type { LanguageCode } from '@olorin/shared-i18n';
import type {
  VoiceShortcut,
  VoiceMacro,
  ShortcutTrigger,
  MacroAction,
  ShortcutMatchResult,
  ShortcutsConfig,
  ShortcutEvent
} from './types';

interface StorageAdapter {
  saveShortcuts(userId: string, shortcuts: VoiceShortcut[]): Promise<void>;
  loadShortcuts(userId: string): Promise<VoiceShortcut[]>;
  saveMacros(userId: string, macros: VoiceMacro[]): Promise<void>;
  loadMacros(userId: string): Promise<VoiceMacro[]>;
}

export class VoiceShortcutsManager {
  private config: Required<ShortcutsConfig>;
  private shortcuts: Map<string, VoiceShortcut[]> = new Map(); // userId -> shortcuts
  private macros: Map<string, VoiceMacro[]> = new Map(); // userId -> macros
  private activeMacros: Map<string, string> = new Map(); // userId -> macroId
  private storageAdapter: StorageAdapter | null = null;
  private listeners: Set<(event: ShortcutEvent) => void> = new Set();

  constructor(config: Partial<ShortcutsConfig> = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      maxShortcutsPerUser: config.maxShortcutsPerUser || 50,
      maxMacrosPerUser: config.maxMacrosPerUser || 20,
      enableFuzzyMatching: config.enableFuzzyMatching ?? true,
      fuzzyThreshold: config.fuzzyThreshold || 0.8,
      enableSuggestions: config.enableSuggestions ?? true
    };
  }

  /**
   * Set storage adapter
   */
  setStorageAdapter(adapter: StorageAdapter): void {
    this.storageAdapter = adapter;
  }

  /**
   * Create voice shortcut
   */
  async createShortcut(
    userId: string,
    name: string,
    triggers: ShortcutTrigger[],
    action: MacroAction,
    description?: string
  ): Promise<VoiceShortcut> {
    const userShortcuts = this.shortcuts.get(userId) || [];

    if (userShortcuts.length >= this.config.maxShortcutsPerUser) {
      throw new Error(`Maximum shortcuts limit reached (${this.config.maxShortcutsPerUser})`);
    }

    const now = Date.now();
    const shortcut: VoiceShortcut = {
      id: this.generateId(),
      name,
      description,
      triggers,
      action,
      enabled: true,
      createdAt: now,
      updatedAt: now,
      usageCount: 0
    };

    userShortcuts.push(shortcut);
    this.shortcuts.set(userId, userShortcuts);

    if (this.storageAdapter) {
      await this.storageAdapter.saveShortcuts(userId, userShortcuts);
    }

    return shortcut;
  }

  /**
   * Create voice macro
   */
  async createMacro(
    userId: string,
    name: string,
    triggers: ShortcutTrigger[],
    actions: MacroAction[],
    options: {
      description?: string;
      loop?: boolean;
      stopCondition?: string;
    } = {}
  ): Promise<VoiceMacro> {
    const userMacros = this.macros.get(userId) || [];

    if (userMacros.length >= this.config.maxMacrosPerUser) {
      throw new Error(`Maximum macros limit reached (${this.config.maxMacrosPerUser})`);
    }

    const now = Date.now();
    const macro: VoiceMacro = {
      id: this.generateId(),
      name,
      description: options.description,
      triggers,
      actions,
      enabled: true,
      loop: options.loop,
      stopCondition: options.stopCondition,
      createdAt: now,
      updatedAt: now,
      usageCount: 0
    };

    userMacros.push(macro);
    this.macros.set(userId, userMacros);

    if (this.storageAdapter) {
      await this.storageAdapter.saveMacros(userId, userMacros);
    }

    return macro;
  }

  /**
   * Match voice command against shortcuts and macros
   */
  async matchCommand(
    userId: string,
    command: string,
    language?: LanguageCode
  ): Promise<ShortcutMatchResult> {
    if (!this.config.enabled) {
      return { matched: false, confidence: 0 };
    }

    await this.ensureLoaded(userId);

    const shortcuts = this.shortcuts.get(userId) || [];
    const macros = this.macros.get(userId) || [];

    // Check shortcuts first
    for (const shortcut of shortcuts) {
      if (!shortcut.enabled) continue;

      const match = this.matchTriggers(shortcut.triggers, command, language);
      if (match.matched) {
        shortcut.usageCount++;
        shortcut.lastUsed = Date.now();

        this.notifyListeners({
          type: 'shortcut-triggered',
          shortcutId: shortcut.id,
          userId,
          timestamp: Date.now()
        });

        return {
          matched: true,
          shortcut,
          confidence: match.confidence,
          trigger: match.trigger
        };
      }
    }

    // Check macros
    for (const macro of macros) {
      if (!macro.enabled) continue;

      const match = this.matchTriggers(macro.triggers, command, language);
      if (match.matched) {
        macro.usageCount++;
        macro.lastUsed = Date.now();

        this.notifyListeners({
          type: 'macro-started',
          macroId: macro.id,
          userId,
          timestamp: Date.now()
        });

        return {
          matched: true,
          macro,
          confidence: match.confidence,
          trigger: match.trigger
        };
      }
    }

    return { matched: false, confidence: 0 };
  }

  /**
   * Execute macro
   */
  async executeMacro(userId: string, macroId: string): Promise<void> {
    const userMacros = this.macros.get(userId) || [];
    const macro = userMacros.find(m => m.id === macroId);

    if (!macro) {
      throw new Error(`Macro ${macroId} not found`);
    }

    this.activeMacros.set(userId, macroId);

    for (const action of macro.actions) {
      if (action.delay) {
        await new Promise(resolve => setTimeout(resolve, action.delay));
      }

      // Check if macro was stopped
      if (this.activeMacros.get(userId) !== macroId) {
        this.notifyListeners({
          type: 'macro-stopped',
          macroId,
          userId,
          timestamp: Date.now()
        });
        return;
      }
    }

    this.activeMacros.delete(userId);

    this.notifyListeners({
      type: 'macro-completed',
      macroId,
      userId,
      timestamp: Date.now()
    });
  }

  /**
   * Stop active macro
   */
  stopMacro(userId: string): void {
    this.activeMacros.delete(userId);
  }

  /**
   * Get user shortcuts
   */
  async getShortcuts(userId: string): Promise<VoiceShortcut[]> {
    await this.ensureLoaded(userId);
    return [...(this.shortcuts.get(userId) || [])];
  }

  /**
   * Get user macros
   */
  async getMacros(userId: string): Promise<VoiceMacro[]> {
    await this.ensureLoaded(userId);
    return [...(this.macros.get(userId) || [])];
  }

  /**
   * Delete shortcut
   */
  async deleteShortcut(userId: string, shortcutId: string): Promise<void> {
    const userShortcuts = this.shortcuts.get(userId) || [];
    const filtered = userShortcuts.filter(s => s.id !== shortcutId);

    this.shortcuts.set(userId, filtered);

    if (this.storageAdapter) {
      await this.storageAdapter.saveShortcuts(userId, filtered);
    }
  }

  /**
   * Delete macro
   */
  async deleteMacro(userId: string, macroId: string): Promise<void> {
    const userMacros = this.macros.get(userId) || [];
    const filtered = userMacros.filter(m => m.id !== macroId);

    this.macros.set(userId, filtered);

    if (this.storageAdapter) {
      await this.storageAdapter.saveMacros(userId, filtered);
    }
  }

  /**
   * Add event listener
   */
  addEventListener(listener: (event: ShortcutEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ShortcutsConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Match triggers against command
   */
  private matchTriggers(
    triggers: ShortcutTrigger[],
    command: string,
    language?: LanguageCode
  ): { matched: boolean; confidence: number; trigger?: ShortcutTrigger } {
    for (const trigger of triggers) {
      if (trigger.language && trigger.language !== language) {
        continue;
      }

      const confidence = this.calculateMatchConfidence(trigger, command);

      if (confidence >= this.config.fuzzyThreshold) {
        return { matched: true, confidence, trigger };
      }
    }

    return { matched: false, confidence: 0 };
  }

  /**
   * Calculate match confidence
   */
  private calculateMatchConfidence(trigger: ShortcutTrigger, command: string): number {
    const triggerValue = trigger.caseSensitive ? trigger.value : trigger.value.toLowerCase();
    const commandValue = trigger.caseSensitive ? command : command.toLowerCase();

    if (trigger.type === 'phrase') {
      return commandValue === triggerValue ? 1.0 : this.fuzzyMatch(triggerValue, commandValue);
    }

    if (trigger.type === 'keyword') {
      return commandValue.includes(triggerValue) ? 1.0 : this.fuzzyMatch(triggerValue, commandValue);
    }

    if (trigger.type === 'pattern') {
      try {
        const regex = new RegExp(trigger.value, trigger.caseSensitive ? '' : 'i');
        return regex.test(command) ? 1.0 : 0.0;
      } catch {
        return 0.0;
      }
    }

    return 0.0;
  }

  /**
   * Fuzzy string matching (Levenshtein distance)
   */
  private fuzzyMatch(str1: string, str2: string): number {
    if (!this.config.enableFuzzyMatching) return 0.0;

    const maxLen = Math.max(str1.length, str2.length);
    if (maxLen === 0) return 1.0;

    const distance = this.levenshteinDistance(str1, str2);
    return 1.0 - distance / maxLen;
  }

  /**
   * Levenshtein distance calculation
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Ensure data is loaded from storage
   */
  private async ensureLoaded(userId: string): Promise<void> {
    if (this.shortcuts.has(userId) && this.macros.has(userId)) {
      return;
    }

    if (this.storageAdapter) {
      const [shortcuts, macros] = await Promise.all([
        this.storageAdapter.loadShortcuts(userId),
        this.storageAdapter.loadMacros(userId)
      ]);

      this.shortcuts.set(userId, shortcuts);
      this.macros.set(userId, macros);
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }

  /**
   * Notify event listeners
   */
  private notifyListeners(event: ShortcutEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        // Silently catch listener errors
      }
    }
  }
}

// Singleton instance
export const voiceShortcutsManager = new VoiceShortcutsManager();
