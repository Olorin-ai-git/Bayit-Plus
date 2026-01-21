/**
 * Formatter Utilities
 * Common formatting functions for investigations
 */

export const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleString();
};

export const formatDateShort = (dateString: string | undefined): string => {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString();
};

export const formatTime = (dateString: string | undefined): string => {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleTimeString();
};

export const formatRelativeTime = (dateString: string | undefined): string => {
  if (!dateString) return '—';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return formatDateShort(dateString);
};

export const formatProgress = (progress: number | undefined): string => {
  if (progress === undefined || progress === null) return '0%';
  return `${Math.min(100, Math.max(0, Math.round(progress)))}%`;
};

