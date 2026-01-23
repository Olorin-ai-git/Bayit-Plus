/**
 * useImportWizard - Custom hook for wizard state management
 * Extracts state and handler logic from main orchestrator
 */

import { useState, useEffect } from 'react'

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

interface UseImportWizardProps {
  isOpen: boolean
  onSuccess?: () => void
  onClose: () => void
}

export function useImportWizard({ isOpen, onSuccess, onClose }: UseImportWizardProps) {
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

  // Load sources when entering source step
  useEffect(() => {
    if (isOpen && step === 'source' && importState.sourceType) {
      loadSources()
    }
  }, [step, importState.sourceType, isOpen])

  // Load categories when entering category step (VOD only)
  useEffect(() => {
    if (isOpen && step === 'category' && importState.sourceType === 'vod') {
      loadCategories()
    }
  }, [step, importState.sourceType, isOpen])

  const loadSources = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const { importService } = await import('../../../services/adminApi')
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
      const { contentService } = await import('../../../services/adminApi')
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

      const { importService } = await import('../../../services/adminApi')
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

  return {
    step,
    setStep,
    importState,
    sources,
    categories,
    isLoading,
    error,
    progress,
    handlers: {
      handleSelectType,
      handleSelectSource,
      handleSelectCategory,
      handleSelectItem,
      handleSelectAll,
      handleImport,
    },
  }
}
