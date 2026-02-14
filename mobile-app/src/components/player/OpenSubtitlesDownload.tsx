/**
 * OpenSubtitlesDownload - External subtitle download modal
 *
 * Search, results list, and download progress for
 * downloading subtitles from the OpenSubtitles service.
 */

import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, type ListRenderItemInfo } from 'react-native';
import { useTranslation } from 'react-i18next';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useDirection } from '@bayit/shared-hooks';
import { GlassButton, GlassInput, GlassLoadingSpinner } from '@bayit/shared/ui';
import { GlassView } from '@bayit/shared';
import { GlassModal } from '@olorin/glass-ui/native';
import { NativeIcon } from '@olorin/shared-icons/native';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { openSubtitlesService } from '@bayit/shared-services/api';
import { Colors } from '../../theme/colors';
import logger from '@/utils/logger';

const log = logger.scope('OpenSubtitlesDownload');

interface SubtitleResult {
  id: string; language: string; languageName: string;
  fileName: string; downloads: number; rating: number;
}

interface OpenSubtitlesDownloadProps {
  visible: boolean; onClose: () => void; contentId: string;
  contentTitle: string; onSubtitleDownloaded: (subtitleId: string, language: string) => void;
}

export const OpenSubtitlesDownload: React.FC<OpenSubtitlesDownloadProps> = ({
  visible, onClose, contentId, contentTitle, onSubtitleDownloaded,
}) => {
  const { t } = useTranslation();
  const { isRTL, textAlign } = useDirection();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SubtitleResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = useCallback(async () => {
    const searchTerm = query.trim() || contentTitle;
    if (!searchTerm) return;
    setIsSearching(true); setError(null);
    try {
      log.info('Searching OpenSubtitles', { contentId, query: searchTerm });
      const response = await openSubtitlesService.search(contentId, searchTerm);
      setResults(response.subtitles);
    } catch (err: unknown) {
      log.error('OpenSubtitles search failed', { error: err });
      setError(t('openSubtitles.searchError')); setResults([]);
    } finally { setIsSearching(false); }
  }, [query, contentTitle, contentId, t]);

  const handleDownload = useCallback(async (subtitle: SubtitleResult) => {
    ReactNativeHapticFeedback.trigger('impactMedium');
    setDownloadingId(subtitle.id);
    try {
      log.info('Downloading subtitle', { subtitleId: subtitle.id, language: subtitle.language });
      await openSubtitlesService.download(contentId, subtitle.id);
      onSubtitleDownloaded(subtitle.id, subtitle.language); onClose();
    } catch (err: unknown) {
      log.error('Subtitle download failed', { subtitleId: subtitle.id, error: err });
      setError(t('openSubtitles.downloadError'));
    } finally { setDownloadingId(null); }
  }, [contentId, onSubtitleDownloaded, onClose, t]);

  const renderResult = useCallback(({ item }: ListRenderItemInfo<SubtitleResult>) => (
    <GlassView style={styles.resultCard}>
      <View style={[styles.resultRow, isRTL && styles.resultRowRTL]}>
        <View style={styles.langBadge}>
          <Text style={styles.langCode}>{item.language.toUpperCase()}</Text>
        </View>
        <View style={styles.resultInfo}>
          <Text style={[styles.fileName, { textAlign }]} numberOfLines={1}>{item.fileName}</Text>
          <View style={[styles.metaRow, isRTL && styles.metaRowRTL]}>
            <Text style={styles.metaText}>{t('openSubtitles.downloads', { count: item.downloads })}</Text>
            <View style={styles.ratingRow}>
              <NativeIcon name="star" size="xs" color={Colors.Special.gold} />
              <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
            </View>
          </View>
        </View>
        <GlassButton variant="primary" size="small" onPress={() => handleDownload(item)}
          disabled={downloadingId === item.id}
          accessibilityLabel={t('openSubtitles.downloadSubtitle', { language: item.languageName })}
          accessibilityRole="button">
          {downloadingId === item.id
            ? <GlassLoadingSpinner size="small" />
            : <NativeIcon name="download" size="sm" color={Colors.white} />}
        </GlassButton>
      </View>
    </GlassView>
  ), [downloadingId, isRTL, textAlign, handleDownload, t]);

  const keyExtractor = useCallback((item: SubtitleResult) => item.id, []);

  return (
    <GlassModal visible={visible} onClose={onClose} size="lg" dismissable>
      <View style={styles.container}>
        <Text style={[styles.title, { textAlign }]} accessible accessibilityRole="header">
          {t('openSubtitles.title')}
        </Text>
        <Text style={[styles.subtitle, { textAlign }]} numberOfLines={1}>{contentTitle}</Text>
        <View style={styles.searchRow}>
          <GlassInput placeholder={t('openSubtitles.searchPlaceholder')} value={query}
            onChangeText={setQuery} onSubmitEditing={handleSearch} returnKeyType="search"
            style={styles.searchInput} accessibilityLabel={t('openSubtitles.searchLabel')}
            accessibilityHint={t('openSubtitles.searchHint')} />
          <GlassButton variant="primary" size="small" onPress={handleSearch} disabled={isSearching}
            accessibilityLabel={t('openSubtitles.search')} accessibilityRole="button">
            <NativeIcon name="search" size="sm" color={Colors.white} />
          </GlassButton>
        </View>
        {isSearching && <View style={styles.centered}><GlassLoadingSpinner size="medium" /></View>}
        {error && (
          <View style={styles.centered}>
            <NativeIcon name="alertTriangle" size="md" color={Colors.Error.default} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        {!isSearching && !error && results.length > 0 && (
          <FlatList data={results} renderItem={renderResult} keyExtractor={keyExtractor}
            style={styles.resultsList} contentContainerStyle={styles.resultsContent}
            showsVerticalScrollIndicator={false} />
        )}
        {!isSearching && !error && results.length === 0 && query.length > 0 && (
          <View style={styles.centered}>
            <NativeIcon name="subtitles" size="lg" color={Colors.Text.muted} />
            <Text style={styles.emptyText}>{t('openSubtitles.noResults')}</Text>
          </View>
        )}
      </View>
    </GlassModal>
  );
};

const styles = StyleSheet.create({
  container: { paddingVertical: spacing.sm },
  title: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: spacing.xxs },
  subtitle: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.md },
  searchRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md, alignItems: 'center' },
  searchInput: { flex: 1, minHeight: 44 },
  resultsList: { maxHeight: 320 },
  resultsContent: { gap: spacing.sm },
  resultCard: { borderRadius: borderRadius.md, padding: spacing.sm },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  resultRowRTL: { flexDirection: 'row-reverse' },
  langBadge: { width: 40, height: 32, borderRadius: borderRadius.sm, backgroundColor: Colors.Glass.purpleLight, justifyContent: 'center', alignItems: 'center' },
  langCode: { fontSize: fontSize.xs, fontWeight: '700', color: Colors.Primary.p300 },
  resultInfo: { flex: 1 },
  fileName: { fontSize: fontSize.sm, color: colors.text, fontWeight: '500' },
  metaRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xxs },
  metaRowRTL: { flexDirection: 'row-reverse' },
  metaText: { fontSize: fontSize.xs, color: Colors.Text.muted },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  ratingText: { fontSize: fontSize.xs, color: Colors.Special.gold, fontWeight: '600' },
  centered: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  errorText: { fontSize: fontSize.sm, color: Colors.Error.default, textAlign: 'center' },
  emptyText: { fontSize: fontSize.sm, color: Colors.Text.muted, textAlign: 'center' },
});
