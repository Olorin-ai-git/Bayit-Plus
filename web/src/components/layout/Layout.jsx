import { Outlet } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import Chatbot from '../chat/Chatbot'

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Decorative blur circles */}
      <div className="blur-circle-primary w-96 h-96 -top-48 -right-48 fixed opacity-50" />
      <div className="blur-circle-purple w-72 h-72 top-1/3 -left-36 fixed opacity-40" />
      <div className="blur-circle-success w-64 h-64 bottom-1/4 right-1/4 fixed opacity-30" />

      <Header />
      <main className="flex-1 relative z-10">
        <Outlet />
      </main>
      <Footer />
      <Chatbot />
    </div>
  )
}
