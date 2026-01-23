/**
 * WidgetsErrorBanner - Error message banner with dismiss button
 *
 * Displays error messages with:
 * - Alert icon
 * - Error message text
 * - Dismiss button (X)
 */

import { View, Text, Pressable } from 'react-native';
import { AlertCircle, X } from 'lucide-react';
import { z } from 'zod';

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
    <View className="bg-red-500/10 rounded-lg p-4 items-center gap-2 mb-6 flex-row">
      <AlertCircle size={18} color="#ef4444" />
      <Text className="flex-1 text-red-500 text-sm">{message}</Text>
      <Pressable onPress={onDismiss}>
        <X size={18} color="#ef4444" />
      </Pressable>
    </View>
  );
}
