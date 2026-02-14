/**
 * FamilySnaps - Family photo game component for missions
 *
 * Gallery grid of family photos with upload action.
 * Supports photo capture and gallery selection for mission completion.
 */
import React, { useCallback } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@bayit/shared-hooks';
import { GlassCard } from '@olorin/glass-ui/native';
import { NativeIcon } from '@olorin/shared-icons/native';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import logger from '@/utils/logger';

const moduleLogger = logger.scope('FamilySnaps');

interface FamilyPhoto {
  id: string;
  uri: string;
  uploadedAt: string;
}

interface FamilySnapsProps {
  missionId: string;
  photos: FamilyPhoto[];
  onUpload: () => void;
  onDelete: (photoId: string) => void;
}

const GRID_COLUMNS = 3;

export const FamilySnaps: React.FC<FamilySnapsProps> = ({
  missionId,
  photos,
  onUpload,
  onDelete,
}) => {
  const { t } = useTranslation();
  const { isRTL, textAlign } = useDirection();

  const handleDelete = useCallback(
    (photoId: string) => {
      moduleLogger.debug('Deleting family snap', { missionId, photoId });
      onDelete(photoId);
    },
    [missionId, onDelete],
  );

  const renderUploadButton = () => (
    <Pressable
      onPress={onUpload}
      style={styles.uploadButton}
      accessibilityLabel={t('missions.familySnaps.upload')}
      accessibilityHint={t('missions.familySnaps.uploadHint')}
      accessibilityRole="button"
    >
      <NativeIcon name="camera" size="xl" color={colors.primary} />
      <Text style={styles.uploadText}>{t('missions.familySnaps.addPhoto')}</Text>
    </Pressable>
  );

  const renderPhoto = useCallback(
    ({ item }: { item: FamilyPhoto }) => (
      <GlassCard style={styles.photoCard}>
        <Image source={{ uri: item.uri }} style={styles.photoImage} resizeMode="cover" />
        <Pressable
          onPress={() => handleDelete(item.id)}
          style={styles.deleteButton}
          accessibilityLabel={t('missions.familySnaps.deletePhoto')}
          accessibilityHint={t('missions.familySnaps.deleteHint')}
          accessibilityRole="button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <NativeIcon name="xCircle" size="sm" color={colors.error} />
        </Pressable>
      </GlassCard>
    ),
    [handleDelete, t],
  );

  const dataWithUpload = [{ id: '__upload__', uri: '', uploadedAt: '' }, ...photos];

  return (
    <View
      style={styles.container}
      accessibilityLabel={t('missions.familySnaps.sectionLabel')}
      accessibilityRole="list"
    >
      <Text style={[styles.title, { textAlign }]}>
        {t('missions.familySnaps.title')}
      </Text>
      <Text style={[styles.subtitle, { textAlign }]}>
        {t('missions.familySnaps.subtitle', { count: photos.length })}
      </Text>
      <FlatList
        data={dataWithUpload}
        renderItem={({ item }) =>
          item.id === '__upload__' ? renderUploadButton() : renderPhoto({ item })
        }
        keyExtractor={(item) => item.id}
        numColumns={GRID_COLUMNS}
        scrollEnabled={false}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.gridRow}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  grid: {
    gap: spacing.sm,
  },
  gridRow: {
    gap: spacing.sm,
  },
  uploadButton: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: colors.glassMedium,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
  uploadText: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: '500',
  },
  photoCard: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  deleteButton: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    backgroundColor: colors.background,
    borderRadius: borderRadius.full,
    padding: 2,
  },
});
