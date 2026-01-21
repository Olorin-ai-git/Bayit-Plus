import { useState, useEffect, useCallback } from 'react'
import { View, StyleSheet, Text, ActivityIndicator, Pressable, useWindowDimensions } from 'react-native'
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
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
    <View style={styles.container}>
      {/* Main Content */}
      <View
        style={[
          styles.content,
          sidebarOpen && !isMobile && (isRTL ? { marginRight: sidebarWidth } : { marginLeft: sidebarWidth }),
          isDragging && styles.contentDragging,
          // Extra padding on sidebar side to clear toggle button
          isRTL ? { paddingRight: 56, paddingLeft: spacing.lg } : { paddingLeft: 56, paddingRight: spacing.lg },
        ]}
      >
        {/* Mobile Menu Toggle */}
        {isMobile && (
          <Pressable
            style={[styles.mobileMenuBtn, isRTL && styles.mobileMenuBtnRTL]}
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
          style={[
            styles.sidebarToggle,
            isRTL && styles.sidebarToggleRTL,
            sidebarOpen
              ? (isRTL ? { right: sidebarWidth - 22 } : { left: sidebarWidth - 22 })
              : (isRTL ? { right: spacing.md } : { left: spacing.md }),
          ]}
          onPress={() => setSidebarOpen(!sidebarOpen)}
        >
          {({ hovered }: any) => (
            <View style={[
              styles.toggleInner,
              hovered && styles.toggleInnerHovered,
            ]}>
              <Text style={styles.toggleArrow}>
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
        <Pressable style={styles.overlay} onPress={() => setSidebarOpen(false)} />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: '100%' as any,
    flexDirection: 'row',
    position: 'relative',
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    height: '100%' as any,
    overflow: 'auto' as any,
    transition: 'margin 0.3s ease' as any,
    position: 'relative',
    paddingTop: spacing.md,
  },
  contentDragging: {
    transition: 'none' as any,
    userSelect: 'none' as any,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    height: '100vh' as any,
  },
  loadingText: {
    marginTop: 16,
    color: colors.textMuted,
    fontSize: 16,
  },
  mobileMenuBtn: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.glass,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  mobileMenuBtnRTL: {
    left: 'auto' as any,
    right: spacing.md,
  },
  sidebarToggle: {
    position: 'fixed' as any,
    top: 24,
    left: 0,
    zIndex: 150,
    transition: 'left 0.3s ease, right 0.3s ease' as any,
  },
  sidebarToggleRTL: {
    left: 'auto' as any,
    right: 0,
  },
  toggleInner: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: 'transparent',
    opacity: 0.6,
  },
  toggleInnerHovered: {
    opacity: 1,
    backgroundColor: colors.primary + '30',
  },
  toggleArrow: {
    fontSize: 16,
    fontWeight: '700' as any,
    color: colors.primary,
  },
  overlay: {
    position: 'fixed' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: 99,
  },
})
