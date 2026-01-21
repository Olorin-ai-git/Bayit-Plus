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
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView } from '../ui';
import { colors } from '../../theme';
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
  { id: 'open', labelKey: 'admin.support.status.open', color: '#fbbf24' },
  { id: 'in_progress', labelKey: 'admin.support.status.inProgress', color: '#a855f7' },
  { id: 'resolved', labelKey: 'admin.support.status.resolved', color: '#10b981' },
  { id: 'closed', labelKey: 'admin.support.status.closed', color: '#9ca3af' },
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
      <View className="flex-1 bg-black/70 justify-center items-center p-4">
        <GlassView className="w-full rounded-3xl p-4" style={{ maxWidth: isTV ? 700 : 600, maxHeight: '95%' }}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View className="justify-between items-center mb-4" style={{ flexDirection }}>
              <View className="flex-row items-center gap-2">
                <Text className="font-bold text-white font-mono" style={{ fontSize: isTV ? 18 : 16 }}>
                  #{ticket.id.slice(-6).toUpperCase()}
                </Text>
                <View
                  className="px-2 py-1 rounded-full"
                  style={{ backgroundColor: `${currentStatus?.color}20` }}
                >
                  <Text
                    className="font-semibold"
                    style={{ color: currentStatus?.color, fontSize: isTV ? 12 : 10 }}
                  >
                    {t(currentStatus?.labelKey || '', ticket.status)}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                className="bg-white/10 justify-center items-center"
                style={{ width: isTV ? 40 : 32, height: isTV ? 40 : 32, borderRadius: isTV ? 20 : 16 }}
                onPress={onClose}
              >
                <Text className="text-white" style={{ fontSize: isTV ? 20 : 16 }}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Subject */}
            <Text className="text-white font-semibold mb-4" style={[{ textAlign }, { fontSize: isTV ? 22 : 18 }]}>
              {ticket.subject}
            </Text>

            {/* Meta Info */}
            <View className="bg-white/5 rounded-lg p-4 mb-4">
              <View className="flex-row justify-between mb-1">
                <Text className="text-gray-400" style={{ fontSize: isTV ? 14 : 12 }}>
                  {t('admin.support.detail.user', 'User')}
                </Text>
                <Text className="text-white font-medium" style={{ fontSize: isTV ? 14 : 12 }}>
                  {ticket.user_email || ticket.user_id}
                </Text>
              </View>
              <View className="flex-row justify-between mb-1">
                <Text className="text-gray-400" style={{ fontSize: isTV ? 14 : 12 }}>
                  {t('admin.support.detail.category', 'Category')}
                </Text>
                <Text className="text-white font-medium" style={{ fontSize: isTV ? 14 : 12 }}>
                  {t(`admin.support.category.${ticket.category}`, ticket.category)}
                </Text>
              </View>
              <View className="flex-row justify-between mb-1">
                <Text className="text-gray-400" style={{ fontSize: isTV ? 14 : 12 }}>
                  {t('admin.support.detail.priority', 'Priority')}
                </Text>
                <Text className="text-white font-medium" style={{ fontSize: isTV ? 14 : 12 }}>
                  {t(`admin.support.priority.${ticket.priority}`, ticket.priority)}
                </Text>
              </View>
              <View className="flex-row justify-between mb-1">
                <Text className="text-gray-400" style={{ fontSize: isTV ? 14 : 12 }}>
                  {t('admin.support.detail.created', 'Created')}
                </Text>
                <Text className="text-white font-medium" style={{ fontSize: isTV ? 14 : 12 }}>
                  {formatDateTime(ticket.created_at)}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-400" style={{ fontSize: isTV ? 14 : 12 }}>
                  {t('admin.support.detail.language', 'Language')}
                </Text>
                <Text className="text-white font-medium" style={{ fontSize: isTV ? 14 : 12 }}>
                  {ticket.language.toUpperCase()}
                </Text>
              </View>
            </View>

            {/* Message */}
            <View className="mb-4">
              <Text className="text-white font-semibold mb-2" style={{ fontSize: isTV ? 16 : 14 }}>
                {t('admin.support.detail.message', 'Customer Message')}
              </Text>
              <GlassView className="p-4 rounded-lg">
                <Text className="text-gray-400" style={[{ textAlign }, { fontSize: isTV ? 14 : 12, lineHeight: isTV ? 22 : 20 }]}>
                  {ticket.message}
                </Text>
              </GlassView>
            </View>

            {/* Status Actions */}
            <View className="mb-4">
              <Text className="text-white font-semibold mb-2" style={{ fontSize: isTV ? 16 : 14 }}>
                {t('admin.support.detail.updateStatus', 'Update Status')}
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {statusOptions.map((status) => (
                  <TouchableOpacity
                    key={status.id}
                    className={`flex-row items-center px-4 py-2 rounded-lg border-2 gap-1 ${
                      selectedStatus === status.id ? 'bg-white/10' : 'bg-white/5'
                    }`}
                    style={selectedStatus === status.id ? { borderColor: status.color } : { borderColor: 'transparent' }}
                    onPress={() => handleStatusChange(status.id)}
                    disabled={loading}
                  >
                    <View
                      className="rounded-full"
                      style={{
                        width: isTV ? 10 : 8,
                        height: isTV ? 10 : 8,
                        backgroundColor: status.color
                      }}
                    />
                    <Text
                      className={selectedStatus === status.id ? 'text-white' : 'text-gray-400'}
                      style={[{ fontSize: isTV ? 14 : 12 }, selectedStatus === status.id && { color: status.color }]}
                    >
                      {t(status.labelKey, status.id)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Notes Section */}
            <View className="mb-4">
              <Text className="text-white font-semibold mb-2" style={{ fontSize: isTV ? 16 : 14 }}>
                {t('admin.support.detail.notes', 'Internal Notes')}
              </Text>

              {/* Existing Notes */}
              {ticket.notes && ticket.notes.length > 0 ? (
                <View style={{ gap: 8 }} className="mb-4">
                  {ticket.notes.map((note, index) => (
                    <View key={index} className="bg-white/5 rounded-lg p-4">
                      <View className="flex-row justify-between mb-1">
                        <Text className="text-purple-500 font-semibold" style={{ fontSize: isTV ? 12 : 10 }}>
                          {note.author}
                        </Text>
                        <Text className="text-gray-400" style={{ fontSize: isTV ? 10 : 8 }}>
                          {formatDateTime(note.created_at)}
                        </Text>
                      </View>
                      <Text className="text-white" style={[{ textAlign }, { fontSize: isTV ? 14 : 12, lineHeight: isTV ? 20 : 18 }]}>
                        {note.content}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text className="text-gray-400 italic mb-4" style={{ fontSize: isTV ? 14 : 12 }}>
                  {t('admin.support.detail.noNotes', 'No notes yet')}
                </Text>
              )}

              {/* Add Note */}
              <View style={{ gap: 8 }}>
                <View className="flex-row justify-between items-center">
                  <Text className="text-gray-400" style={{ fontSize: isTV ? 14 : 12 }}>
                    {t('admin.support.detail.addNote', 'Add Note')}
                  </Text>
                  <TouchableOpacity
                    className="px-2 py-1 bg-purple-500/20 rounded-lg"
                    onPress={() => setShowTemplates(true)}
                  >
                    <Text className="text-purple-500 font-medium" style={{ fontSize: isTV ? 12 : 10 }}>
                      {t('admin.support.detail.useTemplate', 'Use Template')}
                    </Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  className="bg-white/5 rounded-lg p-4 text-white border-2 border-transparent"
                  style={[
                    { fontSize: isTV ? 14 : 12, minHeight: isTV ? 100 : 80 },
                    isRTL && { textAlign: 'right' }
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
                  className={`p-4 rounded-lg items-center ${(!newNote.trim() || loading) ? 'opacity-50' : ''}`}
                  style={{ backgroundColor: '#a855f7' }}
                  onPress={handleAddNote}
                  disabled={!newNote.trim() || loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#000000" />
                  ) : (
                    <Text className="font-semibold" style={{ fontSize: isTV ? 14 : 12, color: '#000000' }}>
                      {t('admin.support.detail.saveNote', 'Save Note')}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Quick Actions */}
            <View className="flex-row gap-4">
              <TouchableOpacity
                className="flex-1 p-4 rounded-lg items-center"
                style={{ backgroundColor: '#10b981' }}
                onPress={() => {
                  handleStatusChange('resolved');
                }}
              >
                <Text className="font-semibold" style={{ fontSize: isTV ? 14 : 12, color: '#000000' }}>
                  {t('admin.support.action.resolve', 'Mark Resolved')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-white/10 p-4 rounded-lg items-center"
                onPress={onClose}
              >
                <Text className="text-white font-semibold" style={{ fontSize: isTV ? 14 : 12 }}>
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

export default SupportTicketDetail;
