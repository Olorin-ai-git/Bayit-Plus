/**
 * PushNotificationsScreen
 * Push notification management with targeting and scheduling
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@bayit/shared/hooks';
import { AdminLayout, DataTable, Column } from '@bayit/shared/admin';
import { marketingService, MarketingFilter } from '../../services/adminApi';
import { PushNotification, AudienceFilter } from '../../types/rbac';
import { colors, spacing, borderRadius, fontSize } from '@bayit/shared/theme';
import { formatDate, formatDateTime } from '../../utils/formatters';
import { getStatusColor } from '../../utils/adminConstants';

export const PushNotificationsScreen: React.FC = () => {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const [notifications, setNotifications] = useState<PushNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalNotifications, setTotalNotifications] = useState(0);
  const [showComposer, setShowComposer] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<PushNotification | null>(null);
  const [saving, setSaving] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');

  const [filters, setFilters] = useState<MarketingFilter>({ search: '', status: '', page: 1, page_size: 20 });

  const [formData, setFormData] = useState({
    title: '',
    body: '',
    deep_link: '',
    audience_filter: {} as AudienceFilter,
  });

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await marketingService.getPushNotifications(filters);
      setNotifications(response.items);
      setTotalNotifications(response.total);
    } catch (err) {
      console.error('Error loading notifications:', err);
      setError(t('admin.push.loadError', 'Failed to load notifications. Please try again.'));
      setNotifications([]);
      setTotalNotifications(0);
    } finally {
      setLoading(false);
    }
  }, [filters, t]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleSearch = (text: string) => setFilters(prev => ({ ...prev, search: text, page: 1 }));
  const handlePageChange = (page: number) => setFilters(prev => ({ ...prev, page }));

  const handleCreateNotification = () => {
    setSelectedNotification(null);
    setFormData({ title: '', body: '', deep_link: '', audience_filter: {} });
    setShowComposer(true);
  };

  const handleEditNotification = (notification: PushNotification) => {
    setSelectedNotification(notification);
    setFormData({
      title: notification.title,
      body: notification.body,
      deep_link: notification.deep_link || '',
      audience_filter: notification.audience_filter || {},
    });
    setShowComposer(true);
  };

  const handleSaveNotification = async () => {
    if (!formData.title.trim() || !formData.body.trim()) {
      Alert.alert(t('common.error', 'Error'), t('admin.push.requiredFields', 'Title and body are required'));
      return;
    }
    setSaving(true);
    try {
      const payload: Partial<PushNotification> = {
        title: formData.title,
        body: formData.body,
        deep_link: formData.deep_link || undefined,
        audience_filter: formData.audience_filter,
        status: 'draft',
      };
      if (selectedNotification) {
        await marketingService.updatePushNotification(selectedNotification.id, payload);
      } else {
        await marketingService.createPushNotification(payload);
      }
      setShowComposer(false);
      loadNotifications();
    } catch (error) {
      console.error('Error saving notification:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSendNotification = async (notification: PushNotification) => {
    Alert.alert(
      t('admin.push.sendConfirm', 'Send Notification'),
      t('admin.push.sendMessage', 'Send this notification to all targeted users now?'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('admin.push.send', 'Send Now'),
          onPress: async () => {
            try {
              await marketingService.sendPushNotification(notification.id);
              loadNotifications();
              Alert.alert(t('admin.push.sent', 'Sent'), t('admin.push.sentMessage', 'Notification is being sent'));
            } catch (error) {
              console.error('Error sending:', error);
            }
          },
        },
      ]
    );
  };

  const handleSchedule = (notification: PushNotification) => {
    setSelectedNotification(notification);
    setScheduleDate(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16));
    setShowScheduleModal(true);
  };

  const handleConfirmSchedule = async () => {
    if (!selectedNotification || !scheduleDate) return;
    try {
      await marketingService.schedulePushNotification(selectedNotification.id, scheduleDate);
      setShowScheduleModal(false);
      loadNotifications();
      Alert.alert(t('admin.push.scheduled', 'Scheduled'), t('admin.push.scheduledMessage', 'Notification has been scheduled'));
    } catch (error) {
      console.error('Error scheduling:', error);
    }
  };

  const handleDeleteNotification = async (notification: PushNotification) => {
    Alert.alert(
      t('admin.push.deleteConfirm', 'Delete Notification'),
      t('admin.push.deleteMessage', `Delete "${notification.title}"?`),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('common.delete', 'Delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await marketingService.deletePushNotification(notification.id);
              loadNotifications();
            } catch (error) {
              console.error('Error deleting:', error);
            }
          },
        },
      ]
    );
  };

  const columns: Column<PushNotification>[] = [
    { key: 'title', header: t('admin.push.columns.title', 'Title'), width: 200, render: (n) => <Text style={styles.titleText}>{n.title}</Text> },
    { key: 'body', header: t('admin.push.columns.body', 'Body'), width: 250, render: (n) => <Text style={styles.bodyText} numberOfLines={2}>{n.body}</Text> },
    {
      key: 'status', header: t('admin.push.columns.status', 'Status'), width: 100,
      render: (n) => (
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(n.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(n.status) }]}>{n.status}</Text>
        </View>
      ),
    },
    { key: 'sent_count', header: t('admin.push.columns.sent', 'Sent'), width: 80, align: 'center', render: (n) => <Text style={styles.countText}>{n.sent_count || 0}</Text> },
    { key: 'open_count', header: t('admin.push.columns.opened', 'Opened'), width: 80, align: 'center', render: (n) => <Text style={styles.countText}>{n.open_count || 0}</Text> },
    { key: 'scheduled_at', header: t('admin.push.columns.scheduled', 'Scheduled'), width: 150, render: (n) => <Text style={styles.dateText}>{formatDate(n.scheduled_at)}</Text> },
  ];

  const renderActions = (notification: PushNotification) => (
    <View style={styles.actionsRow}>
      <TouchableOpacity style={styles.actionButton} onPress={() => handleEditNotification(notification)}><Text style={styles.actionIcon}>✏️</Text></TouchableOpacity>
      {notification.status === 'draft' && (
        <>
          <TouchableOpacity style={[styles.actionButton, styles.scheduleButton]} onPress={() => handleSchedule(notification)}><Text style={styles.actionIcon}>📅</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.sendButton]} onPress={() => handleSendNotification(notification)}><Text style={styles.actionIcon}>📤</Text></TouchableOpacity>
        </>
      )}
      <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={() => handleDeleteNotification(notification)}><Text style={styles.actionIcon}>🗑️</Text></TouchableOpacity>
    </View>
  );

  return (
    <AdminLayout
      title={t('admin.titles.pushNotifications', 'Push Notifications')}
      actions={<TouchableOpacity style={styles.createButton} onPress={handleCreateNotification}><Text style={styles.createButtonText}>+ {t('admin.push.create', 'Create Notification')}</Text></TouchableOpacity>}
    >
      <View style={styles.container}>
        <View style={styles.statusFilters}>
          {['', 'draft', 'scheduled', 'sent'].map((status) => (
            <TouchableOpacity key={status} style={[styles.statusFilter, filters.status === status && styles.statusFilterActive]} onPress={() => setFilters(prev => ({ ...prev, status, page: 1 }))}>
              <Text style={[styles.statusFilterText, filters.status === status && styles.statusFilterTextActive]}>{status || t('common.all', 'All')}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <DataTable columns={columns} data={notifications} keyExtractor={(n) => n.id} loading={loading} searchable searchPlaceholder={t('admin.push.searchPlaceholder', 'Search notifications...')} onSearch={handleSearch} pagination={{ page: filters.page || 1, pageSize: filters.page_size || 20, total: totalNotifications, onPageChange: handlePageChange }} actions={renderActions} emptyMessage={t('admin.push.noNotifications', 'No notifications found')} />

        {/* Composer Modal */}
        <Modal visible={showComposer} transparent animationType="slide" onRequestClose={() => setShowComposer(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.composerModal}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>{selectedNotification ? t('admin.push.editNotification', 'Edit Notification') : t('admin.push.createNotification', 'Create Notification')}</Text>

                {/* Preview */}
                <View style={styles.previewSection}>
                  <Text style={styles.previewLabel}>{t('admin.push.preview', 'Preview')}</Text>
                  <View style={styles.previewCard}>
                    <View style={styles.previewHeader}>
                      <Text style={styles.previewAppName}>Bayit+</Text>
                      <Text style={styles.previewTime}>now</Text>
                    </View>
                    <Text style={styles.previewTitle}>{formData.title || 'Notification Title'}</Text>
                    <Text style={styles.previewBody}>{formData.body || 'Notification body text...'}</Text>
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>{t('admin.push.title', 'Title')}</Text>
                  <TextInput style={styles.formInput} value={formData.title} onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))} placeholder={t('admin.push.titlePlaceholder', 'e.g., New content available!')} placeholderTextColor={colors.textMuted} maxLength={50} />
                  <Text style={styles.charCount}>{formData.title.length}/50</Text>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>{t('admin.push.body', 'Body')}</Text>
                  <TextInput style={[styles.formInput, styles.bodyInput]} value={formData.body} onChangeText={(text) => setFormData(prev => ({ ...prev, body: text }))} placeholder={t('admin.push.bodyPlaceholder', 'e.g., Check out our new releases!')} placeholderTextColor={colors.textMuted} multiline numberOfLines={3} maxLength={178} />
                  <Text style={styles.charCount}>{formData.body.length}/178</Text>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>{t('admin.push.deepLink', 'Deep Link (optional)')}</Text>
                  <TextInput style={styles.formInput} value={formData.deep_link} onChangeText={(text) => setFormData(prev => ({ ...prev, deep_link: text }))} placeholder="bayitplus://content/123" placeholderTextColor={colors.textMuted} autoCapitalize="none" />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>{t('admin.push.audience', 'Target Audience')}</Text>
                  <View style={styles.audienceOptions}>
                    {['all', 'premium', 'inactive', 'new'].map((audience) => (
                      <TouchableOpacity key={audience} style={[styles.audienceOption, (formData.audience_filter as any).segment === audience && styles.audienceOptionActive]} onPress={() => setFormData(prev => ({ ...prev, audience_filter: audience === 'all' ? {} : { segment: audience } }))}>
                        <Text style={[styles.audienceOptionText, (formData.audience_filter as any).segment === audience && styles.audienceOptionTextActive]}>{audience === 'all' ? 'All' : audience}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.cancelButton} onPress={() => setShowComposer(false)}><Text style={styles.cancelButtonText}>{t('common.cancel', 'Cancel')}</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.saveButton, saving && styles.saveButtonDisabled]} onPress={handleSaveNotification} disabled={saving}>
                    {saving ? <ActivityIndicator size="small" color={colors.text} /> : <Text style={styles.saveButtonText}>{t('common.save', 'Save')}</Text>}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Schedule Modal */}
        <Modal visible={showScheduleModal} transparent animationType="fade" onRequestClose={() => setShowScheduleModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.scheduleModal}>
              <Text style={styles.modalTitle}>{t('admin.push.scheduleNotification', 'Schedule Notification')}</Text>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{t('admin.push.scheduleDate', 'Date & Time')}</Text>
                <TextInput style={styles.formInput} value={scheduleDate} onChangeText={setScheduleDate} placeholder="YYYY-MM-DDTHH:mm" placeholderTextColor={colors.textMuted} />
              </View>
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setShowScheduleModal(false)}><Text style={styles.cancelButtonText}>{t('common.cancel', 'Cancel')}</Text></TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={handleConfirmSchedule}><Text style={styles.saveButtonText}>{t('admin.push.schedule', 'Schedule')}</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </AdminLayout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg },
  createButton: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.secondary, borderRadius: borderRadius.md },
  createButtonText: { fontSize: fontSize.sm, color: colors.text, fontWeight: '600' },
  statusFilters: { flexDirection: 'row', backgroundColor: colors.backgroundLighter, borderRadius: borderRadius.md, padding: 2, marginBottom: spacing.lg, alignSelf: 'flex-start' },
  statusFilter: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.sm },
  statusFilterActive: { backgroundColor: colors.primary },
  statusFilterText: { fontSize: fontSize.sm, color: colors.textSecondary, textTransform: 'capitalize' },
  statusFilterTextActive: { color: colors.text, fontWeight: '600' },
  titleText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  bodyText: { fontSize: fontSize.sm, color: colors.textSecondary },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.sm, alignSelf: 'flex-start' },
  statusText: { fontSize: fontSize.xs, fontWeight: '600', textTransform: 'capitalize' },
  countText: { fontSize: fontSize.sm, color: colors.text },
  dateText: { fontSize: fontSize.xs, color: colors.textSecondary },
  actionsRow: { flexDirection: 'row', gap: spacing.xs },
  actionButton: { width: 28, height: 28, borderRadius: borderRadius.sm, backgroundColor: colors.backgroundLighter, justifyContent: 'center', alignItems: 'center' },
  scheduleButton: { backgroundColor: colors.warning + '30' },
  sendButton: { backgroundColor: colors.success + '30' },
  deleteButton: { backgroundColor: colors.error + '30' },
  actionIcon: { fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', alignItems: 'center' },
  composerModal: { width: '95%', maxWidth: 500, maxHeight: '90%', backgroundColor: colors.backgroundLight, borderRadius: borderRadius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.glassBorder },
  scheduleModal: { width: '90%', maxWidth: 400, backgroundColor: colors.backgroundLight, borderRadius: borderRadius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.glassBorder },
  modalTitle: { fontSize: fontSize.xl, fontWeight: 'bold', color: colors.text, marginBottom: spacing.lg },
  previewSection: { marginBottom: spacing.lg },
  previewLabel: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  previewCard: { backgroundColor: colors.backgroundLighter, borderRadius: borderRadius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.glassBorder },
  previewHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  previewAppName: { fontSize: fontSize.xs, fontWeight: '600', color: colors.primary },
  previewTime: { fontSize: fontSize.xs, color: colors.textMuted },
  previewTitle: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  previewBody: { fontSize: fontSize.sm, color: colors.textSecondary },
  formGroup: { marginBottom: spacing.md },
  formLabel: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  formInput: { backgroundColor: colors.backgroundLighter, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.glassBorder, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.text, fontSize: fontSize.md },
  bodyInput: { minHeight: 80, textAlignVertical: 'top' },
  charCount: { fontSize: fontSize.xs, color: colors.textMuted, textAlign: 'right', marginTop: spacing.xs },
  audienceOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  audienceOption: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.backgroundLighter, borderRadius: borderRadius.sm, borderWidth: 1, borderColor: colors.glassBorder },
  audienceOptionActive: { backgroundColor: colors.primary + '30', borderColor: colors.primary },
  audienceOptionText: { fontSize: fontSize.sm, color: colors.textSecondary, textTransform: 'capitalize' },
  audienceOptionTextActive: { color: colors.primary, fontWeight: '600' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.lg },
  cancelButton: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: colors.backgroundLighter, borderRadius: borderRadius.md },
  cancelButtonText: { fontSize: fontSize.sm, color: colors.textSecondary },
  saveButton: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: colors.primary, borderRadius: borderRadius.md, minWidth: 80, alignItems: 'center' },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { fontSize: fontSize.sm, color: colors.text, fontWeight: '600' },
});

export default PushNotificationsScreen;
