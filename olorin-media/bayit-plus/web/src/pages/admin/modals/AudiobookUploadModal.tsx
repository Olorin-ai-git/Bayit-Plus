/**
 * Audiobook Upload Modal
 * Upload audio files to GCS with progress tracking
 */

import { useState } from 'react'
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { X, Upload, AlertCircle } from 'lucide-react'
import { GlassButton, GlassInput } from '@bayit/shared/ui'
import { adminAudiobookService } from '@/services/adminAudiobookService'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
import logger from '@/utils/logger'
import type { Audiobook } from '@/types/audiobook'

interface AudiobookUploadModalProps { audiobook?: Audiobook | null; visible: boolean; onClose: () => void }

export default function AudiobookUploadModal({ audiobook, visible, onClose }: AudiobookUploadModalProps) {
  const { t } = useTranslation()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [streamUrl, setStreamUrl] = useState('')

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const allowedTypes = ['audio/mpeg', 'audio/aac', 'audio/m4a', 'audio/flac']
    if (!allowedTypes.includes(file.type)) { setError(t('admin.audiobooks.upload.invalidType', 'Invalid file type. Allowed: MP3, AAC, M4A, FLAC')); return }
    if (file.size > 500 * 1024 * 1024) { setError(t('admin.audiobooks.upload.tooLarge', 'File size exceeds 500MB limit')); return }
    setSelectedFile(file); setError(null)
  }

  const handleUpload = async () => {
    if (!selectedFile || !audiobook?.id) { setError('File and audiobook selection required'); return }
    setIsUploading(true); setError(null); setStreamUrl('')
    try {
      const result = await adminAudiobookService.uploadAudioFile(audiobook.id, selectedFile, (percent) => setProgress(percent))
      setStreamUrl(result.stream_url); setSelectedFile(null); setProgress(0)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed'
      logger.error(msg, 'AudiobookUploadModal', err); setError(msg)
    } finally {
      setIsUploading(false)
    }
  }

  const fileInputRef = (input: HTMLInputElement | null) => {
    if (input) input.onclick = () => { const htmlInput = input as HTMLInputElement; htmlInput.click() }
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('admin.audiobooks.upload.title', 'Upload Audio File')}</Text>
            <GlassButton variant="ghost" size="sm" onPress={onClose} icon={<X size={18} color={colors.text} />} />
          </View>

          {error && <View style={styles.errorBanner}><AlertCircle size={16} color="#ef4444" /><Text style={styles.errorText}>{error}</Text></View>}

          <View style={styles.content}>
            <Text style={styles.label}>{t('admin.audiobooks.upload.selectFile', 'Select Audio File')}</Text>
            {selectedFile ? (
              <View style={styles.fileInfo}>
                <Text style={styles.fileName}>{selectedFile.name}</Text>
                <Text style={styles.fileSize}>({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</Text>
              </View>
            ) : (
              <Pressable style={styles.dropZone} onPress={() => { const input = document.getElementById('audio-upload') as HTMLInputElement; input?.click() }}>
                <Upload size={32} color={colors.textMuted} />
                <Text style={styles.dropZoneText}>{t('admin.audiobooks.upload.dragDrop', 'Click to select audio file')}</Text>
              </Pressable>
            )}
            <input id="audio-upload" type="file" style={{ display: 'none' }} accept=".mp3,.aac,.m4a,.flac" onChange={handleFileSelect} />

            {isUploading && (
              <View style={styles.progressSection}>
                <View style={styles.progressBar}><View style={[styles.progressFill, { width: `${progress}%` }]} /></View>
                <Text style={styles.progressText}>{progress}%</Text>
              </View>
            )}

            {streamUrl && (
              <View style={styles.successSection}>
                <Text style={styles.successLabel}>{t('admin.audiobooks.upload.streamUrl', 'Stream URL Generated')}</Text>
                <GlassInput value={streamUrl} editable={false} containerStyle={styles.urlInput} />
                <GlassButton variant="ghost" size="sm" onPress={() => {
                  navigator.clipboard.writeText(streamUrl)
                  alert('URL copied to clipboard')
                }}>
                  {t('common.copy', 'Copy URL')}
                </GlassButton>
              </View>
            )}
          </View>

          <View style={styles.footer}>
            <GlassButton variant="secondary" onPress={onClose}>{t('common.cancel', 'Cancel')}</GlassButton>
            <GlassButton variant="primary" onPress={handleUpload} disabled={!selectedFile || isUploading}>{isUploading ? `${progress}%` : t('admin.audiobooks.upload.button', 'Upload')}</GlassButton>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  modal: { backgroundColor: colors.background, borderRadius: borderRadius.lg, width: '100%', maxWidth: 500, flexDirection: 'column' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: `${colors.border}33` },
  title: { fontSize: 18, fontWeight: '600', color: colors.text },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, marginHorizontal: spacing.lg, marginTop: spacing.md, backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: borderRadius.md, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  errorText: { flex: 1, fontSize: 13, color: '#ef4444' },
  content: { padding: spacing.lg },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: spacing.md },
  fileInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, backgroundColor: 'rgba(16,185,129,0.1)', borderRadius: borderRadius.md, marginBottom: spacing.lg },
  fileName: { fontSize: 13, fontWeight: '500', color: colors.text },
  fileSize: { fontSize: 12, color: colors.textMuted },
  dropZone: { padding: spacing.xl, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: borderRadius.md, borderWidth: 2, borderColor: `${colors.border}33`, borderStyle: 'dashed', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  dropZoneText: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
  progressSection: { gap: spacing.sm, marginBottom: spacing.lg },
  progressBar: { height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primary.DEFAULT },
  progressText: { fontSize: 12, color: colors.textMuted, textAlign: 'right' },
  successSection: { padding: spacing.md, backgroundColor: 'rgba(16,185,129,0.1)', borderRadius: borderRadius.md, marginBottom: spacing.lg },
  successLabel: { fontSize: 13, fontWeight: '600', color: '#10b981', marginBottom: spacing.sm },
  urlInput: { marginBottom: spacing.sm },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, padding: spacing.lg, borderTopWidth: 1, borderTopColor: `${colors.border}33` },
})
