/**
 * AuthRequiredOverlay Component
 * Displays a clear message when content requires authentication
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Lock } from 'lucide-react';
import { colors, spacing, fontSize, borderRadius } from '@olorin/design-tokens';

interface AuthRequiredOverlayProps {
  /** Content title for display */
  title?: string;
  /** Poster/backdrop image URL */
  poster?: string;
}

/**
 * Overlay shown when user tries to play content without being logged in
 * Provides clear call-to-action to login or sign up
 */
export function AuthRequiredOverlay({ title, poster }: AuthRequiredOverlayProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <View style={styles.container}>
      {/* Blurred background with poster */}
      {poster && (
        <View style={styles.backdropContainer}>
          <img src={poster} alt="" style={styles.backdropImage as any} />
          <View style={styles.backdropOverlay} />
        </View>
      )}

      {/* Lock icon and message */}
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Lock size={64} color={colors.text} strokeWidth={1.5} />
        </View>

        <Text style={styles.title}>{t('auth.loginRequired')}</Text>

        <Text style={styles.message}>
          {t('auth.loginToWatch', { title: title || t('common.thisContent') })}
        </Text>

        <View style={styles.buttons}>
          <Pressable
            style={({ pressed }) => [
              styles.button,
              styles.primaryButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => navigate('/auth/login')}
          >
            <Text style={styles.primaryButtonText}>{t('auth.login')}</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.button,
              styles.secondaryButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => navigate('/auth/register')}
          >
            <Text style={styles.secondaryButtonText}>{t('auth.signUp')}</Text>
          </Pressable>
        </View>

        <Pressable
          style={({ pressed }) => [styles.backButton, pressed && styles.buttonPressed]}
          onPress={() => navigate('/')}
        >
          <Text style={styles.backButtonText}>{t('common.backToHome')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    minHeight: 500,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  backdropContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  backdropImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    filter: 'blur(20px)',
    opacity: 0.3,
  },
  backdropOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background,
    opacity: 0.8,
  },
  content: {
    position: 'relative',
    zIndex: 1,
    maxWidth: 500,
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.glassOverlay,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize['2xl'],
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  message: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 28,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
    marginTop: spacing.md,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  secondaryButton: {
    backgroundColor: colors.glassOverlay,
    borderWidth: 1,
    borderColor: colors.border,
  },
  primaryButtonText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.background,
  },
  secondaryButtonText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  backButton: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  backButtonText: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
});
