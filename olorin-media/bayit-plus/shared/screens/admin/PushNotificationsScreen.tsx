/**
 * PushNotificationsScreen
 * Push notification management with targeting and scheduling
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNotifications } from '@olorin/glass-ui/hooks';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { DataTable, Column } from '../../components/admin/DataTable';
import { marketingService, MarketingFilter } from '../../services/adminApi';
import { PushNotification, AudienceFilter } from '../../types/rbac';
import { colors, spacing, borderRadius, fontSize } from '../../theme';
import { formatDate, formatDateTime } from '../../utils/formatters';
import { getStatusColor } from '../../utils/adminConstants';

export const PushNotificationsScreen: React.FC = () => {
  const { t } = useTranslation();
  const notificationSystem = useNotifications();
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
      notificationSystem.showError(t('admin.push.requiredFields', 'Title and body are required'), t('common.error', 'Error'));
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
    notificationSystem.show({
      level: 'warning',
      title: t('admin.push.sendConfirm', 'Send Notification'),
      message: t('admin.push.sendMessage', 'Send this notification to all targeted users now?'),
      dismissable: true,
      action: {
        label: t('admin.push.send', 'Send Now'),
        type: 'action',
        onPress: async () => {
          try {
            await marketingService.sendPushNotification(notification.id);
            loadNotifications();
            notificationSystem.showSuccess(t('admin.push.sentMessage', 'Notification is being sent'), t('admin.push.sent', 'Sent'));
          } catch (error) {
            console.error('Error sending:', error);
          }
        },
      },
    });
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
      notificationSystem.showSuccess(t('admin.push.scheduledMessage', 'Notification has been scheduled'), t('admin.push.scheduled', 'Scheduled'));
    } catch (error) {
      console.error('Error scheduling:', error);
    }
  };

  const handleDeleteNotification = async (notification: PushNotification) => {
    notificationSystem.show({
      level: 'warning',
      title: t('admin.push.deleteConfirm', 'Delete Notification'),
      message: t('admin.push.deleteMessage', `Delete "${notification.title}"?`),
      dismissable: true,
      action: {
        label: t('common.delete', 'Delete'),
        type: 'action',
        onPress: async () => {
          try {
            await marketingService.deletePushNotification(notification.id);
            loadNotifications();
          } catch (error) {
            console.error('Error deleting:', error);
          }
        },
      },
    });
  };

  const columns: Column<PushNotification>[] = [
    { key: 'title', header: t('admin.push.columns.title', 'Title'), width: 200, render: (n) => <Text className="text-sm font-semibold text-white">{n.title}</Text> },
    { key: 'body', header: t('admin.push.columns.body', 'Body'), width: 250, render: (n) => <Text className="text-sm text-[#cccccc]" numberOfLines={2}>{n.body}</Text> },
    {
      key: 'status', header: t('admin.push.columns.status', 'Status'), width: 100,
      render: (n) => (
        <View className="px-2 py-1 rounded-sm self-start" style={{ backgroundColor: getStatusColor(n.status) + '20' }}>
          <Text className="text-xs font-semibold capitalize" style={{ color: getStatusColor(n.status) }}>{n.status}</Text>
        </View>
      ),
    },
    { key: 'sent_count', header: t('admin.push.columns.sent', 'Sent'), width: 80, align: 'center', render: (n) => <Text className="text-sm text-white">{n.sent_count || 0}</Text> },
    { key: 'open_count', header: t('admin.push.columns.opened', 'Opened'), width: 80, align: 'center', render: (n) => <Text className="text-sm text-white">{n.open_count || 0}</Text> },
    { key: 'scheduled_at', header: t('admin.push.columns.scheduled', 'Scheduled'), width: 150, render: (n) => <Text className="text-xs text-[#cccccc]">{formatDate(n.scheduled_at)}</Text> },
  ];

  const renderActions = (notification: PushNotification) => (
    <View className="flex-row gap-1">
      <TouchableOpacity className="w-7 h-7 rounded-sm bg-[#1a1a1a] justify-center items-center" onPress={() => handleEditNotification(notification)}><Text className="text-xs">✏️</Text></TouchableOpacity>
      {notification.status === 'draft' && (
        <>
          <TouchableOpacity className="w-7 h-7 rounded-sm bg-[#FFA500]/30 justify-center items-center" onPress={() => handleSchedule(notification)}><Text className="text-xs">📅</Text></TouchableOpacity>
          <TouchableOpacity className="w-7 h-7 rounded-sm bg-[#4CAF50]/30 justify-center items-center" onPress={() => handleSendNotification(notification)}><Text className="text-xs">📤</Text></TouchableOpacity>
        </>
      )}
      <TouchableOpacity className="w-7 h-7 rounded-sm bg-[#FF4444]/30 justify-center items-center" onPress={() => handleDeleteNotification(notification)}><Text className="text-xs">🗑️</Text></TouchableOpacity>
    </View>
  );

  return (
    <AdminLayout
      title={t('admin.titles.pushNotifications', 'Push Notifications')}
      actions={<TouchableOpacity className="px-4 py-2 bg-[#00BFFF] rounded-md" onPress={handleCreateNotification}><Text className="text-sm text-white font-semibold">+ {t('admin.push.create', 'Create Notification')}</Text></TouchableOpacity>}
    >
      <View className="flex-1 p-4">
        <View className="flex-row bg-[#1a1a1a] rounded-md p-0.5 mb-4 self-start">
          {['', 'draft', 'scheduled', 'sent'].map((status) => (
            <TouchableOpacity key={status} className={`px-4 py-2 rounded-sm ${filters.status === status ? 'bg-[#00BFFF]' : ''}`} onPress={() => setFilters(prev => ({ ...prev, status, page: 1 }))}>
              <Text className={`text-sm capitalize ${filters.status === status ? 'text-white font-semibold' : 'text-[#cccccc]'}`}>{status || t('common.all', 'All')}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <DataTable columns={columns} data={notifications} keyExtractor={(n) => n.id} loading={loading} searchable searchPlaceholder={t('admin.push.searchPlaceholder', 'Search notifications...')} onSearch={handleSearch} pagination={{ page: filters.page || 1, pageSize: filters.page_size || 20, total: totalNotifications, onPageChange: handlePageChange }} actions={renderActions} emptyMessage={t('admin.push.noNotifications', 'No notifications found')} />

        {/* Composer Modal */}
        <Modal visible={showComposer} transparent animationType="slide" onRequestClose={() => setShowComposer(false)}>
          <View className="flex-1 bg-black/80 justify-center items-center">
            <View className="w-[95%] max-w-[500px] max-h-[90%] bg-[#1a1a1a] rounded-2xl p-4 border border-white/20">
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text className="text-xl font-bold text-white mb-4">{selectedNotification ? t('admin.push.editNotification', 'Edit Notification') : t('admin.push.createNotification', 'Create Notification')}</Text>

                {/* Preview */}
                <View className="mb-4">
                  <Text className="text-sm font-semibold text-white mb-2">{t('admin.push.preview', 'Preview')}</Text>
                  <View className="bg-[#1a1a1a] rounded-md p-4 border border-white/20">
                    <View className="flex-row justify-between mb-1">
                      <Text className="text-xs font-semibold text-[#00BFFF]">{t('common.appName', 'Bayit+')}</Text>
                      <Text className="text-xs text-[#666666]">now</Text>
                    </View>
                    <Text className="text-sm font-semibold text-white mb-1">{formData.title || 'Notification Title'}</Text>
                    <Text className="text-sm text-[#cccccc]">{formData.body || 'Notification body text...'}</Text>
                  </View>
                </View>

                <View className="mb-4">
                  <Text className="text-sm font-semibold text-white mb-1">{t('admin.push.title', 'Title')}</Text>
                  <TextInput className="bg-[#1a1a1a] rounded-md border border-white/20 px-4 py-2 text-white text-base" value={formData.title} onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))} placeholder={t('admin.push.titlePlaceholder', 'e.g., New content available!')} placeholderTextColor={colors.textMuted} maxLength={50} />
                  <Text className="text-xs text-[#666666] text-right mt-1">{formData.title.length}/50</Text>
                </View>

                <View className="mb-4">
                  <Text className="text-sm font-semibold text-white mb-1">{t('admin.push.body', 'Body')}</Text>
                  <TextInput className="bg-[#1a1a1a] rounded-md border border-white/20 px-4 py-2 text-white text-base min-h-[80px]" style={{ textAlignVertical: 'top' }} value={formData.body} onChangeText={(text) => setFormData(prev => ({ ...prev, body: text }))} placeholder={t('admin.push.bodyPlaceholder', 'e.g., Check out our new releases!')} placeholderTextColor={colors.textMuted} multiline numberOfLines={3} maxLength={178} />
                  <Text className="text-xs text-[#666666] text-right mt-1">{formData.body.length}/178</Text>
                </View>

                <View className="mb-4">
                  <Text className="text-sm font-semibold text-white mb-1">{t('admin.push.deepLink', 'Deep Link (optional)')}</Text>
                  <TextInput className="bg-[#1a1a1a] rounded-md border border-white/20 px-4 py-2 text-white text-base" value={formData.deep_link} onChangeText={(text) => setFormData(prev => ({ ...prev, deep_link: text }))} placeholder={t('placeholder.deepLink', 'bayitplus://content/123')} placeholderTextColor={colors.textMuted} autoCapitalize="none" />
                </View>

                <View className="mb-4">
                  <Text className="text-sm font-semibold text-white mb-1">{t('admin.push.audience', 'Target Audience')}</Text>
                  <View className="flex-row flex-wrap gap-1">
                    {['all', 'premium', 'inactive', 'new'].map((audience) => (
                      <TouchableOpacity key={audience} className={`px-4 py-2 bg-[#1a1a1a] rounded-sm border ${(formData.audience_filter as any).segment === audience ? 'bg-[#00BFFF]/30 border-[#00BFFF]' : 'border-white/20'}`} onPress={() => setFormData(prev => ({ ...prev, audience_filter: audience === 'all' ? {} : { segment: audience } }))}>
                        <Text className={`text-sm capitalize ${(formData.audience_filter as any).segment === audience ? 'text-[#00BFFF] font-semibold' : 'text-[#cccccc]'}`}>{audience === 'all' ? 'All' : audience}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View className="flex-row justify-end gap-2 mt-4">
                  <TouchableOpacity className="px-4 py-2 bg-[#1a1a1a] rounded-md" onPress={() => setShowComposer(false)}><Text className="text-sm text-[#cccccc]">{t('common.cancel', 'Cancel')}</Text></TouchableOpacity>
                  <TouchableOpacity className={`px-4 py-2 bg-[#00BFFF] rounded-md min-w-[80px] items-center ${saving ? 'opacity-60' : ''}`} onPress={handleSaveNotification} disabled={saving}>
                    {saving ? <ActivityIndicator size="small" color={colors.text} /> : <Text className="text-sm text-white font-semibold">{t('common.save', 'Save')}</Text>}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Schedule Modal */}
        <Modal visible={showScheduleModal} transparent animationType="fade" onRequestClose={() => setShowScheduleModal(false)}>
          <View className="flex-1 bg-black/80 justify-center items-center">
            <View className="w-[90%] max-w-[400px] bg-[#1a1a1a] rounded-2xl p-4 border border-white/20">
              <Text className="text-xl font-bold text-white mb-4">{t('admin.push.scheduleNotification', 'Schedule Notification')}</Text>
              <View className="mb-4">
                <Text className="text-sm font-semibold text-white mb-1">{t('admin.push.scheduleDate', 'Date & Time')}</Text>
                <TextInput className="bg-[#1a1a1a] rounded-md border border-white/20 px-4 py-2 text-white text-base" value={scheduleDate} onChangeText={setScheduleDate} placeholder={t('placeholder.datetime', 'YYYY-MM-DDTHH:mm')} placeholderTextColor={colors.textMuted} />
              </View>
              <View className="flex-row justify-end gap-2">
                <TouchableOpacity className="px-4 py-2 bg-[#1a1a1a] rounded-md" onPress={() => setShowScheduleModal(false)}><Text className="text-sm text-[#cccccc]">{t('common.cancel', 'Cancel')}</Text></TouchableOpacity>
                <TouchableOpacity className="px-4 py-2 bg-[#00BFFF] rounded-md" onPress={handleConfirmSchedule}><Text className="text-sm text-white font-semibold">{t('admin.push.schedule', 'Schedule')}</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </AdminLayout>
  );
};

export default PushNotificationsScreen;
