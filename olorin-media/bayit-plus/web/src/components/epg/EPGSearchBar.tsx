import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, Sparkles, Filter, X } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import EPGSmartSearch from './EPGSmartSearch'

interface EPGSearchBarProps {
  onSearch: (query: string, useLLM: boolean) => Promise<void>
  onClear?: () => void
  isSearching: boolean
}

const EPGSearchBar: React.FC<EPGSearchBarProps> = ({
  onSearch,
  onClear,
  isSearching
}) => {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const [query, setQuery] = useState('')
  const [showSmartSearch, setShowSmartSearch] = useState(false)

  // Check if user is premium
  const isPremium = user?.subscription?.plan === 'premium' || user?.subscription?.plan === 'family'

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim() && !isSearching) {
      onSearch(query, false) // Traditional search
    }
  }

  const handleClear = () => {
    setQuery('')
    if (onClear) {
      onClear()
    }
  }

  const handleSmartSearch = async (smartQuery: string) => {
    await onSearch(smartQuery, true) // LLM search
    setShowSmartSearch(false)
  }

  return (
    <>
      <div className="flex items-center gap-3">
        {/* Traditional Search Bar */}
        <form onSubmit={handleSubmit} className="flex-1">
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2">
              <Search size={18} className="text-white/40" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('epg.searchPlaceholder')}
              disabled={isSearching}
              className="w-full pl-12 pr-12 py-3 bg-black/20 backdrop-blur-xl border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {query && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-lg transition-colors"
                aria-label={t('common.clear')}
              >
                <X size={16} className="text-white/60" />
              </button>
            )}
          </div>
        </form>

        {/* Smart Search Button */}
        <button
          onClick={() => setShowSmartSearch(true)}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all ${
            isPremium
              ? 'bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90 text-white shadow-lg shadow-primary/20'
              : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'
          }`}
        >
          <Sparkles size={18} />
          <span className="hidden sm:inline">{t('epg.smartSearch')}</span>
          {isPremium && (
            <span className="hidden md:inline px-2 py-0.5 bg-white/20 rounded-full text-xs">
              PREMIUM
            </span>
          )}
        </button>

        {/* Filters Button (placeholder for future) */}
        <button
          className="flex items-center gap-2 px-4 py-3 bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 rounded-xl transition-colors"
          aria-label={t('common.filters')}
        >
          <Filter size={18} />
          <span className="hidden lg:inline">{t('common.filters')}</span>
        </button>
      </div>

      {/* Smart Search Modal */}
      {showSmartSearch && (
        <EPGSmartSearch
          onSearch={handleSmartSearch}
          isSearching={isSearching}
          onClose={() => setShowSmartSearch(false)}
        />
      )}
    </>
  )
}

export default EPGSearchBar
