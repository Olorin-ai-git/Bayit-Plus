/**
 * Admin Widgets Page
 *
 * CRUD management interface for system widgets - floating overlays
 * that display live streams or iframe content.
 */

import { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Plus, Edit, Trash2, X, AlertCircle, Eye, EyeOff, Tv, Globe, Film, Podcast, Radio } from 'lucide-react';
import { GlassButton, GlassCard } from '@bayit/shared/ui';
import { GlassTable, GlassTableCell } from '@bayit/shared/ui/web';
import WidgetFormModal from '@/components/widgets/WidgetFormModal';
import { adminWidgetsService } from '@/services/adminApi';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { useDirection } from '@/hooks/useDirection';
import { useModal } from '@/contexts/ModalContext';
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
  const { showConfirm } = useModal();
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
    showConfirm(
      t('admin.widgets.confirmDelete'),
      async () => {
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
      { destructive: true, confirmText: t('common.delete', 'Delete') }
    );
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
          <View className={`flex flex-row items-center px-2 py-1 rounded-full ${isActive ? 'bg-green-500/20' : 'bg-gray-500/20'}`}>
            {isActive ? (
              <Eye size={12} color="#10b981" />
            ) : (
              <EyeOff size={12} color="#6b7280" />
            )}
            <Text className={`text-xs font-medium ml-1 ${isActive ? 'text-green-500' : 'text-gray-500'}`}>
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
        <View className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} gap-2 items-center`}>
          <Pressable
            onPress={() => handleEdit(item)}
            className="p-2 rounded-lg bg-purple-500/50 justify-center items-center"
          >
            <Edit size={14} color="#a855f7" />
          </Pressable>
          <Pressable
            onPress={() => handleDelete(item.id)}
            disabled={deleting === item.id}
            className={`p-2 rounded-lg bg-red-500/50 justify-center items-center ${deleting === item.id ? 'opacity-50' : ''}`}
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
        <View className={`flex ${flexDirection} justify-between items-start mb-6`}>
          <View>
            <Text className={`text-2xl font-bold text-white ${textAlign}`}>{t('admin.widgets.title')}</Text>
            <Text className={`text-sm text-gray-400 mt-1 ${textAlign}`}>
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
            <View className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} items-center gap-4`}>
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

