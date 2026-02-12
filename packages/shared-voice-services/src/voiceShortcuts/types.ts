/**
 * Voice Shortcuts and Macros Types
 * Quick voice command system
 */

import type { LanguageCode } from '@olorin/shared-i18n';

export type ShortcutTriggerType = 'phrase' | 'keyword' | 'pattern';

export type MacroActionType =
  | 'navigate'
  | 'play'
  | 'pause'
  | 'search'
  | 'volume'
  | 'settings'
  | 'custom';

export interface ShortcutTrigger {
  type: ShortcutTriggerType;
  value: string; // Phrase, keyword, or regex pattern
  language?: LanguageCode; // Language-specific trigger
  caseSensitive?: boolean;
}

export interface MacroAction {
  type: MacroActionType;
  params: Record<string, unknown>;
  delay?: number; // Delay in ms before executing
}

export interface VoiceShortcut {
  id: string;
  name: string;
  description?: string;
  triggers: ShortcutTrigger[];
  action: MacroAction;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
  usageCount: number;
  lastUsed?: number;
}

export interface VoiceMacro {
  id: string;
  name: string;
  description?: string;
  triggers: ShortcutTrigger[];
  actions: MacroAction[]; // Sequence of actions
  enabled: boolean;
  loop?: boolean;
  stopCondition?: string; // Voice command to stop loop
  createdAt: number;
  updatedAt: number;
  usageCount: number;
  lastUsed?: number;
}

export interface ShortcutMatchResult {
  matched: boolean;
  shortcut?: VoiceShortcut;
  macro?: VoiceMacro;
  confidence: number; // 0.0 - 1.0
  trigger?: ShortcutTrigger;
}

export interface ShortcutsConfig {
  enabled: boolean;
  maxShortcutsPerUser: number;
  maxMacrosPerUser: number;
  enableFuzzyMatching: boolean;
  fuzzyThreshold: number; // 0.0 - 1.0
  enableSuggestions: boolean; // Suggest shortcuts based on usage
}

export interface ShortcutEvent {
  type: 'shortcut-triggered' | 'macro-started' | 'macro-completed' | 'macro-stopped';
  shortcutId?: string;
  macroId?: string;
  userId?: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}
