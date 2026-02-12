import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';

interface PhraseBreakdown {
  phrase: string;
  transliteration: string;
  translation: string;
  origin: string;
  usage_example: string;
  fun_fact: string;
  tags: string[];
}

interface Props {
  entry: PhraseBreakdown;
}

export function GlossaryEntryCard({ entry }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Pressable style={styles.card} onPress={() => setExpanded(!expanded)}>
      <View style={styles.headerRow}>
        <View style={styles.phraseColumn}>
          <Text style={styles.phrase}>{entry.phrase}</Text>
          <Text style={styles.transliteration}>{entry.transliteration}</Text>
          <Text style={styles.translation}>{entry.translation}</Text>
        </View>
        {expanded ? (
          <ChevronUp size={20} color={colors.textSecondary} />
        ) : (
          <ChevronDown size={20} color={colors.textSecondary} />
        )}
      </View>

      {entry.tags.length > 0 && (
        <View style={styles.tagRow}>
          {entry.tags.map(tag => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {expanded && (
        <View style={styles.details}>
          {entry.origin ? (
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Origin</Text>
              <Text style={styles.detailText}>{entry.origin}</Text>
            </View>
          ) : null}

          {entry.usage_example ? (
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Example</Text>
              <Text style={styles.detailText}>{entry.usage_example}</Text>
            </View>
          ) : null}

          {entry.fun_fact ? (
            <View style={styles.detailSection}>
              <View style={styles.funFactHeader}>
                <Sparkles size={14} color={colors.warning[400]} />
                <Text style={styles.detailLabel}>Fun Fact</Text>
              </View>
              <Text style={styles.detailText}>{entry.fun_fact}</Text>
            </View>
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: `${colors.surface}CC`, borderRadius: borderRadius.xl,
    padding: spacing.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: `${colors.border}40`,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  phraseColumn: { flex: 1 },
  phrase: { fontSize: fontSize.lg, fontWeight: '700', color: colors.textPrimary, writingDirection: 'rtl' },
  transliteration: { fontSize: fontSize.sm, color: colors.primary[300], fontStyle: 'italic', marginTop: 2 },
  translation: { fontSize: fontSize.base, color: colors.textSecondary, marginTop: 2 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },
  tag: {
    backgroundColor: `${colors.primary[500]}30`, borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm, paddingVertical: 2,
  },
  tagText: { fontSize: fontSize.xs, color: colors.primary[300] },
  details: { marginTop: spacing.md, borderTopWidth: 1, borderTopColor: `${colors.border}30`, paddingTop: spacing.md },
  detailSection: { marginBottom: spacing.sm },
  detailLabel: { fontSize: fontSize.xs, fontWeight: '600', color: colors.primary[400], marginBottom: 2 },
  detailText: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },
  funFactHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
