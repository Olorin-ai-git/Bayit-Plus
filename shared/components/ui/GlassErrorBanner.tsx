/**
 * GlassErrorBanner Component
 *
 * Error notification banner for displaying error messages with dismissal.
 * Used across admin pages for consistent error display.
 *
 * Platform: Web, iOS, tvOS, Android
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { AlertCircle, X } from 'lucide-react';
import { GlassButton } from './GlassButton';

export interface GlassErrorBannerProps {
  /** Error message to display */
  message: string | null;
  /** Callback when dismiss button is pressed */
  onDismiss: () => void;
  /** Bottom margin of the banner */
  marginBottom?: number;
  /** Custom container style */
  style?: StyleProp<ViewStyle>;
  /** Accessibility label */
  accessibilityLabel?: string;
}

export const GlassErrorBanner: React.FC<GlassErrorBannerProps> = ({
  message,
  onDismiss,
  marginBottom = 16,
  style,
  accessibilityLabel = 'Error notification',
}) => {
  if (!message) return null;

  return (
    <View
      style={[
        styles.errorContainer,
        { marginBottom },
        style,
      ]}
      accessibilityRole="alert"
      accessibilityLabel={accessibilityLabel}
      // @ts-ignore - accessible prop exists in React Native Web
      accessible
    >
      <AlertCircle
        size={18}
        color="#ef4444"
        style={styles.icon as any}
      />
      <Text style={styles.errorText} numberOfLines={2}>
        {message}
      </Text>
      <GlassButton
        title=""
        variant="ghost"
        size="sm"
        onPress={onDismiss}
        icon={<X size={18} color="#ef4444" />}
        accessibilityLabel="Dismiss error"
        style={styles.dismissButton}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  icon: {
    flexShrink: 0,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '500',
    lineHeight: 20,
  },
  dismissButton: {
    flexShrink: 0,
  },
});
