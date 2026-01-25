/**
 * SettingsPanel Component
 * Settings panel for quality and playback speed
 */

import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { X, Check } from 'lucide-react'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
import { GlassView } from '@bayit/shared/ui'
import type { QualityOption } from './types'

interface SettingsPanelProps {
  isOpen: boolean
  isLive?: boolean
  videoRef: React.RefObject<HTMLVideoElement>
  availableSubtitleLanguages?: string[]
  liveSubtitleLang?: string
  availableQualities?: QualityOption[]
  currentQuality?: string
  currentPlaybackSpeed?: number
  onClose: () => void
  onLiveSubtitleLangChange?: (lang: string) => void
  onQualityChange?: (quality: string) => void
  onPlaybackSpeedChange?: (speed: number) => void
}

export default function SettingsPanel({
  isOpen,
  isLive = false,
  videoRef,
  availableSubtitleLanguages = [],
  liveSubtitleLang = 'en',
  availableQualities = [],
  currentQuality,
  currentPlaybackSpeed = 1,
  onClose,
  onLiveSubtitleLangChange,
  onQualityChange,
  onPlaybackSpeedChange,
}: SettingsPanelProps) {
  const { t } = useTranslation()

  if (!isOpen) return null

  const langMap: Record<string, { flag: string; label: string }> = {
    'he': { flag: '🇮🇱', label: 'עברית' },
    'en': { flag: '🇺🇸', label: 'English' },
    'ar': { flag: '🇸🇦', label: 'العربية' },
    'es': { flag: '🇪🇸', label: 'Español' },
    'ru': { flag: '🇷🇺', label: 'Русский' },
    'fr': { flag: '🇫🇷', label: 'Français' },
    'de': { flag: '🇩🇪', label: 'Deutsch' },
    'it': { flag: '🇮🇹', label: 'Italiano' },
    'pt': { flag: '🇵🇹', label: 'Português' },
    'yi': { flag: '🕍', label: 'ייִדיש' },
  }

  return (
    <GlassView
      style={styles.panel}
      onClick={(e: any) => e.stopPropagation()}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{t('player.settings')}</Text>
        <Pressable onPress={onClose}>
          <X size={20} color={colors.textMuted} />
        </Pressable>
      </View>

      <View style={styles.content}>
        {/* Live Translation Language Selection (Premium) */}
        {isLive && availableSubtitleLanguages.length > 0 && onLiveSubtitleLangChange && (
          <View style={styles.section}>
            <Text style={styles.label}>{t('subtitles.translateTo', 'Translate To')}</Text>
            <View style={styles.optionsList}>
              {availableSubtitleLanguages.map((langCode) => {
                const lang = langMap[langCode] || { flag: '🌐', label: langCode.toUpperCase() }
                const isActive = liveSubtitleLang === langCode
                return (
                  <Pressable
                    key={langCode}
                    style={[
                      styles.optionFull,
                      isActive && styles.optionActive,
                    ]}
                    onPress={() => {
                      onLiveSubtitleLangChange(langCode)
                      onClose() // Close panel after selecting language
                    }}
                  >
                    <View style={styles.optionContent}>
                      <Text style={styles.optionIcon}>{lang.flag}</Text>
                      <Text
                        style={[
                          styles.optionText,
                          isActive && styles.optionTextActive,
                        ]}
                      >
                        {lang.label}
                      </Text>
                    </View>
                    {isActive && <View style={styles.activeIndicator} />}
                  </Pressable>
                )
              })}
            </View>
          </View>
        )}

        {/* Playback Speed */}
        {!isLive && (
          <View style={styles.section}>
            <Text style={styles.label}>{t('player.playbackSpeed')}</Text>
            <View style={styles.options}>
              {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => {
                const isActive = currentPlaybackSpeed === speed
                return (
                  <Pressable
                    key={speed}
                    style={[
                      styles.option,
                      isActive && styles.optionActive,
                    ]}
                    onPress={() => {
                      if (onPlaybackSpeedChange) {
                        onPlaybackSpeedChange(speed)
                      } else if (videoRef.current) {
                        videoRef.current.playbackRate = speed
                      }
                    }}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        isActive && styles.optionTextActive,
                      ]}
                    >
                      {speed}x
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </View>
        )}

        {/* Quality */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('player.quality')}</Text>
          <View style={styles.optionsList}>
            {availableQualities.length > 0 ? (
              availableQualities.map((quality) => {
                const isActive = currentQuality === quality.quality
                const displayLabel = quality.quality === '4k'
                  ? '4K Ultra HD'
                  : quality.quality === '1080p'
                  ? '1080p Full HD'
                  : quality.quality === '720p'
                  ? '720p HD'
                  : quality.quality === '480p'
                  ? '480p SD'
                  : quality.quality?.toUpperCase() || t('player.auto')

                return (
                  <Pressable
                    key={quality.content_id}
                    style={[
                      styles.optionFull,
                      isActive && styles.optionActive,
                    ]}
                    onPress={() => onQualityChange?.(quality.quality)}
                  >
                    <View style={styles.optionContent}>
                      <Text
                        style={[
                          styles.optionText,
                          isActive && styles.optionTextActive,
                        ]}
                      >
                        {displayLabel}
                      </Text>
                      {quality.resolution_height > 0 && (
                        <Text style={styles.resolutionText}>
                          {quality.resolution_height}p
                        </Text>
                      )}
                    </View>
                    {isActive && (
                      <Check size={16} color={colors.primary} />
                    )}
                  </Pressable>
                )
              })
            ) : (
              <Pressable style={[styles.option, styles.optionActive]}>
                <Text style={[styles.optionText, styles.optionTextActive]}>
                  {t('player.auto')}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </GlassView>
  )
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    bottom: 80,
    right: spacing.md,
    width: 320,
    maxHeight: 500,
    borderRadius: borderRadius.lg,
    zIndex: 200,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  content: {
    padding: spacing.md,
    maxHeight: 440,
    overflowY: 'auto' as any,
  },
  section: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  optionsList: {
    gap: spacing.xs,
  },
  option: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  optionFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  optionActive: {
    borderColor: colors.glassBorderFocus,
    backgroundColor: colors.glassPurpleLight,
  },
  optionText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  optionTextActive: {
    color: colors.primary.DEFAULT,
    fontWeight: '600',
  },
  optionIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  activeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary.DEFAULT,
    marginLeft: spacing.sm,
  },
  resolutionText: {
    fontSize: 12,
    color: colors.textMuted,
    marginLeft: spacing.sm,
  },
})
