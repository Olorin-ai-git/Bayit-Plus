/**
 * FileTableRow Component
 * Individual file row with progress and stage indicator
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { X } from 'lucide-react';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import type { FileUploadProgress } from '../../types';
import { FileIcon } from '../Shared/FileIcon';
import { UploadStatusBadge } from '../Shared/UploadStatusBadge';
import { UploadStageIndicator } from '../Shared/UploadStageIndicator';
import { formatFileSize, formatPercentage } from '../../utils/formatters';

interface FileTableRowProps {
  fileProgress: FileUploadProgress;
  index: number;
  onRemove: (index: number) => void;
  isUploading: boolean;
}

export const FileTableRow: React.FC<FileTableRowProps> = ({
  fileProgress,
  index,
  onRemove,
  isUploading,
}) => {
  const { file, progress, stages, error } = fileProgress;
  const isComplete = progress === 100 && !error;
  const hasFailed = !!error;

  return (
    <View
      style={styles.row}
      accessibilityRole="listitem"
      accessibilityLabel={`File: ${file.name}, ${formatFileSize(file.size)}, ${formatPercentage(progress)} complete`}
    >
      {/* File Name + Icon */}
      <View style={[styles.cell, styles.fileNameCell]}>
        <FileIcon filename={file.name} size={20} />
        <Text style={styles.fileName} numberOfLines={1}>
          {file.name}
        </Text>
      </View>

      {/* File Size */}
      <View style={[styles.cell, styles.sizeCell]}>
        <Text style={styles.cellText}>{formatFileSize(file.size)}</Text>
      </View>

      {/* Progress */}
      <View style={[styles.cell, styles.progressCell]}>
        {hasFailed ? (
          <Text style={[styles.cellText, { color: colors.error }]}>
            {typeof error === 'string' ? error : JSON.stringify(error)}
          </Text>
        ) : (
          <View style={styles.progressWrapper}>
            <View
              style={styles.progressBarContainer}
              accessibilityRole="progressbar"
              accessibilityLabel={`Upload progress: ${formatPercentage(progress)}`}
            >
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${progress}%`,
                    opacity: progress > 0 && progress < 100 ? 1 : 0.8,
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>{formatPercentage(progress)}</Text>
          </View>
        )}
      </View>

      {/* Status */}
      <View style={[styles.cell, styles.statusCell]}>
        {isComplete ? (
          <UploadStatusBadge status="completed" />
        ) : hasFailed ? (
          <UploadStatusBadge status="failed" />
        ) : progress > 0 ? (
          <UploadStatusBadge status="uploading" />
        ) : (
          <UploadStatusBadge status="pending" />
        )}
      </View>

      {/* Actions */}
      <View style={[styles.cell, styles.actionsCell]}>
        {!isUploading && (
          <Pressable
            onPress={() => onRemove(index)}
            style={styles.removeButton}
            accessibilityLabel={`Remove ${file.name}`}
            accessibilityRole="button"
          >
            <X size={18} color={colors.error} />
          </Pressable>
        )}
      </View>

      {/* Stage Indicator (full width below) */}
      {progress > 0 && (
        <View style={styles.stageRow}>
          <UploadStageIndicator stages={stages} compact />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    backgroundColor: colors.glass.bg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
    padding: spacing.md,
  },
  cell: {
    justifyContent: 'center',
  },
  fileNameCell: {
    flex: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  fileName: {
    fontSize: fontSize.sm,
    color: colors.text,
    flex: 1,
  },
  sizeCell: {
    flex: 1,
  },
  progressCell: {
    flex: 2,
  },
  statusCell: {
    flex: 1,
  },
  actionsCell: {
    width: 40,
    alignItems: 'center',
  },
  cellText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  progressWrapper: {
    gap: spacing.xs,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    transition: 'width 0.3s ease',
  },
  progressText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  removeButton: {
    padding: spacing.md,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  stageRow: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.glass.border,
  },
});
