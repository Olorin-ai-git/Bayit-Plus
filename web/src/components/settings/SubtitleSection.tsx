/**
 * SubtitleSection
 * Subtitle display settings: language, font size, colors, position, AI translation.
 */

import { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { Subtitles, Type, Palette, Languages, Sparkles } from 'lucide-react';
import { colors, spacing, fontSize } from '@olorin/design-tokens';
import { SettingSection } from './shared/SettingSection';
import { SettingRow } from './shared/SettingRow';
import { SettingSelect } from './shared/SettingSelect';
import { SettingSlider } from './shared/SettingSlider';
import { profilesService } from '@/services/api';
import logger from '@/utils/logger';

interface SubtitlePrefs {
  enabled: boolean;
  language: string;
  font_size: number;
  text_color: string;
  background_color: string;
  background_opacity: number;
  position: string;
  font_style: string;
  ai_translation_enabled: boolean;
  ai_translation_language: string;
}

const DEFAULTS: SubtitlePrefs = {
  enabled: false,
  language: 'he',
  font_size: 18,
  text_color: '#FFFFFF',
  background_color: '#000000',
  background_opacity: 0.6,
  position: 'bottom',
  font_style: 'normal',
  ai_translation_enabled: false,
  ai_translation_language: 'en',
};

export function SubtitleSection() {
  const { t } = useTranslation();
  const { isRTL } = useDirection();
  const [prefs, setPrefs] = useState<SubtitlePrefs>(DEFAULTS);

  useEffect(() => {
    loadPrefs();
  }, []);

  const loadPrefs = async () => {
    try {
      const data = await profilesService.getSubtitlePreferences();
      setPrefs({ ...DEFAULTS, ...data });
    } catch (error) {
      logger.error('Failed to load subtitle prefs', 'SubtitleSection', error);
    }
  };

  const updatePref = async <K extends keyof SubtitlePrefs>(key: K, value: SubtitlePrefs[K]) => {
    const prev = prefs;
    setPrefs((p) => ({ ...p, [key]: value }));
    try {
      await profilesService.updateSubtitlePreferences({ ...prefs, [key]: value });
    } catch (error) {
      logger.error('Failed to update subtitle pref', 'SubtitleSection', error);
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

  const positionOptions = [
    { label: t('settings.subtitleBottom', 'Bottom'), value: 'bottom' },
    { label: t('settings.subtitleTop', 'Top'), value: 'top' },
  ];

  const fontStyleOptions = [
    { label: t('settings.fontNormal', 'Normal'), value: 'normal' },
    { label: t('settings.fontBold', 'Bold'), value: 'bold' },
    { label: t('settings.fontItalic', 'Italic'), value: 'italic' },
  ];

  return (
    <SettingSection title={t('settings.subtitles', 'Subtitles')} isRTL={isRTL}>
      <SettingRow
        type="toggle"
        icon={Subtitles}
        label={t('settings.showSubtitles', 'Show Subtitles')}
        value={prefs.enabled}
        onValueChange={(v) => updatePref('enabled', v)}
        isRTL={isRTL}
      />
      <SettingSelect
        icon={Languages}
        label={t('settings.subtitleLanguage', 'Subtitle Language')}
        options={languageOptions}
        value={prefs.language}
        onValueChange={(v) => updatePref('language', v)}
        isRTL={isRTL}
        disabled={!prefs.enabled}
      />
      <SettingSlider
        icon={Type}
        label={t('settings.fontSize', 'Font Size')}
        min={12}
        max={32}
        step={2}
        value={prefs.font_size}
        onValueChange={(v) => updatePref('font_size', v)}
        formatValue={(v) => `${v}px`}
        isRTL={isRTL}
        disabled={!prefs.enabled}
      />
      <SettingSlider
        icon={Palette}
        label={t('settings.backgroundOpacity', 'Background Opacity')}
        min={0}
        max={100}
        step={10}
        value={Math.round(prefs.background_opacity * 100)}
        onValueChange={(v) => updatePref('background_opacity', v / 100)}
        formatValue={(v) => `${v}%`}
        isRTL={isRTL}
        disabled={!prefs.enabled}
      />
      <SettingSelect
        label={t('settings.subtitlePosition', 'Position')}
        options={positionOptions}
        value={prefs.position}
        onValueChange={(v) => updatePref('position', v)}
        isRTL={isRTL}
        disabled={!prefs.enabled}
      />
      <SettingSelect
        label={t('settings.fontStyle', 'Font Style')}
        options={fontStyleOptions}
        value={prefs.font_style}
        onValueChange={(v) => updatePref('font_style', v)}
        isRTL={isRTL}
        disabled={!prefs.enabled}
      />
      <SettingRow
        type="toggle"
        icon={Sparkles}
        label={t('settings.aiSubtitleTranslation', 'AI Subtitle Translation')}
        description={t('settings.aiSubtitleTranslationDesc', 'Auto-translate subtitles using AI')}
        value={prefs.ai_translation_enabled}
        onValueChange={(v) => updatePref('ai_translation_enabled', v)}
        isRTL={isRTL}
        disabled={!prefs.enabled}
      />
      {prefs.ai_translation_enabled && prefs.enabled && (
        <SettingSelect
          icon={Languages}
          label={t('settings.translationLanguage', 'Translation Language')}
          options={languageOptions}
          value={prefs.ai_translation_language}
          onValueChange={(v) => updatePref('ai_translation_language', v)}
          isRTL={isRTL}
        />
      )}

      {/* Live Preview */}
      {prefs.enabled && (
        <View style={[styles.preview, prefs.position === 'top' && styles.previewTop]}>
          <Text style={[
            styles.previewText,
            { fontSize: prefs.font_size * 0.8 },
            prefs.font_style === 'bold' && styles.previewBold,
            prefs.font_style === 'italic' && styles.previewItalic,
          ]}>
            {t('settings.subtitlePreview', 'This is a subtitle preview')}
          </Text>
        </View>
      )}
    </SettingSection>
  );
}

const styles = StyleSheet.create({
  preview: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
  },
  previewTop: {
    marginTop: spacing.sm,
  },
  previewText: {
    color: '#FFFFFF',
    textAlign: 'center',
  },
  previewBold: {
    fontWeight: 'bold',
  },
  previewItalic: {
    fontStyle: 'italic',
  },
});
