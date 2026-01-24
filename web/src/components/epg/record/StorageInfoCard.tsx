/**
 * Storage information card for EPG recording modal
 * Displays estimated file size, quota, and warnings
 * @module epg/record/StorageInfoCard
 */

import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { HardDrive, AlertCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { useDirection } from '@/hooks/useDirection'
import { QuotaInfo } from './types'

/**
 * Props schema
 */
const StorageInfoCardPropsSchema = z.object({
  estimatedSizeMB: z.number().positive(),
  estimatedSizeGB: z.string(),
  quotaInfo: z.custom<QuotaInfo>().nullable(),
})

type StorageInfoCardProps = z.infer<typeof StorageInfoCardPropsSchema>

/**
 * Storage information card component
 */
const StorageInfoCard: React.FC<StorageInfoCardProps> = ({
  estimatedSizeMB,
  estimatedSizeGB,
  quotaInfo,
}) => {
  const { t } = useTranslation()
  const { flexDirection } = useDirection()

  const showLowStorageWarning = quotaInfo && quotaInfo.storage_usage_percentage > 80

  return (
    <>
      <View style={styles.storageCard}>
        <View style={[styles.storageHeader, { flexDirection }]}>
          <HardDrive size={16} color="rgba(255, 255, 255, 0.6)" />
          <Text style={styles.storageLabel}>{t('epg.storageEstimate')}</Text>
        </View>
        <Text style={styles.storageValue}>
          ~{estimatedSizeMB < 1024 ? `${estimatedSizeMB} MB` : `${estimatedSizeGB} GB`}
        </Text>
        {quotaInfo && (
          <Text style={styles.storageAvailable}>
            {t('epg.availableSpace')}: {quotaInfo.storage_available_formatted}
          </Text>
        )}
      </View>

      {showLowStorageWarning && (
        <View style={[styles.warningCard, { flexDirection }]}>
          <AlertCircle size={20} color="#f59e0b" />
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
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  storageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  storageLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  storageValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  storageAvailable: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    padding: 16,
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
    borderRadius: 16,
    marginBottom: 16,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fbbf24',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 13,
    color: 'rgba(251, 191, 36, 0.8)',
    lineHeight: 18,
  },
})

export default StorageInfoCard
