import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

export default function GoogleCallbackPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { handleGoogleCallback, isLoading } = useAuthStore()
  const [error, setError] = useState('')

  useEffect(() => {
    const code = searchParams.get('code')
    const errorParam = searchParams.get('error')

    if (errorParam) {
      setError('ההתחברות עם Google בוטלה')
      setTimeout(() => navigate('/login'), 3000)
      return
    }

    if (!code) {
      setError('קוד אימות חסר')
      setTimeout(() => navigate('/login'), 3000)
      return
    }

    handleGoogleCallback(code)
      .then(() => {
        navigate('/', { replace: true })
      })
      .catch((err) => {
        setError(err.detail || err.message || 'שגיאה בהתחברות עם Google')
        setTimeout(() => navigate('/login'), 3000)
      })
  }, [searchParams, handleGoogleCallback, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative">
      <div className="blur-circle-primary w-80 h-80 -top-40 -right-40 absolute" />
      <div className="blur-circle-purple w-64 h-64 bottom-20 -left-32 absolute" />

      <div className="glass-card p-8 text-center relative z-10">
        {error ? (
          <>
            <div className="text-red-400 text-lg mb-4">{error}</div>
            <p className="text-dark-400">מעביר לדף ההתחברות...</p>
          </>
        ) : (
          <>
            <div className="animate-spin w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-lg">מתחבר עם Google...</p>
          </>
        )}
      </div>
    </div>
  )
}
