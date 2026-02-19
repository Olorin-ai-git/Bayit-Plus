import { useEffect } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { Download, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { GlassPageHeader, GlassEmptyState, GlassButton } from '@bayit/shared/ui';
import { LoadingState } from '@bayit/shared-components/states';
import { colors, spacing, fontSize } from '@olorin/design-tokens';
import { useDirection } from '@/hooks/useDirection';
import { useResponsive } from '@/hooks/useResponsive';
import {
  useDownloadStore,
  selectActiveDownloads,
  selectCompletedDownloads,
  selectFailedDownloads,
} from '@/stores/downloadStore';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { StorageBar } from './StorageBar';
import { DownloadCard } from './DownloadCard';

function DownloadSection({
  title,
  items,
  numColumns,
  action,
}: {
  title: string;
  items: any[];
  numColumns: number;
  action?: React.ReactNode;
}) {
  if (items.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title} ({items.length})</Text>
        {action}
      </View>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        key={`${title}-${numColumns}`}
        contentContainerStyle={{ gap: spacing.md }}
        columnWrapperStyle={numColumns > 1 ? { gap: spacing.md } : undefined}
        renderItem={({ item }) => (
          <View style={{ flex: 1, maxWidth: `${100 / numColumns}%` }}>
            <DownloadCard item={item} />
          </View>
        )}
      />
    </View>
  );
}

export default function DownloadsPage() {
  const { t } = useTranslation();
  const { isRTL } = useDirection();
  const { width } = useResponsive();
  const { loading, fetchDownloads, clearAll, startPolling, stopPolling } = useDownloadStore();
  const downloads = useDownloadStore((s) => s.downloads);
  const active = useDownloadStore(selectActiveDownloads);
  const completed = useDownloadStore(selectCompletedDownloads);
  const failed = useDownloadStore(selectFailedDownloads);

  const numColumns = width >= 1280 ? 6 : width >= 1024 ? 5 : width >= 768 ? 4 : width >= 640 ? 3 : 2;

  useEffect(() => {
    fetchDownloads();
  }, [fetchDownloads]);

  useEffect(() => {
    if (active.length > 0) {
      startPolling(5000);
    } else {
      stopPolling();
    }
    return () => stopPolling();
  }, [active.length, startPolling, stopPolling]);

  const retryAllFailed = () => {
    failed.forEach((d) => useDownloadStore.getState().resumeDownload(d.id));
  };

  return (
    <View style={styles.container}>
      <GlassPageHeader
        title={t('downloads.title')}
        pageType="downloads"
        badge={downloads.length}
        isRTL={isRTL}
        action={
          downloads.length > 0 ? (
            <GlassButton onPress={clearAll} variant="ghost" size="sm" title={t('downloads.clearAll')} />
          ) : undefined
        }
      />

      <OfflineBanner />
      <StorageBar />

      {loading ? (
        <LoadingState message={t('downloads.loading')} spinnerColor={colors.primary} />
      ) : downloads.length > 0 ? (
        <>
          <DownloadSection title={t('downloads.downloading')} items={active} numColumns={numColumns} />
          <DownloadSection
            title={t('downloads.failed')}
            items={failed}
            numColumns={numColumns}
            action={
              failed.length > 0 ? (
                <Pressable onPress={retryAllFailed} style={styles.retryAllButton}>
                  <RotateCcw size={14} color={colors.primary.DEFAULT} />
                  <Text style={styles.retryAllText}>{t('downloads.retryAll')}</Text>
                </Pressable>
              ) : undefined
            }
          />
          <DownloadSection title={t('downloads.completed')} items={completed} numColumns={numColumns} />
        </>
      ) : (
        <GlassEmptyState
          variant="no-downloads"
          icon={<Download size={72} color="rgba(168,85,247,0.5)" strokeWidth={1.5} />}
          title={t('downloads.empty')}
          description={t('downloads.emptyHint')}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.lg, paddingVertical: spacing.xl, maxWidth: 1400, marginHorizontal: 'auto', width: '100%' },
  section: { marginBottom: spacing.xl },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  sectionTitle: { color: colors.text, fontSize: fontSize.lg, fontWeight: '600' },
  retryAllButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  retryAllText: { color: colors.primary.DEFAULT, fontSize: fontSize.sm, fontWeight: '500' },
});
