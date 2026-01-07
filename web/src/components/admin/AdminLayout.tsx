import { View, StyleSheet } from 'react-native'
import { Outlet } from 'react-router-dom'
import AdminSidebar from './AdminSidebar'
import { colors } from '@bayit/shared/theme'

export default function AdminLayout() {
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
})
