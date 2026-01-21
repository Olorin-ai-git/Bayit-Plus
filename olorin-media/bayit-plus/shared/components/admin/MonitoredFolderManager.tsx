/**
 * MonitoredFolderManager Component
 * Modal for adding/editing monitored folders
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { GlassModal } from '../ui/GlassModal';
import { GlassInput } from '../ui/GlassInput';
import { GlassSelect } from '../ui/GlassSelect';
import { GlassToggle } from '../ui/GlassToggle';
import { GlassButton } from '../ui/GlassButton';
import { colors, spacing, fontSize } from '../../theme';
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
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.label}>Folder Path *</Text>
          <GlassInput
            value={path}
            onChangeText={setPath}
            placeholder="/path/to/folder"
            editable={!isEditMode}
            style={styles.input}
          />
          <Text style={styles.hint}>
            Absolute path to the folder to monitor
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Friendly Name</Text>
          <GlassInput
            value={name}
            onChangeText={setName}
            placeholder="My Movies Folder"
            style={styles.input}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Content Type *</Text>
          <GlassSelect
            value={contentType}
            onValueChange={setContentType}
            options={contentTypeOptions}
            disabled={isEditMode}
            style={styles.input}
          />
        </View>

        {isEditMode && (
          <View style={styles.section}>
            <View style={styles.toggleRow}>
              <Text style={styles.label}>Enabled</Text>
              <GlassToggle value={enabled} onValueChange={setEnabled} />
            </View>
            <Text style={styles.hint}>
              Enable or disable monitoring for this folder
            </Text>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.toggleRow}>
            <Text style={styles.label}>Auto Upload</Text>
            <GlassToggle value={autoUpload} onValueChange={setAutoUpload} />
          </View>
          <Text style={styles.hint}>
            Automatically upload new files when found
          </Text>
        </View>

        <View style={styles.section}>
          <View style={styles.toggleRow}>
            <Text style={styles.label}>Recursive Scan</Text>
            <GlassToggle value={recursive} onValueChange={setRecursive} />
          </View>
          <Text style={styles.hint}>
            Scan subdirectories for files
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>File Patterns</Text>
          <GlassInput
            value={filePatterns}
            onChangeText={setFilePatterns}
            placeholder="*.mp4, *.mkv, *.avi"
            style={styles.input}
          />
          <Text style={styles.hint}>
            Comma-separated glob patterns (leave empty for defaults)
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Exclude Patterns</Text>
          <GlassInput
            value={excludePatterns}
            onChangeText={setExcludePatterns}
            placeholder="*.tmp, *.part"
            style={styles.input}
          />
          <Text style={styles.hint}>
            Comma-separated patterns to exclude
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Scan Interval (seconds)</Text>
          <GlassInput
            value={scanInterval}
            onChangeText={setScanInterval}
            placeholder="3600"
            keyboardType="numeric"
            style={styles.input}
          />
          <Text style={styles.hint}>
            Time between automatic scans (minimum 60 seconds)
          </Text>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.buttonRow}>
          <GlassButton
            title="Cancel"
            onPress={onClose}
            variant="secondary"
            style={styles.button}
          />
          <GlassButton
            title={isEditMode ? 'Update' : 'Add'}
            onPress={handleSave}
            loading={loading}
            style={styles.button}
          />
        </View>
      </ScrollView>
    </GlassModal>
  );
};

const styles = StyleSheet.create({
  content: {
    maxHeight: 600,
  },
  section: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  input: {
    marginBottom: spacing.xs,
  },
  hint: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorContainer: {
    backgroundColor: colors.error + '20',
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.lg,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.error,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  button: {
    minWidth: 120,
  },
});

export default MonitoredFolderManager;
