/**
 * FileIcon Component
 * Displays file type icons based on extension
 */

import React from 'react';
import { File, FileVideo, FileAudio } from 'lucide-react';
import { colors } from '@olorin/design-tokens';

interface FileIconProps {
  filename: string;
  size?: number;
}

export const FileIcon: React.FC<FileIconProps> = ({ filename, size = 20 }) => {
  const ext = filename.split('.').pop()?.toLowerCase();

  // Video files
  if (['mp4', 'mkv', 'avi', 'mov', 'webm', 'm4v', 'wmv'].includes(ext || '')) {
    return <FileVideo size={size} color={colors.primary.DEFAULT} />;
  }

  // Audio files
  if (['mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg'].includes(ext || '')) {
    return <FileAudio size={size} color={colors.info} />;
  }

  // Default file icon
  return <File size={size} color={colors.glass.borderLight} />;
};
