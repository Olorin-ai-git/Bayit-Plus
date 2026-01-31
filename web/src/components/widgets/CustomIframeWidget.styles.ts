/**
 * CustomIframeWidget Styles
 */

import { StyleSheet } from 'react-native';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';

export const TOUCH_TARGET_SIZE = 44;

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(10, 10, 20, 0.95)',
    // @ts-ignore - Web CSS
    backdropFilter: 'blur(12px)',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.glassBorderLight,
  } as any,
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.text,
  },
  closeButton: {
    width: TOUCH_TARGET_SIZE,
    height: TOUCH_TARGET_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: TOUCH_TARGET_SIZE / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  inputSection: {
    padding: spacing.md,
    gap: spacing.md,
  },
  inputLabel: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '500',
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  urlInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.text,
    minHeight: TOUCH_TARGET_SIZE,
  },
  urlInputError: {
    borderColor: colors.error.DEFAULT,
  },
  urlInputValid: {
    borderColor: colors.success.DEFAULT,
  },
  loadButton: {
    backgroundColor: colors.primary.DEFAULT,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    minHeight: TOUCH_TARGET_SIZE,
  },
  loadButtonDisabled: {
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
  },
  loadButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: fontSize.sm,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  errorText: {
    fontSize: fontSize.xs,
    color: colors.error.DEFAULT,
  },
  validText: {
    fontSize: fontSize.xs,
    color: colors.success.DEFAULT,
  },
  domainsInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  domainsLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: 4,
  },
  domainsList: {
    fontSize: fontSize.xs,
    color: colors.text,
  },
  iframeContainer: {
    flex: 1,
    backgroundColor: '#000',
    position: 'relative',
  },
  changeUrlButton: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    minHeight: TOUCH_TARGET_SIZE,
    justifyContent: 'center',
    // @ts-ignore - Web CSS
    backdropFilter: 'blur(8px)',
  } as any,
  changeUrlText: {
    fontSize: fontSize.xs,
    color: colors.text,
  },
});
