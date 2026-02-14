/**
 * OnlineStatusBadge - Displays user online/offline/away status as a colored dot.
 *
 * Green for online, gray for offline, yellow for away.
 * Supports small (8px) and medium (12px) sizes.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, spacing } from '@olorin/design-tokens';
import Colors from '../../theme/colors';

type StatusType = 'online' | 'offline' | 'away';
type BadgeSize = 'sm' | 'md';

interface OnlineStatusBadgeProps {
  status: StatusType;
  size?: BadgeSize;
}

const STATUS_COLORS: Record<StatusType, string> = {
  online: Colors.Success.default,
  offline: Colors.Dark.d500,
  away: Colors.Warning.default,
};

const SIZE_DIMENSIONS: Record<BadgeSize, number> = {
  sm: 8,
  md: 12,
};

const BORDER_WIDTHS: Record<BadgeSize, number> = {
  sm: 1,
  md: 2,
};

export const OnlineStatusBadge: React.FC<OnlineStatusBadgeProps> = ({
  status,
  size = 'md',
}) => {
  const dimension = SIZE_DIMENSIONS[size];
  const borderWidth = BORDER_WIDTHS[size];

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${status}`}
      accessibilityHint={`User is currently ${status}`}
      style={[
        styles.badge,
        {
          width: dimension,
          height: dimension,
          borderRadius: dimension / 2,
          backgroundColor: STATUS_COLORS[status],
          borderWidth,
        },
      ]}
    />
  );
};

const styles = StyleSheet.create({
  badge: {
    borderColor: Colors.Background.primary,
  },
});
