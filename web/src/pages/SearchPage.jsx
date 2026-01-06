import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import ContentCard from '@/components/content/ContentCard'
import VoiceSearchButton from '@/components/search/VoiceSearchButton'
import { contentService } from '@/services/api'

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    type: searchParams.get('type') || 'all',
  })

  useEffect(() => {
    const q = searchParams.get('q')
    if (q) {
      performSearch(q)
    }
  }, [searchParams])

  const performSearch = async (searchQuery) => {
    if (!searchQuery.trim()) {
      setResults([])
      return
    }

    setLoading(true)
    try {
      const data = await contentService.search(searchQuery, {
        type: filters.type !== 'all' ? filters.type : undefined,
      })
      setResults(data.results)
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (query.trim()) {
      searchParams.set('q', query)
      setSearchParams(searchParams)
    }
  }

  const handleFilterChange = (type) => {
    setFilters({ ...filters, type })
    if (type === 'all') {
      searchParams.delete('type')
    } else {
      searchParams.set('type', type)
    }
    setSearchParams(searchParams)
  }

  const clearSearch = () => {
    setQuery('')
    setResults([])
    searchParams.delete('q')
    setSearchParams(searchParams)
  }

  const handleVoiceTranscribed = (text) => {
    if (text.trim()) {
      setQuery(text)
      searchParams.set('q', text)
      setSearchParams(searchParams)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Search Form */}
      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto mb-8">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חפש סרטים, סדרות, ערוצים, פודקאסטים..."
            className="glass-input w-full px-6 py-4 pe-14 ps-12 rounded-full text-lg h-auto"
            autoFocus
          />
          <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-dark-400" size={24} />
          <div className="absolute left-5 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {query && (
              <button
                type="button"
                onClick={clearSearch}
                className="text-dark-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            )}
            <VoiceSearchButton
              onTranscribed={handleVoiceTranscribed}
              size="sm"
            />
          </div>
        </div>
      </form>

      {/* Filters */}
      <div className="flex justify-center gap-2 mb-8 flex-wrap">
        {[
          { id: 'all', label: 'הכל' },
          { id: 'vod', label: 'סרטים וסדרות' },
          { id: 'live', label: 'ערוצים' },
          { id: 'radio', label: 'רדיו' },
          { id: 'podcast', label: 'פודקאסטים' },
        ].map((filter) => (
          <button
            key={filter.id}
            onClick={() => handleFilterChange(filter.id)}
            className={`glass-tab-pill ${filters.type === filter.id ? 'glass-tab-pill-active' : ''}`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="aspect-video skeleton rounded-xl" />
          ))}
        </div>
      ) : results.length > 0 ? (
        <>
          <p className="text-dark-400 mb-4">
            נמצאו {results.length} תוצאות עבור "{searchParams.get('q')}"
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {results.map((item) => (
              <ContentCard key={item.id} content={item} />
            ))}
          </div>
        </>
      ) : searchParams.get('q') ? (
        <div className="text-center py-16">
          <div className="glass-card inline-block p-12">
            <Search size={64} className="mx-auto text-dark-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">לא נמצאו תוצאות</h2>
            <p className="text-dark-400">
              נסה לחפש משהו אחר או לשנות את הסינון
            </p>
          </div>
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="glass-card inline-block p-12">
            <Search size={64} className="mx-auto text-dark-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">מה אתה מחפש?</h2>
            <p className="text-dark-400">
              חפש סרטים, סדרות, ערוצים, תחנות רדיו ופודקאסטים
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
