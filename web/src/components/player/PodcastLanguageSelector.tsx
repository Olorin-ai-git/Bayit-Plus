import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassButton, GlassBadge } from '@bayit/shared/ui';
import logger from '@/utils/logger';

interface PodcastLanguageSelectorProps {
  availableLanguages: string[];
  currentLanguage: string;
  onLanguageChange: (language: string) => Promise<void>;
  isLoading?: boolean;
  error?: string;
  isPremium?: boolean;
  onShowUpgrade?: () => void;
}

const LANGUAGE_FLAGS: Record<string, string> = {
  he: '🇮🇱',
  en: '🇺🇸',
  es: '🇪🇸',
};

export function PodcastLanguageSelector({
  availableLanguages,
  currentLanguage,
  onLanguageChange,
  isLoading = false,
  error,
  isPremium = false,
  onShowUpgrade,
}: PodcastLanguageSelectorProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const [switchingTo, setSwitchingTo] = React.useState<string | null>(null);

  if (availableLanguages.length <= 1) {
    return null;
  }

  const handleLanguageChange = async (lang: string) => {
    if (isLoading || switchingTo) return;

    // Check premium before switching
    if (!isPremium) {
      onShowUpgrade?.();
      return;
    }

    setSwitchingTo(lang);
    try {
      await onLanguageChange(lang);
    } catch (err) {
      logger.error('Language switch failed', 'PodcastLanguageSelector', err);
    } finally {
      setSwitchingTo(null);
    }
  };

  return (
    <View
      accessible={true}
      accessibilityRole="radiogroup"
      accessibilityLabel={t('podcast.selectLanguage')}
      style={[styles.container, isRTL && styles.containerRTL]}
    >
      <Text style={styles.label}>
        {t('podcast.selectLanguage')}:
      </Text>

      {/* Premium badge if not premium and multiple languages available */}
      {!isPremium && availableLanguages.length > 1 && (
        <View style={styles.premiumBadge}>
          <Text style={styles.premiumBadgeText}>PREMIUM</Text>
        </View>
      )}

      <View style={[styles.buttonsContainer, isRTL && styles.buttonsContainerRTL]}>
        {availableLanguages.map((lang) => {
          const isCurrent = lang === currentLanguage;
          const isSwitching = switchingTo === lang;

          return (
            <GlassButton
              key={lang}
              variant={isCurrent ? 'primary' : isPremium ? 'secondary' : 'ghost'}
              size="md"
              onPress={() => handleLanguageChange(lang)}
              disabled={isLoading || isSwitching || !isPremium}
              accessibilityLabel={
                isPremium
                  ? t(`podcast.switchToLanguage`, {
                      language: t(`podcast.languages.${lang}.full`)
                    })
                  : t('podcast.premiumRequiredForTranslation', 'Premium required for translation')
              }
              // @ts-ignore - Custom accessibility props
              accessibilityState={{ selected: isCurrent, disabled: !isPremium }}
              accessibilityRole="radio"
              style={styles.button}
              title={
                isSwitching
                  ? t('podcast.player.switchingLanguage')
                  : `${LANGUAGE_FLAGS[lang] || '🌐'} ${t(`podcast.languages.${lang}.short`)}`
              }
            />
          );
        })}
      </View>
      {error && (
        <Text style={styles.error} accessibilityLive="assertive" accessibilityRole="alert">
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  containerRTL: {
    flexDirection: 'row-reverse',
  },
  label: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '500',
  },
  premiumBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(234, 179, 8, 0.3)',
    borderRadius: 12,
    marginLeft: 4,
  },
  premiumBadgeText: {
    color: 'rgba(250, 204, 21, 1)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  buttonsContainerRTL: {
    flexDirection: 'row-reverse',
  },
  button: {
    minWidth: 100,
    minHeight: 44,
  },
  error: {
    color: 'rgba(248, 113, 113, 1)',
    fontSize: 12,
    marginTop: 4,
  },
});
