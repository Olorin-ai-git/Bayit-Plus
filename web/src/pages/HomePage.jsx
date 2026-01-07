import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import ContentCarousel from '@/components/content/ContentCarousel'
import HeroSection from '@/components/content/HeroSection'
import DualClock from '@/components/zman/DualClock'
import TrendingRow from '@/components/trending/TrendingRow'
import MorningRitual from '@/components/ritual/MorningRitual'
import AnimatedLogo from '@/components/ui/AnimatedLogo'
import { contentService, liveService, historyService, ritualService } from '@/services/api'

export default function HomePage() {
  const [featured, setFeatured] = useState(null)
  const [categories, setCategories] = useState([])
  const [liveChannels, setLiveChannels] = useState([])
  const [continueWatching, setContinueWatching] = useState([])
  const [loading, setLoading] = useState(true)
  const [showMorningRitual, setShowMorningRitual] = useState(false)

  useEffect(() => {
    checkMorningRitual()
    loadHomeContent()
  }, [])

  const checkMorningRitual = async () => {
    try {
      const result = await ritualService.shouldShow()
      if (result.show_ritual) {
        setShowMorningRitual(true)
      }
    } catch (err) {
      // Ritual not enabled or error - continue to home
      console.log('Morning ritual check:', err)
    }
  }

  const loadHomeContent = async () => {
    try {
      const [featuredData, categoriesData, liveData, continueData] = await Promise.all([
        contentService.getFeatured(),
        contentService.getCategories(),
        liveService.getChannels(),
        historyService.getContinueWatching().catch(() => ({ items: [] })),
      ])

      setFeatured(featuredData.hero)
      setCategories(categoriesData.categories)
      setLiveChannels(liveData.channels)
      setContinueWatching(continueData.items)
    } catch (error) {
      console.error('Failed to load home content:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <HomePageSkeleton />
  }

  // Show Morning Ritual if active
  if (showMorningRitual) {
    return (
      <MorningRitual
        onComplete={() => setShowMorningRitual(false)}
        onSkip={() => setShowMorningRitual(false)}
      />
    )
  }

  return (
    <div className="pb-16">
      {/* Header with Animated Logo */}
      <div className="container mx-auto px-4 pt-6 pb-4">
        <div className="flex justify-center">
          <AnimatedLogo size="large" />
        </div>
      </div>

      {/* Dual Clock - Israel Time */}
      <div className="container mx-auto px-4 py-4">
        <DualClock />
      </div>

      {/* Hero Section */}
      {featured && <HeroSection content={featured} />}

      {/* Trending in Israel */}
      <section className="container mx-auto px-4 mt-8">
        <TrendingRow />
      </section>

      {/* Continue Watching */}
      {continueWatching.length > 0 && (
        <ContentCarousel
          title="המשך לצפות"
          items={continueWatching}
          className="mt-8"
        />
      )}

      {/* Live TV Preview */}
      {liveChannels.length > 0 && (
        <section className="container mx-auto px-4 mt-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold flex items-center gap-3">
              <span className="live-badge">LIVE</span>
              שידור חי
            </h2>
            <Link
              to="/live"
              className="text-primary-400 hover:text-primary-300 flex items-center gap-1 text-sm transition-colors"
            >
              לכל הערוצים
              <ChevronLeft size={16} />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {liveChannels.slice(0, 6).map((channel) => (
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
                  <div className="absolute inset-0 bg-gradient-to-t from-dark-900/90 to-transparent flex items-end p-3">
                    <div>
                      <span className="live-badge text-xs mb-1">LIVE</span>
                      <h3 className="text-sm font-medium truncate">{channel.name}</h3>
                      {channel.currentShow && (
                        <p className="text-xs text-dark-400 truncate">
                          {channel.currentShow}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Content Categories */}
      {categories.map((category) => (
        <ContentCarousel
          key={category.id}
          title={category.name}
          items={category.items}
          seeAllLink={`/vod?category=${category.id}`}
          className="mt-12"
        />
      ))}
    </div>
  )
}

function HomePageSkeleton() {
  return (
    <div className="pb-16">
      {/* Loading with Animated Logo */}
      <div className="flex flex-col items-center justify-center py-12">
        <AnimatedLogo size="large" />
        <p className="mt-4 text-white/60 animate-pulse">טוען...</p>
      </div>

      {/* Hero Skeleton */}
      <div className="relative h-[60vh] skeleton" />

      {/* Content Skeletons */}
      {[1, 2, 3].map((i) => (
        <section key={i} className="container mx-auto px-4 mt-12">
          <div className="h-8 w-32 skeleton mb-6" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6].map((j) => (
              <div key={j} className="aspect-video skeleton rounded-xl" />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
