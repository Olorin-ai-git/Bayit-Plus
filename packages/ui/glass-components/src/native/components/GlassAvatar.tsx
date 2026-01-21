/**
 * GlassAvatar Component
 *
 * Avatar with glassmorphic styling.
 * Supports images, initials, online status, and edit button.
 */

import React from 'react';
import { View, Text, Image, StyleSheet, Pressable, ViewStyle, StyleProp } from 'react-native';
import { colors, spacing, borderRadius } from '../../theme';

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
          style={[
            styles.image,
            { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 },
          ]}
        />
      );
    }

    if (initial) {
      return <Text style={[styles.initial, { fontSize }]}>{initial}</Text>;
    }

    // Use fallback icon or show placeholder text
    if (fallbackIcon) {
      return fallbackIcon;
    }

    return <Text style={[styles.initial, { fontSize: fontSize * 0.8 }]}>?</Text>;
  };

  return (
    <View style={[styles.container, style]} testID={testID}>
      <View
        style={[
          styles.avatar,
          {
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarSize / 2,
          },
          uri && styles.avatarWithImage,
        ]}
      >
        {renderContent()}

        {/* Online Status Indicator */}
        {showOnlineStatus && (
          <View
            style={[
              styles.statusIndicator,
              isOnline ? styles.statusOnline : styles.statusOffline,
              {
                width: avatarSize * 0.25,
                height: avatarSize * 0.25,
                borderRadius: avatarSize * 0.125,
                borderWidth: avatarSize * 0.04,
              },
            ]}
          />
        )}
      </View>

      {/* Edit Button */}
      {showEditButton && (
        <Pressable
          onPress={onEditPress}
          style={[
            styles.editButton,
            {
              width: avatarSize * 0.35,
              height: avatarSize * 0.35,
              borderRadius: avatarSize * 0.175,
              right: 0,
              bottom: 0,
            },
          ]}
        >
          {editIcon || <Text style={styles.editButtonText}>+</Text>}
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  avatar: {
    backgroundColor: colors.glassPurpleLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.glassBorder,
    overflow: 'hidden',
  },
  avatarWithImage: {
    borderColor: colors.glassBorderWhite,
    backgroundColor: 'transparent',
  },
  image: {
    resizeMode: 'cover',
  },
  initial: {
    fontWeight: '700',
    color: colors.primary,
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    borderColor: colors.background,
  },
  statusOnline: {
    backgroundColor: '#22c55e',
  },
  statusOffline: {
    backgroundColor: colors.textMuted,
  },
  editButton: {
    position: 'absolute',
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  editButtonText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,
  },
});

export default GlassAvatar;
