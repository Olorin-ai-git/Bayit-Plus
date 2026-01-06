import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Edit2, Lock, Baby, Loader2, X } from 'lucide-react'
import { useProfileStore } from '@/stores/profileStore'
import { useAuthStore } from '@/stores/authStore'

// Profile avatar colors
const AVATAR_COLORS = [
  '#00d9ff', // Cyan
  '#ff6b6b', // Red
  '#4ecdc4', // Teal
  '#ffd93d', // Yellow
  '#6c5ce7', // Purple
  '#a8e6cf', // Mint
  '#ff8b94', // Pink
  '#ffaaa5', // Coral
]

function ProfileCard({ profile, onSelect, isManageMode }) {
  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <button
      onClick={() => onSelect(profile)}
      className="group flex flex-col items-center gap-3 transition-all duration-300 hover:scale-105"
    >
      <div
        className="relative w-28 h-28 md:w-36 md:h-36 rounded-xl flex items-center justify-center text-4xl md:text-5xl font-bold text-white shadow-lg transition-all duration-300 group-hover:shadow-xl group-hover:shadow-primary/20"
        style={{ backgroundColor: profile.avatar_color || AVATAR_COLORS[0] }}
      >
        {profile.avatar ? (
          <span className="text-5xl md:text-6xl">{profile.avatar}</span>
        ) : (
          <span className="drop-shadow-md">{getInitials(profile.name)}</span>
        )}

        {/* Kids indicator */}
        {profile.is_kids_profile && (
          <div className="absolute -bottom-1 -right-1 bg-yellow-400 rounded-full p-1.5 shadow-md">
            <Baby size={14} className="text-yellow-900" />
          </div>
        )}

        {/* PIN indicator */}
        {profile.has_pin && (
          <div className="absolute -top-1 -right-1 bg-dark-800/80 rounded-full p-1.5 shadow-md">
            <Lock size={12} className="text-dark-300" />
          </div>
        )}

        {/* Edit overlay in manage mode */}
        {isManageMode && (
          <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center opacity-100">
            <Edit2 size={24} className="text-white" />
          </div>
        )}
      </div>

      <span className="text-dark-300 text-sm md:text-base truncate max-w-[120px] md:max-w-[150px] group-hover:text-white transition-colors">
        {profile.name}
      </span>
    </button>
  )
}

function AddProfileCard({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center gap-3 transition-all duration-300 hover:scale-105"
    >
      <div className="w-28 h-28 md:w-36 md:h-36 rounded-xl border-2 border-dashed border-dark-600 flex items-center justify-center bg-dark-800/30 transition-all duration-300 group-hover:border-primary group-hover:bg-dark-800/50">
        <Plus size={40} className="text-dark-500 group-hover:text-primary transition-colors" />
      </div>
      <span className="text-dark-500 text-sm md:text-base group-hover:text-dark-300 transition-colors">
        הוסף פרופיל
      </span>
    </button>
  )
}

function PinModal({ isOpen, onClose, onSubmit, error, isLoading }) {
  const [pin, setPin] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setPin('')
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    if (pin.length >= 4) {
      onSubmit(pin)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="glass-card p-6 w-full max-w-sm relative animate-slide-up">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 text-dark-400 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>

        <h2 className="text-xl font-bold text-center mb-6">הזן קוד PIN</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            ref={inputRef}
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            className="glass-input text-center text-2xl tracking-[0.5em] placeholder:tracking-normal"
            placeholder="••••"
            dir="ltr"
          />

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-lg bg-dark-700 text-dark-300 hover:bg-dark-600 transition-colors"
            >
              ביטול
            </button>
            <button
              type="submit"
              disabled={pin.length < 4 || isLoading}
              className="flex-1 btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="animate-spin mx-auto" size={20} />
              ) : (
                'אישור'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ProfileSelectionPage() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  const {
    profiles,
    isLoading,
    error,
    fetchProfiles,
    selectProfile,
    setNeedsProfileSelection,
  } = useProfileStore()

  const [isManageMode, setIsManageMode] = useState(false)
  const [selectedProfile, setSelectedProfile] = useState(null)
  const [showPinModal, setShowPinModal] = useState(false)
  const [pinError, setPinError] = useState('')

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true })
      return
    }
    fetchProfiles()
  }, [isAuthenticated])

  const handleProfileSelect = async (profile) => {
    if (isManageMode) {
      navigate(`/profile/edit/${profile.id}`)
      return
    }

    if (profile.has_pin) {
      setSelectedProfile(profile)
      setShowPinModal(true)
      setPinError('')
      return
    }

    try {
      await selectProfile(profile.id)
      navigate('/', { replace: true })
    } catch (err) {
      setPinError(err.detail || 'שגיאה בבחירת פרופיל')
    }
  }

  const handlePinSubmit = async (pin) => {
    if (!selectedProfile) return

    try {
      await selectProfile(selectedProfile.id, pin)
      setShowPinModal(false)
      setSelectedProfile(null)
      navigate('/', { replace: true })
    } catch (err) {
      setPinError(err.detail || 'קוד PIN שגוי')
    }
  }

  const handleAddProfile = () => {
    navigate('/profile/create')
  }

  const canAddProfile = profiles.length < 5

  if (isLoading && profiles.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-primary" size={48} />
          <p className="text-dark-400">טוען פרופילים...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative">
      {/* Decorative blur circles */}
      <div className="blur-circle-primary w-80 h-80 -top-40 -right-40 absolute" />
      <div className="blur-circle-purple w-64 h-64 bottom-20 -left-32 absolute" />

      <div className="relative z-10 w-full max-w-4xl">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img
            src="/logo.png"
            alt="Bayit+"
            className="h-16 w-auto"
          />
        </div>

        {/* Title */}
        <h1 className="text-2xl md:text-3xl font-bold text-center mb-12">
          {isManageMode ? 'ניהול פרופילים' : 'מי צופה?'}
        </h1>

        {/* Profiles Grid */}
        <div className="flex flex-wrap justify-center gap-6 md:gap-10 mb-12">
          {profiles.map((profile) => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              onSelect={handleProfileSelect}
              isManageMode={isManageMode}
            />
          ))}

          {canAddProfile && !isManageMode && (
            <AddProfileCard onClick={handleAddProfile} />
          )}
        </div>

        {/* Manage Profiles Button */}
        <div className="flex justify-center">
          <button
            onClick={() => setIsManageMode(!isManageMode)}
            className="px-6 py-2 rounded-lg border border-dark-600 text-dark-400 hover:text-white hover:border-dark-400 transition-colors"
          >
            {isManageMode ? 'סיום' : 'ניהול פרופילים'}
          </button>
        </div>

        {/* Error */}
        {error && (
          <p className="text-red-400 text-center mt-6">{error}</p>
        )}
      </div>

      {/* PIN Modal */}
      <PinModal
        isOpen={showPinModal}
        onClose={() => {
          setShowPinModal(false)
          setSelectedProfile(null)
          setPinError('')
        }}
        onSubmit={handlePinSubmit}
        error={pinError}
        isLoading={isLoading}
      />
    </div>
  )
}
