import React, { useRef, useState, useCallback } from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  Pressable,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../theme';
import { useDirection } from '../hooks/useDirection';
import { useTVFocus } from './hooks/useTVFocus';

// Check if this is a TV build (set by webpack)
declare const __TV__: boolean;
const IS_TV_BUILD = typeof __TV__ !== 'undefined' && __TV__;

// Platform-specific sizing
const isMobile = Platform.OS === 'ios' || Platform.OS === 'android';
const isMobilePhone = isMobile && !Platform.isTV;

// TV cards are larger for 10-foot UI, mobile cards are smaller for touch UI
const DEFAULT_WIDTH = IS_TV_BUILD ? 380 : (isMobilePhone ? 140 : 280);
const DEFAULT_HEIGHT = IS_TV_BUILD ? 220 : (isMobilePhone ? 85 : 160);

type ContentType = 'vod' | 'live' | 'podcast' | 'radio' | 'movie' | 'series' | 'channel';

interface FavoritesService {
  toggleFavorite: (contentId: string, contentType: string) => Promise<{ is_favorite: boolean }>;
  isFavorite: (contentId: string) => Promise<{ is_favorite: boolean }>;
}

interface WatchlistService {
  toggleWatchlist: (contentId: string, contentType: string) => Promise<{ in_watchlist: boolean }>;
  isInWatchlist: (contentId: string) => Promise<{ in_watchlist: boolean }>;
}

interface FocusableCardProps {
  id?: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  contentType?: ContentType;
  onPress: () => void;
  width?: number;
  height?: number;
  showActions?: boolean;
  favoritesService?: FavoritesService;
  watchlistService?: WatchlistService;
}

export const FocusableCard: React.FC<FocusableCardProps> = ({
  id,
  title,
  subtitle,
  imageUrl,
  contentType,
  onPress,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  showActions = true,
  favoritesService,
  watchlistService,
}) => {
  const { textAlign, isRTL } = useDirection();
  const { handleFocus, handleBlur, scaleTransform, focusStyle, isFocused } = useTVFocus({
    styleType: 'card',
  });

  // Action button states
  const [isFavorite, setIsFavorite] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [watchlistLoading, setWatchlistLoading] = useState(false);

  const handleFavoriteToggle = useCallback(async (e?: any) => {
    // Prevent event propagation on all platforms
    e?.preventDefault?.();
    e?.stopPropagation?.();

    if (!id || !contentType || !favoritesService || favoriteLoading) return;

    setFavoriteLoading(true);
    try {
      const result = await favoritesService.toggleFavorite(id, contentType);
      setIsFavorite(result.is_favorite);
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    } finally {
      setFavoriteLoading(false);
    }
  }, [id, contentType, favoritesService, favoriteLoading]);

  const handleWatchlistToggle = useCallback(async (e?: any) => {
    // Prevent event propagation on all platforms
    e?.preventDefault?.();
    e?.stopPropagation?.();

    if (!id || !contentType || !watchlistService || watchlistLoading) return;

    setWatchlistLoading(true);
    try {
      const result = await watchlistService.toggleWatchlist(id, contentType);
      setInWatchlist(result.in_watchlist);
    } catch (error) {
      console.error('Failed to toggle watchlist:', error);
    } finally {
      setWatchlistLoading(false);
    }
  }, [id, contentType, watchlistService, watchlistLoading]);

  const showActionButtons = showActions && id && contentType && (favoritesService || watchlistService);

  return (
    <TouchableOpacity
      onPress={onPress}
      onFocus={handleFocus}
      onBlur={handleBlur}
      activeOpacity={1}
      style={styles.touchable}
    >
      <Animated.View
        style={[
          styles.card,
          { width, height },
          scaleTransform,
          focusStyle,
        ]}
      >
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>{title?.[0] || '?'}</Text>
          </View>
        )}

        {/* Action Buttons - Show on focus/hover */}
        {showActionButtons && isFocused && (
          <View
            style={[styles.actionButtons, isRTL ? styles.actionButtonsLeft : styles.actionButtonsRight]}
            // @ts-ignore - Web only onClick
            onClick={(e: any) => { e.stopPropagation(); e.preventDefault(); }}
          >
            {favoritesService && (
              <Pressable
                onPress={handleFavoriteToggle}
                disabled={favoriteLoading}
                style={[
                  styles.actionButton,
                  isFavorite && styles.actionButtonActive,
                ]}
              >
                <Ionicons
                  name={isFavorite ? 'star' : 'star-outline'}
                  size={IS_TV_BUILD ? 24 : 18}
                  color={isFavorite ? colors.warning : colors.text}
                />
              </Pressable>
            )}
            {watchlistService && (
              <Pressable
                onPress={handleWatchlistToggle}
                disabled={watchlistLoading}
                style={[
                  styles.actionButton,
                  inWatchlist && styles.actionButtonActive,
                ]}
              >
                <Ionicons
                  name={inWatchlist ? 'bookmark' : 'bookmark-outline'}
                  size={IS_TV_BUILD ? 24 : 18}
                  color={inWatchlist ? colors.primary : colors.text}
                />
              </Pressable>
            )}
          </View>
        )}

        <View style={styles.overlay}>
          <Text style={[styles.title, { textAlign }]} numberOfLines={1}>
            {title || ''}
          </Text>
          {subtitle && (
            <Text style={[styles.subtitle, { textAlign }]} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  touchable: {
    marginLeft: isMobilePhone ? 8 : 20,
    overflow: 'visible' as any,
  },
  card: {
    borderRadius: isMobilePhone ? 8 : 12,
    overflow: 'visible' as any,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: isMobilePhone ? 8 : 12,
  },
  placeholder: {
    flex: 1,
    backgroundColor: colors.backgroundLighter,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: isMobilePhone ? 8 : 12,
  },
  placeholderText: {
    fontSize: isMobilePhone ? 24 : 48,
    fontWeight: 'bold',
    color: colors.primary,
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: isMobilePhone ? 6 : 12,
    backgroundColor: colors.overlay,
    borderBottomLeftRadius: isMobilePhone ? 8 : 12,
    borderBottomRightRadius: isMobilePhone ? 8 : 12,
  },
  title: {
    fontSize: IS_TV_BUILD ? 24 : (isMobilePhone ? 12 : 18),
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: IS_TV_BUILD ? 18 : (isMobilePhone ? 10 : 14),
    color: colors.textSecondary,
    marginTop: isMobilePhone ? 1 : 2,
  },
  actionButtons: {
    position: 'absolute',
    top: isMobilePhone ? spacing.xs : spacing.sm,
    flexDirection: 'row',
    gap: spacing.xs,
    zIndex: 10,
  },
  actionButtonsRight: {
    right: isMobilePhone ? spacing.xs : spacing.sm,
  },
  actionButtonsLeft: {
    left: isMobilePhone ? spacing.xs : spacing.sm,
  },
  actionButton: {
    width: IS_TV_BUILD ? 44 : (isMobilePhone ? 24 : 32),
    height: IS_TV_BUILD ? 44 : (isMobilePhone ? 24 : 32),
    borderRadius: IS_TV_BUILD ? 22 : (isMobilePhone ? 12 : 16),
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    // @ts-ignore - Web transition
    ...(Platform.OS === 'web' && {
      backdropFilter: 'blur(8px)',
      transition: 'all 0.2s ease',
    }),
  },
  actionButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
});

export default FocusableCard;
