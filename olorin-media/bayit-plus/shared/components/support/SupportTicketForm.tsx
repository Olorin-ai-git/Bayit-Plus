/**
 * Support Ticket Form
 * Form for creating support tickets
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView } from '../ui';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import { useDirection } from '../../hooks/useDirection';
import { useSupportStore } from '../../stores/supportStore';
import { isTV } from '../../utils/platform';
import { supportConfig } from '../../config/supportConfig';

interface SupportTicketFormProps {
  onClose: () => void;
  onSuccess?: () => void;
}

const categories = [
  { id: 'billing', labelKey: 'support.ticket.category.billing', icon: '💳' },
  { id: 'technical', labelKey: 'support.ticket.category.technical', icon: '🔧' },
  { id: 'feature', labelKey: 'support.ticket.category.feature', icon: '✨' },
  { id: 'general', labelKey: 'support.ticket.category.general', icon: '💬' },
];

const priorities = [
  { id: 'low', labelKey: 'support.ticket.priority.low', color: colors.success },
  { id: 'medium', labelKey: 'support.ticket.priority.medium', color: colors.warning },
  { id: 'high', labelKey: 'support.ticket.priority.high', color: colors.error },
];

export const SupportTicketForm: React.FC<SupportTicketFormProps> = ({
  onClose,
  onSuccess,
}) => {
  const { t, i18n } = useTranslation();
  const { isRTL, textAlign } = useDirection();
  const { addTicket } = useSupportStore();

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('general');
  const [priority, setPriority] = useState('medium');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) {
      setError(t('support.ticket.error.required', 'Please fill in all required fields'));
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const language = i18n.language || supportConfig.documentation.defaultLanguage;
      const apiUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
        ? 'http://localhost:8000/api/v1/support'
        : '/api/v1/support';

      const response = await fetch(`${apiUrl}/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: subject.trim(),
          message: message.trim(),
          category,
          priority,
          language,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create ticket');
      }

      const data = await response.json();

      // Add to local store
      addTicket({
        id: data.ticket_id,
        subject: subject.trim(),
        message: message.trim(),
        category,
        priority,
        status: 'open',
        createdAt: new Date().toISOString(),
      });

      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('[SupportTicketForm] Error creating ticket:', err);
      setError(t('support.ticket.error.submit', 'Failed to create ticket. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/70 justify-center items-center p-4 md:p-6">
        <GlassView className={`w-full ${isTV ? 'max-w-[600px]' : 'max-w-[500px]'} max-h-[90%] p-4 md:p-6 rounded-2xl`}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View className="flex-row justify-between items-center mb-4 md:mb-6">
              <Text className={`${isTV ? 'text-2xl' : 'text-xl'} font-bold text-white flex-1`} style={{ textAlign }}>
                {t('support.ticket.title', 'Create Support Ticket')}
              </Text>
              <TouchableOpacity className={`${isTV ? 'w-10 h-10' : 'w-8 h-8'} ${isTV ? 'rounded-[20px]' : 'rounded-2xl'} bg-white/10 justify-center items-center`} onPress={onClose}>
                <Text className={`${isTV ? 'text-xl' : 'text-base'} text-white`}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Error Message */}
            {error && (
              <View className="bg-red-500/10 p-3 md:p-4 rounded-lg mb-3 md:mb-4">
                <Text className={`${isTV ? 'text-sm' : 'text-xs'} text-red-500`} style={{ textAlign }}>{error}</Text>
              </View>
            )}

            {/* Subject Input */}
            <View className="mb-4 md:mb-6">
              <Text className={`${isTV ? 'text-base' : 'text-sm'} font-semibold text-white mb-2`} style={{ textAlign }}>
                {t('support.ticket.subject', 'Subject')} *
              </Text>
              <TextInput
                className={`bg-white/5 rounded-lg p-3 md:p-4 ${isTV ? 'text-base' : 'text-sm'} text-white border-2 ${focusedField === 'subject' ? 'border-purple-500' : 'border-transparent'} ${isRTL ? 'text-right' : ''}`}
                value={subject}
                onChangeText={setSubject}
                placeholder={t('support.ticket.subjectPlaceholder', 'Brief description of your issue')}
                placeholderTextColor={colors.textSecondary}
                onFocus={() => setFocusedField('subject')}
                onBlur={() => setFocusedField(null)}
                maxLength={200}
              />
            </View>

            {/* Category Selection */}
            <View className="mb-4 md:mb-6">
              <Text className={`${isTV ? 'text-base' : 'text-sm'} font-semibold text-white mb-2`} style={{ textAlign }}>
                {t('support.ticket.categoryLabel', 'Category')}
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    className={`flex-row items-center px-3 md:px-4 py-2 ${category === cat.id ? 'bg-purple-500/20 border-purple-500' : 'bg-white/5'} rounded-lg gap-1 border-2 ${category === cat.id ? 'border-purple-500' : 'border-transparent'}`}
                    onPress={() => setCategory(cat.id)}
                  >
                    <Text className={`${isTV ? 'text-base' : 'text-sm'}`}>{cat.icon}</Text>
                    <Text
                      className={`${isTV ? 'text-sm' : 'text-xs'} ${category === cat.id ? 'text-purple-500 font-semibold' : 'text-gray-400'}`}
                    >
                      {t(cat.labelKey, cat.id)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Priority Selection */}
            <View className="mb-4 md:mb-6">
              <Text className={`${isTV ? 'text-base' : 'text-sm'} font-semibold text-white mb-2`} style={{ textAlign }}>
                {t('support.ticket.priorityLabel', 'Priority')}
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {priorities.map((pri) => (
                  <TouchableOpacity
                    key={pri.id}
                    className={`flex-row items-center px-3 md:px-4 py-2 ${priority === pri.id ? 'bg-white/10' : 'bg-white/5'} rounded-lg gap-2 border-2`}
                    style={{ borderColor: priority === pri.id ? pri.color : 'transparent' }}
                    onPress={() => setPriority(pri.id)}
                  >
                    <View
                      className={`${isTV ? 'w-2.5 h-2.5 rounded-[5px]' : 'w-2 h-2 rounded-[4px]'}`}
                      style={{ backgroundColor: pri.color }}
                    />
                    <Text
                      className={`${isTV ? 'text-sm' : 'text-xs'} ${priority === pri.id ? 'text-purple-500 font-semibold' : 'text-gray-400'}`}
                    >
                      {t(pri.labelKey, pri.id)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Message Input */}
            <View className="mb-4 md:mb-6">
              <Text className={`${isTV ? 'text-base' : 'text-sm'} font-semibold text-white mb-2`} style={{ textAlign }}>
                {t('support.ticket.message', 'Message')} *
              </Text>
              <TextInput
                className={`bg-white/5 rounded-lg p-3 md:p-4 ${isTV ? 'text-base' : 'text-sm'} text-white border-2 ${focusedField === 'message' ? 'border-purple-500' : 'border-transparent'} ${isTV ? 'min-h-[150px]' : 'min-h-[120px]'} ${isRTL ? 'text-right' : ''}`}
                value={message}
                onChangeText={setMessage}
                placeholder={t('support.ticket.messagePlaceholder', 'Describe your issue in detail...')}
                placeholderTextColor={colors.textSecondary}
                onFocus={() => setFocusedField('message')}
                onBlur={() => setFocusedField(null)}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                maxLength={2000}
              />
              <Text className={`${isTV ? 'text-xs' : 'text-[10px]'} text-gray-400 text-right mt-1`}>
                {message.length}/2000
              </Text>
            </View>

            {/* Actions */}
            <View className="flex-row gap-3 md:gap-4 mt-3 md:mt-4">
              <TouchableOpacity
                className="flex-1 p-3 md:p-4 rounded-lg bg-white/10 items-center"
                onPress={onClose}
                disabled={loading}
              >
                <Text className={`${isTV ? 'text-base' : 'text-sm'} font-semibold text-white`}>
                  {t('common.cancel', 'Cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-[2] p-3 md:p-4 rounded-lg bg-purple-500 items-center justify-center ${loading ? 'opacity-60' : ''}`}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={colors.background} />
                ) : (
                  <Text className={`${isTV ? 'text-base' : 'text-sm'} font-semibold text-black`}>
                    {t('support.ticket.submit', 'Submit Ticket')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </GlassView>
      </View>
    </Modal>
  );
};

export default SupportTicketForm;
