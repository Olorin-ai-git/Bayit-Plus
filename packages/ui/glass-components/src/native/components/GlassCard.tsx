/**
 * GlassCard Component
 *
 * Content card with glassmorphic styling, image support, and TV focus.
 * Supports badges, progress bars, and custom children.
 */

import React from 'react';
import {
  TouchableOpacity,
  Animated,
  View,
  Text,
  Image,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { GlassView } from './GlassView';
import { colors, spacing } from '../../theme';
import { useTVFocus } from '../../hooks/useTVFocus';

export interface GlassCardProps {
  /** Card title */
  title?: string;
  /** Card subtitle */
  subtitle?: string;
  /** Image URL for card */
  imageUrl?: string;
  /** Press handler */
  onPress?: () => void;
  /** Card width */
  width?: number;
  /** Card height */
  height?: number;
  /** Additional styles */
  style?: StyleProp<ViewStyle>;
  /** Custom content */
  children?: React.ReactNode;
  /** Badge text */
  badge?: string;
  /** Badge background color */
  badgeColor?: string;
  /** Show play icon overlay on focus */
  showPlayIcon?: boolean;
  /** Progress percentage (0-100) */
  progress?: number;
  /** TV preferred focus */
  hasTVPreferredFocus?: boolean;
  /** Bypass default dimensions for custom sizing */
  autoSize?: boolean;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Glassmorphic card component with TV focus support
 */
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
  testID,
}) => {
  const { isFocused, handleFocus, handleBlur, scaleTransform, focusStyle } = useTVFocus({
    styleType: 'card',
  });

  // Only show image/placeholder area when being used as a full card
  const isFullCard = title || subtitle || imageUrl;
  // Bypass default dimensions when autoSize is true or used as container
  const shouldBypassDimensions = autoSize || !isFullCard;

  const cardContent = (
    <>
      {/* Image - only render when used as full card */}
      {isFullCard &&
        (imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            className="rounded-t-lg"
            style={{ width, height: height * 0.65 }}
            resizeMode="cover"
          />
        ) : (
          <View className="rounded-t-lg justify-center items-center" style={{ width, height: height * 0.65, backgroundColor: colors.backgroundLighter }}>
            <Text className="text-[32px]">🎬</Text>
          </View>
        ))}

      {/* Badge */}
      {badge && (
        <View className="absolute top-2 right-2 px-2 py-0.5 rounded-sm" style={{ backgroundColor: badgeColor }}>
          <Text className="text-[10px] font-bold" style={{ color: colors.text }}>{badge}</Text>
        </View>
      )}

      {/* Play Icon Overlay */}
      {showPlayIcon && isFocused && (
        <View className="absolute inset-0 justify-center items-center" style={{ backgroundColor: colors.glassOverlay }}>
          <View className="w-12 h-12 rounded-full justify-center items-center" style={{ backgroundColor: colors.primary }}>
            <Text className="text-xl ml-1" style={{ color: colors.background }}>▶</Text>
          </View>
        </View>
      )}

      {/* Progress Bar */}
      {progress !== undefined && progress > 0 && (
        <View className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ backgroundColor: colors.glassBorderWhite }}>
          <View className="h-full" style={{ width: `${progress}%` as unknown as number, backgroundColor: colors.primary }} />
        </View>
      )}

      {/* Text Content */}
      {(title || subtitle) && (
        <View className="p-2">
          {title && (
            <Text className="text-sm font-semibold text-right" style={{ color: colors.text }} numberOfLines={1}>
              {title}
            </Text>
          )}
          {subtitle && (
            <Text className="text-xs mt-0.5 text-right" style={{ color: colors.textSecondary }} numberOfLines={1}>
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
      className={!shouldBypassDimensions ? 'mr-4 overflow-visible' : undefined}
      style={!shouldBypassDimensions ? { width } : undefined}
      testID={testID}
      {...({ hasTVPreferredFocus } as object)}
    >
      <Animated.View style={[scaleTransform]}>
        <GlassView
          className="overflow-visible"
          style={[
            !shouldBypassDimensions && { width, minHeight: height },
            isFocused ? focusStyle : undefined,
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
