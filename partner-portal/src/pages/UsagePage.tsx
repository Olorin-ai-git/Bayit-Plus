/**
 * Usage Analytics Page
 *
 * Detailed usage analytics with charts and breakdown tables.
 */

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useUsageStore } from '../stores/usageStore';
import { toast } from '../stores/uiStore';
import { PageHeader, StatCard, LoadingSpinner, EmptyState } from '../components/common';
import type { UsageGranularity, CapabilityType } from '../types';

export const UsagePage: React.FC = () => {
  const { t } = useTranslation();
  const {
    summary,
    dataPoints,
    breakdown,
    dateRange,
    granularity,
    capability,
    isLoading,
    setDateRange,
    setGranularity,
    setCapability,
    fetchBreakdown,
    exportUsage,
  } = useUsageStore();

  const [localDateRange, setLocalDateRange] = useState(dateRange);

  useEffect(() => {
    fetchBreakdown();
  }, [fetchBreakdown]);

  const handleDateChange = (field: 'start' | 'end', value: string) => {
    const newRange = { ...localDateRange, [field]: value };
    setLocalDateRange(newRange);
  };

  const applyDateRange = () => {
    setDateRange(localDateRange);
  };

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const url = await exportUsage(format);
      window.open(url, '_blank');
      toast.success(t('common.success'));
    } catch {
      toast.error(t('errors.serverError'));
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  // Prepare chart data
  const chartData = dataPoints.map((point) => ({
    date: new Date(point.timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    requests: point.requests,
    errors: point.errors,
  }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <PageHeader
        title={t('usage.title')}
        description={t('usage.summary')}
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => handleExport('csv')}
              className="px-4 py-2 rounded-xl bg-white/10 text-white text-sm hover:bg-white/20 transition-colors"
            >
              {t('usage.exportCsv')}
            </button>
            <button
              onClick={() => handleExport('json')}
              className="px-4 py-2 rounded-xl bg-white/10 text-white text-sm hover:bg-white/20 transition-colors"
            >
              {t('usage.exportJson')}
            </button>
          </div>
        }
      />

      {/* Filters */}
      <div className="rounded-2xl border border-white/10 bg-glass-card backdrop-blur-xl p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-white/60 mb-2">
              {t('usage.startDate')}
            </label>
            <input
              type="date"
              value={localDateRange.start}
              onChange={(e) => handleDateChange('start', e.target.value)}
              className="
                w-full px-4 py-2.5 rounded-xl
                bg-white/5 border border-white/10
                text-white text-sm
                focus:outline-none focus:border-partner-primary
              "
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium text-white/60 mb-2">
              {t('usage.endDate')}
            </label>
            <input
              type="date"
              value={localDateRange.end}
              onChange={(e) => handleDateChange('end', e.target.value)}
              className="
                w-full px-4 py-2.5 rounded-xl
                bg-white/5 border border-white/10
                text-white text-sm
                focus:outline-none focus:border-partner-primary
              "
            />
          </div>

          {/* Granularity */}
          <div>
            <label className="block text-sm font-medium text-white/60 mb-2">
              {t('usage.granularity')}
            </label>
            <select
              value={granularity}
              onChange={(e) => setGranularity(e.target.value as UsageGranularity)}
              className="
                w-full px-4 py-2.5 rounded-xl
                bg-white/5 border border-white/10
                text-white text-sm
                focus:outline-none focus:border-partner-primary
              "
            >
              <option value="hourly">{t('usage.hourly')}</option>
              <option value="daily">{t('usage.daily')}</option>
              <option value="monthly">{t('usage.monthly')}</option>
            </select>
          </div>

          {/* Capability */}
          <div>
            <label className="block text-sm font-medium text-white/60 mb-2">
              {t('usage.capability')}
            </label>
            <select
              value={capability}
              onChange={(e) => setCapability(e.target.value as CapabilityType)}
              className="
                w-full px-4 py-2.5 rounded-xl
                bg-white/5 border border-white/10
                text-white text-sm
                focus:outline-none focus:border-partner-primary
              "
            >
              <option value="all">{t('usage.all')}</option>
              <option value="fraud">{t('usage.fraud')}</option>
              <option value="content">{t('usage.content')}</option>
            </select>
          </div>

          {/* Apply Button */}
          <div className="flex items-end">
            <button
              onClick={applyDateRange}
              className="
                w-full px-4 py-2.5 rounded-xl
                bg-partner-primary text-white text-sm font-medium
                hover:bg-partner-primary/90
                transition-colors
              "
            >
              {t('common.filter')}
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title={t('usage.requests')}
            value={formatNumber(summary.totalRequests)}
          />
          <StatCard
            title={t('usage.fraud')}
            value={formatNumber(summary.fraudRequests)}
          />
          <StatCard
            title={t('usage.content')}
            value={formatNumber(summary.contentRequests)}
          />
          <StatCard
            title={t('dashboard.estimatedCost')}
            value={formatCurrency(summary.estimatedCost, summary.currency)}
          />
        </div>
      )}

      {/* Usage Chart */}
      <div className="rounded-2xl border border-white/10 bg-glass-card backdrop-blur-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-6">{t('usage.requests')}</h2>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner size="lg" />
          </div>
        ) : chartData.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" fontSize={12} />
                <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    color: '#fff',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="requests"
                  stroke="#7c3aed"
                  fill="url(#colorRequests)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState title={t('common.noData')} />
        )}
      </div>

      {/* Breakdown Table */}
      <div className="rounded-2xl border border-white/10 bg-glass-card backdrop-blur-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-6">{t('usage.breakdown')}</h2>

        {breakdown.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left rtl:text-right py-3 px-4 text-sm font-medium text-white/60">
                    {t('usage.endpoint')}
                  </th>
                  <th className="text-left rtl:text-right py-3 px-4 text-sm font-medium text-white/60">
                    {t('usage.capability')}
                  </th>
                  <th className="text-right rtl:text-left py-3 px-4 text-sm font-medium text-white/60">
                    {t('usage.requests')}
                  </th>
                  <th className="text-right rtl:text-left py-3 px-4 text-sm font-medium text-white/60">
                    {t('usage.errors')}
                  </th>
                  <th className="text-right rtl:text-left py-3 px-4 text-sm font-medium text-white/60">
                    {t('usage.avgLatency')}
                  </th>
                  <th className="text-right rtl:text-left py-3 px-4 text-sm font-medium text-white/60">
                    {t('usage.p95Latency')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {breakdown.map((row, index) => (
                  <tr
                    key={index}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="py-3 px-4 text-sm text-white font-mono">
                      {row.endpoint}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`
                          inline-flex px-2 py-1 rounded-lg text-xs font-medium
                          ${row.capability === 'fraud' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-cyan-500/20 text-cyan-400'}
                        `}
                      >
                        {t(`usage.${row.capability}`)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-white text-right rtl:text-left">
                      {formatNumber(row.requests)}
                    </td>
                    <td className="py-3 px-4 text-sm text-right rtl:text-left">
                      <span className={row.errors > 0 ? 'text-red-400' : 'text-white/60'}>
                        {formatNumber(row.errors)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-white/60 text-right rtl:text-left">
                      {row.avgLatencyMs}ms
                    </td>
                    <td className="py-3 px-4 text-sm text-white/60 text-right rtl:text-left">
                      {row.p95LatencyMs}ms
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title={t('common.noData')} />
        )}
      </div>
    </div>
  );
};

export default UsagePage;
