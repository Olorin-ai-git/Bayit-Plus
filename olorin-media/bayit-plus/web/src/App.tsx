import { useEffect, lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { loadSavedLanguage } from '@bayit/shared-i18n'
import { useDirection } from '@/hooks/useDirection'
import { VoiceListeningProvider } from '@bayit/shared-contexts'
import { ModalProvider } from '@/contexts/ModalContext'
import Layout from './components/layout/Layout'
import FullscreenVideoOverlay from './components/player/FullscreenVideoOverlay'
import { useAuthStore } from '@/stores/authStore'
import './styles/layout-fix.css'

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      <span className="text-white/60 text-sm">Loading...</span>
    </div>
  </div>
)

// Admin-only route wrapper
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAdmin, isLoading } = useAuthStore()
  if (isLoading) return <LoadingFallback />
  if (!isAdmin()) return <Navigate to="/" replace />
  return <>{children}</>
}

// Core pages (eagerly loaded for better initial experience)
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import GoogleCallbackPage from './pages/GoogleCallbackPage'
import ProfileSelectionPage from './pages/ProfileSelectionPage'
import NotFoundPage from './pages/NotFoundPage'

// Lazily loaded pages for code splitting
const LivePage = lazy(() => import('./pages/LivePage'))
const VODPage = lazy(() => import('./pages/VODPage'))
const RadioPage = lazy(() => import('./pages/RadioPage'))
const PodcastsPage = lazy(() => import('./pages/PodcastsPage'))
const SearchPage = lazy(() => import('./pages/SearchPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const SubscribePage = lazy(() => import('./pages/SubscribePage'))
const WatchPage = lazy(() => import('./pages/WatchPage'))
const SeriesDetailPage = lazy(() => import('./pages/SeriesDetailPage'))
const MovieDetailPage = lazy(() => import('./pages/MovieDetailPage'))
const JudaismPage = lazy(() => import('./pages/JudaismPage'))
const ChildrenPage = lazy(() => import('./pages/ChildrenPage'))
const FavoritesPage = lazy(() => import('./pages/FavoritesPage'))
const DownloadsPage = lazy(() => import('./pages/DownloadsPage'))
const WatchlistPage = lazy(() => import('./pages/WatchlistPage'))
const MyRecordingsPage = lazy(() => import('./pages/MyRecordingsPage'))
const MorningRitualPage = lazy(() => import('./pages/MorningRitualPage'))
const TVLoginPage = lazy(() => import('./pages/TVLoginPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const HelpPage = lazy(() => import('./pages/HelpPage'))
const SupportPage = lazy(() => import('./pages/SupportPage'))
const UserWidgetsPage = lazy(() => import('./pages/UserWidgetsPage'))
const EPGPage = lazy(() => import('./pages/EPGPage'))
const ChessPage = lazy(() => import('./pages/ChessPage'))
const FriendsPage = lazy(() => import('./pages/FriendsPage'))
const PlayerProfilePage = lazy(() => import('./pages/PlayerProfilePage'))

// Admin Pages (lazily loaded as a separate chunk)
const AdminLayout = lazy(() => import('./components/admin/AdminLayout'))
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'))
const UsersListPage = lazy(() => import('./pages/admin/UsersListPage'))
const UserDetailPage = lazy(() => import('./pages/admin/UserDetailPage'))
const CampaignsListPage = lazy(() => import('./pages/admin/CampaignsListPage'))
const CampaignEditPage = lazy(() => import('./pages/admin/CampaignEditPage'))
const SubscriptionsListPage = lazy(() => import('./pages/admin/SubscriptionsListPage'))
const BillingOverviewPage = lazy(() => import('./pages/admin/BillingOverviewPage'))
const TransactionsPage = lazy(() => import('./pages/admin/TransactionsPage'))
const RefundsPage = lazy(() => import('./pages/admin/RefundsPage'))
const PlanManagementPage = lazy(() => import('./pages/admin/PlanManagementPage'))
const MarketingDashboardPage = lazy(() => import('./pages/admin/MarketingDashboardPage'))
const EmailCampaignsPage = lazy(() => import('./pages/admin/EmailCampaignsPage'))
const PushNotificationsPage = lazy(() => import('./pages/admin/PushNotificationsPage'))
const AuditLogsPage = lazy(() => import('./pages/admin/AuditLogsPage'))
const AdminSettingsPage = lazy(() => import('./pages/admin/SettingsPage'))
const ContentLibraryPage = lazy(() => import('./pages/admin/ContentLibraryPage'))
const ContentEditorPage = lazy(() => import('./pages/admin/ContentEditorPage'))
const CategoriesPage = lazy(() => import('./pages/admin/CategoriesPage'))
const LiveChannelsPage = lazy(() => import('./pages/admin/LiveChannelsPage'))
const RadioStationsPage = lazy(() => import('./pages/admin/RadioStationsPage'))
const AdminPodcastsPage = lazy(() => import('./pages/admin/PodcastsPage'))
const PodcastEpisodesPage = lazy(() => import('./pages/admin/PodcastEpisodesPage'))
const WidgetsPage = lazy(() => import('./pages/admin/WidgetsPage'))
const LibrarianAgentPage = lazy(() => import('./pages/admin/LibrarianAgentPage'))
const RecordingsManagementPage = lazy(() => import('./pages/admin/RecordingsManagementPage'))
const UploadsPage = lazy(() => import('./pages/admin/UploadsPage'))
const FeaturedManagementPage = lazy(() => import('./pages/admin/FeaturedManagementPage'))

function App() {
  // Set document direction based on language (RTL for Hebrew/Arabic, LTR for others)
  useDirection()

  useEffect(() => {
    loadSavedLanguage()
  }, [])

  return (
    <>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
        {/* Auth Routes (no layout) */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />
        <Route path="/profiles" element={<ProfileSelectionPage />} />
        <Route path="/tv-login" element={<TVLoginPage />} />

        {/* Admin Routes (lazily loaded) */}
        <Route path="/admin" element={<ModalProvider><AdminLayout /></ModalProvider>}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="users" element={<UsersListPage />} />
          <Route path="users/:userId" element={<UserDetailPage />} />
          <Route path="campaigns" element={<CampaignsListPage />} />
          <Route path="campaigns/new" element={<CampaignEditPage />} />
          <Route path="campaigns/:campaignId" element={<CampaignEditPage />} />
          <Route path="subscriptions" element={<SubscriptionsListPage />} />
          <Route path="billing" element={<BillingOverviewPage />} />
          <Route path="transactions" element={<TransactionsPage />} />
          <Route path="refunds" element={<RefundsPage />} />
          <Route path="plans" element={<PlanManagementPage />} />
          <Route path="marketing" element={<MarketingDashboardPage />} />
          <Route path="emails" element={<EmailCampaignsPage />} />
          <Route path="push" element={<PushNotificationsPage />} />
          <Route path="logs" element={<AuditLogsPage />} />
          <Route path="librarian" element={<LibrarianAgentPage />} />
          <Route path="uploads" element={<UploadsPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
          <Route path="content" element={<ContentLibraryPage />} />
          <Route path="content/new" element={<ContentEditorPage />} />
          <Route path="content/:contentId/edit" element={<ContentEditorPage />} />
          <Route path="featured" element={<FeaturedManagementPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="live-channels" element={<LiveChannelsPage />} />
          <Route path="radio-stations" element={<RadioStationsPage />} />
          <Route path="podcasts" element={<AdminPodcastsPage />} />
          <Route path="podcasts/:podcastId/episodes" element={<PodcastEpisodesPage />} />
          <Route path="widgets" element={<WidgetsPage />} />
          <Route path="recordings" element={<RecordingsManagementPage />} />
        </Route>

        {/* Main Routes with Layout */}
        <Route element={<VoiceListeningProvider><ModalProvider><Layout /></ModalProvider></VoiceListeningProvider>}>
          <Route path="/" element={<HomePage />} />
          <Route path="/live" element={<LivePage />} />
          <Route path="/live/:channelId" element={<WatchPage type="live" />} />
          <Route path="/epg" element={<EPGPage />} />
          <Route path="/vod" element={<VODPage />} />
          <Route path="/vod/series/:seriesId" element={<SeriesDetailPage />} />
          <Route path="/vod/movie/:movieId" element={<MovieDetailPage />} />
          <Route path="/vod/:contentId" element={<WatchPage type="vod" />} />
          <Route path="/radio" element={<RadioPage />} />
          <Route path="/radio/:stationId" element={<WatchPage type="radio" />} />
          <Route path="/podcasts" element={<PodcastsPage />} />
          <Route path="/podcasts/:showId" element={<WatchPage type="podcast" />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/subscribe" element={<SubscribePage />} />
          <Route path="/judaism" element={<JudaismPage />} />
          <Route path="/children" element={<ChildrenPage />} />
          <Route path="/games" element={<AdminRoute><ChessPage /></AdminRoute>} />
          <Route path="/friends" element={<FriendsPage />} />
          <Route path="/player/:userId" element={<PlayerProfilePage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/downloads" element={<DownloadsPage />} />
          <Route path="/watchlist" element={<WatchlistPage />} />
          <Route path="/recordings" element={<MyRecordingsPage />} />
          <Route path="/morning-ritual" element={<MorningRitualPage />} />
          <Route path="/widgets" element={<UserWidgetsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        </Routes>
      </Suspense>

      {/* Fullscreen Video Player Overlay - can be triggered from anywhere */}
      <FullscreenVideoOverlay />
    </>
  )
}

export default App
