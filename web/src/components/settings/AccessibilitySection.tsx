/**
 * AccessibilitySection
 * Accessibility settings: text size, contrast, motion, captions, color blind mode.
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import {
  Accessibility, Type, Bold, Contrast, Minimize2,
  AudioLines, Subtitles, Eye,
} from 'lucide-react';
import { SettingSection } from './shared/SettingSection';
import { SettingRow } from './shared/SettingRow';
import { SettingSelect } from './shared/SettingSelect';
import { profilesService } from '@/services/api';
import logger from '@/utils/logger';

interface AccessibilityPrefs {
  large_text: boolean;
  bold_text: boolean;
  high_contrast: boolean;
  reduce_motion: boolean;
  audio_descriptions: boolean;
  closed_captions: boolean;
  color_blind_mode: string;
}

const DEFAULTS: AccessibilityPrefs = {
  large_text: false,
  bold_text: false,
  high_contrast: false,
  reduce_motion: false,
  audio_descriptions: false,
  closed_captions: false,
  color_blind_mode: 'none',
};

export function AccessibilitySection() {
  const { t } = useTranslation();
  const { isRTL } = useDirection();
  const [prefs, setPrefs] = useState<AccessibilityPrefs>(DEFAULTS);

  useEffect(() => {
    loadPrefs();
  }, []);

  const loadPrefs = async () => {
    try {
      const data = await profilesService.getAccessibilityPreferences();
      setPrefs({ ...DEFAULTS, ...data });
    } catch (error) {
      logger.error('Failed to load a11y prefs', 'AccessibilitySection', error);
    }
  };

  const updatePref = async <K extends keyof AccessibilityPrefs>(
    key: K, value: AccessibilityPrefs[K],
  ) => {
    const prev = prefs;
    setPrefs((p) => ({ ...p, [key]: value }));
    try {
      await profilesService.updateAccessibilityPreferences({ ...prefs, [key]: value });
    } catch (error) {
      logger.error('Failed to update a11y pref', 'AccessibilitySection', error);
      setPrefs(prev);
    }
  };

  const colorBlindOptions = [
    { label: t('settings.colorBlindNone', 'None'), value: 'none' },
    { label: t('settings.protanopia', 'Protanopia'), value: 'protanopia' },
    { label: t('settings.deuteranopia', 'Deuteranopia'), value: 'deuteranopia' },
    { label: t('settings.tritanopia', 'Tritanopia'), value: 'tritanopia' },
  ];

  return (
    <SettingSection title={t('settings.accessibility', 'Accessibility')} isRTL={isRTL}>
      <SettingRow
        type="toggle"
        icon={Type}
        label={t('settings.largeText', 'Large Text')}
        description={t('settings.largeTextDesc', 'Increase text size throughout the app')}
        value={prefs.large_text}
        onValueChange={(v) => updatePref('large_text', v)}
        isRTL={isRTL}
      />
      <SettingRow
        type="toggle"
        icon={Bold}
        label={t('settings.boldText', 'Bold Text')}
        value={prefs.bold_text}
        onValueChange={(v) => updatePref('bold_text', v)}
        isRTL={isRTL}
      />
      <SettingRow
        type="toggle"
        icon={Contrast}
        label={t('settings.highContrast', 'High Contrast')}
        description={t('settings.highContrastDesc', 'Increase contrast for better visibility')}
        value={prefs.high_contrast}
        onValueChange={(v) => updatePref('high_contrast', v)}
        isRTL={isRTL}
      />
      <SettingRow
        type="toggle"
        icon={Minimize2}
        label={t('settings.reduceMotion', 'Reduce Motion')}
        description={t('settings.reduceMotionDesc', 'Minimize animations and transitions')}
        value={prefs.reduce_motion}
        onValueChange={(v) => updatePref('reduce_motion', v)}
        isRTL={isRTL}
      />
      <SettingRow
        type="toggle"
        icon={AudioLines}
        label={t('settings.audioDescriptions', 'Audio Descriptions')}
        description={t('settings.audioDescriptionsDesc', 'Narrated descriptions of visual content')}
        value={prefs.audio_descriptions}
        onValueChange={(v) => updatePref('audio_descriptions', v)}
        isRTL={isRTL}
      />
      <SettingRow
        type="toggle"
        icon={Subtitles}
        label={t('settings.closedCaptions', 'Closed Captions')}
        value={prefs.closed_captions}
        onValueChange={(v) => updatePref('closed_captions', v)}
        isRTL={isRTL}
      />
      <SettingSelect
        icon={Eye}
        label={t('settings.colorBlindMode', 'Color Blind Mode')}
        description={t('settings.colorBlindModeDesc', 'Adjust colors for color vision deficiency')}
        options={colorBlindOptions}
        value={prefs.color_blind_mode}
        onValueChange={(v) => updatePref('color_blind_mode', v)}
        isRTL={isRTL}
      />
    </SettingSection>
  );
}
