/**
 * RecordingsQuotaPanel
 * Storage quota visualization for MyRecordingsPage
 */

import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { HardDrive } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { colors } from '@olorin/design-tokens'
import { GlassView } from '@bayit/shared/ui'
import type { RecordingQuota } from '@/services/recordingApi'

interface RecordingsQuotaPanelProps {
  quota: RecordingQuota
  flexDirection: 'row' | 'row-reverse'
}

export const RecordingsQuotaPanel: React.FC<RecordingsQuotaPanelProps> = ({
  quota, flexDirection,
}) => {
  const { t } = useTranslation()
  const isHighUsage = quota.storage_usage_percentage > 90

  return (
    <GlassView style={styles.container}>
      <View style={[styles.header, { flexDirection }]}>
        <HardDrive size={20} color={colors.primary} />
        <Text style={styles.title}>{t('recordings.storageUsed')}</Text>
      </View>

      <View style={[styles.stats, { flexDirection }]}>
        <Text style={styles.usage}>
          {quota.used_storage_formatted} / {quota.total_storage_formatted}
        </Text>
        <Text style={[styles.percentage, { color: isHighUsage ? colors.error : colors.text }]}>
          {quota.storage_usage_percentage.toFixed(1)}%
        </Text>
      </View>

      <View style={styles.progressContainer}>
        <View style={[
          styles.progressBar,
          {
            width: `${Math.min(quota.storage_usage_percentage, 100)}%`,
            backgroundColor: isHighUsage ? colors.error : colors.primary,
          },
        ]} />
      </View>

      <View style={[styles.footer, { flexDirection }]}>
        <Text style={styles.footerText}>
          {t('recordings.totalRecordings')}: {quota.total_recordings}
        </Text>
        <Text style={styles.footerText}>
          {t('recordings.maxDuration')}: {quota.max_recording_duration_formatted}
        </Text>
      </View>
    </GlassView>
  )
}

const styles = StyleSheet.create({
  container: { marginHorizontal: 24, marginBottom: 16, padding: 16, borderRadius: 8 },
  header: { gap: 8, alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 16, fontWeight: '600', color: colors.text },
  stats: { justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  usage: { fontSize: 18, fontWeight: '600', color: colors.text },
  percentage: { fontSize: 16, fontWeight: '500' },
  progressContainer: {
    height: 8, backgroundColor: 'rgba(75, 85, 99, 0.2)',
    borderRadius: 4, overflow: 'hidden', marginBottom: 16,
  },
  progressBar: { height: '100%', borderRadius: 4 },
  footer: { justifyContent: 'space-between' },
  footerText: { fontSize: 12, color: colors.textSecondary },
})
