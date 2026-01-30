/**
 * EPGRecordStorageInfo
 * Storage estimate and low-storage warning for recording modal
 */

import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { HardDrive, AlertCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'

interface EPGRecordStorageInfoProps {
  durationMinutes: number
  quotaInfo: { storage_usage_percentage: number; storage_available_formatted: string } | null
  flexDirection: 'row' | 'row-reverse'
}

export const EPGRecordStorageInfo: React.FC<EPGRecordStorageInfoProps> = ({
  durationMinutes, quotaInfo, flexDirection,
}) => {
  const { t } = useTranslation()
  const estimatedSizeMB = Math.ceil(durationMinutes * 5)
  const sizeDisplay = estimatedSizeMB < 1024
    ? `${estimatedSizeMB} MB`
    : `${(estimatedSizeMB / 1024).toFixed(2)} GB`

  return (
    <>
      <View style={styles.storageCard}>
        <View style={[styles.storageHeader, { flexDirection }]}>
          <HardDrive size={16} color={colors.textMuted} />
          <Text style={styles.storageLabel}>{t('epg.storageEstimate')}</Text>
        </View>
        <Text style={styles.storageValue}>~{sizeDisplay}</Text>
        {quotaInfo && (
          <Text style={styles.storageAvailable}>
            {t('epg.availableSpace')}: {quotaInfo.storage_available_formatted}
          </Text>
        )}
      </View>

      {quotaInfo && quotaInfo.storage_usage_percentage > 80 && (
        <View style={[styles.warningCard, { flexDirection }]}>
          <AlertCircle size={20} color={colors.warning} />
          <View style={styles.warningContent}>
            <Text style={styles.warningTitle}>{t('epg.lowStorage')}</Text>
            <Text style={styles.warningText}>{t('epg.lowStorageMessage')}</Text>
          </View>
        </View>
      )}
    </>
  )
}

const styles = StyleSheet.create({
  storageCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.md,
  },
  storageHeader: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs,
  },
  storageLabel: { fontSize: 14, fontWeight: '500', color: colors.textMuted },
  storageValue: { fontSize: 28, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  storageAvailable: { fontSize: 12, color: colors.textMuted },
  warningCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, padding: spacing.md,
    backgroundColor: 'rgba(245, 158, 11, 0.1)', borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)', borderRadius: borderRadius.lg, marginBottom: spacing.md,
  },
  warningContent: { flex: 1 },
  warningTitle: {
    fontSize: 14, fontWeight: '600', color: colors.warning.DEFAULT, marginBottom: spacing.xs,
  },
  warningText: { fontSize: 13, color: 'rgba(245, 158, 11, 0.8)', lineHeight: 18 },
})
