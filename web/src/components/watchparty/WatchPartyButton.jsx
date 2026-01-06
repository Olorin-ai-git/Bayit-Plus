import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Users, Plus, UserPlus, ChevronDown } from 'lucide-react'
import { clsx } from 'clsx'

export default function WatchPartyButton({
  hasActiveParty,
  onCreateClick,
  onJoinClick,
  onPanelToggle,
}) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (hasActiveParty) {
    return (
      <button
        onClick={onPanelToggle}
        className={clsx(
          'glass-btn-ghost flex items-center gap-2 px-3 py-2 rounded-xl',
          'border border-emerald-500/30 bg-emerald-500/10',
          'hover:bg-emerald-500/20 transition-all duration-200'
        )}
      >
        <Users size={18} className="text-emerald-400" />
        <span className="text-sm font-medium text-emerald-400">
          {t('watchParty.active')}
        </span>
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
      </button>
    )
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="glass-btn-ghost flex items-center gap-2 px-3 py-2 rounded-xl"
      >
        <Users size={18} />
        <span className="text-sm font-medium hidden sm:inline">
          {t('watchParty.title')}
        </span>
        <ChevronDown
          size={14}
          className={clsx('transition-transform', isOpen && 'rotate-180')}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 bottom-full mb-2 w-48 py-1 rounded-xl glass border border-white/10 shadow-xl animate-slide-up z-50">
          <button
            onClick={() => {
              setIsOpen(false)
              onCreateClick()
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-right hover:bg-white/10 transition-colors"
          >
            <Plus size={18} className="text-primary-400" />
            <span className="text-sm">{t('watchParty.create')}</span>
          </button>
          <button
            onClick={() => {
              setIsOpen(false)
              onJoinClick()
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-right hover:bg-white/10 transition-colors"
          >
            <UserPlus size={18} className="text-blue-400" />
            <span className="text-sm">{t('watchParty.join')}</span>
          </button>
        </div>
      )}
    </div>
  )
}
