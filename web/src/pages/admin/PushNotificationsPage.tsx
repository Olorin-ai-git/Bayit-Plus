import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Plus, Send, Clock, Trash2, Edit } from 'lucide-react';
import { GlassTable, GlassTableCell } from '@bayit/shared/ui';
import { marketingService } from '@/services/adminApi';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassButton, GlassModal, GlassInput } from '@bayit/shared/ui';
import { useDirection } from '@/hooks/useDirection';
import { useModal } from '@/contexts/ModalContext';
import logger from '@/utils/logger';

interface PushNotification {
  id: string;
  title: string;
  body: string;
  status: 'draft' | 'sent' | 'scheduled';
  sent: number;
  opened: number;
  scheduled_at?: string;
  created_at: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
}

const statusColors: Record<string, { bg: string; text: string; labelKey: string }> = {
  draft: { bg: 'rgba(107, 114, 128, 0.2)', text: '#6B7280', labelKey: 'admin.pushNotifications.status.draft' },
  sent: { bg: 'rgba(34, 197, 94, 0.2)', text: '#22C55E', labelKey: 'admin.pushNotifications.status.sent' },
  scheduled: { bg: 'rgba(245, 158, 11, 0.2)', text: '#F59E0B', labelKey: 'admin.pushNotifications.status.scheduled' },
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('he-IL', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

export default function PushNotificationsPage() {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const { showConfirm } = useModal();
  const [notifications, setNotifications] = useState<PushNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 20, total: 0 });
  const [filters, setFilters] = useState({ search: '', status: 'all' });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<PushNotification | null>(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [newNotification, setNewNotification] = useState({ title: '', body: '' });
  const [editingNotification, setEditingNotification] = useState<PushNotification | null>(null);
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await marketingService.getPushNotifications({
        ...filters,
        page: pagination.page,
        page_size: pagination.pageSize,
      });
      setNotifications(data.items || []);
      setPagination((prev) => ({ ...prev, total: data.total || 0 }));
    } catch (error) {
      logger.error('Failed to load push notifications', 'PushNotificationsPage', error);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.pageSize]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleSearch = (search: string) => {
    setFilters((prev) => ({ ...prev, search }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  const handleCreate = async () => {
    if (!newNotification.title || !newNotification.body) {
      setErrorMessage(t('admin.pushNotifications.fillRequired'));
      setErrorModalOpen(true);
      return;
    }
    try {
      if (editingNotification) {
        await marketingService.updatePushNotification(editingNotification.id, newNotification);
      } else {
        await marketingService.createPushNotification(newNotification);
      }
      setShowCreateModal(false);
      setNewNotification({ title: '', body: '' });
      setEditingNotification(null);
      loadNotifications();
    } catch (error) {
      logger.error('Failed to create/update push notification', 'PushNotificationsPage', error);
    }
  };

  const handleEdit = (notification: PushNotification) => {
    setEditingNotification(notification);
    setNewNotification({ title: notification.title, body: notification.body });
    setShowCreateModal(true);
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setNewNotification({ title: '', body: '' });
    setEditingNotification(null);
  };

  const handleSend = (notification: PushNotification) => {
    showConfirm(
      t('admin.pushNotifications.confirmSend', { title: notification.title }),
      async () => {
        try {
          await marketingService.sendPushNotification(notification.id);
          loadNotifications();
        } catch (error) {
          logger.error('Failed to send push notification', 'PushNotificationsPage', error);
        }
      },
      { confirmText: t('common.send', 'Send') }
    );
  };

  const handleDelete = (notification: PushNotification) => {
    showConfirm(
      t('admin.pushNotifications.confirmDelete', { title: notification.title }),
      async () => {
        try {
          await marketingService.deletePushNotification(notification.id);
          loadNotifications();
        } catch (error) {
          logger.error('Failed to delete push notification', 'PushNotificationsPage', error);
        }
      },
      { destructive: true, confirmText: t('common.delete', 'Delete') }
    );
  };

  const openScheduleModal = (notification: PushNotification) => {
    setSelectedNotification(notification);
    setScheduleDate('');
    setShowScheduleModal(true);
  };

  const handleSchedule = async () => {
    if (!selectedNotification || !scheduleDate) return;
    try {
      await marketingService.schedulePushNotification(selectedNotification.id, scheduleDate);
      setShowScheduleModal(false);
      loadNotifications();
    } catch (error) {
      logger.error('Failed to schedule push notification', 'PushNotificationsPage', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const style = statusColors[status] || statusColors.draft;
    return (
      <View style={[styles.badge, { backgroundColor: style.bg }]}>
        <Text style={[styles.badgeText, { color: style.text }]}>{t(style.labelKey)}</Text>
      </View>
    );
  };

  const columns = [
    {
      key: 'title',
      label: t('admin.pushNotifications.columns.title'),
      render: (_: any, notification: PushNotification) => (
        <View>
          <Text style={styles.notificationTitle}>{notification.title}</Text>
          <Text style={styles.notificationBody} numberOfLines={1}>{notification.body}</Text>
        </View>
      ),
    },
    { key: 'status', label: t('admin.pushNotifications.columns.status'), width: 100, render: (status: string) => getStatusBadge(status) },
    { key: 'sent', label: t('admin.pushNotifications.columns.sent'), width: 80, render: (sent: number) => <Text style={styles.statText}>{sent.toLocaleString()}</Text> },
    { key: 'opened', label: t('admin.pushNotifications.columns.opened'), width: 80, render: (opened: number) => <Text style={styles.statText}>{opened.toLocaleString()}</Text> },
    {
      key: 'scheduled_at',
      label: t('admin.pushNotifications.columns.scheduledAt'),
      width: 150,
      render: (date: string, notification: PushNotification) => (
        <Text style={styles.dateText}>{date ? formatDate(date) : '-'}</Text>
      ),
    },
    { key: 'created_at', label: t('admin.pushNotifications.columns.created'), width: 150, render: (date: string) => <Text style={styles.dateText}>{formatDate(date)}</Text> },
    {
      key: 'actions',
      label: t('admin.pushNotifications.columns.actions', 'Actions'),
      width: 150,
      render: (_: any, notification: PushNotification) => (
        <View style={[styles.actionsRow, { direction: 'ltr' }]}>
          {notification.status === 'draft' && (
            <>
              <Pressable style={styles.actionButton} onPress={() => handleEdit(notification)} title={t('common.edit', 'Edit')}>
                <Edit size={14} color={colors.primary} />
              </Pressable>
              <Pressable style={styles.actionButton} onPress={() => handleSend(notification)} title={t('admin.pushNotifications.send', 'Send')}>
                <Send size={14} color={colors.success} />
              </Pressable>
              <Pressable style={styles.actionButton} onPress={() => openScheduleModal(notification)} title={t('admin.pushNotifications.schedule', 'Schedule')}>
                <Clock size={14} color={colors.warning} />
              </Pressable>
            </>
          )}
          <Pressable style={styles.actionButton} onPress={() => handleDelete(notification)} title={t('common.delete', 'Delete')}>
            <Trash2 size={14} color={colors.error} />
          </Pressable>
        </View>
      ),
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={[styles.header, { flexDirection }]}>
        <View>
          <Text style={[styles.pageTitle, { textAlign }]}>{t('admin.titles.pushNotifications')}</Text>
          <Text style={[styles.subtitle, { textAlign }]}>{t('admin.pushNotifications.subtitle')}</Text>
        </View>
        <GlassButton title={t('admin.pushNotifications.newNotification')} variant="primary" icon={<Plus size={16} color="white" />} onPress={() => setShowCreateModal(true)} />
      </View>

      <View style={[styles.filtersRow, { flexDirection }]}>
        {['all', 'draft', 'sent', 'scheduled'].map((status) => (
          <Pressable key={status} onPress={() => setFilters((prev) => ({ ...prev, status }))} style={[styles.filterButton, filters.status === status && styles.filterButtonActive]}>
            <Text style={[styles.filterText, filters.status === status && styles.filterTextActive, { textAlign }]}>
              {status === 'all' ? t('admin.pushNotifications.filters.all') : t(statusColors[status]?.labelKey)}
            </Text>
          </Pressable>
        ))}
      </View>

      <GlassTable columns={columns} data={notifications} loading={loading} searchPlaceholder={t('admin.pushNotifications.searchPlaceholder')} onSearch={handleSearch} pagination={pagination} onPageChange={handlePageChange} emptyMessage={t('admin.pushNotifications.emptyMessage')} isRTL={isRTL} />

      <GlassModal visible={showCreateModal} onClose={handleCloseModal} title={editingNotification ? t('admin.pushNotifications.editModal', 'Edit Notification') : t('admin.pushNotifications.createModal')}>
        <View style={styles.modalContent}>
          <View style={styles.formGroup}>
            <GlassInput label={t('admin.pushNotifications.titleLabel')} containerStyle={styles.input} value={newNotification.title} onChangeText={(title) => setNewNotification((p) => ({ ...p, title }))} placeholder={t('admin.push.titlePlaceholder')} />
          </View>
          <View style={styles.formGroup}>
            <GlassInput label={t('admin.pushNotifications.bodyLabel')} containerStyle={[styles.input, styles.textArea]} value={newNotification.body} onChangeText={(body) => setNewNotification((p) => ({ ...p, body }))} placeholder={t('admin.push.bodyPlaceholder')} multiline numberOfLines={3} />
          </View>
          <View style={styles.modalActions}>
            <GlassButton title={t('common.cancel', 'Cancel')} variant="cancel" onPress={handleCloseModal} />
            <GlassButton title={editingNotification ? t('common.save', 'Save') : t('admin.pushNotifications.create')} variant="success" onPress={handleCreate} />
          </View>
        </View>
      </GlassModal>

      <GlassModal visible={showScheduleModal} onClose={() => setShowScheduleModal(false)} title={t('admin.pushNotifications.scheduleModal')}>
        <View style={styles.modalContent}>
          <View style={styles.formGroup}>
            <GlassInput label={t('admin.pushNotifications.dateTimeLabel')} containerStyle={styles.input} value={scheduleDate} onChangeText={setScheduleDate} placeholder={t('placeholder.datetime')} />
          </View>
          <View style={styles.modalActions}>
            <GlassButton title={t('admin.pushNotifications.cancel')} variant="cancel" onPress={() => setShowScheduleModal(false)} />
            <GlassButton title={t('admin.pushNotifications.schedule')} variant="success" onPress={handleSchedule} />
          </View>
        </View>
      </GlassModal>

      {/* Error Modal */}
      <GlassModal
        visible={errorModalOpen}
        title={t('common.error')}
        onClose={() => setErrorModalOpen(false)}
        dismissable={true}
      >
        <Text style={styles.modalText}>{errorMessage}</Text>
        <View style={styles.modalActions}>
          <GlassButton
            title={t('common.ok')}
            onPress={() => setErrorModalOpen(false)}
            variant="success"
          />
        </View>
      </GlassModal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { padding: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  pageTitle: { fontSize: 24, fontWeight: 'bold', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted, marginTop: spacing.xs },
  filtersRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  filterButton: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md },
  filterButtonActive: { backgroundColor: colors.primary },
  filterText: { fontSize: 14, color: colors.textMuted },
  filterTextActive: { color: colors.text, fontWeight: '500' },
  notificationTitle: { fontSize: 14, fontWeight: '500', color: colors.text },
  notificationBody: { fontSize: 12, color: colors.textMuted },
  statText: { fontSize: 14, color: colors.text },
  dateText: { fontSize: 12, color: colors.textMuted },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.full, alignSelf: 'flex-start' },
  badgeText: { fontSize: 12, fontWeight: '500' },
  actionsRow: { flexDirection: 'row', gap: spacing.xs },
  actionButton: { width: 32, height: 32, borderRadius: borderRadius.sm, backgroundColor: colors.glass, justifyContent: 'center', alignItems: 'center' },
  modalContent: { gap: spacing.md },
  formGroup: { gap: spacing.xs },
  formLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  input: { backgroundColor: colors.backgroundLighter, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.glassBorder, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.text, fontSize: 14 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.md },
  modalText: {
    fontSize: 14,
    color: colors.text,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
});
