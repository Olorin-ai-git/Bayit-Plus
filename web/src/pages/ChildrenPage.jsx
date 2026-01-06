import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Play, Clock, Baby, Loader2, Lock, X } from 'lucide-react'
import { useProfileStore } from '@/stores/profileStore'
import { childrenService } from '../services/api'

const CATEGORY_ICONS = {
  all: '🌈',
  cartoons: '🎬',
  educational: '📚',
  music: '🎵',
  hebrew: 'א',
  stories: '📖',
  jewish: '✡️',
}

function KidsContentCard({ item }) {
  const categoryIcon = CATEGORY_ICONS[item.category] || '🌈'

  return (
    <Link
      to={`/vod/${item.id}`}
      className="group rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-yellow-400/10"
      style={{ backgroundColor: 'rgba(255, 217, 61, 0.1)' }}
    >
      <div className="relative aspect-video">
        {item.thumbnail ? (
          <img
            src={item.thumbnail}
            alt={item.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-yellow-400/10 flex items-center justify-center">
            <span className="text-4xl">{categoryIcon}</span>
          </div>
        )}
        <div className="absolute top-2 left-2 bg-yellow-400 rounded-full px-2 py-1">
          <span className="text-sm">{categoryIcon}</span>
        </div>
        {item.age_rating !== undefined && (
          <div className="absolute top-2 right-2 bg-green-500/90 rounded px-1.5 py-0.5 flex items-center gap-1">
            <span className="text-[10px] text-white font-bold">+{item.age_rating}</span>
          </div>
        )}
        {item.duration && (
          <div className="absolute bottom-2 right-2 bg-black/70 rounded px-1.5 py-0.5 flex items-center gap-1">
            <Clock size={10} className="text-white" />
            <span className="text-[10px] text-white">{item.duration}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-yellow-400 flex items-center justify-center">
            <Play size={24} className="text-yellow-900 ml-1" fill="currentColor" />
          </div>
        </div>
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-white truncate text-lg">{item.title}</h3>
        {item.description && (
          <p className="text-sm text-dark-400 mt-1 truncate">{item.description}</p>
        )}
        {item.educational_tags && item.educational_tags.length > 0 && (
          <div className="flex gap-1 mt-2">
            {item.educational_tags.map(tag => (
              <span key={tag} className="text-xs bg-blue-600/30 text-blue-300 px-2 py-0.5 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}

function ExitKidsModeModal({ isOpen, onClose, onVerify }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (pin.length < 4) return

    setIsLoading(true)
    setError('')

    try {
      await onVerify(pin)
      onClose()
    } catch (err) {
      setError(err.message || 'קוד PIN שגוי')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="glass-card p-6 w-full max-w-sm relative">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 text-dark-400 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>

        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-yellow-400/20 flex items-center justify-center">
            <Lock size={32} className="text-yellow-400" />
          </div>
        </div>

        <h2 className="text-xl font-bold text-center mb-2">יציאה ממצב ילדים</h2>
        <p className="text-dark-400 text-center text-sm mb-6">
          הזן את קוד ההורה כדי לצאת
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            className="glass-input text-center text-2xl tracking-[0.5em]"
            dir="ltr"
            autoFocus
          />

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={pin.length < 4 || isLoading}
            className="w-full py-3 rounded-lg bg-yellow-400 text-yellow-900 font-bold hover:bg-yellow-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="animate-spin mx-auto" size={20} />
            ) : (
              'אישור'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function ChildrenPage() {
  const navigate = useNavigate()
  const { activeProfile, isKidsMode } = useProfileStore()
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [content, setContent] = useState([])
  const [categories, setCategories] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [showExitModal, setShowExitModal] = useState(false)

  useEffect(() => {
    loadCategories()
  }, [])

  useEffect(() => {
    loadContent()
  }, [selectedCategory, activeProfile])

  const loadCategories = async () => {
    try {
      const response = await childrenService.getCategories()
      if (response?.data && Array.isArray(response.data)) {
        setCategories(response.data)
      }
    } catch (err) {
      console.error('Failed to load children categories:', err)
    }
  }

  const loadContent = async () => {
    try {
      setIsLoading(true)
      const category = selectedCategory !== 'all' ? selectedCategory : undefined
      const maxAge = activeProfile?.is_kids_profile ? activeProfile.kids_age_limit : undefined
      const response = await childrenService.getContent(category, maxAge)
      if (response?.data && Array.isArray(response.data)) {
        setContent(response.data)
      }
    } catch (err) {
      console.error('Failed to load kids content:', err)
      setContent([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleExitKidsMode = async (pin) => {
    try {
      await childrenService.verifyPin(pin)
      navigate('/')
    } catch (err) {
      throw new Error('קוד PIN שגוי')
    }
  }

  return (
    <div
      className="min-h-screen"
      style={{
        background: 'linear-gradient(135deg, rgba(255, 217, 61, 0.05) 0%, transparent 50%)',
      }}
    >
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-yellow-400/20 flex items-center justify-center">
              <Baby size={32} className="text-yellow-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-yellow-400">ילדים</h1>
              <p className="text-dark-400">{content.length} פריטים</p>
            </div>
          </div>

          {isKidsMode && isKidsMode() && (
            <button
              onClick={() => setShowExitModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-dark-800 border border-dark-600 text-dark-400 hover:text-white transition-colors"
            >
              <Lock size={16} />
              <span>יציאה</span>
            </button>
          )}
        </div>

        {categories.length > 0 && (
          <div className="flex flex-wrap gap-3 mb-8 overflow-x-auto pb-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all ${
                  selectedCategory === category.id
                    ? 'bg-yellow-400/20 border-yellow-400 text-yellow-400'
                    : 'bg-dark-800 border-transparent text-dark-400 hover:border-dark-600'
                }`}
              >
                <span>{CATEGORY_ICONS[category.id] || '🌈'}</span>
                <span>{category.name}</span>
              </button>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-yellow-400" size={48} />
          </div>
        ) : content.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {content.map((item) => (
              <KidsContentCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="glass-card p-8 text-center" style={{ backgroundColor: 'rgba(255, 217, 61, 0.1)' }}>
              <span className="text-6xl block mb-4">🌈</span>
              <h2 className="text-xl font-semibold mb-2 text-yellow-400">אין תוכן זמין</h2>
              <p className="text-dark-400">נסה לבחור קטגוריה אחרת</p>
            </div>
          </div>
        )}
      </div>

      <ExitKidsModeModal
        isOpen={showExitModal}
        onClose={() => setShowExitModal(false)}
        onVerify={handleExitKidsMode}
      />
    </div>
  )
}
