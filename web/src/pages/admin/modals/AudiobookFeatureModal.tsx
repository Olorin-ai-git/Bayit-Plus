/**
 * Audiobook Feature Modal
 * Manage featured sections and ordering
 */

import { useState } from 'react'
import { View, Text, StyleSheet, Modal } from 'react-native'
import { useTranslation } from 'react-i18next'
import { X, AlertCircle, Star } from 'lucide-react'
import { GlassButton, GlassSelect, GlassInput } from '@bayit/shared/ui'
import { adminAudiobookService } from '@/services/adminAudiobookService'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
import logger from '@/utils/logger'
import type { Audiobook } from '@/types/audiobook'

const FEATURE_SECTIONS = ['Audiobooks', 'Recommended', 'New Releases', 'Top Rated', 'Trending']

interface AudiobookFeatureModalProps { audiobook?: Audiobook | null; visible: boolean; onClose: () => void }

export default function AudiobookFeatureModal({ audiobook, visible, onClose }: AudiobookFeatureModalProps) {
  const { t } = useTranslation()
  const [section, setSection] = useState('')
  const [order, setOrder] = useState('1')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleFeature = async () => {
    if (!audiobook?.id || !section) { setError('Please select a section'); return }
    const orderNum = parseInt(order) || 1
    if (orderNum < 1 || orderNum > 100) { setError(t('validation.orderRange', 'Order must be between 1 and 100')); return }

    setIsLoading(true); setError(null); setSuccess(false)
    try {
      await adminAudiobookService.featureAudiobook(audiobook.id, section, orderNum)
      setSuccess(true); setTimeout(() => { onClose(); setSuccess(false) }, 1500)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to feature audiobook'
      logger.error(msg, 'AudiobookFeatureModal', err); setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUnfeature = async () => {
    if (!audiobook?.id) return
    setIsLoading(true); setError(null)
    try {
      await adminAudiobookService.unfeatureAudiobook(audiobook.id)
      onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to unfeature audiobook'
      logger.error(msg, 'AudiobookFeatureModal', err); setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('admin.audiobooks.feature.title', 'Feature Audiobook')}</Text>
            <GlassButton variant="ghost" size="sm" onPress={onClose} icon={<X size={18} color={colors.text} />} />
          </View>

          <View style={styles.content}>
            {audiobook?.is_featured && (
              <View style={styles.infoBox}>
                <Star size={18} color="#f59e0b" fill="#f59e0b" />
                <Text style={styles.infoText}>{t('admin.audiobooks.feature.alreadyFeatured', 'This audiobook is already featured.')}</Text>
              </View>
            )}

            <GlassSelect label={t('admin.audiobooks.feature.section', 'Featured Section')} options={FEATURE_SECTIONS.map(s => ({ label: s, value: s }))} value={section} onChange={setSection} containerStyle={styles.input} />

            <GlassInput label={t('admin.audiobooks.feature.order', 'Display Order')} placeholder="1-100" value={order} onChangeText={setOrder} containerStyle={styles.input} keyboardType="number-pad" />

            {audiobook && (
              <View style={styles.preview}>
                <Text style={styles.previewLabel}>{t('admin.audiobooks.feature.preview', 'Preview')}</Text>
                <View style={styles.previewCard}>
                  <Text style={styles.previewTitle}>{audiobook.title}</Text>
                  <Text style={styles.previewSubtext}>{audiobook.author}</Text>
                  <Text style={styles.previewSection}>{section || 'Select section'}</Text>
                </View>
              </View>
            )}

            {success && (
              <View style={styles.successBox}>
                <Star size={16} color="#10b981" />
                <Text style={styles.successText}>{t('admin.audiobooks.feature.success', 'Audiobook featured successfully')}</Text>
              </View>
            )}

            {error && (
              <View style={styles.errorBanner}>
                <AlertCircle size={16} color="#ef4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </View>

          <View style={styles.footer}>
            {audiobook?.is_featured && <GlassButton variant="secondary" onPress={handleUnfeature}>{t('admin.actions.unfeature', 'Unfeature')}</GlassButton>}
            <GlassButton variant="secondary" onPress={onClose}>{t('common.cancel', 'Cancel')}</GlassButton>
            <GlassButton variant="primary" onPress={handleFeature} disabled={isLoading || !section}>{isLoading ? t('common.loading', 'Loading...') : t('admin.actions.feature', 'Feature')}</GlassButton>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  modal: { backgroundColor: colors.background, borderRadius: borderRadius.lg, width: '100%', maxWidth: 450, flexDirection: 'column' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: `${colors.border}33` },
  title: { fontSize: 18, fontWeight: '600', color: colors.text },
  content: { padding: spacing.lg, gap: spacing.lg },
  infoBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, backgroundColor: 'rgba(245,158,11,0.1)', borderRadius: borderRadius.md },
  infoText: { flex: 1, fontSize: 13, color: colors.text },
  input: { marginBottom: 0 },
  preview: { gap: spacing.sm },
  previewLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  previewCard: { padding: spacing.md, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: borderRadius.md, borderWidth: 1, borderColor: `${colors.border}33` },
  previewTitle: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 2 },
  previewSubtext: { fontSize: 11, color: colors.textMuted, marginBottom: spacing.xs },
  previewSection: { fontSize: 11, color: colors.primary.DEFAULT, fontWeight: '500' },
  successBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, backgroundColor: 'rgba(16,185,129,0.1)', borderRadius: borderRadius.md },
  successText: { fontSize: 12, color: '#10b981' },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: borderRadius.md, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  errorText: { flex: 1, fontSize: 12, color: '#ef4444' },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, padding: spacing.lg, borderTopWidth: 1, borderTopColor: `${colors.border}33` },
})
