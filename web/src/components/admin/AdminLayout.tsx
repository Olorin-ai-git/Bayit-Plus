import { View, StyleSheet, Text, ActivityIndicator } from 'react-native'
import { Outlet, Navigate } from 'react-router-dom'
import AdminSidebar from './AdminSidebar'
import { colors } from '@bayit/shared/theme'
import { useAuthStore } from '@/stores/authStore'

export default function AdminLayout() {
  const { isAuthenticated, isLoading, isAdmin } = useAuthStore()

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
      {/* Sidebar */}
      <AdminSidebar />

      {/* Main Content */}
      <View style={styles.content}>
        <Outlet />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: '100vh' as any,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    overflow: 'auto' as any,
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
})
