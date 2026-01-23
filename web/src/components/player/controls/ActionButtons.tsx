/**
 * ActionButtons Component
 * Right-side action buttons for player (chapters, subtitles, settings, fullscreen)
 *
 * Features:
 * - Chapters panel toggle
 * - Custom render slots for Watch Party, Subtitles, Live Subtitles, Record
 * - Settings panel toggle
 * - Fullscreen toggle
 * - Active state highlighting
 * - TailwindCSS styling
 */

import { View, Pressable } from 'react-native'
import {
  Maximize,
  Minimize,
  Settings as SettingsIcon,
  List,
} from 'lucide-react'
import { z } from 'zod'
import { colors } from '@bayit/shared/theme'
import { platformClass } from '../../../utils/platformClass'

const ActionButtonsPropsSchema = z.object({
  isFullscreen: z.boolean(),
  showChaptersPanel: z.boolean(),
  showSettings: z.boolean(),
  hasChapters: z.boolean(),
  isLive: z.boolean(),
  onChaptersPanelToggle: z.function().returns(z.void()).optional(),
  onSettingsToggle: z.function().returns(z.void()).optional(),
  onToggleFullscreen: z.function().returns(z.void()),
  renderWatchPartyButton: z.function().returns(z.any()).optional(),
  renderSubtitleControls: z.function().returns(z.any()).optional(),
  renderLiveSubtitleControls: z.function().returns(z.any()).optional(),
  renderRecordButton: z.function().returns(z.any()).optional(),
})

type ActionButtonsProps = z.infer<typeof ActionButtonsPropsSchema>

export default function ActionButtons({
  isFullscreen,
  showChaptersPanel,
  showSettings,
  hasChapters,
  isLive,
  onChaptersPanelToggle,
  onSettingsToggle,
  onToggleFullscreen,
  renderWatchPartyButton,
  renderSubtitleControls,
  renderLiveSubtitleControls,
  renderRecordButton,
}: ActionButtonsProps) {
  return (
    <View className="flex-row items-center gap-2">
      {/* Watch Party Button (custom render) */}
      {renderWatchPartyButton && renderWatchPartyButton()}

      {/* Chapters Toggle */}
      {!isLive && hasChapters && onChaptersPanelToggle && (
        <Pressable
          onPress={(e) => {
            e.stopPropagation?.()
            onChaptersPanelToggle()
          }}
          className={platformClass(
            `w-9 h-9 rounded-lg items-center justify-center hover:bg-white/10 ${
              showChaptersPanel ? 'bg-purple-700/30' : ''
            }`,
            `w-9 h-9 rounded-lg items-center justify-center ${
              showChaptersPanel ? 'bg-purple-700/30' : ''
            }`
          )}
          accessibilityLabel="Toggle chapters"
          accessibilityRole="button"
        >
          <List
            size={18}
            color={showChaptersPanel ? colors.primary : colors.text}
          />
        </Pressable>
      )}

      {/* Subtitle Controls (custom render) */}
      {renderSubtitleControls && renderSubtitleControls()}
      {renderLiveSubtitleControls && renderLiveSubtitleControls()}

      {/* Record Button (custom render) */}
      {renderRecordButton && renderRecordButton()}

      {/* Settings Toggle */}
      {onSettingsToggle && (
        <Pressable
          onPress={(e) => {
            e.stopPropagation?.()
            onSettingsToggle()
          }}
          className={platformClass(
            `w-9 h-9 rounded-lg items-center justify-center hover:bg-white/10 ${
              showSettings ? 'bg-purple-700/30' : ''
            }`,
            `w-9 h-9 rounded-lg items-center justify-center ${
              showSettings ? 'bg-purple-700/30' : ''
            }`
          )}
          accessibilityLabel="Toggle settings"
          accessibilityRole="button"
        >
          <SettingsIcon
            size={18}
            color={showSettings ? colors.primary : colors.text}
          />
        </Pressable>
      )}

      {/* Fullscreen Toggle */}
      <Pressable
        onPress={(e) => {
          e.stopPropagation?.()
          onToggleFullscreen()
        }}
        className={platformClass(
          'w-9 h-9 rounded-lg items-center justify-center hover:bg-white/10',
          'w-9 h-9 rounded-lg items-center justify-center'
        )}
        accessibilityLabel={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        accessibilityRole="button"
      >
        {isFullscreen ? (
          <Minimize size={18} color={colors.text} />
        ) : (
          <Maximize size={18} color={colors.text} />
        )}
      </Pressable>
    </View>
  )
}
