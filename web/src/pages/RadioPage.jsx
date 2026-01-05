import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Radio, Volume2, Play } from 'lucide-react'
import { radioService } from '@/services/api'

export default function RadioPage() {
  const [stations, setStations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStations()
  }, [])

  const loadStations = async () => {
    try {
      const data = await radioService.getStations()
      setStations(data.stations)
    } catch (error) {
      console.error('Failed to load stations:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="h-8 w-48 skeleton mb-8" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
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
        <div className="glass-btn-purple w-12 h-12 rounded-full flex items-center justify-center">
          <Radio size={24} />
        </div>
        <h1 className="text-3xl font-bold">תחנות רדיו</h1>
      </div>

      {/* Stations Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {stations.map((station) => (
          <Link
            key={station.id}
            to={`/radio/${station.id}`}
            className="glass-card p-6 hover:shadow-glass-lg hover:-translate-y-1 transition-all duration-300 group"
          >
            <div className="relative aspect-square mb-4">
              <img
                src={station.logo}
                alt={station.name}
                className="w-full h-full object-contain rounded-xl"
              />
              <div className="absolute inset-0 glass opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center rounded-xl">
                <div className="glass-btn-purple w-14 h-14 rounded-full flex items-center justify-center shadow-glow-purple">
                  <Play size={28} fill="white" className="text-white mr-[-2px]" />
                </div>
              </div>
            </div>
            <h3 className="font-semibold text-lg mb-1 group-hover:text-primary-400 transition-colors">{station.name}</h3>
            {station.currentShow && (
              <p className="text-sm text-dark-400 flex items-center gap-2">
                <Volume2 size={14} />
                {station.currentShow}
              </p>
            )}
            {station.genre && (
              <span className="glass-badge glass-badge-sm mt-3 inline-block">
                {station.genre}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* Empty State */}
      {stations.length === 0 && (
        <div className="text-center py-16">
          <div className="glass-card inline-block p-12">
            <Radio size={64} className="mx-auto text-dark-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">אין תחנות רדיו זמינות</h2>
            <p className="text-dark-400">נסה שוב מאוחר יותר</p>
          </div>
        </div>
      )}
    </div>
  )
}
