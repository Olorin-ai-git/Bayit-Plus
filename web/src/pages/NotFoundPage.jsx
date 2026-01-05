import { Link } from 'react-router-dom'
import { Home, Search } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center relative">
      {/* Decorative blur circles */}
      <div className="blur-circle-primary w-64 h-64 -top-32 right-1/4 absolute" />
      <div className="blur-circle-purple w-48 h-48 bottom-0 left-1/3 absolute" />

      <div className="glass-card p-12 text-center max-w-lg mx-4 relative z-10 animate-slide-up">
        <h1 className="text-8xl font-bold text-gradient mb-4">404</h1>
        <h2 className="text-2xl font-semibold mb-4">הדף לא נמצא</h2>
        <p className="text-dark-400 mb-8">
          הדף שחיפשת לא קיים או הועבר למקום אחר.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            to="/"
            className="glass-btn-primary"
          >
            <Home size={20} />
            לדף הבית
          </Link>
          <Link
            to="/search"
            className="glass-btn-secondary"
          >
            <Search size={20} />
            חיפוש
          </Link>
        </div>
      </div>
    </div>
  )
}
