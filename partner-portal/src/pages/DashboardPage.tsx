/**
 * Dashboard Page
 *
 * Main dashboard with KPIs and capability usage breakdown.
 */

import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { GlassCard } from "@olorin/glass-ui/web";
import { useAuthStore } from "../stores/authStore";
import { useUsageStore, CAPABILITY_LABELS } from "../stores/usageStore";
import type { Capability } from "../stores/usageStore";
import { PageHeader, StatCard, LoadingSpinner } from "../components/common";

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);

const formatNumber = (num: number): string => {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
};

export const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { partner } = useAuthStore();
  const { summary, isLoading, fetchSummary } = useUsageStore();

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  if (isLoading && !summary) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const capabilities = partner?.capabilities ?? [];
  const byCapability = summary?.by_capability ?? {};
  const capKeys = Object.keys(byCapability) as Capability[];

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("dashboard.welcome", { name: partner?.name ?? "Partner" })}
        description={t("dashboard.overview")}
      />

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t("dashboard.totalRequests")}
          value={formatNumber(summary?.totals.request_count ?? 0)}
          subtitle={t("dashboard.thisMonth")}
        />
        <StatCard
          title={t("dashboard.estimatedCost")}
          value={formatCurrency(summary?.totals.estimated_cost_usd ?? 0)}
          subtitle={t("dashboard.thisMonth")}
        />
        <StatCard
          title={t("dashboard.capabilities")}
          value={capabilities.length}
          subtitle={t("dashboard.statusActive")}
        />
        <StatCard
          title={t("dashboard.partnerStatus")}
          value={
            partner?.is_active
              ? t("dashboard.statusActive")
              : t("dashboard.statusInactive")
          }
        />
      </div>

      {/* Capability Breakdown */}
      <GlassCard>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">
            {t("dashboard.capabilityBreakdown")}
          </h2>
          <Link
            to="/usage"
            className="text-sm text-partner-primary hover:text-partner-primary/80 transition-colors"
          >
            {t("common.viewAll")} &rarr;
          </Link>
        </div>

        {capKeys.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left rtl:text-right py-3 px-4 text-sm font-medium text-white/60">
                    {t("usage.capability")}
                  </th>
                  <th className="text-right rtl:text-left py-3 px-4 text-sm font-medium text-white/60">
                    {t("usage.requests")}
                  </th>
                  <th className="text-right rtl:text-left py-3 px-4 text-sm font-medium text-white/60">
                    {t("dashboard.cost")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {capKeys.map((cap) => (
                  <tr
                    key={cap}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="py-3 px-4 text-sm text-white">
                      {CAPABILITY_LABELS[cap] ?? cap}
                    </td>
                    <td className="py-3 px-4 text-sm text-white text-right rtl:text-left">
                      {formatNumber(byCapability[cap].request_count)}
                    </td>
                    <td className="py-3 px-4 text-sm text-white text-right rtl:text-left">
                      {formatCurrency(byCapability[cap].estimated_cost_usd)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex items-center justify-center h-32 text-white/40">
            {t("common.noData")}
          </div>
        )}
      </GlassCard>
    </div>
  );
};

export default DashboardPage;
