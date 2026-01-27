/**
 * DropZone Component
 * Drag-and-drop file selection area with click-to-browse fallback
 * Supports both file and folder upload modes
 */

import React, { useCallback, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useDropzone } from 'react-dropzone';
import { Upload, Folder } from 'lucide-react';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { useTranslation } from 'react-i18next';
import { validateFiles } from '../../utils/fileValidation';
import { processDroppedFolder, processFileInputFolder, validateFolderContents } from '../../utils/folderProcessing';
import { useNotifications } from '@olorin/glass-ui/hooks';
import { MAX_FILE_SIZE, getExtensionsForContentType, getMimeTypeForContentType } from '../../constants';
import { formatFileSize } from '../../utils/formatters';
import type { ContentType } from '../../types';
import type { UploadMode, FolderEntry, FolderValidationResult } from '../../types/folderTypes';

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
  onFolderSelected?: (validation: FolderValidationResult, entries: FolderEntry[]) => void;
  disabled?: boolean;
  contentType?: ContentType;
  uploadMode?: UploadMode;
}

export const DropZone: React.FC<DropZoneProps> = ({
  onFilesSelected,
  onFolderSelected,
  disabled = false,
  contentType = 'movie',
  uploadMode = 'files',
}) => {
  const { t } = useTranslation();
  const notifications = useNotifications();
  const allowedExtensions = getExtensionsForContentType(contentType);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[], _rejectedFiles: any, event: any) => {
      if (uploadMode === 'folder' && event?.dataTransfer) {
        const entries = await processDroppedFolder(event.dataTransfer);
        if (entries.length > 0) {
          const validation = validateFolderContents(entries, contentType);
          onFolderSelected?.(validation, entries);
          return;
        }
      }

      const { valid, invalid, reasons } = validateFiles(acceptedFiles, contentType);

      if (invalid.length > 0) {
        const invalidList = invalid
          .slice(0, 5)
          .map((file) => `${file.name}: ${reasons[file.name]}`)
          .join('\n');

        notifications.showWarning(
          t('admin.uploads.manualUpload.invalidFiles', {
            count: invalid.length,
            defaultValue: `${invalid.length} file(s) rejected`,
          }) + `\n\n${invalidList}` + (invalid.length > 5 ? `\n...and ${invalid.length - 5} more` : '')
        );
      }

      if (valid.length > 0) {
        onFilesSelected(valid);
      }
    },
    [onFilesSelected, onFolderSelected, notifications, t, contentType, uploadMode]
  );

  const handleFolderInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;

      const entries = processFileInputFolder(files);
      const validation = validateFolderContents(entries, contentType);
      onFolderSelected?.(validation, entries);

      if (folderInputRef.current) {
        folderInputRef.current.value = '';
      }
    },
    [contentType, onFolderSelected]
  );

  const handleFolderClick = useCallback(() => {
    if (uploadMode === 'folder') {
      folderInputRef.current?.click();
    }
  }, [uploadMode]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled,
    accept: getMimeTypeForContentType(contentType),
    maxSize: MAX_FILE_SIZE,
    noClick: uploadMode === 'folder',
    noKeyboard: false,
    getFilesFromEvent: uploadMode === 'folder' ? undefined : undefined,
  });

  const Icon = uploadMode === 'folder' ? Folder : Upload;
  const dropText = uploadMode === 'folder'
    ? t('admin.uploads.manualUpload.dropFolder')
    : t('admin.uploads.manualUpload.dropFiles');
  const clickText = uploadMode === 'folder'
    ? t('admin.uploads.manualUpload.selectFolder')
    : t('admin.uploads.manualUpload.dragOrClick');

  return (
    <div
      {...getRootProps()}
      onClick={uploadMode === 'folder' ? handleFolderClick : undefined}
      role="button"
      aria-label={clickText}
      aria-describedby={isDragActive ? 'drop-zone-hint' : undefined}
      style={{
        border: `2px dashed ${isDragActive ? colors.primary.DEFAULT : colors.glass.border}`,
        borderRadius: borderRadius.lg,
        backgroundColor: isDragActive ? `${colors.primary.DEFAULT}1A` : colors.glass.bg,
        padding: spacing.xl,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.md,
        minHeight: '200px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {uploadMode === 'files' && <input {...getInputProps()} />}
      {uploadMode === 'folder' && (
        <input
          ref={folderInputRef}
          type="file"
          style={{ display: 'none' }}
          onChange={handleFolderInputChange}
          {...({ webkitdirectory: '', directory: '' } as any)}
        />
      )}
      <Icon
        size={48}
        color={isDragActive ? colors.primary.DEFAULT : colors.glass.borderLight}
        aria-hidden="true"
      />
      <Text style={styles.title}>{isDragActive ? dropText : clickText}</Text>
      <Text style={styles.subtitle}>
        {t(
          contentType === 'audiobook'
            ? 'admin.uploads.manualUpload.acceptedAudioFormats'
            : 'admin.uploads.manualUpload.acceptedFormats'
        )}
        : {allowedExtensions.join(', ')}
      </Text>
      <Text style={styles.subtitle}>
        {t('admin.uploads.manualUpload.maxSize')}: {formatFileSize(MAX_FILE_SIZE)}
      </Text>
      {isDragActive && (
        <span id="drop-zone-hint" style={{ display: 'none' }}>
          {dropText}
        </span>
      )}
    </div>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
