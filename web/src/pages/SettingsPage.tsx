/**
 * SettingsPage
 * Main settings page orchestrator - renders all settings sections.
 * Each section is self-contained with its own state management and API calls.
 */

import { useState, useEffect } from 'react';
import { Text, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { colors, spacing, fontSize } from '@olorin/design-tokens';
import { GlassButton } from '@bayit/shared/ui';
import { LogOut, Languages } from 'lucide-react';
import { useAuthStore } from '@bayit/shared-stores/authStore';
import logger from '@/utils/logger';
import api from '@/services/api';

// Settings sections
import { ProfileSection } from '@/components/settings/ProfileSection';
import { LanguageSection } from '@/components/settings/LanguageSection';
import { PlaybackSection } from '@/components/settings/PlaybackSection';
import { SubtitleSection } from '@/components/settings/SubtitleSection';
import { AudioSection } from '@/components/settings/AudioSection';
import { NotificationSection } from '@/components/settings/NotificationSection';
import { AIFeaturesSection } from '@/components/settings/AIFeaturesSection';
import { PrivacySection } from '@/components/settings/PrivacySection';
import { ParentalSection } from '@/components/settings/ParentalSection';
import { SecuritySection } from '@/components/settings/SecuritySection';
import { AccessibilitySection } from '@/components/settings/AccessibilitySection';
import { SubscriptionSection } from '@/components/settings/SubscriptionSection';
import { AboutSection } from '@/components/settings/AboutSection';

// Chat translation toggle (preserved from original)
import { SettingSection } from '@/components/settings/shared/SettingSection';
import { SettingRow } from '@/components/settings/shared/SettingRow';

export default function SettingsPage() {
  const { t } = useTranslation();
  const { isRTL } = useDirection();
  const { logout } = useAuthStore();

  // Auto-translate state (preserved from original page)
  const [autoTranslate, setAutoTranslate] = useState(true);
  const [isLoadingPrefs, setIsLoadingPrefs] = useState(true);

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const response = await api.get('/users/me/preferences');
        const prefs = response?.data?.preferences || response?.preferences || {};
        setAutoTranslate(prefs.auto_translate_enabled !== false);
      } catch (error) {
        logger.error('Failed to load preferences', 'SettingsPage', error);
      } finally {
        setIsLoadingPrefs(false);
      }
    };
    loadPreferences();
  }, []);

  const handleAutoTranslateChange = async (value: boolean) => {
    setAutoTranslate(value);
    try {
      await api.patch('/users/me/preferences', { auto_translate_enabled: value });
    } catch (error) {
      logger.error('Failed to update auto-translate', 'SettingsPage', error);
      setAutoTranslate(!value);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
    } catch (error) {
      logger.error('Failed to sign out', 'SettingsPage', error);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Text style={[styles.title, isRTL && styles.textRight]}>
        {t('nav.settings')}
      </Text>

      <ProfileSection />
      <LanguageSection />

      {/* Chat Translation (feature-specific, kept inline) */}
      <SettingSection title={t('settings.chatTranslation', 'Chat Translation')} isRTL={isRTL}>
        <SettingRow
          type="toggle"
          icon={Languages}
          label={t('settings.autoTranslate', 'Auto-translate messages')}
          description={t('settings.autoTranslateDescription', 'Automatically translate chat messages')}
          value={autoTranslate}
          onValueChange={handleAutoTranslateChange}
          disabled={isLoadingPrefs}
          isRTL={isRTL}
        />
      </SettingSection>

      <PlaybackSection />
      <SubtitleSection />
      <AudioSection />
      <NotificationSection />
      <AIFeaturesSection />
      <PrivacySection />
      <ParentalSection />
      <SecuritySection />
      <AccessibilitySection />
      <SubscriptionSection />
      <AboutSection />

      {/* Sign Out */}
      <GlassButton variant="secondary" size="md" onPress={handleSignOut}>
        <LogOut size={16} color={colors.textMuted} />
        <Text style={styles.signOutText}>{t('settings.signOut', 'Sign Out')}</Text>
      </GlassButton>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  title: {
    fontSize: fontSize['3xl'],
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xl,
  },
  textRight: {
    textAlign: 'right',
  },
  signOutText: {
    color: colors.textMuted,
    fontSize: fontSize.base,
    marginLeft: spacing.sm,
  },
});
