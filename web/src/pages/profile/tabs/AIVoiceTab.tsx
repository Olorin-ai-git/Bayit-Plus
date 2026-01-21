import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  MessageSquare,
  Clock,
  Sparkles,
  Mic,
  Volume2,
  Bell,
  Shield,
  Brain,
} from 'lucide-react';
import { GlassView } from '@bayit/shared/ui';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { useAISettingsStore } from '@/stores/aiSettingsStore';
import { useVoiceSettingsStore } from '@/stores/voiceSettingsStore';
import { SettingRow } from '../components/SettingRow';

interface AIVoiceTabProps {
  isRTL: boolean;
}

export function AIVoiceTab({ isRTL }: AIVoiceTabProps) {
  const { t } = useTranslation();

  const {
    preferences: aiPreferences,
    loading: aiLoading,
    toggleSetting: toggleAISetting,
  } = useAISettingsStore();

  const {
    preferences: voicePreferences,
    loading: voiceLoading,
    toggleSetting: toggleVoiceSetting,
  } = useVoiceSettingsStore();

  return (
    <View style={styles.sectionGrid}>
      <GlassView style={styles.section}>
        <View style={styles.sectionHeader}>
          {isRTL ? (
            <>
              <View style={styles.sectionHeaderText}>
                <Text style={[styles.sectionTitle, { textAlign: 'right' }]}>
                  {t('profile.ai.assistant', 'AI Assistant')}
                </Text>
                <Text style={[styles.sectionSubtitle, { textAlign: 'right' }]}>
                  {t('profile.ai.assistantDesc', 'Personalized recommendations and help')}
                </Text>
              </View>
              <View style={[styles.sectionIconContainer, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
                <Brain size={24} color="#8B5CF6" />
              </View>
            </>
          ) : (
            <>
              <View style={[styles.sectionIconContainer, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
                <Brain size={24} color="#8B5CF6" />
              </View>
              <View style={styles.sectionHeaderText}>
                <Text style={[styles.sectionTitle, { textAlign: 'left' }]}>
                  {t('profile.ai.assistant', 'AI Assistant')}
                </Text>
                <Text style={[styles.sectionSubtitle, { textAlign: 'left' }]}>
                  {t('profile.ai.assistantDesc', 'Personalized recommendations and help')}
                </Text>
              </View>
            </>
          )}
        </View>

        <SettingRow
          icon={MessageSquare}
          iconColor={colors.primary}
          label={t('profile.ai.chatbotEnabled', 'Enable AI Assistant')}
          description={t('profile.ai.chatbotEnabledDesc', 'Get help navigating content')}
          value={aiPreferences.chatbot_enabled}
          onToggle={() => toggleAISetting('chatbot_enabled')}
          disabled={aiLoading}
          isRTL={isRTL}
        />
        <SettingRow
          icon={Clock}
          iconColor="#8B5CF6"
          label={t('profile.ai.saveHistory', 'Save Conversation History')}
          description={t('profile.ai.saveHistoryDesc', 'Remember previous conversations')}
          value={aiPreferences.save_conversation_history}
          onToggle={() => toggleAISetting('save_conversation_history')}
          disabled={aiLoading || !aiPreferences.chatbot_enabled}
          isRTL={isRTL}
        />
        <SettingRow
          icon={Sparkles}
          iconColor={colors.warning}
          label={t('profile.ai.personalizedRecs', 'Personalized Recommendations')}
          description={t('profile.ai.personalizedRecsDesc', 'Content suggestions based on history')}
          value={aiPreferences.personalized_recommendations}
          onToggle={() => toggleAISetting('personalized_recommendations')}
          disabled={aiLoading}
          isRTL={isRTL}
        />
      </GlassView>

      <GlassView style={styles.section}>
        <View style={styles.sectionHeader}>
          {isRTL ? (
            <>
              <View style={styles.sectionHeaderText}>
                <Text style={[styles.sectionTitle, { textAlign: 'right' }]}>
                  {t('profile.voice.title', 'Voice Control')}
                </Text>
                <Text style={[styles.sectionSubtitle, { textAlign: 'right' }]}>
                  {t('profile.voice.description', 'Hands-free navigation')}
                </Text>
              </View>
              <View style={[styles.sectionIconContainer, { backgroundColor: 'rgba(107, 33, 168, 0.3)' }]}>
                <Mic size={24} color={colors.primary} />
              </View>
            </>
          ) : (
            <>
              <View style={[styles.sectionIconContainer, { backgroundColor: 'rgba(107, 33, 168, 0.3)' }]}>
                <Mic size={24} color={colors.primary} />
              </View>
              <View style={styles.sectionHeaderText}>
                <Text style={[styles.sectionTitle, { textAlign: 'left' }]}>
                  {t('profile.voice.title', 'Voice Control')}
                </Text>
                <Text style={[styles.sectionSubtitle, { textAlign: 'left' }]}>
                  {t('profile.voice.description', 'Hands-free navigation')}
                </Text>
              </View>
            </>
          )}
        </View>

        <SettingRow
          icon={Mic}
          iconColor={colors.primary}
          label={t('profile.voice.enabled', 'Voice Commands')}
          description={t('profile.voice.enabledDesc', 'Control the app with your voice')}
          value={voicePreferences.voice_search_enabled}
          onToggle={() => toggleVoiceSetting('voice_search_enabled')}
          disabled={voiceLoading}
          isRTL={isRTL}
        />
        <SettingRow
          icon={Volume2}
          iconColor={colors.success}
          label={t('profile.voice.tts', 'Text-to-Speech')}
          description={t('profile.voice.ttsDesc', 'AI responses read aloud')}
          value={voicePreferences.tts_enabled}
          onToggle={() => toggleVoiceSetting('tts_enabled')}
          disabled={voiceLoading}
          isRTL={isRTL}
        />
        <SettingRow
          icon={Bell}
          iconColor="#F59E0B"
          label={t('profile.voice.wakeWord', 'Wake Word Detection')}
          description={t('profile.voice.wakeWordDesc', 'Say "Buyit" to activate')}
          value={voicePreferences.wake_word_enabled}
          onToggle={() => toggleVoiceSetting('wake_word_enabled')}
          disabled={voiceLoading}
          isRTL={isRTL}
        />
      </GlassView>

      <GlassView style={styles.section}>
        <View style={styles.sectionHeader}>
          {isRTL ? (
            <>
              <View style={styles.sectionHeaderText}>
                <Text style={[styles.sectionTitle, { textAlign: 'right' }]}>
                  {t('profile.ai.privacy', 'Privacy & Data')}
                </Text>
                <Text style={[styles.sectionSubtitle, { textAlign: 'right' }]}>
                  {t('profile.ai.privacyDesc', 'Your data is encrypted and secure')}
                </Text>
              </View>
              <View style={[styles.sectionIconContainer, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
                <Shield size={24} color={colors.success} />
              </View>
            </>
          ) : (
            <>
              <View style={[styles.sectionIconContainer, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
                <Shield size={24} color={colors.success} />
              </View>
              <View style={styles.sectionHeaderText}>
                <Text style={[styles.sectionTitle, { textAlign: 'left' }]}>
                  {t('profile.ai.privacy', 'Privacy & Data')}
                </Text>
                <Text style={[styles.sectionSubtitle, { textAlign: 'left' }]}>
                  {t('profile.ai.privacyDesc', 'Your data is encrypted and secure')}
                </Text>
              </View>
            </>
          )}
        </View>

        <SettingRow
          icon={Shield}
          iconColor={colors.success}
          label={t('profile.ai.dataConsent', 'Usage Analytics')}
          description={t('profile.ai.dataConsentDesc', 'Help improve AI features')}
          value={aiPreferences.data_collection_consent}
          onToggle={() => toggleAISetting('data_collection_consent')}
          disabled={aiLoading}
          isRTL={isRTL}
        />
      </GlassView>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionGrid: {
    gap: spacing.lg,
  },
  section: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
});
