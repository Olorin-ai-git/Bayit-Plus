import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { GlassCard, GlassView } from '../components';
import { colors, spacing, borderRadius } from '../theme';

export function NotFoundScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();

  const handleGoHome = () => {
    navigation.navigate('Home');
  };

  const handleGoSearch = () => {
    navigation.navigate('Search');
  };

  const handleGoBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Home');
    }
  };

  return (
    <View style={styles.container}>
      <GlassCard style={styles.card}>
        {/* Error Icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.errorIcon}>🔍</Text>
        </View>

        {/* Error Code */}
        <Text style={styles.errorCode}>404</Text>

        {/* Title */}
        <Text style={styles.title}>{t('notFound.title', 'הדף לא נמצא')}</Text>

        {/* Description */}
        <Text style={styles.description}>
          {t('notFound.description', 'הדף שחיפשת לא קיים או הועבר למקום אחר.')}
        </Text>

        {/* Navigation Buttons */}
        <View style={styles.buttons}>
          <Pressable
            onPress={handleGoHome}
            style={({ focused }) => [
              styles.button,
              styles.buttonPrimary,
              focused && styles.buttonFocused,
            ]}
          >
            <Text style={styles.buttonIcon}>🏠</Text>
            <Text style={styles.buttonText}>{t('notFound.goHome', 'לדף הבית')}</Text>
          </Pressable>

          <Pressable
            onPress={handleGoSearch}
            style={({ focused }) => [
              styles.button,
              styles.buttonSecondary,
              focused && styles.buttonFocused,
            ]}
          >
            <Text style={styles.buttonIcon}>🔎</Text>
            <Text style={styles.buttonText}>{t('notFound.search', 'חיפוש')}</Text>
          </Pressable>

          <Pressable
            onPress={handleGoBack}
            style={({ focused }) => [
              styles.button,
              styles.buttonGhost,
              focused && styles.buttonFocused,
            ]}
          >
            <Text style={styles.buttonIcon}>◀</Text>
            <Text style={styles.buttonTextSecondary}>{t('notFound.goBack', 'חזור')}</Text>
          </Pressable>
        </View>

        {/* Suggestions */}
        <View style={styles.suggestions}>
          <Text style={styles.suggestionsTitle}>
            {t('notFound.suggestions', 'אולי תרצה לנסות:')}
          </Text>
          <View style={styles.suggestionLinks}>
            <Pressable
              onPress={() => navigation.navigate('VOD')}
              style={({ focused }) => [
                styles.suggestionLink,
                focused && styles.suggestionLinkFocused,
              ]}
            >
              <Text style={styles.suggestionText}>{t('nav.vod', 'סרטים וסדרות')}</Text>
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate('LiveTV')}
              style={({ focused }) => [
                styles.suggestionLink,
                focused && styles.suggestionLinkFocused,
              ]}
            >
              <Text style={styles.suggestionText}>{t('nav.live', 'שידור חי')}</Text>
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate('Radio')}
              style={({ focused }) => [
                styles.suggestionLink,
                focused && styles.suggestionLinkFocused,
              ]}
            >
              <Text style={styles.suggestionText}>{t('nav.radio', 'רדיו')}</Text>
            </Pressable>
          </View>
        </View>
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  card: {
    padding: spacing.xl * 1.5,
    alignItems: 'center',
    maxWidth: 600,
    width: '100%',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  errorIcon: {
    fontSize: 48,
  },
  errorCode: {
    fontSize: 80,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  description: {
    fontSize: 18,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    textAlign: 'center',
    lineHeight: 26,
  },
  buttons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    gap: spacing.sm,
    borderWidth: 3,
    borderColor: 'transparent',
    minWidth: 140,
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
  },
  buttonSecondary: {
    backgroundColor: colors.secondary,
  },
  buttonGhost: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  buttonFocused: {
    borderColor: colors.text,
    transform: [{ scale: 1.05 }],
  },
  buttonIcon: {
    fontSize: 20,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  buttonTextSecondary: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  suggestions: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    width: '100%',
  },
  suggestionsTitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  suggestionLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.md,
  },
  suggestionLink: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  suggestionLinkFocused: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
  },
  suggestionText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});

export default NotFoundScreen;
