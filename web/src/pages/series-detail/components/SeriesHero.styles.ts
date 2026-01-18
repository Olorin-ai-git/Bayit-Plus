/**
 * Series Hero Styles
 * Styling for the hero section component
 */

import { StyleSheet, Dimensions } from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '@bayit/shared/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const styles = StyleSheet.create({
  heroContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.65,
    position: 'relative',
  },
  backdropContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  backdrop: {
    width: '100%',
    height: '100%',
  },
  videoContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  gradientBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '75%',
  },
  gradientLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '60%',
  },
  heroContent: {
    position: 'absolute',
    left: 48,
    right: 48,
    bottom: 40,
    maxWidth: 600,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginBottom: spacing.md,
  },
  categoryText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '500',
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  metaItem: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  description: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  previewIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  previewDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff4444',
  },
  previewText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '500',
  },
});
