/**
 * SceneSearchEmptyState Component
 * Empty state display for loading, error, no results, and hint states
 */

import { View, Text, ActivityIndicator } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Search, AlertCircle } from 'lucide-react'
import { colors } from '@olorin/design-tokens'
import { isTV } from '@bayit/shared/utils/platform'
import { sceneSearchStyles as styles } from './sceneSearchStyles'

interface SceneSearchEmptyStateProps {
  loading: boolean
  error: string | null
  hasQuery: boolean
}

export default function SceneSearchEmptyState({
  loading,
  error,
  hasQuery,
}: SceneSearchEmptyStateProps) {
  const { t } = useTranslation()
  const iconSize = isTV ? 48 : 32

  if (loading) {
    return (
      <View style={styles.emptyState} accessibilityLiveRegion="polite">
        <ActivityIndicator size={isTV ? 'large' : 'small'} color={colors.primary} />
        <Text style={[styles.emptyText, isTV && styles.emptyTextTV]}>
          {t('player.sceneSearch.searching')}
        </Text>
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.emptyState} accessibilityLiveRegion="assertive">
        <AlertCircle size={iconSize} color={colors.error} />
        <Text style={[styles.errorText, isTV && styles.errorTextTV]}>{error}</Text>
      </View>
    )
  }

  if (hasQuery) {
    return (
      <View style={styles.emptyState} accessibilityLiveRegion="polite">
        <Search size={iconSize} color={colors.textMuted} />
        <Text style={[styles.emptyText, isTV && styles.emptyTextTV]}>
          {t('player.sceneSearch.noResults')}
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.emptyState}>
      <Search size={iconSize} color={colors.textMuted} />
      <Text style={[styles.emptyText, isTV && styles.emptyTextTV]}>
        {t('player.sceneSearch.hint')}
      </Text>
    </View>
  )
}
