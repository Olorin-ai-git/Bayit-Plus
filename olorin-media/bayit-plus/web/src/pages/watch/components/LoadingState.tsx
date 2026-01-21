/**
 * Loading State Component
 * Skeleton loading state for watch page
 */

import { View, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';

export function LoadingState() {
  return (
    <View style={styles.container}>
      <View style={styles.skeletonPlayer} />
      <View style={styles.skeletonTitle} />
      <View style={styles.skeletonDescription} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skeletonPlayer: {
    aspectRatio: 16 / 9,
    backgroundColor: colors.glass,
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  skeletonTitle: {
    height: 32,
    width: 256,
    backgroundColor: colors.glass,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  skeletonDescription: {
    height: 16,
    width: '80%',
    maxWidth: 600,
    backgroundColor: colors.glass,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.md,
  },
});
