/**
 * Series Hero Component
 * Hero section with backdrop, video preview, and main actions
 */

import { View, Text, Image, Dimensions, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Play, Plus, Check } from 'lucide-react';
import LinearGradient from 'react-native-linear-gradient';
import { GlassView, GlassButton, GlassBadge, GlassTooltip } from '@bayit/shared/ui';
import { SubtitleFlags } from '@bayit/shared/components';
import { colors } from '@bayit/shared/theme';
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
    <View style={styles.container}>
      <View
        style={[
          styles.posterContainer,
          {
            opacity: isPreviewPlaying ? 0 : 1,
            // @ts-ignore - Web CSS transition
            transition: 'opacity 0.5s ease-in-out',
          },
        ]}
      >
        <Image
          source={{ uri: backdropUrl }}
          style={[
            styles.backgroundImage,
            // @ts-ignore - Web CSS object-position
            { objectPosition: 'center top' }
          ]}
          resizeMode="cover"
        />
      </View>

      <View
        style={[
          styles.videoContainer,
          {
            opacity: isPreviewPlaying ? 1 : 0,
            // @ts-ignore - Web CSS transition
            transition: 'opacity 0.5s ease-in-out',
            zIndex: isPreviewPlaying ? 5 : 1,
          },
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
        style={styles.bottomGradient}
      />
      <LinearGradient
        colors={['rgba(0,0,0,0.6)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.leftGradient}
      />

      <View style={styles.content}>
        {series.category && (
          <GlassView style={styles.categoryBadge} intensity="light">
            <Text style={styles.categoryText}>{series.category}</Text>
          </GlassView>
        )}

        <Text style={styles.title}>{series.title}</Text>

        <View style={[styles.metadataRow, { flexDirection }]}>
          {series.year && <Text style={styles.metadataText}>{series.year}</Text>}
          {series.rating && (
            <GlassBadge variant="default" size="sm">
              {series.rating}
            </GlassBadge>
          )}
          {(series.total_seasons > 0 || (series.seasons && series.seasons.length > 0)) && (
            <Text style={styles.metadataText}>
              {series.total_seasons || series.seasons?.length || 1} {t('content.seasons')}
            </Text>
          )}
          {(series.total_episodes > 0 || episodes.length > 0) && (
            <Text style={styles.metadataText}>
              {series.total_episodes || episodes.length} {t('content.episodes')}
            </Text>
          )}
          {series.available_subtitles && series.available_subtitles.length > 0 && (
            <View style={{ position: 'relative' }}>
              <SubtitleFlags
                languages={series.available_subtitles}
                maxDisplay={5}
                size="medium"
                position="bottom-left"
                isRTL={flexDirection === 'row-reverse'}
              />
            </View>
          )}
        </View>

        {series.description && (
          <Text style={[styles.description, { textAlign }]} numberOfLines={3}>
            {series.description}
          </Text>
        )}

        <View style={[styles.actionsRow, { flexDirection }]}>
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

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.65,
  },
  posterContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  videoContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  bottomGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '75%',
    zIndex: 2,
  },
  leftGradient: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '60%',
    zIndex: 3,
  },
  content: {
    position: 'absolute',
    left: 48,
    right: 48,
    bottom: 40,
    maxWidth: 600,
    zIndex: 10,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
    marginBottom: 16,
  },
  categoryText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '500',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  metadataRow: {
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  metadataText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
  },
  description: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 22,
    marginBottom: 24,
  },
  actionsRow: {
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  previewIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
    alignSelf: 'flex-start',
  },
  previewDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff4444',
  },
  previewText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '500',
  },
});
