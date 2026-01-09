import React, { useState, useEffect } from 'react'
import { ChevronDown, Plus, Search, AlertCircle } from 'lucide-react'
import type { Category } from '../../types/content'

interface CategoryPickerProps {
  value?: string
  onChange: (categoryId: string) => void
  label?: string
  placeholder?: string
  required?: boolean
  onError?: (error: string | null) => void
  allowCreate?: boolean
}

export function CategoryPicker({
  value,
  onChange,
  label,
  placeholder = 'Select category...',
  required = false,
  onError,
  allowCreate = true,
}: CategoryPickerProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const { contentService } = await import('../../services/adminApi')
      const response = await contentService.getCategories({ page_size: 100 })
      setCategories(response.items || [])
    } catch (err) {
      const msg = 'Failed to load categories'
      setError(msg)
      onError?.(msg)
    } finally {
      setIsLoading(false)
    }
  }

  const selectedCategory = categories.find((c) => c.id === value)

  const filteredCategories = search
    ? categories.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.name_en?.toLowerCase().includes(search.toLowerCase()))
    : categories

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return

    setIsCreating(true)
    try {
      const { contentService } = await import('../../services/adminApi')
      const newCategory = await contentService.createCategory({
        name: newCategoryName,
        slug: newCategoryName.toLowerCase().replace(/\s+/g, '-'),
        is_active: true,
      })
      setCategories([...categories, newCategory])
      onChange(newCategory.id)
      setNewCategoryName('')
      setShowCreateModal(false)
      setError(null)
    } catch (err) {
      const msg = 'Failed to create category'
      setError(msg)
      onError?.(msg)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="w-full space-y-3">
      {label && <label className="block text-sm font-medium text-white">{label}</label>}

      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full px-4 py-3 rounded-lg border bg-white/5 text-white text-sm text-left flex items-center justify-between transition-all ${
            error ? 'border-red-500/50' : 'border-white/20 hover:border-white/40'
          }`}
        >
          <span className={selectedCategory ? 'text-white' : 'text-gray-500'}>
            {selectedCategory ? selectedCategory.name : placeholder}
          </span>
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-gray-900 border border-white/20 rounded-lg shadow-lg">
            <div className="p-3 border-b border-white/10">
              <div className="relative">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search categories..."
                  className="w-full px-3 py-2 rounded bg-white/5 border border-white/10 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  autoFocus
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              </div>
            </div>

            {isLoading ? (
              <div className="p-4 text-center text-sm text-gray-400">Loading categories...</div>
            ) : error ? (
              <div className="p-4 flex items-center gap-2 text-red-400">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{error}</span>
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-400">
                {search ? 'No categories found' : 'No categories available'}
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto">
                {filteredCategories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => {
                      onChange(category.id)
                      setIsOpen(false)
                      setSearch('')
                    }}
                    className={`w-full px-4 py-3 text-left text-sm border-b border-white/5 hover:bg-white/10 transition-colors flex items-center justify-between ${
                      value === category.id ? 'bg-blue-600/20 text-blue-300' : 'text-gray-300'
                    }`}
                  >
                    <div>
                      <div className="font-medium">{category.name}</div>
                      {category.name_en && <div className="text-xs text-gray-500">{category.name_en}</div>}
                    </div>
                    {value === category.id && <div className="w-2 h-2 rounded-full bg-blue-400" />}
                  </button>
                ))}
              </div>
            )}

            {allowCreate && (
              <button
                onClick={() => {
                  setShowCreateModal(true)
                  setIsOpen(false)
                  setSearch('')
                }}
                className="w-full px-4 py-3 text-left text-sm text-blue-400 hover:bg-blue-600/10 border-t border-white/10 flex items-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create new category
              </button>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <p className="text-xs text-red-300">{error}</p>
        </div>
      )}

      {/* Create Category Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-gray-900 border border-white/20 rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">Create New Category</h3>
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Category name (e.g., Movies, Series)"
              className="w-full px-4 py-2 rounded-lg border border-white/20 bg-white/5 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500 mb-4"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateCategory()
              }}
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setNewCategoryName('')
                }}
                disabled={isCreating}
                className="flex-1 px-4 py-2 rounded-lg border border-white/20 hover:bg-white/10 text-gray-300 text-sm font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCategory}
                disabled={isCreating || !newCategoryName.trim()}
                className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                {isCreating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
