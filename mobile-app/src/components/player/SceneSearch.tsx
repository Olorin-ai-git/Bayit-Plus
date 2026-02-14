/**
 * SceneSearch - Bottom sheet for finding scenes by description
 *
 * Provides a search input with debounced queries, displays results
 * as timestamped thumbnails, and supports seeking to selected scenes.
 */

import React, { useCallback } from 'react';
import {
  View, Text, FlatList, Image, Pressable, StyleSheet,
  type ListRenderItemInfo,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useDirection } from '@bayit/shared-hooks';
import { GlassInput, GlassLoadingSpinner } from '@bayit/shared/ui';
import { NativeIcon } from '@olorin/shared-icons/native';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { Colors } from '../../theme/colors';
import { BottomSheet } from '../BottomSheet';
import { useSceneSearch, type SceneSearchResult } from '../../hooks/useSceneSearch';
import logger from '@/utils/logger';

const log = logger.scope('SceneSearch');

interface SceneSearchProps {
  visible: boolean;
  onClose: () => void;
  contentId: string;
  onSeekToTime: (time: number) => void;
}

const formatTimestamp = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const SceneSearch: React.FC<SceneSearchProps> = ({
  visible,
  onClose,
  contentId,
  onSeekToTime,
}) => {
  const { t } = useTranslation();
  const { isRTL, textAlign } = useDirection();
  const { query, results, isLoading, error, setQuery, clearSearch } = useSceneSearch(contentId);

  const handleResultPress = useCallback((item: SceneSearchResult) => {
    ReactNativeHapticFeedback.trigger('impactMedium');
    log.info('Scene search result selected', { timestamp: item.timestamp });
    onSeekToTime(item.timestamp);
    onClose();
  }, [onSeekToTime, onClose]);

  const handleClose = useCallback(() => {
    clearSearch();
    onClose();
  }, [clearSearch, onClose]);

  const renderResult = useCallback(({ item }: ListRenderItemInfo<SceneSearchResult>) => (
    <Pressable
      onPress={() => handleResultPress(item)}
      style={[styles.resultItem, isRTL && styles.resultItemRTL]}
      accessibilityLabel={`${item.description}, ${formatTimestamp(item.timestamp)}`}
      accessibilityHint={t('sceneSearch.tapToSeek')}
      accessibilityRole="button"
    >
      <Image
        source={{ uri: item.thumbnailUrl }}
        style={styles.thumbnail}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />
      <View style={styles.resultInfo}>
        <Text style={[styles.resultDescription, { textAlign }]} numberOfLines={2}>
          {item.description}
        </Text>
        <Text style={styles.timestamp}>{formatTimestamp(item.timestamp)}</Text>
      </View>
      <NativeIcon name="play" size="sm" color={Colors.Primary.p400} />
    </Pressable>
  ), [handleResultPress, isRTL, textAlign, t]);

  const keyExtractor = useCallback(
    (item: SceneSearchResult) => `${item.timestamp}`,
    [],
  );

  return (
    <BottomSheet visible={visible} onClose={handleClose} showHandle dismissable>
      <View style={styles.header}>
        <Text style={[styles.title, { textAlign }]}>{t('sceneSearch.title')}</Text>
        <GlassInput
          placeholder={t('sceneSearch.placeholder')}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          autoFocus={visible}
          style={styles.input}
          accessibilityLabel={t('sceneSearch.searchInput')}
          accessibilityHint={t('sceneSearch.searchHint')}
        />
      </View>

      {isLoading && (
        <View style={styles.centered}>
          <GlassLoadingSpinner size="medium" />
        </View>
      )}

      {error && (
        <View style={styles.centered}>
          <NativeIcon name="alertTriangle" size="lg" color={Colors.Error.default} />
          <Text style={styles.errorText}>{t('sceneSearch.error')}</Text>
        </View>
      )}

      {!isLoading && !error && query.trim().length > 0 && results.length === 0 && (
        <View style={styles.centered}>
          <NativeIcon name="search" size="lg" color={Colors.Text.muted} />
          <Text style={styles.emptyText}>{t('sceneSearch.noResults')}</Text>
        </View>
      )}

      {!isLoading && !error && results.length > 0 && (
        <FlatList
          data={results}
          renderItem={renderResult}
          keyExtractor={keyExtractor}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  header: { marginBottom: spacing.md },
  title: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  input: { minHeight: 44 },
  list: { maxHeight: 360 },
  listContent: { gap: spacing.sm, paddingBottom: spacing.md },
  resultItem: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    padding: spacing.sm, backgroundColor: Colors.Glass.whiteSubtle,
    borderRadius: borderRadius.md,
  },
  resultItemRTL: { flexDirection: 'row-reverse' },
  thumbnail: { width: 80, height: 48, borderRadius: borderRadius.sm, backgroundColor: Colors.Glass.bgLight },
  resultInfo: { flex: 1 },
  resultDescription: { fontSize: fontSize.sm, color: colors.text, lineHeight: 20, marginBottom: spacing.xxs },
  timestamp: { fontSize: fontSize.xs, color: Colors.Primary.p400, fontWeight: '600', fontVariant: ['tabular-nums'] },
  centered: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  errorText: { fontSize: fontSize.sm, color: Colors.Error.default, textAlign: 'center' },
  emptyText: { fontSize: fontSize.sm, color: Colors.Text.muted, textAlign: 'center' },
});
