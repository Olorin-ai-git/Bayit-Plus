import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="glass-strong border-t border-white/5 py-12 mt-auto">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link to="/" className="inline-block">
              <span className="text-2xl font-bold text-gradient">
                בית+
              </span>
            </Link>
            <p className="mt-4 text-dark-400 text-sm leading-relaxed">
              הבית שלך בארה״ב. שידורי טלוויזיה, VOD, רדיו ופודקאסטים בעברית.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="font-semibold text-white mb-4">ניווט</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/live" className="text-dark-400 hover:text-primary-400 transition-colors">
                  שידור חי
                </Link>
              </li>
              <li>
                <Link to="/vod" className="text-dark-400 hover:text-primary-400 transition-colors">
                  סרטים וסדרות
                </Link>
              </li>
              <li>
                <Link to="/radio" className="text-dark-400 hover:text-primary-400 transition-colors">
                  תחנות רדיו
                </Link>
              </li>
              <li>
                <Link to="/podcasts" className="text-dark-400 hover:text-primary-400 transition-colors">
                  פודקאסטים
                </Link>
              </li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h4 className="font-semibold text-white mb-4">חשבון</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/profile" className="text-dark-400 hover:text-primary-400 transition-colors">
                  הפרופיל שלי
                </Link>
              </li>
              <li>
                <Link to="/subscribe" className="text-dark-400 hover:text-primary-400 transition-colors">
                  מנויים
                </Link>
              </li>
              <li>
                <Link to="/help" className="text-dark-400 hover:text-primary-400 transition-colors">
                  עזרה ותמיכה
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-white mb-4">משפטי</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/terms" className="text-dark-400 hover:text-primary-400 transition-colors">
                  תנאי שימוש
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-dark-400 hover:text-primary-400 transition-colors">
                  מדיניות פרטיות
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-dark-400 hover:text-primary-400 transition-colors">
                  צור קשר
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-12 pt-8 border-t border-white/5 text-center text-dark-500 text-sm">
          <p>&copy; {new Date().getFullYear()} בית+. כל הזכויות שמורות.</p>
        </div>
      </div>
    </footer>
  )
}
