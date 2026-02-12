import { useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import { RefreshCw, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import logger from '@bayit/shared-utils/logger';

const previewLogger = logger.scope('AvatarPreview');

interface AvatarPose {
  pose_id: string;
  url: string;
  label: string;
}

interface AvatarPreviewProps {
  childName: string;
  style: 'cartoon_2d' | 'pixar_3d';
  poses: AvatarPose[];
  onApprove: () => void;
  onRegenerate: () => void;
  isRegenerating: boolean;
}

export function AvatarPreview({
  childName,
  style,
  poses,
  onApprove,
  onRegenerate,
  isRegenerating,
}: AvatarPreviewProps) {
  const [activePoseIndex, setActivePoseIndex] = useState(0);
  const activePose = poses[activePoseIndex];

  const handlePrevious = useCallback(() => {
    setActivePoseIndex((prev) => (prev > 0 ? prev - 1 : poses.length - 1));
  }, [poses.length]);

  const handleNext = useCallback(() => {
    setActivePoseIndex((prev) => (prev < poses.length - 1 ? prev + 1 : 0));
  }, [poses.length]);

  const handleApprove = useCallback(() => {
    previewLogger.info('Avatar approved', { childName, style, poseIndex: activePoseIndex });
    onApprove();
  }, [childName, style, activePoseIndex, onApprove]);

  const handleRegenerate = useCallback(() => {
    previewLogger.info('Avatar regeneration requested', { childName, style });
    onRegenerate();
  }, [childName, style, onRegenerate]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Preview Avatar</Text>
      <Text style={styles.subtitle}>
        {childName} - {style === 'cartoon_2d' ? 'Cartoon 2D' : 'Pixar 3D'}
      </Text>

      <View style={styles.previewArea}>
        {poses.length > 1 && (
          <Pressable style={styles.navButton} onPress={handlePrevious}>
            <ChevronLeft size={24} color={colors.text} />
          </Pressable>
        )}

        <View style={styles.imageContainer}>
          {activePose?.url ? (
            <Image source={{ uri: activePose.url }} style={styles.avatarImage} resizeMode="contain" />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.placeholderText}>Generating...</Text>
            </View>
          )}
        </View>

        {poses.length > 1 && (
          <Pressable style={styles.navButton} onPress={handleNext}>
            <ChevronRight size={24} color={colors.text} />
          </Pressable>
        )}
      </View>

      {activePose?.label && <Text style={styles.poseLabel}>{activePose.label}</Text>}

      {poses.length > 1 && (
        <View style={styles.dotsRow}>
          {poses.map((_, idx) => (
            <View key={idx} style={[styles.dot, idx === activePoseIndex && styles.dotActive]} />
          ))}
        </View>
      )}

      <View style={styles.buttonRow}>
        <Pressable
          style={[styles.regenerateButton, isRegenerating && styles.buttonDisabled]}
          onPress={handleRegenerate}
          disabled={isRegenerating}
        >
          <RefreshCw size={16} color={colors.textSecondary} />
          <Text style={styles.regenerateText}>{isRegenerating ? 'Regenerating...' : 'Regenerate'}</Text>
        </Pressable>
        <Pressable style={styles.approveButton} onPress={handleApprove} disabled={isRegenerating}>
          <Check size={16} color={colors.white} />
          <Text style={styles.approveText}>Approve Avatar</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: spacing[4], width: '100%' },
  title: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: fontSize.sm, color: colors.textSecondary },
  previewArea: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], width: '100%', justifyContent: 'center' },
  navButton: {
    width: 40, height: 40, borderRadius: borderRadius.full, backgroundColor: colors.glass.bgMedium,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.glass.border,
  },
  imageContainer: {
    width: 220, height: 220, borderRadius: borderRadius.xl, backgroundColor: colors.glass.bgMedium,
    borderWidth: 2, borderColor: colors.primary[400], overflow: 'hidden', justifyContent: 'center', alignItems: 'center',
  },
  avatarImage: { width: '100%', height: '100%' },
  imagePlaceholder: { justifyContent: 'center', alignItems: 'center' },
  placeholderText: { fontSize: fontSize.sm, color: colors.textMuted },
  poseLabel: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '500' },
  dotsRow: { flexDirection: 'row', gap: spacing[2] },
  dot: { width: 8, height: 8, borderRadius: borderRadius.full, backgroundColor: colors.glass.bgStrong },
  dotActive: { backgroundColor: colors.primary[400], width: 20 },
  buttonRow: { flexDirection: 'row', gap: spacing[3], width: '100%', marginTop: spacing[2] },
  regenerateButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2],
    backgroundColor: colors.glass.bgMedium, borderRadius: borderRadius.md, padding: spacing[3],
    borderWidth: 1, borderColor: colors.glass.border,
  },
  regenerateText: { fontSize: fontSize.sm, fontWeight: '500', color: colors.textSecondary },
  approveButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2],
    backgroundColor: colors.primary[600], borderRadius: borderRadius.md, padding: spacing[3],
  },
  approveText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.white },
  buttonDisabled: { opacity: 0.5 },
});
