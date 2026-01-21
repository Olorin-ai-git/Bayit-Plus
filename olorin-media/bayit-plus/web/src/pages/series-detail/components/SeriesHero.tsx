/**
 * Series Hero Component
 * Hero section with backdrop, video preview, and main actions
 */

import { View, Text, Image, Dimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Play, Plus, Check } from 'lucide-react';
import LinearGradient from 'react-native-linear-gradient';
import { GlassView, GlassButton, GlassBadge, GlassTooltip } from '@bayit/shared/ui';
import type { SeriesData, Episode } from '../types/series.types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SeriesHeroProps {
  series: SeriesData;
  selectedEpisode: Episode | null;
  selectedSeason: number;
  episodes: Episode[];
  inWatchlist: boolean;
  isPreviewPlaying: boolean;
  showPoster: boolean;
  videoRef: React.RefObject<HTMLVideoElement>;
  flexDirection: 'row' | 'row-reverse';
  textAlign: 'left' | 'right' | 'center';
  onPlay: () => void;
  toggleWatchlist: () => void;
  startPreview: () => void;
}

export function SeriesHero({
  series,
  selectedEpisode,
  selectedSeason,
  episodes,
  inWatchlist,
  isPreviewPlaying,
  showPoster,
  videoRef,
  flexDirection,
  textAlign,
  onPlay,
  toggleWatchlist,
  startPreview,
}: SeriesHeroProps) {
  const { t } = useTranslation();
  const backdropUrl = selectedEpisode?.thumbnail || series.backdrop || series.thumbnail;

  return (
    <View className="relative" style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.65 }}>
      <View
        className="absolute inset-0"
        style={{
          opacity: isPreviewPlaying ? 0 : 1,
          transition: 'opacity 0.5s ease-in-out',
        } as any}
      >
        <Image source={{ uri: backdropUrl }} className="w-full h-full" resizeMode="cover" />
      </View>

      <View
        className="absolute inset-0"
        style={{
          opacity: isPreviewPlaying ? 1 : 0,
          transition: 'opacity 0.5s ease-in-out',
          zIndex: isPreviewPlaying ? 5 : 1,
        } as any}
      >
        <video
          ref={videoRef}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
          muted
          autoPlay
          playsInline
        />
      </View>

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.95)']}
        className="absolute left-0 right-0 bottom-0 h-[75%]"
      />
      <LinearGradient
        colors={['rgba(0,0,0,0.6)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        className="absolute left-0 top-0 bottom-0 w-[60%]"
      />

      <View className="absolute left-12 right-12 bottom-10 max-w-[600px]">
        {series.category && (
          <GlassView className="self-start px-4 py-2 rounded-full mb-4" intensity="light">
            <Text className="text-sm text-white font-medium">{series.category}</Text>
          </GlassView>
        )}

        <Text className="text-4xl font-bold text-white mb-2">{series.title}</Text>

        <View className={`items-center flex-wrap gap-4 mb-4 ${flexDirection === 'row-reverse' ? 'flex-row-reverse' : 'flex-row'}`}>
          {series.year && <Text className="text-base text-white/70">{series.year}</Text>}
          {series.rating && (
            <GlassBadge variant="default" size="sm">
              {series.rating}
            </GlassBadge>
          )}
          {(series.total_seasons > 0 || (series.seasons && series.seasons.length > 0)) && (
            <Text className="text-base text-white/70">
              {series.total_seasons || series.seasons?.length || 1} {t('content.seasons')}
            </Text>
          )}
          {(series.total_episodes > 0 || episodes.length > 0) && (
            <Text className="text-base text-white/70">
              {series.total_episodes || episodes.length} {t('content.episodes')}
            </Text>
          )}
        </View>

        {series.description && (
          <Text className="text-[15px] text-white/85 leading-[22px] mb-6" style={{ textAlign }} numberOfLines={3}>
            {series.description}
          </Text>
        )}

        <View className={`flex-wrap gap-4 mb-6 ${flexDirection === 'row-reverse' ? 'flex-row-reverse' : 'flex-row'}`}>
          <GlassTooltip
            content={t('content.noEpisodesAvailable', 'No episodes available to play')}
            disabled={episodes.length > 0}
          >
            <GlassButton
              onPress={onPlay}
              variant="primary"
              size="lg"
              icon={<Play size={20} color="#fff" fill="#fff" />}
              title={
                selectedEpisode
                  ? `${t('content.play')} S${selectedSeason}E${selectedEpisode.episode_number}`
                  : t('content.play')
              }
              disabled={episodes.length === 0}
            />
          </GlassTooltip>

          <GlassTooltip
            content={t('content.loadingSeries', 'Loading series information...')}
            disabled={!!series}
          >
            <GlassButton
              onPress={toggleWatchlist}
              variant="ghost"
              size="lg"
              icon={
                inWatchlist ? <Check size={20} color="#fff" /> : <Plus size={20} color="#fff" />
              }
              title={inWatchlist ? t('content.inList') : t('content.addToList')}
              disabled={!series}
            />
          </GlassTooltip>

          {showPoster && (series.preview_url || series.trailer_url) && (
            <GlassButton
              onPress={startPreview}
              variant="ghost"
              size="lg"
              title={t('content.preview')}
            />
          )}
        </View>

        {isPreviewPlaying && (
          <View className="flex-row items-center gap-2 bg-black/60 px-4 py-2 rounded-full self-start">
            <View className="w-2 h-2 rounded-full bg-[#ff4444]" />
            <Text className="text-sm text-white font-medium">{t('content.previewPlaying')}</Text>
          </View>
        )}
      </View>
    </View>
  );
}
