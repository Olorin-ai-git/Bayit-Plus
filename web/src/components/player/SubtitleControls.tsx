/**
 * SubtitleControls Component
 * Provides UI controls for subtitle selection and customization
 */

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Subtitles, Settings as SettingsIcon, X } from 'lucide-react'
import {
  SubtitleTrack,
  SubtitleSettings,
  SUBTITLE_LANGUAGES,
  getLanguageInfo,
} from '@/types/subtitle'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'
import { GlassView } from '@bayit/shared/ui'

interface SubtitleControlsProps {
  contentId: string
  availableLanguages: SubtitleTrack[]
  currentLanguage: string | null
  enabled: boolean
  settings: SubtitleSettings
  onLanguageChange: (language: string | null) => void
  onToggle: (enabled: boolean) => void
  onSettingsChange: (settings: SubtitleSettings) => void
}

export default function SubtitleControls({
  contentId,
  availableLanguages,
  currentLanguage,
  enabled,
  settings,
  onLanguageChange,
  onToggle,
  onSettingsChange,
}: SubtitleControlsProps) {
  const { t } = useTranslation()
  const [showLanguageMenu, setShowLanguageMenu] = useState(false)
  const [showSettingsPanel, setShowSettingsPanel] = useState(false)

  // Handle subtitle button click - always opens language selector
  const handleSubtitleButtonClick = () => {
    // Always toggle the language menu, regardless of available languages
    setShowLanguageMenu(!showLanguageMenu)
  }

  // Handle language selection
  const handleLanguageSelect = (language: string) => {
    onLanguageChange(language)
    setShowLanguageMenu(false)
    if (!enabled) {
      onToggle(true)
    }
  }

  // Get current language info
  const currentLangInfo = currentLanguage ? getLanguageInfo(currentLanguage) : null

  // Render menu in a portal at document.body level to avoid z-index issues
  const renderMenu = () => {
    if (!showLanguageMenu) return null

    return (
      <>
        {/* Full-screen backdrop to catch all clicks */}
        <View 
          style={styles.backdrop}
          onClick={(e: any) => {
            e.stopPropagation()
            e.preventDefault()
          }}
          onMouseDown={(e: any) => e.stopPropagation()}
          onMouseUp={(e: any) => e.stopPropagation()}
        />
        <GlassView 
          style={styles.menu}
          onClick={(e: any) => {
            // Stop event propagation to prevent clicks from reaching video controls
            e.stopPropagation()
            e.preventDefault()
          }}
          onMouseDown={(e: any) => {
            e.stopPropagation()
          }}
          onMouseUp={(e: any) => {
            e.stopPropagation()
          }}
        >
          <View style={styles.menuHeader}>
            <Text style={styles.menuTitle}>{t('subtitles.selectLanguage')}</Text>
            <Pressable 
              onPress={(e) => {
                e?.stopPropagation?.()
                setShowLanguageMenu(false)
              }}
              onClick={(e: any) => e.stopPropagation()}
              onMouseDown={(e: any) => e.stopPropagation()}
              style={styles.closeButton}
            >
              <X size={20} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView style={styles.menuContent}>
            {/* Off option */}
            <Pressable
              onPress={(e) => {
                e?.stopPropagation?.()
                onToggle(false)
                setShowLanguageMenu(false)
              }}
              onClick={(e: any) => e.stopPropagation()}
              onMouseDown={(e: any) => e.stopPropagation()}
              style={({ pressed }) => [
                styles.menuItem,
                pressed && styles.menuItemPressed,
                !enabled && styles.menuItemActive,
              ]}
            >
              <Text style={styles.menuItemText}>{t('subtitles.off')}</Text>
            </Pressable>

            {/* Available languages */}
            {availableLanguages.length > 0 ? (
              availableLanguages.map((track) => {
                const langInfo = getLanguageInfo(track.language)
                const isActive = track.language === currentLanguage

                return (
                  <Pressable
                    key={track.id}
                    onPress={(e) => {
                      e?.stopPropagation?.()
                      handleLanguageSelect(track.language)
                    }}
                    onClick={(e: any) => e.stopPropagation()}
                    onMouseDown={(e: any) => e.stopPropagation()}
                    style={({ pressed }) => [
                      styles.menuItem,
                      pressed && styles.menuItemPressed,
                      isActive && styles.menuItemActive,
                    ]}
                  >
                    <Text style={styles.menuItemIcon}>{langInfo?.flag || '🌐'}</Text>
                    <View style={styles.menuItemContent}>
                      <Text style={styles.menuItemText}>{track.language_name}</Text>
                      {track.is_auto_generated && (
                        <Text style={styles.menuItemSubtext}>{t('subtitles.autoGenerated')}</Text>
                      )}
                    </View>
                    {isActive && <View style={styles.activeIndicator} />}
                  </Pressable>
                )
              })
            ) : (
              /* No subtitles available */
              <View
                onClick={(e: any) => {
                  e.stopPropagation()
                  e.preventDefault()
                  return false
                }}
                onMouseDown={(e: any) => {
                  e.stopPropagation()
                  e.preventDefault()
                }}
                onMouseUp={(e: any) => {
                  e.stopPropagation()
                  e.preventDefault()
                }}
                style={[styles.menuItem, styles.menuItemActive, { cursor: 'default' }]}
              >
                <Text style={[styles.menuItemIcon, { cursor: 'default', userSelect: 'none' } as any]}>🚫</Text>
                <Text style={[styles.menuItemText, styles.menuItemDisabled, { cursor: 'default', userSelect: 'none' } as any]}>
                  {t('subtitles.none', 'None')}
                </Text>
              </View>
            )}
          </ScrollView>
        </GlassView>
      </>
    )
  }

  return (
    <>
      {/* Subtitle Button */}
      <Pressable
        onPress={handleSubtitleButtonClick}
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed,
          (enabled || showLanguageMenu) && styles.buttonActive,
        ]}
      >
        <Subtitles size={24} color={enabled ? colors.primary : colors.textSecondary} />
        {currentLangInfo && enabled && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{currentLangInfo.code.toUpperCase()}</Text>
          </View>
        )}
      </Pressable>

      {/* Note: Language selector and settings are now accessed through the main settings button */}

      {/* Language Selection Menu - Rendered via Portal */}
      {typeof document !== 'undefined' && createPortal(renderMenu(), document.body)}
    </>
  )
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    position: 'relative',
  },
  buttonPressed: {
    opacity: 0.7,
  },
  buttonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
    minWidth: 20,
  },
  badgeText: {
    color: colors.textPrimary,
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
  },
  langText: {
    fontSize: 20,
  },
  backdrop: {
    position: 'fixed' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 9998,
    // @ts-ignore - Web-specific CSS
    pointerEvents: 'auto',
    cursor: 'default',
  },
  menu: {
    position: 'fixed' as any,
    bottom: 80,
    right: spacing.lg,
    width: 320,
    maxHeight: 450,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    zIndex: 9999,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  menuTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    padding: spacing.xs,
  },
  menuContent: {
    maxHeight: 340,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  menuItemPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  menuItemActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  menuItemIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '500',
  },
  menuItemSubtext: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  menuItemDisabled: {
    opacity: 0.5,
  },
  activeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  settingsPanel: {
    position: 'absolute',
    bottom: 60,
    right: spacing.md,
    width: 320,
    maxHeight: 500,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  settingsPanelContent: {
    maxHeight: 440,
    padding: spacing.md,
  },
  settingSection: {
    marginBottom: spacing.lg,
  },
  settingLabel: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  settingOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  settingOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  settingOptionPressed: {
    opacity: 0.7,
  },
  settingOptionActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  settingOptionText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  settingOptionTextActive: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  colorPreview: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
})
