import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useParams, Link } from 'react-router-dom';
import { ArrowRight, Plus, Share2, ThumbsUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import VideoPlayer from '@/components/player/VideoPlayer';
import AudioPlayer from '@/components/player/AudioPlayer';
import ContentCarousel from '@/components/content/ContentCarousel';
import { contentService, liveService, radioService, podcastService, historyService, chaptersService } from '@/services/api';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassCard, GlassButton, GlassView } from '@bayit/shared/ui';
import logger from '@/utils/logger';

interface WatchPageProps {
  type?: 'vod' | 'live' | 'radio' | 'podcast';
}

interface ContentData {
  id: string;
  title?: string;
  name?: string;
  description?: string;
  thumbnail?: string;
  backdrop?: string;
  cover?: string;
  logo?: string;
  year?: string;
  duration?: string;
  rating?: string;
  genre?: string;
  episodeCount?: number;
  cast?: string[];
  episodes?: Episode[];
  schedule?: ScheduleItem[];
  related?: any[];
  artist?: string;
  author?: string;
  latestEpisode?: {
    audioUrl: string;
  };
}

interface Episode {
  id: string;
  title: string;
  duration: string;
}

interface ScheduleItem {
  time: string;
  title: string;
  isNow?: boolean;
}

interface Chapter {
  time: number;
  title: string;
}

export default function WatchPage({ type = 'vod' }: WatchPageProps) {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const params = useParams();
  const contentId = params.contentId || params.channelId || params.stationId || params.showId || '';
  const [content, setContent] = useState<ContentData | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [chaptersLoading, setChaptersLoading] = useState(false);

  useEffect(() => {
    loadContent();
  }, [contentId, type]);

  const loadContent = async () => {
    setLoading(true);
    try {
      let data: ContentData, stream: { url?: string } | undefined;
      switch (type) {
        case 'live':
          [data, stream] = await Promise.all([
            liveService.getChannel(contentId),
            liveService.getStreamUrl(contentId),
          ]);
          break;
        case 'radio':
          [data, stream] = await Promise.all([
            radioService.getStation(contentId),
            radioService.getStreamUrl(contentId),
          ]);
          break;
        case 'podcast':
          data = await podcastService.getShow(contentId);
          if (data.latestEpisode) {
            stream = { url: data.latestEpisode.audioUrl };
          }
          break;
        default:
          [data, stream] = await Promise.all([
            contentService.getById(contentId),
            contentService.getStreamUrl(contentId),
          ]);
      }
      setContent(data);
      setStreamUrl(stream?.url || null);

      if (data.related) {
        setRelated(data.related);
      }

      if (type !== 'live' && type !== 'radio' && type !== 'podcast') {
        loadChapters();
      }
    } catch (error) {
      logger.error('Failed to load content', 'WatchPage', error);
    } finally {
      setLoading(false);
    }
  };

  const loadChapters = async () => {
    setChaptersLoading(true);
    try {
      const data = await chaptersService.getChapters(contentId);
      setChapters(data.chapters || []);
    } catch (error) {
      logger.error('Failed to load chapters', 'WatchPage', error);
      setChapters([]);
    } finally {
      setChaptersLoading(false);
    }
  };

  const handleProgress = async (position: number, duration: number) => {
    // Fire-and-forget: history update is non-critical and should not interrupt playback
    historyService.updateProgress(contentId, type, position, duration).catch(() => {});
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.skeletonPlayer} />
        <View style={styles.skeletonTitle} />
        <View style={styles.skeletonDescription} />
      </View>
    );
  }

  if (!content) {
    return (
      <View style={styles.notFoundContainer}>
        <GlassCard style={styles.notFoundCard}>
          <Text style={styles.notFoundTitle}>{t('watch.notFound')}</Text>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <Text style={styles.notFoundLink}>{t('watch.backToHome')}</Text>
          </Link>
        </GlassCard>
      </View>
    );
  }

  const isAudio = type === 'radio' || type === 'podcast';
  const title = content.title || content.name || '';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Back Button */}
      <View style={styles.backContainer}>
        <Pressable onPress={() => window.history.back()} style={styles.backButton}>
          <ArrowRight size={20} color={colors.text} />
          <Text style={styles.backText}>{t('common.back')}</Text>
        </Pressable>
      </View>

      {/* Player */}
      <View style={styles.playerContainer}>
        {isAudio ? (
          <AudioPlayer
            src={streamUrl}
            title={title}
            artist={content.artist || content.author}
            cover={content.cover || content.logo || content.thumbnail}
            isLive={type === 'radio'}
          />
        ) : (
          <VideoPlayer
            src={streamUrl}
            poster={content.backdrop || content.thumbnail}
            title={title}
            contentId={contentId}
            contentType={type}
            onProgress={handleProgress}
            isLive={type === 'live'}
            chapters={chapters}
            chaptersLoading={chaptersLoading}
          />
        )}
      </View>

      {/* Content Info */}
      <View style={styles.infoContainer}>
        <View style={styles.mainInfo}>
          {/* Live Badge */}
          {type === 'live' && (
            <View style={styles.liveBadge}>
              <Text style={styles.liveBadgeText}>LIVE</Text>
            </View>
          )}

          <Text style={styles.title}>{title}</Text>

          {/* Metadata */}
          <View style={styles.metadataRow}>
            {content.year && (
              <GlassView style={styles.badge}>
                <Text style={styles.badgeText}>{content.year}</Text>
              </GlassView>
            )}
            {content.duration && (
              <GlassView style={styles.badge}>
                <Text style={styles.badgeText}>{content.duration}</Text>
              </GlassView>
            )}
            {content.rating && (
              <GlassView style={[styles.badge, styles.badgePrimary]}>
                <Text style={[styles.badgeText, styles.badgeTextPrimary]}>{content.rating}</Text>
              </GlassView>
            )}
            {content.genre && (
              <GlassView style={styles.badge}>
                <Text style={styles.badgeText}>{content.genre}</Text>
              </GlassView>
            )}
            {content.episodeCount && (
              <GlassView style={styles.badge}>
                <Text style={styles.badgeText}>{content.episodeCount} {t('watch.episodes')}</Text>
              </GlassView>
            )}
          </View>

          {/* Description */}
          {content.description && (
            <Text style={styles.description}>{content.description}</Text>
          )}

          {/* Actions */}
          <View style={styles.actionsRow}>
            <GlassButton
              title={t('watch.addToList')}
              icon={<Plus size={18} color={colors.text} />}
            />
            <GlassButton
              title={t('watch.like')}
              icon={<ThumbsUp size={18} color={colors.text} />}
            />
            <Pressable style={styles.ghostButton}>
              <Share2 size={18} color={colors.textMuted} />
              <Text style={styles.ghostButtonText}>{t('watch.share')}</Text>
            </Pressable>
          </View>

          {/* Cast/Credits */}
          {content.cast && content.cast.length > 0 && (
            <View style={styles.castSection}>
              <Text style={styles.sectionTitle}>{t('watch.cast')}</Text>
              <Text style={styles.castText}>{content.cast.join(', ')}</Text>
            </View>
          )}

          {/* Episodes */}
          {content.episodes && content.episodes.length > 0 && (
            <View style={styles.episodesSection}>
              <Text style={styles.sectionTitle}>{t('watch.episodesList')}</Text>
              {content.episodes.map((episode, i) => (
                <Pressable key={episode.id} style={styles.episodeItem}>
                  <Text style={styles.episodeNumber}>{i + 1}</Text>
                  <View style={styles.episodeInfo}>
                    <Text style={styles.episodeTitle}>{episode.title}</Text>
                    <Text style={styles.episodeDuration}>{episode.duration}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* EPG / Schedule (for live) */}
        {type === 'live' && content.schedule && content.schedule.length > 0 && (
          <View style={styles.scheduleSection}>
            <Text style={styles.sectionTitle}>{t('watch.schedule')}</Text>
            {content.schedule.map((show, i) => (
              <GlassCard
                key={i}
                style={[styles.scheduleItem, show.isNow && styles.scheduleItemNow]}
              >
                <View style={styles.scheduleHeader}>
                  <Text style={styles.scheduleTime}>{show.time}</Text>
                  {show.isNow && (
                    <View style={styles.nowBadge}>
                      <Text style={styles.nowBadgeText}>{t('watch.now')}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.scheduleTitle}>{show.title}</Text>
              </GlassCard>
            ))}
          </View>
        )}
      </View>

      {/* Related Content */}
      {related.length > 0 && (
        <ContentCarousel
          title={t('watch.related')}
          items={related}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: spacing.xl * 2,
  },
  backContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    maxWidth: 1400,
    marginHorizontal: 'auto',
    width: '100%',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    backgroundColor: colors.glass,
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: 14,
    color: colors.text,
  },
  playerContainer: {
    paddingHorizontal: spacing.md,
    maxWidth: 1400,
    marginHorizontal: 'auto',
    width: '100%',
  },
  skeletonPlayer: {
    aspectRatio: 16 / 9,
    backgroundColor: colors.glass,
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  skeletonTitle: {
    height: 32,
    width: 256,
    backgroundColor: colors.glass,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  skeletonDescription: {
    height: 16,
    width: '80%',
    maxWidth: 600,
    backgroundColor: colors.glass,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.md,
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
    paddingHorizontal: spacing.md,
  },
  notFoundCard: {
    padding: spacing.xl * 1.5,
    alignItems: 'center',
  },
  notFoundTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.md,
  },
  notFoundLink: {
    fontSize: 16,
    color: colors.primary,
  },
  infoContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    gap: spacing.lg,
    maxWidth: 1400,
    marginHorizontal: 'auto',
    width: '100%',
  },
  mainInfo: {
    flex: 1,
  },
  liveBadge: {
    backgroundColor: colors.error,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  liveBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.text,
    letterSpacing: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.md,
  },
  metadataRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  badgePrimary: {
    backgroundColor: 'rgba(0, 217, 255, 0.2)',
  },
  badgeText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  badgeTextPrimary: {
    color: colors.primary,
  },
  description: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  ghostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  ghostButtonText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  castSection: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  castText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  episodesSection: {
    marginTop: spacing.lg,
  },
  episodeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.glass,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  episodeNumber: {
    width: 32,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  episodeInfo: {
    flex: 1,
  },
  episodeTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  episodeDuration: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 2,
  },
  scheduleSection: {
    width: 320,
  },
  scheduleItem: {
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  scheduleItemNow: {
    borderWidth: 1,
    borderColor: colors.primary,
  },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  scheduleTime: {
    fontSize: 14,
    color: colors.textMuted,
  },
  nowBadge: {
    backgroundColor: colors.error,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  nowBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.text,
  },
  scheduleTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
});
