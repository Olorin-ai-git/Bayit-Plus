import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassView, GlassToggle } from '@bayit/shared/ui';
import { useAuthStore } from '@bayit/shared-stores/authStore';
import { Globe, Bell, Moon, Volume2, Shield, ChevronRight } from 'lucide-react';

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const { user } = useAuthStore();

  const [notifications, setNotifications] = useState(true);
  const [autoplay, setAutoplay] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  const currentLanguage = i18n.language === 'he' ? 'Hebrew' : 'English';

  const handleLanguageChange = () => {
    const newLang = i18n.language === 'he' ? 'en' : 'he';
    i18n.changeLanguage(newLang);
    localStorage.setItem('bayit-language', newLang);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={[styles.pageTitle, { textAlign }]}>{t('nav.settings')}</Text>

      {/* Language Settings */}
      <GlassView style={styles.section}>
        <Text style={[styles.sectionTitle, { textAlign }]}>{t('settings.language', 'Language')}</Text>
        <Pressable style={[styles.settingRow, { flexDirection }]} onPress={handleLanguageChange}>
          <View style={[styles.settingLeft, { flexDirection }]}>
            <Globe size={20} color={colors.primary} />
            <Text style={[styles.settingLabel, { textAlign }]}>{t('settings.appLanguage', 'App Language')}</Text>
          </View>
          <View style={[styles.settingRight, { flexDirection }]}>
            <Text style={styles.settingValue}>{currentLanguage}</Text>
            <ChevronRight size={20} color={colors.textMuted} />
          </View>
        </Pressable>
      </GlassView>

      {/* Notification Settings */}
      <GlassView style={styles.section}>
        <Text style={[styles.sectionTitle, { textAlign }]}>{t('settings.notifications', 'Notifications')}</Text>
        <View style={[styles.settingRow, { flexDirection }]}>
          <View style={[styles.settingLeft, { flexDirection }]}>
            <Bell size={20} color={colors.primary} />
            <Text style={[styles.settingLabel, { textAlign }]}>{t('settings.pushNotifications', 'Push Notifications')}</Text>
          </View>
          <GlassToggle
            value={notifications}
            onValueChange={setNotifications}
          />
        </View>
      </GlassView>

      {/* Playback Settings */}
      <GlassView style={styles.section}>
        <Text style={[styles.sectionTitle, { textAlign }]}>{t('settings.playback', 'Playback')}</Text>
        <View style={[styles.settingRow, { flexDirection }]}>
          <View style={[styles.settingLeft, { flexDirection }]}>
            <Volume2 size={20} color={colors.primary} />
            <Text style={[styles.settingLabel, { textAlign }]}>{t('settings.autoplay', 'Autoplay')}</Text>
          </View>
          <GlassToggle
            value={autoplay}
            onValueChange={setAutoplay}
          />
        </View>
      </GlassView>

      {/* Appearance */}
      <GlassView style={styles.section}>
        <Text style={[styles.sectionTitle, { textAlign }]}>{t('settings.appearance', 'Appearance')}</Text>
        <View style={[styles.settingRow, { flexDirection }]}>
          <View style={[styles.settingLeft, { flexDirection }]}>
            <Moon size={20} color={colors.primary} />
            <Text style={[styles.settingLabel, { textAlign }]}>{t('settings.darkMode', 'Dark Mode')}</Text>
          </View>
          <GlassToggle
            value={darkMode}
            onValueChange={setDarkMode}
          />
        </View>
      </GlassView>

      {/* Privacy */}
      <GlassView style={styles.section}>
        <Text style={[styles.sectionTitle, { textAlign }]}>{t('settings.privacy', 'Privacy')}</Text>
        <Pressable style={[styles.settingRow, { flexDirection }]}>
          <View style={[styles.settingLeft, { flexDirection }]}>
            <Shield size={20} color={colors.primary} />
            <Text style={[styles.settingLabel, { textAlign }]}>{t('settings.privacyPolicy', 'Privacy Policy')}</Text>
          </View>
          <ChevronRight size={20} color={colors.textMuted} />
        </Pressable>
        <Pressable style={[styles.settingRow, { flexDirection }]}>
          <View style={[styles.settingLeft, { flexDirection }]}>
            <Shield size={20} color={colors.primary} />
            <Text style={[styles.settingLabel, { textAlign }]}>{t('settings.termsOfService', 'Terms of Service')}</Text>
          </View>
          <ChevronRight size={20} color={colors.textMuted} />
        </Pressable>
      </GlassView>

      {/* App Info */}
      <View style={styles.appInfo}>
        <Text style={styles.appVersion}>{t('common.appVersion', 'Bayit+ v1.0.0')}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xl,
  },
  section: {
    padding: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  settingLabel: {
    fontSize: 16,
    color: colors.text,
  },
  settingValue: {
    fontSize: 14,
    color: colors.textMuted,
  },
  appInfo: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  appVersion: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
