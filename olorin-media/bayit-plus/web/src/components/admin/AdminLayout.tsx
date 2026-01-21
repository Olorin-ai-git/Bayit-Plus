import { useState, useEffect, useCallback } from 'react'
import { View, Text, ActivityIndicator, Pressable, useWindowDimensions } from 'react-native'
import { Outlet, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Menu } from 'lucide-react'
import AdminSidebar from './AdminSidebar'
import { colors, spacing } from '@bayit/shared/theme'
import { useAuthStore } from '@/stores/authStore'

const SIDEBAR_DEFAULT_WIDTH = 280
const SIDEBAR_MIN_WIDTH = 240
const SIDEBAR_MAX_WIDTH = 400

export default function AdminLayout() {
  const { isAuthenticated, isLoading, isAdmin } = useAuthStore()
  const { i18n } = useTranslation()
  const { width } = useWindowDimensions()
  const isMobile = width < 768
  const isRTL = i18n.language === 'he' || i18n.language === 'ar'

  const [sidebarOpen, setSidebarOpen] = useState(!isMobile)
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT_WIDTH)
  const [isDragging, setIsDragging] = useState(false)

  // Sidebar drag handler
  const handleSidebarDragStart = useCallback((e: any) => {
    e.preventDefault()
    setIsDragging(true)

    const startX = e.clientX || (e.touches && e.touches[0].clientX)
    const startWidth = sidebarWidth

    const handleDrag = (moveEvent: any) => {
      const currentX = moveEvent.clientX || (moveEvent.touches && moveEvent.touches[0].clientX)
      const deltaX = isRTL ? (startX - currentX) : (currentX - startX)
      const newWidth = Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, startWidth + deltaX))
      setSidebarWidth(newWidth)
    }

    const handleDragEnd = () => {
      setIsDragging(false)
      document.removeEventListener('mousemove', handleDrag)
      document.removeEventListener('mouseup', handleDragEnd)
      document.removeEventListener('touchmove', handleDrag)
      document.removeEventListener('touchend', handleDragEnd)
    }

    document.addEventListener('mousemove', handleDrag)
    document.addEventListener('mouseup', handleDragEnd)
    document.addEventListener('touchmove', handleDrag)
    document.addEventListener('touchend', handleDragEnd)
  }, [sidebarWidth, isRTL])

  useEffect(() => {
    setSidebarOpen(!isMobile)
  }, [isMobile])

  // Show loading while checking auth state
  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center h-screen" style={{ backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="mt-4 text-gray-400 text-base">Loading...</Text>
      </View>
    )
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Redirect to home if not admin
  if (!isAdmin()) {
    return <Navigate to="/" replace />
  }

  return (
    <View className="flex-1 h-full flex-row relative" style={{ backgroundColor: colors.background }}>
      {/* Main Content */}
      <View
        className={`flex-1 h-full overflow-auto relative pt-4 ${
          isDragging ? 'select-none' : ''
        }`}
        style={{
          ...(sidebarOpen && !isMobile && (isRTL ? { marginRight: sidebarWidth } : { marginLeft: sidebarWidth })),
          paddingRight: isRTL ? 56 : spacing.lg,
          paddingLeft: isRTL ? spacing.lg : 56,
          transition: isDragging ? 'none' : 'margin 0.3s ease',
        } as any}
      >
        {/* Mobile Menu Toggle */}
        {isMobile && (
          <Pressable
            className={`absolute top-4 w-11 h-11 rounded-xl justify-center items-center z-10 ${
              isRTL ? 'right-4' : 'left-4'
            }`}
            style={{ backgroundColor: colors.glass }}
            onPress={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu size={24} color={colors.text} />
          </Pressable>
        )}

        <Outlet />
      </View>

      {/* Sidebar Toggle Button - Matches main sidebar style */}
      {!isMobile && (
        <Pressable
          className="fixed top-6 z-150"
          style={{
            left: isRTL ? 'auto' : (sidebarOpen ? sidebarWidth - 22 : spacing.md),
            right: isRTL ? (sidebarOpen ? sidebarWidth - 22 : spacing.md) : 'auto',
            transition: 'left 0.3s ease, right 0.3s ease',
          } as any}
          onPress={() => setSidebarOpen(!sidebarOpen)}
        >
          {({ hovered }: any) => (
            <View
              className="w-11 h-11 rounded-lg justify-center items-center border-2"
              style={{
                borderColor: colors.primary,
                backgroundColor: hovered ? colors.primary + '30' : 'transparent',
                opacity: hovered ? 1 : 0.6,
              }}
            >
              <Text className="text-base font-bold" style={{ color: colors.primary }}>
                {isRTL
                  ? (sidebarOpen ? '▶' : '◀')
                  : (sidebarOpen ? '◀' : '▶')}
              </Text>
            </View>
          )}
        </Pressable>
      )}

      {/* Sidebar */}
      <AdminSidebar
        isOpen={sidebarOpen}
        width={sidebarWidth}
        isRTL={isRTL}
        isMobile={isMobile}
        isDragging={isDragging}
        onClose={() => setSidebarOpen(false)}
        onDragStart={handleSidebarDragStart}
      />

      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <Pressable
          className="fixed top-0 left-0 right-0 bottom-0 z-99"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
          onPress={() => setSidebarOpen(false)}
        />
      )}
    </View>
  )
}
