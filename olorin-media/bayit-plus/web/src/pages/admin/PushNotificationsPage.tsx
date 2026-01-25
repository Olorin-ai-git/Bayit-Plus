import { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';;
import { useTranslation } from 'react-i18next';
import { Plus, Send, Clock, Trash2, Edit } from 'lucide-react';
import { GlassTable, GlassTableCell } from '@bayit/shared/ui/web';
import { marketingService } from '@/services/adminApi';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import { GlassButton, GlassModal, GlassInput, GlassPageHeader } from '@bayit/shared/ui';
import { useDirection } from '@/hooks/useDirection';
import { useNotifications as useNotificationSystem } from '@olorin/glass-ui/hooks';
import { ADMIN_PAGE_CONFIG } from '../../../../shared/utils/adminConstants';
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
  const notificationSystem = useNotificationSystem();
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
    notificationSystem.show({
      level: 'info',
      message: t('admin.pushNotifications.confirmSend', { title: notification.title }),
      dismissable: true,
      action: {
        label: t('common.send', 'Send'),
        type: 'action',
        onPress: async () => {
          try {
            await marketingService.sendPushNotification(notification.id);
            loadNotifications();
          } catch (error) {
            logger.error('Failed to send push notification', 'PushNotificationsPage', error);
          }
        },
      },
    });
  };

  const handleDelete = (notification: PushNotification) => {
    notificationSystem.show({
      level: 'warning',
      message: t('admin.pushNotifications.confirmDelete', { title: notification.title }),
      dismissable: true,
      action: {
        label: t('common.delete', 'Delete'),
        type: 'action',
        onPress: async () => {
          try {
            await marketingService.deletePushNotification(notification.id);
            loadNotifications();
          } catch (error) {
            logger.error('Failed to delete push notification', 'PushNotificationsPage', error);
          }
        },
      },
    });
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

  const pageConfig = ADMIN_PAGE_CONFIG.notifications;
  const IconComponent = pageConfig.icon;

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: spacing.lg }}>
      <GlassPageHeader
        title={t('admin.titles.pushNotifications')}
        icon={<IconComponent size={24} color={pageConfig.iconColor} strokeWidth={2} />}
        iconColor={pageConfig.iconColor}
        iconBackgroundColor={pageConfig.iconBackgroundColor}
        badge={notifications.length}
        isRTL={isRTL}
      />

      <View style={[styles.actionsRow, { flexDirection }]}>
        <GlassButton
          title={t('admin.pushNotifications.newNotification')}
          variant="primary"
          icon={<Plus size={16} color="white" />}
          onPress={() => setShowCreateModal(true)}
        />
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
          <View className="flex flex-row gap-4 mt-6">
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
          <View className="flex flex-row gap-4 mt-6">
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
        <View className="flex flex-row gap-4 mt-6">
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
  actionsRow: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  notificationBody: {
    fontSize: 12,
    color: colors.textMuted,
  },
  statText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  dateText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: spacing.xs,
  },
  filtersRow: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
    flexWrap: 'wrap',
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  filterTextActive: {
    color: colors.text,
    fontWeight: '600',
  },
  modalContent: {
    gap: spacing.lg,
  },
  formGroup: {
    gap: spacing.sm,
  },
  input: {
    marginBottom: spacing.sm,
  },
  textArea: {
    minHeight: 100,
  },
  modalText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
});

