import { useState } from 'react';
import { Star, Bookmark } from 'lucide-react';
import { z } from 'zod';
import { platformClass } from '@/utils/platformClass';
import { favoritesService, watchlistService } from '@/services/api';

/**
 * Zod schema for ContentCardActions props
 */
const ContentCardActionsPropsSchema = z.object({
  contentId: z.string(),
  contentType: z.string().optional(),
  isRTL: z.boolean(),
});

type ContentCardActionsProps = z.infer<typeof ContentCardActionsPropsSchema>;

/**
 * ContentCardActions - Favorite and watchlist action buttons
 *
 * Displays glassmorphic action buttons for:
 * - Adding to favorites (Star icon)
 * - Adding to watchlist (Bookmark icon)
 *
 * Features:
 * - Loading states during API calls
 * - Hover animations
 * - RTL support
 * - Active state styling
 *
 * @component
 */
export function ContentCardActions(props: ContentCardActionsProps) {
  const validatedProps = ContentCardActionsPropsSchema.parse(props);
  const { contentId, contentType = 'vod', isRTL } = validatedProps;

  const [isFavorite, setIsFavorite] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  const [favoriteHovered, setFavoriteHovered] = useState(false);
  const [watchlistHovered, setWatchlistHovered] = useState(false);

  const handleFavoriteToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (favoriteLoading) return;
    setFavoriteLoading(true);

    try {
      const result = await favoritesService.toggleFavorite(contentId, contentType);
      setIsFavorite(result.is_favorite);
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleWatchlistToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (watchlistLoading) return;
    setWatchlistLoading(true);

    try {
      const result = await watchlistService.toggleWatchlist(contentId, contentType);
      setInWatchlist(result.in_watchlist);
    } catch (error) {
      console.error('Failed to toggle watchlist:', error);
    } finally {
      setWatchlistLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 12,
        ...(isRTL ? { left: 12 } : { right: 12 }),
        display: 'flex',
        flexDirection: 'row',
        gap: 8,
        zIndex: 10,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Favorite Button */}
      <button
        onClick={handleFavoriteToggle}
        onMouseEnter={() => setFavoriteHovered(true)}
        onMouseLeave={() => setFavoriteHovered(false)}
        disabled={favoriteLoading}
        className={platformClass(
          'w-8 h-8 rounded-full backdrop-blur-lg flex justify-center items-center transition-all duration-200 cursor-pointer hover:scale-110 border-none',
          'w-8 h-8 rounded-full flex justify-center items-center'
        )}
        style={{
          backgroundColor: isFavorite
            ? 'rgba(255, 255, 255, 0.15)'
            : favoriteHovered
            ? 'rgba(255, 255, 255, 0.25)'
            : 'rgba(0, 0, 0, 0.6)',
          transform: favoriteHovered ? 'scale(1.1)' : 'scale(1)',
        }}
      >
        <Star
          size={16}
          color={isFavorite ? '#fbbf24' : '#ffffff'}
          fill={isFavorite ? '#fbbf24' : 'transparent'}
        />
      </button>

      {/* Watchlist Button */}
      <button
        onClick={handleWatchlistToggle}
        onMouseEnter={() => setWatchlistHovered(true)}
        onMouseLeave={() => setWatchlistHovered(false)}
        disabled={watchlistLoading}
        className={platformClass(
          'w-8 h-8 rounded-full backdrop-blur-lg flex justify-center items-center transition-all duration-200 cursor-pointer hover:scale-110 border-none',
          'w-8 h-8 rounded-full flex justify-center items-center'
        )}
        style={{
          backgroundColor: inWatchlist
            ? 'rgba(255, 255, 255, 0.15)'
            : watchlistHovered
            ? 'rgba(255, 255, 255, 0.25)'
            : 'rgba(0, 0, 0, 0.6)',
          transform: watchlistHovered ? 'scale(1.1)' : 'scale(1)',
        }}
      >
        <Bookmark
          size={16}
          color={inWatchlist ? '#a855f7' : '#ffffff'}
          fill={inWatchlist ? '#a855f7' : 'transparent'}
        />
      </button>
    </div>
  );
}
