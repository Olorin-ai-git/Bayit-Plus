import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native'
import { ChevronRight, AlertCircle, CheckCircle, X, ChevronLeft } from 'lucide-react'
import { GlassView, GlassButton, GlassCheckbox } from '@bayit/shared/ui'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
import type { FreeContentSources } from '../../types/content'

interface FreeContentImportWizardProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

type Step = 'type' | 'source' | 'category' | 'items' | 'confirm' | 'importing'

interface Category {
  id: string
  name: string
  description?: string
}

interface ImportState {
  sourceType?: string
  sourceName?: string
  categoryId?: string
  selectedItems: string[]
  importAll: boolean
}

export function FreeContentImportWizard({ isOpen, onClose, onSuccess }: FreeContentImportWizardProps) {
  const [step, setStep] = useState<Step>('type')
  const [importState, setImportState] = useState<ImportState>({
    selectedItems: [],
    importAll: true,
  })
  const [sources, setSources] = useState<Record<string, any>>({})
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)

  const sourceTypes = [
    { id: 'vod', label: 'Movies & VOD', description: 'Import classic films from archive.org', icon: '🎬' },
    { id: 'live_tv', label: 'Live TV Channels', description: 'Import test streams from Apple BipBop', icon: '📺' },
    { id: 'radio', label: 'Radio Stations', description: 'Import public radio streams', icon: '📻' },
    { id: 'podcasts', label: 'Podcasts', description: 'Import public podcast feeds', icon: '🎙️' },
  ]

  useEffect(() => {
    if (isOpen && step === 'source' && importState.sourceType) {
      loadSources()
    }
    if (isOpen && step === 'category' && importState.sourceType === 'vod') {
      loadCategories()
    }
  }, [step, importState.sourceType, isOpen])

  const loadSources = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const { importService } = await import('../../services/adminApi')
      const response = await importService.getFreeSources(importState.sourceType!)
      setSources(response.sources || response)
    } catch (err) {
      setError('Failed to load available sources')
    } finally {
      setIsLoading(false)
    }
  }

  const loadCategories = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const { contentService } = await import('../../services/adminApi')
      const response = await contentService.getCategories()
      const items = Array.isArray(response) ? response : response.items || []
      setCategories(items)
    } catch (err) {
      setError('Failed to load categories')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectType = (typeId: string) => {
    setImportState({
      ...importState,
      sourceType: typeId,
      sourceName: undefined,
      selectedItems: [],
      importAll: true,
    })
    setStep('source')
  }

  const handleSelectSource = (sourceName: string) => {
    setImportState({
      ...importState,
      sourceName,
      selectedItems: [],
      importAll: true,
    })
    if (importState.sourceType === 'vod') {
      setStep('category')
    } else {
      setStep('items')
    }
  }

  const handleSelectCategory = (categoryId: string) => {
    setImportState({
      ...importState,
      categoryId,
    })
    setStep('items')
  }

  const handleSelectItem = (itemId: string, selected: boolean) => {
    const newItems = selected
      ? [...importState.selectedItems, itemId]
      : importState.selectedItems.filter((id) => id !== itemId)

    setImportState({
      ...importState,
      selectedItems: newItems,
      importAll: false,
    })
  }

  const handleSelectAll = (selected: boolean) => {
    const source = sources[importState.sourceName!]
    if (!source) return

    setImportState({
      ...importState,
      selectedItems: selected ? source.items.map((item: any) => item.id) : [],
      importAll: selected,
    })
  }

  const handleImport = async () => {
    try {
      setStep('importing')
      setIsLoading(true)
      setError(null)

      const { importService } = await import('../../services/adminApi')
      await importService.importFreeContent({
        source_type: importState.sourceType,
        source_name: importState.sourceName,
        import_all: importState.importAll,
        items: importState.importAll ? undefined : importState.selectedItems,
        category_id: importState.categoryId,
      })

      setProgress(100)
      setTimeout(() => {
        onSuccess?.()
        onClose()
      }, 1500)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Import failed'
      setError(msg)
      setStep('confirm')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  const currentSourceType = sourceTypes.find((t) => t.id === importState.sourceType)
  const currentSource = sources[importState.sourceName!]
  const currentItems = currentSource?.items || []

  return (
    <View style={styles.overlay}>
      <GlassView style={styles.modal}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Import Free Content</Text>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <X size={20} color={colors.textMuted} />
          </Pressable>
        </View>

        {/* Content */}
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Step 1: Select Type */}
          {step === 'type' && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>What would you like to import?</Text>
              <View style={styles.typeGrid}>
                {sourceTypes.map((type) => (
                  <Pressable
                    key={type.id}
                    onPress={() => handleSelectType(type.id)}
                    style={styles.typeCard}
                  >
                    <View style={styles.typeCardHeader}>
                      <Text style={styles.typeIcon}>{type.icon}</Text>
                      <ChevronRight size={20} color={colors.textMuted} />
                    </View>
                    <Text style={styles.typeLabel}>{type.label}</Text>
                    <Text style={styles.typeDescription}>{type.description}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Step 2: Select Source */}
          {step === 'source' && currentSourceType && (
            <View style={styles.stepContent}>
              <Pressable onPress={() => setStep('type')} style={styles.backButton}>
                <ChevronLeft size={16} color={colors.primary} />
                <Text style={styles.backButtonText}>Back</Text>
              </Pressable>
              <Text style={styles.stepTitle}>
                Select a source for {currentSourceType.label.toLowerCase()}
              </Text>

              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color={colors.primary} />
                  <Text style={styles.loadingText}>Loading sources...</Text>
                </View>
              ) : error ? (
                <View style={styles.errorBox}>
                  <AlertCircle size={20} color="#ef4444" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : (
                <View style={styles.sourceList}>
                  {Object.entries(sources).map(([key, source]: [string, any]) => (
                    <Pressable
                      key={key}
                      onPress={() => handleSelectSource(key)}
                      style={styles.sourceCard}
                    >
                      <View style={styles.sourceCardContent}>
                        <Text style={styles.sourceTitle}>{source.name}</Text>
                        <Text style={styles.sourceDescription}>{source.description}</Text>
                        <Text style={styles.sourceCount}>{source.items.length} items available</Text>
                      </View>
                      <ChevronRight size={20} color={colors.textMuted} />
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Step 2.5: Select Category (VOD only) */}
          {step === 'category' && importState.sourceType === 'vod' && (
            <View style={styles.stepContent}>
              <Pressable onPress={() => setStep('source')} style={styles.backButton}>
                <ChevronLeft size={16} color={colors.primary} />
                <Text style={styles.backButtonText}>Back</Text>
              </Pressable>
              <Text style={styles.stepTitle}>Select a category for imported movies</Text>
              <Text style={styles.stepSubtitle}>
                Imported movies will be added to the selected category.
              </Text>

              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color={colors.primary} />
                  <Text style={styles.loadingText}>Loading categories...</Text>
                </View>
              ) : error ? (
                <View style={styles.errorBox}>
                  <AlertCircle size={20} color="#ef4444" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : categories.length === 0 ? (
                <View style={styles.warningBox}>
                  <AlertCircle size={24} color="#eab308" />
                  <Text style={styles.warningText}>
                    No categories found. Please create a category first in the Categories section.
                  </Text>
                </View>
              ) : (
                <ScrollView style={styles.categoryList}>
                  {categories.map((category) => (
                    <Pressable
                      key={category.id}
                      onPress={() => handleSelectCategory(category.id)}
                      style={styles.categoryCard}
                    >
                      <View style={styles.categoryCardContent}>
                        <Text style={styles.categoryTitle}>{category.name}</Text>
                        {category.description && (
                          <Text style={styles.categoryDescription}>{category.description}</Text>
                        )}
                      </View>
                      <ChevronRight size={20} color={colors.textMuted} />
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            </View>
          )}

          {/* Step 3: Select Items */}
          {step === 'items' && currentSource && (
            <View style={styles.stepContent}>
              <Pressable
                onPress={() => setStep(importState.sourceType === 'vod' ? 'category' : 'source')}
                style={styles.backButton}
              >
                <ChevronLeft size={16} color={colors.primary} />
                <Text style={styles.backButtonText}>Back</Text>
              </Pressable>
              <View style={styles.itemsHeader}>
                <Text style={styles.stepTitle}>Select items to import</Text>
                <View style={styles.selectAllRow}>
                  <GlassCheckbox
                    checked={importState.importAll}
                    onCheckedChange={handleSelectAll}
                    label={`Select all (${currentItems.length})`}
                  />
                </View>
              </View>

              <ScrollView style={styles.itemsList}>
                {currentItems.map((item: any) => (
                  <View key={item.id} style={styles.itemRow}>
                    <GlassCheckbox
                      checked={importState.importAll || importState.selectedItems.includes(item.id)}
                      onCheckedChange={(checked) => handleSelectItem(item.id, checked)}
                      disabled={importState.importAll}
                    />
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemTitle}>{item.title || item.name}</Text>
                      {item.description && (
                        <Text style={styles.itemDescription} numberOfLines={1}>
                          {item.description}
                        </Text>
                      )}
                      {(item.year || item.author || item.genre) && (
                        <Text style={styles.itemMeta}>
                          {[item.year, item.author, item.genre].filter(Boolean).join(' • ')}
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </ScrollView>

              <GlassButton
                title={`Continue (${importState.importAll ? currentItems.length : importState.selectedItems.length} selected)`}
                variant="primary"
                onPress={() => setStep('confirm')}
                disabled={!importState.importAll && importState.selectedItems.length === 0}
                style={styles.continueButton}
              />
            </View>
          )}

          {/* Step 4: Confirm */}
          {step === 'confirm' && (
            <View style={styles.stepContent}>
              <Pressable onPress={() => setStep('items')} style={styles.backButton}>
                <ChevronLeft size={16} color={colors.primary} />
                <Text style={styles.backButtonText}>Back</Text>
              </Pressable>
              <Text style={styles.stepTitle}>Ready to import?</Text>

              <View style={styles.confirmBox}>
                <Text style={styles.confirmText}>
                  You are about to import {importState.importAll ? 'all' : importState.selectedItems.length} item(s)
                  from <Text style={styles.confirmBold}>{currentSource?.name}</Text>.
                </Text>
                {importState.sourceType === 'vod' && importState.categoryId && (
                  <Text style={styles.confirmText}>
                    Category: <Text style={styles.confirmBold}>
                      {categories.find(c => c.id === importState.categoryId)?.name || 'Unknown'}
                    </Text>
                  </Text>
                )}
                <View style={styles.confirmNotes}>
                  <Text style={styles.confirmNote}>• Items will be added to your content library</Text>
                  <Text style={styles.confirmNote}>• You can edit them after import</Text>
                  <Text style={styles.confirmNote}>• This action cannot be undone</Text>
                </View>
              </View>

              {error && (
                <View style={styles.errorBox}>
                  <AlertCircle size={20} color="#ef4444" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <View style={styles.confirmActions}>
                <GlassButton
                  title="Cancel"
                  variant="secondary"
                  onPress={() => setStep('items')}
                  disabled={isLoading}
                  style={styles.actionButton}
                />
                <GlassButton
                  title={isLoading ? 'Importing...' : 'Import Now'}
                  variant="primary"
                  onPress={handleImport}
                  disabled={isLoading}
                  style={styles.actionButton}
                />
              </View>
            </View>
          )}

          {/* Step 5: Importing */}
          {step === 'importing' && (
            <View style={styles.importingContainer}>
              {progress === 100 ? (
                <>
                  <CheckCircle size={64} color="#22c55e" />
                  <Text style={styles.importingTitle}>Import Complete!</Text>
                  <Text style={styles.importingSubtitle}>
                    Your content has been successfully imported to the library.
                  </Text>
                </>
              ) : (
                <>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.importingTitle}>Importing Content...</Text>
                  <View style={styles.progressBarContainer}>
                    <View style={[styles.progressBar, { width: `${progress}%` }]} />
                  </View>
                  <Text style={styles.progressText}>{progress}% complete</Text>
                </>
              )}
            </View>
          )}
        </ScrollView>
      </GlassView>
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    position: 'fixed' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50,
  },
  modal: {
    width: '100%',
    maxWidth: 600,
    maxHeight: '80%',
    marginHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  closeButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  stepContent: {
    gap: spacing.md,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  stepSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  backButtonText: {
    fontSize: 14,
    color: colors.primary.DEFAULT,
  },
  typeGrid: {
    gap: spacing.md,
  },
  typeCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  typeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  typeIcon: {
    fontSize: 28,
  },
  typeLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  typeDescription: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xl,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#ef4444',
  },
  warningBox: {
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.2)',
  },
  warningText: {
    fontSize: 14,
    color: '#eab308',
    textAlign: 'center',
  },
  sourceList: {
    gap: spacing.sm,
  },
  sourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  sourceCardContent: {
    flex: 1,
  },
  sourceTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  sourceDescription: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  sourceCount: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  categoryList: {
    maxHeight: 250,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    marginBottom: spacing.sm,
  },
  categoryCardContent: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  categoryDescription: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  itemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  selectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemsList: {
    maxHeight: 250,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  itemDescription: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  itemMeta: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  continueButton: {
    marginTop: spacing.lg,
  },
  confirmBox: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(107, 33, 168, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(107, 33, 168, 0.3)',
  },
  confirmText: {
    fontSize: 14,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  confirmBold: {
    fontWeight: '600',
    color: colors.primary.DEFAULT,
  },
  confirmNotes: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  confirmNote: {
    fontSize: 13,
    color: colors.textMuted,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  actionButton: {
    flex: 1,
  },
  importingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
    gap: spacing.lg,
  },
  importingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  importingSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  progressBarContainer: {
    width: 200,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary.DEFAULT,
  },
  progressText: {
    fontSize: 14,
    color: colors.textMuted,
  },
})
