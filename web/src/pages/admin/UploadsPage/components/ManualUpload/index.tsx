/**
 * ManualUpload Component
 * Complete manual upload interface - drag-drop, file list, progress tracking
 * Supports both individual file and folder upload modes
 */

import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { spacing } from '@olorin/design-tokens';
import { DropZone } from './DropZone';
import { FileListTable } from './FileListTable';
import { ContentTypeSelector } from './ContentTypeSelector';
import { UploadActions } from './UploadActions';
import { UploadResult } from './UploadResult';
import { UploadModeToggle } from './UploadModeToggle';
import { FolderPreview } from './FolderPreview';
import { useManualUpload } from '../../hooks/useManualUpload';
import type { ContentType } from '../../types';
import type { UploadMode, FolderEntry, FolderValidationResult } from '../../types/folderTypes';

export const ManualUpload: React.FC = () => {
  const [contentType, setContentType] = useState<ContentType>('movie');
  const [uploadMode, setUploadMode] = useState<UploadMode>('files');
  const [folderValidation, setFolderValidation] = useState<FolderValidationResult | null>(null);
  const [folderEntries, setFolderEntries] = useState<FolderEntry[]>([]);

  const {
    files,
    isUploading,
    uploadResult,
    selectFiles,
    removeFile,
    clearFiles,
    uploadFiles,
    uploadFolderFiles,
  } = useManualUpload();

  const handleUpload = async () => {
    await uploadFiles(contentType);
  };

  const handleFolderSelected = useCallback(
    (validation: FolderValidationResult, entries: FolderEntry[]) => {
      setFolderValidation(validation);
      setFolderEntries(entries);
    },
    []
  );

  const handleRemoveFolderFile = useCallback(
    (entry: FolderEntry) => {
      const newEntries = folderEntries.filter(
        (e) => e.relativePath !== entry.relativePath
      );
      setFolderEntries(newEntries);
      if (folderValidation) {
        const newValid = folderValidation.validFiles.filter(
          (e) => e.relativePath !== entry.relativePath
        );
        const newInvalid = folderValidation.invalidFiles.filter(
          (item) => item.entry.relativePath !== entry.relativePath
        );
        setFolderValidation({
          validFiles: newValid,
          invalidFiles: newInvalid,
          summary: {
            totalFiles: newValid.length + newInvalid.length,
            validCount: newValid.length,
            invalidCount: newInvalid.length,
            totalSize: newValid.reduce((sum, e) => sum + e.file.size, 0),
          },
        });
      }
    },
    [folderEntries, folderValidation]
  );

  const handleFolderUpload = async () => {
    if (folderValidation && folderValidation.validFiles.length > 0) {
      await uploadFolderFiles(folderValidation.validFiles, contentType);
      setFolderValidation(null);
      setFolderEntries([]);
    }
  };

  const handleClearFolder = useCallback(() => {
    setFolderValidation(null);
    setFolderEntries([]);
  }, []);

  const handleModeChange = useCallback((mode: UploadMode) => {
    setUploadMode(mode);
    if (mode === 'files') {
      setFolderValidation(null);
      setFolderEntries([]);
    }
  }, []);

  return (
    <View style={styles.container}>
      {/* Content Type Selector */}
      <ContentTypeSelector
        value={contentType}
        onChange={setContentType}
        disabled={isUploading}
      />

      {/* Upload Mode Toggle */}
      <UploadModeToggle
        mode={uploadMode}
        onChange={handleModeChange}
        disabled={isUploading}
      />

      {/* Drop Zone */}
      <DropZone
        onFilesSelected={selectFiles}
        onFolderSelected={handleFolderSelected}
        disabled={isUploading}
        contentType={contentType}
        uploadMode={uploadMode}
      />

      {/* Folder Preview (for folder mode) */}
      {uploadMode === 'folder' && folderValidation && (
        <FolderPreview
          validation={folderValidation}
          onRemoveFile={handleRemoveFolderFile}
          onUpload={handleFolderUpload}
          onClear={handleClearFolder}
          disabled={isUploading}
        />
      )}

      {/* File List (for files mode) */}
      {uploadMode === 'files' && files.length > 0 && (
        <FileListTable files={files} onRemoveFile={removeFile} isUploading={isUploading} />
      )}

      {/* Upload Actions (for files mode) */}
      {uploadMode === 'files' && files.length > 0 && (
        <UploadActions
          onUpload={handleUpload}
          onClear={clearFiles}
          isUploading={isUploading}
          hasFiles={files.length > 0}
        />
      )}

      {/* Upload Result */}
      {uploadResult && (
        <UploadResult successful={uploadResult.successful} failed={uploadResult.failed} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
});
