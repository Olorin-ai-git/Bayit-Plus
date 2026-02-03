import { useState, useEffect, useCallback } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Mail, Eye, Send, X, Filter } from 'lucide-react'
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens'
import {
  GlassPageHeader,
  GlassButton,
  GlassCard,
  GlassModal,
  GlassInput,
  GlassTextarea,
  GlassLoadingSpinner,
  GlassErrorBanner,
} from '@bayit/shared/ui'
import { useDirection } from '@/hooks/useDirection'
import api from '@/services/api'
import { ADMIN_PAGE_CONFIG } from '../../../../shared/utils/adminConstants'

interface EmailTemplate {
  name: string
  display_name: string
  description: string
  category: string
  required_variables: string[]
  optional_variables: string[]
}

export default function EmailTemplatesPage() {
  const { t } = useTranslation()
  const { isRTL } = useDirection()

  // Template library state
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState('all')

  // Preview modal state
  const [previewModalVisible, setPreviewModalVisible] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null)
  const [previewHtml, setPreviewHtml] = useState('')
  const [previewVariables, setPreviewVariables] = useState<Record<string, string>>({})
  const [previewLoading, setPreviewLoading] = useState(false)

  // Send modal state
  const [sendModalVisible, setSendModalVisible] = useState(false)
  const [sendTestEmail, setSendTestEmail] = useState('')
  const [sendingTest, setSendingTest] = useState(false)

  // Invitation modal state
  const [invitationModalVisible, setInvitationModalVisible] = useState(false)
  const [invitationData, setInvitationData] = useState({
    email: '',
    inviter_name: '',
    personal_message: '',
  })
  const [sendingInvitation, setSendingInvitation] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const categories = ['all', 'marketing', 'onboarding', 'family']

  // Fetch templates on mount
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoading(true)
        const response = await api.get('/admin/marketing/email-templates')
        setTemplates(response.templates)
      } catch (err: any) {
        setError(err.message || 'Failed to load email templates')
      } finally {
        setLoading(false)
      }
    }
    fetchTemplates()
  }, [])

  // Filter templates by category
  const filteredTemplates =
    selectedCategory === 'all'
      ? templates
      : templates.filter((t) => t.category === selectedCategory)

  // Build default variables from environment
  const buildDefaultVariables = useCallback((template: EmailTemplate) => {
    const baseUrl = import.meta.env.VITE_APP_BASE_URL || window.location.origin
    const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL

    const defaults: Record<string, string> = {
      current_year: new Date().getFullYear().toString(),
      support_email: supportEmail,
      signup_url: `${baseUrl}/signup`,
      verification_url: `${baseUrl}/beta/verify?token=EXAMPLE`,
      accept_url: `${baseUrl}/accept-invitation?code=EXAMPLE`,
      greeting: 'Welcome to Bayit+!',
      personal_section: '',
      inviter_name: 'Admin',
      household_name: 'Example Household',
      role_display: 'Child',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    }
    return defaults
  }, [])

  // Handle preview template
  const handlePreview = useCallback(
    async (template: EmailTemplate) => {
      setSelectedTemplate(template)
      setPreviewVariables(buildDefaultVariables(template))
      setPreviewModalVisible(true)
      setPreviewLoading(true)

      try {
        const variables = buildDefaultVariables(template)
        const response = await api.post(`/admin/marketing/email-templates/${template.name}/preview`, {
          variables,
        })
        setPreviewHtml(response.html)
      } catch (err: any) {
        setError(err.message || 'Failed to preview template')
      } finally {
        setPreviewLoading(false)
      }
    },
    [buildDefaultVariables]
  )

  // Update preview with new variables
  const handleUpdatePreview = useCallback(async () => {
    if (!selectedTemplate) return

    setPreviewLoading(true)
    try {
      const response = await api.post(
        `/admin/marketing/email-templates/${selectedTemplate.name}/preview`,
        { variables: previewVariables }
      )
      setPreviewHtml(response.html)
    } catch (err: any) {
      setError(err.message || 'Failed to update preview')
    } finally {
      setPreviewLoading(false)
    }
  }, [selectedTemplate, previewVariables])

  // Handle send test email
  const handleSendTest = useCallback(async () => {
    if (!selectedTemplate || !sendTestEmail) return

    setSendingTest(true)
    try {
      await api.post(`/admin/marketing/email-templates/${selectedTemplate.name}/send-test`, {
        test_email: sendTestEmail,
        variables: previewVariables,
      })
      setSuccessMessage(t('admin.emailTemplates.success.testSent', 'Test email sent successfully'))
      setSendModalVisible(false)
      setSendTestEmail('')
    } catch (err: any) {
      setError(err.message || 'Failed to send test email')
    } finally {
      setSendingTest(false)
    }
  }, [selectedTemplate, sendTestEmail, previewVariables, t])

  // Handle send invitation
  const handleSendInvitation = useCallback(async () => {
    if (!invitationData.email) return

    setSendingInvitation(true)
    try {
      await api.post('/admin/marketing/invitations/send', invitationData)
      setSuccessMessage(
        t('admin.emailTemplates.success.invitationSent', 'Platform invitation sent successfully')
      )
      setInvitationModalVisible(false)
      setInvitationData({ email: '', inviter_name: '', personal_message: '' })
    } catch (err: any) {
      setError(err.message || 'Failed to send invitation')
    } finally {
      setSendingInvitation(false)
    }
  }, [invitationData, t])

  const pageConfig = ADMIN_PAGE_CONFIG.marketing
  const IconComponent = pageConfig?.icon || Mail

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <GlassLoadingSpinner size="large" />
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <GlassPageHeader
        title={t('admin.emailTemplates.title', 'Email Templates')}
        icon={<IconComponent size={24} color={pageConfig?.iconColor || colors.primary} strokeWidth={2} />}
        iconColor={pageConfig?.iconColor || colors.primary}
        iconBackgroundColor={pageConfig?.iconBackgroundColor || 'rgba(96, 165, 250, 0.1)'}
        badge={templates.length}
        isRTL={isRTL}
      />

      {error && <GlassErrorBanner message={error} onDismiss={() => setError(null)} marginBottom={spacing.lg} />}
      {successMessage && (
        <GlassCard style={[styles.successBanner, { marginBottom: spacing.lg }]}>
          <Text style={styles.successText}>{successMessage}</Text>
          <TouchableOpacity onPress={() => setSuccessMessage(null)}>
            <X size={18} color={colors.success} />
          </TouchableOpacity>
        </GlassCard>
      )}

      <View style={styles.categoryFilters}>
        {categories.map((category) => (
          <GlassButton
            key={category}
            variant={selectedCategory === category ? 'primary' : 'secondary'}
            size="sm"
            onPress={() => setSelectedCategory(category)}
            icon={<Filter size={16} color={selectedCategory === category ? colors.text : colors.textSecondary} />}
          >
            {t(`admin.emailTemplates.categories.${category}`, category)}
          </GlassButton>
        ))}
      </View>

      <View style={styles.templateGrid}>
        {filteredTemplates.map((template) => (
          <GlassCard key={template.name} style={styles.templateCard}>
            <View style={styles.cardHeader}>
              <Mail size={20} color={colors.primary} />
              <Text style={styles.templateName}>{template.display_name}</Text>
            </View>
            <Text style={styles.templateDescription}>{template.description}</Text>
            <View style={styles.templateMeta}>
              <Text style={styles.metaLabel}>{t('admin.emailTemplates.category', 'Category')}: </Text>
              <Text style={styles.metaValue}>{template.category}</Text>
            </View>
            <View style={styles.cardActions}>
              <GlassButton
                variant="secondary"
                size="sm"
                onPress={() => handlePreview(template)}
                icon={<Eye size={16} color={colors.textSecondary} />}
              >
                {t('admin.emailTemplates.preview', 'Preview')}
              </GlassButton>
              <GlassButton
                variant="primary"
                size="sm"
                onPress={() => {
                  setSelectedTemplate(template)
                  setInvitationModalVisible(true)
                }}
                icon={<Send size={16} color={colors.text} />}
              >
                {t('admin.emailTemplates.send', 'Send')}
              </GlassButton>
            </View>
          </GlassCard>
        ))}
      </View>

      <GlassModal visible={previewModalVisible} onClose={() => setPreviewModalVisible(false)} size="large">
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>
            {t('admin.emailTemplates.previewTitle', 'Template Preview')}: {selectedTemplate?.display_name}
          </Text>

          <ScrollView style={styles.variablesForm}>
            {selectedTemplate?.required_variables.map((variable) => (
              <View key={variable} style={styles.variableField}>
                <Text style={styles.variableLabel}>{variable}:</Text>
                <GlassInput
                  value={previewVariables[variable] || ''}
                  onChangeText={(value) =>
                    setPreviewVariables((prev) => ({ ...prev, [variable]: value }))
                  }
                  placeholder={`Enter ${variable}`}
                  style={styles.variableInput}
                />
              </View>
            ))}
          </ScrollView>

          <GlassButton variant="secondary" size="sm" onPress={handleUpdatePreview} disabled={previewLoading}>
            {previewLoading
              ? t('admin.emailTemplates.updating', 'Updating...')
              : t('admin.emailTemplates.updatePreview', 'Update Preview')}
          </GlassButton>

          <View style={styles.previewContainer}>
            {previewLoading ? (
              <GlassLoadingSpinner size="medium" />
            ) : (
              <iframe
                srcDoc={previewHtml}
                sandbox=""
                title="Email Template Preview"
                style={{ width: '100%', height: '100%', border: 'none' }}
              />
            )}
          </View>

          <View style={styles.modalActions}>
            <GlassButton variant="secondary" onPress={() => setPreviewModalVisible(false)}>
              {t('common.close', 'Close')}
            </GlassButton>
            <GlassButton variant="primary" onPress={() => setSendModalVisible(true)}>
              {t('admin.emailTemplates.sendTest', 'Send Test')}
            </GlassButton>
          </View>
        </View>
      </GlassModal>

      <GlassModal visible={sendModalVisible} onClose={() => setSendModalVisible(false)} size="small">
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{t('admin.emailTemplates.sendTestTitle', 'Send Test Email')}</Text>
          <GlassInput
            value={sendTestEmail}
            onChangeText={setSendTestEmail}
            placeholder={t('admin.emailTemplates.testEmailAddress', 'Test email address')}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <View style={styles.modalActions}>
            <GlassButton variant="secondary" onPress={() => setSendModalVisible(false)}>
              {t('common.cancel', 'Cancel')}
            </GlassButton>
            <GlassButton variant="primary" onPress={handleSendTest} disabled={sendingTest || !sendTestEmail}>
              {sendingTest ? t('common.sending', 'Sending...') : t('admin.emailTemplates.send', 'Send')}
            </GlassButton>
          </View>
        </View>
      </GlassModal>

      <GlassModal visible={invitationModalVisible} onClose={() => setInvitationModalVisible(false)} size="medium">
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{t('admin.emailTemplates.sendInvitation', 'Send Platform Invitation')}</Text>
          <GlassInput
            value={invitationData.email}
            onChangeText={(value) => setInvitationData((prev) => ({ ...prev, email: value }))}
            placeholder={t('admin.emailTemplates.recipientEmail', 'Recipient email address')}
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.formInput}
          />
          <GlassInput
            value={invitationData.inviter_name}
            onChangeText={(value) => setInvitationData((prev) => ({ ...prev, inviter_name: value }))}
            placeholder={t('admin.emailTemplates.inviterName', 'Your name (optional)')}
            style={styles.formInput}
          />
          <GlassTextarea
            value={invitationData.personal_message}
            onChangeText={(value) => setInvitationData((prev) => ({ ...prev, personal_message: value }))}
            placeholder={t('admin.emailTemplates.personalMessage', 'Personal message (optional)')}
            numberOfLines={4}
            style={styles.formTextArea}
          />
          <View style={styles.modalActions}>
            <GlassButton
              variant="secondary"
              onPress={() => setInvitationModalVisible(false)}
            >
              {t('common.cancel', 'Cancel')}
            </GlassButton>
            <GlassButton
              variant="primary"
              onPress={handleSendInvitation}
              disabled={sendingInvitation || !invitationData.email}
            >
              {sendingInvitation ? t('common.sending', 'Sending...') : t('admin.emailTemplates.send', 'Send')}
            </GlassButton>
          </View>
        </View>
      </GlassModal>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryFilters: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
    flexWrap: 'wrap',
  },
  successBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  successText: {
    color: colors.success,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  templateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  templateCard: {
    width: 300,
    padding: spacing.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  templateName: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  templateDescription: {
    fontSize: fontSize.sm,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  templateMeta: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  metaLabel: {
    fontSize: fontSize.sm,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  metaValue: {
    fontSize: fontSize.sm,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalContent: {
    padding: spacing.lg,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: spacing.lg,
  },
  variablesForm: {
    maxHeight: 200,
    marginBottom: spacing.md,
  },
  variableField: {
    marginBottom: spacing.md,
  },
  variableLabel: {
    fontSize: fontSize.sm,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: spacing.xs,
    fontFamily: 'monospace',
  },
  variableInput: {
    width: '100%',
  },
  previewContainer: {
    width: '100%',
    height: 500,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginVertical: spacing.lg,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'flex-end',
  },
  formInput: {
    marginBottom: spacing.md,
  },
  formTextArea: {
    marginBottom: spacing.md,
  },
})
