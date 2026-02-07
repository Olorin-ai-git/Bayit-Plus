import { StyleSheet } from 'react-native';
import { colors, spacing, fontSize } from '@olorin/design-tokens';

export const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  focusGuide: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  header: {
    marginBottom: spacing.xxl,
  },
  title: {
    fontSize: fontSize['4xl'],
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.md,
  },
  subtitle: {
    fontSize: fontSize.xl,
    color: colors.textMuted,
  },
  section: {
    marginBottom: spacing.xxl,
    padding: spacing.xxl,
  },
  sectionHeader: {
    fontSize: fontSize['2xl'],
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  description: {
    fontSize: fontSize.lg,
    color: colors.textMuted,
    lineHeight: fontSize.lg * 1.6,
    marginBottom: spacing.lg,
  },
  pinButton: {
    marginTop: spacing.lg,
    minHeight: 60,
  },
  sliderContainer: {
    marginTop: spacing.lg,
  },
  timePickerContainer: {
    marginTop: spacing.lg,
  },
  errorContainer: {
    marginTop: spacing.xl,
    padding: spacing.xl,
    backgroundColor: colors.errorBackground,
    borderRadius: 12,
  },
  error: {
    color: colors.error,
    fontSize: fontSize.lg,
    textAlign: 'center',
  },
  bottomSpacing: {
    height: spacing.xxl * 2,
  },
});
