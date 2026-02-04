/**
 * ContentCardActions - Hover overlay action buttons for content cards.
 *
 * Extracted from ContentCard for maintainability. Renders favorite, watchlist,
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
  inWatchlist: boolean;
  favoriteLoading: boolean;
  watchlistLoading: boolean;
  onToggleFavorite: (e: React.MouseEvent) => void;
  onToggleWatchlist: (e: React.MouseEvent) => void;
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
  inWatchlist,
  favoriteLoading,
  watchlistLoading,
  onToggleFavorite,
  onToggleWatchlist,
}: ContentCardActionsProps) {
  const responsive = useResponsive();
  const { isMobile } = responsive;
  const { isRTL } = useDirection();

  const [favoriteHovered, setFavoriteHovered] = useState(false);
  const [watchlistHovered, setWatchlistHovered] = useState(false);

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
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={onToggleFavorite}
        onMouseEnter={() => setFavoriteHovered(true)}
        onMouseLeave={() => setFavoriteHovered(false)}
        disabled={favoriteLoading}
        style={{
          width: btnSize,
          height: btnSize,
          borderRadius: btnRadius,
          backgroundColor: isFavorite
            ? 'rgba(255, 255, 255, 0.15)'
            : favoriteHovered
            ? 'rgba(255, 255, 255, 0.25)'
            : 'rgba(0, 0, 0, 0.6)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backdropFilter: 'blur(8px)',
          transition: 'all 0.2s ease',
          transform: favoriteHovered ? 'scale(1.1)' : 'scale(1)',
        }}
      >
        <Star
          size={iconSize}
          color={isFavorite ? colors.warning : colors.text}
          fill={isFavorite ? colors.warning : 'transparent'}
        />
      </button>
      <button
        onClick={onToggleWatchlist}
        onMouseEnter={() => setWatchlistHovered(true)}
        onMouseLeave={() => setWatchlistHovered(false)}
        disabled={watchlistLoading}
        style={{
          width: btnSize,
          height: btnSize,
          borderRadius: btnRadius,
          backgroundColor: inWatchlist
            ? 'rgba(255, 255, 255, 0.15)'
            : watchlistHovered
            ? 'rgba(255, 255, 255, 0.25)'
            : 'rgba(0, 0, 0, 0.6)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backdropFilter: 'blur(8px)',
          transition: 'all 0.2s ease',
          transform: watchlistHovered ? 'scale(1.1)' : 'scale(1)',
        }}
      >
        <Bookmark
          size={iconSize}
          color={inWatchlist ? colors.primary : colors.text}
          fill={inWatchlist ? colors.primary : 'transparent'}
        />
      </button>
      <WidgetToggleButton
        contentType={widgetContentType}
        contentId={contentId}
        title={contentTitle}
        coverUrl={contentThumbnail}
      />
    </div>
  );
}
