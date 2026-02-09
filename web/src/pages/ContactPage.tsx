import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { GlassView, GlassPageHeader, GlassInput, GlassTextarea, GlassSelect, GlassButton } from '@bayit/shared/ui';
import { Send } from 'lucide-react';
import api from '@/services/api';
import { logger } from '@/utils/logger';

const CATEGORY_OPTIONS = [
  { value: 'general', label: 'contact.category.general' },
  { value: 'technical', label: 'contact.category.technical' },
  { value: 'billing', label: 'contact.category.billing' },
  { value: 'feature', label: 'contact.category.feature' },
];

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

export default function ContactPage() {
  const { t, i18n } = useTranslation();
  const { isRTL, textAlign } = useDirection();

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('general');
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const translatedCategoryOptions = CATEGORY_OPTIONS.map((opt) => ({
    value: opt.value,
    label: t(opt.label, opt.value),
  }));

  const isFormValid = subject.trim().length >= 5 && message.trim().length >= 10;

  const handleSubmit = async () => {
    if (!isFormValid || submitState === 'submitting') return;

    setSubmitState('submitting');
    setErrorMessage('');

    try {
      await api.post('/support/tickets', {
        subject: subject.trim(),
        message: message.trim(),
        category,
        language: i18n.language || 'en',
      });

      setSubmitState('success');
      setSubject('');
      setMessage('');
      setCategory('general');

      logger.info('Support ticket submitted', 'ContactPage', { category });
    } catch (error: unknown) {
      setSubmitState('error');
      const errDetail = error && typeof error === 'object' && 'detail' in error
        ? String((error as { detail: string }).detail)
        : t('contact.error.generic', 'Failed to submit your message. Please try again.');
      setErrorMessage(errDetail);
      logger.error('Failed to submit support ticket', 'ContactPage', error);
    }
  };

  const handleReset = () => {
    setSubmitState('idle');
    setErrorMessage('');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <GlassPageHeader
        title={t('nav.contact', 'Contact Us')}
        pageType="contact"
        isRTL={isRTL}
      />

      <GlassView style={styles.headerSection}>
        <View style={styles.iconContainer}>
          <Send size={48} color={colors.primary} />
        </View>
        <Text style={[styles.headerDescription, { textAlign }]}>
          {t('contact.description', 'Have a question, suggestion, or need help? Send us a message and our team will get back to you.')}
        </Text>
      </GlassView>

      {submitState === 'success' ? (
        <GlassView style={styles.successSection}>
          <Text style={[styles.successTitle, { textAlign }]}>
            {t('contact.success.title', 'Message Sent')}
          </Text>
          <Text style={[styles.successDescription, { textAlign }]}>
            {t('contact.success.description', 'Thank you for reaching out. Our support team will review your message and respond within 24 hours.')}
          </Text>
          <GlassButton
            title={t('contact.success.sendAnother', 'Send Another Message')}
            onPress={handleReset}
            variant="secondary"
            style={styles.resetButton}
          />
        </GlassView>
      ) : (
        <GlassView style={styles.formSection}>
          <GlassSelect
            label={t('contact.form.category', 'Category')}
            options={translatedCategoryOptions}
            value={category}
            onChange={setCategory}
            isRTL={isRTL}
          />

          <View style={styles.fieldSpacing}>
            <GlassInput
              label={t('contact.form.subject', 'Subject')}
              placeholder={t('contact.form.subjectPlaceholder', 'Brief description of your inquiry')}
              value={subject}
              onChangeText={setSubject}
              error={subject.length > 0 && subject.length < 5
                ? t('contact.form.subjectMinLength', 'Subject must be at least 5 characters')
                : undefined}
            />
          </View>

          <View style={styles.fieldSpacing}>
            <GlassTextarea
              label={t('contact.form.message', 'Message')}
              placeholder={t('contact.form.messagePlaceholder', 'Tell us more about your inquiry...')}
              value={message}
              onChangeText={setMessage}
              minHeight={150}
              error={message.length > 0 && message.length < 10
                ? t('contact.form.messageMinLength', 'Message must be at least 10 characters')
                : undefined}
            />
          </View>

          {submitState === 'error' && errorMessage && (
            <View style={styles.errorContainer}>
              <Text style={[styles.errorText, { textAlign }]}>{errorMessage}</Text>
            </View>
          )}

          <View style={styles.submitContainer}>
            <GlassButton
              title={submitState === 'submitting'
                ? t('contact.form.submitting', 'Sending...')
                : t('contact.form.submit', 'Send Message')}
              onPress={handleSubmit}
              variant="primary"
              disabled={!isFormValid || submitState === 'submitting'}
              style={styles.submitButton}
            />
          </View>
        </GlassView>
      )}

      <GlassView style={styles.contactInfoSection}>
        <Text style={[styles.contactInfoTitle, { textAlign }]}>
          {t('contact.info.title', 'Other Ways to Reach Us')}
        </Text>
        <Text style={[styles.contactInfoItem, { textAlign }]}>
          {t('contact.info.email', 'Email')}: support@olorin.ai
        </Text>
        <Text style={[styles.contactInfoItem, { textAlign }]}>
          {t('contact.info.company', 'Olorin.ai LLC')}
        </Text>
      </GlassView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  headerSection: {
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconContainer: {
    marginBottom: spacing.md,
  },
  headerDescription: {
    fontSize: fontSize.base,
    color: colors.textMuted,
    lineHeight: fontSize.base * 1.6,
  },
  formSection: {
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.lg,
  },
  fieldSpacing: {
    marginTop: spacing.md,
  },
  errorContainer: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorText: {
    fontSize: fontSize.sm,
    color: '#ef4444',
  },
  submitContainer: {
    marginTop: spacing.lg,
  },
  submitButton: {
    width: '100%',
  },
  successSection: {
    padding: spacing.xl * 1.5,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  successTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  successDescription: {
    fontSize: fontSize.base,
    color: colors.textMuted,
    lineHeight: fontSize.base * 1.6,
    marginBottom: spacing.lg,
  },
  resetButton: {
    minWidth: 200,
  },
  contactInfoSection: {
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
  },
  contactInfoTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  contactInfoItem: {
    fontSize: fontSize.base,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
});
