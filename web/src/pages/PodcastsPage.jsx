import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Podcast, Headphones, Clock } from 'lucide-react'
import { podcastService } from '@/services/api'

export default function PodcastsPage() {
  const [shows, setShows] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('all')

  useEffect(() => {
    loadShows()
  }, [selectedCategory])

  const loadShows = async () => {
    try {
      const data = await podcastService.getShows({
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
      })
      setShows(data.shows)
      if (data.categories) {
        setCategories(data.categories)
      }
    } catch (error) {
      console.error('Failed to load podcasts:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="h-8 w-48 skeleton mb-8" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="aspect-square skeleton rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="glass-btn-success w-12 h-12 rounded-full flex items-center justify-center">
          <Podcast size={24} />
        </div>
        <h1 className="text-3xl font-bold">פודקאסטים</h1>
      </div>

      {/* Category Filter */}
      {categories.length > 0 && (
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`glass-tab-pill whitespace-nowrap ${
              selectedCategory === 'all' ? 'glass-tab-pill-active' : ''
            }`}
          >
            הכל
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`glass-tab-pill whitespace-nowrap ${
                selectedCategory === category.id ? 'glass-tab-pill-active' : ''
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      )}

      {/* Shows Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {shows.map((show) => (
          <Link
            key={show.id}
            to={`/podcasts/${show.id}`}
            className="group"
          >
            <div className="relative aspect-square mb-3 rounded-xl overflow-hidden glass-card-hover">
              <img
                src={show.cover}
                alt={show.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <h3 className="font-semibold mb-1 group-hover:text-primary-400 transition-colors">
              {show.title}
            </h3>
            <p className="text-sm text-dark-400 mb-2">{show.author}</p>
            <div className="flex items-center gap-3 text-xs text-dark-500">
              <span className="flex items-center gap-1">
                <Headphones size={12} />
                {show.episodeCount} פרקים
              </span>
              {show.latestEpisode && (
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {show.latestEpisode}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* Empty State */}
      {shows.length === 0 && (
        <div className="text-center py-16">
          <div className="glass-card inline-block p-12">
            <Podcast size={64} className="mx-auto text-dark-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">אין פודקאסטים זמינים</h2>
            <p className="text-dark-400">נסה שוב מאוחר יותר</p>
          </div>
        </div>
      )}
    </div>
  )
}
