import { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Image, ScrollView } from 'react-native';
import { Sparkles, Plus, Play } from 'lucide-react';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { useStarStoryStore } from '@/stores/starStoryStore';
import { useProfileStore } from '@/stores/profileStore';
import { PhotoUploadFlow } from './PhotoUploadFlow';
import { EpisodeGallery } from './EpisodeGallery';
import { GenerationProgress } from './GenerationProgress';
import logger from '@bayit/shared-utils/logger';

const landingLogger = logger.scope('StarStoryLanding');

export function StarStoryLanding() {
  const { avatars, episodes, generatingEpisodeId, loading, error, fetchAvatars, fetchEpisodes } = useStarStoryStore();
  const profileId = useProfileStore((s: any) => s.activeProfileId);
  const [showUploadFlow, setShowUploadFlow] = useState(false);

  useEffect(() => {
    if (profileId) {
      fetchAvatars(profileId).catch((err: unknown) => landingLogger.error('Avatar fetch error', err));
      fetchEpisodes(profileId).catch((err: unknown) => landingLogger.error('Episode fetch error', err));
    }
  }, [profileId, fetchAvatars, fetchEpisodes]);

  const handleUploadComplete = useCallback(() => {
    setShowUploadFlow(false);
    if (profileId) {
      fetchAvatars(profileId).catch((err: unknown) => landingLogger.error('Refresh avatars error', err));
    }
  }, [profileId, fetchAvatars]);

  if (generatingEpisodeId) {
    return <GenerationProgress episodeId={generatingEpisodeId} profileId={profileId} />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Sparkles size={32} color={colors.primary[400]} />
        <Text style={styles.heroTitle}>Star in Story</Text>
        <Text style={styles.heroSubtitle}>
          Personalized Hebrew learning stories starring your child
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Avatars</Text>
        {avatars.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.avatarRow}>
            {avatars.map((avatar) => (
              <View key={avatar.avatar_id} style={styles.avatarCard}>
                {avatar.primary_avatar_url ? (
                  <Image source={{ uri: avatar.primary_avatar_url }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Sparkles size={24} color={colors.primary[400]} />
                  </View>
                )}
                <Text style={styles.avatarName}>{avatar.child_first_name}</Text>
                <Text style={styles.avatarStyle}>{avatar.style === 'cartoon_2d' ? 'Cartoon 2D' : 'Pixar 3D'}</Text>
              </View>
            ))}
            <Pressable style={styles.addAvatarCard} onPress={() => setShowUploadFlow(true)}>
              <Plus size={28} color={colors.primary[400]} />
              <Text style={styles.addAvatarText}>Add Avatar</Text>
            </Pressable>
          </ScrollView>
        ) : (
          <Pressable style={styles.createFirstCard} onPress={() => setShowUploadFlow(true)}>
            <Sparkles size={28} color={colors.primary[400]} />
            <Text style={styles.createFirstTitle}>Create First Avatar</Text>
            <Text style={styles.createFirstSub}>Upload a photo to get started</Text>
          </Pressable>
        )}
      </View>

      {loading && episodes.length === 0 ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading episodes...</Text>
        </View>
      ) : error && episodes.length === 0 ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <EpisodeGallery episodes={episodes} avatars={avatars} profileId={profileId} />
      )}

      {showUploadFlow && (
        <PhotoUploadFlow
          profileId={profileId}
          onComplete={handleUploadComplete}
          onDismiss={() => setShowUploadFlow(false)}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing[8] },
  hero: { alignItems: 'center', paddingVertical: spacing[8], paddingHorizontal: spacing[4], gap: spacing[3] },
  heroTitle: { fontSize: fontSize['3xl'], fontWeight: '700', color: colors.text },
  heroSubtitle: { fontSize: fontSize.base, color: colors.textSecondary, textAlign: 'center', maxWidth: 400 },
  section: { paddingHorizontal: spacing[4], marginBottom: spacing[6] },
  sectionTitle: { fontSize: fontSize.xl, fontWeight: '600', color: colors.text, marginBottom: spacing[3] },
  avatarRow: { gap: spacing[3], paddingVertical: spacing[2] },
  avatarCard: { width: 120, alignItems: 'center', backgroundColor: colors.glass.bgMedium, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.glass.border, padding: spacing[3], gap: spacing[2] },
  avatarImage: { width: 80, height: 80, borderRadius: borderRadius.full },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: borderRadius.full, backgroundColor: colors.glass.purpleLight, justifyContent: 'center', alignItems: 'center' },
  avatarName: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  avatarStyle: { fontSize: fontSize.xs, color: colors.textMuted },
  addAvatarCard: { width: 120, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.glass.bgLight, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.glass.borderLight, borderStyle: 'dashed', padding: spacing[3], gap: spacing[2] },
  addAvatarText: { fontSize: fontSize.sm, color: colors.primary[400], fontWeight: '500' },
  createFirstCard: { alignItems: 'center', backgroundColor: colors.glass.bgMedium, borderRadius: borderRadius.xl, borderWidth: 1, borderColor: colors.glass.border, padding: spacing[6], gap: spacing[3] },
  createFirstTitle: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text },
  createFirstSub: { fontSize: fontSize.sm, color: colors.textSecondary },
  loadingContainer: { padding: spacing[8], alignItems: 'center' },
  loadingText: { fontSize: fontSize.sm, color: colors.textMuted },
  errorContainer: { padding: spacing[4], alignItems: 'center' },
  errorText: { fontSize: fontSize.sm, color: colors.error[500] },
});
