import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register, isLoading, error } = useAuthStore()

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
        <Link to="/" className="block text-center mb-8">
          <span className="text-4xl font-bold text-gradient">
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
                  className="glass-input pe-10"
                  placeholder="ישראל ישראלי"
                />
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-500" size={20} />
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
                  placeholder="לפחות 8 תווים"
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
                  className="glass-input pe-10"
                  placeholder="הזן שוב את הסיסמה"
                  dir="ltr"
                />
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-500" size={20} />
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
