import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { colors, spacing } from '@bayit/shared/theme';
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
    <ScrollView className="flex-1 bg-black" contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl * 2 }}>
      <Text className={`text-3xl font-bold text-white mb-8 ${textAlign === 'right' ? 'text-right' : ''}`}>{t('nav.settings')}</Text>

      {/* Language Settings */}
      <GlassView className="p-4 mb-4 rounded-lg">
        <Text className={`text-base font-semibold text-white/60 mb-4 uppercase tracking-wider ${textAlign === 'right' ? 'text-right' : ''}`}>{t('settings.language', 'Language')}</Text>
        <Pressable className={`flex-row items-center justify-between py-2 border-b border-white/10 ${flexDirection === 'row-reverse' ? 'flex-row-reverse' : ''}`} onPress={handleLanguageChange}>
          <View className={`flex-row items-center gap-4 flex-1 ${flexDirection === 'row-reverse' ? 'flex-row-reverse' : ''}`}>
            <Globe size={20} color={colors.primary} />
            <Text className={`text-base text-white ${textAlign === 'right' ? 'text-right' : ''}`}>{t('settings.appLanguage', 'App Language')}</Text>
          </View>
          <View className={`flex-row items-center gap-2 ${flexDirection === 'row-reverse' ? 'flex-row-reverse' : ''}`}>
            <Text className="text-sm text-white/60">{currentLanguage}</Text>
            <ChevronRight size={20} color={colors.textMuted} />
          </View>
        </Pressable>
      </GlassView>

      {/* Chat Translation Settings */}
      <GlassView className="p-4 mb-4 rounded-lg">
        <Text className={`text-base font-semibold text-white/60 mb-4 uppercase tracking-wider ${textAlign === 'right' ? 'text-right' : ''}`}>{t('settings.chatTranslation', 'Chat Translation')}</Text>
        <View className={`flex-row items-center justify-between py-2 border-b border-white/10 ${flexDirection === 'row-reverse' ? 'flex-row-reverse' : ''}`}>
          <View className={`flex-row items-center gap-4 flex-1 ${flexDirection === 'row-reverse' ? 'flex-row-reverse' : ''}`}>
            <Languages size={20} color={colors.primary} />
            <View className="flex-1">
              <Text className={`text-base text-white ${textAlign === 'right' ? 'text-right' : ''}`}>{t('settings.autoTranslate', 'Auto-translate messages')}</Text>
              <Text className={`text-xs text-white/60 mt-0.5 ${textAlign === 'right' ? 'text-right' : ''}`}>
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
      <GlassView className="p-4 mb-4 rounded-lg">
        <Text className={`text-base font-semibold text-white/60 mb-4 uppercase tracking-wider ${textAlign === 'right' ? 'text-right' : ''}`}>{t('settings.notifications', 'Notifications')}</Text>
        <View className={`flex-row items-center justify-between py-2 border-b border-white/10 ${flexDirection === 'row-reverse' ? 'flex-row-reverse' : ''}`}>
          <View className={`flex-row items-center gap-4 flex-1 ${flexDirection === 'row-reverse' ? 'flex-row-reverse' : ''}`}>
            <Bell size={20} color={colors.primary} />
            <Text className={`text-base text-white ${textAlign === 'right' ? 'text-right' : ''}`}>{t('settings.pushNotifications', 'Push Notifications')}</Text>
          </View>
          <GlassToggle
            value={notifications}
            onValueChange={setNotifications}
          />
        </View>
      </GlassView>

      {/* Playback Settings */}
      <GlassView className="p-4 mb-4 rounded-lg">
        <Text className={`text-base font-semibold text-white/60 mb-4 uppercase tracking-wider ${textAlign === 'right' ? 'text-right' : ''}`}>{t('settings.playback', 'Playback')}</Text>
        <View className={`flex-row items-center justify-between py-2 border-b border-white/10 ${flexDirection === 'row-reverse' ? 'flex-row-reverse' : ''}`}>
          <View className={`flex-row items-center gap-4 flex-1 ${flexDirection === 'row-reverse' ? 'flex-row-reverse' : ''}`}>
            <Volume2 size={20} color={colors.primary} />
            <Text className={`text-base text-white ${textAlign === 'right' ? 'text-right' : ''}`}>{t('settings.autoplay', 'Autoplay')}</Text>
          </View>
          <GlassToggle
            value={autoplay}
            onValueChange={setAutoplay}
          />
        </View>
      </GlassView>

      {/* Appearance */}
      <GlassView className="p-4 mb-4 rounded-lg">
        <Text className={`text-base font-semibold text-white/60 mb-4 uppercase tracking-wider ${textAlign === 'right' ? 'text-right' : ''}`}>{t('settings.appearance', 'Appearance')}</Text>
        <View className={`flex-row items-center justify-between py-2 border-b border-white/10 ${flexDirection === 'row-reverse' ? 'flex-row-reverse' : ''}`}>
          <View className={`flex-row items-center gap-4 flex-1 ${flexDirection === 'row-reverse' ? 'flex-row-reverse' : ''}`}>
            <Moon size={20} color={colors.primary} />
            <Text className={`text-base text-white ${textAlign === 'right' ? 'text-right' : ''}`}>{t('settings.darkMode', 'Dark Mode')}</Text>
          </View>
          <GlassToggle
            value={darkMode}
            onValueChange={setDarkMode}
          />
        </View>
      </GlassView>

      {/* Privacy */}
      <GlassView className="p-4 mb-4 rounded-lg">
        <Text className={`text-base font-semibold text-white/60 mb-4 uppercase tracking-wider ${textAlign === 'right' ? 'text-right' : ''}`}>{t('settings.privacy', 'Privacy')}</Text>
        <Pressable className={`flex-row items-center justify-between py-2 border-b border-white/10 ${flexDirection === 'row-reverse' ? 'flex-row-reverse' : ''}`}>
          <View className={`flex-row items-center gap-4 flex-1 ${flexDirection === 'row-reverse' ? 'flex-row-reverse' : ''}`}>
            <Shield size={20} color={colors.primary} />
            <Text className={`text-base text-white ${textAlign === 'right' ? 'text-right' : ''}`}>{t('settings.privacyPolicy', 'Privacy Policy')}</Text>
          </View>
          <ChevronRight size={20} color={colors.textMuted} />
        </Pressable>
        <Pressable className={`flex-row items-center justify-between py-2 border-b border-white/10 ${flexDirection === 'row-reverse' ? 'flex-row-reverse' : ''}`}>
          <View className={`flex-row items-center gap-4 flex-1 ${flexDirection === 'row-reverse' ? 'flex-row-reverse' : ''}`}>
            <Shield size={20} color={colors.primary} />
            <Text className={`text-base text-white ${textAlign === 'right' ? 'text-right' : ''}`}>{t('settings.termsOfService', 'Terms of Service')}</Text>
          </View>
          <ChevronRight size={20} color={colors.textMuted} />
        </Pressable>
      </GlassView>

      {/* App Info */}
      <View className="items-center mt-8">
        <Text className="text-xs text-white/60">{t('common.appVersion', 'Bayit+ v1.0.0')}</Text>
      </View>
    </ScrollView>
  );
}
