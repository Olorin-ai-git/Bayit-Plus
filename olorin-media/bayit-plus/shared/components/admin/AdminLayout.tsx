/**
 * AdminLayout Component
 * Main layout wrapper for admin pages
 */

import React, { ReactNode } from 'react';
import { View, Platform } from 'react-native';
import { useDirection } from '../../hooks/useDirection';
import { AdminSidebar } from './AdminSidebar';
import { AdminTopBar } from './AdminTopBar';

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
    <View className="flex-1 bg-background" style={{ flexDirection }}>
      {/* Sidebar - hidden on TV or when explicitly disabled */}
      {!hideSidebar && !isTV && (
        <AdminSidebar />
      )}

      {/* Main Content Area */}
      <View className="flex-1 flex-col">
        {/* Top Bar */}
        {!hideTopBar && (
          <AdminTopBar
            title={title}
            breadcrumbs={breadcrumbs}
            actions={actions}
          />
        )}

        {/* Page Content */}
        <View className="flex-1 bg-background">
          {children}
        </View>
      </View>
    </View>
  );
};

export default AdminLayout;
