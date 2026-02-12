import { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Search, Book, TrendingUp } from 'lucide-react';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import api from '@/services/api';
import { GlossaryEntryCard } from '@/components/glossary/GlossaryEntryCard';

const CATEGORIES = ['All', 'Slang', 'Food', 'Holidays', 'Music', 'History', 'Proverbs'];
const PAGE_SIZE = 20;

interface PhraseBreakdown {
  phrase: string;
  transliteration: string;
  translation: string;
  origin: string;
  usage_example: string;
  fun_fact: string;
  tags: string[];
}

export default function GlossaryPage() {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [entries, setEntries] = useState<PhraseBreakdown[]>([]);
  const [loading, setLoading] = useState(false);
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchEntries = useCallback(async (reset = false) => {
    setLoading(true);
    const currentSkip = reset ? 0 : skip;
    const tags = activeCategory !== 'All' ? activeCategory.toLowerCase() : undefined;
    const data = await api.get('/cultural/glossary', {
      params: { query: query || undefined, tags, limit: PAGE_SIZE, skip: currentSkip },
    });
    if (reset) {
      setEntries(data);
      setSkip(PAGE_SIZE);
    } else {
      setEntries(prev => [...prev, ...data]);
      setSkip(currentSkip + PAGE_SIZE);
    }
    setHasMore(data.length === PAGE_SIZE);
    setLoading(false);
  }, [query, activeCategory, skip]);

  useEffect(() => {
    fetchEntries(true);
  }, [query, activeCategory]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Book size={28} color={colors.primary[400]} />
        <Text style={styles.title}>Hebrew Glossary</Text>
      </View>

      <View style={styles.searchRow}>
        <Search size={18} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search phrases..."
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryRow}
      >
        {CATEGORIES.map(cat => (
          <Pressable
            key={cat}
            style={[styles.chip, activeCategory === cat && styles.chipActive]}
            onPress={() => setActiveCategory(cat)}
          >
            <Text style={[styles.chipText, activeCategory === cat && styles.chipTextActive]}>
              {cat}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {entries.map((entry, idx) => (
        <GlossaryEntryCard key={`${entry.phrase}-${idx}`} entry={entry} />
      ))}

      {hasMore && !loading && (
        <Pressable style={styles.loadMore} onPress={() => fetchEntries(false)}>
          <Text style={styles.loadMoreText}>Load More</Text>
        </Pressable>
      )}

      {loading && <Text style={styles.loadingText}>Loading...</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  title: { fontSize: fontSize['2xl'], fontWeight: '700', color: colors.textPrimary },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.md,
  },
  searchInput: { flex: 1, color: colors.textPrimary, fontSize: fontSize.base },
  categoryRow: { marginBottom: spacing.lg },
  chip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: borderRadius.full, backgroundColor: colors.surface, marginRight: spacing.sm,
  },
  chipActive: { backgroundColor: colors.primary[500] },
  chipText: { fontSize: fontSize.sm, color: colors.textSecondary },
  chipTextActive: { color: colors.textPrimary, fontWeight: '600' },
  loadMore: {
    alignSelf: 'center', paddingVertical: spacing.sm, paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface, borderRadius: borderRadius.lg, marginTop: spacing.md,
  },
  loadMoreText: { color: colors.primary[400], fontWeight: '600' },
  loadingText: { textAlign: 'center', color: colors.textSecondary, marginTop: spacing.md },
});
