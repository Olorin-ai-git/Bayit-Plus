/**
 * Styles for LiveSubtitleControls component
 */

import { StyleSheet } from 'react-native'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'

export const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    position: 'relative',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  buttonHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  buttonPressed: {
    opacity: 0.7,
  },
  buttonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderColor: colors.primary,
  },
  buttonPremium: {
    borderColor: colors.accent,
  },
  buttonText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  buttonTextActive: {
    color: colors.textPrimary,
  },
  connectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  langButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  langButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderColor: colors.primary,
  },
  langFlag: {
    fontSize: 24,
  },
  langMenu: {
    position: 'absolute',
    bottom: 60,
    right: 0,
    width: 220,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    zIndex: 9999,
    elevation: 10,
  },
  menuHeader: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  menuTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  langItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  langItemPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  langItemActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  langItemFlag: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  langItemText: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  errorContainer: {
    position: 'absolute',
    bottom: 60,
    right: 0,
    backgroundColor: 'rgba(220, 38, 38, 0.9)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    maxWidth: 250,
  },
  errorText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '500',
  },
})

export const AVAILABLE_LANGUAGES = [
  { code: 'he', label: 'עברית', flag: '🇮🇱' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', label: 'Português', flag: '🇵🇹' },
  { code: 'yi', label: 'ייִדיש', flag: '🕍' },
]
