import React from 'react';
import {
  TouchableOpacity,
  Animated,
  View,
  Text,
  Image,
  Platform,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { GlassView } from './GlassView';
import { colors, borderRadius, spacing } from '../theme';
import { useTVFocus } from '../hooks/useTVFocus';

interface GlassCardProps {
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  onPress?: () => void;
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  badge?: string;
  badgeColor?: string;
  showPlayIcon?: boolean;
  progress?: number;
  hasTVPreferredFocus?: boolean;
  /** When true, bypasses default width/height for custom sizing (e.g., modals) */
  autoSize?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  title,
  subtitle,
  imageUrl,
  onPress,
  width = 200,
  height = 150,
  style,
  children,
  badge,
  badgeColor = colors.primary,
  showPlayIcon = false,
  progress,
  hasTVPreferredFocus = false,
  autoSize = false,
}) => {
  const { isFocused, handleFocus, handleBlur, scaleTransform, focusStyle } = useTVFocus({
    styleType: 'card',
  });

  // Only show image/placeholder area when being used as a full card (has title or imageUrl)
  const isFullCard = title || subtitle || imageUrl;
  // Bypass default dimensions when: autoSize is true, OR used as container (no title/imageUrl)
  const shouldBypassDimensions = autoSize || !isFullCard;

  const cardContent = (
    <>
      {/* Image - only render when used as full card */}
      {isFullCard && (
        imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            className="rounded-t-lg"
            style={{ width, height: height * 0.65 }}
            resizeMode="cover"
          />
        ) : (
          <View
            className="bg-[#1a1525] rounded-t-lg justify-center items-center"
            style={{ width, height: height * 0.65 }}
          >
            <Text className="text-[32px]">🎬</Text>
          </View>
        )
      )}

      {/* Badge */}
      {badge && (
        <View
          className="absolute top-2 right-2 px-2 py-0.5 rounded-sm"
          style={{ backgroundColor: badgeColor }}
        >
          <Text className="text-[10px] font-bold text-white">{badge}</Text>
        </View>
      )}

      {/* Play Icon Overlay */}
      {showPlayIcon && isFocused && (
        <View className="absolute inset-0 bg-black/30 justify-center items-center">
          <View
            className="w-12 h-12 rounded-full justify-center items-center"
            style={{ backgroundColor: colors.primary }}
          >
            <Text className="text-[20px] ml-1" style={{ color: colors.background }}>▶</Text>
          </View>
        </View>
      )}

      {/* Progress Bar */}
      {progress !== undefined && progress > 0 && (
        <View
          className="absolute bottom-0 left-0 right-0 h-0.5"
          style={{ backgroundColor: colors.glassBorderWhite }}
        >
          <View
            className="h-full"
            style={{ width: `${progress}%`, backgroundColor: colors.primary }}
          />
        </View>
      )}

      {/* Text Content */}
      {(title || subtitle) && (
        <View className="p-2">
          {title && (
            <Text className="text-sm font-semibold text-white text-right" numberOfLines={1}>
              {title}
            </Text>
          )}
          {subtitle && (
            <Text className="text-xs text-right mt-0.5" style={{ color: colors.textSecondary }} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
      )}

      {/* Custom Children */}
      {children}
    </>
  );

  return (
    <TouchableOpacity
      onPress={onPress}
      onFocus={handleFocus}
      onBlur={handleBlur}
      activeOpacity={0.9}
      style={!shouldBypassDimensions && { width }}
      className={!shouldBypassDimensions ? "mr-4 overflow-visible" : ""}
      // @ts-ignore - TV-specific prop
      hasTVPreferredFocus={hasTVPreferredFocus}
    >
      <Animated.View style={[scaleTransform]}>
        <GlassView
          className="overflow-visible"
          style={[
            !shouldBypassDimensions && { width, minHeight: height },
            focusStyle,
            style,
          ]}
          intensity="medium"
        >
          {cardContent}
        </GlassView>
      </Animated.View>
    </TouchableOpacity>
  );
};

export default GlassCard;
