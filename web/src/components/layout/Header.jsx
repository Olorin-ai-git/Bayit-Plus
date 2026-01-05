import { Link, NavLink } from 'react-router-dom'
import { useState } from 'react'
import { Search, User, Menu, X } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

const navLinks = [
  { to: '/', label: 'ראשי' },
  { to: '/live', label: 'שידור חי' },
  { to: '/vod', label: 'VOD' },
  { to: '/radio', label: 'רדיו' },
  { to: '/podcasts', label: 'פודקאסטים' },
]

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { user, isAuthenticated } = useAuthStore()

  return (
    <header className="sticky top-0 z-50 glass-strong border-b border-white/5">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <span className="text-2xl font-bold text-gradient">
              בית+
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'glass-btn-primary'
                      : 'text-dark-300 hover:text-white hover:bg-white/5'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Search Button */}
            <Link
              to="/search"
              className="glass-btn-ghost glass-btn-icon"
              aria-label="חיפוש"
            >
              <Search size={20} />
            </Link>

            {/* User Menu */}
            {isAuthenticated ? (
              <Link
                to="/profile"
                className="glass-btn-ghost glass-btn-icon"
                aria-label="פרופיל"
              >
                <User size={20} />
              </Link>
            ) : (
              <Link
                to="/login"
                className="glass-btn-primary glass-btn-sm"
              >
                התחברות
              </Link>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden glass-btn-ghost glass-btn-icon"
              aria-label={mobileMenuOpen ? 'סגור תפריט' : 'פתח תפריט'}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden py-4 border-t border-white/5 animate-slide-up">
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'glass-btn-primary'
                        : 'text-dark-300 hover:text-white hover:bg-white/5'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </div>
          </nav>
        )}
      </div>
    </header>
  )
}
