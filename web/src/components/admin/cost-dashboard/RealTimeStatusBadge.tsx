import React from 'react';
import { useTranslation } from 'react-i18next';
import { Clock } from 'lucide-react';

export default function RealTimeStatusBadge({ lastUpdated }: { lastUpdated?: string | null }) {
  const { t, i18n } = useTranslation();
  const date = lastUpdated ? new Date(lastUpdated) : null;
  const displayTime = date && Number.isFinite(date.getTime()) ? date.toLocaleString(i18n.language) : t('common.unknown');
  return <div className="flex items-center gap-2 px-3 py-2 bg-black/40 backdrop-blur-xl rounded-lg border border-purple-500/20">
    <span className="text-xs text-gray-400"><Clock size={12} className="inline mr-1" />{t('common.lastUpdated')}: {displayTime}</span>
  </div>;
}
