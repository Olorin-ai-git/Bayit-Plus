import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import ContentCard from './ContentCard'

export default function ContentCarousel({
  title,
  items = [],
  seeAllLink,
  className = ''
}) {
  const scrollRef = useRef(null)

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.offsetWidth * 0.8
      scrollRef.current.scrollBy({
        left: direction === 'right' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      })
    }
  }

  if (!items.length) return null

  return (
    <section className={`container mx-auto px-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">{title}</h2>
        {seeAllLink && (
          <Link
            to={seeAllLink}
            className="text-primary-400 hover:text-primary-300 flex items-center gap-1 text-sm transition-colors"
          >
            הכל
            <ChevronLeft size={16} />
          </Link>
        )}
      </div>

      {/* Carousel Container */}
      <div className="relative group">
        {/* Scroll Buttons */}
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-12 h-24 rounded-l-xl glass opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center hover:shadow-glow"
          aria-label="הבא"
        >
          <ChevronRight size={28} className="text-white" />
        </button>
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-12 h-24 rounded-r-xl glass opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center hover:shadow-glow"
          aria-label="קודם"
        >
          <ChevronLeft size={28} className="text-white" />
        </button>

        {/* Items */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-4 -mb-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {items.map((item) => (
            <ContentCard key={item.id} content={item} />
          ))}
        </div>
      </div>
    </section>
  )
}
