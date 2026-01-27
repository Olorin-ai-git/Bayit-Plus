/**
 * Folder Upload Types
 * Types for folder-based batch uploads
 */

/**
 * Represents a file entry from a folder with its relative path
 */
export interface FolderEntry {
  file: File;
  relativePath: string;
}

/**
 * Result of validating folder contents
 */
export interface FolderValidationResult {
  validFiles: FolderEntry[];
  invalidFiles: { entry: FolderEntry; reason: string }[];
  summary: {
    totalFiles: number;
    validCount: number;
    invalidCount: number;
    totalSize: number;
  };
}

/**
 * Upload mode for the DropZone component
 */
export type UploadMode = 'files' | 'folder';
