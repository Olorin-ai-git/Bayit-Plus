import { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';;
import { useTranslation } from 'react-i18next';
import { Plus, Send, Clock, Edit2, Trash2, TestTube } from 'lucide-react';
import { GlassTable, GlassTableCell } from '@bayit/shared/ui/web';
import { marketingService } from '@/services/adminApi';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassButton, GlassModal, GlassInput, GlassTextarea } from '@bayit/shared/ui';
import { useDirection } from '@/hooks/useDirection';
import logger from '@/utils/logger';

interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  status: 'draft' | 'active' | 'scheduled' | 'completed';
  sent: number;
  opened: number;
  clicked: number;
  scheduled_at?: string;
  created_at: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
}

const statusColors: Record<string, { bg: string; text: string }> = {
  draft: { bg: 'rgba(107, 114, 128, 0.2)', text: '#6B7280' },
  active: { bg: 'rgba(34, 197, 94, 0.2)', text: '#22C55E' },
  scheduled: { bg: 'rgba(245, 158, 11, 0.2)', text: '#F59E0B' },
  completed: { bg: 'rgba(139, 92, 246, 0.2)', text: '#8B5CF6' },
};

export default function EmailCampaignsPage() {
  const { t, i18n } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 20, total: 0 });
  const [filters, setFilters] = useState({ search: '', status: 'all' });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSendConfirm, setShowSendConfirm] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState<EmailCampaign | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [newCampaign, setNewCampaign] = useState({ name: '', subject: '', body: '' });
  const [editingCampaign, setEditingCampaign] = useState<EmailCampaign | null>(null);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(
      i18n.language === 'he' ? 'he-IL' : i18n.language === 'es' ? 'es-ES' : 'en-US',
      { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
    );
  };

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const data = await marketingService.getEmailCampaigns({
        ...filters,
        page: pagination.page,
        page_size: pagination.pageSize,
      });
      setCampaigns(data.items || []);
      setPagination((prev) => ({ ...prev, total: data.total || 0 }));
    } catch (error) {
      logger.error('Failed to load email campaigns', 'EmailCampaignsPage', error);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.pageSize]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  const handleSearch = (search: string) => {
    setFilters((prev) => ({ ...prev, search }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  const handleCreate = async () => {
    if (!newCampaign.name || !newCampaign.subject) {
      setErrorMessage(t('admin.emailCampaigns.form.requiredFields'));
      setShowErrorModal(true);
      return;
    }
    try {
      if (editingCampaign) {
        await marketingService.updateEmailCampaign(editingCampaign.id, newCampaign);
      } else {
        await marketingService.createEmailCampaign(newCampaign);
      }
      setShowCreateModal(false);
      setNewCampaign({ name: '', subject: '', body: '' });
      setEditingCampaign(null);
      loadCampaigns();
    } catch (error) {
      logger.error('Failed to create/update email campaign', 'EmailCampaignsPage', error);
      setErrorMessage(t('common.errors.unexpected'));
      setShowErrorModal(true);
    }
  };

  const handleEdit = (campaign: EmailCampaign) => {
    setEditingCampaign(campaign);
    setNewCampaign({ name: campaign.name, subject: campaign.subject, body: '' });
    setShowCreateModal(true);
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
    setNewCampaign({ name: '', subject: '', body: '' });
    setEditingCampaign(null);
  };

  const handleSendConfirm = async () => {
    if (!selectedCampaign) return;
    try {
      await marketingService.sendEmailCampaign(selectedCampaign.id);
      setShowSendConfirm(false);
      setSelectedCampaign(null);
      loadCampaigns();
    } catch (error) {
      logger.error('Failed to send email campaign', 'EmailCampaignsPage', error);
      setErrorMessage(t('common.errors.unexpected'));
      setShowErrorModal(true);
    }
  };

  const handleSend = (campaign: EmailCampaign) => {
    setSelectedCampaign(campaign);
    setShowSendConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedCampaign) return;
    try {
      await marketingService.deleteEmailCampaign(selectedCampaign.id);
      setShowDeleteConfirm(false);
      setSelectedCampaign(null);
      loadCampaigns();
    } catch (error) {
      logger.error('Failed to delete email campaign', 'EmailCampaignsPage', error);
      setErrorMessage(t('common.errors.unexpected'));
      setShowErrorModal(true);
    }
  };

  const handleDelete = (campaign: EmailCampaign) => {
    setSelectedCampaign(campaign);
    setShowDeleteConfirm(true);
  };

  const handleSendTest = async () => {
    if (!selectedCampaign || !testEmail) return;
    try {
      await marketingService.sendTestEmail(selectedCampaign.id, testEmail);
      setShowTestModal(false);
      setTestEmail('');
      setShowSuccessModal(true);
    } catch (error) {
      logger.error('Failed to send test email', 'EmailCampaignsPage', error);
      setErrorMessage(t('common.errors.unexpected'));
      setShowErrorModal(true);
    }
  };

  const openTestModal = (campaign: EmailCampaign) => {
    setSelectedCampaign(campaign);
    setShowTestModal(true);
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      draft: 'admin.emailCampaigns.status.draft',
      active: 'admin.emailCampaigns.status.active',
      scheduled: 'admin.emailCampaigns.status.scheduled',
      completed: 'admin.emailCampaigns.status.completed',
    };
    return t(statusMap[status] || 'admin.emailCampaigns.status.draft', status);
  };

  const getStatusBadge = (status: string) => {
    const style = statusColors[status] || statusColors.draft;
    return (
      <View style={[styles.badge, { backgroundColor: style.bg }]}>
        <Text style={[styles.badgeText, { color: style.text }]}>{getStatusLabel(status)}</Text>
      </View>
    );
  };

  const columns = [
    {
      key: 'name',
      label: t('admin.emailCampaigns.columns.name'),
      render: (_: any, campaign: EmailCampaign) => (
        <View>
          <Text style={styles.campaignName}>{campaign.name}</Text>
          <Text style={styles.campaignSubject}>{campaign.subject}</Text>
        </View>
      ),
    },
    { key: 'status', label: t('admin.emailCampaigns.columns.status'), width: 100, render: (status: string) => getStatusBadge(status) },
    { key: 'sent', label: t('admin.emailCampaigns.columns.sent'), width: 80, render: (sent: number) => <Text style={styles.statText}>{sent.toLocaleString()}</Text> },
    { key: 'opened', label: t('admin.emailCampaigns.columns.opened'), width: 80, render: (opened: number) => <Text style={styles.statText}>{opened.toLocaleString()}</Text> },
    { key: 'clicked', label: t('admin.emailCampaigns.columns.clicked'), width: 80, render: (clicked: number) => <Text style={styles.statText}>{clicked.toLocaleString()}</Text> },
    { key: 'created_at', label: t('admin.emailCampaigns.columns.created'), width: 150, render: (date: string) => <Text style={styles.dateText}>{formatDate(date)}</Text> },
    {
      key: 'actions',
      label: t('admin.emailCampaigns.columns.actions', 'Actions'),
      width: 160,
      render: (_: any, campaign: EmailCampaign) => (
        <View style={styles.actionsRow}>
          {campaign.status === 'draft' && (
            <>
              <Pressable style={styles.actionButton} onPress={() => handleEdit(campaign)} title={t('common.edit', 'Edit')}>
                <Edit2 size={14} color={colors.primary} />
              </Pressable>
              <Pressable style={styles.actionButton} onPress={() => handleSend(campaign)} title={t('common.send', 'Send')}>
                <Send size={14} color={colors.success} />
              </Pressable>
            </>
          )}
          <Pressable style={styles.actionButton} onPress={() => openTestModal(campaign)} title={t('admin.emailCampaigns.sendTestEmail', 'Send Test')}>
            <TestTube size={14} color={colors.textMuted} />
          </Pressable>
          <Pressable style={styles.actionButton} onPress={() => handleDelete(campaign)} title={t('common.delete', 'Delete')}>
            <Trash2 size={14} color={colors.error} />
          </Pressable>
        </View>
      ),
    },
  ];

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: spacing.lg }}>
      <View style={[styles.header, { flexDirection }]}>
        <View>
          <Text style={[styles.pageTitle, { textAlign }]}>{t('admin.emailCampaigns.title')}</Text>
          <Text style={[styles.subtitle, { textAlign }]}>{t('admin.emailCampaigns.subtitle')}</Text>
        </View>
        <GlassButton title={t('admin.emailCampaigns.createButton')} variant="primary" icon={<Plus size={16} color="white" />} onPress={() => setShowCreateModal(true)} />
      </View>

      <View style={[styles.filtersRow, { flexDirection }]}>
        {['all', 'draft', 'active', 'scheduled', 'completed'].map((status) => (
          <Pressable key={status} onPress={() => setFilters((prev) => ({ ...prev, status }))} style={[styles.filterButton, filters.status === status && styles.filterButtonActive]}>
            <Text style={[styles.filterText, filters.status === status && styles.filterTextActive, { textAlign }]}>
              {status === 'all' ? t('admin.common.all') : getStatusLabel(status)}
            </Text>
          </Pressable>
        ))}
      </View>

      <GlassTable
        columns={columns}
        data={campaigns}
        loading={loading}
        searchPlaceholder={t('admin.emailCampaigns.searchPlaceholder')}
        onSearch={handleSearch}
        pagination={pagination}
        onPageChange={handlePageChange}
        emptyMessage={t('admin.emailCampaigns.emptyMessage')}
        isRTL={isRTL}
      />

      <GlassModal visible={showCreateModal} onClose={handleCloseCreateModal} title={editingCampaign ? t('admin.emailCampaigns.editModal.title', 'Edit Campaign') : t('admin.emailCampaigns.createModal.title')}>
        <View style={styles.modalContent}>
          <View style={styles.formGroup}>
            <GlassInput label={t('admin.emailCampaigns.form.name')} containerStyle={styles.input} value={newCampaign.name} onChangeText={(name) => setNewCampaign((p) => ({ ...p, name }))} />
          </View>
          <View style={styles.formGroup}>
            <GlassInput label={t('admin.emailCampaigns.form.subject')} containerStyle={styles.input} value={newCampaign.subject} onChangeText={(subject) => setNewCampaign((p) => ({ ...p, subject }))} />
          </View>
          <View style={styles.formGroup}>
            <GlassInput label={t('admin.emailCampaigns.form.body')} containerStyle={[styles.input, styles.textArea]} value={newCampaign.body} onChangeText={(body) => setNewCampaign((p) => ({ ...p, body }))} multiline numberOfLines={5} />
          </View>
          <View className="flex flex-row gap-4 mt-6">
            <GlassButton title={t('common.cancel')} variant="cancel" onPress={handleCloseCreateModal} />
            <GlassButton title={editingCampaign ? t('common.save', 'Save') : t('admin.emailCampaigns.createButton')} variant="success" onPress={handleCreate} />
          </View>
        </View>
      </GlassModal>

      <GlassModal visible={showTestModal} onClose={() => setShowTestModal(false)} title={t('admin.emailCampaigns.testModal.title')}>
        <View style={styles.modalContent}>
          <View style={styles.formGroup}>
            <GlassInput label={t('admin.emailCampaigns.testModal.emailLabel')} containerStyle={styles.input} value={testEmail} onChangeText={setTestEmail} keyboardType="email-address" />
          </View>
          <View className="flex flex-row gap-4 mt-6">
            <GlassButton title={t('common.cancel')} variant="cancel" onPress={() => setShowTestModal(false)} />
            <GlassButton title={t('admin.emailCampaigns.testModal.submitButton')} variant="success" onPress={handleSendTest} />
          </View>
        </View>
      </GlassModal>

      <GlassModal
        visible={showSendConfirm}
        onClose={() => setShowSendConfirm(false)}
        title={t('common.confirm')}
      >
        <View style={styles.modalContent}>
          {selectedCampaign && (
            <Text style={styles.modalMessage}>
              {t('admin.emailCampaigns.confirmSend', { name: selectedCampaign.name })}
            </Text>
          )}
          <View className="flex flex-row gap-4 mt-6">
            <GlassButton title={t('common.cancel')} variant="cancel" onPress={() => setShowSendConfirm(false)} />
            <GlassButton title={t('common.send')} variant="success" onPress={handleSendConfirm} />
          </View>
        </View>
      </GlassModal>

      <GlassModal
        visible={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title={t('common.confirm')}
      >
        <View style={styles.modalContent}>
          {selectedCampaign && (
            <Text style={styles.modalMessage}>
              {t('admin.emailCampaigns.confirmDelete', { name: selectedCampaign.name })}
            </Text>
          )}
          <View className="flex flex-row gap-4 mt-6">
            <GlassButton title={t('common.cancel')} variant="cancel" onPress={() => setShowDeleteConfirm(false)} />
            <GlassButton title={t('common.delete')} variant="danger" onPress={handleDeleteConfirm} />
          </View>
        </View>
      </GlassModal>

      <GlassModal
        visible={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title={t('common.success')}
      >
        <View style={styles.modalContent}>
          <Text style={styles.successText}>{t('admin.emailCampaigns.testEmailSent')}</Text>
          <View className="flex flex-row gap-4 mt-6">
            <GlassButton title={t('common.ok')} variant="success" onPress={() => setShowSuccessModal(false)} />
          </View>
        </View>
      </GlassModal>

      <GlassModal
        visible={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        title={t('common.error')}
      >
        <View style={styles.modalContent}>
          <Text className="flex-1 text-red-500 text-sm">{errorMessage}</Text>
          <View className="flex flex-row gap-4 mt-6">
            <GlassButton title={t('common.ok')} variant="success" onPress={() => setShowErrorModal(false)} />
          </View>
        </View>
      </GlassModal>
    </ScrollView>
  );
}

