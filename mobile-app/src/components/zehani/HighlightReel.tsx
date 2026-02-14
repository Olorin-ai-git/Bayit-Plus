/**
 * HighlightReel - Horizontal scrollable reel of avatar best moments.
 *
 * Displays thumbnails with duration badges in a horizontal FlatList.
 * Tapping a highlight triggers playback via the onPlay callback.
 */
import React, { useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Image, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { OlorinIcon } from '@olorin/icons/native';
import { Colors } from '../../theme/colors';
import logger from '@/utils/logger';

const reelLogger = logger.scope('HighlightReel');

interface Highlight {
  id: string;
  thumbnailUrl: string;
  duration: number;
  timestamp: string;
}

interface HighlightReelProps {
  highlights: Highlight[];
  onPlay: (highlightId: string) => void;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function formatTimestamp(isoString: string, locale: string): string {
  try {
    return new Date(isoString).toLocaleDateString(locale, {
      month: 'short', day: 'numeric',
    });
  } catch {
    return isoString;
  }
}

const HighlightCard: React.FC<{
  item: Highlight;
  onPress: () => void;
  t: (key: string, params?: Record<string, string>) => string;
}> = ({ item, onPress, t }) => (
  <Pressable style={styles.card} onPress={onPress}
    accessibilityLabel={t('zehAni.highlights.playHighlight', {
      date: formatTimestamp(item.timestamp, 'en'),
    })}
    accessibilityHint={t('zehAni.highlights.tapToPlay')}
    accessibilityRole="button">
    <Image source={{ uri: item.thumbnailUrl }} style={styles.thumbnail}
      accessibilityRole="image" />
    <View style={styles.playOverlay}>
      <OlorinIcon name="play-circle" size={32} color={Colors.Text.primary} />
    </View>
    <View style={styles.durationBadge}>
      <Text style={styles.durationText}>{formatDuration(item.duration)}</Text>
    </View>
    <View style={styles.cardFooter}>
      <Text style={styles.timestampText}>
        {formatTimestamp(item.timestamp, 'en')}
      </Text>
    </View>
  </Pressable>
);

export const HighlightReel: React.FC<HighlightReelProps> = ({
  highlights,
  onPlay,
}) => {
  const { t } = useTranslation();

  const handlePlay = useCallback((id: string) => {
    reelLogger.info('Highlight play requested', { highlightId: id });
    onPlay(id);
  }, [onPlay]);

  if (highlights.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <OlorinIcon name="film" size={32} color={Colors.Text.muted} />
        <Text style={styles.emptyText} accessibilityRole="text">
          {t('zehAni.highlights.empty')}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        {t('zehAni.highlights.title')}
      </Text>
      <FlatList
        data={highlights}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <HighlightCard item={item} onPress={() => handlePlay(item.id)} t={t} />
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginVertical: 8 },
  sectionTitle: {
    fontSize: 18, fontWeight: '600', color: Colors.Text.primary,
    marginBottom: 12, paddingHorizontal: 16,
  },
  listContent: { paddingHorizontal: 16, gap: 12 },
  card: {
    width: 180, borderRadius: 12, overflow: 'hidden',
    backgroundColor: Colors.Glass.whiteSubtle,
    borderWidth: 1, borderColor: Colors.Glass.whiteLight,
  },
  thumbnail: { width: 180, height: 120, backgroundColor: Colors.Glass.bgLight },
  playOverlay: {
    ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center',
    backgroundColor: Colors.Glass.bgLight, height: 120,
  },
  durationBadge: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: Colors.Glass.bgStrong, borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  durationText: { fontSize: 11, color: Colors.Text.primary, fontWeight: '600' },
  cardFooter: { padding: 10 },
  timestampText: { fontSize: 12, color: Colors.Text.muted },
  emptyContainer: {
    alignItems: 'center', padding: 32, gap: 12,
  },
  emptyText: { fontSize: 14, color: Colors.Text.muted, textAlign: 'center' },
});
