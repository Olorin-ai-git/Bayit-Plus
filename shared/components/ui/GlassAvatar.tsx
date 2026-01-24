import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
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

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  avatarContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    overflow: 'hidden',
  },
  avatarWithImage: {
    backgroundColor: 'transparent',
    borderColor: colors.white + '4D', // 30% opacity
  },
  avatarWithInitial: {
    backgroundColor: colors.purple + '33', // 20% opacity
    borderColor: colors.purple + '99', // 60% opacity
  },
  image: {
    resizeMode: 'cover',
  },
  initialText: {
    fontWeight: 'bold',
    color: colors.purple,
  },
  placeholderText: {
    fontWeight: 'bold',
    color: colors.purple,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    borderColor: colors.background,
  },
  onlineActive: {
    backgroundColor: colors.success,
  },
  onlineInactive: {
    backgroundColor: colors.gray500,
  },
  editButton: {
    position: 'absolute',
    backgroundColor: colors.purple,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    right: 0,
    bottom: 0,
    borderColor: colors.background,
  },
  editButtonText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
});

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
          style={[
            styles.image,
            {
              width: avatarSize,
              height: avatarSize,
              borderRadius: avatarSize / 2
            }
          ]}
        />
      );
    }

    if (initial) {
      return (
        <Text style={[styles.initialText, { fontSize }]}>{initial}</Text>
      );
    }

    // Use fallback icon or show placeholder text
    if (fallbackIcon) {
      return fallbackIcon;
    }

    return <Text style={[styles.placeholderText, { fontSize: fontSize * 0.8 }]}>?</Text>;
  };

  return (
    <View style={[styles.container, style]}>
      <View
        style={[
          styles.avatarContainer,
          uri ? styles.avatarWithImage : styles.avatarWithInitial,
          {
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarSize / 2,
          }
        ]}
      >
        {renderContent()}

        {/* Online Status Indicator */}
        {showOnlineStatus && (
          <View
            style={[
              styles.onlineIndicator,
              isOnline ? styles.onlineActive : styles.onlineInactive,
              {
                width: avatarSize * 0.25,
                height: avatarSize * 0.25,
                borderRadius: avatarSize * 0.125,
                borderWidth: avatarSize * 0.04,
              }
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
            }
          ]}
        >
          {editIcon || <Text style={styles.editButtonText}>+</Text>}
        </Pressable>
      )}
    </View>
  );
};

export default GlassAvatar;
