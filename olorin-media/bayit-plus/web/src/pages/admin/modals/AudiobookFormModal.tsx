/**
 * Audiobook Form Modal
 * Create and edit audiobook metadata
 */

import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, Modal } from 'react-native'
import { useTranslation } from 'react-i18next'
import { X, AlertCircle } from 'lucide-react'
import { GlassInput, GlassButton, GlassSelect } from '@bayit/shared/ui'
import { adminAudiobookService } from '@/services/adminAudiobookService'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
import logger from '@/utils/logger'
import type { Audiobook } from '@/types/audiobook'

const AUDIO_QUALITIES = ['8-bit', '16-bit', '24-bit', '32-bit', 'high-fidelity', 'standard', 'premium', 'lossless']
const SUBSCRIPTION_TIERS = ['free', 'basic', 'premium', 'family']

interface AudiobookFormModalProps { audiobook?: Audiobook | null; visible: boolean; onClose: () => void; onSave: () => void }

export default function AudiobookFormModal({ audiobook, visible, onClose, onSave }: AudiobookFormModalProps) {
  const { t } = useTranslation()
  const [formData, setFormData] = useState({ title: '', author: '', narrator: '', description: '', duration: '', quality: 'standard', isbn: '', publisher: '', year: new Date().getFullYear(), subscription_tier: 'free', stream_url: '' })
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (audiobook) {
      setFormData({
        title: audiobook.title || '', author: audiobook.author || '', narrator: audiobook.narrator || '', description: audiobook.description || '', duration: audiobook.duration || '', quality: (audiobook as any).audio_quality || 'standard', isbn: (audiobook as any).isbn || '', publisher: (audiobook as any).publisher || '', year: (audiobook as any).publication_year || new Date().getFullYear(), subscription_tier: audiobook.requires_subscription || 'free', stream_url: (audiobook as any).stream_url || ''
      })
    } else {
      setFormData({ title: '', author: '', narrator: '', description: '', duration: '', quality: 'standard', isbn: '', publisher: '', year: new Date().getFullYear(), subscription_tier: 'free', stream_url: '' })
    }
    setError(null)
  }, [audiobook, visible])

  const handleSave = async () => {
    if (!formData.title.trim()) { setError(t('validation.titleRequired', 'Title is required')); return }
    if (!formData.author.trim()) { setError(t('validation.authorRequired', 'Author is required')); return }
    if (!formData.stream_url.trim()) { setError(t('validation.streamUrlRequired', 'Stream URL is required')); return }

    setIsLoading(true); setError(null)
    try {
      const payload = { ...formData, audio_quality: formData.quality, publication_year: formData.year }
      if (audiobook?.id) {
        await adminAudiobookService.updateAudiobook(audiobook.id, payload)
      } else {
        await adminAudiobookService.createAudiobook(payload)
      }
      onSave()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save audiobook'
      logger.error(msg, 'AudiobookFormModal', err); setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>{audiobook ? t('admin.audiobooks.editTitle', 'Edit Audiobook') : t('admin.audiobooks.createTitle', 'Create Audiobook')}</Text>
            <GlassButton variant="ghost" size="sm" onPress={onClose} icon={<X size={18} color={colors.text} />} />
          </View>

          {error && <View style={styles.errorBanner}><AlertCircle size={16} color="#ef4444" /><Text style={styles.errorText}>{error}</Text></View>}

          <ScrollView style={styles.scrollView}>
            <GlassInput label={t('admin.audiobooks.form.title', 'Title')} placeholder="Audiobook title" value={formData.title} onChangeText={(title) => setFormData(p => ({ ...p, title }))} containerStyle={styles.input} />
            <GlassInput label={t('admin.audiobooks.form.author', 'Author')} placeholder="Author name" value={formData.author} onChangeText={(author) => setFormData(p => ({ ...p, author }))} containerStyle={styles.input} />
            <GlassInput label={t('admin.audiobooks.form.narrator', 'Narrator')} placeholder="Narrator name" value={formData.narrator} onChangeText={(narrator) => setFormData(p => ({ ...p, narrator }))} containerStyle={styles.input} />
            <GlassInput label={t('admin.audiobooks.form.description', 'Description')} placeholder="Audiobook description" value={formData.description} onChangeText={(description) => setFormData(p => ({ ...p, description }))} containerStyle={styles.input} multiline />
            <GlassInput label={t('admin.audiobooks.form.duration', 'Duration')} placeholder="HH:MM:SS" value={formData.duration} onChangeText={(duration) => setFormData(p => ({ ...p, duration }))} containerStyle={styles.input} />
            <GlassSelect label={t('admin.audiobooks.form.quality', 'Audio Quality')} options={AUDIO_QUALITIES.map(q => ({ label: q, value: q }))} value={formData.quality} onChange={(quality) => setFormData(p => ({ ...p, quality }))} containerStyle={styles.input} />
            <GlassInput label={t('admin.audiobooks.form.isbn', 'ISBN')} placeholder="ISBN number" value={formData.isbn} onChangeText={(isbn) => setFormData(p => ({ ...p, isbn }))} containerStyle={styles.input} />
            <GlassInput label={t('admin.audiobooks.form.publisher', 'Publisher')} placeholder="Publisher name" value={formData.publisher} onChangeText={(publisher) => setFormData(p => ({ ...p, publisher }))} containerStyle={styles.input} />
            <GlassSelect label={t('admin.audiobooks.form.subscription', 'Subscription Tier')} options={SUBSCRIPTION_TIERS.map(t => ({ label: t, value: t }))} value={formData.subscription_tier} onChange={(subscription_tier) => setFormData(p => ({ ...p, subscription_tier }))} containerStyle={styles.input} />
            <GlassInput label={t('admin.audiobooks.form.streamUrl', 'Stream URL')} placeholder="https://..." value={formData.stream_url} onChangeText={(stream_url) => setFormData(p => ({ ...p, stream_url }))} containerStyle={styles.input} />
          </ScrollView>

          <View style={styles.footer}>
            <GlassButton variant="secondary" title={t('common.cancel', 'Cancel')} onPress={onClose} />
            <GlassButton variant="primary" title={isLoading ? t('common.saving', 'Saving...') : t('common.save', 'Save')} onPress={handleSave} disabled={isLoading} />
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  modal: { backgroundColor: 'rgba(15, 15, 25, 0.98)', borderRadius: borderRadius.lg, width: '100%', maxWidth: 600, maxHeight: '90%', flexDirection: 'column', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: `${colors.border}33` },
  title: { fontSize: 18, fontWeight: '600', color: colors.text },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, marginHorizontal: spacing.lg, marginTop: spacing.md, backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: borderRadius.md, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  errorText: { flex: 1, fontSize: 13, color: '#ef4444' },
  scrollView: { flex: 1, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  input: { marginBottom: spacing.md },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, padding: spacing.lg, borderTopWidth: 1, borderTopColor: `${colors.border}33` },
})
