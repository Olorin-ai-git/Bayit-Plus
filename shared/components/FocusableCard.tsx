import React, { useRef, useState, useCallback } from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  Image,
  Animated,
  Pressable,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '@olorin/design-tokens';
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
      className={`${isMobilePhone ? 'ml-2' : 'ml-5'} overflow-visible`}
    >
      <Animated.View
        className={`${isMobilePhone ? 'rounded-lg' : 'rounded-xl'} overflow-visible bg-white/5 border border-white/10`}
        style={[
          { width, height },
          scaleTransform,
          focusStyle,
        ]}
      >
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            className={`w-full h-full ${isMobilePhone ? 'rounded-lg' : 'rounded-xl'}`}
            resizeMode="cover"
          />
        ) : (
          <View className={`flex-1 bg-white/10 justify-center items-center ${isMobilePhone ? 'rounded-lg' : 'rounded-xl'}`}>
            <Text className={`${isMobilePhone ? 'text-2xl' : 'text-5xl'} font-bold text-purple-500`}>{title?.[0] || '?'}</Text>
          </View>
        )}

        {/* Action Buttons - Show on focus/hover */}
        {showActionButtons && isFocused && (
          <View
            className={`absolute ${isMobilePhone ? 'top-1' : 'top-2'} flex-row gap-1 z-10 ${isRTL ? (isMobilePhone ? 'left-1' : 'left-2') : (isMobilePhone ? 'right-1' : 'right-2')}`}
            // @ts-ignore - Web only onClick
            onClick={(e: any) => { e.stopPropagation(); e.preventDefault(); }}
          >
            {favoritesService && (
              <Pressable
                onPress={handleFavoriteToggle}
                disabled={favoriteLoading}
                className={`${IS_TV_BUILD ? 'w-11 h-11 rounded-[22px]' : isMobilePhone ? 'w-6 h-6 rounded-xl' : 'w-8 h-8 rounded-2xl'} justify-center items-center ${isFavorite ? 'bg-white/15' : 'bg-black/60'}`}
                style={Platform.OS === 'web' ? { backdropFilter: 'blur(8px)', transition: 'all 0.2s ease' } as any : undefined}
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
                className={`${IS_TV_BUILD ? 'w-11 h-11 rounded-[22px]' : isMobilePhone ? 'w-6 h-6 rounded-xl' : 'w-8 h-8 rounded-2xl'} justify-center items-center ${inWatchlist ? 'bg-white/15' : 'bg-black/60'}`}
                style={Platform.OS === 'web' ? { backdropFilter: 'blur(8px)', transition: 'all 0.2s ease' } as any : undefined}
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

        <View className={`absolute bottom-0 left-0 right-0 ${isMobilePhone ? 'p-1.5' : 'p-3'} bg-black/70 ${isMobilePhone ? 'rounded-b-lg' : 'rounded-b-xl'}`}>
          <Text className={`${IS_TV_BUILD ? 'text-2xl' : isMobilePhone ? 'text-xs' : 'text-lg'} font-bold text-white`} style={{ textAlign }} numberOfLines={1}>
            {title || ''}
          </Text>
          {subtitle && (
            <Text className={`${IS_TV_BUILD ? 'text-lg' : isMobilePhone ? 'text-[10px]' : 'text-sm'} text-white/70 ${isMobilePhone ? 'mt-0.5' : 'mt-0.5'}`} style={{ textAlign }} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};


export default FocusableCard;
