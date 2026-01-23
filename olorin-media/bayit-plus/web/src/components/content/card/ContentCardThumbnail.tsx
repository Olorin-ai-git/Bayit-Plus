import { useState } from 'react';
import { View, Text, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Play } from 'lucide-react';
import { z } from 'zod';
import { platformClass } from '@/utils/platformClass';
import { SubtitleFlags, ContentBadges } from '@bayit/shared';

/**
 * Zod schema for ContentCardThumbnail props
 */
const ContentCardThumbnailPropsSchema = z.object({
  content: z.object({
    id: z.string(),
    thumbnail: z.string().optional(),
    type: z.enum(['live', 'radio', 'podcast', 'vod', 'movie', 'series']).optional(),
    is_series: z.boolean().optional(),
    duration: z.string().optional(),
    progress: z.number().min(0).max(100).optional(),
    total_episodes: z.number().optional(),
    available_subtitle_languages: z.array(z.string()).optional(),
    quality_tier: z.string().optional(),
  }),
  isHovered: z.boolean(),
  showProgress: z.boolean(),
  showActions: z.boolean(),
  isRTL: z.boolean(),
});

type ContentCardThumbnailProps = z.infer<typeof ContentCardThumbnailPropsSchema>;

/**
 * ContentCardThumbnail - Thumbnail display with overlays and badges
 *
 * Displays content thumbnail with:
 * - Play overlay on hover
 * - Duration/episodes badges
 * - Progress bar
 * - Subtitle flags
 * - Quality badges
 * - Live indicator
 *
 * @component
 */
export function ContentCardThumbnail(props: ContentCardThumbnailProps) {
  const validatedProps = ContentCardThumbnailPropsSchema.parse(props);
  const { content, isHovered, showProgress, showActions, isRTL } = validatedProps;
  const { t } = useTranslation();

  // YouTube thumbnail fallback: maxresdefault (1280x720) isn't always available
  // Fall back to hqdefault (480x360) which is always available
  const [thumbnailError, setThumbnailError] = useState(false);

  const getThumbnailUrl = (): string | undefined => {
    if (!content.thumbnail) return undefined;

    // If maxresdefault failed, use hqdefault
    if (thumbnailError && content.thumbnail.includes('maxresdefault')) {
      return content.thumbnail.replace('maxresdefault', 'hqdefault');
    }

    return content.thumbnail;
  };

  const handleThumbnailError = () => {
    // Only retry once with fallback quality
    if (!thumbnailError && content.thumbnail?.includes('maxresdefault')) {
      setThumbnailError(true);
    }
  };

  return (
    <View className={platformClass(
      'aspect-[2/3] relative rounded-t-lg overflow-hidden bg-[#0A0A14]',
      'aspect-[2/3] relative rounded-t-lg overflow-hidden bg-[#0A0A14]'
    )}>
      {/* Thumbnail Image or Placeholder */}
      {getThumbnailUrl() ? (
        <Image
          source={{ uri: getThumbnailUrl() }}
          className="w-full h-full"
          resizeMode="contain"
          onError={handleThumbnailError}
        />
      ) : (
        <View className="w-full h-full bg-white/5" />
      )}

      {/* Play Overlay - Show on hover */}
      {isHovered && (
        <View className="absolute inset-0 justify-center items-center">
          {/* Gradient background */}
          <View className={platformClass(
            'absolute inset-0 bg-gradient-to-b from-transparent to-[rgba(10,10,20,0.8)]',
            'absolute inset-0 bg-black/40'
          )} />

          {/* Play button */}
          <View className={platformClass(
            'w-14 h-14 rounded-full bg-white/15 backdrop-blur-lg justify-center items-center shadow-[0_0_20px_rgba(107,33,168,1)]',
            'w-14 h-14 rounded-full bg-white/15 justify-center items-center'
          )}>
            <Play size={24} color="#ffffff" fill="#ffffff" />
          </View>
        </View>
      )}

      {/* Duration Badge - for movies */}
      {content.duration && !content.is_series && (
        <View
          className={platformClass(
            'absolute bottom-3 px-2 py-0.5 rounded-sm bg-black/70',
            'absolute bottom-3 px-2 py-0.5 rounded-sm bg-black/70'
          )}
          style={isRTL ? { right: 12 } : { left: 12 }}
        >
          <Text className="text-[11px] text-white font-medium">
            {content.duration}
          </Text>
        </View>
      )}

      {/* Episode Count Badge - for series */}
      {(content.is_series || content.type === 'series') &&
       content.total_episodes !== undefined &&
       content.total_episodes > 0 && (
        <View
          className="absolute bottom-3 flex-row items-center px-3 py-1 rounded-sm bg-black/75"
          style={isRTL ? { right: 12 } : { left: 12 }}
        >
          <Text className="text-[11px] text-white font-semibold">
            {content.total_episodes} {t('content.episodes')}
          </Text>
        </View>
      )}

      {/* Subtitle Flags */}
      {content.available_subtitle_languages &&
       content.available_subtitle_languages.length > 0 && (
        <SubtitleFlags
          languages={content.available_subtitle_languages}
          position={isRTL ? 'bottom-left' : 'bottom-right'}
          isRTL={isRTL}
          size="small"
        />
      )}

      {/* Quality Badge */}
      {content.quality_tier && content.type !== 'live' && (
        <View
          className="absolute top-3"
          style={isRTL ? { left: 12 } : { right: 12 }}
        >
          <ContentBadges
            qualityTier={content.quality_tier}
            compact
            showSubtitles={false}
          />
        </View>
      )}

      {/* Live Badge - positioned to avoid action buttons */}
      {content.type === 'live' && (
        <View
          className="flex-row items-center px-3 py-1 rounded-sm bg-red-600 gap-1 absolute"
          style={{
            ...(isRTL ? { left: 12 } : { right: 12 }),
            top: showActions ? 52 : 12,
          }}
        >
          <View className="w-1.5 h-1.5 rounded-full bg-white" />
          <Text className="text-[10px] font-bold text-white">
            {t('common.live')}
          </Text>
        </View>
      )}

      {/* Progress Bar */}
      {showProgress && content.progress && content.progress > 0 && (
        <View className="absolute bottom-0 left-0 right-0 h-0.5 bg-black/50">
          <View
            className={platformClass(
              'h-full bg-purple-500 shadow-[0_0_8px_rgba(107,33,168,1)]',
              'h-full bg-purple-500'
            )}
            style={{ width: `${content.progress}%` }}
          />
        </View>
      )}
    </View>
  );
}
