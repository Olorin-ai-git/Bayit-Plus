/**
 * ManualUpload Component
 * Complete manual upload interface - drag-drop, file list, progress tracking
 */

import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { spacing } from '@olorin/design-tokens';
import { DropZone } from './DropZone';
import { FileListTable } from './FileListTable';
import { ContentTypeSelector } from './ContentTypeSelector';
import { UploadActions } from './UploadActions';
import { UploadResult } from './UploadResult';
import { useManualUpload } from '../../hooks/useManualUpload';
import type { ContentType } from '../../types';

export const ManualUpload: React.FC = () => {
  const [contentType, setContentType] = useState<ContentType>('movie');

  const {
    files,
    isUploading,
    uploadResult,
    selectFiles,
    removeFile,
    clearFiles,
    uploadFiles,
  } = useManualUpload();

  const handleUpload = async () => {
    await uploadFiles(contentType);
  };

  return (
    <View style={styles.container}>
      {/* Content Type Selector */}
      <ContentTypeSelector
        value={contentType}
        onChange={setContentType}
        disabled={isUploading}
      />

      {/* Drop Zone */}
      <DropZone onFilesSelected={selectFiles} disabled={isUploading} />

      {/* File List */}
      {files.length > 0 && (
        <FileListTable files={files} onRemoveFile={removeFile} isUploading={isUploading} />
      )}

      {/* Upload Actions */}
      {files.length > 0 && (
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
