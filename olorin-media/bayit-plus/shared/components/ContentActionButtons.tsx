import React, { useState, useEffect, useCallback } from 'react';
import { View, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../theme';

interface ContentActionButtonsProps {
  contentId: string;
  contentType: 'vod' | 'live' | 'podcast' | 'radio' | 'movie' | 'series' | 'channel';
  size?: 'small' | 'medium' | 'large';
  showFavorite?: boolean;
  showWatchlist?: boolean;
  initialIsFavorite?: boolean;
  initialInWatchlist?: boolean;
  onFavoriteChange?: (isFavorite: boolean) => void;
  onWatchlistChange?: (inWatchlist: boolean) => void;
  favoritesService?: {
    toggleFavorite: (contentId: string, contentType: string) => Promise<{ is_favorite: boolean }>;
    isFavorite: (contentId: string) => Promise<{ is_favorite: boolean }>;
  };
  watchlistService?: {
    toggleWatchlist: (contentId: string, contentType: string) => Promise<{ in_watchlist: boolean }>;
    isInWatchlist: (contentId: string) => Promise<{ in_watchlist: boolean }>;
  };
  style?: any;
  buttonStyle?: any;
  vertical?: boolean;
}

const ICON_SIZES = {
  small: 16,
  medium: 20,
  large: 24,
};

const BUTTON_SIZES = {
  small: 28,
  medium: 36,
  large: 44,
};

export function ContentActionButtons({
  contentId,
  contentType,
  size = 'medium',
  showFavorite = true,
  showWatchlist = true,
  initialIsFavorite,
  initialInWatchlist,
  onFavoriteChange,
  onWatchlistChange,
  favoritesService,
  watchlistService,
  style,
  buttonStyle,
  vertical = false,
}: ContentActionButtonsProps) {
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite ?? false);
  const [inWatchlist, setInWatchlist] = useState(initialInWatchlist ?? false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  const [favoriteHovered, setFavoriteHovered] = useState(false);
  const [watchlistHovered, setWatchlistHovered] = useState(false);

  // Load initial states if services provided and no initial values given
  useEffect(() => {
    const loadStates = async () => {
      if (initialIsFavorite === undefined && favoritesService) {
        try {
          const result = await favoritesService.isFavorite(contentId);
          setIsFavorite(result.is_favorite);
        } catch (e) {
          // Silently fail - user might not be logged in
        }
      }
      if (initialInWatchlist === undefined && watchlistService) {
        try {
          const result = await watchlistService.isInWatchlist(contentId);
          setInWatchlist(result.in_watchlist);
        } catch (e) {
          // Silently fail - user might not be logged in
        }
      }
    };
    loadStates();
  }, [contentId, initialIsFavorite, initialInWatchlist, favoritesService, watchlistService]);

  const handleFavoriteToggle = useCallback(async (e: any) => {
    e.preventDefault?.();
    e.stopPropagation?.();

    if (!favoritesService || favoriteLoading) return;

    setFavoriteLoading(true);
    try {
      const result = await favoritesService.toggleFavorite(contentId, contentType);
      setIsFavorite(result.is_favorite);
      onFavoriteChange?.(result.is_favorite);
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    } finally {
      setFavoriteLoading(false);
    }
  }, [contentId, contentType, favoritesService, favoriteLoading, onFavoriteChange]);

  const handleWatchlistToggle = useCallback(async (e: any) => {
    e.preventDefault?.();
    e.stopPropagation?.();

    if (!watchlistService || watchlistLoading) return;

    setWatchlistLoading(true);
    try {
      const result = await watchlistService.toggleWatchlist(contentId, contentType);
      setInWatchlist(result.in_watchlist);
      onWatchlistChange?.(result.in_watchlist);
    } catch (error) {
      console.error('Failed to toggle watchlist:', error);
    } finally {
      setWatchlistLoading(false);
    }
  }, [contentId, contentType, watchlistService, watchlistLoading, onWatchlistChange]);

  const iconSize = ICON_SIZES[size];
  const buttonSize = BUTTON_SIZES[size];

  return (
    <View className={`items-center gap-1 ${vertical ? 'flex-col' : 'flex-row'}`} style={style}>
      {showFavorite && favoritesService && (
        <Pressable
          onPress={handleFavoriteToggle}
          onHoverIn={() => setFavoriteHovered(true)}
          onHoverOut={() => setFavoriteHovered(false)}
          disabled={favoriteLoading}
          className={`bg-black/50 justify-center items-center ${
            isFavorite ? 'bg-white/15' : ''
          } ${favoriteHovered ? 'bg-white/20 scale-110' : ''} ${favoriteLoading ? 'opacity-50' : ''}`}
          style={[
            {
              width: buttonSize,
              height: buttonSize,
              borderRadius: buttonSize / 2,
              ...(Platform.OS === 'web' && {
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
              } as any)
            },
            buttonStyle,
          ]}
          accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          accessibilityRole="button"
        >
          <Ionicons
            name={isFavorite ? 'star' : 'star-outline'}
            size={iconSize}
            color={isFavorite ? colors.warning : colors.textMuted}
          />
        </Pressable>
      )}

      {showWatchlist && watchlistService && (
        <Pressable
          onPress={handleWatchlistToggle}
          onHoverIn={() => setWatchlistHovered(true)}
          onHoverOut={() => setWatchlistHovered(false)}
          disabled={watchlistLoading}
          className={`bg-black/50 justify-center items-center ${
            inWatchlist ? 'bg-white/15' : ''
          } ${watchlistHovered ? 'bg-white/20 scale-110' : ''} ${watchlistLoading ? 'opacity-50' : ''}`}
          style={[
            {
              width: buttonSize,
              height: buttonSize,
              borderRadius: buttonSize / 2,
              ...(Platform.OS === 'web' && {
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
              } as any)
            },
            buttonStyle,
          ]}
          accessibilityLabel={inWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
          accessibilityRole="button"
        >
          <Ionicons
            name={inWatchlist ? 'bookmark' : 'bookmark-outline'}
            size={iconSize}
            color={inWatchlist ? colors.primary : colors.textMuted}
          />
        </Pressable>
      )}
    </View>
  );
}

export default ContentActionButtons;
