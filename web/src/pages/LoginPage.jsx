import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, isLoading, error } = useAuthStore()

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState('')

  const from = location.state?.from?.pathname || '/'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')

    if (!formData.email || !formData.password) {
      setFormError('נא למלא את כל השדות')
      return
    }

    try {
      await login(formData.email, formData.password)
      navigate(from, { replace: true })
    } catch (err) {
      setFormError(err.message || 'שגיאה בהתחברות. נסה שוב.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative">
      {/* Decorative blur circles */}
      <div className="blur-circle-primary w-80 h-80 -top-40 -right-40 absolute" />
      <div className="blur-circle-purple w-64 h-64 bottom-20 -left-32 absolute" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <Link to="/" className="block text-center mb-8">
          <span className="text-4xl font-bold text-gradient">
            בית+
          </span>
        </Link>

        {/* Form Card */}
        <div className="glass-card p-8 animate-slide-up">
          <h1 className="text-2xl font-bold text-center mb-6">התחברות</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                אימייל
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="glass-input pe-10"
                  placeholder="your@email.com"
                  dir="ltr"
                />
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-500" size={20} />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                סיסמה
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="glass-input pe-10"
                  placeholder="••••••••"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Forgot Password */}
            <div className="text-left">
              <Link
                to="/forgot-password"
                className="text-sm text-primary-400 hover:text-primary-300 transition-colors"
              >
                שכחת סיסמה?
              </Link>
            </div>

            {/* Error Message */}
            {(formError || error) && (
              <div className="glass-badge-danger p-3 rounded-lg text-sm w-full justify-center">
                {formError || error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="glass-btn-primary w-full justify-center"
            >
              {isLoading ? 'מתחבר...' : 'התחברות'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-dark-800/50 text-dark-500 rounded">או</span>
            </div>
          </div>

          {/* Social Login */}
          <button className="glass-btn-secondary w-full justify-center">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            המשך עם Google
          </button>

          {/* Register Link */}
          <p className="mt-6 text-center text-dark-400">
            אין לך חשבון?{' '}
            <Link to="/register" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
              הרשמה
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
