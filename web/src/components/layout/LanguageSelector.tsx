import { useState, useRef, useEffect } from 'react'
import { Globe, Check, ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { languages, saveLanguage, getCurrentLanguage } from '@/i18n'

export default function LanguageSelector({ compact = false }) {
  const { i18n } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)
  const currentLang = getCurrentLanguage()

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLanguageChange = (langCode) => {
    saveLanguage(langCode)
    setIsOpen(false)

    // Update document direction for RTL/LTR
    const lang = languages.find((l) => l.code === langCode)
    document.documentElement.dir = lang?.rtl ? 'rtl' : 'ltr'
    document.documentElement.lang = langCode
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          glass-btn-ghost flex items-center gap-2 transition-all duration-200
          ${compact ? 'glass-btn-icon' : 'px-3 py-2 rounded-lg'}
          ${isOpen ? 'bg-white/10' : ''}
        `}
        aria-label="Select language"
        aria-expanded={isOpen}
      >
        {compact ? (
          <Globe size={20} />
        ) : (
          <>
            <span className="text-lg">{currentLang.flag}</span>
            <span className="text-sm hidden sm:inline">{currentLang.name}</span>
            <ChevronDown
              size={16}
              className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
            />
          </>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full mt-2 left-0 min-w-[160px] glass-card p-1.5 shadow-lg animate-fade-in z-50">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
                transition-colors duration-150
                ${lang.code === i18n.language
                  ? 'bg-primary-500/20 text-primary-400'
                  : 'hover:bg-white/5 text-dark-200 hover:text-white'
                }
              `}
            >
              <span className="text-lg">{lang.flag}</span>
              <span className="flex-1 text-right">{lang.name}</span>
              {lang.code === i18n.language && (
                <Check size={16} className="text-primary-400" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
