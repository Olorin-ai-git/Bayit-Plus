import { useState, useEffect, useCallback } from 'react'
import { View, Text, ActivityIndicator, Pressable, useWindowDimensions, StyleSheet } from 'react-native'
import { Outlet, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Menu } from 'lucide-react'
import AdminSidebar from './AdminSidebar'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
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
  const [toggleHovered, setToggleHovered] = useState(false)

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

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!isAdmin()) {
    return <Navigate to="/" replace />
  }

  return (
    <View style={styles.container}>
      {/* Main Content */}
      <View
        style={[
          styles.mainContent,
          isDragging && styles.mainContentDragging,
          sidebarOpen && !isMobile && (isRTL
            ? { marginRight: sidebarWidth }
            : { marginLeft: sidebarWidth }
          ),
          {
            paddingRight: isRTL ? 56 : spacing.lg,
            paddingLeft: isRTL ? spacing.lg : 56,
            // @ts-ignore - Web transition
            transition: isDragging ? 'none' : 'margin 0.3s ease',
          },
        ]}
      >
        {/* Mobile Menu Toggle */}
        {isMobile && (
          <Pressable
            style={[
              styles.mobileMenuToggle,
              isRTL ? styles.mobileMenuToggleRTL : styles.mobileMenuToggleLTR
            ]}
            onPress={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu size={24} color={colors.text} />
          </Pressable>
        )}

        <Outlet />
      </View>

      {/* Sidebar Toggle Button */}
      {!isMobile && (
        <Pressable
          onPress={() => setSidebarOpen(!sidebarOpen)}
          onHoverIn={() => setToggleHovered(true)}
          onHoverOut={() => setToggleHovered(false)}
          style={[
            styles.sidebarToggle,
            {
              left: isRTL ? 'auto' : (sidebarOpen ? sidebarWidth - 22 : spacing.md),
              right: isRTL ? (sidebarOpen ? sidebarWidth - 22 : spacing.md) : 'auto',
              // @ts-ignore - Web transition
              transition: 'left 0.3s ease, right 0.3s ease',
            },
          ]}
        >
          <View
            style={[
              styles.toggleButton,
              { opacity: toggleHovered ? 1 : 0.6 },
              toggleHovered && styles.toggleButtonHovered,
            ]}
          >
            <Text style={styles.toggleIcon}>
              {isRTL
                ? (sidebarOpen ? '▶' : '◀')
                : (sidebarOpen ? '◀' : '▶')}
            </Text>
          </View>
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
          style={styles.mobileOverlay}
          onPress={() => setSidebarOpen(false)}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: '100%',
    flexDirection: 'row',
    position: 'relative',
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 16,
    color: colors.textSecondary,
    fontSize: 16,
  },
  mainContent: {
    flex: 1,
    height: '100%',
    overflow: 'auto',
    position: 'relative',
    paddingTop: 16,
  },
  mainContentDragging: {
    // @ts-ignore - Web property
    userSelect: 'none',
  },
  mobileMenuToggle: {
    position: 'absolute',
    top: 16,
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    backgroundColor: colors.glass,
  },
  mobileMenuToggleLTR: {
    left: 16,
  },
  mobileMenuToggleRTL: {
    right: 16,
  },
  sidebarToggle: {
    position: 'fixed' as any,
    top: 24,
    zIndex: 150,
  },
  toggleButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary.DEFAULT,
    backgroundColor: 'transparent',
  },
  toggleButtonHovered: {
    backgroundColor: colors.primary.DEFAULT + '30',
  },
  toggleIcon: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary.DEFAULT,
  },
  mobileOverlay: {
    position: 'fixed' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
})
