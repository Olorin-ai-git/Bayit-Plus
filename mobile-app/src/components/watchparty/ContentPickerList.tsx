/**
 * ContentPickerList - Horizontal scrollable list of available content
 * for selecting what to watch in a Watch Party.
 *
 * Loads featured content on mount, supports search-by-category,
 * and highlights the selected item.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  type ListRenderItemInfo,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { contentService } from '@bayit/shared-services/api';
import {
  GlassInput,
  GlassCard,
  colors,
  spacing,
} from '@olorin/glass-ui/native';
import { logger } from '../../utils/logger';
import Colors from '../../theme/colors';

const log = logger.scope('ContentPickerList');

export interface ContentItem {
  id: string;
  title: string;
  content_type: string;
  thumbnail_url?: string;
}

interface ContentPickerListProps {
  selectedContent: ContentItem | null;
  onSelect: (item: ContentItem) => void;
  disabled?: boolean;
}

const PAGE_LIMIT = 20;

export const ContentPickerList: React.FC<ContentPickerListProps> = ({
  selectedContent,
  onSelect,
  disabled = false,
}) => {
  const { t } = useTranslation();
  const [items, setItems] = useState<ContentItem[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const loadFeatured = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await contentService.getFeatured() as {
        items?: ContentItem[];
        results?: ContentItem[];
      };
      setItems((res.items || res.results || []).slice(0, PAGE_LIMIT));
    } catch (err) {
      log.error('Failed to load featured content', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadFeatured(); }, [loadFeatured]);

  const handleSearch = useCallback(async (q: string) => {
    setQuery(q);
    if (!q.trim()) { loadFeatured(); return; }
    setIsLoading(true);
    try {
      const res = await contentService.getByCategory(q) as {
        items?: ContentItem[];
        results?: ContentItem[];
      };
      setItems((res.items || res.results || []).slice(0, PAGE_LIMIT));
    } catch (err) {
      log.error('Content search failed', err);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [loadFeatured]);

  const renderItem = useCallback(({ item }: ListRenderItemInfo<ContentItem>) => {
    const selected = selectedContent?.id === item.id;
    return (
      <Pressable onPress={() => onSelect(item)} disabled={disabled}>
        <GlassCard style={[styles.card, selected && styles.cardSelected]}>
          <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.type}>{item.content_type}</Text>
        </GlassCard>
      </Pressable>
    );
  }, [selectedContent, onSelect, disabled]);

  const keyExtractor = useCallback((item: ContentItem) => item.id, []);

  return (
    <View style={styles.container}>
      <GlassInput
        placeholder={t('watchParty.create.searchContent')}
        value={query}
        onChangeText={handleSearch}
        editable={!disabled}
      />
      {isLoading ? (
        <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.list}
          style={styles.listWrap}
        />
      )}
      {selectedContent && (
        <Text style={styles.selected}>
          {t('watchParty.create.selected')}: {selectedContent.title}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  listWrap: { maxHeight: 90 },
  list: { gap: spacing.sm },
  loader: { paddingVertical: spacing.lg },
  card: {
    padding: spacing.sm, width: 140,
    borderWidth: 1, borderColor: Colors.Glass.border,
  },
  cardSelected: { borderColor: Colors.Primary.default, borderWidth: 2 },
  title: { fontSize: 13, fontWeight: '600', color: Colors.Text.primary, marginBottom: 2 },
  type: { fontSize: 11, color: Colors.Text.muted, textTransform: 'capitalize' },
  selected: { fontSize: 13, color: Colors.Primary.p400, fontWeight: '500' },
});

export default ContentPickerList;
