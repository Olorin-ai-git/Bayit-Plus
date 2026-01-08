import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { loadSavedLanguage } from '@bayit/shared-i18n'
import { useDirection } from '@/hooks/useDirection'
import Layout from './components/layout/Layout'
import HomePage from './pages/HomePage'
import LivePage from './pages/LivePage'
import VODPage from './pages/VODPage'
import RadioPage from './pages/RadioPage'
import PodcastsPage from './pages/PodcastsPage'
import SearchPage from './pages/SearchPage'
import ProfilePage from './pages/ProfilePage'
import SubscribePage from './pages/SubscribePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import GoogleCallbackPage from './pages/GoogleCallbackPage'
import WatchPage from './pages/WatchPage'
import NotFoundPage from './pages/NotFoundPage'
import ProfileSelectionPage from './pages/ProfileSelectionPage'
import JudaismPage from './pages/JudaismPage'
import ChildrenPage from './pages/ChildrenPage'
import FlowsPage from './pages/FlowsPage'
import FavoritesPage from './pages/FavoritesPage'
import DownloadsPage from './pages/DownloadsPage'
import WatchlistPage from './pages/WatchlistPage'
import MorningRitualPage from './pages/MorningRitualPage'
import TVLoginPage from './pages/TVLoginPage'

// Admin Pages
import AdminLayout from './components/admin/AdminLayout'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import UsersListPage from './pages/admin/UsersListPage'
import UserDetailPage from './pages/admin/UserDetailPage'
import CampaignsListPage from './pages/admin/CampaignsListPage'
import SubscriptionsListPage from './pages/admin/SubscriptionsListPage'
import BillingOverviewPage from './pages/admin/BillingOverviewPage'
import TransactionsPage from './pages/admin/TransactionsPage'
import RefundsPage from './pages/admin/RefundsPage'
import PlanManagementPage from './pages/admin/PlanManagementPage'
import MarketingDashboardPage from './pages/admin/MarketingDashboardPage'
import EmailCampaignsPage from './pages/admin/EmailCampaignsPage'
import PushNotificationsPage from './pages/admin/PushNotificationsPage'
import AuditLogsPage from './pages/admin/AuditLogsPage'
import SettingsPage from './pages/admin/SettingsPage'

function App() {
  // Set document direction based on language (RTL for Hebrew/Arabic, LTR for others)
  useDirection()

  useEffect(() => {
    loadSavedLanguage()
  }, [])

  return (
    <Routes>
      {/* Auth Routes (no layout) */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />
      <Route path="/profiles" element={<ProfileSelectionPage />} />
      <Route path="/tv-login" element={<TVLoginPage />} />

      {/* Admin Routes */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboardPage />} />
        <Route path="users" element={<UsersListPage />} />
        <Route path="users/:userId" element={<UserDetailPage />} />
        <Route path="campaigns" element={<CampaignsListPage />} />
        <Route path="subscriptions" element={<SubscriptionsListPage />} />
        <Route path="billing" element={<BillingOverviewPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="refunds" element={<RefundsPage />} />
        <Route path="plans" element={<PlanManagementPage />} />
        <Route path="marketing" element={<MarketingDashboardPage />} />
        <Route path="emails" element={<EmailCampaignsPage />} />
        <Route path="push" element={<PushNotificationsPage />} />
        <Route path="logs" element={<AuditLogsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* Main Routes with Layout */}
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/live" element={<LivePage />} />
        <Route path="/live/:channelId" element={<WatchPage type="live" />} />
        <Route path="/vod" element={<VODPage />} />
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
        <Route path="/flows" element={<FlowsPage />} />
        <Route path="/favorites" element={<FavoritesPage />} />
        <Route path="/downloads" element={<DownloadsPage />} />
        <Route path="/watchlist" element={<WatchlistPage />} />
        <Route path="/morning-ritual" element={<MorningRitualPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default App
