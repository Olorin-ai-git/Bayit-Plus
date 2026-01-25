/**
 * UploadProgress Component
 * Displays upload progress with file info, progress bar, and ETA
 */

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { GlassCard } from '../ui/GlassCard';
import { GlassProgressBar } from '../ui/GlassProgressBar';
import { colors } from '@olorin/design-tokens';
import { useDirection } from '../../hooks/useDirection';
import { UploadJob } from '../../services/uploadService';

interface UploadProgressProps {
  job: UploadJob;
  onCancel?: (jobId: string) => void;
  formatFileSize?: (bytes?: number) => string;
  formatUploadSpeed?: (bytesPerSecond?: number) => string;
  formatETA?: (seconds?: number) => string;
}

export const UploadProgress: React.FC<UploadProgressProps> = ({
  job,
  onCancel,
  formatFileSize = (bytes) => bytes ? `${(bytes / 1024 / 1024).toFixed(2)} MB` : 'Unknown',
  formatUploadSpeed = (speed) => speed ? `${(speed / 1024 / 1024).toFixed(2)} MB/s` : 'Calculating...',
  formatETA = (seconds) => {
    if (!seconds) return 'Calculating...';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m`;
  },
}) => {
  const { textAlign } = useDirection();

  const getStatusIcon = () => {
    switch (job.status) {
      case 'queued':
        return '⏳';
      case 'processing':
        return '⚙️';
      case 'uploading':
        return '📤';
      case 'completed':
        return '✅';
      case 'failed':
        return '❌';
      case 'cancelled':
        return '🚫';
      default:
        return '📁';
    }
  };

  const getStatusColor = () => {
    switch (job.status) {
      case 'completed':
        return colors.success;
      case 'failed':
        return colors.error;
      case 'cancelled':
        return colors.textMuted;
      case 'uploading':
      case 'processing':
        return colors.primary;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusText = () => {
    switch (job.status) {
      case 'queued':
        return 'Queued';
      case 'processing':
        return 'Processing';
      case 'uploading':
        return 'Uploading';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return job.status;
    }
  };

  const canCancel = ['queued', 'processing', 'uploading'].includes(job.status);

  return (
    <GlassCard autoSize className="p-4 mb-4">
      <View className="flex-row justify-between items-start mb-4">
        <View className="flex-row items-center flex-1">
          <Text className="text-3xl mr-4">{getStatusIcon()}</Text>
          <View className="flex-1">
            <Text className="text-white text-base font-semibold mb-1" style={{ textAlign }} numberOfLines={1}>
              {job.filename}
            </Text>
            <Text className="text-gray-400 text-sm" style={{ textAlign }}>
              {formatFileSize(job.file_size)}
            </Text>
          </View>
        </View>

        {canCancel && onCancel && (
          <TouchableOpacity
            className="w-8 h-8 rounded-full justify-center items-center ml-2"
            style={{ backgroundColor: colors.error + '20' }}
            onPress={() => onCancel(job.job_id)}
          >
            <Text className="text-lg font-bold" style={{ color: colors.error }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-sm font-semibold" style={{ color: getStatusColor() }}>
          {getStatusText()}
        </Text>
        <Text className="text-sm text-gray-400 font-semibold">{Math.round(job.progress)}%</Text>
      </View>

      <GlassProgressBar
        progress={job.progress}
        height={8}
        className="mb-4"
      />

      {job.status === 'uploading' && (
        <View className="flex-row justify-between items-center">
          <Text className="text-sm text-gray-400">
            Speed: {formatUploadSpeed(job.upload_speed)}
          </Text>
          <Text className="text-sm text-gray-400">
            ETA: {formatETA(job.eta_seconds)}
          </Text>
        </View>
      )}

      {job.error_message && (
        <View className="p-4 rounded-md mt-2" style={{ backgroundColor: colors.error + '20' }}>
          <Text className="text-sm" style={{ color: colors.error }}>
            {job.error_message}
          </Text>
        </View>
      )}

      {job.destination_url && job.status === 'completed' && (
        <View className="p-4 rounded-md mt-2" style={{ backgroundColor: colors.success + '20' }}>
          <Text className="text-sm font-semibold" style={{ color: colors.success }} numberOfLines={1}>
            Uploaded successfully
          </Text>
        </View>
      )}
    </GlassCard>
  );
};

export default UploadProgress;
