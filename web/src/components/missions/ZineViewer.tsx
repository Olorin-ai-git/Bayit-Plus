import { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { ChevronLeft, ChevronRight, BookOpen, Archive } from 'lucide-react';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import api from '@/services/api';

interface ZinePage {
  page_number: number;
  title: string;
  content_markdown: string;
  image_prompt: string;
}

interface Zine {
  zine_id: string;
  week_key: string;
  title: string;
  pages: ZinePage[];
  status: string;
  viewed: boolean;
  created_at: string;
}

interface Props {
  profileId: string;
}

export function ZineViewer({ profileId }: Props) {
  const [zine, setZine] = useState<Zine | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showArchive, setShowArchive] = useState(false);
  const [archive, setArchive] = useState<Zine[]>([]);

  useEffect(() => {
    loadCurrentZine();
  }, [profileId]);

  const loadCurrentZine = async () => {
    setLoading(true);
    const data = await api.get('/zine/current', { params: { profile_id: profileId } });
    setZine(data);
    setCurrentPage(0);
    setLoading(false);
    if (data && !data.viewed) {
      await api.patch(`/zine/${data.zine_id}/viewed`);
    }
  };

  const loadArchive = async () => {
    const data = await api.get('/zine/archive', { params: { profile_id: profileId } });
    setArchive(data);
    setShowArchive(true);
  };

  const nextPage = useCallback(() => {
    if (zine && currentPage < zine.pages.length - 1) setCurrentPage(p => p + 1);
  }, [zine, currentPage]);

  const prevPage = useCallback(() => {
    if (currentPage > 0) setCurrentPage(p => p - 1);
  }, [currentPage]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={colors.primary[400]} /></View>;
  }

  if (!zine) {
    return (
      <View style={styles.center}>
        <BookOpen size={48} color={colors.textSecondary} />
        <Text style={styles.emptyTitle}>No Zine Available</Text>
        <Text style={styles.emptyText}>Your personalized weekly zine will appear here</Text>
      </View>
    );
  }

  const page = zine.pages[currentPage];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{zine.title}</Text>
        <Pressable style={styles.archiveButton} onPress={loadArchive}>
          <Archive size={18} color={colors.primary[400]} />
          <Text style={styles.archiveText}>Archive</Text>
        </Pressable>
      </View>

      <View style={styles.pageContainer}>
        <Text style={styles.pageTitle}>{page?.title}</Text>
        <ScrollView style={styles.pageContent}>
          <Text style={styles.pageText}>{page?.content_markdown}</Text>
        </ScrollView>
      </View>

      <View style={styles.navigation}>
        <Pressable
          style={[styles.navButton, currentPage === 0 && styles.navDisabled]}
          onPress={prevPage}
          disabled={currentPage === 0}
        >
          <ChevronLeft size={24} color={currentPage === 0 ? colors.textSecondary : colors.textPrimary} />
        </Pressable>
        <Text style={styles.pageIndicator}>
          {currentPage + 1} / {zine.pages.length}
        </Text>
        <Pressable
          style={[styles.navButton, currentPage >= zine.pages.length - 1 && styles.navDisabled]}
          onPress={nextPage}
          disabled={currentPage >= zine.pages.length - 1}
        >
          <ChevronRight
            size={24}
            color={currentPage >= zine.pages.length - 1 ? colors.textSecondary : colors.textPrimary}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  title: { fontSize: fontSize.xl, fontWeight: '700', color: colors.textPrimary },
  archiveButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  archiveText: { fontSize: fontSize.sm, color: colors.primary[400] },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '600', color: colors.textPrimary, marginTop: spacing.md },
  emptyText: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs },
  pageContainer: {
    flex: 1, backgroundColor: `${colors.surface}CC`, borderRadius: borderRadius.xl,
    padding: spacing.lg, borderWidth: 1, borderColor: `${colors.border}40`,
  },
  pageTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.md },
  pageContent: { flex: 1 },
  pageText: { fontSize: fontSize.base, color: colors.textSecondary, lineHeight: 24 },
  navigation: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: spacing.lg, marginTop: spacing.md, paddingVertical: spacing.sm,
  },
  navButton: { padding: spacing.sm, borderRadius: borderRadius.full, backgroundColor: colors.surface },
  navDisabled: { opacity: 0.4 },
  pageIndicator: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '600' },
});
