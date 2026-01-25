/**
 * FolderCard Component
 * Individual monitored folder card with actions
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { GlassCard, GlassButton, GlassBadge } from '@bayit/shared/ui';
import { Edit2, Trash2, Play, Folder } from 'lucide-react';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { useTranslation } from 'react-i18next';
import type { MonitoredFolder } from '../../types';
import { formatRelativeTime } from '../../utils/formatters';

interface FolderCardProps {
  folder: MonitoredFolder;
  onEdit: (folder: MonitoredFolder) => void;
  onDelete: (folder: MonitoredFolder) => void;
  onScan: (folder: MonitoredFolder) => void;
  actionInProgress: boolean;
}

export const FolderCard: React.FC<FolderCardProps> = ({
  folder,
  onEdit,
  onDelete,
  onScan,
  actionInProgress,
}) => {
  const { t } = useTranslation();

  return (
    <GlassCard style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Folder size={20} color={colors.primary.DEFAULT} />
          <Text style={styles.name}>{folder.name}</Text>
          <GlassBadge variant={folder.enabled ? 'success' : 'secondary'}>
            {folder.enabled ? t('common.enabled') : t('common.disabled')}
          </GlassBadge>
        </View>

        <View style={styles.actions}>
          <Pressable onPress={() => onScan(folder)} disabled={actionInProgress}>
            <Play size={18} color={colors.primary.DEFAULT} />
          </Pressable>
          <Pressable onPress={() => onEdit(folder)} disabled={actionInProgress}>
            <Edit2 size={18} color={colors.info} />
          </Pressable>
          <Pressable onPress={() => onDelete(folder)} disabled={actionInProgress}>
            <Trash2 size={18} color={colors.error} />
          </Pressable>
        </View>
      </View>

      <View style={styles.details}>
        <Text style={styles.path}>{folder.path}</Text>
        <Text style={styles.meta}>
          {t('admin.uploads.monitoredFolders.contentType')}: {folder.content_type}
        </Text>
        {folder.last_scan && (
          <Text style={styles.meta}>
            {t('admin.uploads.monitoredFolders.lastScan')}: {formatRelativeTime(folder.last_scan)}
          </Text>
        )}
        {folder.files_in_folder !== undefined && (
          <Text style={styles.meta}>
            {t('admin.uploads.monitoredFolders.filesFound')}: {folder.files_processed || 0}/
            {folder.files_in_folder}
          </Text>
        )}
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  name: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  details: {
    gap: spacing.xs,
  },
  path: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  meta: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
});
