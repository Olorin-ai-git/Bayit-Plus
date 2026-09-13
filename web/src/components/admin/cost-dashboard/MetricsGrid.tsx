import React from 'react';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '@olorin/glass-ui';
import type { CostOverview } from '@/services/adminApi/costData';

export default function MetricsGrid({ data }: { data: Pick<CostOverview, 'cost_per_minute'> | null }) {
  const { t, i18n } = useTranslation();
  const metrics = [
    { label: t('admin.costDashboard.metrics.costPerMinute'), value: data?.cost_per_minute, color: 'text-blue-400' },
    { label: t('admin.costDashboard.metrics.monthlyRate'), value: null, color: 'text-green-400' },
    { label: t('admin.costDashboard.metrics.costsYtd'), value: null, color: 'text-orange-400' },
    { label: t('admin.costDashboard.metrics.revenueYtd'), value: null, color: 'text-emerald-400' },
  ];
  return <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
    {metrics.map(metric => <GlassCard key={metric.label} className="p-4 backdrop-blur-xl rounded-lg bg-black/30 border border-purple-500/20">
      <p className="text-gray-400 text-xs font-medium mb-1">{metric.label}</p>
      <p className={`text-2xl font-bold ${metric.color}`}>{metric.value == null ? t('common.unknown') : `$${metric.value.toLocaleString(i18n.language)}`}</p>
    </GlassCard>)}
  </div>;
}
