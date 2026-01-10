/**
 * Admin Widgets Page
 *
 * CRUD management interface for system widgets - floating overlays
 * that display live streams or iframe content.
 */

import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Plus, Edit, Trash2, X, AlertCircle, Eye, EyeOff, Tv, Globe } from 'lucide-react';
import DataTable from '@/components/admin/DataTable';
import WidgetFormModal from '@/components/widgets/WidgetFormModal';
import { widgetsService } from '@/services/adminApi';
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
      const response = await widgetsService.getWidgets({
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
        await widgetsService.updateWidget(editingWidget.id, payload);
      } else {
        // Create new widget
        await widgetsService.createWidget(payload);
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
          await widgetsService.deleteWidget(id);
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
        await widgetsService.unpublishWidget(widget.id);
      } else {
        await widgetsService.publishWidget(widget.id);
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
        <View style={styles.titleCell}>
          {item.icon && <Text style={styles.icon}>{item.icon}</Text>}
          <Text style={styles.cellText}>{title}</Text>
        </View>
      ),
    },
    {
      key: 'content',
      label: t('admin.widgets.columns.contentType'),
      render: (_: any, item: Widget) => (
        <View style={styles.contentTypeCell}>
          {item.content.content_type === 'live_channel' ? (
            <>
              <Tv size={14} color={colors.primary} />
              <Text style={[styles.cellText, { marginLeft: spacing.xs }]}>{t('admin.widgets.contentTypes.liveChannel')}</Text>
            </>
          ) : (
            <>
              <Globe size={14} color={colors.secondary} />
              <Text style={[styles.cellText, { marginLeft: spacing.xs }]}>{t('admin.widgets.contentTypes.iframe')}</Text>
            </>
          )}
        </View>
      ),
    },
    {
      key: 'visible_to_roles',
      label: t('admin.widgets.columns.targetRoles'),
      render: (roles: string[]) => (
        <Text style={styles.cellText}>{roles?.join(', ') || t('admin.widgets.allRoles')}</Text>
      ),
    },
    {
      key: 'target_pages',
      label: t('admin.widgets.columns.targetPages'),
      render: (pages: string[]) => (
        <Text style={styles.cellText}>{pages?.length ? pages.join(', ') : t('admin.widgets.allPages')}</Text>
      ),
    },
    {
      key: 'is_active',
      label: t('admin.widgets.columns.status'),
      render: (isActive: boolean, item: Widget) => (
        <Pressable onPress={() => handleToggleActive(item)}>
          <View style={[styles.badge, { backgroundColor: isActive ? '#10b98120' : '#6b728020' }]}>
            {isActive ? (
              <Eye size={12} color="#10b981" />
            ) : (
              <EyeOff size={12} color="#6b7280" />
            )}
            <Text style={[styles.badgeText, { color: isActive ? '#10b981' : '#6b7280', marginLeft: 4 }]}>
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
      render: (order: number) => <Text style={styles.cellText}>{order}</Text>,
    },
    {
      key: 'actions',
      label: '',
      width: 100,
      render: (_: any, item: Widget) => (
        <View style={[styles.actionsCell, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Pressable
            onPress={() => handleEdit(item)}
            style={[styles.actionButton, { backgroundColor: '#3b82f680' }]}
          >
            <Edit size={14} color="#3b82f6" />
          </Pressable>
          <Pressable
            onPress={() => handleDelete(item.id)}
            disabled={deleting === item.id}
            style={[styles.actionButton, { backgroundColor: '#ef444480', opacity: deleting === item.id ? 0.5 : 1 }]}
          >
            <Trash2 size={14} color="#ef4444" />
          </Pressable>
        </View>
      ),
    },
  ];

  return (
    <View style={styles.pageContainer}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={[styles.header, { flexDirection }]}>
          <View>
            <Text style={[styles.pageTitle, { textAlign }]}>{t('admin.widgets.title')}</Text>
            <Text style={[styles.subtitle, { textAlign }]}>
              {t('admin.widgets.subtitle')}
            </Text>
          </View>
          <Pressable onPress={handleCreate} style={styles.addButton}>
            <Plus size={18} color={colors.text} />
            <Text style={styles.addButtonText}>{t('admin.widgets.newWidget')}</Text>
          </Pressable>
        </View>

        {error && (
          <View style={[styles.errorContainer, { marginBottom: spacing.lg, flexDirection }]}>
            <AlertCircle size={18} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={() => setError(null)}>
              <X size={18} color="#ef4444" />
            </Pressable>
          </View>
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

        <DataTable
          columns={isRTL ? [...columns].reverse() : columns}
          data={items}
          loading={isLoading}
          pagination={pagination}
          onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
          emptyMessage={t('admin.widgets.emptyMessage')}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  pageContainer: {
    flex: 1,
    width: '100%' as any,
    minHeight: '100%' as any,
  },
  container: {
    flex: 1,
    width: '100%' as any,
  },
  contentContainer: {
    padding: spacing.lg,
    minWidth: '100%' as any,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  pageTitle: { fontSize: 24, fontWeight: 'bold', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted, marginTop: spacing.xs },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.primary, borderRadius: borderRadius.md },
  addButtonText: { color: colors.text, fontWeight: '500', fontSize: 14 },
  errorContainer: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, backgroundColor: '#ef444420', borderColor: '#ef444440', borderWidth: 1, borderRadius: borderRadius.md },
  errorText: { flex: 1, color: '#ef4444', fontSize: 14 },
  editForm: { backgroundColor: colors.backgroundLighter, padding: spacing.lg, borderRadius: borderRadius.lg, marginBottom: spacing.lg },
  formTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: spacing.md },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginTop: spacing.md, marginBottom: spacing.sm },
  inputLabel: { fontSize: 12, color: colors.textMuted, marginBottom: spacing.xs },
  input: { paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, color: colors.text, fontSize: 14, marginBottom: spacing.md },
  smallInput: { paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, color: colors.text, fontSize: 14, width: 80 },
  radioGroup: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  radioOption: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  radioOptionSelected: { borderColor: colors.primary, backgroundColor: `${colors.primary}20` },
  radioLabel: { color: colors.textMuted, fontSize: 14 },
  radioLabelSelected: { color: colors.primary, fontWeight: '600' },
  selectContainer: { marginBottom: spacing.md },
  select: { width: '100%', padding: spacing.md, borderRadius: borderRadius.md, border: `1px solid ${colors.border}`, backgroundColor: colors.background, color: colors.text, fontSize: 14 },
  positionRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  positionField: { flex: 1 },
  checkboxGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, marginBottom: spacing.md },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  checkbox: { width: 18, height: 18 },
  checkboxLabel: { color: colors.text, fontSize: 14 },
  formActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  cancelBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  cancelBtnText: { color: colors.text, fontWeight: '600' },
  saveBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: borderRadius.md, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  saveBtnText: { color: colors.text, fontWeight: '600' },
  cellText: { fontSize: 14, color: colors.text },
  titleCell: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  icon: { fontSize: 18 },
  contentTypeCell: { flexDirection: 'row', alignItems: 'center' },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.full, alignSelf: 'flex-start' },
  badgeText: { fontSize: 12, fontWeight: '500' },
  actionsCell: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  actionButton: { padding: spacing.sm, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center' },
});
