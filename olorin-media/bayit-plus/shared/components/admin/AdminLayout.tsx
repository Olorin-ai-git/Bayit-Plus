/**
 * AdminLayout Component
 * Main layout wrapper for admin pages
 */

import React, { ReactNode } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useDirection } from '../../hooks/useDirection';
import { AdminSidebar } from './AdminSidebar';
import { AdminTopBar } from './AdminTopBar';
import { colors } from '../../theme';

interface Breadcrumb {
  label: string;
  route?: string;
}

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
  breadcrumbs?: Breadcrumb[];
  actions?: ReactNode;
  hideSidebar?: boolean;
  hideTopBar?: boolean;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  title,
  breadcrumbs,
  actions,
  hideSidebar = false,
  hideTopBar = false,
}) => {
  // On TV, we might want a simplified layout
  const isTV = Platform.isTV;
  const { flexDirection } = useDirection();

  return (
    <View style={[styles.container, { flexDirection }]}>
      {/* Sidebar - hidden on TV or when explicitly disabled */}
      {!hideSidebar && !isTV && (
        <AdminSidebar />
      )}

      {/* Main Content Area */}
      <View style={styles.mainContent}>
        {/* Top Bar */}
        {!hideTopBar && (
          <AdminTopBar
            title={title}
            breadcrumbs={breadcrumbs}
            actions={actions}
          />
        )}

        {/* Page Content */}
        <View style={styles.content}>
          {children}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.background,
  },
  mainContent: {
    flex: 1,
    flexDirection: 'column',
  },
  content: {
    flex: 1,
    backgroundColor: colors.background,
  },
});

export default AdminLayout;
