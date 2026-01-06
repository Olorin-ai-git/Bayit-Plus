import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowRight, Plus, Share2, ThumbsUp } from 'lucide-react'
import VideoPlayer from '@/components/player/VideoPlayer'
import AudioPlayer from '@/components/player/AudioPlayer'
import ContentCarousel from '@/components/content/ContentCarousel'
import { contentService, liveService, radioService, podcastService, historyService, chaptersService } from '@/services/api'

export default function WatchPage({ type }) {
  const params = useParams()
  const contentId = params.contentId || params.channelId || params.stationId || params.showId
  const [content, setContent] = useState(null)
  const [streamUrl, setStreamUrl] = useState(null)
  const [related, setRelated] = useState([])
  const [loading, setLoading] = useState(true)
  const [chapters, setChapters] = useState([])
  const [chaptersLoading, setChaptersLoading] = useState(false)

  useEffect(() => {
    loadContent()
  }, [contentId, type])

  const loadContent = async () => {
    setLoading(true)
    try {
      let data, stream
      switch (type) {
        case 'live':
          [data, stream] = await Promise.all([
            liveService.getChannel(contentId),
            liveService.getStreamUrl(contentId),
          ])
          break
        case 'radio':
          [data, stream] = await Promise.all([
            radioService.getStation(contentId),
            radioService.getStreamUrl(contentId),
          ])
          break
        case 'podcast':
          data = await podcastService.getShow(contentId)
          if (data.latestEpisode) {
            stream = { url: data.latestEpisode.audioUrl }
          }
          break
        default:
          [data, stream] = await Promise.all([
            contentService.getById(contentId),
            contentService.getStreamUrl(contentId),
          ])
      }
      setContent(data)
      setStreamUrl(stream?.url)

      if (data.related) {
        setRelated(data.related)
      }

      // Load chapters for VOD content
      if (type !== 'live' && type !== 'radio' && type !== 'podcast') {
        loadChapters()
      }
    } catch (error) {
      console.error('Failed to load content:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadChapters = async () => {
    setChaptersLoading(true)
    try {
      const data = await chaptersService.getChapters(contentId)
      setChapters(data.chapters || [])
    } catch (error) {
      console.error('Failed to load chapters:', error)
      setChapters([])
    } finally {
      setChaptersLoading(false)
    }
  }

  const handleProgress = async (position, duration) => {
    try {
      await historyService.updateProgress(contentId, type, position, duration)
    } catch (error) {
      // Silently fail
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="aspect-video skeleton rounded-xl mb-8" />
        <div className="h-8 w-64 skeleton mb-4" />
        <div className="h-4 w-full max-w-2xl skeleton" />
      </div>
    )
  }

  if (!content) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="glass-card inline-block p-12">
          <h1 className="text-2xl font-bold mb-4">התוכן לא נמצא</h1>
          <Link to="/" className="text-primary-400 hover:text-primary-300 transition-colors">
            חזרה לדף הבית
          </Link>
        </div>
      </div>
    )
  }

  const isAudio = type === 'radio' || type === 'podcast'

  return (
    <div className="pb-16">
      {/* Back Button */}
      <div className="container mx-auto px-4 py-4">
        <button
          onClick={() => window.history.back()}
          className="glass-btn-ghost"
        >
          <ArrowRight size={20} />
          חזרה
        </button>
      </div>

      {/* Player */}
      <div className="container mx-auto px-4">
        {isAudio ? (
          <AudioPlayer
            src={streamUrl}
            title={content.title || content.name}
            artist={content.artist || content.author}
            cover={content.cover || content.logo || content.thumbnail}
            isLive={type === 'radio'}
          />
        ) : (
          <VideoPlayer
            src={streamUrl}
            poster={content.backdrop || content.thumbnail}
            title={content.title || content.name}
            contentId={contentId}
            contentType={type}
            onProgress={handleProgress}
            isLive={type === 'live'}
            chapters={chapters}
            chaptersLoading={chaptersLoading}
          />
        )}
      </div>

      {/* Content Info */}
      <div className="container mx-auto px-4 mt-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Main Info */}
          <div className="flex-1">
            {/* Live Badge */}
            {type === 'live' && (
              <span className="live-badge mb-4">LIVE</span>
            )}

            <h1 className="text-3xl font-bold mb-4">
              {content.title || content.name}
            </h1>

            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-3 text-dark-400 mb-4">
              {content.year && <span className="glass-badge">{content.year}</span>}
              {content.duration && <span className="glass-badge">{content.duration}</span>}
              {content.rating && (
                <span className="glass-badge-primary">
                  {content.rating}
                </span>
              )}
              {content.genre && <span className="glass-badge">{content.genre}</span>}
              {content.episodeCount && (
                <span className="glass-badge">{content.episodeCount} פרקים</span>
              )}
            </div>

            {/* Description */}
            <p className="text-dark-300 leading-relaxed mb-6">
              {content.description}
            </p>

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              <button className="glass-btn-secondary">
                <Plus size={18} />
                הוסף לרשימה
              </button>
              <button className="glass-btn-secondary">
                <ThumbsUp size={18} />
                אהבתי
              </button>
              <button className="glass-btn-ghost">
                <Share2 size={18} />
                שתף
              </button>
            </div>

            {/* Cast/Credits */}
            {content.cast && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-3">שחקנים</h3>
                <p className="text-dark-400">{content.cast.join(', ')}</p>
              </div>
            )}

            {/* Episodes (for podcasts/series) */}
            {content.episodes && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-4">פרקים</h3>
                <div className="space-y-2">
                  {content.episodes.map((episode, i) => (
                    <div
                      key={episode.id}
                      className="glass-card-sm p-4 flex items-center gap-4 hover:shadow-glass cursor-pointer transition-all group"
                    >
                      <span className="text-dark-500 w-8">{i + 1}</span>
                      <div className="flex-1">
                        <h4 className="font-medium group-hover:text-primary-400 transition-colors">{episode.title}</h4>
                        <p className="text-sm text-dark-400">{episode.duration}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* EPG / Schedule (for live) */}
          {type === 'live' && content.schedule && (
            <div className="w-full md:w-80">
              <h3 className="text-lg font-semibold mb-4">לוח שידורים</h3>
              <div className="space-y-2">
                {content.schedule.map((show, i) => (
                  <div
                    key={i}
                    className={`glass-card-sm p-3 ${
                      show.isNow ? 'ring-1 ring-primary-500 shadow-glow' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-dark-400">{show.time}</span>
                      {show.isNow && <span className="live-badge text-xs">עכשיו</span>}
                    </div>
                    <h4 className="font-medium">{show.title}</h4>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Related Content */}
      {related.length > 0 && (
        <ContentCarousel
          title="תוכן דומה"
          items={related}
          className="mt-16"
        />
      )}
    </div>
  )
}
