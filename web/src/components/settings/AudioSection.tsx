/**
 * AudioSection
 * Audio settings: preferred language, quality, normalization, dubbing preferences.
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { Volume2, Languages, Headphones, Mic } from 'lucide-react';
import { SettingSection } from './shared/SettingSection';
import { SettingRow } from './shared/SettingRow';
import { SettingSelect } from './shared/SettingSelect';
import { profilesService } from '@/services/api';
import logger from '@/utils/logger';

interface AudioPrefs {
  preferred_language: string;
  quality: string;
  volume_normalization: boolean;
  prefer_dubbed: boolean;
  dubbing_language: string;
}

const DEFAULTS: AudioPrefs = {
  preferred_language: 'he',
  quality: 'auto',
  volume_normalization: false,
  prefer_dubbed: false,
  dubbing_language: 'en',
};

export function AudioSection() {
  const { t } = useTranslation();
  const { isRTL } = useDirection();
  const [prefs, setPrefs] = useState<AudioPrefs>(DEFAULTS);

  useEffect(() => {
    loadPrefs();
  }, []);

  const loadPrefs = async () => {
    try {
      const data = await profilesService.getAudioPreferences();
      setPrefs({ ...DEFAULTS, ...data });
    } catch (error) {
      logger.error('Failed to load audio prefs', 'AudioSection', error);
    }
  };

  const updatePref = async <K extends keyof AudioPrefs>(key: K, value: AudioPrefs[K]) => {
    const prev = prefs;
    setPrefs((p) => ({ ...p, [key]: value }));
    try {
      await profilesService.updateAudioPreferences({ ...prefs, [key]: value });
    } catch (error) {
      logger.error('Failed to update audio pref', 'AudioSection', error);
      setPrefs(prev);
    }
  };

  const languageOptions = [
    { label: 'Hebrew', value: 'he' },
    { label: 'English', value: 'en' },
    { label: 'Spanish', value: 'es' },
    { label: 'French', value: 'fr' },
    { label: 'Russian', value: 'ru' },
  ];

  const qualityOptions = [
    { label: t('settings.qualityAuto', 'Auto'), value: 'auto' },
    { label: t('settings.qualityHigh', 'High (320kbps)'), value: 'high' },
    { label: t('settings.qualityMedium', 'Medium (192kbps)'), value: 'medium' },
    { label: t('settings.qualityLow', 'Low (128kbps)'), value: 'low' },
  ];

  return (
    <SettingSection title={t('settings.audio', 'Audio')} isRTL={isRTL}>
      <SettingSelect
        icon={Languages}
        label={t('settings.preferredAudioLanguage', 'Preferred Audio Language')}
        options={languageOptions}
        value={prefs.preferred_language}
        onValueChange={(v) => updatePref('preferred_language', v)}
        isRTL={isRTL}
      />
      <SettingSelect
        icon={Headphones}
        label={t('settings.audioQuality', 'Audio Quality')}
        options={qualityOptions}
        value={prefs.quality}
        onValueChange={(v) => updatePref('quality', v)}
        isRTL={isRTL}
      />
      <SettingRow
        type="toggle"
        icon={Volume2}
        label={t('settings.volumeNormalization', 'Volume Normalization')}
        description={t('settings.volumeNormalizationDesc', 'Equalize volume across content')}
        value={prefs.volume_normalization}
        onValueChange={(v) => updatePref('volume_normalization', v)}
        isRTL={isRTL}
      />
      <SettingRow
        type="toggle"
        icon={Mic}
        label={t('settings.preferDubbed', 'Prefer Dubbed Audio')}
        description={t('settings.preferDubbedDesc', 'Use AI-dubbed audio when available')}
        value={prefs.prefer_dubbed}
        onValueChange={(v) => updatePref('prefer_dubbed', v)}
        isRTL={isRTL}
      />
      {prefs.prefer_dubbed && (
        <SettingSelect
          icon={Languages}
          label={t('settings.dubbingLanguage', 'Dubbing Language')}
          options={languageOptions}
          value={prefs.dubbing_language}
          onValueChange={(v) => updatePref('dubbing_language', v)}
          isRTL={isRTL}
        />
      )}
    </SettingSection>
  );
}
