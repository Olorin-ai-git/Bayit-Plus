import { useState, useEffect } from 'react'
import { TrendingUp, ExternalLink, RefreshCw } from 'lucide-react'
import { trendingService } from '../../services/api'
import logger from '@/utils/logger'

/**
 * TrendingRow Component
 * Displays "What's Trending in Israel" with topics from Israeli news.
 */
export default function TrendingRow({ onTopicClick, className = '' }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchTrending = async () => {
    try {
      setLoading(true)
      const result = await trendingService.getTopics()
      setData(result)
      setError(null)
    } catch (err) {
      logger.error('Failed to fetch trending', 'TrendingRow', err)
      setError('Unable to load trending topics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTrending()
    // Refresh every 30 minutes
    const interval = setInterval(fetchTrending, 30 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className={`glass-card p-4 ${className}`}>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-cyan-400" />
          <h3 className="text-lg font-semibold">מה חם בישראל</h3>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex-shrink-0 w-48 h-24 bg-white/5 rounded-lg animate-pulse"
            />
          ))}
        </div>
      </div>
    )
  }

  if (error || !data?.topics?.length) {
    return null
  }

  const getCategoryEmoji = (category) => {
    const emojis = {
      security: '🔒',
      politics: '🏛️',
      tech: '💻',
      culture: '🎭',
      sports: '⚽',
      economy: '📈',
      entertainment: '🎬',
      weather: '🌤️',
      health: '🏥',
      general: '📰',
    }
    return emojis[category] || '📌'
  }

  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case 'positive':
        return 'border-green-500/30 bg-green-500/5'
      case 'negative':
        return 'border-red-500/30 bg-red-500/5'
      default:
        return 'border-white/10 bg-white/5'
    }
  }

  return (
    <div className={`${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-cyan-400" />
          <h3 className="text-lg font-semibold">מה חם בישראל</h3>
          <span className="text-xs text-white/40">What's Trending in Israel</span>
        </div>
        <button
          onClick={fetchTrending}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4 text-white/60" />
        </button>
      </div>

      {/* Overall Mood */}
      {data.overall_mood && (
        <p className="text-sm text-white/60 mb-4 pr-1">
          🇮🇱 {data.overall_mood}
        </p>
      )}

      {/* Topics Row */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {data.topics.map((topic, index) => (
          <button
            key={index}
            onClick={() => onTopicClick?.(topic)}
            className={`flex-shrink-0 p-4 rounded-xl border transition-all
              hover:scale-[1.02] hover:shadow-lg
              ${getSentimentColor(topic.sentiment)}`}
            style={{ minWidth: '200px', maxWidth: '280px' }}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className="text-2xl">{getCategoryEmoji(topic.category)}</span>
              <span
                className="text-xs px-2 py-0.5 rounded-full bg-white/10"
                title={topic.category_label?.en}
              >
                {topic.category_label?.he}
              </span>
            </div>

            <h4 className="text-sm font-medium text-right mb-1 line-clamp-2">
              {topic.title}
            </h4>

            {topic.summary && (
              <p className="text-xs text-white/50 text-right line-clamp-2">
                {topic.summary}
              </p>
            )}

            {/* Importance indicator */}
            <div className="flex items-center gap-1 mt-2">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full ${
                    i < Math.ceil(topic.importance / 2)
                      ? 'bg-cyan-400'
                      : 'bg-white/20'
                  }`}
                />
              ))}
            </div>
          </button>
        ))}
      </div>

      {/* Top Story Highlight */}
      {data.top_story && (
        <div className="mt-4 p-3 rounded-lg bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-white/10">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-cyan-400">TOP STORY</span>
          </div>
          <p className="text-sm text-white/80">{data.top_story}</p>
        </div>
      )}

      {/* Sources */}
      <div className="flex items-center gap-2 mt-3 text-xs text-white/40">
        <span>מקורות:</span>
        {data.sources?.map((source, i) => (
          <span key={source} className="capitalize">
            {source}
            {i < data.sources.length - 1 ? ',' : ''}
          </span>
        ))}
      </div>
    </div>
  )
}

/**
 * Compact trending topics bar for header/sidebar
 */
export function TrendingBar({ className = '' }) {
  const [topics, setTopics] = useState([])

  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const data = await trendingService.getTopics()
        setTopics(data.topics?.slice(0, 3) || [])
      } catch (err) {
        logger.error('Failed to fetch trending', 'TrendingBar', err)
      }
    }

    fetchTopics()
    const interval = setInterval(fetchTopics, 30 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (!topics.length) return null

  return (
    <div className={`flex items-center gap-3 text-sm ${className}`}>
      <TrendingUp className="w-4 h-4 text-cyan-400" />
      <div className="flex items-center gap-2 overflow-x-auto">
        {topics.map((topic, i) => (
          <span
            key={i}
            className="flex-shrink-0 px-2 py-1 rounded-full bg-white/10 text-xs"
          >
            {topic.title}
          </span>
        ))}
      </div>
    </div>
  )
}
