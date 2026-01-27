/**
 * Audiobook Detail Screen (Mobile)
 * Full audiobook metadata and actions
 */

import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, Image, Pressable, ActivityIndicator } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useDirection } from '@bayit/shared-hooks'
import { Heart, Share2, ArrowLeft } from 'lucide-react'
import { GlassView, GlassButton } from '@bayit/shared/ui'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
import logger from '@/utils/logger'
import type { Audiobook } from '@/types/audiobook'
import audiobookService from '@/services/audiobookService'
import { useSafeAreaPadding } from '../hooks/useSafeAreaPadding'

export default function AudiobookDetailScreenMobile({ route, navigation }: any) {
  const { id } = route.params
  const { t } = useTranslation()
  const { isRTL } = useDirection()
  const safeAreaPadding = useSafeAreaPadding()

  const [audiobook, setAudiobook] = useState<Audiobook | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFavorited, setIsFavorited] = useState(false)

  useEffect(() => {
    if (!id) { setError(t('common.notFound', 'Not found')); setIsLoading(false); return }
    audiobookService
      .getAudiobookDetail(id)
      .then(setAudiobook)
      .catch(err => { const msg = err instanceof Error ? err.message : 'Failed to load'; logger.error(msg, 'AudiobookDetailScreenMobile', err); setError(msg) })
      .finally(() => setIsLoading(false))
  }, [id, t])

  const handleShare = () => {
    if (!audiobook) return
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({
        title: audiobook.title,
        text: `Check out "${audiobook.title}" by ${audiobook.author}`,
        url: `bayit://audiobooks/${audiobook.id}`,
      }).catch(err => logger.error('Share failed', 'AudiobookDetailScreenMobile', err))
    }
  }

  if (isLoading) return <GlassView style={[styles.container, { paddingTop: safeAreaPadding.top, justifyContent: 'center' }]}><ActivityIndicator size="large" color={colors.primary.DEFAULT} /></GlassView>

  if (error || !audiobook) return (
    <GlassView style={[styles.container, { paddingTop: safeAreaPadding.top, justifyContent: 'center', alignItems: 'center' }]}>
      <Text style={styles.errorText}>{error || t('common.notFound', 'Not found')}</Text>
      <GlassButton variant="primary" onPress={() => navigation.goBack()}>{t('common.back', 'Back')}</GlassButton>
    </GlassView>
  )

  const renderStars = (rating: number) => '⭐'.repeat(Math.round(rating))

  return (
    <GlassView style={[styles.container, { paddingTop: safeAreaPadding.top, paddingBottom: safeAreaPadding.bottom }]}>
      <View style={[styles.header, { paddingHorizontal: spacing.lg }]}>
        <Pressable onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('audiobooks.details', 'Details')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing.lg }]} showsVerticalScrollIndicator={false}>
        <View style={styles.thumbnailContainer}>
          {audiobook.thumbnail ? (
            <Image source={{ uri: audiobook.thumbnail }} style={styles.thumbnail} resizeMode="cover" />
          ) : (
            <View style={[styles.thumbnail, styles.placeholder]}>
              <Text style={styles.placeholderText}>🎧</Text>
            </View>
          )}
        </View>

        <Text style={styles.title}>{audiobook.title}</Text>
        {audiobook.author && <Text style={styles.author}>{audiobook.author}</Text>}
        {audiobook.narrator && <Text style={styles.narrator}>{t('audiobooks.narrator', 'Narrator')}: {audiobook.narrator}</Text>}
        {audiobook.description && <Text style={styles.description}>{audiobook.description}</Text>}

        <View style={styles.metadataGrid}>
          {audiobook.duration && <View style={styles.metaItem}><Text style={styles.metaLabel}>{t('audiobooks.duration', 'Duration')}</Text><Text style={styles.metaValue}>{audiobook.duration}</Text></View>}
          {(audiobook as any).audio_quality && <View style={styles.metaItem}><Text style={styles.metaLabel}>{t('audiobooks.quality', 'Quality')}</Text><Text style={styles.metaValue}>{(audiobook as any).audio_quality}</Text></View>}
          {(audiobook as any).isbn && <View style={styles.metaItem}><Text style={styles.metaLabel}>{t('audiobooks.isbn', 'ISBN')}</Text><Text style={styles.metaValue}>{(audiobook as any).isbn}</Text></View>}
          {(audiobook as any).publisher && <View style={styles.metaItem}><Text style={styles.metaLabel}>{t('audiobooks.publisher', 'Publisher')}</Text><Text style={styles.metaValue}>{(audiobook as any).publisher}</Text></View>}
        </View>

        {audiobook.avg_rating > 0 && (
          <View style={styles.ratingSection}>
            <Text style={styles.ratingStars}>{renderStars(audiobook.avg_rating)} {audiobook.avg_rating.toFixed(1)}</Text>
          </View>
        )}

        <View style={styles.actions}>
          <GlassButton variant="primary" style={styles.actionButton} leftIcon={<Heart size={18} color={colors.text} />} onPress={() => setIsFavorited(!isFavorited)}>
            {isFavorited ? t('common.favorited', 'Favorited') : t('common.addFavorite', 'Add')}
          </GlassButton>
          <GlassButton variant="secondary" style={styles.actionButton} rightIcon={<Share2 size={18} color={colors.text} />} onPress={handleShare}>
            {t('common.share', 'Share')}
          </GlassButton>
        </View>
      </ScrollView>
    </GlassView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md },
  headerTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  scrollContent: { paddingVertical: spacing.lg, gap: spacing.lg },
  thumbnailContainer: { alignItems: 'center' },
  thumbnail: { width: 200, height: 300, borderRadius: borderRadius.lg, backgroundColor: 'rgba(255,255,255,0.05)' },
  placeholder: { justifyContent: 'center', alignItems: 'center' },
  placeholderText: { fontSize: 80 },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  author: { fontSize: 16, fontWeight: '600', color: colors.primary.DEFAULT },
  narrator: { fontSize: 13, color: colors.textMuted },
  description: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  metadataGrid: { gap: spacing.md, backgroundColor: 'rgba(255,255,255,0.05)', padding: spacing.lg, borderRadius: borderRadius.md },
  metaItem: { gap: spacing.xs },
  metaLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  metaValue: { fontSize: 13, color: colors.text },
  ratingSection: { alignItems: 'center', padding: spacing.md, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: borderRadius.md },
  ratingStars: { fontSize: 16, fontWeight: '600', color: colors.text },
  actions: { flexDirection: 'row', gap: spacing.md },
  actionButton: { flex: 1 },
  errorText: { fontSize: 16, color: '#ef4444', marginBottom: spacing.lg, textAlign: 'center' },
})
