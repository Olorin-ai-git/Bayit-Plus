import React from 'react';
import { View, Text, Image, StyleSheet, Pressable } from 'react-native';
import { colors, spacing, borderRadius } from '../../theme';

export interface GlassAvatarProps {
  uri?: string | null;
  name?: string;
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  showEditButton?: boolean;
  onEditPress?: () => void;
  editIcon?: React.ReactNode;
  fallbackIcon?: React.ReactNode;
  showOnlineStatus?: boolean;
  isOnline?: boolean;
  style?: any;
}

const SIZES = {
  small: 40,
  medium: 56,
  large: 80,
  xlarge: 120,
};

const FONT_SIZES = {
  small: 14,
  medium: 20,
  large: 28,
  xlarge: 40,
};

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
}) => {
  const avatarSize = SIZES[size];
  const fontSize = FONT_SIZES[size];
  const initial = name?.charAt(0).toUpperCase() || '';

  const renderContent = () => {
    if (uri) {
      return (
        <Image
          source={{ uri }}
          style={[styles.image, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}
        />
      );
    }

    if (initial) {
      return (
        <Text style={[styles.initial, { fontSize }]}>{initial}</Text>
      );
    }

    // Use fallback icon or show placeholder text
    if (fallbackIcon) {
      return fallbackIcon;
    }

    return <Text style={[styles.initial, { fontSize: fontSize * 0.8 }]}>?</Text>;
  };

  return (
    <View style={[styles.container, style]}>
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
    backgroundColor: 'rgba(0, 217, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0, 217, 255, 0.4)',
    overflow: 'hidden',
  },
  avatarWithImage: {
    borderColor: 'rgba(255, 255, 255, 0.2)',
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
