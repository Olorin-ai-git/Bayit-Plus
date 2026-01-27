import React from 'react';
import {
  TouchableOpacity,
  Animated,
  StyleSheet,
  View,
  Text,
  Image,
  Platform,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { GlassView } from './GlassView';
import { colors, borderRadius, spacing } from '@olorin/design-tokens';
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
        <View style={[{ width, height: height * 0.65 }, { justifyContent: 'center', alignItems: 'center' }]}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={[styles.image, { width: '100%', height: '100%' }]}
              resizeMode="contain"
            />
          ) : (
            <View style={[styles.imagePlaceholder, { width: '100%', height: '100%' }]}>
              <Text style={styles.placeholderIcon}>🎬</Text>
            </View>
          )}
        </View>
      )}

      {/* Badge */}
      {badge && (
        <View style={[styles.badge, { backgroundColor: badgeColor }]}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}

      {/* Play Icon Overlay */}
      {showPlayIcon && isFocused && (
        <View style={styles.playOverlay}>
          <View style={styles.playButton}>
            <Text style={styles.playIcon}>▶</Text>
          </View>
        </View>
      )}

      {/* Progress Bar */}
      {progress !== undefined && progress > 0 && (
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: `${progress}%` }]} />
        </View>
      )}

      {/* Text Content */}
      {(title || subtitle) && (
        <View style={styles.textContainer}>
          {title && (
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          )}
          {subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
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
      style={[!shouldBypassDimensions && styles.touchable, !shouldBypassDimensions && { width }]}
      // @ts-ignore - TV-specific prop
      hasTVPreferredFocus={hasTVPreferredFocus}
    >
      <Animated.View style={[scaleTransform]}>
        <GlassView
          style={[
            styles.card,
            !shouldBypassDimensions && { width, minHeight: height },
            focusStyle,
            style,
          ]}
          intensity="subtle"
        >
          {cardContent}
        </GlassView>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  touchable: {
    marginRight: spacing.md,
    overflow: 'visible' as any,
  },
  card: {
    // Removed overflow: 'visible' to preserve GlassView's overflow: 'hidden'
    // which is required for backdrop-filter to work properly on web
  },
  image: {
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    backgroundColor: colors.backgroundLighter,
  },
  imagePlaceholder: {
    backgroundColor: colors.backgroundLighter,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 32,
  },
  textContainer: {
    padding: spacing.sm,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'right',
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'right',
  },
  badge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.text,
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.glassOverlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary.DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    fontSize: 20,
    color: colors.background,
    marginLeft: 4,
  },
  progressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.glassBorderWhite,
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary.DEFAULT,
  },
});

export default GlassCard;
