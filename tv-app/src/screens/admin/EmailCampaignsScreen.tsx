/**
 * EmailCampaignsScreen
 * Email campaign management with composer and targeting
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
import { EmailCampaign, AudienceFilter } from '../../types/rbac';
import { colors, spacing, borderRadius, fontSize } from '@bayit/shared/theme';
import { formatDate, formatDateTime, formatNumber } from '../../utils/formatters';
import { getStatusColor } from '../../utils/adminConstants';

export const EmailCampaignsScreen: React.FC = () => {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCampaigns, setTotalCampaigns] = useState(0);
  const [showComposer, setShowComposer] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<EmailCampaign | null>(null);
  const [saving, setSaving] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [testEmail, setTestEmail] = useState('');

  const [filters, setFilters] = useState<MarketingFilter>({ search: '', status: '', page: 1, page_size: 20 });

  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    body_html: '',
    audience_filter: {} as AudienceFilter,
  });

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await marketingService.getEmailCampaigns(filters);
      setCampaigns(response.items);
      setTotalCampaigns(response.total);
    } catch (err) {
      console.error('Error loading campaigns:', err);
      setError(t('admin.email.loadError', 'Failed to load email campaigns'));
      setCampaigns([]);
      setTotalCampaigns(0);
    } finally {
      setLoading(false);
    }
  }, [filters, t]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  const handleSearch = (text: string) => setFilters(prev => ({ ...prev, search: text, page: 1 }));
  const handlePageChange = (page: number) => setFilters(prev => ({ ...prev, page }));

  const handleCreateCampaign = () => {
    setSelectedCampaign(null);
    setFormData({ name: '', subject: '', body_html: '', audience_filter: {} });
    setShowComposer(true);
  };

  const handleEditCampaign = (campaign: EmailCampaign) => {
    setSelectedCampaign(campaign);
    setFormData({
      name: campaign.name,
      subject: campaign.subject,
      body_html: campaign.body_html,
      audience_filter: campaign.audience_filter || {},
    });
    setShowComposer(true);
  };

  const handleSaveCampaign = async () => {
    if (!formData.name.trim() || !formData.subject.trim()) {
      Alert.alert(t('common.error', 'Error'), t('admin.email.requiredFields', 'Name and subject are required'));
      return;
    }
    setSaving(true);
    try {
      const payload: Partial<EmailCampaign> = {
        name: formData.name,
        subject: formData.subject,
        body_html: formData.body_html,
        audience_filter: formData.audience_filter,
        status: 'draft',
      };
      if (selectedCampaign) {
        await marketingService.updateEmailCampaign(selectedCampaign.id, payload);
      } else {
        await marketingService.createEmailCampaign(payload);
      }
      setShowComposer(false);
      loadCampaigns();
    } catch (error) {
      console.error('Error saving campaign:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSendCampaign = async (campaign: EmailCampaign) => {
    Alert.alert(
      t('admin.email.sendConfirm', 'Send Campaign'),
      t('admin.email.sendMessage', 'Are you sure you want to send this campaign now?'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('admin.email.send', 'Send'),
          onPress: async () => {
            try {
              await marketingService.sendEmailCampaign(campaign.id);
              loadCampaigns();
              Alert.alert(t('admin.email.sent', 'Sent'), t('admin.email.sentMessage', 'Campaign is being sent'));
            } catch (error) {
              console.error('Error sending campaign:', error);
            }
          },
        },
      ]
    );
  };

  const handleTestEmail = async () => {
    if (!testEmail.trim() || !selectedCampaign) return;
    try {
      await marketingService.sendTestEmail(selectedCampaign.id, testEmail);
      setShowTestModal(false);
      Alert.alert(t('admin.email.testSent', 'Test Sent'), t('admin.email.testSentMessage', `Test email sent to ${testEmail}`));
    } catch (error) {
      console.error('Error sending test:', error);
    }
  };

  const handleDeleteCampaign = async (campaign: EmailCampaign) => {
    Alert.alert(
      t('admin.email.deleteConfirm', 'Delete Campaign'),
      t('admin.email.deleteMessage', `Delete "${campaign.name}"?`),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('common.delete', 'Delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await marketingService.deleteEmailCampaign(campaign.id);
              loadCampaigns();
            } catch (error) {
              console.error('Error deleting:', error);
            }
          },
        },
      ]
    );
  };

  const columns: Column<EmailCampaign>[] = [
    { key: 'name', header: t('admin.email.columns.name', 'Campaign'), width: 200, render: (c) => <Text style={styles.campaignName}>{c.name}</Text> },
    { key: 'subject', header: t('admin.email.columns.subject', 'Subject'), width: 250, render: (c) => <Text style={styles.subjectText} numberOfLines={1}>{c.subject}</Text> },
    {
      key: 'status', header: t('admin.email.columns.status', 'Status'), width: 100,
      render: (c) => (
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(c.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(c.status) }]}>{c.status}</Text>
        </View>
      ),
    },
    { key: 'sent_count', header: t('admin.email.columns.sent', 'Sent'), width: 80, align: 'center', render: (c) => <Text style={styles.countText}>{c.sent_count || 0}</Text> },
    { key: 'open_count', header: t('admin.email.columns.opened', 'Opened'), width: 80, align: 'center', render: (c) => <Text style={styles.countText}>{c.open_count || 0}</Text> },
    { key: 'click_count', header: t('admin.email.columns.clicked', 'Clicked'), width: 80, align: 'center', render: (c) => <Text style={styles.countText}>{c.click_count || 0}</Text> },
    { key: 'created_at', header: t('admin.email.columns.created', 'Created'), width: 150, render: (c) => <Text style={styles.dateText}>{formatDateTime(c.created_at)}</Text> },
  ];

  const renderActions = (campaign: EmailCampaign) => (
    <View style={styles.actionsRow}>
      <TouchableOpacity style={styles.actionButton} onPress={() => handleEditCampaign(campaign)}><Text style={styles.actionIcon}>✏️</Text></TouchableOpacity>
      <TouchableOpacity style={styles.actionButton} onPress={() => { setSelectedCampaign(campaign); setShowTestModal(true); }}><Text style={styles.actionIcon}>🧪</Text></TouchableOpacity>
      {campaign.status === 'draft' && <TouchableOpacity style={[styles.actionButton, styles.sendButton]} onPress={() => handleSendCampaign(campaign)}><Text style={styles.actionIcon}>📤</Text></TouchableOpacity>}
      <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={() => handleDeleteCampaign(campaign)}><Text style={styles.actionIcon}>🗑️</Text></TouchableOpacity>
    </View>
  );

  return (
    <AdminLayout
      title={t('admin.titles.emailCampaigns', 'Email Campaigns')}
      actions={<TouchableOpacity style={styles.createButton} onPress={handleCreateCampaign}><Text style={styles.createButtonText}>+ {t('admin.email.create', 'Create Campaign')}</Text></TouchableOpacity>}
    >
      <View style={styles.container}>
        {/* Status Filters */}
        <View style={styles.statusFilters}>
          {['', 'draft', 'scheduled', 'sent'].map((status) => (
            <TouchableOpacity key={status} style={[styles.statusFilter, filters.status === status && styles.statusFilterActive]} onPress={() => setFilters(prev => ({ ...prev, status, page: 1 }))}>
              <Text style={[styles.statusFilterText, filters.status === status && styles.statusFilterTextActive]}>{status || t('common.all', 'All')}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <DataTable columns={columns} data={campaigns} keyExtractor={(c) => c.id} loading={loading} searchable searchPlaceholder={t('admin.email.searchPlaceholder', 'Search campaigns...')} onSearch={handleSearch} pagination={{ page: filters.page || 1, pageSize: filters.page_size || 20, total: totalCampaigns, onPageChange: handlePageChange }} actions={renderActions} emptyMessage={t('admin.email.noCampaigns', 'No campaigns found')} />

        {/* Composer Modal */}
        <Modal visible={showComposer} transparent animationType="slide" onRequestClose={() => setShowComposer(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.composerModal}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>{selectedCampaign ? t('admin.email.editCampaign', 'Edit Campaign') : t('admin.email.createCampaign', 'Create Campaign')}</Text>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>{t('admin.email.campaignName', 'Campaign Name')}</Text>
                  <TextInput style={styles.formInput} value={formData.name} onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))} placeholder={t('admin.email.namePlaceholder', 'e.g., Weekly Newsletter')} placeholderTextColor={colors.textMuted} />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>{t('admin.email.subject', 'Email Subject')}</Text>
                  <TextInput style={styles.formInput} value={formData.subject} onChangeText={(text) => setFormData(prev => ({ ...prev, subject: text }))} placeholder={t('admin.email.subjectPlaceholder', `e.g., Your weekly update from ${t('common.appName', 'Bayit+')}`)} placeholderTextColor={colors.textMuted} />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>{t('admin.email.body', 'Email Body (HTML)')}</Text>
                  <TextInput style={[styles.formInput, styles.bodyInput]} value={formData.body_html} onChangeText={(text) => setFormData(prev => ({ ...prev, body_html: text }))} placeholder={t('admin.email.bodyPlaceholder', 'Enter HTML content...')} placeholderTextColor={colors.textMuted} multiline numberOfLines={10} textAlignVertical="top" />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>{t('admin.email.audience', 'Target Audience')}</Text>
                  <View style={styles.audienceOptions}>
                    {['all', 'premium', 'inactive'].map((audience) => (
                      <TouchableOpacity key={audience} style={[styles.audienceOption, (formData.audience_filter as any).segment === audience && styles.audienceOptionActive]} onPress={() => setFormData(prev => ({ ...prev, audience_filter: audience === 'all' ? {} : { segment: audience } }))}>
                        <Text style={[styles.audienceOptionText, (formData.audience_filter as any).segment === audience && styles.audienceOptionTextActive]}>{audience === 'all' ? 'All Users' : audience}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.cancelButton} onPress={() => setShowComposer(false)}><Text style={styles.cancelButtonText}>{t('common.cancel', 'Cancel')}</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.saveButton, saving && styles.saveButtonDisabled]} onPress={handleSaveCampaign} disabled={saving}>
                    {saving ? <ActivityIndicator size="small" color={colors.text} /> : <Text style={styles.saveButtonText}>{t('common.save', 'Save')}</Text>}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Test Email Modal */}
        <Modal visible={showTestModal} transparent animationType="fade" onRequestClose={() => setShowTestModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.testModal}>
              <Text style={styles.modalTitle}>{t('admin.email.sendTest', 'Send Test Email')}</Text>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{t('admin.email.testEmail', 'Email Address')}</Text>
                <TextInput style={styles.formInput} value={testEmail} onChangeText={setTestEmail} placeholder="test@example.com" placeholderTextColor={colors.textMuted} keyboardType="email-address" autoCapitalize="none" />
              </View>
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setShowTestModal(false)}><Text style={styles.cancelButtonText}>{t('common.cancel', 'Cancel')}</Text></TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={handleTestEmail}><Text style={styles.saveButtonText}>{t('admin.email.sendTest', 'Send Test')}</Text></TouchableOpacity>
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
  campaignName: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  subjectText: { fontSize: fontSize.sm, color: colors.textSecondary },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.sm, alignSelf: 'flex-start' },
  statusText: { fontSize: fontSize.xs, fontWeight: '600', textTransform: 'capitalize' },
  countText: { fontSize: fontSize.sm, color: colors.text },
  dateText: { fontSize: fontSize.xs, color: colors.textSecondary },
  actionsRow: { flexDirection: 'row', gap: spacing.xs },
  actionButton: { width: 28, height: 28, borderRadius: borderRadius.sm, backgroundColor: colors.backgroundLighter, justifyContent: 'center', alignItems: 'center' },
  sendButton: { backgroundColor: colors.success + '30' },
  deleteButton: { backgroundColor: colors.error + '30' },
  actionIcon: { fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', alignItems: 'center' },
  composerModal: { width: '95%', maxWidth: 600, maxHeight: '90%', backgroundColor: colors.backgroundLight, borderRadius: borderRadius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.glassBorder },
  testModal: { width: '90%', maxWidth: 400, backgroundColor: colors.backgroundLight, borderRadius: borderRadius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.glassBorder },
  modalTitle: { fontSize: fontSize.xl, fontWeight: 'bold', color: colors.text, marginBottom: spacing.lg },
  formGroup: { marginBottom: spacing.md },
  formLabel: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  formInput: { backgroundColor: colors.backgroundLighter, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.glassBorder, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.text, fontSize: fontSize.md },
  bodyInput: { minHeight: 200 },
  audienceOptions: { flexDirection: 'row', gap: spacing.sm },
  audienceOption: { flex: 1, paddingVertical: spacing.sm, backgroundColor: colors.backgroundLighter, borderRadius: borderRadius.md, alignItems: 'center', borderWidth: 1, borderColor: colors.glassBorder },
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

export default EmailCampaignsScreen;
