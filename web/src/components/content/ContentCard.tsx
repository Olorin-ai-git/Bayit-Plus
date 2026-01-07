import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { Link } from 'react-router-dom';
import { Play } from 'lucide-react';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassCard, GlassBadge } from '@bayit/shared/ui';
import LinearGradient from 'react-native-linear-gradient';

interface Content {
  id: string;
  title: string;
  thumbnail?: string;
  type?: 'live' | 'radio' | 'podcast' | 'vod';
  duration?: string;
  progress?: number;
  year?: string;
  category?: string;
}

interface ContentCardProps {
  content: Content;
  showProgress?: boolean;
}

export default function ContentCard({ content, showProgress = false }: ContentCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const linkTo = content.type === 'live'
    ? `/live/${content.id}`
    : content.type === 'radio'
    ? `/radio/${content.id}`
    : content.type === 'podcast'
    ? `/podcasts/${content.id}`
    : `/vod/${content.id}`;

  return (
    <Link to={linkTo} style={{ textDecoration: 'none', flexShrink: 0 }}>
      <Pressable
        onHoverIn={() => setIsHovered(true)}
        onHoverOut={() => setIsHovered(false)}
      >
        <GlassCard style={[styles.card, isHovered && styles.cardHovered]}>
          {/* Thumbnail */}
          <View style={styles.thumbnailContainer}>
            {content.thumbnail ? (
              <Image
                source={{ uri: content.thumbnail }}
                style={styles.thumbnail}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.thumbnailPlaceholder} />
            )}

            {/* Play Overlay */}
            {isHovered && (
              <View style={styles.playOverlay}>
                <LinearGradient
                  colors={['transparent', 'rgba(10, 10, 20, 0.8)']}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.playButton}>
                  <Play size={24} color={colors.text} fill={colors.text} />
                </View>
              </View>
            )}

            {/* Duration Badge */}
            {content.duration && (
              <View style={styles.durationBadge}>
                <Text style={styles.durationText}>{content.duration}</Text>
              </View>
            )}

            {/* Live Badge */}
            {content.type === 'live' && (
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            )}

            {/* Progress Bar */}
            {showProgress && content.progress && content.progress > 0 && (
              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: `${content.progress}%` }]} />
              </View>
            )}
          </View>

          {/* Info */}
          <View style={styles.info}>
            <Text style={[styles.title, isHovered && styles.titleHovered]} numberOfLines={1}>
              {content.title}
            </Text>
            <View style={styles.meta}>
              {content.year && <Text style={styles.metaText}>{content.year}</Text>}
              {content.year && content.category && (
                <Text style={styles.metaDivider}>|</Text>
              )}
              {content.category && <Text style={styles.metaText}>{content.category}</Text>}
            </View>
          </View>
        </GlassCard>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 200,
    padding: 0,
    overflow: 'hidden',
  },
  cardHovered: {
    transform: [{ translateY: -4 }],
    // @ts-ignore
    boxShadow: `0 8px 32px rgba(0, 217, 255, 0.2)`,
  },
  thumbnailContainer: {
    aspectRatio: 16 / 9,
    position: 'relative',
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.glass,
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    // @ts-ignore
    backdropFilter: 'blur(8px)',
    justifyContent: 'center',
    alignItems: 'center',
    // @ts-ignore
    boxShadow: `0 0 20px ${colors.primary}`,
  },
  durationBadge: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  durationText: {
    fontSize: 11,
    color: colors.text,
    fontWeight: '500',
  },
  liveBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.text,
  },
  liveText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.text,
  },
  progressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
    // @ts-ignore
    boxShadow: `0 0 8px ${colors.primary}`,
  },
  info: {
    padding: spacing.sm,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  titleHovered: {
    color: colors.primary,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  metaDivider: {
    fontSize: 12,
    color: colors.backgroundLighter,
  },
});
