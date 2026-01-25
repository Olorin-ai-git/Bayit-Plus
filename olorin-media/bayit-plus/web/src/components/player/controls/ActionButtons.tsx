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

import { View, Pressable, StyleSheet } from 'react-native'
import {
  Maximize,
  Minimize,
  Settings as SettingsIcon,
  List,
} from 'lucide-react'
import { z } from 'zod'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'

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
    <View style={styles.container}>
      {renderWatchPartyButton && renderWatchPartyButton()}

      {!isLive && hasChapters && onChaptersPanelToggle && (
        <Pressable
          onPress={(e) => {
            e.stopPropagation?.()
            onChaptersPanelToggle()
          }}
          style={[styles.button, showChaptersPanel && styles.buttonActive]}
          accessibilityLabel="Toggle chapters"
          accessibilityRole="button"
        >
          <List
            size={18}
            color={showChaptersPanel ? colors.primary : colors.text}
          />
        </Pressable>
      )}

      {renderSubtitleControls && renderSubtitleControls()}
      {renderLiveSubtitleControls && renderLiveSubtitleControls()}
      {renderRecordButton && renderRecordButton()}

      {onSettingsToggle && (
        <Pressable
          onPress={(e) => {
            e.stopPropagation?.()
            onSettingsToggle()
          }}
          style={[styles.button, showSettings && styles.buttonActive]}
          accessibilityLabel="Toggle settings"
          accessibilityRole="button"
        >
          <SettingsIcon
            size={18}
            color={showSettings ? colors.primary : colors.text}
          />
        </Pressable>
      )}

      <Pressable
        onPress={(e) => {
          e.stopPropagation?.()
          onToggleFullscreen()
        }}
        style={styles.button}
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

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  button: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonActive: {
    backgroundColor: 'rgba(126, 34, 206, 0.3)',
  },
})
