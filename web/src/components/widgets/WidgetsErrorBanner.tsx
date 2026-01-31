/**
 * WidgetsErrorBanner - Error message banner with dismiss button
 *
 * Displays error messages with:
 * - Alert icon
 * - Error message text
 * - Dismiss button (X)
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { z } from 'zod';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import { Icon } from '@olorin/shared-icons/web';

const WidgetsErrorBannerPropsSchema = z.object({
  message: z.string(),
  onDismiss: z.function().args().returns(z.void()),
});

type WidgetsErrorBannerProps = z.infer<typeof WidgetsErrorBannerPropsSchema>;

/**
 * WidgetsErrorBanner - Error message display with dismiss
 */
export default function WidgetsErrorBanner({ message, onDismiss }: WidgetsErrorBannerProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Icon name="alertTriangle" size="md" color="#fca5a5" />
      </View>
      <Text style={styles.message}>{message}</Text>
      <Pressable onPress={onDismiss} style={styles.closeButton}>
        <Icon name="x" size="md" color="#fca5a5" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(127, 29, 29, 0.4)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.6)',
  },
  iconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    flex: 1,
    color: '#fecaca',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  closeButton: {
    padding: spacing.xs,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
