import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, Pressable, ScrollView, Image } from 'react-native'
import { Check, AlertTriangle, ArrowRight, X, CheckCircle2, Info } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { GlassModal, GlassButton } from '@bayit/shared/ui'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
import { useDirection } from '@/hooks/useDirection'

export interface ContentItem {
  id: string
  title: string
  description?: string
  thumbnail?: string
  year?: number
  is_series: boolean
  episode_count?: number
  metadata?: {
    tmdb_id?: string
    imdb_id?: string
    poster_url?: string
    backdrop_url?: string
  }
}

interface MergeWizardProps {
  visible: boolean
  selectedItems: ContentItem[]
  onClose: () => void
  onConfirm: (baseId: string, mergeIds: string[], mergeConfig: MergeConfig) => Promise<void>
}

interface MergeConfig {
  transferSeasons: boolean
  transferEpisodes: boolean
  preserveMetadata: {
    useBaseTitle: boolean
    useBasePoster: boolean
    useBaseDescription: boolean
  }
}

type WizardStep = 'validate' | 'selectBase' | 'configure' | 'confirm'

interface ValidationResult {
  canMerge: boolean
  reason?: string
  suggestions?: string[]
}

const MergeWizard: React.FC<MergeWizardProps> = ({
  visible,
  selectedItems,
  onClose,
  onConfirm
}) => {
  const { t } = useTranslation()
  const { isRTL, flexDirection, textAlign } = useDirection()

  const [currentStep, setCurrentStep] = useState<WizardStep>('validate')
  const [baseItemId, setBaseItemId] = useState<string>('')
  const [validation, setValidation] = useState<ValidationResult>({ canMerge: false })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [mergeConfig, setMergeConfig] = useState<MergeConfig>({
    transferSeasons: true,
    transferEpisodes: true,
    preserveMetadata: {
      useBaseTitle: true,
      useBasePoster: true,
      useBaseDescription: true
    }
  })

  // Validate items on mount
  useEffect(() => {
    if (visible && selectedItems.length > 0) {
      validateItems()
    }
  }, [visible, selectedItems])

  const validateItems = () => {
    // Check if all items are of the same type (all series or all movies)
    const allSeries = selectedItems.every(item => item.is_series)
    const allMovies = selectedItems.every(item => !item.is_series)

    if (!allSeries && !allMovies) {
      setValidation({
        canMerge: false,
        reason: t('admin.merge.errorMixedTypes', 'Cannot merge series and movies together'),
        suggestions: [t('admin.merge.suggestionSeparate', 'Select only series or only movies')]
      })
      return
    }

    // All validation passed
    setValidation({
      canMerge: true
    })
    setCurrentStep('selectBase')
  }

  const checkSimilarNames = (titles: string[]): boolean => {
    // If only 2 items, check if they're similar (remove spaces, special chars, compare)
    if (titles.length === 2) {
      const normalized1 = normalizeTitle(titles[0])
      const normalized2 = normalizeTitle(titles[1])

      // Check if titles are identical after normalization
      if (normalized1 === normalized2) return true

      // Check if one title is contained in the other (for language variants)
      if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) return true

      // Check if they're transliterations (one Hebrew, one English)
      if (isHebrewEnglishPair(titles[0], titles[1])) {
        // More lenient for Hebrew-English pairs
        const similarity = calculateSimilarity(normalized1, normalized2)
        return similarity > 0.3 // 30% similarity for transliterations
      }

      // Check character-level similarity (for transliterations)
      const similarity = calculateSimilarity(normalized1, normalized2)
      return similarity > 0.6 // 60% similarity threshold
    }

    // For more than 2 items, check if all titles are similar to the first one
    const firstTitle = normalizeTitle(titles[0])
    return titles.slice(1).every(title => {
      const normalized = normalizeTitle(title)
      const similarity = calculateSimilarity(firstTitle, normalized)
      return similarity > 0.6
    })
  }

  const isHebrewEnglishPair = (title1: string, title2: string): boolean => {
    // Check if one is Hebrew and one is English (Latin)
    const hasHebrew1 = /[\u0590-\u05FF]/.test(title1)
    const hasHebrew2 = /[\u0590-\u05FF]/.test(title2)
    const hasLatin1 = /[a-zA-Z]/.test(title1)
    const hasLatin2 = /[a-zA-Z]/.test(title2)

    return (hasHebrew1 && hasLatin2) || (hasHebrew2 && hasLatin1)
  }

  const normalizeTitle = (title: string): string => {
    let normalized = title.toLowerCase().trim()

    // Remove Hebrew definite article "ה" from the start
    // This handles "בורגנים" vs "הבורגנים"
    if (/^ה[\u0590-\u05FF]/.test(normalized)) {
      normalized = normalized.substring(1)
    }

    // Remove "the " from English titles
    if (normalized.startsWith('the ')) {
      normalized = normalized.substring(4)
    }

    // Remove all non-letter, non-number characters (unicode-aware)
    normalized = normalized.replace(/[^\p{L}\p{N}]/gu, '')

    return normalized
  }

  const calculateSimilarity = (str1: string, str2: string): number => {
    // Levenshtein distance based similarity
    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1

    if (longer.length === 0) return 1.0

    const editDistance = levenshteinDistance(longer, shorter)
    return (longer.length - editDistance) / longer.length
  }

  const levenshteinDistance = (str1: string, str2: string): number => {
    const matrix: number[][] = []

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }

    return matrix[str2.length][str1.length]
  }

  const handleConfirm = async () => {
    if (!baseItemId) {
      setError(t('admin.merge.errorNoBase', 'Please select a base item'))
      return
    }

    const mergeIds = selectedItems
      .filter(item => item.id !== baseItemId)
      .map(item => item.id)

    if (mergeIds.length === 0) {
      setError(t('admin.merge.errorNoMerge', 'No items to merge'))
      return
    }

    setLoading(true)
    setError(null)
    try {
      await onConfirm(baseItemId, mergeIds, mergeConfig)
      onClose()
    } catch (err: any) {
      setError(err?.message || err?.detail || 'Failed to merge content')
    } finally {
      setLoading(false)
    }
  }

  const renderStepIndicator = () => {
    const steps = ['validate', 'selectBase', 'configure', 'confirm']
    const currentIndex = steps.indexOf(currentStep)

    return (
      <View style={styles.stepIndicator}>
        {steps.map((step, index) => (
          <React.Fragment key={step}>
            <View
              style={[
                styles.stepDot,
                index <= currentIndex && styles.stepDotActive,
                index < currentIndex && styles.stepDotCompleted
              ]}
            >
              {index < currentIndex ? (
                <CheckCircle2 size={16} color={colors.success} />
              ) : (
                <Text style={styles.stepNumber}>{index + 1}</Text>
              )}
            </View>
            {index < steps.length - 1 && (
              <View style={[styles.stepLine, index < currentIndex && styles.stepLineActive]} />
            )}
          </React.Fragment>
        ))}
      </View>
    )
  }

  const renderValidationStep = () => {
    if (!validation.canMerge) {
      return (
        <View style={styles.stepContent}>
          <View style={styles.errorHeader}>
            <AlertTriangle size={32} color={colors.error} />
            <Text style={styles.errorTitle}>
              {t('admin.merge.cannotMerge', 'Cannot Merge These Items')}
            </Text>
          </View>

          <View style={styles.errorCard}>
            <Text style={styles.errorReason}>{validation.reason}</Text>
          </View>

          {validation.suggestions && validation.suggestions.length > 0 && (
            <View style={styles.suggestionsCard}>
              <Text style={styles.suggestionsTitle}>
                {t('admin.merge.suggestions', 'Suggestions:')}
              </Text>
              {validation.suggestions.map((suggestion, index) => (
                <View key={index} style={styles.suggestionRow}>
                  <Info size={16} color={colors.primary} />
                  <Text style={styles.suggestionText}>{suggestion}</Text>
                </View>
              ))}
            </View>
          )}

          <GlassButton
            variant="secondary"
            onPress={onClose}
            title={t('common.close', 'Close')}
            style={styles.fullWidthButton}
          />
        </View>
      )
    }

    return (
      <View style={styles.stepContent}>
        <View style={styles.successHeader}>
          <CheckCircle2 size={32} color={colors.success} />
          <Text style={styles.successTitle}>
            {t('admin.merge.canMerge', 'Items Can Be Merged')}
          </Text>
        </View>

        <Text style={styles.stepDescription}>
          {t('admin.merge.validationPassed',
            'These items have similar names and are compatible for merging.')}
        </Text>

        <View style={styles.itemsList}>
          {selectedItems.map((item) => (
            <View key={item.id} style={styles.itemPreview}>
              {item.thumbnail && (
                <Image
                  source={{ uri: item.thumbnail }}
                  style={styles.itemThumbnail}
                  resizeMode="cover"
                />
              )}
              <View style={styles.itemDetails}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                {item.is_series && item.episode_count !== undefined && (
                  <Text style={styles.itemMeta}>
                    {item.episode_count} {t('admin.content.episodes', 'episodes')}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>

        <GlassButton
          variant="primary"
          onPress={() => setCurrentStep('selectBase')}
          title={t('admin.merge.continue', 'Continue')}
          icon={<ArrowRight size={16} color={colors.text} />}
          iconPosition="right"
          style={styles.fullWidthButton}
        />
      </View>
    )
  }

  const renderSelectBaseStep = () => {
    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>
          {t('admin.merge.selectBase', 'Select Base Item')}
        </Text>
        <Text style={styles.stepDescription}>
          {t('admin.merge.selectBaseDescription',
            'Choose which item to keep as the base. All content from other items will be merged into this one.')}
        </Text>

        <ScrollView style={styles.itemsList} showsVerticalScrollIndicator={false}>
          {selectedItems.map((item) => (
            <Pressable
              key={item.id}
              style={[
                styles.selectableItem,
                baseItemId === item.id && styles.selectableItemActive
              ]}
              onPress={() => setBaseItemId(item.id)}
            >
              {item.thumbnail && (
                <Image
                  source={{ uri: item.thumbnail }}
                  style={styles.itemThumbnail}
                  resizeMode="cover"
                />
              )}
              <View style={styles.itemDetails}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                {item.year && (
                  <Text style={styles.itemMeta}>{item.year}</Text>
                )}
                {item.is_series && item.episode_count !== undefined && (
                  <Text style={styles.itemMeta}>
                    {item.episode_count} episodes
                  </Text>
                )}
                {item.description && (
                  <Text style={styles.itemDescription} numberOfLines={2}>
                    {item.description}
                  </Text>
                )}
              </View>
              {baseItemId === item.id && (
                <View style={styles.checkMark}>
                  <Check size={20} color={colors.primary} />
                </View>
              )}
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.wizardActions}>
          <GlassButton
            variant="secondary"
            onPress={() => setCurrentStep('validate')}
            title={t('common.back', 'Back')}
            style={styles.halfButton}
          />
          <GlassButton
            variant="primary"
            onPress={() => setCurrentStep('configure')}
            disabled={!baseItemId}
            title={t('admin.merge.continue', 'Continue')}
            style={styles.halfButton}
          />
        </View>
      </View>
    )
  }

  const renderConfigureStep = () => {
    const baseItem = selectedItems.find(item => item.id === baseItemId)
    const mergeItems = selectedItems.filter(item => item.id !== baseItemId)

    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>
          {t('admin.merge.configure', 'Configure Merge')}
        </Text>
        <Text style={styles.stepDescription}>
          {t('admin.merge.configureDescription',
            'Choose what to transfer and which metadata to keep.')}
        </Text>

        <ScrollView style={styles.configSection} showsVerticalScrollIndicator={false}>
          {/* Content Transfer Options */}
          {baseItem?.is_series && (
            <View style={styles.configGroup}>
              <Text style={styles.configGroupTitle}>
                {t('admin.merge.contentTransfer', 'Content Transfer')}
              </Text>

              <Pressable
                style={styles.configOption}
                onPress={() => setMergeConfig(prev => ({
                  ...prev,
                  transferSeasons: !prev.transferSeasons
                }))}
              >
                <View style={[styles.checkbox, mergeConfig.transferSeasons && styles.checkboxChecked]}>
                  {mergeConfig.transferSeasons && <Check size={16} color={colors.text} />}
                </View>
                <View style={styles.configOptionText}>
                  <Text style={styles.configOptionTitle}>
                    {t('admin.merge.transferSeasons', 'Transfer Seasons')}
                  </Text>
                  <Text style={styles.configOptionDescription}>
                    {t('admin.merge.transferSeasonsDesc',
                      'Move all seasons from merged items to base item')}
                  </Text>
                </View>
              </Pressable>

              <Pressable
                style={styles.configOption}
                onPress={() => setMergeConfig(prev => ({
                  ...prev,
                  transferEpisodes: !prev.transferEpisodes
                }))}
              >
                <View style={[styles.checkbox, mergeConfig.transferEpisodes && styles.checkboxChecked]}>
                  {mergeConfig.transferEpisodes && <Check size={16} color={colors.text} />}
                </View>
                <View style={styles.configOptionText}>
                  <Text style={styles.configOptionTitle}>
                    {t('admin.merge.transferEpisodes', 'Transfer Episodes')}
                  </Text>
                  <Text style={styles.configOptionDescription}>
                    {t('admin.merge.transferEpisodesDesc',
                      'Move all episodes from merged items to base item')}
                  </Text>
                </View>
              </Pressable>
            </View>
          )}

          {/* Metadata Preferences */}
          <View style={styles.configGroup}>
            <Text style={styles.configGroupTitle}>
              {t('admin.merge.metadataPreferences', 'Metadata Preferences')}
            </Text>

            <View style={styles.metadataPreview}>
              <Text style={styles.metadataLabel}>
                {t('admin.merge.baseItem', 'Base Item')}:
              </Text>
              <Text style={styles.metadataValue}>{baseItem?.title}</Text>
            </View>

            <Pressable
              style={styles.configOption}
              onPress={() => setMergeConfig(prev => ({
                ...prev,
                preserveMetadata: {
                  ...prev.preserveMetadata,
                  useBasePoster: !prev.preserveMetadata.useBasePoster
                }
              }))}
            >
              <View style={[styles.checkbox, mergeConfig.preserveMetadata.useBasePoster && styles.checkboxChecked]}>
                {mergeConfig.preserveMetadata.useBasePoster && <Check size={16} color={colors.text} />}
              </View>
              <View style={styles.configOptionText}>
                <Text style={styles.configOptionTitle}>
                  {t('admin.merge.useBasePoster', 'Use Base Item Poster')}
                </Text>
                <Text style={styles.configOptionDescription}>
                  {t('admin.merge.useBasePosterDesc',
                    'Keep the poster image from the base item')}
                </Text>
              </View>
            </Pressable>

            <Pressable
              style={styles.configOption}
              onPress={() => setMergeConfig(prev => ({
                ...prev,
                preserveMetadata: {
                  ...prev.preserveMetadata,
                  useBaseDescription: !prev.preserveMetadata.useBaseDescription
                }
              }))}
            >
              <View style={[styles.checkbox, mergeConfig.preserveMetadata.useBaseDescription && styles.checkboxChecked]}>
                {mergeConfig.preserveMetadata.useBaseDescription && <Check size={16} color={colors.text} />}
              </View>
              <View style={styles.configOptionText}>
                <Text style={styles.configOptionTitle}>
                  {t('admin.merge.useBaseDescription', 'Use Base Item Description')}
                </Text>
                <Text style={styles.configOptionDescription}>
                  {t('admin.merge.useBaseDescriptionDesc',
                    'Keep the description from the base item')}
                </Text>
              </View>
            </Pressable>
          </View>

          {/* Merge Preview */}
          <View style={styles.previewCard}>
            <Text style={styles.previewTitle}>
              {t('admin.merge.mergePreview', 'Merge Preview')}
            </Text>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>
                {t('admin.merge.baseItem', 'Base Item')}:
              </Text>
              <Text style={styles.previewValue}>{baseItem?.title}</Text>
            </View>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>
                {t('admin.merge.itemsToMerge', 'Items to Merge')}:
              </Text>
              <Text style={styles.previewValue}>{mergeItems.length}</Text>
            </View>
            {baseItem?.is_series && (
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>
                  {t('admin.merge.totalEpisodes', 'Total Episodes After Merge')}:
                </Text>
                <Text style={styles.previewValue}>
                  {mergeItems.reduce((sum, item) => sum + (item.episode_count || 0),
                    baseItem.episode_count || 0)}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

        <View style={styles.wizardActions}>
          <GlassButton
            variant="secondary"
            onPress={() => setCurrentStep('selectBase')}
            title={t('common.back', 'Back')}
            style={styles.halfButton}
          />
          <GlassButton
            variant="primary"
            onPress={() => setCurrentStep('confirm')}
            title={t('admin.merge.continue', 'Continue')}
            style={styles.halfButton}
          />
        </View>
      </View>
    )
  }

  const renderConfirmStep = () => {
    const baseItem = selectedItems.find(item => item.id === baseItemId)
    const mergeItems = selectedItems.filter(item => item.id !== baseItemId)

    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>
          {t('admin.merge.confirmMerge', 'Confirm Merge')}
        </Text>
        <Text style={styles.stepDescription}>
          {t('admin.merge.confirmDescription',
            'Review the merge operation and confirm to proceed.')}
        </Text>

        <ScrollView style={styles.confirmSection} showsVerticalScrollIndicator={false}>
          <View style={styles.confirmCard}>
            <View style={styles.confirmHeader}>
              <CheckCircle2 size={24} color={colors.success} />
              <Text style={styles.confirmHeaderText}>
                {t('admin.merge.baseItemKeep', 'This item will be kept')}
              </Text>
            </View>
            {baseItem && (
              <View style={styles.confirmItemRow}>
                {baseItem.thumbnail && (
                  <Image
                    source={{ uri: baseItem.thumbnail }}
                    style={styles.confirmThumbnail}
                    resizeMode="cover"
                  />
                )}
                <Text style={styles.confirmItemTitle}>{baseItem.title}</Text>
              </View>
            )}
          </View>

          <View style={[styles.confirmCard, styles.warningCard]}>
            <View style={styles.confirmHeader}>
              <AlertTriangle size={24} color={colors.warning} />
              <Text style={styles.confirmHeaderText}>
                {t('admin.merge.itemsMergeInto', 'These items will be merged into base')}
              </Text>
            </View>
            {mergeItems.map((item) => (
              <View key={item.id} style={styles.confirmItemRow}>
                {item.thumbnail && (
                  <Image
                    source={{ uri: item.thumbnail }}
                    style={styles.confirmThumbnail}
                    resizeMode="cover"
                  />
                )}
                <View style={styles.confirmItemInfo}>
                  <Text style={styles.confirmItemTitle}>{item.title}</Text>
                  {item.is_series && item.episode_count !== undefined && (
                    <Text style={styles.confirmItemMeta}>
                      {item.episode_count} episodes
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>

          <View style={styles.infoCard}>
            <Info size={20} color={colors.primary} />
            <Text style={styles.infoText}>
              {t('admin.merge.mergeWarning',
                'After merging, all content will be combined into the base item. The merged items will be marked as merged and hidden from the library.')}
            </Text>
          </View>
        </ScrollView>

        {error && (
          <View style={styles.errorBanner}>
            <AlertTriangle size={20} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.wizardActions}>
          <GlassButton
            variant="secondary"
            onPress={() => setCurrentStep('configure')}
            disabled={loading}
            title={t('common.back', 'Back')}
            style={styles.halfButton}
          />
          <GlassButton
            variant="primary"
            onPress={handleConfirm}
            loading={loading}
            disabled={loading}
            title={t('admin.merge.confirmButton', 'Merge Items')}
            style={styles.halfButton}
          />
        </View>
      </View>
    )
  }

  if (!visible) return null

  return (
    <GlassModal
      visible={visible}
      title={t('admin.merge.wizard', 'Merge Content Wizard')}
      onClose={onClose}
      dismissable={!loading}
      buttons={[]}
      size="large"
    >
      <View style={styles.wizardContainer}>
        {renderStepIndicator()}

        {currentStep === 'validate' && renderValidationStep()}
        {currentStep === 'selectBase' && renderSelectBaseStep()}
        {currentStep === 'configure' && renderConfigureStep()}
        {currentStep === 'confirm' && renderConfirmStep()}
      </View>
    </GlassModal>
  )
}

const styles = StyleSheet.create({
  wizardContainer: {
    minHeight: 500,
    maxHeight: 700,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  stepDot: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    borderColor: colors.primary.DEFAULT,
  },
  stepDotCompleted: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderColor: colors.success.DEFAULT,
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: spacing.sm,
    maxWidth: 60,
  },
  stepLineActive: {
    backgroundColor: colors.primary[600],
  },
  stepContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  stepDescription: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  errorHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.error.DEFAULT,
    marginTop: spacing.md,
  },
  errorCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  errorReason: {
    fontSize: 14,
    color: colors.error.DEFAULT,
    lineHeight: 20,
  },
  suggestionsCard: {
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary.DEFAULT,
    marginBottom: spacing.sm,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  suggestionText: {
    flex: 1,
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
  successHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.success.DEFAULT,
    marginTop: spacing.md,
  },
  itemsList: {
    marginBottom: spacing.lg,
    maxHeight: 400,
  },
  itemPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
  },
  selectableItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
  },
  selectableItemActive: {
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    borderColor: colors.primary.DEFAULT,
  },
  itemThumbnail: {
    width: 60,
    height: 90,
    borderRadius: borderRadius.md,
    marginRight: spacing.md,
  },
  itemDetails: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  itemMeta: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  itemDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  checkMark: {
    marginLeft: spacing.sm,
  },
  configSection: {
    marginBottom: spacing.lg,
    maxHeight: 400,
  },
  configGroup: {
    marginBottom: spacing.xl,
  },
  configGroupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  configOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    marginRight: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary.DEFAULT,
    borderColor: colors.primary.DEFAULT,
  },
  configOptionText: {
    flex: 1,
  },
  configOptionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  configOptionDescription: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
  metadataPreview: {
    padding: spacing.md,
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  metadataLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary.DEFAULT,
    marginBottom: spacing.xs,
  },
  metadataValue: {
    fontSize: 14,
    color: colors.text,
  },
  previewCard: {
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  previewTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary.DEFAULT,
    marginBottom: spacing.md,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  previewLabel: {
    fontSize: 13,
    color: colors.textMuted,
  },
  previewValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  confirmSection: {
    marginBottom: spacing.lg,
    maxHeight: 400,
  },
  confirmCard: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  warningCard: {
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  confirmHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  confirmHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  confirmItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  confirmThumbnail: {
    width: 40,
    height: 60,
    borderRadius: borderRadius.sm,
    marginRight: spacing.md,
  },
  confirmItemInfo: {
    flex: 1,
  },
  confirmItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  confirmItemMeta: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
    borderRadius: borderRadius.lg,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: colors.error.DEFAULT,
    lineHeight: 18,
  },
  wizardActions: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  fullWidthButton: {
    marginTop: spacing.md,
  },
  halfButton: {
    flex: 1,
  },
})

export default MergeWizard
