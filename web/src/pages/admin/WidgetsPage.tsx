/**
 * Admin Widgets Page
 *
 * CRUD management interface for system widgets - floating overlays
 * that display live streams or iframe content.
 */

import { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Plus, Edit, Trash2, X, AlertCircle, Eye, EyeOff, Tv, Globe, Film, Podcast, Radio } from 'lucide-react';
import { GlassButton, GlassCard } from '@bayit/shared/ui';
import { GlassTable, GlassTableCell } from '@bayit/shared/ui/web';
import WidgetFormModal from '@/components/widgets/WidgetFormModal';
import { adminWidgetsService } from '@/services/adminApi';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import { useDirection } from '@/hooks/useDirection';
import { useNotifications } from '@olorin/glass-ui/hooks';
import logger from '@/utils/logger';
import type { Widget, WidgetFormData, WidgetContentType, DEFAULT_WIDGET_FORM } from '@/types/widget';

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
}

interface LiveChannel {
  id: string;
  name: string;
}

export default function WidgetsPage() {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const notifications = useNotifications();
  const [items, setItems] = useState<Widget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 20, total: 0 });
  const [showWidgetForm, setShowWidgetForm] = useState(false);
  const [editingWidget, setEditingWidget] = useState<Widget | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadWidgets = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await adminWidgetsService.getWidgets({
        page: pagination.page,
        page_size: pagination.pageSize,
      });
      setItems(response.items || []);
      setPagination((prev) => ({ ...prev, total: response.total || 0 }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load widgets';
      logger.error(msg, 'WidgetsPage', err);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.pageSize]);

  useEffect(() => {
    loadWidgets();
  }, [loadWidgets]);

  const handleEdit = (item: Widget) => {
    setEditingWidget(item);
    setShowWidgetForm(true);
  };

  const handleCreate = () => {
    setEditingWidget(null);
    setShowWidgetForm(true);
  };

  const handleSaveWidget = async (payload: any) => {
    try {
      if (editingWidget) {
        // Update existing widget
        await adminWidgetsService.updateWidget(editingWidget.id, payload);
      } else {
        // Create new widget
        await adminWidgetsService.createWidget(payload);
      }

      setShowWidgetForm(false);
      setEditingWidget(null);
      setError(null);
      await loadWidgets();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save widget';
      logger.error(msg, 'WidgetsPage', err);
      setError(msg);
      throw err; // Re-throw so modal can handle the error
    }
  };

  const handleDelete = (id: string) => {
    notifications.show({
      level: 'warning',
      message: t('admin.widgets.confirmDelete'),
      dismissable: true,
      action: {
        label: t('common.delete', 'Delete'),
        type: 'action',
        onPress: async () => {
          try {
            setDeleting(id);
            await adminWidgetsService.deleteWidget(id);
            setItems(items.filter((item) => item.id !== id));
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to delete widget';
            logger.error(msg, 'WidgetsPage', err);
            setError(msg);
          } finally {
            setDeleting(null);
          }
        },
      },
    });
  };

  const handleToggleActive = async (widget: Widget) => {
    try {
      if (widget.is_active) {
        await adminWidgetsService.unpublishWidget(widget.id);
      } else {
        await adminWidgetsService.publishWidget(widget.id);
      }
      await loadWidgets();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update widget';
      logger.error(msg, 'WidgetsPage', err);
      setError(msg);
    }
  };

  const columns = [
    {
      key: 'title',
      label: t('admin.widgets.columns.title'),
      render: (title: string, item: Widget) => (
        <View className="flex flex-row items-center gap-2">
          {item.icon && <Text className="text-lg">{item.icon}</Text>}
          <Text className="text-sm text-white">{title}</Text>
        </View>
      ),
    },
    {
      key: 'content',
      label: t('admin.widgets.columns.contentType'),
      render: (_: any, item: Widget) => {
        const contentTypeConfig: Record<string, { icon: React.ReactNode; label: string }> = {
          live_channel: { icon: <Tv size={14} color={colors.primary} />, label: t('admin.widgets.contentTypes.liveChannel') },
          live: { icon: <Tv size={14} color={colors.primary} />, label: t('admin.widgets.contentTypes.live') },
          vod: { icon: <Film size={14} color={colors.info} />, label: t('admin.widgets.contentTypes.vod') },
          podcast: { icon: <Podcast size={14} color={colors.success} />, label: t('admin.widgets.contentTypes.podcast') },
          radio: { icon: <Radio size={14} color={colors.warning} />, label: t('admin.widgets.contentTypes.radio') },
          iframe: { icon: <Globe size={14} color={colors.secondary} />, label: t('admin.widgets.contentTypes.iframe') },
        };

        const config = contentTypeConfig[item.content.content_type] || {
          icon: <Globe size={14} color={colors.secondary} />,
          label: item.content.content_type,
        };

        return (
          <View className="flex flex-row items-center">
            {config.icon}
            <Text className="text-sm text-white ml-1">{config.label}</Text>
          </View>
        );
      },
    },
    {
      key: 'visible_to_roles',
      label: t('admin.widgets.columns.targetRoles'),
      render: (roles: string[]) => (
        <Text className="text-sm text-white">{roles?.join(', ') || t('admin.widgets.allRoles')}</Text>
      ),
    },
    {
      key: 'target_pages',
      label: t('admin.widgets.columns.targetPages'),
      render: (pages: string[]) => (
        <Text className="text-sm text-white">{pages?.length ? pages.join(', ') : t('admin.widgets.allPages')}</Text>
      ),
    },
    {
      key: 'is_active',
      label: t('admin.widgets.columns.status'),
      render: (isActive: boolean, item: Widget) => (
        <Pressable onPress={() => handleToggleActive(item)}>
          <View style={[
            styles.statusBadge,
            isActive ? styles.statusBadgeActive : styles.statusBadgeInactive
          ]}>
            {isActive ? (
              <Eye size={12} color="#10b981" />
            ) : (
              <EyeOff size={12} color="#6b7280" />
            )}
            <Text style={[
              styles.statusBadgeText,
              isActive ? styles.statusBadgeTextActive : styles.statusBadgeTextInactive
            ]}>
              {isActive ? t('admin.widgets.status.active') : t('admin.widgets.status.inactive')}
            </Text>
          </View>
        </Pressable>
      ),
    },
    {
      key: 'order',
      label: t('admin.widgets.columns.order'),
      width: 70,
      render: (order: number) => <Text className="text-sm text-white">{order}</Text>,
    },
    {
      key: 'actions',
      label: '',
      width: 100,
      render: (_: any, item: Widget) => (
        <View style={[
          styles.actionsContainer,
          isRTL && styles.actionsContainerRTL
        ]}>
          <Pressable
            onPress={() => handleEdit(item)}
            className="p-2 rounded-lg bg-purple-500/50 justify-center items-center"
          >
            <Edit size={14} color="#a855f7" />
          </Pressable>
          <Pressable
            onPress={() => handleDelete(item.id)}
            disabled={deleting === item.id}
            style={[
              styles.deleteButton,
              deleting === item.id && styles.deleteButtonDisabled
            ]}
          >
            <Trash2 size={14} color="#ef4444" />
          </Pressable>
        </View>
      ),
    },
  ];

  return (
    <View className="flex-1 w-full min-h-full">
      <ScrollView className="flex-1 w-full" contentContainerStyle={{ padding: spacing.lg, minWidth: '100%' }}>
        <View style={[
          styles.headerContainer,
          isRTL && styles.headerContainerRTL
        ]}>
          <View>
            <Text style={[styles.headerTitle, { textAlign }]}>{t('admin.widgets.title')}</Text>
            <Text style={[styles.headerSubtitle, { textAlign }]}>
              {t('admin.widgets.subtitle')}
            </Text>
          </View>
          <GlassButton
            title={t('admin.widgets.newWidget')}
            onPress={handleCreate}
            variant="primary"
            icon={<Plus size={18} color={colors.text} />}
          />
        </View>

        {error && (
          <GlassCard className="p-4 mb-6">
            <View style={[
              styles.errorContainer,
              isRTL && styles.errorContainerRTL
            ]}>
              <AlertCircle size={18} color={colors.error} />
              <Text className="flex-1 text-red-500 text-sm">{error}</Text>
              <Pressable onPress={() => setError(null)}>
                <X size={18} color={colors.error} />
              </Pressable>
            </View>
          </GlassCard>
        )}

        {/* Widget Form Modal */}
        <WidgetFormModal
          visible={showWidgetForm}
          onClose={() => {
            setShowWidgetForm(false);
            setEditingWidget(null);
          }}
          onSave={handleSaveWidget}
          initialData={editingWidget}
          isAdminWidget={true}
        />

        <GlassTable
          columns={columns}
          data={items}
          loading={isLoading}
          pagination={pagination}
          onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
          emptyMessage={t('admin.widgets.emptyMessage')}
          isRTL={isRTL}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  headerContainerRTL: {
    flexDirection: 'row-reverse',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  errorContainerRTL: {
    flexDirection: 'row-reverse',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  statusBadgeActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  statusBadgeInactive: {
    backgroundColor: 'rgba(107, 114, 128, 0.2)',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  statusBadgeTextActive: {
    color: '#22c55e',
  },
  statusBadgeTextInactive: {
    color: '#6b7280',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  actionsContainerRTL: {
    flexDirection: 'row-reverse',
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonDisabled: {
    opacity: 0.5,
  },
});
