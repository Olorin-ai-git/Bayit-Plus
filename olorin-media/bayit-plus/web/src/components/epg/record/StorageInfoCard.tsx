/**
 * Storage information card for EPG recording modal
 * Displays estimated file size, quota, and warnings
 * @module epg/record/StorageInfoCard
 */

import React from 'react'
import { View, Text } from 'react-native'
import { HardDrive, AlertCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { platformClass } from '@/utils/platformClass'
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
      {/* Storage Estimate Card */}
      <View className={platformClass('bg-white/5 rounded-2xl p-4 mb-4')}>
        <View
          className={platformClass('flex items-center gap-2 mb-1')}
          style={{ flexDirection }}
        >
          <HardDrive size={16} color="rgba(255, 255, 255, 0.6)" />
          <Text className={platformClass('text-sm font-medium text-white/60')}>
            {t('epg.storageEstimate')}
          </Text>
        </View>
        <Text className={platformClass('text-3xl font-bold text-white mb-1')}>
          ~{estimatedSizeMB < 1024 ? `${estimatedSizeMB} MB` : `${estimatedSizeGB} GB`}
        </Text>
        {quotaInfo && (
          <Text className={platformClass('text-xs text-white/60')}>
            {t('epg.availableSpace')}: {quotaInfo.storage_available_formatted}
          </Text>
        )}
      </View>

      {/* Low Storage Warning */}
      {showLowStorageWarning && (
        <View
          className={platformClass(
            'flex items-start gap-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl mb-4'
          )}
          style={{ flexDirection }}
        >
          <AlertCircle size={20} color="#f59e0b" />
          <View className={platformClass('flex-1')}>
            <Text className={platformClass('text-sm font-semibold text-yellow-500 mb-1')}>
              {t('epg.lowStorage')}
            </Text>
            <Text
              className={platformClass('text-xs text-yellow-500/80')}
              style={{ lineHeight: 18 }}
            >
              {t('epg.lowStorageMessage')}
            </Text>
          </View>
        </View>
      )}
    </>
  )
}

export default StorageInfoCard
