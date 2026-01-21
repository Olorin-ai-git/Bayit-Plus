/**
 * StatusIcon Component
 * Displays status icon for queue jobs
 */

import React from 'react';
import {
  Upload,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
} from 'lucide-react';
import { QueueJob } from '../types';
import { getStatusColor, isDuplicate } from '../utils';

interface StatusIconProps {
  status: string;
  job?: QueueJob;
  size?: number;
}

export const StatusIcon: React.FC<StatusIconProps> = ({ status, job, size = 16 }) => {
  const iconColor = getStatusColor(status, job);

  if (job && (status === 'failed' || status === 'cancelled') && isDuplicate(job)) {
    return <Info size={size} color={iconColor} />;
  }

  switch (status) {
    case 'completed':
      return <CheckCircle size={size} color={iconColor} />;
    case 'failed':
      return <XCircle size={size} color={iconColor} />;
    case 'uploading':
    case 'processing':
      return <Upload size={size} color={iconColor} />;
    case 'queued':
      return <Clock size={size} color={iconColor} />;
    case 'cancelled':
      return <XCircle size={size} color={iconColor} />;
    default:
      return <AlertCircle size={size} color={iconColor} />;
  }
};
