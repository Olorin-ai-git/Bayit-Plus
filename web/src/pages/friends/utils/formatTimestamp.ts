export function formatTimestamp(timestamp: string, t: any): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return t('common.justNow', 'Just now');
  if (diffHours < 24) return t('common.hoursAgo', '{{hours}}h ago', { hours: diffHours });
  if (diffDays === 1) return t('common.yesterday', 'Yesterday');
  if (diffDays < 7) return t('common.daysAgo', '{{days}}d ago', { days: diffDays });
  return date.toLocaleDateString();
}
