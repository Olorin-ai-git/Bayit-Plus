import React, { useState, useEffect } from 'react'
import { ChevronRight, AlertCircle, CheckCircle, Loader } from 'lucide-react'
import type { FreeContentSources } from '../../types/content'

interface FreeContentImportWizardProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

type Step = 'type' | 'source' | 'items' | 'confirm' | 'importing'

interface ImportState {
  sourceType?: string
  sourceName?: string
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
  }, [step, importState.sourceType, isOpen])

  const loadSources = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const { importService } = await import('../../services/adminApi')
      const data = await importService.getFreeSources(importState.sourceType!)
      setSources(data)
    } catch (err) {
      const msg = 'Failed to load available sources'
      setError(msg)
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-gray-900 border border-white/20 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Import Free Content</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-300 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Step 1: Select Type */}
          {step === 'type' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">What would you like to import?</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {sourceTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => handleSelectType(type.id)}
                    className="p-4 rounded-lg border-2 border-white/20 hover:border-blue-500 hover:bg-blue-600/10 transition-all text-left group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-3xl">{type.icon}</span>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-400 transition-colors" />
                    </div>
                    <h4 className="font-semibold text-white">{type.label}</h4>
                    <p className="text-xs text-gray-400 mt-1">{type.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Select Source */}
          {step === 'source' && currentSourceType && (
            <div className="space-y-4">
              <button
                onClick={() => setStep('type')}
                className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                ← Back
              </button>
              <h3 className="text-lg font-semibold text-white">
                Select a source for {currentSourceType.label.toLowerCase()}
              </h3>

              {isLoading ? (
                <div className="flex items-center justify-center py-8 gap-2">
                  <Loader className="w-5 h-5 text-blue-400 animate-spin" />
                  <span className="text-gray-400">Loading sources...</span>
                </div>
              ) : error ? (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <span className="text-red-300">{error}</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {Object.entries(sources).map(([key, source]: [string, any]) => (
                    <button
                      key={key}
                      onClick={() => handleSelectSource(key)}
                      className="p-4 rounded-lg border border-white/20 hover:border-blue-500 hover:bg-blue-600/10 transition-all text-left flex items-center justify-between group"
                    >
                      <div>
                        <h4 className="font-semibold text-white">{source.name}</h4>
                        <p className="text-xs text-gray-400 mt-1">{source.description}</p>
                        <p className="text-xs text-gray-500 mt-1">{source.items.length} items available</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-400 transition-colors" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Select Items */}
          {step === 'items' && currentSource && (
            <div className="space-y-4">
              <button
                onClick={() => setStep('source')}
                className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                ← Back
              </button>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Select items to import</h3>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="selectAll"
                    checked={importState.importAll}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-4 h-4 rounded border-white/20 bg-white/5"
                  />
                  <label htmlFor="selectAll" className="text-sm text-gray-300">
                    Select all ({currentItems.length})
                  </label>
                </div>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {currentItems.map((item: any) => (
                  <label key={item.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={
                        importState.importAll || importState.selectedItems.includes(item.id)
                      }
                      onChange={(e) => handleSelectItem(item.id, e.target.checked)}
                      disabled={importState.importAll}
                      className="w-4 h-4 rounded border-white/20 bg-white/5"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {item.title || item.name}
                      </p>
                      {item.description && (
                        <p className="text-xs text-gray-400 truncate">{item.description}</p>
                      )}
                      {(item.year || item.author || item.genre) && (
                        <p className="text-xs text-gray-500">
                          {[item.year, item.author, item.genre].filter(Boolean).join(' • ')}
                        </p>
                      )}
                    </div>
                  </label>
                ))}
              </div>

              <button
                onClick={() => setStep('confirm')}
                disabled={!importState.importAll && importState.selectedItems.length === 0}
                className="w-full mt-4 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-50"
              >
                Continue ({importState.importAll ? currentItems.length : importState.selectedItems.length} selected)
              </button>
            </div>
          )}

          {/* Step 4: Confirm */}
          {step === 'confirm' && (
            <div className="space-y-4">
              <button
                onClick={() => setStep('items')}
                className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                ← Back
              </button>
              <h3 className="text-lg font-semibold text-white">Ready to import?</h3>
              <div className="p-4 rounded-lg bg-blue-600/10 border border-blue-500/20">
                <p className="text-sm text-blue-300 mb-3">
                  You are about to import {importState.importAll ? 'all' : importState.selectedItems.length} item(s)
                  from <strong>{currentSource.name}</strong>.
                </p>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Items will be added to your content library</li>
                  <li>• You can edit them after import</li>
                  <li>• This action cannot be undone</li>
                </ul>
              </div>

              {error && (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <span className="text-red-300">{error}</span>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('items')}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 rounded-lg border border-white/20 hover:bg-white/10 text-gray-300 font-medium transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    'Import Now'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Importing */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              {progress === 100 ? (
                <>
                  <CheckCircle className="w-16 h-16 text-green-400" />
                  <h3 className="text-xl font-semibold text-white">Import Complete!</h3>
                  <p className="text-gray-400 text-center">
                    Your content has been successfully imported to the library.
                  </p>
                </>
              ) : (
                <>
                  <Loader className="w-16 h-16 text-blue-400 animate-spin" />
                  <h3 className="text-xl font-semibold text-white">Importing Content...</h3>
                  <div className="w-48 h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-400">{progress}% complete</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
