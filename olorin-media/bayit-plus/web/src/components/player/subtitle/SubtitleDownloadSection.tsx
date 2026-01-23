/**
 * SubtitleDownloadSection Component
 * Download subtitles button and result messages
 */

import { View, Text, Pressable, ActivityIndicator } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Download, Check, AlertCircle } from 'lucide-react'
import { z } from 'zod'
import { platformClass } from '@/utils/platformClass'

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
      {/* Divider */}
      <View className="h-px bg-white/10 my-2" />

      {/* Download Result Message */}
      {downloadResult && (
        <View
          className={platformClass(
            `flex-row items-start p-3 mx-2 mb-2 rounded-lg gap-2 ${
              downloadResult.type === 'success'
                ? 'bg-green-500/15 border border-green-500/30'
                : downloadResult.type === 'error'
                ? 'bg-red-500/15 border border-red-500/30'
                : 'bg-yellow-500/15 border border-yellow-500/30'
            }`
          )}
        >
          {downloadResult.type === 'success' ? (
            <Check size={16} color="#22c55e" />
          ) : downloadResult.type === 'error' ? (
            <AlertCircle size={16} color="#ef4444" />
          ) : (
            <AlertCircle size={16} color="#eab308" />
          )}
          <View className="flex-1">
            <Text className="text-white text-[13px] font-medium">
              {downloadResult.message}
            </Text>
            {downloadResult.imported && downloadResult.imported.length > 0 && (
              <Text className="text-zinc-400 text-[11px] mt-0.5">
                {downloadResult.imported.join(', ')}
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Download Button */}
      <Pressable
        onPress={handlePress}
        onClick={stopPropagation}
        onMouseDown={stopPropagation}
        disabled={isDownloading}
        className={platformClass(
          `flex-row items-center justify-start p-3 rounded-lg mx-2 mb-2 bg-purple-500/10 border border-white/10 ${
            isDownloading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-purple-500/20'
          }`
        )}
        style={({ pressed }) => ({
          opacity: pressed && !isDownloading ? 0.7 : 1,
        })}
      >
        {isDownloading ? (
          <ActivityIndicator size="small" color="#8b5cf6" style={{ marginRight: 12 }} />
        ) : (
          <Download size={20} color="#8b5cf6" style={{ marginRight: 12 }} />
        )}
        <View className="flex-1">
          <Text className="text-purple-500 text-sm font-medium">
            {isDownloading
              ? t('subtitles.downloading', 'Searching OpenSubtitles...')
              : t('subtitles.downloadMore', 'Download more subtitles...')}
          </Text>
          <Text className="text-zinc-400 text-xs mt-0.5">
            {t('subtitles.opensubtitlesSource', 'From OpenSubtitles.com')}
          </Text>
        </View>
      </Pressable>
    </>
  )
}
