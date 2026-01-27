/**
 * Folder Processing Utilities
 * Handles folder traversal and validation for batch uploads
 */

import type { ContentType } from '../types';
import type { FolderEntry, FolderValidationResult } from '../types/folderTypes';
import { MAX_FILES_IN_FOLDER, MAX_FOLDER_DEPTH, getExtensionsForContentType, MAX_FILE_SIZE } from '../constants';

/**
 * Extracts files from a DataTransfer object (drag-drop)
 * Supports folder drag-drop via webkitGetAsEntry
 */
export const processDroppedFolder = async (dataTransfer: DataTransfer): Promise<FolderEntry[]> => {
  const entries: FolderEntry[] = [];
  const items = Array.from(dataTransfer.items);

  for (const item of items) {
    if (item.kind === 'file') {
      const entry = item.webkitGetAsEntry?.();
      if (entry) {
        const fileEntries = await traverseEntry(entry, '', 0);
        entries.push(...fileEntries);
      }
    }
  }

  return entries;
};

/**
 * Recursively traverses a FileSystemEntry
 */
const traverseEntry = async (
  entry: FileSystemEntry,
  path: string,
  depth: number
): Promise<FolderEntry[]> => {
  const entries: FolderEntry[] = [];

  if (depth > MAX_FOLDER_DEPTH) {
    return entries;
  }

  if (entry.isFile) {
    const fileEntry = entry as FileSystemFileEntry;
    try {
      const file = await getFileFromEntry(fileEntry);
      const relativePath = path ? `${path}/${file.name}` : file.name;
      entries.push({ file, relativePath });
    } catch {
      // Skip files that cannot be read
    }
  } else if (entry.isDirectory) {
    const dirEntry = entry as FileSystemDirectoryEntry;
    const reader = dirEntry.createReader();
    const subEntries = await readDirectoryEntries(reader);
    const newPath = path ? `${path}/${entry.name}` : entry.name;

    for (const subEntry of subEntries) {
      const subFileEntries = await traverseEntry(subEntry, newPath, depth + 1);
      entries.push(...subFileEntries);

      if (entries.length > MAX_FILES_IN_FOLDER) {
        break;
      }
    }
  }

  return entries;
};

/**
 * Reads all entries from a directory reader
 */
const readDirectoryEntries = (reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> => {
  return new Promise((resolve, reject) => {
    const allEntries: FileSystemEntry[] = [];

    const readBatch = () => {
      reader.readEntries(
        (entries) => {
          if (entries.length === 0) {
            resolve(allEntries);
          } else {
            allEntries.push(...entries);
            readBatch();
          }
        },
        reject
      );
    };

    readBatch();
  });
};

/**
 * Gets a File object from a FileSystemFileEntry
 */
const getFileFromEntry = (entry: FileSystemFileEntry): Promise<File> => {
  return new Promise((resolve, reject) => {
    entry.file(resolve, reject);
  });
};

/**
 * Processes files from a file input with webkitdirectory attribute
 */
export const processFileInputFolder = (files: FileList): FolderEntry[] => {
  const entries: FolderEntry[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const relativePath = (file as any).webkitRelativePath || file.name;
    entries.push({ file, relativePath });
  }

  return entries;
};

/**
 * Validates folder contents against content type requirements
 */
export const validateFolderContents = (
  entries: FolderEntry[],
  contentType: ContentType
): FolderValidationResult => {
  const allowedExtensions = getExtensionsForContentType(contentType);
  const formatLabel = contentType === 'audiobook' ? 'audio' : 'video';
  const validFiles: FolderEntry[] = [];
  const invalidFiles: { entry: FolderEntry; reason: string }[] = [];
  let totalSize = 0;

  for (const entry of entries) {
    const ext = '.' + entry.file.name.split('.').pop()?.toLowerCase();

    if (!allowedExtensions.includes(ext)) {
      invalidFiles.push({
        entry,
        reason: `Invalid ${formatLabel} file type: ${ext}`,
      });
    } else if (entry.file.size > MAX_FILE_SIZE) {
      invalidFiles.push({
        entry,
        reason: `File too large: ${(entry.file.size / (1024 * 1024 * 1024)).toFixed(2)}GB (max 10GB)`,
      });
    } else {
      validFiles.push(entry);
      totalSize += entry.file.size;
    }
  }

  return {
    validFiles,
    invalidFiles,
    summary: {
      totalFiles: entries.length,
      validCount: validFiles.length,
      invalidCount: invalidFiles.length,
      totalSize,
    },
  };
};

/**
 * Groups files by their directory path
 */
export const groupFilesByDirectory = (entries: FolderEntry[]): Map<string, FolderEntry[]> => {
  const groups = new Map<string, FolderEntry[]>();

  for (const entry of entries) {
    const parts = entry.relativePath.split('/');
    const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : '/';

    if (!groups.has(dir)) {
      groups.set(dir, []);
    }
    groups.get(dir)!.push(entry);
  }

  return groups;
};
