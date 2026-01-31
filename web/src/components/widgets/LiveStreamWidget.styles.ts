/**
 * LiveStreamWidget Styles
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
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionButton: {
    width: TOUCH_TARGET_SIZE,
    height: TOUCH_TARGET_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: TOUCH_TARGET_SIZE / 2,
  },
  liveBadge: {
    backgroundColor: colors.error.DEFAULT,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  videoContainer: {
    flex: 1,
    backgroundColor: '#000',
    aspectRatio: 16 / 9,
  },
  nowPlayingBar: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  nowPlayingTitle: {
    fontSize: fontSize.xs,
    color: colors.text,
  },
  attributionFooter: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  attributionText: {
    fontSize: 9,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
