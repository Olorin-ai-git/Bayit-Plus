/**
 * ContentCardActions - Hover overlay action buttons for content cards.
 *
 * Extracted from ContentCard for maintainability. Renders favorite, playlist,
 * and widget toggle buttons on hover.
 */

import { useState } from 'react';
import { Star, Bookmark } from 'lucide-react';
import { colors, spacing } from '@olorin/design-tokens';
import { useResponsive } from '@/hooks/useResponsive';
import { useDirection } from '@/hooks/useDirection';
import WidgetToggleButton from './WidgetToggleButton';

interface ContentCardActionsProps {
  contentId: string;
  contentTitle: string;
  contentType?: string;
  contentThumbnail?: string;
  isFavorite: boolean;
  inPlaylist: boolean;
  favoriteLoading: boolean;
  playlistLoading: boolean;
  onToggleFavorite: (e: React.MouseEvent) => void;
  onTogglePlaylist: (e: React.MouseEvent) => void;
}

/**
 * Map ContentCard content.type to widget content_type.
 */
function mapToWidgetContentType(type?: string): string {
  switch (type) {
    case 'live':
      return 'live_channel';
    case 'radio':
      return 'radio';
    case 'podcast':
      return 'podcast';
    case 'vod':
    case 'movie':
    case 'series':
      return 'vod';
    case 'audiobook':
      return 'audiobook';
    default:
      return 'vod';
  }
}

export default function ContentCardActions({
  contentId,
  contentTitle,
  contentType,
  contentThumbnail,
  isFavorite,
  inPlaylist,
  favoriteLoading,
  playlistLoading,
  onToggleFavorite,
  onTogglePlaylist,
}: ContentCardActionsProps) {
  const responsive = useResponsive();
  const { isMobile } = responsive;
  const { isRTL } = useDirection();

  const [favoriteHovered, setFavoriteHovered] = useState(false);
  const [playlistHovered, setPlaylistHovered] = useState(false);

  const btnSize = isMobile ? 56 : 32;
  const btnRadius = btnSize / 2;
  const iconSize = isMobile ? 24 : 16;

  const widgetContentType = mapToWidgetContentType(contentType);

  return (
    <div
      style={{
        position: 'absolute',
        top: spacing.sm,
        right: isRTL ? 'auto' : spacing.sm,
        left: isRTL ? spacing.sm : 'auto',
        display: 'flex',
        flexDirection: 'row',
        gap: isMobile ? spacing.sm : spacing.xs,
        zIndex: 10,
      }}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
    >
      <div
        role="button"
        tabIndex={0}
        aria-label="Toggle favorite"
        onClick={onToggleFavorite}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onToggleFavorite(e as any); }}
        onMouseEnter={() => setFavoriteHovered(true)}
        onMouseLeave={() => setFavoriteHovered(false)}
        className="rounded-full backdrop-blur-lg flex justify-center items-center transition-all duration-200 cursor-pointer hover:scale-110 border border-white/10"
        style={{
          width: btnSize,
          height: btnSize,
          backgroundColor: isFavorite
            ? 'rgba(255, 255, 255, 0.15)'
            : favoriteHovered
            ? 'rgba(255, 255, 255, 0.25)'
            : 'rgba(0, 0, 0, 0.6)',
          opacity: favoriteLoading ? 0.5 : 1,
          pointerEvents: favoriteLoading ? 'none' : 'auto',
        }}
      >
        <Star
          size={iconSize}
          color={isFavorite ? colors.warning : colors.text}
          fill={isFavorite ? colors.warning : 'transparent'}
        />
      </div>
      <div
        role="button"
        tabIndex={0}
        aria-label="Toggle playlist"
        onClick={onTogglePlaylist}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onTogglePlaylist(e as any); }}
        onMouseEnter={() => setPlaylistHovered(true)}
        onMouseLeave={() => setPlaylistHovered(false)}
        className="rounded-full backdrop-blur-lg flex justify-center items-center transition-all duration-200 cursor-pointer hover:scale-110 border border-white/10"
        style={{
          width: btnSize,
          height: btnSize,
          backgroundColor: inPlaylist
            ? 'rgba(255, 255, 255, 0.15)'
            : playlistHovered
            ? 'rgba(255, 255, 255, 0.25)'
            : 'rgba(0, 0, 0, 0.6)',
          opacity: playlistLoading ? 0.5 : 1,
          pointerEvents: playlistLoading ? 'none' : 'auto',
        }}
      >
        <Bookmark
          size={iconSize}
          color={inPlaylist ? colors.primary : colors.text}
          fill={inPlaylist ? colors.primary : 'transparent'}
        />
      </div>
      <WidgetToggleButton
        contentType={widgetContentType}
        contentId={contentId}
        title={contentTitle}
        coverUrl={contentThumbnail}
      />
    </div>
  );
}
