/**
 * Audiobook Detail Page
 * Full audiobook details, metadata, and related content
 */

import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, Image, Pressable } from 'react-native'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useDirection } from '@/hooks/useDirection'
import { ArrowLeft, Heart, Share2 } from 'lucide-react'
import { NativeIcon } from '@olorin/shared-icons/native'
import audiobookService from '@/services/audiobookService'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
import { GlassView, GlassButton } from '@bayit/shared/ui'
import { LoadingState, EmptyState } from '@bayit/shared/components/states'
import logger from '@/utils/logger'
import type { Audiobook } from '@/types/audiobook'
import AudiobookMetadataCard from './AudiobookMetadataCard'

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.lg, paddingHorizontal: spacing.xl, borderBottomWidth: 1, borderBottomColor: `${colors.border}33` },
  backButton: { padding: spacing.md },
  content: { flexDirection: 'row', paddingHorizontal: spacing.xl, paddingVertical: spacing.xl, gap: spacing.xl },
  sidebar: { width: '35%', alignItems: 'center' },
  thumbnail: { width: '100%', height: 400, borderRadius: borderRadius.xl, marginBottom: spacing.lg },
  mainContent: { flex: 1 },
  title: { fontSize: 28, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  author: { fontSize: 18, fontWeight: '500', color: colors.primary.DEFAULT, marginBottom: spacing.xs },
  narrator: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.md },
  description: { fontSize: 14, color: colors.textMuted, lineHeight: 22, marginBottom: spacing.lg },
  actionButtons: { flexDirection: 'row', gap: spacing.md, marginVertical: spacing.lg },
  actionButton: { flex: 1 },
  placeholder: { backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center', borderRadius: borderRadius.xl },
  placeholderText: { fontSize: 48 },
})

export default function AudiobookDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { isRTL } = useDirection()

  const [audiobook, setAudiobook] = useState<Audiobook | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFavorited, setIsFavorited] = useState(false)

  useEffect(() => {
    if (!id) {
      setError(t('audiobooks.notFound', 'Audiobook not found'))
      setLoading(false)
      return
    }

    audiobookService
      .getAudiobookDetail(id)
      .then(setAudiobook)
      .catch((err) => {
        logger.error('Failed to load audiobook detail', 'AudiobookDetailPage', err)
        setError(t('audiobooks.loadError', 'Failed to load audiobook'))
      })
      .finally(() => setLoading(false))
  }, [id, t])

  if (loading) {
    return (
      <GlassView style={styles.container}>
        <LoadingState title={t('common.loading', 'Loading')} isRTL={isRTL} />
      </GlassView>
    )
  }

  if (error || !audiobook) {
    return (
      <GlassView style={styles.container}>
        <EmptyState title={t('common.error', 'Error')} message={error || t('audiobooks.notFound', 'Audiobook not found')} isRTL={isRTL} />
      </GlassView>
    )
  }

  return (
    <GlassView style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => navigate(-1)}>
          <ArrowLeft size={24} color={colors.text} />
        </Pressable>
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{t('audiobooks.details', 'Details')}</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.sidebar}>
          {audiobook.thumbnail ? (
            <Image source={{ uri: audiobook.thumbnail }} style={styles.thumbnail} resizeMode="contain" />
          ) : (
            <View style={[styles.thumbnail, styles.placeholder]}>
              <NativeIcon name="podcasts" size="xl" color={colors.textMuted} />
            </View>
          )}
        </View>

        <View style={styles.mainContent}>
          <Text style={styles.title}>{audiobook.title}</Text>
          {audiobook.author && <Text style={styles.author}>{audiobook.author}</Text>}
          {audiobook.narrator && <Text style={styles.narrator}>{t('audiobooks.narrator', 'Narrator')}: {audiobook.narrator}</Text>}

          {audiobook.description && <Text style={styles.description}>{audiobook.description}</Text>}

          <AudiobookMetadataCard audiobook={audiobook} />

          <View style={styles.actionButtons}>
            <GlassButton style={styles.actionButton} leftIcon={<Heart size={18} color={colors.text} />} onPress={() => setIsFavorited(!isFavorited)}>
              {isFavorited ? t('common.favorited', 'Favorited') : t('common.addToLibrary', 'Add to Library')}
            </GlassButton>
            <GlassButton style={styles.actionButton} variant="secondary" rightIcon={<Share2 size={18} color={colors.text} />} onPress={() => {
              if (navigator.share) {
                navigator.share({
                  title: audiobook.title,
                  text: `Check out "${audiobook.title}" by ${audiobook.author}`,
                  url: window.location.href,
                })
              }
            }}>
              {t('common.share', 'Share')}
            </GlassButton>
          </View>
        </View>
      </ScrollView>
    </GlassView>
  )
}
