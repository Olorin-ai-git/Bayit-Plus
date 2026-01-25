/**
 * FileListTable Component
 * Displays selected files with per-file progress tracking
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { useTranslation } from 'react-i18next';
import type { FileUploadProgress } from '../../types';
import { FileTableRow } from './FileTableRow';

interface FileListTableProps {
  files: FileUploadProgress[];
  onRemoveFile: (index: number) => void;
  isUploading: boolean;
}

export const FileListTable: React.FC<FileListTableProps> = ({
  files,
  onRemoveFile,
  isUploading,
}) => {
  const { t } = useTranslation();

  if (files.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>{t('admin.uploads.manualUpload.noFilesSelected')}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      accessibilityRole="list"
      accessibilityLabel={t('admin.uploads.manualUpload.fileList')}
    >
      <View style={styles.table}>
        {/* Table Header */}
        <View style={styles.headerRow} accessibilityRole="rowgroup">
          <Text style={[styles.headerCell, styles.fileNameHeader]}>
            {t('admin.uploads.manualUpload.fileName')}
          </Text>
          <Text style={[styles.headerCell, styles.sizeHeader]}>
            {t('admin.uploads.manualUpload.fileSize')}
          </Text>
          <Text style={[styles.headerCell, styles.progressHeader]}>
            {t('admin.uploads.manualUpload.progress')}
          </Text>
          <Text style={[styles.headerCell, styles.statusHeader]}>
            {t('admin.uploads.manualUpload.status')}
          </Text>
          <View style={[styles.headerCell, styles.actionsHeader]} />
        </View>

        {/* File Rows */}
        {files.map((fileProgress, index) => (
          <FileTableRow
            key={`${fileProgress.file.name}-${index}`}
            fileProgress={fileProgress}
            index={index}
            onRemove={onRemoveFile}
            isUploading={isUploading}
          />
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    maxHeight: 400,
  },
  table: {
    gap: spacing.sm,
  },
  emptyState: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  headerRow: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.glass.bg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  headerCell: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  fileNameHeader: {
    flex: 3,
  },
  sizeHeader: {
    flex: 1,
  },
  progressHeader: {
    flex: 2,
  },
  statusHeader: {
    flex: 1,
  },
  actionsHeader: {
    width: 40,
  },
});
