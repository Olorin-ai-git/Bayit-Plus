/**
 * Test suite for voiceSettingsStore (Zustand)
 * Tests voice preferences loading, updating, toggling,
 * clamping, optimistic updates, and error rollback.
 */

import { useVoiceSettingsStore } from '../voiceSettingsStore';

jest.mock('@/services/api', () => ({
  profilesService: {
    getVoicePreferences: jest.fn(),
    updateVoicePreferences: jest.fn(),
  },
}));

jest.mock('@/utils/logger', () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock('i18next', () => ({
  t: (key: string) => key,
}));

jest.mock('@bayit/shared-types/voiceModes', () => ({
  VoiceMode: {
    VOICE_ONLY: 'voice_only',
    HYBRID: 'hybrid',
    CLASSIC: 'classic',
  },
}));

const { profilesService } = require('@/services/api');

const DEFAULT_PREFERENCES = {
  voice_search_enabled: true,
  auto_subtitle: false,
  high_contrast_mode: false,
  text_size: 'medium',
  hold_button_mode: false,
  silence_threshold_ms: 2000,
  vad_sensitivity: 'low',
  wake_word_enabled: true,
  wake_word: 'buyit',
  wake_word_sensitivity: 0.7,
  wake_word_cooldown_ms: 2000,
  voice_mode: 'hybrid',
  tts_enabled: true,
  tts_volume: 1.0,
  tts_speed: 1.0,
  voice_feedback_enabled: true,
};

function resetStore() {
  useVoiceSettingsStore.setState({
    preferences: { ...DEFAULT_PREFERENCES } as any,
    loading: false,
    saving: false,
    error: null,
  });
}

describe('voiceSettingsStore', () => {
  beforeEach(() => {
    resetStore();
    jest.clearAllMocks();
  });

  // MARK: - Initial State

  describe('initial state', () => {
    it('starts with default preferences', () => {
      const prefs = useVoiceSettingsStore.getState().preferences;
      expect(prefs.voice_search_enabled).toBe(true);
      expect(prefs.text_size).toBe('medium');
      expect(prefs.vad_sensitivity).toBe('low');
      expect(prefs.voice_mode).toBe('hybrid');
      expect(prefs.tts_enabled).toBe(true);
      expect(prefs.tts_volume).toBe(1.0);
      expect(prefs.tts_speed).toBe(1.0);
    });

    it('starts not loading', () => {
      expect(useVoiceSettingsStore.getState().loading).toBe(false);
    });

    it('starts not saving', () => {
      expect(useVoiceSettingsStore.getState().saving).toBe(false);
    });

    it('starts with no error', () => {
      expect(useVoiceSettingsStore.getState().error).toBeNull();
    });
  });

  // MARK: - loadPreferences

  describe('loadPreferences', () => {
    it('loads preferences from API', async () => {
      const serverPrefs = {
        voice_search_enabled: false,
        text_size: 'large',
        vad_sensitivity: 'high',
      };
      profilesService.getVoicePreferences.mockResolvedValue(serverPrefs);

      await useVoiceSettingsStore.getState().loadPreferences();

      const prefs = useVoiceSettingsStore.getState().preferences;
      expect(prefs.voice_search_enabled).toBe(false);
      expect(prefs.text_size).toBe('large');
      expect(prefs.vad_sensitivity).toBe('high');
      // Defaults for fields not returned by API
      expect(prefs.tts_enabled).toBe(true);
    });

    it('sets loading during fetch', async () => {
      let resolveLoad: (value: any) => void;
      profilesService.getVoicePreferences.mockReturnValue(
        new Promise((resolve) => {
          resolveLoad = resolve;
        })
      );

      const loadPromise = useVoiceSettingsStore.getState().loadPreferences();
      expect(useVoiceSettingsStore.getState().loading).toBe(true);

      resolveLoad!({});
      await loadPromise;

      expect(useVoiceSettingsStore.getState().loading).toBe(false);
    });

    it('handles 401 gracefully with defaults', async () => {
      profilesService.getVoicePreferences.mockRejectedValue({
        response: { status: 401 },
      });

      await useVoiceSettingsStore.getState().loadPreferences();

      const state = useVoiceSettingsStore.getState();
      expect(state.error).toBeNull();
      expect(state.loading).toBe(false);
      expect(state.preferences.voice_search_enabled).toBe(true);
    });

    it('handles 401 with status field', async () => {
      profilesService.getVoicePreferences.mockRejectedValue({
        status: 401,
      });

      await useVoiceSettingsStore.getState().loadPreferences();

      expect(useVoiceSettingsStore.getState().error).toBeNull();
    });

    it('sets error on non-401 failure', async () => {
      profilesService.getVoicePreferences.mockRejectedValue({
        message: 'Server error',
      });

      await useVoiceSettingsStore.getState().loadPreferences();

      expect(useVoiceSettingsStore.getState().error).toBe('Server error');
      expect(useVoiceSettingsStore.getState().loading).toBe(false);
    });

    it('uses i18n fallback when error has no message', async () => {
      profilesService.getVoicePreferences.mockRejectedValue({});

      await useVoiceSettingsStore.getState().loadPreferences();

      expect(useVoiceSettingsStore.getState().error).toBe('errors.settings.loadFailed');
    });

    it('clears error before loading', async () => {
      useVoiceSettingsStore.setState({ error: 'Previous error' });
      profilesService.getVoicePreferences.mockResolvedValue({});

      await useVoiceSettingsStore.getState().loadPreferences();

      expect(useVoiceSettingsStore.getState().error).toBeNull();
    });
  });

  // MARK: - updatePreferences

  describe('updatePreferences', () => {
    it('optimistically updates preferences', async () => {
      profilesService.updateVoicePreferences.mockResolvedValue(undefined);

      await useVoiceSettingsStore.getState().updatePreferences({
        text_size: 'large',
      });

      expect(useVoiceSettingsStore.getState().preferences.text_size).toBe('large');
      expect(useVoiceSettingsStore.getState().saving).toBe(false);
    });

    it('sets saving during update', async () => {
      let resolveUpdate: (value: any) => void;
      profilesService.updateVoicePreferences.mockReturnValue(
        new Promise((resolve) => {
          resolveUpdate = resolve;
        })
      );

      const updatePromise = useVoiceSettingsStore.getState().updatePreferences({
        text_size: 'small',
      });

      // Optimistic update should be applied and saving should be true
      expect(useVoiceSettingsStore.getState().preferences.text_size).toBe('small');
      expect(useVoiceSettingsStore.getState().saving).toBe(true);

      resolveUpdate!(undefined);
      await updatePromise;

      expect(useVoiceSettingsStore.getState().saving).toBe(false);
    });

    it('rolls back on error', async () => {
      profilesService.updateVoicePreferences.mockRejectedValue({
        message: 'Save failed',
      });

      await useVoiceSettingsStore.getState().updatePreferences({
        text_size: 'large',
      });

      // Should rollback to original value
      expect(useVoiceSettingsStore.getState().preferences.text_size).toBe('medium');
      expect(useVoiceSettingsStore.getState().saving).toBe(false);
      expect(useVoiceSettingsStore.getState().error).toBe('Save failed');
    });

    it('uses i18n fallback when error has no message', async () => {
      profilesService.updateVoicePreferences.mockRejectedValue({});

      await useVoiceSettingsStore.getState().updatePreferences({
        text_size: 'large',
      });

      expect(useVoiceSettingsStore.getState().error).toBe('errors.settings.saveFailed');
    });

    it('preserves unchanged preferences', async () => {
      profilesService.updateVoicePreferences.mockResolvedValue(undefined);

      await useVoiceSettingsStore.getState().updatePreferences({
        vad_sensitivity: 'high',
      });

      const prefs = useVoiceSettingsStore.getState().preferences;
      expect(prefs.vad_sensitivity).toBe('high');
      expect(prefs.voice_search_enabled).toBe(true);
      expect(prefs.tts_enabled).toBe(true);
    });
  });

  // MARK: - toggleSetting

  describe('toggleSetting', () => {
    beforeEach(() => {
      profilesService.updateVoicePreferences.mockResolvedValue(undefined);
    });

    it('toggles voice_search_enabled', async () => {
      expect(useVoiceSettingsStore.getState().preferences.voice_search_enabled).toBe(true);

      await useVoiceSettingsStore.getState().toggleSetting('voice_search_enabled');
      expect(useVoiceSettingsStore.getState().preferences.voice_search_enabled).toBe(false);

      await useVoiceSettingsStore.getState().toggleSetting('voice_search_enabled');
      expect(useVoiceSettingsStore.getState().preferences.voice_search_enabled).toBe(true);
    });

    it('toggles auto_subtitle', async () => {
      expect(useVoiceSettingsStore.getState().preferences.auto_subtitle).toBe(false);

      await useVoiceSettingsStore.getState().toggleSetting('auto_subtitle');
      expect(useVoiceSettingsStore.getState().preferences.auto_subtitle).toBe(true);
    });

    it('toggles high_contrast_mode', async () => {
      await useVoiceSettingsStore.getState().toggleSetting('high_contrast_mode');
      expect(useVoiceSettingsStore.getState().preferences.high_contrast_mode).toBe(true);
    });

    it('toggles hold_button_mode', async () => {
      await useVoiceSettingsStore.getState().toggleSetting('hold_button_mode');
      expect(useVoiceSettingsStore.getState().preferences.hold_button_mode).toBe(true);
    });

    it('toggles wake_word_enabled', async () => {
      expect(useVoiceSettingsStore.getState().preferences.wake_word_enabled).toBe(true);

      await useVoiceSettingsStore.getState().toggleSetting('wake_word_enabled');
      expect(useVoiceSettingsStore.getState().preferences.wake_word_enabled).toBe(false);
    });

    it('toggles tts_enabled', async () => {
      expect(useVoiceSettingsStore.getState().preferences.tts_enabled).toBe(true);

      await useVoiceSettingsStore.getState().toggleSetting('tts_enabled');
      expect(useVoiceSettingsStore.getState().preferences.tts_enabled).toBe(false);
    });
  });

  // MARK: - Convenience Setters

  describe('setTextSize', () => {
    beforeEach(() => {
      profilesService.updateVoicePreferences.mockResolvedValue(undefined);
    });

    it('sets text size', async () => {
      await useVoiceSettingsStore.getState().setTextSize('large');
      expect(useVoiceSettingsStore.getState().preferences.text_size).toBe('large');
    });

    it('accepts all valid sizes', async () => {
      const sizes = ['small', 'medium', 'large'] as const;
      for (const size of sizes) {
        await useVoiceSettingsStore.getState().setTextSize(size);
        expect(useVoiceSettingsStore.getState().preferences.text_size).toBe(size);
      }
    });
  });

  describe('setVADSensitivity', () => {
    beforeEach(() => {
      profilesService.updateVoicePreferences.mockResolvedValue(undefined);
    });

    it('sets VAD sensitivity', async () => {
      await useVoiceSettingsStore.getState().setVADSensitivity('high');
      expect(useVoiceSettingsStore.getState().preferences.vad_sensitivity).toBe('high');
    });

    it('accepts all valid sensitivities', async () => {
      const sensitivities = ['low', 'medium', 'high'] as const;
      for (const s of sensitivities) {
        await useVoiceSettingsStore.getState().setVADSensitivity(s);
        expect(useVoiceSettingsStore.getState().preferences.vad_sensitivity).toBe(s);
      }
    });
  });

  // MARK: - Clamping

  describe('setSilenceThreshold', () => {
    beforeEach(() => {
      profilesService.updateVoicePreferences.mockResolvedValue(undefined);
    });

    it('sets silence threshold within range', async () => {
      await useVoiceSettingsStore.getState().setSilenceThreshold(3000);
      expect(useVoiceSettingsStore.getState().preferences.silence_threshold_ms).toBe(3000);
    });

    it('clamps to minimum 1000ms', async () => {
      await useVoiceSettingsStore.getState().setSilenceThreshold(500);
      expect(useVoiceSettingsStore.getState().preferences.silence_threshold_ms).toBe(1000);
    });

    it('clamps to maximum 5000ms', async () => {
      await useVoiceSettingsStore.getState().setSilenceThreshold(10000);
      expect(useVoiceSettingsStore.getState().preferences.silence_threshold_ms).toBe(5000);
    });
  });

  describe('setWakeWordSensitivity', () => {
    beforeEach(() => {
      profilesService.updateVoicePreferences.mockResolvedValue(undefined);
    });

    it('sets sensitivity within range', async () => {
      await useVoiceSettingsStore.getState().setWakeWordSensitivity(0.5);
      expect(useVoiceSettingsStore.getState().preferences.wake_word_sensitivity).toBe(0.5);
    });

    it('clamps to minimum 0', async () => {
      await useVoiceSettingsStore.getState().setWakeWordSensitivity(-0.5);
      expect(useVoiceSettingsStore.getState().preferences.wake_word_sensitivity).toBe(0);
    });

    it('clamps to maximum 1', async () => {
      await useVoiceSettingsStore.getState().setWakeWordSensitivity(1.5);
      expect(useVoiceSettingsStore.getState().preferences.wake_word_sensitivity).toBe(1);
    });
  });

  describe('setWakeWordCooldown', () => {
    beforeEach(() => {
      profilesService.updateVoicePreferences.mockResolvedValue(undefined);
    });

    it('sets cooldown within range', async () => {
      await useVoiceSettingsStore.getState().setWakeWordCooldown(3000);
      expect(useVoiceSettingsStore.getState().preferences.wake_word_cooldown_ms).toBe(3000);
    });

    it('clamps to minimum 500ms', async () => {
      await useVoiceSettingsStore.getState().setWakeWordCooldown(100);
      expect(useVoiceSettingsStore.getState().preferences.wake_word_cooldown_ms).toBe(500);
    });

    it('clamps to maximum 5000ms', async () => {
      await useVoiceSettingsStore.getState().setWakeWordCooldown(10000);
      expect(useVoiceSettingsStore.getState().preferences.wake_word_cooldown_ms).toBe(5000);
    });
  });

  describe('setTTSVolume', () => {
    beforeEach(() => {
      profilesService.updateVoicePreferences.mockResolvedValue(undefined);
    });

    it('sets volume within range', async () => {
      await useVoiceSettingsStore.getState().setTTSVolume(0.5);
      expect(useVoiceSettingsStore.getState().preferences.tts_volume).toBe(0.5);
    });

    it('clamps to minimum 0', async () => {
      await useVoiceSettingsStore.getState().setTTSVolume(-0.5);
      expect(useVoiceSettingsStore.getState().preferences.tts_volume).toBe(0);
    });

    it('clamps to maximum 1', async () => {
      await useVoiceSettingsStore.getState().setTTSVolume(1.5);
      expect(useVoiceSettingsStore.getState().preferences.tts_volume).toBe(1);
    });
  });

  describe('setTTSSpeed', () => {
    beforeEach(() => {
      profilesService.updateVoicePreferences.mockResolvedValue(undefined);
    });

    it('sets speed within range', async () => {
      await useVoiceSettingsStore.getState().setTTSSpeed(1.5);
      expect(useVoiceSettingsStore.getState().preferences.tts_speed).toBe(1.5);
    });

    it('clamps to minimum 0.5', async () => {
      await useVoiceSettingsStore.getState().setTTSSpeed(0.1);
      expect(useVoiceSettingsStore.getState().preferences.tts_speed).toBe(0.5);
    });

    it('clamps to maximum 2.0', async () => {
      await useVoiceSettingsStore.getState().setTTSSpeed(3.0);
      expect(useVoiceSettingsStore.getState().preferences.tts_speed).toBe(2.0);
    });
  });

  // MARK: - setMode

  describe('setMode', () => {
    beforeEach(() => {
      profilesService.updateVoicePreferences.mockResolvedValue(undefined);
    });

    it('sets voice mode', async () => {
      await useVoiceSettingsStore.getState().setMode('classic' as any);
      expect(useVoiceSettingsStore.getState().preferences.voice_mode).toBe('classic');
    });

    it('sets voice only mode', async () => {
      await useVoiceSettingsStore.getState().setMode('voice_only' as any);
      expect(useVoiceSettingsStore.getState().preferences.voice_mode).toBe('voice_only');
    });
  });

  // MARK: - Additional setters

  describe('setWakeWordEnabled', () => {
    beforeEach(() => {
      profilesService.updateVoicePreferences.mockResolvedValue(undefined);
    });

    it('enables wake word', async () => {
      useVoiceSettingsStore.setState({
        preferences: { ...DEFAULT_PREFERENCES, wake_word_enabled: false } as any,
      });

      await useVoiceSettingsStore.getState().setWakeWordEnabled(true);
      expect(useVoiceSettingsStore.getState().preferences.wake_word_enabled).toBe(true);
    });

    it('disables wake word', async () => {
      await useVoiceSettingsStore.getState().setWakeWordEnabled(false);
      expect(useVoiceSettingsStore.getState().preferences.wake_word_enabled).toBe(false);
    });
  });

  describe('setVoiceFeedbackEnabled', () => {
    beforeEach(() => {
      profilesService.updateVoicePreferences.mockResolvedValue(undefined);
    });

    it('enables voice feedback', async () => {
      useVoiceSettingsStore.setState({
        preferences: { ...DEFAULT_PREFERENCES, voice_feedback_enabled: false } as any,
      });

      await useVoiceSettingsStore.getState().setVoiceFeedbackEnabled(true);
      expect(useVoiceSettingsStore.getState().preferences.voice_feedback_enabled).toBe(true);
    });

    it('disables voice feedback', async () => {
      await useVoiceSettingsStore.getState().setVoiceFeedbackEnabled(false);
      expect(useVoiceSettingsStore.getState().preferences.voice_feedback_enabled).toBe(false);
    });
  });

  // MARK: - resetToDefaults

  describe('resetToDefaults', () => {
    it('resets all preferences to defaults', async () => {
      profilesService.updateVoicePreferences.mockResolvedValue(undefined);

      await useVoiceSettingsStore.getState().updatePreferences({
        voice_search_enabled: false,
        text_size: 'large',
        vad_sensitivity: 'high',
        tts_volume: 0.5,
        tts_speed: 1.5,
      });

      useVoiceSettingsStore.getState().resetToDefaults();

      const prefs = useVoiceSettingsStore.getState().preferences;
      expect(prefs.voice_search_enabled).toBe(true);
      expect(prefs.text_size).toBe('medium');
      expect(prefs.vad_sensitivity).toBe('low');
      expect(prefs.tts_volume).toBe(1.0);
      expect(prefs.tts_speed).toBe(1.0);
    });

    it('resets wake word settings', () => {
      useVoiceSettingsStore.setState({
        preferences: {
          ...DEFAULT_PREFERENCES,
          wake_word_enabled: false,
          wake_word_sensitivity: 0.3,
          wake_word_cooldown_ms: 4000,
        } as any,
      });

      useVoiceSettingsStore.getState().resetToDefaults();

      const prefs = useVoiceSettingsStore.getState().preferences;
      expect(prefs.wake_word_enabled).toBe(true);
      expect(prefs.wake_word_sensitivity).toBe(0.7);
      expect(prefs.wake_word_cooldown_ms).toBe(2000);
    });
  });
});
