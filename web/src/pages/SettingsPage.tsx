import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { colors, spacing, fontSize, borderRadius } from '@bayit/shared/theme';
import { GlassView, GlassToggle } from '@bayit/shared/ui';
import { useAuthStore } from '@bayit/shared-stores/authStore';
import { Globe, Bell, Moon, Volume2, Shield, ChevronRight, Languages } from 'lucide-react';
import api from '@/services/api';

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const { user } = useAuthStore();

  const [notifications, setNotifications] = useState(true);
  const [autoplay, setAutoplay] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [autoTranslate, setAutoTranslate] = useState(true);
  const [isLoadingPrefs, setIsLoadingPrefs] = useState(true);

  // Load user preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const response = await api.get('/users/me/preferences');
        const prefs = response.data?.preferences || {};
        setAutoTranslate(prefs.auto_translate_enabled !== false);
      } catch (error) {
        console.error('Failed to load preferences:', error);
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
      console.error('Failed to update auto-translate preference:', error);
      // Revert on error
      setAutoTranslate(!value);
    }
  };

  const currentLanguage = i18n.language === 'he' ? 'Hebrew' : 'English';

  const handleLanguageChange = () => {
    const newLang = i18n.language === 'he' ? 'en' : 'he';
    i18n.changeLanguage(newLang);
    localStorage.setItem('bayit-language', newLang);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      <Text style={[
        styles.title,
        textAlign === 'right' && styles.textRight
      ]}>
        {t('nav.settings')}
      </Text>

      {/* Language Settings */}
      <GlassView style={styles.section}>
        <Text style={[
          styles.sectionHeader,
          textAlign === 'right' && styles.textRight
        ]}>
          {t('settings.language', 'Language')}
        </Text>
        <Pressable
          style={[
            styles.settingRow,
            flexDirection === 'row-reverse' && styles.rowReverse
          ]}
          onPress={handleLanguageChange}
        >
          <View style={[
            styles.settingLeft,
            flexDirection === 'row-reverse' && styles.rowReverse
          ]}>
            <Globe size={20} color={colors.primary} />
            <Text style={[
              styles.settingLabel,
              textAlign === 'right' && styles.textRight
            ]}>
              {t('settings.appLanguage', 'App Language')}
            </Text>
          </View>
          <View style={[
            styles.settingRight,
            flexDirection === 'row-reverse' && styles.rowReverse
          ]}>
            <Text style={styles.settingValue}>{currentLanguage}</Text>
            <ChevronRight size={20} color={colors.textMuted} />
          </View>
        </Pressable>
      </GlassView>

      {/* Chat Translation Settings */}
      <GlassView style={styles.section}>
        <Text style={[
          styles.sectionHeader,
          textAlign === 'right' && styles.textRight
        ]}>
          {t('settings.chatTranslation', 'Chat Translation')}
        </Text>
        <View style={[
          styles.settingRow,
          flexDirection === 'row-reverse' && styles.rowReverse
        ]}>
          <View style={[
            styles.settingLeft,
            flexDirection === 'row-reverse' && styles.rowReverse
          ]}>
            <Languages size={20} color={colors.primary} />
            <View style={styles.settingTextContainer}>
              <Text style={[
                styles.settingLabel,
                textAlign === 'right' && styles.textRight
              ]}>
                {t('settings.autoTranslate', 'Auto-translate messages')}
              </Text>
              <Text style={[
                styles.settingDescription,
                textAlign === 'right' && styles.textRight
              ]}>
                {t('settings.autoTranslateDescription', 'Automatically translate chat messages to your preferred language')}
              </Text>
            </View>
          </View>
          <GlassToggle
            value={autoTranslate}
            onValueChange={handleAutoTranslateChange}
            disabled={isLoadingPrefs}
          />
        </View>
      </GlassView>

      {/* Notification Settings */}
      <GlassView style={styles.section}>
        <Text style={[
          styles.sectionHeader,
          textAlign === 'right' && styles.textRight
        ]}>
          {t('settings.notifications', 'Notifications')}
        </Text>
        <View style={[
          styles.settingRow,
          flexDirection === 'row-reverse' && styles.rowReverse
        ]}>
          <View style={[
            styles.settingLeft,
            flexDirection === 'row-reverse' && styles.rowReverse
          ]}>
            <Bell size={20} color={colors.primary} />
            <Text style={[
              styles.settingLabel,
              textAlign === 'right' && styles.textRight
            ]}>
              {t('settings.pushNotifications', 'Push Notifications')}
            </Text>
          </View>
          <GlassToggle
            value={notifications}
            onValueChange={setNotifications}
          />
        </View>
      </GlassView>

      {/* Playback Settings */}
      <GlassView style={styles.section}>
        <Text style={[
          styles.sectionHeader,
          textAlign === 'right' && styles.textRight
        ]}>
          {t('settings.playback', 'Playback')}
        </Text>
        <View style={[
          styles.settingRow,
          flexDirection === 'row-reverse' && styles.rowReverse
        ]}>
          <View style={[
            styles.settingLeft,
            flexDirection === 'row-reverse' && styles.rowReverse
          ]}>
            <Volume2 size={20} color={colors.primary} />
            <Text style={[
              styles.settingLabel,
              textAlign === 'right' && styles.textRight
            ]}>
              {t('settings.autoplay', 'Autoplay')}
            </Text>
          </View>
          <GlassToggle
            value={autoplay}
            onValueChange={setAutoplay}
          />
        </View>
      </GlassView>

      {/* Appearance */}
      <GlassView style={styles.section}>
        <Text style={[
          styles.sectionHeader,
          textAlign === 'right' && styles.textRight
        ]}>
          {t('settings.appearance', 'Appearance')}
        </Text>
        <View style={[
          styles.settingRow,
          flexDirection === 'row-reverse' && styles.rowReverse
        ]}>
          <View style={[
            styles.settingLeft,
            flexDirection === 'row-reverse' && styles.rowReverse
          ]}>
            <Moon size={20} color={colors.primary} />
            <Text style={[
              styles.settingLabel,
              textAlign === 'right' && styles.textRight
            ]}>
              {t('settings.darkMode', 'Dark Mode')}
            </Text>
          </View>
          <GlassToggle
            value={darkMode}
            onValueChange={setDarkMode}
          />
        </View>
      </GlassView>

      {/* Privacy */}
      <GlassView style={styles.section}>
        <Text style={[
          styles.sectionHeader,
          textAlign === 'right' && styles.textRight
        ]}>
          {t('settings.privacy', 'Privacy')}
        </Text>
        <Pressable style={[
          styles.settingRow,
          flexDirection === 'row-reverse' && styles.rowReverse
        ]}>
          <View style={[
            styles.settingLeft,
            flexDirection === 'row-reverse' && styles.rowReverse
          ]}>
            <Shield size={20} color={colors.primary} />
            <Text style={[
              styles.settingLabel,
              textAlign === 'right' && styles.textRight
            ]}>
              {t('settings.privacyPolicy', 'Privacy Policy')}
            </Text>
          </View>
          <ChevronRight size={20} color={colors.textMuted} />
        </Pressable>
        <Pressable style={[
          styles.settingRow,
          flexDirection === 'row-reverse' && styles.rowReverse
        ]}>
          <View style={[
            styles.settingLeft,
            flexDirection === 'row-reverse' && styles.rowReverse
          ]}>
            <Shield size={20} color={colors.primary} />
            <Text style={[
              styles.settingLabel,
              textAlign === 'right' && styles.textRight
            ]}>
              {t('settings.termsOfService', 'Terms of Service')}
            </Text>
          </View>
          <ChevronRight size={20} color={colors.textMuted} />
        </Pressable>
      </GlassView>

      {/* App Info */}
      <View style={styles.appInfo}>
        <Text style={styles.appVersion}>
          {t('common.appVersion', 'Bayit+ v1.0.0')}
        </Text>
      </View>
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
  section: {
    padding: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
  },
  sectionHeader: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingLabel: {
    fontSize: fontSize.base,
    color: colors.text,
  },
  settingDescription: {
    fontSize: fontSize.xs,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  settingValue: {
    fontSize: fontSize.sm,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  appInfo: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  appVersion: {
    fontSize: fontSize.xs,
    color: 'rgba(255, 255, 255, 0.6)',
  },
});
