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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.text,
    fontSize: fontSize['4xl'],
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
  errorContainer: {
    marginBottom: spacing.xxl,
    padding: spacing.xxl,
  },
  errorText: {
    color: colors.error,
    fontSize: fontSize.lg,
    marginBottom: spacing.md,
  },
  dismissButton: {
    marginTop: spacing.sm,
    minHeight: 60,
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
    marginTop: spacing.lg,
  },
  description: {
    fontSize: fontSize.lg,
    color: colors.textMuted,
    lineHeight: fontSize.lg * 1.6,
    marginBottom: spacing.lg,
  },
  formContainer: {
    marginTop: spacing.lg,
  },
  formHeader: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSize.lg,
    fontWeight: '500',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.glassLight,
    borderColor: colors.glassBorder,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.lg,
    color: colors.text,
    fontSize: fontSize.xl,
    marginBottom: spacing.lg,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  button: {
    flex: 1,
    minHeight: 60,
  },
  householdHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xxl,
  },
  householdName: {
    fontSize: fontSize['3xl'],
    fontWeight: 'bold',
    color: colors.text,
  },
  memberCount: {
    fontSize: fontSize.lg,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  memberCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.glassLight,
    padding: spacing.lg,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  memberName: {
    fontSize: fontSize.xl,
    fontWeight: '500',
    color: colors.text,
  },
  memberRole: {
    fontSize: fontSize.lg,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  invitationCard: {
    backgroundColor: colors.glassLight,
    borderColor: colors.warning,
    borderWidth: 2,
    padding: spacing.lg,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  inviteEmail: {
    fontSize: fontSize.xl,
    fontWeight: '500',
    color: colors.text,
  },
  inviteDetails: {
    fontSize: fontSize.lg,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  inviteButton: {
    marginTop: spacing.xxl,
    minHeight: 60,
  },
  inviteFormContainer: {
    marginTop: spacing.xxl,
    padding: spacing.xxl,
  },
  bottomSpacing: {
    height: spacing.xxl * 2,
  },
  confirmContent: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  confirmTitle: {
    fontSize: fontSize['2xl'],
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.md,
  },
  confirmMessage: {
    fontSize: fontSize.lg,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
});
