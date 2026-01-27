/**
 * FolderPreview Component
 * Displays folder contents with validation status before upload
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { GlassCard, GlassButton } from '@olorin/glass-ui';
import { Folder, FileCheck, FileX, Upload, Trash2 } from 'lucide-react';
import { colors, spacing, fontSize, borderRadius } from '@olorin/design-tokens';
import { useTranslation } from 'react-i18next';
import type { FolderValidationResult, FolderEntry } from '../../types/folderTypes';
import { formatFileSize } from '../../utils/formatters';

interface FolderPreviewProps {
  validation: FolderValidationResult;
  onRemoveFile: (entry: FolderEntry) => void;
  onUpload: () => void;
  onClear: () => void;
  disabled?: boolean;
}

export const FolderPreview: React.FC<FolderPreviewProps> = ({
  validation,
  onRemoveFile,
  onUpload,
  onClear,
  disabled = false,
}) => {
  const { t } = useTranslation();
  const { validFiles, invalidFiles, summary } = validation;

  return (
    <GlassCard style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Folder size={20} color={colors.primary.DEFAULT} />
          <Text style={styles.title}>{t('admin.uploads.manualUpload.folderPreview')}</Text>
        </View>
        <Text style={styles.summaryText}>
          {t('admin.uploads.manualUpload.totalFiles', { count: summary.totalFiles })}
        </Text>
      </View>

      {/* Summary Stats */}
      <View style={styles.stats}>
        <View style={styles.statItem}>
          <FileCheck size={16} color={colors.success.DEFAULT} />
          <Text style={styles.statText}>
            {t('admin.uploads.manualUpload.validFiles', { count: summary.validCount })}
          </Text>
        </View>
        {summary.invalidCount > 0 && (
          <View style={styles.statItem}>
            <FileX size={16} color={colors.error.DEFAULT} />
            <Text style={[styles.statText, styles.errorText]}>
              {t('admin.uploads.manualUpload.invalidFilesCount', { count: summary.invalidCount })}
            </Text>
          </View>
        )}
        <Text style={styles.sizeText}>{formatFileSize(summary.totalSize)}</Text>
      </View>

      {/* File Lists */}
      <ScrollView style={styles.fileList} nestedScrollEnabled>
        {/* Valid Files */}
        {validFiles.length > 0 && (
          <View style={styles.section}>
            {validFiles.slice(0, 10).map((entry, index) => (
              <FileRow
                key={`valid-${index}`}
                entry={entry}
                isValid
                onRemove={() => onRemoveFile(entry)}
              />
            ))}
            {validFiles.length > 10 && (
              <Text style={styles.moreText}>
                +{validFiles.length - 10} {t('admin.uploads.manualUpload.filesMode')}
              </Text>
            )}
          </View>
        )}

        {/* Invalid Files */}
        {invalidFiles.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t('admin.uploads.manualUpload.invalidFilesCount', { count: invalidFiles.length })}
            </Text>
            {invalidFiles.slice(0, 5).map((item, index) => (
              <FileRow
                key={`invalid-${index}`}
                entry={item.entry}
                isValid={false}
                reason={item.reason}
                onRemove={() => onRemoveFile(item.entry)}
              />
            ))}
            {invalidFiles.length > 5 && (
              <Text style={styles.moreText}>+{invalidFiles.length - 5} more</Text>
            )}
          </View>
        )}
      </ScrollView>

      {/* Actions */}
      <View style={styles.actions}>
        <GlassButton variant="secondary" onPress={onClear} disabled={disabled}>
          <Trash2 size={16} color={colors.text} />
          <Text style={styles.buttonText}>{t('common.clear')}</Text>
        </GlassButton>
        <GlassButton
          variant="primary"
          onPress={onUpload}
          disabled={disabled || summary.validCount === 0}
        >
          <Upload size={16} color={colors.buttonText} />
          <Text style={[styles.buttonText, styles.primaryButtonText]}>
            {t('admin.uploads.manualUpload.proceedUpload', { count: summary.validCount })}
          </Text>
        </GlassButton>
      </View>
    </GlassCard>
  );
};

interface FileRowProps {
  entry: FolderEntry;
  isValid: boolean;
  reason?: string;
  onRemove: () => void;
}

const FileRow: React.FC<FileRowProps> = ({ entry, isValid, reason, onRemove }) => {
  return (
    <View style={[styles.fileRow, !isValid && styles.invalidRow]}>
      <View style={styles.fileInfo}>
        {isValid ? (
          <FileCheck size={14} color={colors.success.DEFAULT} />
        ) : (
          <FileX size={14} color={colors.error.DEFAULT} />
        )}
        <View style={styles.fileDetails}>
          <Text style={styles.fileName} numberOfLines={1}>
            {entry.relativePath}
          </Text>
          {reason && <Text style={styles.reason}>{reason}</Text>}
        </View>
      </View>
      <Text style={styles.fileSize}>{formatFileSize(entry.file.size)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.text,
  },
  summaryText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  errorText: {
    color: colors.error.DEFAULT,
  },
  sizeText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginLeft: 'auto',
  },
  fileList: {
    maxHeight: 200,
  },
  section: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.error.DEFAULT,
    marginBottom: spacing.xs,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.glass.bgLight,
    borderRadius: borderRadius.sm,
  },
  invalidRow: {
    backgroundColor: `${colors.error.DEFAULT}1A`,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  reason: {
    fontSize: fontSize.xs,
    color: colors.error.DEFAULT,
  },
  fileSize: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  moreText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  buttonText: {
    fontSize: fontSize.sm,
    color: colors.text,
    marginLeft: spacing.xs,
  },
  primaryButtonText: {
    color: colors.buttonText,
  },
});
