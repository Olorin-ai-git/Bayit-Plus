/**
 * LiveDubbingControls - Cross-Platform Component
 * Premium feature for real-time audio dubbing of live streams
 * Uses Glass Component Library for consistent UI
 */

import React, { useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { GlassButton, GlassModal, GlassBadge } from '@bayit/shared/ui'
import { isTV } from '../../utils/platform'
import { useDirection } from '../../hooks/useDirection'
import { colors } from '../theme'

export interface LiveDubbingControlsProps {
  isEnabled: boolean
  isConnecting: boolean
  isAvailable: boolean
  isPremium: boolean
  targetLanguage: string
  availableLanguages: string[]
  latencyMs: number
  error: string | null
  onToggle: () => void
  onLanguageChange: (lang: string) => void
  onShowUpgrade?: () => void
}

export const LiveDubbingControls: React.FC<LiveDubbingControlsProps> = ({
  isEnabled,
  isConnecting,
  isAvailable,
  isPremium,
  targetLanguage,
  availableLanguages,
  latencyMs,
  error,
  onToggle,
  onLanguageChange,
  onShowUpgrade,
}) => {
  const { t } = useTranslation()
  const { isRTL } = useDirection()
  const [showLanguageModal, setShowLanguageModal] = useState(false)

  // Don't render if dubbing not available for this channel
  if (!isAvailable) return null

  const handlePress = () => {
    if (!isPremium) {
      onShowUpgrade?.()
      return
    }
    onToggle()
  }

  const handleLanguageSelect = (lang: string) => {
    onLanguageChange(lang)
    setShowLanguageModal(false)
  }

  // Get localized language name with fallback
  const getLanguageName = (lang: string): string => {
    return t(`dubbing.languages.${lang}`, lang.toUpperCase())
  }

  // tvOS requires 80pt minimum touch targets (10-foot UI)
  // GlassButton 'lg' is ~50pt, so we use custom minHeight/minWidth
  const tvTouchTarget = isTV ? 80 : undefined

  return (
    <View
      style={[
        styles.container,
        { flexDirection: isRTL ? 'row-reverse' : 'row' },
      ]}
      testID="dubbing-controls"
      accessibilityRole="toolbar"
      accessibilityLabel={t('dubbing.liveDubbing', 'Live Dubbing Controls')}
    >
      {/* Main Toggle Button */}
      <View style={isTV ? styles.tvButtonWrapper : undefined}>
        <GlassButton
          title={isPremium ? t('dubbing.liveDubbing', 'Live Dubbing') : t('dubbing.premiumRequired', 'Premium')}
          onPress={handlePress}
          variant={isEnabled ? 'primary' : 'ghost'}
          size={isTV ? 'lg' : 'md'}
          icon={<Text style={isTV ? styles.iconTV : styles.icon}>🔊</Text>}
          loading={isConnecting}
          accessibilityLabel={
            isPremium
              ? t('dubbing.liveDubbing', 'Live Dubbing') + (isEnabled ? ' - ' + t('common.enabled', 'Enabled') : '')
              : t('dubbing.premiumRequired', 'Premium subscription required')
          }
          accessibilityHint={
            isPremium
              ? isEnabled
                ? t('dubbing.tapToDisable', 'Tap to disable live dubbing')
                : t('dubbing.tapToEnable', 'Tap to enable live dubbing')
              : t('common.upgrade', 'Tap to upgrade to premium')
          }
          style={tvTouchTarget ? { minHeight: tvTouchTarget, minWidth: tvTouchTarget } : undefined}
          testID="dubbing-toggle"
        />
      </View>

      {/* Connection Status Indicator */}
      {isEnabled && !isConnecting && (
        <View
          style={isTV ? styles.statusIndicatorTV : styles.statusIndicator}
          testID="dubbing-connected-indicator"
          accessibilityLabel={t('dubbing.connected', 'Connected')}
        />
      )}

      {/* Language Button (only when enabled) */}
      {isEnabled && availableLanguages.length > 0 && (
        <View style={isTV ? styles.tvButtonWrapper : undefined}>
          <GlassButton
            title={getLanguageName(targetLanguage)}
            onPress={() => setShowLanguageModal(true)}
            variant="ghost"
            size={isTV ? 'lg' : 'md'}
            icon={<Text style={isTV ? styles.iconTV : styles.icon}>🌐</Text>}
            accessibilityLabel={t('dubbing.targetLanguage', 'Target Language') + ': ' + getLanguageName(targetLanguage)}
            accessibilityHint={t('dubbing.tapToChangeLanguage', 'Tap to change target language')}
            style={tvTouchTarget ? { minHeight: tvTouchTarget, minWidth: tvTouchTarget } : undefined}
            testID="dubbing-language-button"
          />
        </View>
      )}

      {/* Latency Badge (only when connected) */}
      {isEnabled && !isConnecting && latencyMs > 0 && (
        <GlassBadge
          variant="primary"
          testID="dubbing-latency"
          accessibilityLabel={t('dubbing.latency', 'Latency') + `: ${latencyMs} milliseconds`}
        >
          {`~${latencyMs}ms`}
        </GlassBadge>
      )}

      {/* Premium Badge for non-premium users */}
      {!isPremium && (
        <GlassBadge
          variant="warning"
          testID="dubbing-premium-badge"
          accessibilityLabel={t('dubbing.premiumRequired', 'Premium subscription required')}
        >
          {t('dubbing.premium', 'Premium')}
        </GlassBadge>
      )}

      {/* Error Display */}
      {error && (
        <View
          style={[
            isTV ? styles.errorContainerTV : styles.errorContainer,
            isRTL ? styles.errorContainerRTL : styles.errorContainerLTR,
          ]}
          testID="dubbing-error"
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          <Text style={isTV ? styles.errorTextTV : styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Language Selection Modal */}
      <GlassModal
        visible={showLanguageModal}
        type="info"
        title={t('dubbing.targetLanguage', 'Target Language')}
        onClose={() => setShowLanguageModal(false)}
        dismissable
        buttons={[
          {
            text: t('common.close', 'Close'),
            style: 'cancel',
          },
        ]}
      >
        <View style={styles.languageList} testID="dubbing-language-list">
          {availableLanguages.map((lang) => (
            <View key={lang} style={isTV ? styles.tvButtonWrapper : undefined}>
              <GlassButton
                title={`${getLanguageName(lang)}${targetLanguage === lang ? ' ✓' : ''}`}
                onPress={() => handleLanguageSelect(lang)}
                variant={targetLanguage === lang ? 'primary' : 'ghost'}
                size={isTV ? 'lg' : 'md'}
                fullWidth
                accessibilityLabel={getLanguageName(lang)}
                accessibilityHint={
                  targetLanguage === lang
                    ? t('dubbing.currentlySelected', 'Currently selected')
                    : t('dubbing.tapToSelect', 'Tap to select')
                }
                style={tvTouchTarget ? { minHeight: tvTouchTarget } : undefined}
                testID={`language-option-${lang}`}
              />
            </View>
          ))}
        </View>
      </GlassModal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 8,
  },
  tvButtonWrapper: {
    minHeight: 80,
    minWidth: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 18,
  },
  // tvOS 10-foot UI requires minimum 29pt for legibility
  iconTV: {
    fontSize: 32,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  // tvOS status indicator scaled for 10-foot visibility
  statusIndicatorTV: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.success,
  },
  errorContainer: {
    position: 'absolute',
    bottom: '100%',
    marginBottom: 8,
    backgroundColor: colors.error,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    maxWidth: 250,
  },
  // tvOS error container with larger padding for visibility
  errorContainerTV: {
    position: 'absolute',
    bottom: '100%',
    marginBottom: 16,
    backgroundColor: colors.error,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    maxWidth: 400,
  },
  errorContainerLTR: {
    right: 0,
  },
  errorContainerRTL: {
    left: 0,
  },
  errorText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '500',
  },
  // tvOS 10-foot UI requires minimum 29pt for legibility
  errorTextTV: {
    color: colors.text,
    fontSize: 29,
    fontWeight: '600',
  },
  languageList: {
    gap: 8,
  },
})

export default LiveDubbingControls
