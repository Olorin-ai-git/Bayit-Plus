/**
 * ComprehensionQuizOverlay Styles
 * Extracted styles for file size compliance
 */

import { StyleSheet } from 'react-native';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';

export const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%',
    maxWidth: 600,
    maxHeight: '80%',
    borderRadius: borderRadius['2xl'],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorderLight,
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
  },
  titleTV: {
    fontSize: 32,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 16,
    marginTop: spacing.md,
  },
  errorText: {
    color: colors.error.DEFAULT,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
});
