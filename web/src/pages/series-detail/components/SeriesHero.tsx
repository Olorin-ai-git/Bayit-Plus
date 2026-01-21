/**
 * Series Hero Component
 * Hero section with backdrop, video preview, and main actions
 */

import { View, Text, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Play, Plus, Check } from 'lucide-react';
import LinearGradient from 'react-native-linear-gradient';
import { GlassView, GlassButton, GlassBadge, GlassTooltip } from '@bayit/shared/ui';
import type { SeriesData, Episode } from '../types/series.types';
import { styles } from './SeriesHero.styles';

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
    <View style={styles.heroContainer}>
      <View
        style={[
          styles.backdropContainer,
          {
            opacity: isPreviewPlaying ? 0 : 1,
            transition: 'opacity 0.5s ease-in-out',
          } as any,
        ]}
      >
        <Image source={{ uri: backdropUrl }} style={styles.backdrop} resizeMode="cover" />
      </View>

      <View
        style={[
          styles.videoContainer,
          {
            opacity: isPreviewPlaying ? 1 : 0,
            transition: 'opacity 0.5s ease-in-out',
            zIndex: isPreviewPlaying ? 5 : 1,
          } as any,
        ]}
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
        style={styles.gradientBottom}
      />
      <LinearGradient
        colors={['rgba(0,0,0,0.6)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradientLeft}
      />

      <View style={styles.heroContent}>
        {series.category && (
          <GlassView style={styles.categoryBadge} intensity="light">
            <Text style={styles.categoryText}>{series.category}</Text>
          </GlassView>
        )}

        <Text style={styles.title}>{series.title}</Text>

        <View style={[styles.metadata, { flexDirection }]}>
          {series.year && <Text style={styles.metaItem}>{series.year}</Text>}
          {series.rating && (
            <GlassBadge variant="default" size="sm">
              {series.rating}
            </GlassBadge>
          )}
          {(series.total_seasons > 0 || (series.seasons && series.seasons.length > 0)) && (
            <Text style={styles.metaItem}>
              {series.total_seasons || series.seasons?.length || 1} {t('content.seasons')}
            </Text>
          )}
          {(series.total_episodes > 0 || episodes.length > 0) && (
            <Text style={styles.metaItem}>
              {series.total_episodes || episodes.length} {t('content.episodes')}
            </Text>
          )}
        </View>

        {series.description && (
          <Text style={[styles.description, { textAlign }]} numberOfLines={3}>
            {series.description}
          </Text>
        )}

        <View style={[styles.actions, { flexDirection }]}>
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
          <View style={styles.previewIndicator}>
            <View style={styles.previewDot} />
            <Text style={styles.previewText}>{t('content.previewPlaying')}</Text>
          </View>
        )}
      </View>
    </View>
  );
}
