/**
 * GlassAvatar Component
 *
 * Avatar with glassmorphic styling.
 * Supports images, initials, online status, and edit button.
 */

import React from 'react';
import { View, Text, Image, Pressable, ViewStyle, StyleProp } from 'react-native';
import { colors } from '../../theme';

export interface GlassAvatarProps {
  /** Avatar image URI */
  uri?: string | null;
  /** User name for initials fallback */
  name?: string;
  /** Size preset */
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  /** Show edit button overlay */
  showEditButton?: boolean;
  /** Edit button press handler */
  onEditPress?: () => void;
  /** Custom edit icon */
  editIcon?: React.ReactNode;
  /** Custom fallback icon */
  fallbackIcon?: React.ReactNode;
  /** Show online status indicator */
  showOnlineStatus?: boolean;
  /** Online status */
  isOnline?: boolean;
  /** Additional styles */
  style?: StyleProp<ViewStyle>;
  /** Test ID for testing */
  testID?: string;
}

const SIZES = {
  small: 40,
  medium: 56,
  large: 80,
  xlarge: 120,
} as const;

const FONT_SIZES = {
  small: 14,
  medium: 20,
  large: 28,
  xlarge: 40,
} as const;

/**
 * Glassmorphic avatar component
 */
export const GlassAvatar: React.FC<GlassAvatarProps> = ({
  uri,
  name,
  size = 'medium',
  showEditButton = false,
  onEditPress,
  editIcon,
  fallbackIcon,
  showOnlineStatus = false,
  isOnline = false,
  style,
  testID,
}) => {
  const avatarSize = SIZES[size];
  const fontSize = FONT_SIZES[size];
  const initial = name?.charAt(0).toUpperCase() || '';

  const renderContent = () => {
    if (uri) {
      return (
        <Image
          source={{ uri }}
          className="object-cover"
          style={{ width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }}
        />
      );
    }

    if (initial) {
      return <Text className="font-bold" style={{ fontSize, color: colors.primary }}>{initial}</Text>;
    }

    // Use fallback icon or show placeholder text
    if (fallbackIcon) {
      return fallbackIcon;
    }

    return <Text className="font-bold" style={{ fontSize: fontSize * 0.8, color: colors.primary }}>?</Text>;
  };

  return (
    <View className="relative" style={style} testID={testID}>
      <View
        className="justify-center items-center border-2 overflow-hidden"
        style={{
          width: avatarSize,
          height: avatarSize,
          borderRadius: avatarSize / 2,
          borderColor: uri ? colors.glassBorderWhite : colors.glassBorder,
          backgroundColor: uri ? 'transparent' : colors.glassPurpleLight,
        }}
      >
        {renderContent()}

        {/* Online Status Indicator */}
        {showOnlineStatus && (
          <View
            className="absolute bottom-0.5 right-0.5"
            style={{
              width: avatarSize * 0.25,
              height: avatarSize * 0.25,
              borderRadius: avatarSize * 0.125,
              borderWidth: avatarSize * 0.04,
              borderColor: colors.background,
              backgroundColor: isOnline ? '#22c55e' : colors.textMuted,
            }}
          />
        )}
      </View>

      {/* Edit Button */}
      {showEditButton && (
        <Pressable
          onPress={onEditPress}
          className="absolute justify-center items-center border-2"
          style={{
            width: avatarSize * 0.35,
            height: avatarSize * 0.35,
            borderRadius: avatarSize * 0.175,
            right: 0,
            bottom: 0,
            backgroundColor: colors.primary,
            borderColor: colors.background,
          }}
        >
          {editIcon || <Text className="text-sm font-bold" style={{ color: colors.text }}>+</Text>}
        </Pressable>
      )}
    </View>
  );
};

export default GlassAvatar;
