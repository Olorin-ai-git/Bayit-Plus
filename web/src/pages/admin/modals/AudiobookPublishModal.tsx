/**
 * Audiobook Publish Modal
 * Confirm and manage audiobook publishing state
 */

import { useState } from 'react'
import { View, Text, StyleSheet, Modal } from 'react-native'
import { useTranslation } from 'react-i18next'
import { X, AlertCircle, Check } from 'lucide-react'
import { GlassButton } from '@bayit/shared/ui'
import { adminAudiobookService } from '@/services/adminAudiobookService'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
import logger from '@/utils/logger'
import type { Audiobook } from '@/types/audiobook'

interface AudiobookPublishModalProps { audiobook?: Audiobook | null; visible: boolean; onClose: () => void; onSuccess: () => void }

export default function AudiobookPublishModal({ audiobook, visible, onClose, onSuccess }: AudiobookPublishModalProps) {
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePublish = async () => {
    if (!audiobook?.id) return
    if (audiobook.is_published) { await handleUnpublish(); return }
    if (!audiobook.title || !audiobook.author || !(audiobook as any).stream_url) {
      setError(t('admin.audiobooks.publish.missingFields', 'Missing required fields: title, author, stream URL'))
      return
    }
    setIsLoading(true); setError(null)
    try {
      await adminAudiobookService.publishAudiobook(audiobook.id)
      onSuccess(); onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to publish audiobook'
      logger.error(msg, 'AudiobookPublishModal', err); setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUnpublish = async () => {
    if (!audiobook?.id) return
    setIsLoading(true); setError(null)
    try {
      await adminAudiobookService.unpublishAudiobook(audiobook.id)
      onSuccess(); onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to unpublish audiobook'
      logger.error(msg, 'AudiobookPublishModal', err); setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>{audiobook?.is_published ? t('admin.audiobooks.publish.unpublishTitle', 'Unpublish') : t('admin.audiobooks.publish.publishTitle', 'Publish Audiobook')}</Text>
            <GlassButton variant="ghost" size="sm" onPress={onClose} icon={<X size={18} color={colors.text} />} />
          </View>

          <View style={styles.content}>
            {audiobook?.is_published ? (
              <>
                <View style={styles.infoBox}>
                  <AlertCircle size={20} color="#f59e0b" />
                  <Text style={styles.infoText}>{t('admin.audiobooks.publish.unpublishWarning', 'This audiobook is currently published and visible to users. Unpublishing will hide it immediately.')}</Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.infoBox}>
                  <Check size={20} color="#10b981" />
                  <Text style={styles.infoText}>{t('admin.audiobooks.publish.publishConfirm', 'Publishing this audiobook will make it visible to all users.')}</Text>
                </View>
                {(!audiobook?.title || !audiobook?.author || !(audiobook as any)?.stream_url) && (
                  <View style={styles.warningBox}>
                    <AlertCircle size={16} color="#ef4444" />
                    <Text style={styles.warningText}>{t('admin.audiobooks.publish.missingFields', 'Missing required fields')}</Text>
                  </View>
                )}
              </>
            )}

            {audiobook && (
              <View style={styles.metadata}>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>{t('admin.columns.title', 'Title')}:</Text>
                  <Text style={styles.metaValue}>{audiobook.title}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>{t('admin.columns.author', 'Author')}:</Text>
                  <Text style={styles.metaValue}>{audiobook.author}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>{t('admin.columns.duration', 'Duration')}:</Text>
                  <Text style={styles.metaValue}>{audiobook.duration || '-'}</Text>
                </View>
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
            <GlassButton variant="secondary" onPress={onClose}>{t('common.cancel', 'Cancel')}</GlassButton>
            <GlassButton variant="primary" onPress={handlePublish} disabled={isLoading}>{isLoading ? t('common.loading', 'Loading...') : (audiobook?.is_published ? t('admin.actions.unpublish', 'Unpublish') : t('admin.actions.publish', 'Publish'))}</GlassButton>
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
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, padding: spacing.md, backgroundColor: 'rgba(16,185,129,0.1)', borderRadius: borderRadius.md },
  infoText: { flex: 1, fontSize: 13, color: colors.text, lineHeight: 18 },
  warningBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: borderRadius.md },
  warningText: { fontSize: 12, color: '#ef4444' },
  metadata: { padding: spacing.md, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: borderRadius.md, gap: spacing.sm },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  metaLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  metaValue: { flex: 1, fontSize: 12, color: colors.text, textAlign: 'right' },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: borderRadius.md, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  errorText: { flex: 1, fontSize: 12, color: '#ef4444' },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, padding: spacing.lg, borderTopWidth: 1, borderTopColor: `${colors.border}33` },
})
