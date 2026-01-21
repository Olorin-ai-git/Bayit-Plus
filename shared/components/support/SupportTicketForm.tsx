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
  StyleSheet,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView } from '../ui';
import { colors, spacing, borderRadius } from '../../theme';
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
      <View style={styles.overlay}>
        <GlassView style={styles.modal}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={[styles.title, { textAlign }]}>
                {t('support.ticket.title', 'Create Support Ticket')}
              </Text>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Error Message */}
            {error && (
              <View style={styles.errorContainer}>
                <Text style={[styles.errorText, { textAlign }]}>{error}</Text>
              </View>
            )}

            {/* Subject Input */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { textAlign }]}>
                {t('support.ticket.subject', 'Subject')} *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  isRTL && styles.inputRTL,
                  focusedField === 'subject' && styles.inputFocused,
                ]}
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
            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { textAlign }]}>
                {t('support.ticket.categoryLabel', 'Category')}
              </Text>
              <View style={styles.optionsRow}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.optionButton,
                      category === cat.id && styles.optionButtonActive,
                    ]}
                    onPress={() => setCategory(cat.id)}
                  >
                    <Text style={styles.optionIcon}>{cat.icon}</Text>
                    <Text
                      style={[
                        styles.optionText,
                        category === cat.id && styles.optionTextActive,
                      ]}
                    >
                      {t(cat.labelKey, cat.id)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Priority Selection */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { textAlign }]}>
                {t('support.ticket.priorityLabel', 'Priority')}
              </Text>
              <View style={styles.optionsRow}>
                {priorities.map((pri) => (
                  <TouchableOpacity
                    key={pri.id}
                    style={[
                      styles.priorityButton,
                      priority === pri.id && styles.priorityButtonActive,
                      priority === pri.id && { borderColor: pri.color },
                    ]}
                    onPress={() => setPriority(pri.id)}
                  >
                    <View
                      style={[
                        styles.priorityDot,
                        { backgroundColor: pri.color },
                      ]}
                    />
                    <Text
                      style={[
                        styles.optionText,
                        priority === pri.id && styles.optionTextActive,
                      ]}
                    >
                      {t(pri.labelKey, pri.id)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Message Input */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { textAlign }]}>
                {t('support.ticket.message', 'Message')} *
              </Text>
              <TextInput
                style={[
                  styles.textArea,
                  isRTL && styles.inputRTL,
                  focusedField === 'message' && styles.inputFocused,
                ]}
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
              <Text style={styles.charCount}>
                {message.length}/2000
              </Text>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onClose}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>
                  {t('common.cancel', 'Cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  loading && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={colors.background} />
                ) : (
                  <Text style={styles.submitButtonText}>
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
    maxWidth: isTV ? 600 : 500,
    maxHeight: '90%',
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: isTV ? 24 : 20,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
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
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  errorText: {
    fontSize: isTV ? 14 : 12,
    color: colors.error,
  },
  fieldContainer: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: isTV ? 16 : 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    fontSize: isTV ? 16 : 14,
    color: colors.text,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  inputRTL: {
    textAlign: 'right',
  },
  inputFocused: {
    borderColor: colors.primary,
  },
  textArea: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    fontSize: isTV ? 16 : 14,
    color: colors.text,
    borderWidth: 2,
    borderColor: 'transparent',
    minHeight: isTV ? 150 : 120,
  },
  charCount: {
    fontSize: isTV ? 12 : 10,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionButtonActive: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    borderColor: colors.primary,
  },
  optionIcon: {
    fontSize: isTV ? 16 : 14,
  },
  optionText: {
    fontSize: isTV ? 14 : 12,
    color: colors.textSecondary,
  },
  optionTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  priorityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  priorityButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  priorityDot: {
    width: isTV ? 10 : 8,
    height: isTV ? 10 : 8,
    borderRadius: isTV ? 5 : 4,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  cancelButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: isTV ? 16 : 14,
    fontWeight: '600',
    color: colors.text,
  },
  submitButton: {
    flex: 2,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: isTV ? 16 : 14,
    fontWeight: '600',
    color: colors.background,
  },
});

export default SupportTicketForm;
