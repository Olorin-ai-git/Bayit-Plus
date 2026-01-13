import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, Sparkles, X, Loader2, AlertCircle } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

interface EPGSmartSearchProps {
  onSearch: (query: string) => Promise<void>
  isSearching: boolean
  onClose: () => void
}

const EPGSmartSearch: React.FC<EPGSmartSearchProps> = ({
  onSearch,
  isSearching,
  onClose
}) => {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const [query, setQuery] = useState('')

  // Check if user is premium
  const isPremium = user?.subscription?.plan === 'premium' || user?.subscription?.plan === 'family'

  // Example queries for inspiration
  const exampleQueries = [
    t('epg.exampleQuery1'),
    t('epg.exampleQuery2'),
    t('epg.exampleQuery3'),
    t('epg.exampleQuery4')
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim() && !isSearching) {
      onSearch(query)
    }
  }

  const handleExampleClick = (example: string) => {
    setQuery(example)
    onSearch(example)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-black/80 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-gradient-to-r from-primary/20 to-purple-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-lg">
              <Sparkles size={24} className="text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                {t('epg.smartSearch')}
                {isPremium && (
                  <span className="px-2 py-0.5 bg-yellow-500/20 border border-yellow-500/40 rounded-full text-yellow-400 text-xs font-bold">
                    PREMIUM
                  </span>
                )}
              </h2>
              <p className="text-white/60 text-sm">{t('epg.smartSearchSubtitle')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label={t('common.close')}
          >
            <X size={24} className="text-white/80" />
          </button>
        </div>

        {/* Premium Gate */}
        {!isPremium && (
          <div className="m-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-yellow-400 font-semibold mb-1">
                  {t('epg.premiumRequired')}
                </h3>
                <p className="text-yellow-300/80 text-sm mb-3">
                  {t('epg.premiumRequiredMessage')}
                </p>
                <button className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded-lg font-medium transition-colors text-sm">
                  {t('common.upgrade')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Search Form */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                {isSearching ? (
                  <Loader2 size={20} className="text-primary animate-spin" />
                ) : (
                  <Search size={20} className="text-white/40" />
                )}
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('epg.smartSearchPlaceholder')}
                disabled={!isPremium || isSearching}
                className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Search Button */}
            <button
              type="submit"
              disabled={!query.trim() || !isPremium || isSearching}
              className="w-full px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSearching ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  {t('epg.searching')}
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  {t('epg.searchWithAI')}
                </>
              )}
            </button>
          </form>

          {/* Example Queries */}
          {isPremium && !isSearching && (
            <div className="mt-6">
              <p className="text-white/60 text-sm font-medium mb-3">
                {t('epg.tryThese')}:
              </p>
              <div className="space-y-2">
                {exampleQueries.map((example, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleExampleClick(example)}
                    className="w-full px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-left text-white/80 text-sm transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles size={14} className="text-primary flex-shrink-0" />
                      <span className="line-clamp-1">{example}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* AI Disclaimer */}
          <div className="mt-6 p-3 bg-white/5 rounded-lg">
            <p className="text-white/40 text-xs">
              {t('epg.aiDisclaimer')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EPGSmartSearch
