import { useEffect } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Sparkles, Shield } from 'lucide-react';
import { useAISettingsStore } from '@/stores/aiSettingsStore';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import { GlassView } from '@bayit/shared/ui';

export default function AISettings() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'he' || i18n.language === 'ar';
  const {
    preferences,
    loading,
    saving,
    loadPreferences,
    toggleSetting,
  } = useAISettingsStore();

  useEffect(() => {
    loadPreferences();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  const Toggle = ({
    value,
    onToggle,
    disabled,
  }: {
    value: boolean;
    onToggle: () => void;
    disabled?: boolean;
  }) => (
    <Pressable
      onPress={onToggle}
      disabled={disabled}
      style={[
        styles.toggleBase,
        value ? styles.toggleActive : styles.toggleInactive,
        disabled && styles.toggleDisabled,
      ]}
    >
      <View style={styles.toggleCircle} />
    </Pressable>
  );

  const SettingRow = ({
    label,
    description,
    value,
    onToggle,
    disabled,
  }: {
    label: string;
    description: string;
    value: boolean;
    onToggle: () => void;
    disabled?: boolean;
  }) => (
    <Pressable
      onPress={onToggle}
      disabled={disabled}
      style={[
        styles.settingRow,
        isRTL && styles.settingRowRTL,
        disabled && styles.settingRowDisabled,
      ]}
    >
      <View style={styles.flex1}>
        <Text
          style={[
            styles.settingLabel,
            isRTL && styles.textRight,
            disabled && styles.textDisabled,
          ]}
        >
          {label}
        </Text>
        <Text
          style={[
            styles.settingDescription,
            isRTL && styles.textRight,
            disabled && styles.textDisabledSecondary,
          ]}
        >
          {description}
        </Text>
      </View>
      <Toggle value={value} onToggle={onToggle} disabled={disabled} />
    </Pressable>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, isRTL && styles.headerRTL]}>
        <View style={styles.headerIcon}>
          <Sparkles size={24} color={colors.primary} />
        </View>
        <View style={styles.flex1}>
          <Text style={[styles.headerTitle, isRTL && styles.textRight]}>
            {t('profile.ai.title', 'AI & Personalization')}
          </Text>
          <Text style={[styles.headerSubtitle, isRTL && styles.textRight]}>
            {t('profile.ai.description', 'Configure AI-powered features')}
          </Text>
        </View>
      </View>

      {/* Chatbot Settings */}
      <GlassView style={styles.section}>
        <Text style={[styles.sectionTitle, isRTL && styles.textRight]}>
          {t('profile.ai.chatbot', 'AI Assistant')}
        </Text>

        <SettingRow
          label={t('profile.ai.chatbotEnabled', 'Enable AI Assistant')}
          description={t('profile.ai.chatbotEnabledDesc', 'Get help navigating content and personalized recommendations')}
          value={preferences.chatbot_enabled}
          onToggle={() => toggleSetting('chatbot_enabled')}
        />

        <SettingRow
          label={t('profile.ai.saveHistory', 'Save conversation history')}
          description={t('profile.ai.saveHistoryDesc', 'Remember previous conversations for better context')}
          value={preferences.save_conversation_history}
          onToggle={() => toggleSetting('save_conversation_history')}
          disabled={!preferences.chatbot_enabled}
        />
      </GlassView>

      {/* Recommendations */}
      <GlassView style={styles.section}>
        <Text style={[styles.sectionTitle, isRTL && styles.textRight]}>
          {t('profile.ai.recommendations', 'Recommendations')}
        </Text>

        <SettingRow
          label={t('profile.ai.personalizedRecs', 'Personalized recommendations')}
          description={t('profile.ai.personalizedRecsDesc', 'Get content suggestions based on your viewing history')}
          value={preferences.personalized_recommendations}
          onToggle={() => toggleSetting('personalized_recommendations')}
        />
      </GlassView>

      {/* Privacy */}
      <GlassView style={styles.section}>
        <Text style={[styles.sectionTitle, isRTL && styles.textRight]}>
          {t('profile.ai.privacy', 'Privacy & Data')}
        </Text>

        <SettingRow
          label={t('profile.ai.dataConsent', 'Allow data collection for improvements')}
          description={t('profile.ai.dataConsentDesc', 'Help improve AI features by sharing anonymous usage data')}
          value={preferences.data_collection_consent}
          onToggle={() => toggleSetting('data_collection_consent')}
        />

        <View style={[styles.privacyNote, isRTL && styles.privacyNoteRTL]}>
          <Shield size={16} color={colors.success} />
          <Text style={styles.privacyNoteText}>
            {t('profile.ai.privacyNote', 'Your data is encrypted and secure')}
          </Text>
        </View>
      </GlassView>

      {/* Saving indicator */}
      {saving && (
        <View style={styles.savingIndicator}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.savingText}>{t('common.saving', 'Saving...')}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Container
  container: {
    gap: spacing.md,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  flex1: {
    flex: 1,
  },

  // Toggle styles
  toggleBase: {
    width: 52,
    height: 28,
    borderRadius: borderRadius.full,
    padding: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleActive: {
    backgroundColor: colors.primary[600],
    justifyContent: 'flex-end',
  },
  toggleInactive: {
    backgroundColor: colors.glassBorderWhite,
  },
  toggleDisabled: {
    opacity: 0.5,
  },
  toggleCircle: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
    backgroundColor: colors.text,
  },

  // SettingRow styles
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  settingRowRTL: {
    flexDirection: 'row-reverse',
  },
  settingRowDisabled: {
    opacity: 0.5,
  },

  // Text styles
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  settingDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  textRight: {
    textAlign: 'right',
  },
  textDisabled: {
    color: colors.textSecondary,
  },
  textDisabledSecondary: {
    color: colors.textMuted,
  },

  // Header styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.glassPurple,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Section
  section: {
    padding: spacing.md,
    gap: spacing.md,
  },

  // Section title
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },

  // Privacy note
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: borderRadius.sm,
    marginTop: spacing.sm,
  },
  privacyNoteRTL: {
    flexDirection: 'row-reverse',
  },
  privacyNoteText: {
    fontSize: 13,
    color: colors.success.DEFAULT,
  },

  // Saving indicator
  savingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  savingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
