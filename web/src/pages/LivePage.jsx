import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Radio, Clock } from 'lucide-react'
import { liveService } from '@/services/api'

export default function LivePage() {
  const [channels, setChannels] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadChannels()
  }, [])

  const loadChannels = async () => {
    try {
      const data = await liveService.getChannels()
      setChannels(data.channels)
    } catch (error) {
      console.error('Failed to load channels:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="h-8 w-48 skeleton mb-8" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="aspect-video skeleton rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="glass-btn-danger w-12 h-12 rounded-full flex items-center justify-center">
          <Radio size={24} />
        </div>
        <h1 className="text-3xl font-bold">שידור חי</h1>
      </div>

      {/* Channels Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {channels.map((channel) => (
          <Link
            key={channel.id}
            to={`/live/${channel.id}`}
            className="glass-card-hover group overflow-hidden"
          >
            <div className="relative aspect-video">
              <img
                src={channel.thumbnail}
                alt={channel.name}
                className="w-full h-full object-cover rounded-t-xl"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-dark-900/90 to-transparent" />

              {/* Live Badge */}
              <span className="absolute top-3 right-3 live-badge">LIVE</span>

              {/* Channel Info */}
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h3 className="font-semibold mb-1 group-hover:text-primary-400 transition-colors">{channel.name}</h3>
                {channel.currentShow && (
                  <p className="text-sm text-dark-300 truncate">
                    {channel.currentShow}
                  </p>
                )}
                {channel.nextShow && (
                  <div className="flex items-center gap-1 text-xs text-dark-400 mt-2">
                    <Clock size={12} />
                    <span>הבא: {channel.nextShow}</span>
                  </div>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Empty State */}
      {channels.length === 0 && (
        <div className="text-center py-16">
          <div className="glass-card inline-block p-12">
            <Radio size={64} className="mx-auto text-dark-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">אין ערוצים זמינים</h2>
            <p className="text-dark-400">נסה שוב מאוחר יותר</p>
          </div>
        </div>
      )}
    </div>
  )
}
