/**
 * Dashboard Page
 *
 * Main dashboard with KPIs, usage chart, and quick actions.
 */

import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useB2BAuthStore } from '../stores/authStore';
import { useUsageStore } from '../stores/usageStore';
import { PageHeader, StatCard, LoadingSpinner } from '../components/common';

export const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useB2BAuthStore();
  const { summary, dataPoints, isLoading, fetchSummary, fetchBreakdown } = useUsageStore();

  useEffect(() => {
    fetchSummary();
    fetchBreakdown();
  }, [fetchSummary, fetchBreakdown]);

  // Format currency
  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Format large numbers
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  // Prepare chart data (last 7 days)
  const chartData = dataPoints.slice(-7).map((point) => ({
    date: new Date(point.timestamp).toLocaleDateString('en-US', { weekday: 'short' }),
    requests: point.requests,
    fraud: point.fraudRequests,
    content: point.contentRequests,
  }));

  if (isLoading && !summary) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <PageHeader
        title={t('dashboard.welcome', { name: user?.name || 'Partner' })}
        description={t('dashboard.overview')}
      />

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t('dashboard.totalRequests')}
          value={formatNumber(summary?.totalRequests ?? 0)}
          subtitle={t('dashboard.thisMonth')}
          trend={{ value: 12.5, isPositive: true }}
          icon={
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
        />

        <StatCard
          title={t('dashboard.estimatedCost')}
          value={formatCurrency(summary?.estimatedCost ?? 0, summary?.currency)}
          subtitle={t('dashboard.thisMonth')}
          icon={
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <StatCard
          title={t('dashboard.activeApiKeys')}
          value={summary?.activeApiKeys ?? 0}
          icon={
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          }
        />

        <StatCard
          title={t('dashboard.teamMembers')}
          value={summary?.activeTeamMembers ?? 0}
          icon={
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          }
        />
      </div>

      {/* Usage Chart */}
      <div className="rounded-2xl border border-white/10 bg-glass-card backdrop-blur-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">
            {t('dashboard.usageTrend')}
          </h2>
          <Link
            to="/usage"
            className="text-sm text-partner-primary hover:text-partner-primary/80 transition-colors"
          >
            {t('common.viewAll')} →
          </Link>
        </div>

        <div className="h-64">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
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
                <Line
                  type="monotone"
                  dataKey="requests"
                  name="Total"
                  stroke="#7c3aed"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="fraud"
                  name="Fraud"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="content"
                  name="Content"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-white/40">
              {t('common.noData')}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-2xl border border-white/10 bg-glass-card backdrop-blur-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          {t('dashboard.quickActions')}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            onClick={() => navigate('/api-keys')}
            className="
              flex items-center gap-3 p-4
              rounded-xl
              bg-white/5 border border-white/10
              text-left rtl:text-right
              hover:bg-white/10 hover:border-white/20
              transition-all duration-200
            "
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-partner-primary/20 text-partner-primary">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-white">{t('dashboard.createApiKey')}</p>
              <p className="text-xs text-white/50">{t('dashboard.createApiKeyDescription')}</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/team')}
            className="
              flex items-center gap-3 p-4
              rounded-xl
              bg-white/5 border border-white/10
              text-left rtl:text-right
              hover:bg-white/10 hover:border-white/20
              transition-all duration-200
            "
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-partner-primary/20 text-partner-primary">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-white">{t('dashboard.inviteMember')}</p>
              <p className="text-xs text-white/50">{t('dashboard.inviteMemberDescription')}</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/billing')}
            className="
              flex items-center gap-3 p-4
              rounded-xl
              bg-white/5 border border-white/10
              text-left rtl:text-right
              hover:bg-white/10 hover:border-white/20
              transition-all duration-200
            "
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-partner-primary/20 text-partner-primary">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-white">{t('dashboard.viewInvoices')}</p>
              <p className="text-xs text-white/50">{t('dashboard.viewInvoicesDescription')}</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
