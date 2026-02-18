/**
 * AIFeaturesSection
 * AI feature settings: beta credits, dubbing config, trivia config.
 */

import { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import {
  Sparkles, Mic, Brain, Coins, BarChart3, Sliders,
} from 'lucide-react';
import { colors, spacing, fontSize } from '@olorin/design-tokens';
import { SettingSection } from './shared/SettingSection';
import { SettingRow } from './shared/SettingRow';
import { SettingSelect } from './shared/SettingSelect';
import { SettingSlider } from './shared/SettingSlider';
import { useAISettingsStore } from '@/stores/aiSettingsStore';
import api from '@/services/api';
import logger from '@/utils/logger';

interface DubbingConfig {
  auto_dub: boolean;
  voice_preference: string;
  original_audio_mix: number;
}

interface TriviaConfig {
  enabled: boolean;
  auto_show: boolean;
  difficulty: string;
}

const DUBBING_DEFAULTS: DubbingConfig = {
  auto_dub: false,
  voice_preference: 'default',
  original_audio_mix: 30,
};

const TRIVIA_DEFAULTS: TriviaConfig = {
  enabled: true,
  auto_show: true,
  difficulty: 'medium',
};

export function AIFeaturesSection() {
  const { t } = useTranslation();
  const { isRTL } = useDirection();
  const { preferences: aiPrefs, toggleSetting, loadPreferences } = useAISettingsStore();
  const [dubbing, setDubbing] = useState<DubbingConfig>(DUBBING_DEFAULTS);
  const [trivia, setTrivia] = useState<TriviaConfig>(TRIVIA_DEFAULTS);
  const [creditsBalance, setCreditsBalance] = useState<number>(0);

  useEffect(() => {
    loadPreferences();
    loadCredits();
  }, []);

  const loadCredits = async () => {
    try {
      const data = await api.get('/beta/credits/balance');
      setCreditsBalance(data?.balance ?? 0);
    } catch (error) {
      logger.error('Failed to load credits', 'AIFeaturesSection', error);
    }
  };

  const voiceOptions = [
    { label: t('settings.voiceDefault', 'Default'), value: 'default' },
    { label: t('settings.voiceMale', 'Male'), value: 'male' },
    { label: t('settings.voiceFemale', 'Female'), value: 'female' },
  ];

  const difficultyOptions = [
    { label: t('settings.easy', 'Easy'), value: 'easy' },
    { label: t('settings.medium', 'Medium'), value: 'medium' },
    { label: t('settings.hard', 'Hard'), value: 'hard' },
  ];

  return (
    <SettingSection title={t('settings.aiFeatures', 'AI Features')} isRTL={isRTL}>
      {/* Beta Credits */}
      <View style={styles.creditsBar}>
        <View style={[styles.creditsRow, isRTL && styles.rowReverse]}>
          <Coins size={18} color={colors.primary.DEFAULT} />
          <Text style={styles.creditsLabel}>
            {t('settings.betaCredits', 'Beta Credits')}
          </Text>
          <Text style={styles.creditsValue}>{creditsBalance}</Text>
        </View>
        <SettingRow
          type="navigation"
          icon={BarChart3}
          label={t('settings.usageHistory', 'Usage History')}
          onPress={() => {}}
          isRTL={isRTL}
        />
      </View>

      {/* AI Assistant */}
      <SettingRow
        type="toggle"
        icon={Brain}
        label={t('settings.aiAssistant', 'AI Assistant')}
        description={t('settings.aiAssistantDesc', 'Enable AI-powered chatbot')}
        value={aiPrefs.chatbot_enabled}
        onValueChange={() => toggleSetting('chatbot_enabled')}
        isRTL={isRTL}
      />
      <SettingRow
        type="toggle"
        icon={Sparkles}
        label={t('settings.personalizedRecommendations', 'Personalized Recommendations')}
        value={aiPrefs.personalized_recommendations}
        onValueChange={() => toggleSetting('personalized_recommendations')}
        isRTL={isRTL}
      />

      {/* Dubbing Config */}
      <Text style={[styles.subheader, isRTL && styles.textRight]}>
        {t('settings.dubbing', 'Dubbing')}
      </Text>
      <SettingRow
        type="toggle"
        icon={Mic}
        label={t('settings.autoDub', 'Auto-Dub')}
        description={t('settings.autoDubDesc', 'Automatically dub content')}
        value={dubbing.auto_dub}
        onValueChange={(v) => setDubbing((p) => ({ ...p, auto_dub: v }))}
        isRTL={isRTL}
      />
      <SettingSelect
        label={t('settings.voicePreference', 'Voice Preference')}
        options={voiceOptions}
        value={dubbing.voice_preference}
        onValueChange={(v) => setDubbing((p) => ({ ...p, voice_preference: v }))}
        isRTL={isRTL}
      />
      <SettingSlider
        icon={Sliders}
        label={t('settings.originalAudioMix', 'Original Audio Mix')}
        description={t('settings.originalAudioMixDesc', 'Volume of original audio during dubbing')}
        min={0}
        max={100}
        step={5}
        value={dubbing.original_audio_mix}
        onValueChange={(v) => setDubbing((p) => ({ ...p, original_audio_mix: v }))}
        formatValue={(v) => `${v}%`}
        isRTL={isRTL}
      />

      {/* Trivia Config */}
      <Text style={[styles.subheader, isRTL && styles.textRight]}>
        {t('settings.trivia', 'Trivia')}
      </Text>
      <SettingRow
        type="toggle"
        icon={Brain}
        label={t('settings.triviaEnabled', 'Enable Trivia')}
        value={trivia.enabled}
        onValueChange={(v) => setTrivia((p) => ({ ...p, enabled: v }))}
        isRTL={isRTL}
      />
      <SettingRow
        type="toggle"
        label={t('settings.triviaAutoShow', 'Auto-Show Trivia')}
        value={trivia.auto_show}
        onValueChange={(v) => setTrivia((p) => ({ ...p, auto_show: v }))}
        isRTL={isRTL}
        disabled={!trivia.enabled}
      />
      <SettingSelect
        label={t('settings.triviaDifficulty', 'Difficulty')}
        options={difficultyOptions}
        value={trivia.difficulty}
        onValueChange={(v) => setTrivia((p) => ({ ...p, difficulty: v }))}
        isRTL={isRTL}
        disabled={!trivia.enabled}
      />
    </SettingSection>
  );
}

const styles = StyleSheet.create({
  creditsBar: {
    marginBottom: spacing.sm,
  },
  creditsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  creditsLabel: {
    fontSize: fontSize.base,
    color: colors.text,
    flex: 1,
  },
  creditsValue: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.primary.DEFAULT,
  },
  subheader: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  textRight: {
    textAlign: 'right',
  },
});
