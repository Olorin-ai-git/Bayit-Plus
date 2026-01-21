/**
 * MonitoredFolderManager Component
 * Modal for adding/editing monitored folders
 */

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { GlassModal } from '../ui/GlassModal';
import { GlassInput } from '../ui/GlassInput';
import { GlassSelect } from '../ui/GlassSelect';
import { GlassToggle } from '../ui/GlassToggle';
import { GlassButton } from '../ui/GlassButton';
import { MonitoredFolder, MonitoredFolderCreate, MonitoredFolderUpdate } from '../../services/uploadService';

interface MonitoredFolderManagerProps {
  visible: boolean;
  folder?: MonitoredFolder | null;
  onClose: () => void;
  onSave: (data: MonitoredFolderCreate | MonitoredFolderUpdate) => Promise<void>;
}

const contentTypeOptions = [
  { label: 'Movie', value: 'movie' },
  { label: 'Podcast', value: 'podcast' },
  { label: 'Podcast Episode', value: 'podcast_episode' },
  { label: 'Image', value: 'image' },
  { label: 'Audio', value: 'audio' },
  { label: 'Subtitle', value: 'subtitle' },
  { label: 'Other', value: 'other' },
];

export const MonitoredFolderManager: React.FC<MonitoredFolderManagerProps> = ({
  visible,
  folder,
  onClose,
  onSave,
}) => {
  const [path, setPath] = useState('');
  const [name, setName] = useState('');
  const [contentType, setContentType] = useState('movie');
  const [autoUpload, setAutoUpload] = useState(true);
  const [recursive, setRecursive] = useState(true);
  const [enabled, setEnabled] = useState(true);
  const [filePatterns, setFilePatterns] = useState('');
  const [excludePatterns, setExcludePatterns] = useState('');
  const [scanInterval, setScanInterval] = useState('3600');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = !!folder;

  // Load folder data when editing
  useEffect(() => {
    if (folder) {
      setPath(folder.path);
      setName(folder.name || '');
      setContentType(folder.content_type);
      setAutoUpload(folder.auto_upload);
      setRecursive(folder.recursive);
      setEnabled(folder.enabled);
      setFilePatterns(folder.file_patterns.join(', '));
      setExcludePatterns(folder.exclude_patterns.join(', '));
      setScanInterval(folder.scan_interval.toString());
    } else {
      // Reset for new folder
      setPath('');
      setName('');
      setContentType('movie');
      setAutoUpload(true);
      setRecursive(true);
      setEnabled(true);
      setFilePatterns('');
      setExcludePatterns('*.tmp, *.part, *.download');
      setScanInterval('3600');
    }
    setError(null);
  }, [folder, visible]);

  const handleSave = async () => {
    setError(null);

    // Validation
    if (!path.trim()) {
      setError('Path is required');
      return;
    }

    if (!contentType) {
      setError('Content type is required');
      return;
    }

    const scanIntervalNum = parseInt(scanInterval, 10);
    if (isNaN(scanIntervalNum) || scanIntervalNum < 60) {
      setError('Scan interval must be at least 60 seconds');
      return;
    }

    setLoading(true);

    try {
      const data: MonitoredFolderCreate | MonitoredFolderUpdate = isEditMode
        ? {
            name: name.trim() || undefined,
            enabled,
            auto_upload: autoUpload,
            recursive,
            file_patterns: filePatterns
              ? filePatterns.split(',').map((p) => p.trim()).filter(Boolean)
              : undefined,
            exclude_patterns: excludePatterns
              ? excludePatterns.split(',').map((p) => p.trim()).filter(Boolean)
              : undefined,
            scan_interval: scanIntervalNum,
          }
        : {
            path: path.trim(),
            name: name.trim() || undefined,
            content_type: contentType,
            auto_upload: autoUpload,
            recursive,
            file_patterns: filePatterns
              ? filePatterns.split(',').map((p) => p.trim()).filter(Boolean)
              : [],
            exclude_patterns: excludePatterns
              ? excludePatterns.split(',').map((p) => p.trim()).filter(Boolean)
              : [],
            scan_interval: scanIntervalNum,
          };

      await onSave(data);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save folder');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassModal
      visible={visible}
      onClose={onClose}
      title={isEditMode ? 'Edit Monitored Folder' : 'Add Monitored Folder'}
    >
      <ScrollView className="max-h-[600px]">
        <View className="mb-4">
          <Text className="text-base font-semibold text-text mb-2">Folder Path *</Text>
          <GlassInput
            value={path}
            onChangeText={setPath}
            placeholder="/path/to/folder"
            editable={!isEditMode}
            className="mb-1"
          />
          <Text className="text-sm text-textSecondary mt-1">
            Absolute path to the folder to monitor
          </Text>
        </View>

        <View className="mb-4">
          <Text className="text-base font-semibold text-text mb-2">Friendly Name</Text>
          <GlassInput
            value={name}
            onChangeText={setName}
            placeholder="My Movies Folder"
            className="mb-1"
          />
        </View>

        <View className="mb-4">
          <Text className="text-base font-semibold text-text mb-2">Content Type *</Text>
          <GlassSelect
            value={contentType}
            onValueChange={setContentType}
            options={contentTypeOptions}
            disabled={isEditMode}
            className="mb-1"
          />
        </View>

        {isEditMode && (
          <View className="mb-4">
            <View className="flex flex-row justify-between items-center">
              <Text className="text-base font-semibold text-text mb-2">Enabled</Text>
              <GlassToggle value={enabled} onValueChange={setEnabled} />
            </View>
            <Text className="text-sm text-textSecondary mt-1">
              Enable or disable monitoring for this folder
            </Text>
          </View>
        )}

        <View className="mb-4">
          <View className="flex flex-row justify-between items-center">
            <Text className="text-base font-semibold text-text mb-2">Auto Upload</Text>
            <GlassToggle value={autoUpload} onValueChange={setAutoUpload} />
          </View>
          <Text className="text-sm text-textSecondary mt-1">
            Automatically upload new files when found
          </Text>
        </View>

        <View className="mb-4">
          <View className="flex flex-row justify-between items-center">
            <Text className="text-base font-semibold text-text mb-2">Recursive Scan</Text>
            <GlassToggle value={recursive} onValueChange={setRecursive} />
          </View>
          <Text className="text-sm text-textSecondary mt-1">
            Scan subdirectories for files
          </Text>
        </View>

        <View className="mb-4">
          <Text className="text-base font-semibold text-text mb-2">File Patterns</Text>
          <GlassInput
            value={filePatterns}
            onChangeText={setFilePatterns}
            placeholder="*.mp4, *.mkv, *.avi"
            className="mb-1"
          />
          <Text className="text-sm text-textSecondary mt-1">
            Comma-separated glob patterns (leave empty for defaults)
          </Text>
        </View>

        <View className="mb-4">
          <Text className="text-base font-semibold text-text mb-2">Exclude Patterns</Text>
          <GlassInput
            value={excludePatterns}
            onChangeText={setExcludePatterns}
            placeholder="*.tmp, *.part"
            className="mb-1"
          />
          <Text className="text-sm text-textSecondary mt-1">
            Comma-separated patterns to exclude
          </Text>
        </View>

        <View className="mb-4">
          <Text className="text-base font-semibold text-text mb-2">Scan Interval (seconds)</Text>
          <GlassInput
            value={scanInterval}
            onChangeText={setScanInterval}
            placeholder="3600"
            keyboardType="numeric"
            className="mb-1"
          />
          <Text className="text-sm text-textSecondary mt-1">
            Time between automatic scans (minimum 60 seconds)
          </Text>
        </View>

        {error && (
          <View className="bg-error/20 p-4 rounded-lg mb-4">
            <Text className="text-sm text-error">{error}</Text>
          </View>
        )}

        <View className="flex flex-row justify-end gap-4 mt-4">
          <GlassButton
            title="Cancel"
            onPress={onClose}
            variant="secondary"
            className="min-w-[120px]"
          />
          <GlassButton
            title={isEditMode ? 'Update' : 'Add'}
            onPress={handleSave}
            loading={loading}
            className="min-w-[120px]"
          />
        </View>
      </ScrollView>
    </GlassModal>
  );
};

export default MonitoredFolderManager;
