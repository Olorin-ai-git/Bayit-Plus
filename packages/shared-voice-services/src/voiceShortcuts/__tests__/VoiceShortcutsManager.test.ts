/**
 * Voice Shortcuts Manager Tests
 */

import { VoiceShortcutsManager } from '../VoiceShortcutsManager';
import type { ShortcutTrigger, MacroAction } from '../types';

describe('VoiceShortcutsManager', () => {
  let manager: VoiceShortcutsManager;
  const mockStorageAdapter = {
    saveShortcuts: jest.fn().mockResolvedValue(undefined),
    loadShortcuts: jest.fn().mockResolvedValue([]),
    saveMacros: jest.fn().mockResolvedValue([]),
    loadMacros: jest.fn().mockResolvedValue([])
  };

  beforeEach(() => {
    manager = new VoiceShortcutsManager({
      enabled: true,
      enableFuzzyMatching: true,
      fuzzyThreshold: 0.8
    });
    manager.setStorageAdapter(mockStorageAdapter);
    jest.clearAllMocks();
  });

  describe('createShortcut', () => {
    it('should create new shortcut', async () => {
      const triggers: ShortcutTrigger[] = [
        { type: 'phrase', value: 'play music' }
      ];
      const action: MacroAction = {
        type: 'play',
        params: { content: 'music' }
      };

      const shortcut = await manager.createShortcut('user1', 'Play Music', triggers, action);

      expect(shortcut).toBeDefined();
      expect(shortcut.name).toBe('Play Music');
      expect(shortcut.triggers).toEqual(triggers);
      expect(shortcut.enabled).toBe(true);
      expect(mockStorageAdapter.saveShortcuts).toHaveBeenCalled();
    });

    it('should enforce max shortcuts limit', async () => {
      manager.updateConfig({ maxShortcutsPerUser: 2 });

      const triggers: ShortcutTrigger[] = [{ type: 'phrase', value: 'test' }];
      const action: MacroAction = { type: 'custom', params: {} };

      await manager.createShortcut('user1', 'Test 1', triggers, action);
      await manager.createShortcut('user1', 'Test 2', triggers, action);

      await expect(
        manager.createShortcut('user1', 'Test 3', triggers, action)
      ).rejects.toThrow('Maximum shortcuts limit reached');
    });
  });

  describe('createMacro', () => {
    it('should create new macro', async () => {
      const triggers: ShortcutTrigger[] = [
        { type: 'phrase', value: 'goodnight' }
      ];
      const actions: MacroAction[] = [
        { type: 'volume', params: { level: 0 }, delay: 0 },
        { type: 'pause', params: {}, delay: 1000 }
      ];

      const macro = await manager.createMacro('user1', 'Goodnight', triggers, actions);

      expect(macro).toBeDefined();
      expect(macro.name).toBe('Goodnight');
      expect(macro.actions.length).toBe(2);
      expect(mockStorageAdapter.saveMacros).toHaveBeenCalled();
    });

    it('should support loop option', async () => {
      const triggers: ShortcutTrigger[] = [{ type: 'phrase', value: 'repeat' }];
      const actions: MacroAction[] = [{ type: 'custom', params: {} }];

      const macro = await manager.createMacro('user1', 'Repeat', triggers, actions, {
        loop: true,
        stopCondition: 'stop'
      });

      expect(macro.loop).toBe(true);
      expect(macro.stopCondition).toBe('stop');
    });

    it('should enforce max macros limit', async () => {
      manager.updateConfig({ maxMacrosPerUser: 1 });

      const triggers: ShortcutTrigger[] = [{ type: 'phrase', value: 'test' }];
      const actions: MacroAction[] = [{ type: 'custom', params: {} }];

      await manager.createMacro('user1', 'Test 1', triggers, actions);

      await expect(
        manager.createMacro('user1', 'Test 2', triggers, actions)
      ).rejects.toThrow('Maximum macros limit reached');
    });
  });

  describe('matchCommand', () => {
    beforeEach(async () => {
      const triggers: ShortcutTrigger[] = [
        { type: 'phrase', value: 'play music' }
      ];
      const action: MacroAction = { type: 'play', params: { content: 'music' } };

      await manager.createShortcut('user1', 'Play Music', triggers, action);
    });

    it('should match exact phrase', async () => {
      const result = await manager.matchCommand('user1', 'play music');

      expect(result.matched).toBe(true);
      expect(result.shortcut).toBeDefined();
      expect(result.confidence).toBe(1.0);
    });

    it('should match case-insensitive by default', async () => {
      const result = await manager.matchCommand('user1', 'PLAY MUSIC');

      expect(result.matched).toBe(true);
      expect(result.confidence).toBe(1.0);
    });

    it('should not match when disabled', async () => {
      manager.updateConfig({ enabled: false });

      const result = await manager.matchCommand('user1', 'play music');

      expect(result.matched).toBe(false);
    });

    it('should use fuzzy matching for similar phrases', async () => {
      const result = await manager.matchCommand('user1', 'play musics');

      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should match language-specific triggers', async () => {
      const triggers: ShortcutTrigger[] = [
        { type: 'phrase', value: 'שלום', language: 'he' }
      ];
      const action: MacroAction = { type: 'custom', params: {} };

      await manager.createShortcut('user2', 'Hebrew Greeting', triggers, action);

      const result = await manager.matchCommand('user2', 'שלום', 'he');

      expect(result.matched).toBe(true);
    });

    it('should not match language-specific trigger with wrong language', async () => {
      const triggers: ShortcutTrigger[] = [
        { type: 'phrase', value: 'hello', language: 'en' }
      ];
      const action: MacroAction = { type: 'custom', params: {} };

      await manager.createShortcut('user2', 'English Greeting', triggers, action);

      const result = await manager.matchCommand('user2', 'hello', 'he');

      expect(result.matched).toBe(false);
    });
  });

  describe('keyword matching', () => {
    it('should match keyword anywhere in command', async () => {
      const triggers: ShortcutTrigger[] = [
        { type: 'keyword', value: 'music' }
      ];
      const action: MacroAction = { type: 'custom', params: {} };

      await manager.createShortcut('user1', 'Music Keyword', triggers, action);

      const result = await manager.matchCommand('user1', 'please play some music');

      expect(result.matched).toBe(true);
    });
  });

  describe('pattern matching', () => {
    it('should match regex pattern', async () => {
      const triggers: ShortcutTrigger[] = [
        { type: 'pattern', value: '^play \\w+$' }
      ];
      const action: MacroAction = { type: 'custom', params: {} };

      await manager.createShortcut('user1', 'Play Pattern', triggers, action);

      const result1 = await manager.matchCommand('user1', 'play music');
      const result2 = await manager.matchCommand('user1', 'play podcast');

      expect(result1.matched).toBe(true);
      expect(result2.matched).toBe(true);
    });

    it('should handle invalid regex gracefully', async () => {
      const triggers: ShortcutTrigger[] = [
        { type: 'pattern', value: '[invalid(' }
      ];
      const action: MacroAction = { type: 'custom', params: {} };

      await manager.createShortcut('user1', 'Invalid Pattern', triggers, action);

      const result = await manager.matchCommand('user1', 'test');

      expect(result.matched).toBe(false);
    });
  });

  describe('executeMacro', () => {
    it('should execute macro actions in sequence', async () => {
      const triggers: ShortcutTrigger[] = [{ type: 'phrase', value: 'test' }];
      const actions: MacroAction[] = [
        { type: 'custom', params: { step: 1 }, delay: 10 },
        { type: 'custom', params: { step: 2 }, delay: 10 }
      ];

      const macro = await manager.createMacro('user1', 'Test Macro', triggers, actions);

      const promise = manager.executeMacro('user1', macro.id);

      jest.useFakeTimers();
      jest.advanceTimersByTime(50);
      jest.useRealTimers();

      await promise;
    });

    it('should throw error for non-existent macro', async () => {
      await expect(
        manager.executeMacro('user1', 'non-existent')
      ).rejects.toThrow('Macro non-existent not found');
    });
  });

  describe('stopMacro', () => {
    it('should stop active macro', () => {
      manager.stopMacro('user1');
      // Should not throw
    });
  });

  describe('getShortcuts and getMacros', () => {
    it('should get user shortcuts', async () => {
      const triggers: ShortcutTrigger[] = [{ type: 'phrase', value: 'test' }];
      const action: MacroAction = { type: 'custom', params: {} };

      await manager.createShortcut('user1', 'Test 1', triggers, action);
      await manager.createShortcut('user1', 'Test 2', triggers, action);

      const shortcuts = await manager.getShortcuts('user1');

      expect(shortcuts.length).toBe(2);
    });

    it('should get user macros', async () => {
      const triggers: ShortcutTrigger[] = [{ type: 'phrase', value: 'test' }];
      const actions: MacroAction[] = [{ type: 'custom', params: {} }];

      await manager.createMacro('user1', 'Test 1', triggers, actions);
      await manager.createMacro('user1', 'Test 2', triggers, actions);

      const macros = await manager.getMacros('user1');

      expect(macros.length).toBe(2);
    });
  });

  describe('delete operations', () => {
    it('should delete shortcut', async () => {
      const triggers: ShortcutTrigger[] = [{ type: 'phrase', value: 'test' }];
      const action: MacroAction = { type: 'custom', params: {} };

      const shortcut = await manager.createShortcut('user1', 'Test', triggers, action);
      await manager.deleteShortcut('user1', shortcut.id);

      const shortcuts = await manager.getShortcuts('user1');
      expect(shortcuts.length).toBe(0);
      expect(mockStorageAdapter.saveShortcuts).toHaveBeenCalled();
    });

    it('should delete macro', async () => {
      const triggers: ShortcutTrigger[] = [{ type: 'phrase', value: 'test' }];
      const actions: MacroAction[] = [{ type: 'custom', params: {} }];

      const macro = await manager.createMacro('user1', 'Test', triggers, actions);
      await manager.deleteMacro('user1', macro.id);

      const macros = await manager.getMacros('user1');
      expect(macros.length).toBe(0);
      expect(mockStorageAdapter.saveMacros).toHaveBeenCalled();
    });
  });

  describe('event listeners', () => {
    it('should notify on shortcut trigger', async () => {
      const listener = jest.fn();
      manager.addEventListener(listener);

      const triggers: ShortcutTrigger[] = [{ type: 'phrase', value: 'test' }];
      const action: MacroAction = { type: 'custom', params: {} };

      await manager.createShortcut('user1', 'Test', triggers, action);
      await manager.matchCommand('user1', 'test');

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'shortcut-triggered',
          userId: 'user1'
        })
      );
    });

    it('should notify on macro start', async () => {
      const listener = jest.fn();
      manager.addEventListener(listener);

      const triggers: ShortcutTrigger[] = [{ type: 'phrase', value: 'test' }];
      const actions: MacroAction[] = [{ type: 'custom', params: {} }];

      await manager.createMacro('user1', 'Test', triggers, actions);
      await manager.matchCommand('user1', 'test');

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'macro-started',
          userId: 'user1'
        })
      );
    });

    it('should support unsubscribe', async () => {
      const listener = jest.fn();
      const unsubscribe = manager.addEventListener(listener);

      unsubscribe();

      const triggers: ShortcutTrigger[] = [{ type: 'phrase', value: 'test' }];
      const action: MacroAction = { type: 'custom', params: {} };

      await manager.createShortcut('user1', 'Test', triggers, action);
      await manager.matchCommand('user1', 'test');

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('fuzzy matching configuration', () => {
    it('should respect fuzzy threshold', async () => {
      manager.updateConfig({ fuzzyThreshold: 0.95 });

      const triggers: ShortcutTrigger[] = [{ type: 'phrase', value: 'hello' }];
      const action: MacroAction = { type: 'custom', params: {} };

      await manager.createShortcut('user1', 'Greeting', triggers, action);

      const result = await manager.matchCommand('user1', 'helo');

      expect(result.matched).toBe(false);
    });

    it('should disable fuzzy matching when configured', async () => {
      manager.updateConfig({ enableFuzzyMatching: false });

      const triggers: ShortcutTrigger[] = [{ type: 'phrase', value: 'hello' }];
      const action: MacroAction = { type: 'custom', params: {} };

      await manager.createShortcut('user1', 'Greeting', triggers, action);

      const result1 = await manager.matchCommand('user1', 'hello');
      const result2 = await manager.matchCommand('user1', 'helo');

      expect(result1.matched).toBe(true);
      expect(result2.matched).toBe(false);
    });
  });
});
