import { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Plus, Download, Search, X, AlertCircle, Loader } from 'lucide-react'
import { importService, contentService } from '@/services/adminApi'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'
import { useDirection } from '@/hooks/useDirection'
import { GlassSelect, GlassCheckbox, GlassButton } from '@bayit/shared/ui'
import logger from '@/utils/logger'

interface SourceItem {
  id: string
  title?: string
  name: string
  description?: string
  year?: number
  author?: string
  genre?: string
  items_count?: number
}

interface Source {
  name: string
  description: string
  items: SourceItem[]
}

interface Category {
  id: string
  name: string
}

export default function FreeContentImportPage() {
  const { t } = useTranslation()
  const { isRTL, textAlign, flexDirection } = useDirection()
  const [sourceType, setSourceType] = useState<string>('vod')
  const [sources, setSources] = useState<Record<string, Source>>({})
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [importingSource, setImportingSource] = useState<string | null>(null)
  const [importProgress, setImportProgress] = useState(0)

  const sourceTypes = [
    { id: 'vod', labelKey: 'admin.content.import.sourceTypes.vod', icon: '🎬' },
    { id: 'live_tv', labelKey: 'admin.content.import.sourceTypes.live_tv', icon: '📺' },
    { id: 'radio', labelKey: 'admin.content.import.sourceTypes.radio', icon: '📻' },
    { id: 'podcasts', labelKey: 'admin.content.import.sourceTypes.podcasts', icon: '🎙️' },
  ]

  const loadSources = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    setSelectedItems(new Set())
    setSelectedCategory('')
    try {
      const response = await importService.getFreeSources(sourceType)
      // Backend returns { source_type, sources }, extract sources
      setSources(response.sources || response)

      // Load categories for VOD imports
      if (sourceType === 'vod') {
        try {
          const catResponse = await contentService.getCategories()
          const items = Array.isArray(catResponse) ? catResponse : catResponse.items || []
          setCategories(items)
        } catch (catErr) {
          logger.error('Failed to load categories', 'FreeContentImportPage', catErr)
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load sources'
      logger.error(msg, 'FreeContentImportPage', err)
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }, [sourceType])

  useEffect(() => {
    loadSources()
  }, [loadSources])

  const toggleItemSelection = (itemId: string) => {
    const newSet = new Set(selectedItems)
    if (newSet.has(itemId)) {
      newSet.delete(itemId)
    } else {
      newSet.add(itemId)
    }
    setSelectedItems(newSet)
  }

  const toggleSourceSelection = (sourceName: string) => {
    const source = sources[sourceName]
    if (!source) return

    const sourceItemIds = source.items.map((item) => item.id)
    const allSelected = sourceItemIds.every((id) => selectedItems.has(id))

    const newSet = new Set(selectedItems)
    if (allSelected) {
      sourceItemIds.forEach((id) => newSet.delete(id))
    } else {
      sourceItemIds.forEach((id) => newSet.add(id))
    }
    setSelectedItems(newSet)
  }

  const handleImport = async (sourceName: string) => {
    const source = sources[sourceName]
    if (!source) return

    try {
      setImportingSource(sourceName)
      setImportProgress(0)
      const sourceItemIds = source.items.map((item) => item.id)
      const itemsToImport = sourceItemIds.filter((id) => selectedItems.has(id))

      if (itemsToImport.length === 0) {
        setError(t('admin.content.import.selectItems'))
        setImportingSource(null)
        return
      }

      // VOD imports require a category
      if (sourceType === 'vod' && !selectedCategory) {
        setError(t('admin.content.import.selectCategory_vod'))
        setImportingSource(null)
        return
      }

      await importService.importFreeContent({
        source_type: sourceType,
        source_name: sourceName,
        import_all: false,
        items: itemsToImport,
        category_id: sourceType === 'vod' ? selectedCategory : undefined,
      })

      setImportProgress(100)
      setTimeout(() => {
        setSelectedItems(new Set())
        setImportingSource(null)
        setImportProgress(0)
        loadSources()
      }, 1500)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Import failed'
      logger.error(msg, 'FreeContentImportPage', err)
      setError(msg)
      setImportingSource(null)
    }
  }

  const currentType = sourceTypes.find((t) => t.id === sourceType)

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={[styles.header, { flexDirection }]}>
        <View>
          <Text style={[styles.pageTitle, { textAlign }]}>{t('admin.content.import.pageTitle')}</Text>
          <Text style={[styles.subtitle, { textAlign }]}>
            {t('admin.content.import.subtitle')}
          </Text>
        </View>
      </View>

      {error && (
        <View style={[styles.errorContainer, { marginBottom: spacing.lg }]}>
          <AlertCircle size={18} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => setError(null)}>
            <X size={18} color="#ef4444" />
          </Pressable>
        </View>
      )}

      {/* Content Type Selector */}
      <View style={[styles.typesGrid, { marginBottom: spacing.lg }]}>
        {sourceTypes.map((type) => (
          <Pressable
            key={type.id}
            onPress={() => setSourceType(type.id)}
            style={[styles.typeButton, sourceType === type.id && styles.typeButtonActive]}
          >
            <Text style={styles.typeIcon}>{type.icon}</Text>
            <Text style={[styles.typeLabel, sourceType === type.id && styles.typeLabelActive]}>
              {t(type.labelKey)}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Category Selector for VOD */}
      {sourceType === 'vod' && categories.length > 0 && (
        <View style={[styles.categorySelector, { marginBottom: spacing.lg }]}>
          <Text style={[styles.categoryLabel, { textAlign }]}>
            {t('admin.content.import.selectCategory')}
          </Text>
          <GlassSelect
            placeholder={t('admin.content.import.categoryPlaceholder')}
            value={selectedCategory}
            onChange={setSelectedCategory}
            options={categories.map((cat) => ({ value: cat.id, label: cat.name }))}
          />
        </View>
      )}

      {/* Loading State */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <Loader size={32} color={colors.primary} style={styles.spinner} />
          <Text style={styles.loadingText}>{t('admin.content.import.loading')}</Text>
        </View>
      )}

      {/* Sources Grid */}
      {!isLoading && Object.entries(sources).length > 0 && (
        <View style={styles.sourcesContainer}>
          {Object.entries(sources).map(([sourceName, source]) => {
            const sourceItemIds = source.items.map((item) => item.id)
            const selectedCount = sourceItemIds.filter((id) => selectedItems.has(id)).length
            const allSelected = selectedCount === sourceItemIds.length && sourceItemIds.length > 0

            return (
              <View key={sourceName} style={styles.sourceCard}>
                <View style={[styles.sourceHeader, { flexDirection }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sourceName}>{source.name}</Text>
                    <Text style={styles.sourceDescription}>{source.description}</Text>
                    <Text style={styles.itemCount}>
                      {sourceItemIds.length} {sourceItemIds.length === 1 ? t('admin.content.import.items') : t('admin.content.import.itemsPlural')}
                    </Text>
                  </View>
                  <GlassCheckbox
                    checked={allSelected}
                    onChange={() => toggleSourceSelection(sourceName)}
                  />
                </View>

                {/* Items List */}
                {sourceItemIds.length > 0 && (
                  <View style={styles.itemsList}>
                    {source.items.map((item) => (
                      <View key={item.id} style={[styles.itemRow, { flexDirection }]}>
                        <GlassCheckbox
                          checked={selectedItems.has(item.id)}
                          onChange={() => toggleItemSelection(item.id)}
                        />
                        <View style={styles.itemInfo}>
                          <Text style={styles.itemTitle}>{item.title || item.name}</Text>
                          {item.description && (
                            <Text style={styles.itemSubtext} numberOfLines={1}>
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
                  </View>
                )}

                {/* Import Button */}
                <View style={styles.buttonWrapper}>
                  <GlassButton
                    onPress={() => handleImport(sourceName)}
                    disabled={importingSource === sourceName || selectedCount === 0}
                    variant="primary"
                    title={importingSource === sourceName
                      ? t('admin.content.import.importing', { count: selectedCount, percent: Math.round(importProgress) })
                      : t('admin.content.import.importButton', {
                          count: selectedCount,
                          item: selectedCount === 1 ? t('admin.content.import.items') : t('admin.content.import.itemsPlural')
                        })
                    }
                    icon={importingSource === sourceName ? <Loader size={16} color={colors.text} /> : <Download size={16} color={colors.text} />}
                  />
                </View>
              </View>
            )
          })}
        </View>
      )}

      {/* Empty State */}
      {!isLoading && Object.entries(sources).length === 0 && !error && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyTitle}>{t('admin.content.import.noSources')}</Text>
          <Text style={styles.emptyText}>
            {t('admin.content.import.noSourcesDescription', {
              type: t(currentType?.labelKey || 'admin.content.import.sourceTypes.vod').toLowerCase()
            })}
          </Text>
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { padding: spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.lg },
  pageTitle: { fontSize: 24, fontWeight: 'bold', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted, marginTop: spacing.xs },
  errorContainer: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, backgroundColor: '#ef444420', borderColor: '#ef444440', borderWidth: 1, borderRadius: borderRadius.md },
  errorText: { flex: 1, color: '#ef4444', fontSize: 14 },
  typesGrid: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' },
  typeButton: { flex: 1, minWidth: 100, paddingHorizontal: spacing.md, paddingVertical: spacing.lg, borderRadius: borderRadius.md, borderWidth: 2, borderColor: colors.border, alignItems: 'center', gap: spacing.sm },
  typeButtonActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}20` },
  typeIcon: { fontSize: 24 },
  typeLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '500' },
  typeLabelActive: { color: colors.primary },
  categorySelector: { maxWidth: 400 },
  categoryLabel: { fontSize: 14, color: colors.text, marginBottom: spacing.sm, fontWeight: '500' },
  loadingContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl },
  spinner: { marginBottom: spacing.md },
  loadingText: { color: colors.textMuted, fontSize: 14 },
  sourcesContainer: { gap: spacing.lg },
  sourceCard: { backgroundColor: colors.backgroundLighter, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  sourceHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  sourceName: { fontSize: 16, fontWeight: '600', color: colors.text },
  sourceDescription: { fontSize: 13, color: colors.textMuted, marginTop: spacing.xs },
  itemCount: { fontSize: 12, color: colors.textMuted, marginTop: spacing.xs, fontWeight: '500' },
  itemsList: { borderTopWidth: 1, borderTopColor: colors.border, maxHeight: 300 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  itemInfo: { flex: 1, minWidth: 0 },
  itemTitle: { fontSize: 13, fontWeight: '500', color: colors.text },
  itemSubtext: { fontSize: 12, color: colors.textMuted, marginTop: spacing.xs },
  itemMeta: { fontSize: 11, color: colors.textMuted, marginTop: spacing.xs },
  buttonWrapper: { padding: spacing.md },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
})
