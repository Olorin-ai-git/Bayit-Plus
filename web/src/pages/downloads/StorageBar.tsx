import { View, Text, StyleSheet } from 'react-native';
import { HardDrive } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '@bayit/shared/ui';
import { colors, spacing, fontSize, borderRadius } from '@olorin/design-tokens';
import { useDownloadStore, selectStorageUsedGB } from '@/stores/downloadStore';

const STORAGE_TOTAL_GB = 32;

const formatSize = (gb: number) => {
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  return `${Math.round(gb * 1024)} MB`;
};

export function StorageBar() {
  const { t } = useTranslation();
  const usedGB = useDownloadStore(selectStorageUsedGB);
  const pct = Math.min((usedGB / STORAGE_TOTAL_GB) * 100, 100);

  return (
    <GlassCard style={styles.card}>
      <View style={styles.content}>
        <HardDrive size={24} color={colors.textMuted} />
        <View style={styles.info}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>{t('downloads.storage')}</Text>
            <Text style={styles.value}>
              {formatSize(usedGB)} / {STORAGE_TOTAL_GB} GB
            </Text>
          </View>
          <View style={styles.barBackground}>
            <View style={[styles.barFill, { width: `${pct}%` }]} />
          </View>
        </View>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.lg, marginBottom: spacing.xl },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  info: { flex: 1 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  label: { color: colors.textMuted, fontSize: fontSize.sm },
  value: { color: colors.text, fontSize: fontSize.sm },
  barBackground: { height: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: borderRadius.full, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: colors.primary.DEFAULT, borderRadius: borderRadius.full },
});
