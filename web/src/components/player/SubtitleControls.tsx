/**
 * SubtitleControls Component
 * Provides UI controls for subtitle selection and customization
 */

import { useState, useRef, useCallback, useEffect, RefObject } from 'react'
import { createPortal } from 'react-dom'
import { View, Text, StyleSheet, Pressable, ScrollView, Dimensions } from 'react-native'
import { GlassLoadingSpinner } from '@bayit/shared/ui'
import { useTranslation } from 'react-i18next'
import { Subtitles, Settings as SettingsIcon, X, Download, Check, AlertCircle } from 'lucide-react'
import { Icon } from '@olorin/shared-icons/web'
import {
  SubtitleTrack,
  SubtitleSettings,
  HebrewMode,
  EnglishMode,
  SplitLanguages,
} from '@/types/subtitle'
import { FlagWithSparkle, getLanguageFlag } from '@/components/common/FlagWithSparkle'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
import { GlassView } from '@bayit/shared/ui'
import { subtitlesService } from '@/services/api'
import logger from '@/utils/logger'
import SubtitleLanguageList from './subtitle/SubtitleLanguageList'
import AISubtitlesPicker from './subtitle/AISubtitlesPicker'
import EnglishModePickerModal from './subtitle/EnglishModePickerModal'
import SplitModeToggle from './subtitle/SplitModeToggle'
import SplitModeConfirmButton from './subtitle/SplitModeConfirmButton'

interface SubtitleControlsProps {
  contentId: string
  availableLanguages: SubtitleTrack[]
  currentLanguage: string | null
  enabled: boolean
  settings: SubtitleSettings
  onLanguageChange: (language: string | null) => void
  onToggle: (enabled: boolean) => void
  onSettingsChange: (settings: SubtitleSettings) => void
  onSubtitlesRefresh?: () => void
  isLoading?: boolean
  containerRef?: RefObject<HTMLDivElement>
  hebrewMode?: HebrewMode
  onHebrewModeChange?: (mode: HebrewMode) => void
  englishMode?: EnglishMode
  onEnglishModeChange?: (mode: EnglishMode) => void
  // Split mode props
  splitMode?: boolean
  onSplitModeToggle?: (enabled: boolean) => void
  splitLanguages?: SplitLanguages | null
  onSplitLanguagesChange?: (languages: SplitLanguages | null) => void
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
  onSubtitlesRefresh,
  isLoading = false,
  containerRef,
  hebrewMode = 'regular',
  onHebrewModeChange,
  englishMode = 'regular',
  onEnglishModeChange,
  splitMode = false,
  onSplitModeToggle,
  splitLanguages = null,
  onSplitLanguagesChange,
}: SubtitleControlsProps) {
  const { t } = useTranslation()
  const [isMobile, setIsMobile] = useState(Dimensions.get('window').width < 768)
  const [showLanguageMenu, setShowLanguageMenu] = useState(false)
  const [showSettingsPanel, setShowSettingsPanel] = useState(false)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  const [showHebrewModePicker, setShowHebrewModePicker] = useState(false)
  const [showEnglishModePicker, setShowEnglishModePicker] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  // Split mode temporary selection state
  const [tempSelectedLanguages, setTempSelectedLanguages] = useState<string[]>([])

  // Guard against multiple modal openings
  const hebrewPickerOpeningRef = useRef(false)
  const englishPickerOpeningRef = useRef(false)
  const [downloadResult, setDownloadResult] = useState<{
    type: 'success' | 'error' | 'partial'
    message: string
    imported?: string[]
  } | null>(null)

  // Handle download more subtitles
  const handleDownloadSubtitles = async () => {
    if (isDownloading) {
      logger.debug('Download already in progress, skipping', 'SubtitleControls')
      return
    }

    logger.info('Starting subtitle download', 'SubtitleControls', { contentId })
    setIsDownloading(true)
    setDownloadResult(null)

    try {
      const response = await subtitlesService.fetchExternal(contentId)
      logger.info('Subtitle download response received', 'SubtitleControls', {
        imported: response.imported?.length || 0,
        failed: response.failed?.length || 0
      })

      if (response.imported && response.imported.length > 0) {
        const importedNames = response.imported.map((item: any) => item.language_name)
        setDownloadResult({
          type: response.failed?.length > 0 ? 'partial' : 'success',
          message: t('subtitles.downloadSuccess', { count: response.imported.length }),
          imported: importedNames,
        })

        // Refresh the subtitles list
        if (onSubtitlesRefresh) {
          onSubtitlesRefresh()
        }

        // Auto-select first imported language if none selected
        if (!currentLanguage && response.imported.length > 0) {
          onLanguageChange(response.imported[0].language)
          onToggle(true)
        }
      } else {
        setDownloadResult({
          type: 'error',
          message: t('subtitles.noSubtitlesFound', 'No subtitles found for this content'),
        })
      }

      // Clear result after 5 seconds
      setTimeout(() => setDownloadResult(null), 5000)
    } catch (error: any) {
      const errorMessage = error?.response?.data?.detail || error?.message || 'Download failed'
      logger.error('Subtitle download failed', 'SubtitleControls', {
        contentId,
        error: errorMessage,
        stack: error?.stack
      })
      setDownloadResult({
        type: 'error',
        message: errorMessage,
      })
      setTimeout(() => setDownloadResult(null), 5000)
    } finally {
      setIsDownloading(false)
      logger.debug('Subtitle download completed', 'SubtitleControls')
    }
  }

  // Handle subtitle button click - always opens language selector
  const handleSubtitleButtonClick = () => {
    // Initialize temp selection when opening menu in split mode
    if (!showLanguageMenu && splitMode) {
      if (splitLanguages) {
        // Restore confirmed split selection
        setTempSelectedLanguages([...splitLanguages])
      } else if (currentLanguage) {
        // Pre-select current single language
        setTempSelectedLanguages([currentLanguage])
      }
    }
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

  // Deduplicate tracks by language, keeping the first occurrence (which has most metadata)
  const deduplicatedLanguages = availableLanguages.filter(
    (track, index, self) => self.findIndex((t) => t.language === track.language) === index
  )

  // Find Hebrew and English tracks for modal props (from deduplicated list)
  const hebrewTrack = deduplicatedLanguages.find((t) => t.language === 'he')
  const englishTrack = deduplicatedLanguages.find((t) => t.language === 'en')

  // Handler to open Hebrew mode picker with guard against multiple opens
  const handleOpenHebrewModePicker = useCallback(() => {
    if (hebrewPickerOpeningRef.current || showHebrewModePicker) return
    hebrewPickerOpeningRef.current = true
    setShowHebrewModePicker(true)
    // Reset guard after a short delay
    setTimeout(() => {
      hebrewPickerOpeningRef.current = false
    }, 100)
  }, [showHebrewModePicker])

  // Handler to open English mode picker with guard against multiple opens
  const handleOpenEnglishModePicker = useCallback(() => {
    if (englishPickerOpeningRef.current || showEnglishModePicker) return
    englishPickerOpeningRef.current = true
    setShowEnglishModePicker(true)
    // Reset guard after a short delay
    setTimeout(() => {
      englishPickerOpeningRef.current = false
    }, 100)
  }, [showEnglishModePicker])

  // Split mode handlers
  const handleSplitModeToggleLocal = useCallback((enableSplit: boolean) => {
    onSplitModeToggle?.(enableSplit)
    if (enableSplit) {
      // Initialize temp selection from existing split languages, or pre-select current single language
      if (splitLanguages) {
        setTempSelectedLanguages([...splitLanguages])
      } else if (currentLanguage) {
        // Pre-select the current single language so user only needs to pick the second one
        setTempSelectedLanguages([currentLanguage])
      } else {
        setTempSelectedLanguages([])
      }
    } else {
      // Clear temp selection when disabling
      setTempSelectedLanguages([])
    }
  }, [onSplitModeToggle, splitLanguages, currentLanguage])

  const handleMultiSelect = useCallback((languages: string[]) => {
    setTempSelectedLanguages(languages)
  }, [])

  const handleSplitConfirm = useCallback(() => {
    if (tempSelectedLanguages.length === 2) {
      onSplitLanguagesChange?.(tempSelectedLanguages as SplitLanguages)
      setShowLanguageMenu(false)
    }
  }, [tempSelectedLanguages, onSplitLanguagesChange])

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
            setShowLanguageMenu(false)
          }}
          onMouseDown={(e: any) => e.stopPropagation()}
          onMouseUp={(e: any) => e.stopPropagation()}
        />
        <GlassView
          intensity="high"
          style={[styles.menu, isMobile && styles.menuMobile]}
          data-controls-panel="true"
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

          {/* Split Mode Toggle - shown when at least 2 languages available */}
          {deduplicatedLanguages.length >= 2 && onSplitModeToggle && (
            <View style={[styles.splitModeSection, isMobile && styles.splitModeSectionMobile]}>
              <SplitModeToggle
                enabled={splitMode}
                onToggle={handleSplitModeToggleLocal}
                disabled={isLoading}
              />
              {/* Split Mode Confirm Button - shown in split mode section */}
              {splitMode && (
                <SplitModeConfirmButton
                  selectedLanguages={tempSelectedLanguages}
                  onConfirm={handleSplitConfirm}
                  disabled={isLoading}
                />
              )}
              {splitMode && (
                <View style={styles.castingWarning}>
                  <AlertCircle size={14} color={colors.warning.DEFAULT} />
                  <Text style={styles.castingWarningText}>
                    {t('subtitles.splitScreen.castingNotSupported', 'Not supported while casting')}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Available Languages Flags Preview - Deduplicated (hidden in split mode and on mobile) */}
          {!splitMode && !isMobile && deduplicatedLanguages.length > 0 && (
            <View style={styles.flagsPreview}>
              {deduplicatedLanguages.map((track) => {
                const isActive = track.language === currentLanguage && enabled
                // Check if track has any AI-enhanced versions
                const hasAI = !!(
                  track.has_nikud_version ||
                  track.has_shoresh_version ||
                  track.has_heblish_version ||
                  track.has_grammar_flip_version ||
                  track.has_slang_synthesis_version
                )
                return (
                  <Pressable
                    key={track.id}
                    onPress={(e) => {
                      e?.stopPropagation?.()
                      handleLanguageSelect(track.language)
                    }}
                    onClick={(e: any) => e.stopPropagation()}
                    style={[
                      styles.flagButton,
                      isActive && styles.flagButtonActive,
                    ]}
                  >
                    <FlagWithSparkle
                      language={track.language}
                      hasAI={hasAI}
                      size="large"
                      showTooltip={true}
                    />
                  </Pressable>
                )
              })}
            </View>
          )}

          <ScrollView style={[styles.menuContent, isMobile && styles.menuContentMobile]}>
            {/* Language list with Hebrew and English mode split button support */}
            <SubtitleLanguageList
              availableLanguages={deduplicatedLanguages}
              currentLanguage={currentLanguage}
              enabled={enabled}
              isLoading={isLoading}
              contentId={contentId}
              onLanguageSelect={handleLanguageSelect}
              onDisable={() => {
                onToggle(false)
                setShowLanguageMenu(false)
              }}
              hebrewMode={hebrewMode}
              onHebrewModeChange={onHebrewModeChange}
              englishMode={englishMode}
              onEnglishModeChange={onEnglishModeChange}
              onSubtitlesRefresh={onSubtitlesRefresh}
              onOpenHebrewModePicker={handleOpenHebrewModePicker}
              onOpenEnglishModePicker={handleOpenEnglishModePicker}
              // Split mode props
              selectionMode={splitMode ? 'multi' : 'single'}
              selectedLanguages={tempSelectedLanguages}
              onMultiSelect={handleMultiSelect}
            />

            {/* Divider */}
            <View style={styles.menuDivider} />

            {/* Download Result Message */}
            {downloadResult && (
              <View style={[
                styles.downloadResultContainer,
                downloadResult.type === 'success' && styles.downloadResultSuccess,
                downloadResult.type === 'error' && styles.downloadResultError,
                downloadResult.type === 'partial' && styles.downloadResultPartial,
              ]}>
                {downloadResult.type === 'success' ? (
                  <Check size={16} color={colors.success} />
                ) : downloadResult.type === 'error' ? (
                  <AlertCircle size={16} color={colors.error} />
                ) : (
                  <AlertCircle size={16} color={colors.warning} />
                )}
                <View style={styles.downloadResultContent}>
                  <Text style={styles.downloadResultText}>{downloadResult.message}</Text>
                  {downloadResult.imported && downloadResult.imported.length > 0 && (
                    <Text style={styles.downloadResultSubtext}>
                      {downloadResult.imported.join(', ')}
                    </Text>
                  )}
                </View>
              </View>
            )}

            {/* Download More Subtitles Button */}
            <Pressable
              onPress={(e) => {
                e?.stopPropagation?.()
                logger.debug('Download button pressed (onPress)', 'SubtitleControls')
                handleDownloadSubtitles()
              }}
              onClick={(e: any) => {
                e.stopPropagation()
                e.preventDefault()
                logger.debug('Download button clicked (onClick)', 'SubtitleControls', { isDownloading })
                if (!isDownloading) {
                  handleDownloadSubtitles()
                }
              }}
              onMouseDown={(e: any) => e.stopPropagation()}
              disabled={isDownloading}
              style={({ pressed }) => [
                styles.menuItem,
                styles.downloadMenuItem,
                pressed && styles.menuItemPressed,
                isDownloading && styles.menuItemDisabled,
              ]}
            >
              {isDownloading ? (
                <GlassLoadingSpinner size="small" />
              ) : (
                <Download size={20} color={colors.primary} style={{ marginRight: spacing.md }} />
              )}
              <View style={styles.menuItemContent}>
                <Text style={[styles.menuItemText, styles.downloadMenuText]}>
                  {isDownloading
                    ? t('subtitles.downloading', 'Searching OpenSubtitles...')
                    : t('subtitles.downloadMore', 'Download more subtitles...')}
                </Text>
                <Text style={styles.menuItemSubtext}>
                  {t('subtitles.opensubtitlesSource', 'From OpenSubtitles.com')}
                </Text>
              </View>
            </Pressable>
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
        <Subtitles size={22} color={enabled ? colors.primary.DEFAULT : colors.textSecondary} />
        {/* Split mode: show both flags stacked */}
        {splitMode && splitLanguages && enabled ? (
          <View style={styles.splitFlagBadge}>
            <Text style={styles.splitFlagText}>{getLanguageFlag(splitLanguages[0])}</Text>
            <Text style={styles.splitFlagText}>{getLanguageFlag(splitLanguages[1])}</Text>
          </View>
        ) : currentLanguage && enabled ? (
          <View style={styles.flagBadge}>
            <Text style={styles.flagText}>{getLanguageFlag(currentLanguage)}</Text>
          </View>
        ) : null}
      </Pressable>

      {/* Language Selection Menu - Rendered via Portal to video container */}
      {containerRef?.current && createPortal(renderMenu(), containerRef.current)}

      {/* Hebrew Mode Picker Modal */}
      {showHebrewModePicker && (
        <AISubtitlesPicker
          visible={showHebrewModePicker}
          currentMode={hebrewMode}
          hasNikud={hebrewTrack?.has_nikud_version || false}
          hasShoresh={hebrewTrack?.has_shoresh_version || false}
          hasEngrew={hebrewTrack?.has_engrew_version || false}
          contentId={contentId}
          portalContainer={containerRef?.current}
          onClose={() => setShowHebrewModePicker(false)}
          onModeSelect={(mode) => {
            onHebrewModeChange?.(mode)
            setShowHebrewModePicker(false)
          }}
          onGenerationComplete={() => {
            onSubtitlesRefresh?.()
          }}
        />
      )}

      {/* English Mode Picker Modal */}
      {showEnglishModePicker && (
        <EnglishModePickerModal
          visible={showEnglishModePicker}
          currentMode={englishMode}
          hasHeblish={englishTrack?.has_heblish_version || false}
          hasGrammarFlip={englishTrack?.has_grammar_flip_version || false}
          hasSlangSynthesis={englishTrack?.has_slang_synthesis_version || false}
          contentId={contentId}
          portalContainer={containerRef?.current}
          onClose={() => setShowEnglishModePicker(false)}
          onModeSelect={(mode) => {
            onEnglishModeChange?.(mode)
            setShowEnglishModePicker(false)
          }}
          onGenerationComplete={() => {
            onSubtitlesRefresh?.()
          }}
        />
      )}
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
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.4)',
    // @ts-ignore - Web-specific CSS
    backdropFilter: 'blur(12px)',
    // @ts-ignore - Web-specific CSS
    boxShadow: '0 4px 12px rgba(139, 92, 246, 0.15)',
  },
  flagBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.5)',
  },
  flagText: {
    fontSize: 11,
    lineHeight: 13,
  },
  splitFlagBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.5)',
    paddingVertical: 2,
    paddingHorizontal: 3,
  },
  splitFlagText: {
    fontSize: 9,
    lineHeight: 10,
  },
  langText: {
    fontSize: 20,
  },
  backdrop: {
    position: 'absolute' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 199,
    // @ts-ignore - Web-specific CSS
    pointerEvents: 'auto',
    cursor: 'default',
  },
  menu: {
    position: 'absolute' as any,
    bottom: 80,
    right: spacing.md,
    width: 320,
    maxHeight: 500,
    borderRadius: borderRadius.lg,
    zIndex: 200,
  },
  menuMobile: {
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%' as any,
    maxHeight: '75%' as any,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
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
  splitModeSection: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  splitModeSectionMobile: {
    padding: spacing.sm,
  },
  castingWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  castingWarningText: {
    fontSize: 12,
    color: colors.warning.DEFAULT,
  },
  flagsPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  flagButton: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  flagButtonActive: {
    borderColor: colors.glassBorderFocus,
    backgroundColor: colors.glassPurpleLight,
  },
  flagLarge: {
    fontSize: 28,
  },
  menuContent: {
    padding: spacing.md,
    maxHeight: 440,
    gap: spacing.xs,
  },
  menuContentMobile: {
    padding: spacing.sm,
    maxHeight: 400,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  menuItemPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  menuItemActive: {
    borderColor: colors.glassBorderFocus,
    backgroundColor: colors.glassPurpleLight,
  },
  menuItemIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  menuItemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  menuItemTextActive: {
    color: colors.primary.DEFAULT,
    fontWeight: '600',
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
    backgroundColor: colors.primary.DEFAULT,
    marginLeft: spacing.sm,
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
    borderColor: colors.primary.DEFAULT,
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
  // Loading state styles
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  // Download subtitle styles
  menuDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: spacing.sm,
  },
  downloadMenuItem: {
    borderBottomWidth: 0,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.sm,
    marginBottom: spacing.sm,
  },
  downloadMenuText: {
    color: colors.primary.DEFAULT,
  },
  downloadResultContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    marginHorizontal: spacing.sm,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  downloadResultSuccess: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  downloadResultError: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  downloadResultPartial: {
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.3)',
  },
  downloadResultContent: {
    flex: 1,
  },
  downloadResultText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '500',
  },
  downloadResultSubtext: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
})
