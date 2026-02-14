/**
 * GlossaryScreenMobile
 *
 * Searchable Hebrew glossary screen with alphabetical grouping,
 * instant filtering, and navigation to detail view.
 */

import React, { useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, RefreshControl, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { GlassInput } from '@olorin/glass-ui/native';
import { GlassLoadingSpinner } from '@bayit/shared/ui';
import { NativeIcon } from '@olorin/shared-icons/native';
import { useDirection } from '@bayit/shared-hooks';
import { useGlossary, GlossaryEntry } from '../hooks/useGlossary';
import logger from '@/utils/logger';

const moduleLogger = logger.scope('GlossaryScreenMobile');

const CATEGORIES = ['All', 'Slang', 'Food', 'Holidays', 'Music', 'History', 'Proverbs'];

export const GlossaryScreenMobile: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const { isRTL } = useDirection();
  const {
    entries, searchQuery, activeCategory, isLoading, isRefreshing,
    setSearchQuery, setActiveCategory, loadMore, refresh,
  } = useGlossary();

  const handleEntryPress = useCallback((entry: GlossaryEntry) => {
    navigation.navigate('GlossaryDetail', { wordId: entry.id || entry.phrase });
  }, [navigation]);

  const renderEntry = useCallback(({ item }: { item: GlossaryEntry }) => (
    <TouchableOpacity
      style={styles.entryCard}
      onPress={() => handleEntryPress(item)}
      activeOpacity={0.7}
      accessibilityLabel={`${item.phrase} - ${item.transliteration}`}
      accessibilityHint={t('glossary.tapForDetails')}
      accessibilityRole="button"
    >
      <View style={[styles.entryContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={styles.entryTextContainer}>
          <Text style={[styles.phraseText, { textAlign: isRTL ? 'right' : 'left' }]}>{item.phrase}</Text>
          <Text style={[styles.translitText, { textAlign: isRTL ? 'right' : 'left' }]}>{item.transliteration}</Text>
          <Text style={[styles.defText, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={2}>{item.translation}</Text>
        </View>
        <View style={styles.chevron}>
          <NativeIcon name={isRTL ? 'chevronLeft' : 'chevronRight'} size="sm" color={colors.textMuted} />
        </View>
      </View>
      {item.tags.length > 0 && (
        <View style={[styles.tagsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {item.tags.slice(0, 3).map((tag) => (
            <View key={tag} style={styles.tagBadge}><Text style={styles.tagText}>{tag}</Text></View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  ), [handleEntryPress, isRTL, t]);

  const renderHeader = useCallback(() => (
    <View style={styles.headerWrap}>
      <View style={styles.searchWrap}>
        <GlassInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t('glossary.searchPlaceholder')}
          accessibilityLabel={t('glossary.searchPlaceholder')}
          accessibilityHint={t('glossary.searchHint')}
          accessibilityRole="search"
        />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
        {CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category}
            style={[styles.catPill, activeCategory === category && styles.catPillActive]}
            onPress={() => setActiveCategory(category)}
            accessibilityLabel={t(`glossary.category.${category.toLowerCase()}`)}
            accessibilityHint={t('glossary.filterByCategory')}
            accessibilityRole="button"
            accessibilityState={{ selected: activeCategory === category }}
          >
            <Text style={[styles.catText, activeCategory === category && styles.catTextActive]}>
              {t(`glossary.category.${category.toLowerCase()}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  ), [searchQuery, setSearchQuery, activeCategory, setActiveCategory, t]);

  if (isLoading && entries.length === 0) {
    return (
      <SafeAreaView style={styles.loadingWrap}>
        <GlassLoadingSpinner size="large" />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={entries}
        renderItem={renderEntry}
        keyExtractor={(item) => item.id || item.phrase}
        ListHeaderComponent={renderHeader}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={colors.primary} colors={[colors.primary]} />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <NativeIcon name="search" size="xxxl" color={colors.textMuted} />
            <Text style={styles.emptyText}>{t('glossary.noResults')}</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingWrap: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: colors.text, fontSize: fontSize.md, marginTop: spacing.md },
  headerWrap: { paddingBottom: spacing.md },
  searchWrap: { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm },
  catRow: { paddingHorizontal: spacing.md, gap: spacing.sm },
  catPill: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full, backgroundColor: 'rgba(255, 255, 255, 0.08)', minHeight: 36, justifyContent: 'center' },
  catPillActive: { backgroundColor: `${colors.primary}30`, borderWidth: 1, borderColor: colors.primary },
  catText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '500' },
  catTextActive: { color: colors.primary, fontWeight: '600' },
  listContent: { paddingBottom: spacing.xxl },
  entryCard: { marginHorizontal: spacing.md, marginBottom: spacing.sm, padding: spacing.md, borderRadius: borderRadius.lg, backgroundColor: 'rgba(255, 255, 255, 0.06)' },
  entryContent: { alignItems: 'center' },
  entryTextContainer: { flex: 1 },
  phraseText: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  translitText: { fontSize: fontSize.sm, fontStyle: 'italic', color: colors.primary, marginBottom: spacing.xs },
  defText: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: fontSize.sm * 1.4 },
  chevron: { paddingHorizontal: spacing.sm, justifyContent: 'center' },
  tagsRow: { marginTop: spacing.sm, flexWrap: 'wrap', gap: spacing.xs },
  tagBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.full, backgroundColor: `${colors.primary}20` },
  tagText: { fontSize: fontSize.xs, color: colors.primary },
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: spacing.xxl },
  emptyText: { color: colors.textMuted, fontSize: fontSize.md, marginTop: spacing.md },
});

export default GlossaryScreenMobile;
