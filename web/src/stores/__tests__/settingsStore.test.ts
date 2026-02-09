/**
 * Test suite for settingsStore (Zustand)
 * Tests user preferences for comprehension quiz settings
 * and reset to defaults behavior.
 */

import { useSettingsStore } from '../settingsStore';

function resetStore() {
  useSettingsStore.setState({
    comprehensionQuizEnabled: true,
    comprehensionQuizFrequency: 'normal',
  });
}

describe('settingsStore', () => {
  beforeEach(() => {
    resetStore();
    jest.clearAllMocks();
  });

  // MARK: - Initial State

  describe('initial state', () => {
    it('starts with comprehension quiz enabled', () => {
      expect(useSettingsStore.getState().comprehensionQuizEnabled).toBe(true);
    });

    it('starts with normal quiz frequency', () => {
      expect(useSettingsStore.getState().comprehensionQuizFrequency).toBe('normal');
    });
  });

  // MARK: - updateSettings

  describe('updateSettings', () => {
    it('updates comprehensionQuizEnabled', async () => {
      await useSettingsStore.getState().updateSettings({
        comprehensionQuizEnabled: false,
      });

      expect(useSettingsStore.getState().comprehensionQuizEnabled).toBe(false);
    });

    it('updates comprehensionQuizFrequency', async () => {
      await useSettingsStore.getState().updateSettings({
        comprehensionQuizFrequency: 'high',
      });

      expect(useSettingsStore.getState().comprehensionQuizFrequency).toBe('high');
    });

    it('updates multiple settings at once', async () => {
      await useSettingsStore.getState().updateSettings({
        comprehensionQuizEnabled: false,
        comprehensionQuizFrequency: 'off',
      });

      const state = useSettingsStore.getState();
      expect(state.comprehensionQuizEnabled).toBe(false);
      expect(state.comprehensionQuizFrequency).toBe('off');
    });

    it('preserves unchanged settings when updating partially', async () => {
      await useSettingsStore.getState().updateSettings({
        comprehensionQuizFrequency: 'low',
      });

      const state = useSettingsStore.getState();
      expect(state.comprehensionQuizEnabled).toBe(true);
      expect(state.comprehensionQuizFrequency).toBe('low');
    });

    it('handles all frequency values', async () => {
      const frequencies = ['off', 'low', 'normal', 'high'] as const;

      for (const freq of frequencies) {
        await useSettingsStore.getState().updateSettings({
          comprehensionQuizFrequency: freq,
        });
        expect(useSettingsStore.getState().comprehensionQuizFrequency).toBe(freq);
      }
    });
  });

  // MARK: - resetToDefaults

  describe('resetToDefaults', () => {
    it('resets all settings to defaults', async () => {
      await useSettingsStore.getState().updateSettings({
        comprehensionQuizEnabled: false,
        comprehensionQuizFrequency: 'off',
      });

      useSettingsStore.getState().resetToDefaults();

      const state = useSettingsStore.getState();
      expect(state.comprehensionQuizEnabled).toBe(true);
      expect(state.comprehensionQuizFrequency).toBe('normal');
    });

    it('resets after single field change', async () => {
      await useSettingsStore.getState().updateSettings({
        comprehensionQuizFrequency: 'high',
      });

      useSettingsStore.getState().resetToDefaults();

      expect(useSettingsStore.getState().comprehensionQuizFrequency).toBe('normal');
    });
  });
});
