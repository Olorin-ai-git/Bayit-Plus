/**
 * Admin Widgets Page
 *
 * CRUD management interface for system widgets - floating overlays
 * that display live streams or iframe content.
 */

import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Plus, Edit, Trash2, X, AlertCircle, Eye, EyeOff, Tv, Globe } from 'lucide-react';
import DataTable from '@/components/admin/DataTable';
import { widgetsService, contentService } from '@/services/adminApi';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { useDirection } from '@/hooks/useDirection';
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
  const [items, setItems] = useState<Widget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 20, total: 0 });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<WidgetFormData>>({});
  const [deleting, setDeleting] = useState<string | null>(null);
  const [liveChannels, setLiveChannels] = useState<LiveChannel[]>([]);

  // Load live channels for the dropdown
  const loadLiveChannels = useCallback(async () => {
    try {
      const response = await contentService.getLiveChannels({ page_size: 100 });
      setLiveChannels(response.items || []);
    } catch (err) {
      logger.error('Failed to load live channels', 'WidgetsPage', err);
    }
  }, []);

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
    loadLiveChannels();
  }, [loadWidgets, loadLiveChannels]);

  const handleEdit = (item: Widget) => {
    setEditingId(item.id);
    setEditData({
      title: item.title,
      description: item.description || '',
      icon: item.icon || '',
      content_type: item.content.content_type,
      live_channel_id: item.content.live_channel_id || '',
      iframe_url: item.content.iframe_url || '',
      iframe_title: item.content.iframe_title || '',
      position_x: item.position.x,
      position_y: item.position.y,
      position_width: item.position.width,
      position_height: item.position.height,
      is_muted: item.is_muted,
      is_closable: item.is_closable,
      is_draggable: item.is_draggable,
      visible_to_roles: item.visible_to_roles,
      target_pages: item.target_pages,
      order: item.order,
    });
  };

  const handleCreate = () => {
    setEditingId('new');
    setEditData({
      title: '',
      description: '',
      icon: '',
      content_type: 'live_channel',
      live_channel_id: '',
      iframe_url: '',
      iframe_title: '',
      position_x: 20,
      position_y: 100,
      position_width: 320,
      position_height: 180,
      is_muted: true,
      is_closable: true,
      is_draggable: true,
      visible_to_roles: ['user'],
      target_pages: [],
      order: items.length,
    });
  };

  const handleSaveEdit = async () => {
    if (!editData.title) {
      setError(t('admin.widgets.errors.titleRequired'));
      return;
    }

    if (editData.content_type === 'live_channel' && !editData.live_channel_id) {
      setError(t('admin.widgets.errors.selectChannel'));
      return;
    }

    if (editData.content_type === 'iframe' && !editData.iframe_url) {
      setError(t('admin.widgets.errors.iframeUrlRequired'));
      return;
    }

    try {
      const payload = {
        title: editData.title!,
        description: editData.description || null,
        icon: editData.icon || null,
        content: {
          content_type: editData.content_type as WidgetContentType,
          live_channel_id: editData.content_type === 'live_channel' ? editData.live_channel_id : null,
          iframe_url: editData.content_type === 'iframe' ? editData.iframe_url : null,
          iframe_title: editData.content_type === 'iframe' ? editData.iframe_title : null,
        },
        position: {
          x: editData.position_x || 20,
          y: editData.position_y || 100,
          width: editData.position_width || 320,
          height: editData.position_height || 180,
          z_index: 100,
        },
        is_muted: editData.is_muted ?? true,
        is_closable: editData.is_closable ?? true,
        is_draggable: editData.is_draggable ?? true,
        visible_to_roles: editData.visible_to_roles || ['user'],
        visible_to_subscription_tiers: [],
        target_pages: editData.target_pages || [],
        order: editData.order || 0,
      };

      if (editingId === 'new') {
        await widgetsService.createWidget(payload);
      } else {
        await widgetsService.updateWidget(editingId!, payload);
      }

      setEditingId(null);
      setEditData({});
      await loadWidgets();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save widget';
      logger.error(msg, 'WidgetsPage', err);
      setError(msg);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('admin.widgets.confirmDelete'))) return;
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
        <View style={[styles.header, isRTL && styles.headerRTL]}>
          <View>
            <Text style={[styles.pageTitle, isRTL && styles.textRTL]}>{t('admin.widgets.title')}</Text>
            <Text style={[styles.subtitle, isRTL && styles.textRTL]}>
              {t('admin.widgets.subtitle')}
            </Text>
          </View>
          <Pressable onPress={handleCreate} style={styles.addButton}>
            <Plus size={18} color={colors.text} />
            <Text style={styles.addButtonText}>{t('admin.widgets.newWidget')}</Text>
          </Pressable>
        </View>

        {error && (
          <View style={[styles.errorContainer, { marginBottom: spacing.lg }]}>
            <AlertCircle size={18} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={() => setError(null)}>
              <X size={18} color="#ef4444" />
            </Pressable>
          </View>
        )}

        {editingId && (
          <View style={styles.editForm}>
            <Text style={styles.formTitle}>
              {editingId === 'new' ? t('admin.widgets.newWidget') : t('admin.widgets.editWidget')}
            </Text>

          {/* Basic Info */}
          <TextInput
            style={styles.input}
            placeholder={t('admin.widgets.form.title')}
            placeholderTextColor={colors.textMuted}
            value={editData.title || ''}
            onChangeText={(value) => setEditData({ ...editData, title: value })}
          />
          <TextInput
            style={styles.input}
            placeholder={t('admin.widgets.form.description')}
            placeholderTextColor={colors.textMuted}
            value={editData.description || ''}
            onChangeText={(value) => setEditData({ ...editData, description: value })}
          />
          <TextInput
            style={styles.input}
            placeholder={t('admin.widgets.form.icon')}
            placeholderTextColor={colors.textMuted}
            value={editData.icon || ''}
            onChangeText={(value) => setEditData({ ...editData, icon: value })}
          />

          {/* Content Type Selection */}
          <Text style={styles.sectionLabel}>{t('admin.widgets.form.contentType')}</Text>
          <View style={styles.radioGroup}>
            <Pressable
              style={[
                styles.radioOption,
                editData.content_type === 'live_channel' && styles.radioOptionSelected,
              ]}
              onPress={() => setEditData({ ...editData, content_type: 'live_channel' })}
            >
              <Tv size={16} color={editData.content_type === 'live_channel' ? colors.primary : colors.textMuted} />
              <Text style={[styles.radioLabel, editData.content_type === 'live_channel' && styles.radioLabelSelected]}>
                {t('admin.widgets.contentTypes.liveChannel')}
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.radioOption,
                editData.content_type === 'iframe' && styles.radioOptionSelected,
              ]}
              onPress={() => setEditData({ ...editData, content_type: 'iframe' })}
            >
              <Globe size={16} color={editData.content_type === 'iframe' ? colors.primary : colors.textMuted} />
              <Text style={[styles.radioLabel, editData.content_type === 'iframe' && styles.radioLabelSelected]}>
                {t('admin.widgets.contentTypes.iframe')}
              </Text>
            </Pressable>
          </View>

          {/* Content Config */}
          {editData.content_type === 'live_channel' && (
            <View style={styles.selectContainer}>
              <Text style={styles.inputLabel}>{t('admin.widgets.form.selectChannel')}</Text>
              <select
                value={editData.live_channel_id || ''}
                onChange={(e) => setEditData({ ...editData, live_channel_id: e.target.value })}
                style={styles.select as any}
              >
                <option value="">{t('admin.widgets.form.channelPlaceholder')}</option>
                {liveChannels.map((ch) => (
                  <option key={ch.id} value={ch.id}>{ch.name}</option>
                ))}
              </select>
            </View>
          )}

          {editData.content_type === 'iframe' && (
            <>
              <TextInput
                style={styles.input}
                placeholder={t('admin.widgets.form.iframeUrl')}
                placeholderTextColor={colors.textMuted}
                value={editData.iframe_url || ''}
                onChangeText={(value) => setEditData({ ...editData, iframe_url: value })}
              />
              <TextInput
                style={styles.input}
                placeholder={t('admin.widgets.form.iframeTitle')}
                placeholderTextColor={colors.textMuted}
                value={editData.iframe_title || ''}
                onChangeText={(value) => setEditData({ ...editData, iframe_title: value })}
              />
            </>
          )}

          {/* Position */}
          <Text style={styles.sectionLabel}>{t('admin.widgets.form.position')}</Text>
          <View style={styles.positionRow}>
            <View style={styles.positionField}>
              <Text style={styles.inputLabel}>X</Text>
              <TextInput
                style={styles.smallInput}
                value={String(editData.position_x || 20)}
                onChangeText={(v) => setEditData({ ...editData, position_x: parseInt(v) || 0 })}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.positionField}>
              <Text style={styles.inputLabel}>Y</Text>
              <TextInput
                style={styles.smallInput}
                value={String(editData.position_y || 100)}
                onChangeText={(v) => setEditData({ ...editData, position_y: parseInt(v) || 0 })}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.positionField}>
              <Text style={styles.inputLabel}>Width</Text>
              <TextInput
                style={styles.smallInput}
                value={String(editData.position_width || 320)}
                onChangeText={(v) => setEditData({ ...editData, position_width: parseInt(v) || 320 })}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.positionField}>
              <Text style={styles.inputLabel}>Height</Text>
              <TextInput
                style={styles.smallInput}
                value={String(editData.position_height || 180)}
                onChangeText={(v) => setEditData({ ...editData, position_height: parseInt(v) || 180 })}
                keyboardType="number-pad"
              />
            </View>
          </View>

          {/* Behavior Options */}
          <Text style={styles.sectionLabel}>{t('admin.widgets.form.behavior')}</Text>
          <View style={styles.checkboxGroup}>
            <View style={styles.checkboxRow}>
              <input
                type="checkbox"
                id="is_muted"
                checked={editData.is_muted ?? true}
                onChange={(e) => setEditData({ ...editData, is_muted: e.target.checked })}
                style={styles.checkbox}
              />
              <Text style={styles.checkboxLabel}>{t('admin.widgets.form.mutedByDefault')}</Text>
            </View>
            <View style={styles.checkboxRow}>
              <input
                type="checkbox"
                id="is_closable"
                checked={editData.is_closable ?? true}
                onChange={(e) => setEditData({ ...editData, is_closable: e.target.checked })}
                style={styles.checkbox}
              />
              <Text style={styles.checkboxLabel}>{t('admin.widgets.form.closable')}</Text>
            </View>
            <View style={styles.checkboxRow}>
              <input
                type="checkbox"
                id="is_draggable"
                checked={editData.is_draggable ?? true}
                onChange={(e) => setEditData({ ...editData, is_draggable: e.target.checked })}
                style={styles.checkbox}
              />
              <Text style={styles.checkboxLabel}>{t('admin.widgets.form.draggable')}</Text>
            </View>
          </View>

          {/* Target Pages */}
          <Text style={styles.sectionLabel}>{t('admin.widgets.form.targetPages')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('admin.widgets.form.targetPagesPlaceholder')}
            placeholderTextColor={colors.textMuted}
            value={editData.target_pages?.join(', ') || ''}
            onChangeText={(value) => setEditData({
              ...editData,
              target_pages: value ? value.split(',').map(s => s.trim()) : [],
            })}
          />

          {/* Order */}
          <TextInput
            style={styles.input}
            placeholder={t('admin.widgets.form.order')}
            placeholderTextColor={colors.textMuted}
            value={String(editData.order || 0)}
            onChangeText={(value) => setEditData({ ...editData, order: parseInt(value) || 0 })}
            keyboardType="number-pad"
          />

          <View style={styles.formActions}>
            <Pressable onPress={() => setEditingId(null)} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>{t('admin.widgets.actions.cancel')}</Text>
            </Pressable>
            <Pressable onPress={handleSaveEdit} style={styles.saveBtn}>
              <Text style={styles.saveBtnText}>{t('admin.widgets.actions.save')}</Text>
            </Pressable>
          </View>
        </View>
      )}

        <DataTable
          columns={columns}
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
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  textRTL: {
    textAlign: 'right',
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
