import React, { useState, useEffect, useCallback } from 'react';
import { View, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '@olorin/design-tokens';

interface ContentActionButtonsProps {
  contentId: string;
  contentType: 'vod' | 'live' | 'podcast' | 'radio' | 'movie' | 'series' | 'channel';
  size?: 'small' | 'medium' | 'large';
  showFavorite?: boolean;
  showPlaylist?: boolean;
  initialIsFavorite?: boolean;
  initialInPlaylist?: boolean;
  onFavoriteChange?: (isFavorite: boolean) => void;
  onPlaylistChange?: (inPlaylist: boolean) => void;
  favoritesService?: {
    toggleFavorite: (contentId: string, contentType: string) => Promise<{ is_favorite: boolean }>;
    isFavorite: (contentId: string) => Promise<{ is_favorite: boolean }>;
  };
  playlistService?: {
    toggleItem: (contentId: string, contentType: string) => Promise<{ in_playlist: boolean }>;
    checkItem: (contentId: string) => Promise<{ in_playlist: boolean }>;
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
  showPlaylist = true,
  initialIsFavorite,
  initialInPlaylist,
  onFavoriteChange,
  onPlaylistChange,
  favoritesService,
  playlistService,
  style,
  buttonStyle,
  vertical = false,
}: ContentActionButtonsProps) {
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite ?? false);
  const [inPlaylist, setInPlaylist] = useState(initialInPlaylist ?? false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [playlistLoading, setPlaylistLoading] = useState(false);
  const [favoriteHovered, setFavoriteHovered] = useState(false);
  const [playlistHovered, setPlaylistHovered] = useState(false);

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
      if (initialInPlaylist === undefined && playlistService) {
        try {
          const result = await playlistService.checkItem(contentId);
          setInPlaylist(result.in_playlist);
        } catch (e) {
          // Silently fail - user might not be logged in
        }
      }
    };
    loadStates();
  }, [contentId, initialIsFavorite, initialInPlaylist, favoritesService, playlistService]);

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

  const handlePlaylistToggle = useCallback(async (e: any) => {
    e.preventDefault?.();
    e.stopPropagation?.();

    if (!playlistService || playlistLoading) return;

    setPlaylistLoading(true);
    try {
      const result = await playlistService.toggleItem(contentId, contentType);
      setInPlaylist(result.in_playlist);
      onPlaylistChange?.(result.in_playlist);
    } catch (error) {
      // Playlist toggle failed silently
    } finally {
      setPlaylistLoading(false);
    }
  }, [contentId, contentType, playlistService, playlistLoading, onPlaylistChange]);

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

      {showPlaylist && playlistService && (
        <Pressable
          onPress={handlePlaylistToggle}
          onHoverIn={() => setPlaylistHovered(true)}
          onHoverOut={() => setPlaylistHovered(false)}
          disabled={playlistLoading}
          className={`bg-black/50 justify-center items-center ${
            inPlaylist ? 'bg-white/15' : ''
          } ${playlistHovered ? 'bg-white/20 scale-110' : ''} ${playlistLoading ? 'opacity-50' : ''}`}
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
          accessibilityLabel={inPlaylist ? 'Remove from playlist' : 'Add to playlist'}
          accessibilityRole="button"
        >
          <Ionicons
            name={inPlaylist ? 'bookmark' : 'bookmark-outline'}
            size={iconSize}
            color={inPlaylist ? colors.primary : colors.textMuted}
          />
        </Pressable>
      )}
    </View>
  );
}

export default ContentActionButtons;
