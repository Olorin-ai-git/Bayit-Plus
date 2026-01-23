/**
 * Loading State Component
 * Skeleton loading state for watch page
 */

import { View, StyleSheet } from 'react-native';
import { spacing, borderRadius } from '@bayit/shared/theme';

export function LoadingState() {
  return (
    <View style={styles.container}>
      <View style={styles.playerSkeleton} />
      <View style={styles.titleSkeleton} />
      <View style={styles.descSkeleton} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  playerSkeleton: {
    aspectRatio: 16 / 9,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius['2xl'],
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  titleSkeleton: {
    height: 32,
    width: 256,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  descSkeleton: {
    height: 16,
    width: '80%',
    maxWidth: 600,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.md,
  },
});
