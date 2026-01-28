/**
 * Settings Page
 *
 * Configure:
 * - Target language and voice
 * - Volume levels (original vs dubbed)
 * - Feature toggles (audio dubbing, live subtitles)
 * - UI preferences
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  GlassCard,
  GlassButton,
  GlassSelect,
  GlassSlider,
  GlassSwitch,
} from '@bayit/glass';
import { useSettingsStore } from '../stores/settingsStore';
import { apiClient } from '../../lib/api-client';
import { SUPPORTED_LANGUAGES } from '../../config/constants';
import { AVAILABLE_LANGUAGES, changeLanguage, getCurrentLanguage } from '../../config/i18n';
import type { VoiceOption } from '../../types/api';
import { logger } from '../../lib/logger';

interface SettingsPageProps {
  onBack: () => void;
}

/**
 * Settings Page Component
 */
export function SettingsPage({ onBack }: SettingsPageProps) {
  const { t } = useTranslation();
  const settingsStore = useSettingsStore();

  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState(true);
  const [uiLanguage, setUiLanguage] = useState(getCurrentLanguage());

  /**
   * Load available voices on mount
   */
  useEffect(() => {
    async function loadVoices() {
      try {
        const result = await apiClient.getVoices();
        setVoices(result.voices);
        setIsLoadingVoices(false);
      } catch (error) {
        logger.error('Failed to load voices', { error: String(error) });
        setIsLoadingVoices(false);
      }
    }

    loadVoices();
  }, []);

  /**
   * Handle UI language change
   */
  const handleUILanguageChange = async (language: string) => {
    try {
      await changeLanguage(language);
      setUiLanguage(language);
      logger.info('UI language changed', { language });
    } catch (error) {
      logger.error('Failed to change UI language', { error: String(error) });
    }
  };

  /**
   * Handle reset to defaults
   */
  const handleReset = async () => {
    if (confirm(t('settings.confirmReset', 'Reset all settings to defaults?'))) {
      await settingsStore.resetToDefaults();
      logger.info('Settings reset to defaults');
    }
  };

  // Prepare select options
  const targetLanguageOptions = SUPPORTED_LANGUAGES.map((lang) => ({
    value: lang.code,
    label: `${lang.flag} ${lang.name}`,
  }));

  const voiceOptions = voices
    .filter((voice) => voice.language === settingsStore.targetLanguage)
    .map((voice) => ({
      value: voice.id,
      label: `${voice.name} (${voice.gender})`,
    }));

  const uiLanguageOptions = AVAILABLE_LANGUAGES.map((lang) => ({
    value: lang.code,
    label: `${lang.flag} ${lang.nativeName}`,
  }));

  return (
    <div className="w-full p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <GlassButton
          variant="ghost"
          onPress={onBack}
          aria-label={t('common.back', 'Back')}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </GlassButton>

        <h1 className="text-2xl font-bold text-white">
          {t('settings.title', 'Settings')}
        </h1>
      </div>

      {/* UI Language */}
      <GlassCard className="p-4">
        <h2 className="text-lg font-bold text-white mb-4">
          {t('settings.uiLanguage', 'Interface Language')}
        </h2>

        <GlassSelect
          label={t('settings.uiLanguageLabel', 'Language')}
          options={uiLanguageOptions}
          value={uiLanguage}
          onChange={handleUILanguageChange}
          aria-label={t('settings.uiLanguageLabel', 'Language')}
        />
      </GlassCard>

      {/* Dubbing Configuration */}
      <GlassCard className="p-4">
        <h2 className="text-lg font-bold text-white mb-4">
          {t('settings.dubbingConfiguration', 'Dubbing Configuration')}
        </h2>

        <div className="space-y-4">
          {/* Target Language */}
          <div>
            <GlassSelect
              label={t('settings.targetLanguage', 'Target Language')}
              options={targetLanguageOptions}
              value={settingsStore.targetLanguage}
              onChange={(value) =>
                settingsStore.updateSettings({
                  targetLanguage: value as 'en' | 'es',
                })
              }
              aria-label={t('settings.targetLanguage', 'Target Language')}
            />
            <p className="text-white/60 text-xs mt-1">
              {t(
                'settings.targetLanguageHelp',
                'The language Hebrew content will be dubbed into'
              )}
            </p>
          </div>

          {/* Voice Selection */}
          <div>
            <GlassSelect
              label={t('settings.voice', 'Voice')}
              options={voiceOptions}
              value={settingsStore.voiceId}
              onChange={(value) =>
                settingsStore.updateSettings({ voiceId: value })
              }
              disabled={isLoadingVoices || voiceOptions.length === 0}
              aria-label={t('settings.voice', 'Voice')}
            />
            {isLoadingVoices && (
              <p className="text-white/60 text-xs mt-1">
                {t('common.loading', 'Loading...')}
              </p>
            )}
          </div>
        </div>
      </GlassCard>

      {/* Volume Controls */}
      <GlassCard className="p-4">
        <h2 className="text-lg font-bold text-white mb-4">
          {t('settings.volumeControls', 'Volume Controls')}
        </h2>

        <div className="space-y-6">
          {/* Original Volume */}
          <div>
            <label className="block text-white/80 text-sm mb-2">
              {t('settings.originalVolume', 'Original Volume')}:{' '}
              <span className="font-bold">{settingsStore.originalVolume}%</span>
            </label>
            <GlassSlider
              value={settingsStore.originalVolume}
              onChange={(value) =>
                settingsStore.updateSettings({ originalVolume: value })
              }
              min={0}
              max={100}
              step={5}
              aria-label={t('settings.originalVolume', 'Original Volume')}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={settingsStore.originalVolume}
              aria-valuetext={`${settingsStore.originalVolume}%`}
            />
            <p className="text-white/60 text-xs mt-1">
              {t(
                'settings.originalVolumeHelp',
                'Volume of the original Hebrew audio'
              )}
            </p>
          </div>

          {/* Dubbed Volume */}
          <div>
            <label className="block text-white/80 text-sm mb-2">
              {t('settings.dubbedVolume', 'Dubbed Volume')}:{' '}
              <span className="font-bold">{settingsStore.dubbedVolume}%</span>
            </label>
            <GlassSlider
              value={settingsStore.dubbedVolume}
              onChange={(value) =>
                settingsStore.updateSettings({ dubbedVolume: value })
              }
              min={0}
              max={100}
              step={5}
              aria-label={t('settings.dubbedVolume', 'Dubbed Volume')}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={settingsStore.dubbedVolume}
              aria-valuetext={`${settingsStore.dubbedVolume}%`}
            />
            <p className="text-white/60 text-xs mt-1">
              {t(
                'settings.dubbedVolumeHelp',
                'Volume of the dubbed audio in your language'
              )}
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Feature Toggles */}
      <GlassCard className="p-4">
        <h2 className="text-lg font-bold text-white mb-4">
          {t('settings.features', 'Features')}
        </h2>

        <div className="space-y-4">
          {/* Audio Dubbing */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-white font-medium">
                {t('settings.audioDubbing', 'Audio Dubbing')}
              </h3>
              <p className="text-white/60 text-xs mt-0.5">
                {t(
                  'settings.audioDubbingHelp',
                  'Replace original audio with dubbed voice'
                )}
              </p>
            </div>
            <GlassSwitch
              checked={settingsStore.audioDubbing}
              onChange={(checked) =>
                settingsStore.updateSettings({ audioDubbing: checked })
              }
              aria-label={t('settings.audioDubbing', 'Audio Dubbing')}
            />
          </div>

          {/* Live Subtitles */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-white font-medium">
                {t('settings.liveSubtitles', 'Live Subtitles')}
              </h3>
              <p className="text-white/60 text-xs mt-0.5">
                {t(
                  'settings.liveSubtitlesHelp',
                  'Show real-time translated text overlay'
                )}
              </p>
            </div>
            <GlassSwitch
              checked={settingsStore.liveSubtitles}
              onChange={(checked) =>
                settingsStore.updateSettings({ liveSubtitles: checked })
              }
              aria-label={t('settings.liveSubtitles', 'Live Subtitles')}
            />
          </div>

          {/* Show Transcript */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-white font-medium">
                {t('settings.showTranscript', 'Show Transcript')}
              </h3>
              <p className="text-white/60 text-xs mt-0.5">
                {t(
                  'settings.showTranscriptHelp',
                  'Display original Hebrew transcript'
                )}
              </p>
            </div>
            <GlassSwitch
              checked={settingsStore.showTranscript}
              onChange={(checked) =>
                settingsStore.updateSettings({ showTranscript: checked })
              }
              aria-label={t('settings.showTranscript', 'Show Transcript')}
            />
          </div>

          {/* Auto Start */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-white font-medium">
                {t('settings.autoStart', 'Auto Start')}
              </h3>
              <p className="text-white/60 text-xs mt-0.5">
                {t(
                  'settings.autoStartHelp',
                  'Automatically start dubbing when video plays'
                )}
              </p>
            </div>
            <GlassSwitch
              checked={settingsStore.autoStart}
              onChange={(checked) =>
                settingsStore.updateSettings({ autoStart: checked })
              }
              aria-label={t('settings.autoStart', 'Auto Start')}
            />
          </div>
        </div>
      </GlassCard>

      {/* Reset Button */}
      <GlassButton
        variant="secondary"
        onPress={handleReset}
        className="w-full"
        aria-label={t('settings.resetToDefaults', 'Reset to Defaults')}
      >
        {t('settings.resetToDefaults', 'Reset to Defaults')}
      </GlassButton>
    </div>
  );
}
