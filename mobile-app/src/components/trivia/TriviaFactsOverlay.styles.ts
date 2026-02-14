/**
 * TriviaFactsOverlay - Styles
 */

import { StyleSheet } from 'react-native';
import { spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { Colors } from '../../theme/colors';

export const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: spacing[12],
    left: spacing[4],
    right: spacing[4],
    zIndex: 100,
  },
  card: {
    alignItems: 'flex-start',
    backgroundColor: Colors.Glass.bgStrong,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    borderWidth: 1,
    borderColor: Colors.Glass.border,
  },
  iconContainer: {
    width: spacing[10],
    height: spacing[10],
    borderRadius: borderRadius.md,
    backgroundColor: Colors.Glass.purpleLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    marginHorizontal: spacing[3],
  },
  categoryLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: Colors.Primary.p400,
    textTransform: 'uppercase',
    marginBottom: spacing[0.5],
  },
  factText: {
    fontSize: fontSize.sm,
    color: Colors.Text.primary,
    lineHeight: fontSize.sm * 1.5,
  },
  dismissIcon: {
    padding: spacing[1],
  },
});
