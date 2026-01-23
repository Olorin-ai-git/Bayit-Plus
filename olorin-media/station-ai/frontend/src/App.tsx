import { useState, useEffect, lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import ProtectedRoute from './components/Auth/ProtectedRoute'
import ToastContainer from './components/Toast/ToastContainer'
import { useAuth } from './contexts/AuthContext'

// Eager-load critical components
import Layout from './components/Layout/Layout'

// Lazy-load page components for code splitting
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Library = lazy(() => import('./pages/Library'))
const Upload = lazy(() => import('./pages/Upload'))
const AgentControl = lazy(() => import('./pages/AgentControl'))
const Settings = lazy(() => import('./pages/Settings'))
const CalendarPlaylist = lazy(() => import('./pages/CalendarPlaylist'))
const ActionsStudio = lazy(() => import('./pages/ActionsStudio'))
const CampaignManager = lazy(() => import('./pages/CampaignManager'))
const HelpPage = lazy(() => import('./pages/HelpPage'))
const Admin = lazy(() => import('./pages/Admin'))
const Login = lazy(() => import('./pages/Login'))
const VoiceManagement = lazy(() => import('./pages/VoiceManagement'))
const LibrarianAgentPage = lazy(() => import('./pages/admin/LibrarianAgentPage'))

// Loading fallback component
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-12 h-12 text-purple-600 animate-spin" />
        <p className="text-gray-600 text-lg">Loading...</p>
      </div>
    </div>
  )
}

function App() {
  const { i18n } = useTranslation()
  const { dbUser } = useAuth()
  const [dir, setDir] = useState<'ltr' | 'rtl'>('ltr')

  // Apply user preferences when logged in
  useEffect(() => {
    if (dbUser?.preferences) {
      // Apply language preference
      const userLang = dbUser.preferences.language
      if (userLang && userLang !== i18n.language) {
        i18n.changeLanguage(userLang)
      }

      // Apply theme preference (add class to document for CSS targeting)
      const theme = dbUser.preferences.theme || 'dark'
      document.documentElement.setAttribute('data-theme', theme)
      document.body.classList.remove('theme-dark', 'theme-light')
      document.body.classList.add(`theme-${theme}`)
    }
  }, [dbUser, i18n])

  useEffect(() => {
    // Set direction based on language
    const newDir = i18n.language === 'he' ? 'rtl' : 'ltr'
    setDir(newDir)
    document.documentElement.dir = newDir
    document.documentElement.lang = i18n.language
  }, [i18n.language])

  return (
    <div dir={dir} className="min-h-screen bg-gray-50">
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public route */}
          <Route path="/login" element={<Login />} />

          {/* Protected routes */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout>
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/calendar" element={<CalendarPlaylist />} />
                      <Route path="/campaigns" element={<CampaignManager />} />
                      <Route path="/library" element={<Library />} />
                      <Route
                        path="/upload"
                        element={
                          <ProtectedRoute requireWrite>
                            <Upload />
                          </ProtectedRoute>
                        }
                      />
                      <Route path="/agent" element={<AgentControl />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route
                        path="/voices"
                        element={
                          <ProtectedRoute requireAdmin>
                            <VoiceManagement />
                          </ProtectedRoute>
                        }
                      />
                      <Route path="/actions-studio" element={<ActionsStudio />} />
                      <Route path="/actions-studio/:flowId" element={<ActionsStudio />} />
                      <Route path="/help" element={<HelpPage />} />
                      <Route
                        path="/admin"
                        element={
                          <ProtectedRoute requireAdmin>
                            <Admin />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/librarian"
                        element={
                          <ProtectedRoute requireAdmin>
                            <LibrarianAgentPage />
                          </ProtectedRoute>
                        }
                      />
                    </Routes>
                  </Suspense>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Suspense>
      <ToastContainer />
    </div>
  )
}

export default App
