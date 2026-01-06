import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Play, Clock, User, Loader2 } from 'lucide-react'
import { judaismService } from '../services/api'

const CATEGORY_ICONS = {
  all: '✡️',
  shiurim: '📖',
  tefila: '🕯️',
  music: '🎵',
  holidays: '🕎',
  documentaries: '🎬',
}

function JudaismCard({ item, categories }) {
  const categoryIcon = CATEGORY_ICONS[item.category] || '✡️'

  return (
    <Link
      to={`/vod/${item.id}`}
      className="group glass-card overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/10"
    >
      <div className="relative aspect-video">
        {item.thumbnail ? (
          <img
            src={item.thumbnail}
            alt={item.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-blue-600/10 flex items-center justify-center">
            <span className="text-4xl">{categoryIcon}</span>
          </div>
        )}
        <div className="absolute top-2 left-2 bg-black/70 rounded-full px-2 py-1">
          <span className="text-sm">{categoryIcon}</span>
        </div>
        {item.duration && (
          <div className="absolute top-2 right-2 bg-blue-600/90 rounded px-1.5 py-0.5 flex items-center gap-1">
            <Clock size={10} className="text-white" />
            <span className="text-[10px] text-white font-bold">{item.duration}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center">
            <Play size={24} className="text-white ml-1" fill="white" />
          </div>
        </div>
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-white truncate">{item.title}</h3>
        {item.rabbi && (
          <p className="text-sm text-blue-400 mt-1 flex items-center gap-1">
            <User size={12} />
            {item.rabbi}
          </p>
        )}
        {item.description && (
          <p className="text-xs text-dark-400 mt-1 truncate">{item.description}</p>
        )}
      </div>
    </Link>
  )
}

export default function JudaismPage() {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [content, setContent] = useState([])
  const [categories, setCategories] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadCategories()
  }, [])

  useEffect(() => {
    loadContent()
  }, [selectedCategory])

  const loadCategories = async () => {
    try {
      const response = await judaismService.getCategories()
      if (response?.data && Array.isArray(response.data)) {
        setCategories(response.data)
      }
    } catch (err) {
      console.error('Failed to load Judaism categories:', err)
    }
  }

  const loadContent = async () => {
    try {
      setIsLoading(true)
      const category = selectedCategory !== 'all' ? selectedCategory : undefined
      const response = await judaismService.getContent(category)
      if (response?.data && Array.isArray(response.data)) {
        setContent(response.data)
      }
    } catch (err) {
      console.error('Failed to load Judaism content:', err)
      setContent([])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-full bg-blue-600/20 flex items-center justify-center">
          <span className="text-3xl">✡️</span>
        </div>
        <div>
          <h1 className="text-3xl font-bold">יהדות</h1>
          <p className="text-dark-400">{content.length} פריטים</p>
        </div>
      </div>

      {categories.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-8 overflow-x-auto pb-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all ${
                selectedCategory === category.id
                  ? 'bg-blue-600/20 border-blue-600 text-blue-400'
                  : 'bg-dark-800 border-transparent text-dark-400 hover:border-dark-600'
              }`}
            >
              <span>{CATEGORY_ICONS[category.id] || '✡️'}</span>
              <span>{category.name}</span>
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-primary" size={48} />
        </div>
      ) : content.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {content.map((item) => (
            <JudaismCard key={item.id} item={item} categories={categories} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="glass-card p-8 text-center">
            <span className="text-6xl block mb-4">✡️</span>
            <h2 className="text-xl font-semibold mb-2">אין תוכן זמין</h2>
            <p className="text-dark-400">נסה לבחור קטגוריה אחרת</p>
          </div>
        </div>
      )}
    </div>
  )
}
