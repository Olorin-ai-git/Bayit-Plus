import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassButton } from '@bayit/shared/ui';
import logger from '@/utils/logger';

interface PodcastLanguageSelectorProps {
  availableLanguages: string[];
  currentLanguage: string;
  onLanguageChange: (language: string) => Promise<void>;
  isLoading?: boolean;
  error?: string;
}

const LANGUAGE_FLAGS: Record<string, string> = {
  he: '🇮🇱',
  en: '🇺🇸',
};

export function PodcastLanguageSelector({
  availableLanguages,
  currentLanguage,
  onLanguageChange,
  isLoading = false,
  error,
}: PodcastLanguageSelectorProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const [switchingTo, setSwitchingTo] = React.useState<string | null>(null);

  if (availableLanguages.length <= 1) {
    return null;
  }

  const handleLanguageChange = async (lang: string) => {
    if (isLoading || switchingTo) return;

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
      <View style={[styles.buttonsContainer, isRTL && styles.buttonsContainerRTL]}>
        {availableLanguages.map((lang) => {
          const isCurrent = lang === currentLanguage;
          const isSwitching = switchingTo === lang;

          return (
            <GlassButton
              key={lang}
              variant={isCurrent ? 'primary' : 'secondary'}
              size="md"
              onPress={() => handleLanguageChange(lang)}
              disabled={isLoading || isSwitching}
              accessibilityLabel={t(`podcast.switchToLanguage`, {
                language: t(`podcast.languages.${lang}.full`)
              })}
              // @ts-ignore - Custom accessibility props
              accessibilityState={{ selected: isCurrent }}
              accessibilityRole="radio"
              style={styles.button}
              title={
                isSwitching
                  ? t('podcast.player.switchingLanguage')
                  : `${LANGUAGE_FLAGS[lang]} ${t(`podcast.languages.${lang}.short`)}`
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
