/**
 * Support Ticket Detail
 * Admin modal for viewing and managing a support ticket
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView } from '../ui';
import { colors, spacing, borderRadius } from '../../theme';
import { useDirection } from '../../hooks/useDirection';
import { isTV } from '../../utils/platform';
import { SupportResponseTemplates } from './SupportResponseTemplates';

interface AdminTicket {
  id: string;
  user_id: string;
  user_email?: string;
  subject: string;
  message: string;
  category: string;
  status: string;
  priority: string;
  language: string;
  created_at: string;
  updated_at: string;
  assigned_to?: string;
  notes: Array<{
    content: string;
    author: string;
    created_at: string;
  }>;
}

interface SupportTicketDetailProps {
  ticket: AdminTicket;
  onClose: () => void;
  onUpdate: (ticketId: string, updates: {
    status?: string;
    assigned_to?: string;
    note?: string;
  }) => Promise<void>;
}

const statusOptions = [
  { id: 'open', labelKey: 'admin.support.status.open', color: colors.warning },
  { id: 'in_progress', labelKey: 'admin.support.status.inProgress', color: colors.primary },
  { id: 'resolved', labelKey: 'admin.support.status.resolved', color: colors.success },
  { id: 'closed', labelKey: 'admin.support.status.closed', color: colors.textSecondary },
];

export const SupportTicketDetail: React.FC<SupportTicketDetailProps> = ({
  ticket,
  onClose,
  onUpdate,
}) => {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();

  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(ticket.status);
  const [showTemplates, setShowTemplates] = useState(false);

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleStatusChange = async (newStatus: string) => {
    setSelectedStatus(newStatus);
    setLoading(true);
    try {
      await onUpdate(ticket.id, { status: newStatus });
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    setLoading(true);
    try {
      await onUpdate(ticket.id, { note: newNote.trim() });
      setNewNote('');
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = (template: string) => {
    setNewNote(template);
    setShowTemplates(false);
  };

  const currentStatus = statusOptions.find((s) => s.id === selectedStatus);

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <GlassView style={styles.modal}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={[styles.header, { flexDirection }]}>
              <View style={styles.headerLeft}>
                <Text style={styles.ticketId}>
                  #{ticket.id.slice(-6).toUpperCase()}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: `${currentStatus?.color}20` },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: currentStatus?.color },
                    ]}
                  >
                    {t(currentStatus?.labelKey || '', ticket.status)}
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Subject */}
            <Text style={[styles.subject, { textAlign }]}>{ticket.subject}</Text>

            {/* Meta Info */}
            <View style={styles.metaSection}>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>
                  {t('admin.support.detail.user', 'User')}
                </Text>
                <Text style={styles.metaValue}>
                  {ticket.user_email || ticket.user_id}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>
                  {t('admin.support.detail.category', 'Category')}
                </Text>
                <Text style={styles.metaValue}>
                  {t(`admin.support.category.${ticket.category}`, ticket.category)}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>
                  {t('admin.support.detail.priority', 'Priority')}
                </Text>
                <Text style={styles.metaValue}>
                  {t(`admin.support.priority.${ticket.priority}`, ticket.priority)}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>
                  {t('admin.support.detail.created', 'Created')}
                </Text>
                <Text style={styles.metaValue}>
                  {formatDateTime(ticket.created_at)}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>
                  {t('admin.support.detail.language', 'Language')}
                </Text>
                <Text style={styles.metaValue}>
                  {ticket.language.toUpperCase()}
                </Text>
              </View>
            </View>

            {/* Message */}
            <View style={styles.messageSection}>
              <Text style={styles.sectionTitle}>
                {t('admin.support.detail.message', 'Customer Message')}
              </Text>
              <GlassView style={styles.messageBox}>
                <Text style={[styles.messageText, { textAlign }]}>
                  {ticket.message}
                </Text>
              </GlassView>
            </View>

            {/* Status Actions */}
            <View style={styles.actionsSection}>
              <Text style={styles.sectionTitle}>
                {t('admin.support.detail.updateStatus', 'Update Status')}
              </Text>
              <View style={styles.statusOptions}>
                {statusOptions.map((status) => (
                  <TouchableOpacity
                    key={status.id}
                    style={[
                      styles.statusOption,
                      selectedStatus === status.id && styles.statusOptionActive,
                      selectedStatus === status.id && {
                        borderColor: status.color,
                      },
                    ]}
                    onPress={() => handleStatusChange(status.id)}
                    disabled={loading}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: status.color },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusOptionText,
                        selectedStatus === status.id && { color: status.color },
                      ]}
                    >
                      {t(status.labelKey, status.id)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Notes Section */}
            <View style={styles.notesSection}>
              <Text style={styles.sectionTitle}>
                {t('admin.support.detail.notes', 'Internal Notes')}
              </Text>

              {/* Existing Notes */}
              {ticket.notes && ticket.notes.length > 0 ? (
                <View style={styles.notesList}>
                  {ticket.notes.map((note, index) => (
                    <View key={index} style={styles.noteItem}>
                      <View style={styles.noteHeader}>
                        <Text style={styles.noteAuthor}>{note.author}</Text>
                        <Text style={styles.noteTime}>
                          {formatDateTime(note.created_at)}
                        </Text>
                      </View>
                      <Text style={[styles.noteContent, { textAlign }]}>
                        {note.content}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.noNotes}>
                  {t('admin.support.detail.noNotes', 'No notes yet')}
                </Text>
              )}

              {/* Add Note */}
              <View style={styles.addNoteContainer}>
                <View style={styles.addNoteHeader}>
                  <Text style={styles.addNoteLabel}>
                    {t('admin.support.detail.addNote', 'Add Note')}
                  </Text>
                  <TouchableOpacity
                    style={styles.templateButton}
                    onPress={() => setShowTemplates(true)}
                  >
                    <Text style={styles.templateButtonText}>
                      {t('admin.support.detail.useTemplate', 'Use Template')}
                    </Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={[
                    styles.noteInput,
                    isRTL && styles.noteInputRTL,
                  ]}
                  value={newNote}
                  onChangeText={setNewNote}
                  placeholder={t('admin.support.detail.notePlaceholder', 'Write a note...')}
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
                <TouchableOpacity
                  style={[
                    styles.addNoteButton,
                    (!newNote.trim() || loading) && styles.addNoteButtonDisabled,
                  ]}
                  onPress={handleAddNote}
                  disabled={!newNote.trim() || loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={colors.background} />
                  ) : (
                    <Text style={styles.addNoteButtonText}>
                      {t('admin.support.detail.saveNote', 'Save Note')}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Quick Actions */}
            <View style={styles.quickActions}>
              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={() => {
                  handleStatusChange('resolved');
                }}
              >
                <Text style={styles.quickActionText}>
                  {t('admin.support.action.resolve', 'Mark Resolved')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickActionButton, styles.quickActionButtonSecondary]}
                onPress={onClose}
              >
                <Text style={styles.quickActionTextSecondary}>
                  {t('common.close', 'Close')}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </GlassView>
      </View>

      {/* Templates Modal */}
      {showTemplates && (
        <SupportResponseTemplates
          onSelect={handleTemplateSelect}
          onClose={() => setShowTemplates(false)}
          language={ticket.language}
        />
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modal: {
    width: '100%',
    maxWidth: isTV ? 700 : 600,
    maxHeight: '95%',
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  ticketId: {
    fontSize: isTV ? 18 : 16,
    fontWeight: 'bold',
    color: colors.text,
    fontFamily: 'monospace',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: isTV ? 12 : 10,
    fontWeight: '600',
  },
  closeButton: {
    width: isTV ? 40 : 32,
    height: isTV ? 40 : 32,
    borderRadius: isTV ? 20 : 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: isTV ? 20 : 16,
    color: colors.text,
  },
  subject: {
    fontSize: isTV ? 22 : 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  metaSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  metaLabel: {
    fontSize: isTV ? 14 : 12,
    color: colors.textSecondary,
  },
  metaValue: {
    fontSize: isTV ? 14 : 12,
    color: colors.text,
    fontWeight: '500',
  },
  messageSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: isTV ? 16 : 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  messageBox: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  messageText: {
    fontSize: isTV ? 14 : 12,
    color: colors.textSecondary,
    lineHeight: isTV ? 22 : 20,
  },
  actionsSection: {
    marginBottom: spacing.lg,
  },
  statusOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: spacing.xs,
  },
  statusOptionActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  statusDot: {
    width: isTV ? 10 : 8,
    height: isTV ? 10 : 8,
    borderRadius: isTV ? 5 : 4,
  },
  statusOptionText: {
    fontSize: isTV ? 14 : 12,
    color: colors.textSecondary,
  },
  notesSection: {
    marginBottom: spacing.lg,
  },
  notesList: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  noteItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  noteAuthor: {
    fontSize: isTV ? 12 : 10,
    color: colors.primary,
    fontWeight: '600',
  },
  noteTime: {
    fontSize: isTV ? 10 : 8,
    color: colors.textSecondary,
  },
  noteContent: {
    fontSize: isTV ? 14 : 12,
    color: colors.text,
    lineHeight: isTV ? 20 : 18,
  },
  noNotes: {
    fontSize: isTV ? 14 : 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: spacing.md,
  },
  addNoteContainer: {
    gap: spacing.sm,
  },
  addNoteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addNoteLabel: {
    fontSize: isTV ? 14 : 12,
    color: colors.textSecondary,
  },
  templateButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    borderRadius: borderRadius.lg,
  },
  templateButtonText: {
    fontSize: isTV ? 12 : 10,
    color: colors.primary,
    fontWeight: '500',
  },
  noteInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    fontSize: isTV ? 14 : 12,
    color: colors.text,
    minHeight: isTV ? 100 : 80,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  noteInputRTL: {
    textAlign: 'right',
  },
  addNoteButton: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  addNoteButtonDisabled: {
    opacity: 0.5,
  },
  addNoteButtonText: {
    fontSize: isTV ? 14 : 12,
    fontWeight: '600',
    color: colors.background,
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: colors.success,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  quickActionButtonSecondary: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  quickActionText: {
    fontSize: isTV ? 14 : 12,
    fontWeight: '600',
    color: colors.background,
  },
  quickActionTextSecondary: {
    fontSize: isTV ? 14 : 12,
    fontWeight: '600',
    color: colors.text,
  },
});

export default SupportTicketDetail;
