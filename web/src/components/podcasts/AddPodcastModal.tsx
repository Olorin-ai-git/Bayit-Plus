import { useState, useCallback } from 'react';
import { View, Text, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Rss, Music, Disc3, CheckCircle } from 'lucide-react';
import { podcastService } from '@/services/api';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import {
  GlassModal,
  GlassButton,
  GlassInput,
  GlassCategoryPill,
} from '@bayit/shared/ui';
import logger from '@/utils/logger';

interface AddPodcastModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Provider = 'rss' | 'apple_podcasts' | 'spotify';
type ModalState = 'idle' | 'resolving' | 'preview' | 'adding' | 'success';

interface PodcastPreview {
  title: string;
  author: string | null;
  description: string | null;
  cover: string | null;
  category: string | null;
  rss_url: string;
  episode_count: number;
  episodes_preview: Array<{ title: string; duration: string | null }>;
}

export default function AddPodcastModal({ visible, onClose, onSuccess }: AddPodcastModalProps) {
  const { t } = useTranslation();
  const [url, setUrl] = useState('');
  const [provider, setProvider] = useState<Provider>('rss');
  const [state, setState] = useState<ModalState>('idle');
  const [preview, setPreview] = useState<PodcastPreview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetState = useCallback(() => {
    setUrl('');
    setProvider('rss');
    setState('idle');
    setPreview(null);
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [resetState, onClose]);

  const handleResolve = useCallback(async () => {
    if (!url.trim()) return;
    setError(null);
    setState('resolving');

    try {
      const data = await podcastService.resolveUrl(url.trim(), provider);
      setPreview(data);
      setState('preview');
    } catch (err: unknown) {
      const detail = (err as Record<string, string>)?.detail;
      setError(detail || t('podcasts.addPodcast.errorResolve'));
      setState('idle');
      logger.error('Failed to resolve podcast URL', 'AddPodcastModal', err);
    }
  }, [url, provider, t]);

  const handleAdd = useCallback(async () => {
    if (!preview) return;
    setError(null);
    setState('adding');

    try {
      await podcastService.addFromUrl(preview.rss_url);
      setState('success');
      // Brief delay before closing for the success state to be visible
      setTimeout(() => {
        handleClose();
        onSuccess();
      }, 1200);
    } catch (err: unknown) {
      const detail = (err as Record<string, string>)?.detail;
      const isDuplicate = detail?.includes('already exists');
      setError(isDuplicate ? t('podcasts.addPodcast.errorDuplicate') : (detail || t('podcasts.addPodcast.errorAdd')));
      setState('preview');
      logger.error('Failed to add podcast', 'AddPodcastModal', err);
    }
  }, [preview, handleClose, onSuccess, t]);

  const providerOptions: Array<{ key: Provider; label: string; icon: React.ReactNode }> = [
    { key: 'rss', label: t('podcasts.addPodcast.providerRSS'), icon: <Rss size={14} color={provider === 'rss' ? colors.primary : colors.textMuted} /> },
    { key: 'apple_podcasts', label: t('podcasts.addPodcast.providerApple'), icon: <Music size={14} color={provider === 'apple_podcasts' ? colors.primary : colors.textMuted} /> },
    { key: 'spotify', label: t('podcasts.addPodcast.providerSpotify'), icon: <Disc3 size={14} color={provider === 'spotify' ? colors.primary : colors.textMuted} /> },
  ];

  return (
    <GlassModal
      visible={visible}
      title={t('podcasts.addPodcast.title')}
      onClose={handleClose}
      dismissable={state !== 'resolving' && state !== 'adding'}
    >
      {state === 'success' ? (
        <SuccessView message={t('podcasts.addPodcast.success')} />
      ) : (
        <View style={styles.content}>
          {/* Provider Selection */}
          <View style={styles.providerRow}>
            {providerOptions.map((opt) => (
              <GlassCategoryPill
                key={opt.key}
                label={opt.label}
                icon={opt.icon}
                isActive={provider === opt.key}
                onPress={() => setProvider(opt.key)}
              />
            ))}
          </View>

          {/* URL Input */}
          <GlassInput
            placeholder={t('podcasts.addPodcast.urlPlaceholder')}
            value={url}
            onChangeText={setUrl}
            editable={state === 'idle' || state === 'preview'}
            containerStyle={styles.urlInput}
          />

          {/* Resolve Button */}
          {(state === 'idle' || state === 'resolving') && (
            <GlassButton
              title={state === 'resolving' ? t('podcasts.addPodcast.resolving') : t('podcasts.addPodcast.resolve')}
              onPress={handleResolve}
              variant="primary"
              loading={state === 'resolving'}
              disabled={!url.trim() || state === 'resolving'}
              fullWidth
            />
          )}

          {/* Error */}
          {error && <Text style={styles.errorText}>{error}</Text>}

          {/* Preview */}
          {preview && (state === 'preview' || state === 'adding') && (
            <PreviewSection
              preview={preview}
              episodesFoundLabel={t('podcasts.addPodcast.episodesFound', { count: preview.episode_count })}
              authorLabel={t('podcasts.addPodcast.author')}
            />
          )}

          {/* Add Button */}
          {(state === 'preview' || state === 'adding') && (
            <GlassButton
              title={state === 'adding' ? t('podcasts.addPodcast.adding') : t('podcasts.addPodcast.addPodcast')}
              onPress={handleAdd}
              variant="success"
              loading={state === 'adding'}
              disabled={state === 'adding'}
              fullWidth
            />
          )}
        </View>
      )}
    </GlassModal>
  );
}

function PreviewSection({
  preview,
  episodesFoundLabel,
  authorLabel,
}: {
  preview: PodcastPreview;
  episodesFoundLabel: string;
  authorLabel: string;
}) {
  return (
    <View style={styles.previewContainer}>
      <View style={styles.previewHeader}>
        {preview.cover && (
          <Image source={{ uri: preview.cover }} style={styles.previewCover} resizeMode="cover" />
        )}
        <View style={styles.previewInfo}>
          <Text style={styles.previewTitle} numberOfLines={2}>{preview.title}</Text>
          {preview.author && (
            <Text style={styles.previewAuthor} numberOfLines={1}>{authorLabel}: {preview.author}</Text>
          )}
          <Text style={styles.previewEpisodes}>{episodesFoundLabel}</Text>
        </View>
      </View>
      {preview.description && (
        <Text style={styles.previewDescription} numberOfLines={3}>{preview.description}</Text>
      )}
    </View>
  );
}

function SuccessView({ message }: { message: string }) {
  return (
    <View style={styles.successContainer}>
      <CheckCircle size={48} color={colors.success} />
      <Text style={styles.successText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  providerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  urlInput: {
    marginTop: spacing.xs,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    textAlign: 'center',
  },
  previewContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  previewHeader: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  previewCover: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
  },
  previewInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.xs,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  previewAuthor: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  previewEpisodes: {
    fontSize: 13,
    color: colors.primary.DEFAULT,
    fontWeight: '500',
  },
  previewDescription: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
  successContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  successText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.success,
  },
});
