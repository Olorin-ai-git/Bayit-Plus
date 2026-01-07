import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Plus, Send, Clock, Edit2, Trash2, TestTube } from 'lucide-react';
import DataTable from '@/components/admin/DataTable';
import { marketingService } from '@/services/adminApi';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassButton, GlassModal, GlassInput, GlassTextarea } from '@bayit/shared/ui';
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

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: 'rgba(107, 114, 128, 0.2)', text: '#6B7280', label: 'טיוטה' },
  active: { bg: 'rgba(34, 197, 94, 0.2)', text: '#22C55E', label: 'פעיל' },
  scheduled: { bg: 'rgba(245, 158, 11, 0.2)', text: '#F59E0B', label: 'מתוזמן' },
  completed: { bg: 'rgba(139, 92, 246, 0.2)', text: '#8B5CF6', label: 'הושלם' },
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('he-IL', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

export default function EmailCampaignsPage() {
  const { t } = useTranslation();
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 20, total: 0 });
  const [filters, setFilters] = useState({ search: '', status: 'all' });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<EmailCampaign | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [newCampaign, setNewCampaign] = useState({ name: '', subject: '', body: '' });

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
      alert('נא למלא שם ונושא');
      return;
    }
    try {
      await marketingService.createEmailCampaign(newCampaign);
      setShowCreateModal(false);
      setNewCampaign({ name: '', subject: '', body: '' });
      loadCampaigns();
    } catch (error) {
      logger.error('Failed to create email campaign', 'EmailCampaignsPage', error);
    }
  };

  const handleSend = async (campaign: EmailCampaign) => {
    if (!window.confirm(`שלח את הקמפיין "${campaign.name}"?`)) return;
    try {
      await marketingService.sendEmailCampaign(campaign.id);
      loadCampaigns();
    } catch (error) {
      logger.error('Failed to send email campaign', 'EmailCampaignsPage', error);
    }
  };

  const handleDelete = async (campaign: EmailCampaign) => {
    if (!window.confirm(`מחק את הקמפיין "${campaign.name}"?`)) return;
    try {
      await marketingService.deleteEmailCampaign(campaign.id);
      loadCampaigns();
    } catch (error) {
      logger.error('Failed to delete email campaign', 'EmailCampaignsPage', error);
    }
  };

  const handleSendTest = async () => {
    if (!selectedCampaign || !testEmail) return;
    try {
      await marketingService.sendTestEmail(selectedCampaign.id, testEmail);
      alert('אימייל בדיקה נשלח!');
      setShowTestModal(false);
      setTestEmail('');
    } catch (error) {
      logger.error('Failed to send test email', 'EmailCampaignsPage', error);
    }
  };

  const openTestModal = (campaign: EmailCampaign) => {
    setSelectedCampaign(campaign);
    setShowTestModal(true);
  };

  const getStatusBadge = (status: string) => {
    const style = statusColors[status] || statusColors.draft;
    return (
      <View style={[styles.badge, { backgroundColor: style.bg }]}>
        <Text style={[styles.badgeText, { color: style.text }]}>{style.label}</Text>
      </View>
    );
  };

  const columns = [
    {
      key: 'name',
      label: 'שם הקמפיין',
      render: (_: any, campaign: EmailCampaign) => (
        <View>
          <Text style={styles.campaignName}>{campaign.name}</Text>
          <Text style={styles.campaignSubject}>{campaign.subject}</Text>
        </View>
      ),
    },
    { key: 'status', label: 'סטטוס', width: 100, render: (status: string) => getStatusBadge(status) },
    { key: 'sent', label: 'נשלחו', width: 80, render: (sent: number) => <Text style={styles.statText}>{sent.toLocaleString()}</Text> },
    { key: 'opened', label: 'נפתחו', width: 80, render: (opened: number) => <Text style={styles.statText}>{opened.toLocaleString()}</Text> },
    { key: 'clicked', label: 'הקליקו', width: 80, render: (clicked: number) => <Text style={styles.statText}>{clicked.toLocaleString()}</Text> },
    { key: 'created_at', label: 'נוצר', width: 150, render: (date: string) => <Text style={styles.dateText}>{formatDate(date)}</Text> },
    {
      key: 'actions',
      label: '',
      width: 140,
      render: (_: any, campaign: EmailCampaign) => (
        <View style={styles.actionsRow}>
          {campaign.status === 'draft' && (
            <Pressable style={styles.actionButton} onPress={() => handleSend(campaign)}>
              <Send size={14} color={colors.success} />
            </Pressable>
          )}
          <Pressable style={styles.actionButton} onPress={() => openTestModal(campaign)}>
            <TestTube size={14} color={colors.primary} />
          </Pressable>
          <Pressable style={styles.actionButton} onPress={() => handleDelete(campaign)}>
            <Trash2 size={14} color={colors.error} />
          </Pressable>
        </View>
      ),
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <View>
          <Text style={styles.pageTitle}>{t('admin.titles.emailCampaigns', 'קמפייני אימייל')}</Text>
          <Text style={styles.subtitle}>צור ונהל קמפייני דיוור</Text>
        </View>
        <GlassButton title="קמפיין חדש" variant="primary" icon={<Plus size={16} color={colors.text} />} onPress={() => setShowCreateModal(true)} />
      </View>

      <View style={styles.filtersRow}>
        {['all', 'draft', 'active', 'scheduled', 'completed'].map((status) => (
          <Pressable key={status} onPress={() => setFilters((prev) => ({ ...prev, status }))} style={[styles.filterButton, filters.status === status && styles.filterButtonActive]}>
            <Text style={[styles.filterText, filters.status === status && styles.filterTextActive]}>
              {status === 'all' ? 'הכל' : statusColors[status]?.label || status}
            </Text>
          </Pressable>
        ))}
      </View>

      <DataTable columns={columns} data={campaigns} loading={loading} searchPlaceholder="חפש קמפיין..." onSearch={handleSearch} pagination={pagination} onPageChange={handlePageChange} emptyMessage="לא נמצאו קמפיינים" />

      <GlassModal visible={showCreateModal} onClose={() => setShowCreateModal(false)} title="קמפיין אימייל חדש">
        <View style={styles.modalContent}>
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>שם הקמפיין</Text>
            <TextInput style={styles.input} value={newCampaign.name} onChangeText={(name) => setNewCampaign((p) => ({ ...p, name }))} placeholder="לדוגמה: מבצע סוף שנה" placeholderTextColor={colors.textMuted} />
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>נושא האימייל</Text>
            <TextInput style={styles.input} value={newCampaign.subject} onChangeText={(subject) => setNewCampaign((p) => ({ ...p, subject }))} placeholder="נושא שיופיע לנמענים" placeholderTextColor={colors.textMuted} />
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>תוכן</Text>
            <TextInput style={[styles.input, styles.textArea]} value={newCampaign.body} onChangeText={(body) => setNewCampaign((p) => ({ ...p, body }))} placeholder="תוכן האימייל..." placeholderTextColor={colors.textMuted} multiline numberOfLines={5} />
          </View>
          <View style={styles.modalActions}>
            <GlassButton title="ביטול" variant="secondary" onPress={() => setShowCreateModal(false)} />
            <GlassButton title="צור קמפיין" variant="primary" onPress={handleCreate} />
          </View>
        </View>
      </GlassModal>

      <GlassModal visible={showTestModal} onClose={() => setShowTestModal(false)} title="שלח אימייל בדיקה">
        <View style={styles.modalContent}>
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>כתובת אימייל</Text>
            <TextInput style={styles.input} value={testEmail} onChangeText={setTestEmail} placeholder="test@example.com" placeholderTextColor={colors.textMuted} keyboardType="email-address" />
          </View>
          <View style={styles.modalActions}>
            <GlassButton title="ביטול" variant="secondary" onPress={() => setShowTestModal(false)} />
            <GlassButton title="שלח בדיקה" variant="primary" onPress={handleSendTest} />
          </View>
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
  campaignName: { fontSize: 14, fontWeight: '500', color: colors.text },
  campaignSubject: { fontSize: 12, color: colors.textMuted },
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
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.md },
});
