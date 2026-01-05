import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, Mail, CreditCard, Bell, LogOut, ChevronLeft, Shield } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, logout, isAuthenticated } = useAuthStore()
  const [activeTab, setActiveTab] = useState('profile')

  if (!isAuthenticated) {
    navigate('/login', { state: { from: '/profile' } })
    return null
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">הגדרות חשבון</h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <nav className="glass-card p-2 space-y-1">
            {[
              { id: 'profile', icon: User, label: 'פרופיל' },
              { id: 'subscription', icon: CreditCard, label: 'מנוי' },
              { id: 'notifications', icon: Bell, label: 'התראות' },
              { id: 'security', icon: Shield, label: 'אבטחה' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  activeTab === item.id
                    ? 'glass-btn-primary'
                    : 'text-dark-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <item.icon size={20} />
                {item.label}
              </button>
            ))}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut size={20} />
              התנתקות
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          {activeTab === 'profile' && (
            <div className="glass-card p-6">
              <h2 className="text-xl font-semibold mb-6">פרטי פרופיל</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-dark-400 mb-2">שם</label>
                  <div className="glass-input">
                    {user?.name || 'לא הוגדר'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-dark-400 mb-2">אימייל</label>
                  <div className="glass-input" dir="ltr">
                    {user?.email}
                  </div>
                </div>
                <button className="glass-btn-primary">
                  ערוך פרופיל
                </button>
              </div>
            </div>
          )}

          {activeTab === 'subscription' && (
            <div className="glass-card p-6">
              <h2 className="text-xl font-semibold mb-6">פרטי מנוי</h2>
              {user?.subscription ? (
                <div className="space-y-4">
                  <div className="glass p-4 border-primary-500/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold">{user.subscription.plan}</span>
                      <span className="text-primary-400">{user.subscription.price}/חודש</span>
                    </div>
                    <p className="text-sm text-dark-400">
                      מתחדש ב-{user.subscription.nextBilling}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Link
                      to="/subscribe"
                      className="glass-btn-primary"
                    >
                      שדרג מנוי
                    </Link>
                    <button className="glass-btn-danger">
                      בטל מנוי
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <CreditCard size={48} className="mx-auto text-dark-500 mb-4" />
                  <p className="text-dark-400 mb-4">אין לך מנוי פעיל</p>
                  <Link
                    to="/subscribe"
                    className="glass-btn-primary inline-block"
                  >
                    הצטרף עכשיו
                  </Link>
                </div>
              )}
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="glass-card p-6">
              <h2 className="text-xl font-semibold mb-6">הגדרות התראות</h2>
              <div className="space-y-3">
                {[
                  { id: 'newContent', label: 'תוכן חדש', description: 'קבל התראות על סדרות וסרטים חדשים' },
                  { id: 'liveEvents', label: 'אירועים בשידור חי', description: 'התראות על שידורים חיים מיוחדים' },
                  { id: 'recommendations', label: 'המלצות', description: 'המלצות מותאמות אישית' },
                  { id: 'updates', label: 'עדכוני מערכת', description: 'מידע חשוב על השירות' },
                ].map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 glass-card-sm">
                    <div>
                      <h3 className="font-medium">{item.label}</h3>
                      <p className="text-sm text-dark-400">{item.description}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-dark-600 peer-focus:ring-2 peer-focus:ring-primary-500/30 rounded-full peer peer-checked:after:-translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="glass-card p-6">
              <h2 className="text-xl font-semibold mb-6">אבטחה</h2>
              <div className="space-y-3">
                <button className="w-full glass-card-sm p-4 flex items-center justify-between hover:shadow-glass transition-all group">
                  <div>
                    <h3 className="font-medium group-hover:text-primary-400 transition-colors">שנה סיסמה</h3>
                    <p className="text-sm text-dark-400">עדכן את הסיסמה שלך</p>
                  </div>
                  <ChevronLeft size={20} className="text-dark-500 group-hover:text-primary-400 transition-colors" />
                </button>
                <button className="w-full glass-card-sm p-4 flex items-center justify-between hover:shadow-glass transition-all group">
                  <div>
                    <h3 className="font-medium group-hover:text-primary-400 transition-colors">מכשירים מחוברים</h3>
                    <p className="text-sm text-dark-400">נהל את המכשירים המחוברים לחשבון</p>
                  </div>
                  <ChevronLeft size={20} className="text-dark-500 group-hover:text-primary-400 transition-colors" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
