import React from 'react';
import { View, Text, Image, Pressable } from 'react-native';
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
          className="object-cover"
          style={{ width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }}
        />
      );
    }

    if (initial) {
      return (
        <Text className="font-bold text-purple-500" style={{ fontSize }}>{initial}</Text>
      );
    }

    // Use fallback icon or show placeholder text
    if (fallbackIcon) {
      return fallbackIcon;
    }

    return <Text className="font-bold text-purple-500" style={{ fontSize: fontSize * 0.8 }}>?</Text>;
  };

  return (
    <View className="relative" style={style}>
      <View
        className={`justify-center items-center border-2 overflow-hidden ${
          uri ? 'bg-transparent border-white/30' : 'bg-purple-500/20 border-purple-500/60'
        }`}
        style={{
          width: avatarSize,
          height: avatarSize,
          borderRadius: avatarSize / 2,
        }}
      >
        {renderContent()}

        {/* Online Status Indicator */}
        {showOnlineStatus && (
          <View
            className={`absolute bottom-0.5 right-0.5 ${isOnline ? 'bg-green-500' : 'bg-gray-500'}`}
            style={{
              width: avatarSize * 0.25,
              height: avatarSize * 0.25,
              borderRadius: avatarSize * 0.125,
              borderWidth: avatarSize * 0.04,
              borderColor: colors.background,
            }}
          />
        )}
      </View>

      {/* Edit Button */}
      {showEditButton && (
        <Pressable
          onPress={onEditPress}
          className="absolute bg-purple-500 justify-center items-center border-2"
          style={{
            width: avatarSize * 0.35,
            height: avatarSize * 0.35,
            borderRadius: avatarSize * 0.175,
            right: 0,
            bottom: 0,
            borderColor: colors.background,
          }}
        >
          {editIcon || <Text className="text-white font-bold text-sm">+</Text>}
        </Pressable>
      )}
    </View>
  );
};

export default GlassAvatar;
