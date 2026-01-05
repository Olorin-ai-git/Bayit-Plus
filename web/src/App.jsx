import { Routes, Route } from 'react-router-dom'
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

function App() {
  return (
    <Routes>
      {/* Auth Routes (no layout) */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />

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
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default App
