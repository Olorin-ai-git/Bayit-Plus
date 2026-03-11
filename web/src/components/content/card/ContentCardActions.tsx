import { useState } from "react";
import { Star, Bookmark } from "lucide-react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { platformClass } from "@/utils/platformClass";
import { favoritesService, playlistService } from "@/services/api";
import logger from "@/utils/logger";

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
 * ContentCardActions - Favorite and playlist action buttons
 *
 * Displays glassmorphic action buttons for:
 * - Adding to favorites (Star icon)
 * - Adding to playlist (Bookmark icon)
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
  const { contentId, contentType = "vod", isRTL } = validatedProps;

  const { t } = useTranslation();
  const [isFavorite, setIsFavorite] = useState(false);
  const [inPlaylist, setInPlaylist] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [playlistLoading, setPlaylistLoading] = useState(false);
  const [favoriteHovered, setFavoriteHovered] = useState(false);
  const [playlistHovered, setPlaylistHovered] = useState(false);

  const handleFavoriteToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (favoriteLoading) return;
    setFavoriteLoading(true);

    try {
      const result = await favoritesService.toggleFavorite(
        contentId,
        contentType,
      );
      setIsFavorite(result.is_favorite);
    } catch (error) {
      logger.error("Failed to toggle favorite", "ContentCardActions", {
        contentId,
        error,
      });
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handlePlaylistToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (playlistLoading) return;
    setPlaylistLoading(true);

    try {
      const result = await playlistService.toggleItem(contentId, contentType);
      setInPlaylist(result.in_playlist);
    } catch (error) {
      logger.error("Failed to toggle playlist", "ContentCardActions", {
        contentId,
        error,
      });
    } finally {
      setPlaylistLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        ...(isRTL ? { left: 12 } : { right: 12 }),
        display: "flex",
        flexDirection: "row",
        gap: 8,
        zIndex: 10,
      }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {/* Favorite Button */}
      <div
        role="button"
        tabIndex={0}
        aria-label={t("content.toggleFavorite")}
        onClick={handleFavoriteToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ")
            handleFavoriteToggle(e as any);
        }}
        onMouseEnter={() => setFavoriteHovered(true)}
        onMouseLeave={() => setFavoriteHovered(false)}
        className={platformClass(
          "w-8 h-8 rounded-full backdrop-blur-lg flex justify-center items-center transition-all duration-200 cursor-pointer hover:scale-110 border border-white/10",
          "w-8 h-8 rounded-full flex justify-center items-center",
        )}
        style={{
          backgroundColor: isFavorite
            ? "rgba(255, 255, 255, 0.15)"
            : favoriteHovered
              ? "rgba(255, 255, 255, 0.25)"
              : "rgba(0, 0, 0, 0.6)",
          transform: favoriteHovered ? "scale(1.1)" : "scale(1)",
          opacity: favoriteLoading ? 0.5 : 1,
          pointerEvents: favoriteLoading ? "none" : "auto",
        }}
      >
        <Star
          size={16}
          color={isFavorite ? "#fbbf24" : "#ffffff"}
          fill={isFavorite ? "#fbbf24" : "transparent"}
        />
      </div>

      {/* Playlist Button - hidden for radio (radio cannot be added to playlists) */}
      {contentType !== "radio" && (
        <div
          role="button"
          tabIndex={0}
          aria-label={t("content.togglePlaylist")}
          onClick={handlePlaylistToggle}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ")
              handlePlaylistToggle(e as any);
          }}
          onMouseEnter={() => setPlaylistHovered(true)}
          onMouseLeave={() => setPlaylistHovered(false)}
          className={platformClass(
            "w-8 h-8 rounded-full backdrop-blur-lg flex justify-center items-center transition-all duration-200 cursor-pointer hover:scale-110 border border-white/10",
            "w-8 h-8 rounded-full flex justify-center items-center",
          )}
          style={{
            backgroundColor: inPlaylist
              ? "rgba(255, 255, 255, 0.15)"
              : playlistHovered
                ? "rgba(255, 255, 255, 0.25)"
                : "rgba(0, 0, 0, 0.6)",
            transform: playlistHovered ? "scale(1.1)" : "scale(1)",
            opacity: playlistLoading ? 0.5 : 1,
            pointerEvents: playlistLoading ? "none" : "auto",
          }}
        >
          <Bookmark
            size={16}
            color={inPlaylist ? "#a855f7" : "#ffffff"}
            fill={inPlaylist ? "#a855f7" : "transparent"}
          />
        </div>
      )}
    </div>
  );
}
