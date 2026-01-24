/**
 * SubtitleDownloadSection Component
 * Download subtitles button and result messages
 */

import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Download, Check, AlertCircle } from 'lucide-react'
import { z } from 'zod'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'

// Zod schema for download result
const DownloadResultSchema = z.object({
  type: z.enum(['success', 'error', 'partial']),
  message: z.string(),
  imported: z.array(z.string()).optional(),
})

export type DownloadResult = z.infer<typeof DownloadResultSchema>

// Zod schema for props
const SubtitleDownloadSectionPropsSchema = z.object({
  isDownloading: z.boolean(),
  downloadResult: DownloadResultSchema.nullable(),
  onDownload: z.function().args().returns(z.void()),
})

export type SubtitleDownloadSectionProps = z.infer<typeof SubtitleDownloadSectionPropsSchema>

export default function SubtitleDownloadSection({
  isDownloading,
  downloadResult,
  onDownload,
}: SubtitleDownloadSectionProps) {
  const { t } = useTranslation()

  // Validate props in development
  if (process.env.NODE_ENV === 'development') {
    SubtitleDownloadSectionPropsSchema.parse({
      isDownloading,
      downloadResult,
      onDownload,
    })
  }

  const handlePress = (e: any) => {
    e?.stopPropagation?.()
    onDownload()
  }

  const stopPropagation = (e: any) => e.stopPropagation()

  return (
    <>
      <View style={styles.divider} />

      {downloadResult && (
        <View
          style={[
            styles.resultContainer,
            downloadResult.type === 'success' && styles.resultSuccess,
            downloadResult.type === 'error' && styles.resultError,
            downloadResult.type === 'partial' && styles.resultWarning,
          ]}
        >
          {downloadResult.type === 'success' ? (
            <Check size={16} color="#22c55e" />
          ) : downloadResult.type === 'error' ? (
            <AlertCircle size={16} color="#ef4444" />
          ) : (
            <AlertCircle size={16} color="#eab308" />
          )}
          <View style={styles.resultContent}>
            <Text style={styles.resultMessage}>{downloadResult.message}</Text>
            {downloadResult.imported && downloadResult.imported.length > 0 && (
              <Text style={styles.resultImported}>{downloadResult.imported.join(', ')}</Text>
            )}
          </View>
        </View>
      )}

      <Pressable
        onPress={handlePress}
        onClick={stopPropagation}
        onMouseDown={stopPropagation}
        disabled={isDownloading}
        style={[styles.downloadButton, isDownloading && styles.downloadButtonDisabled]}
      >
        {isDownloading ? (
          <ActivityIndicator size="small" color="#8b5cf6" style={styles.icon} />
        ) : (
          <Download size={20} color="#8b5cf6" style={styles.icon} />
        )}
        <View style={styles.downloadContent}>
          <Text style={styles.downloadTitle}>
            {isDownloading
              ? t('subtitles.downloading', 'Searching OpenSubtitles...')
              : t('subtitles.downloadMore', 'Download more subtitles...')}
          </Text>
          <Text style={styles.downloadSubtitle}>
            {t('subtitles.opensubtitlesSource', 'From OpenSubtitles.com')}
          </Text>
        </View>
      </Pressable>
    </>
  )
}

const styles = StyleSheet.create({
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: spacing[2],
  },
  resultContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing[3],
    marginHorizontal: spacing[2],
    marginBottom: spacing[2],
    borderRadius: borderRadius.lg,
    gap: spacing[2],
    borderWidth: 1,
  },
  resultSuccess: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  resultError: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  resultWarning: {
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    borderColor: 'rgba(234, 179, 8, 0.3)',
  },
  resultContent: {
    flex: 1,
  },
  resultMessage: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '500',
  },
  resultImported: {
    color: '#a1a1aa',
    fontSize: 11,
    marginTop: 2,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: spacing[3],
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing[2],
    marginBottom: spacing[2],
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  downloadButtonDisabled: {
    opacity: 0.5,
  },
  icon: {
    marginRight: spacing[3],
  },
  downloadContent: {
    flex: 1,
  },
  downloadTitle: {
    color: '#a855f7',
    fontSize: 14,
    fontWeight: '500',
  },
  downloadSubtitle: {
    color: '#a1a1aa',
    fontSize: 12,
    marginTop: 2,
  },
});
