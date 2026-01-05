import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register, loginWithGoogle, isLoading, error } = useAuthStore()

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')

    if (!formData.name || !formData.email || !formData.password) {
      setFormError('נא למלא את כל השדות')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setFormError('הסיסמאות אינן תואמות')
      return
    }

    if (formData.password.length < 8) {
      setFormError('הסיסמה חייבת להכיל לפחות 8 תווים')
      return
    }

    try {
      await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
      })
      navigate('/subscribe', { replace: true })
    } catch (err) {
      setFormError(err.message || 'שגיאה בהרשמה. נסה שוב.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 relative">
      {/* Decorative blur circles */}
      <div className="blur-circle-primary w-80 h-80 -top-40 -right-40 absolute" />
      <div className="blur-circle-purple w-64 h-64 bottom-20 -left-32 absolute" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <Link to="/" className="flex flex-col items-center gap-2 mb-8">
          <img
            src="/logo.png"
            alt="Bayit+"
            className="h-20 w-auto"
          />
          <span className="text-3xl font-bold text-gradient">
            בית+
          </span>
        </Link>

        {/* Form Card */}
        <div className="glass-card p-8 animate-slide-up">
          <h1 className="text-2xl font-bold text-center mb-6">יצירת חשבון</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                שם מלא
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="glass-input ps-10"
                  placeholder="ישראל ישראלי"
                />
                <User className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-500" size={20} />
              </div>
            </div>

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
                  className="glass-input ps-10"
                  placeholder="your@email.com"
                  dir="ltr"
                />
                <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-500" size={20} />
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
                  className="glass-input ps-10"
                  placeholder="לפחות 8 תווים"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                אימות סיסמה
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="glass-input ps-10"
                  placeholder="הזן שוב את הסיסמה"
                  dir="ltr"
                />
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-500" size={20} />
              </div>
            </div>

            {/* Error Message */}
            {(formError || error) && (
              <div className="glass-badge-danger p-3 rounded-lg text-sm w-full justify-center">
                {formError || error}
              </div>
            )}

            {/* Terms */}
            <p className="text-xs text-dark-400">
              בהרשמה אתה מאשר את{' '}
              <Link to="/terms" className="text-primary-400 hover:underline">
                תנאי השימוש
              </Link>{' '}
              ואת{' '}
              <Link to="/privacy" className="text-primary-400 hover:underline">
                מדיניות הפרטיות
              </Link>
            </p>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="glass-btn-primary w-full justify-center"
            >
              {isLoading ? 'נרשם...' : 'הרשמה'}
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
          <button
            type="button"
            onClick={() => loginWithGoogle()}
            disabled={isLoading}
            className="glass-btn-secondary w-full justify-center"
          >
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
            הרשמה עם Google
          </button>

          {/* Login Link */}
          <p className="mt-6 text-center text-dark-400">
            כבר יש לך חשבון?{' '}
            <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
              התחברות
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
