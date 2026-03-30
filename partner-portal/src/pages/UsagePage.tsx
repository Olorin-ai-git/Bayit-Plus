/**
 * Usage Analytics Page
 *
 * Capability-level usage detail with selector buttons.
 */

import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { GlassButton, GlassCard } from "@olorin/glass-ui/web";
import { useUsageStore, CAPABILITY_LABELS } from "../stores/usageStore";
import type { Capability } from "../stores/usageStore";
import { PageHeader, StatCard, LoadingSpinner } from "../components/common";

const ALL_CAPABILITIES: Capability[] = [
  "realtime_dubbing",
  "semantic_search",
  "cultural_context",
  "recap_agent",
];

const formatNumber = (num: number): string =>
  new Intl.NumberFormat().format(num);

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);

const formatDuration = (seconds: number): string => {
  if (seconds >= 3600) return `${(seconds / 3600).toFixed(1)}h`;
  if (seconds >= 60) return `${(seconds / 60).toFixed(1)}m`;
  return `${seconds.toFixed(0)}s`;
};

export const UsagePage: React.FC = () => {
  const { t } = useTranslation();
  const {
    summary,
    capabilityDetail,
    selectedCapability,
    isLoading,
    fetchSummary,
    fetchCapability,
    setSelectedCapability,
  } = useUsageStore();

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const handleSelect = (cap: Capability) => {
    setSelectedCapability(cap);
    fetchCapability(cap);
  };

  const detail = selectedCapability
    ? capabilityDetail?.by_capability?.[selectedCapability]
    : null;

  return (
    <div className="space-y-8">
      <PageHeader title={t("usage.title")} description={t("usage.summary")} />

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title={t("usage.requests")}
            value={formatNumber(summary.totals.request_count)}
          />
          <StatCard
            title={t("usage.audioSeconds")}
            value={formatDuration(summary.totals.audio_seconds_processed)}
          />
          <StatCard
            title={t("usage.estimatedCost")}
            value={formatCurrency(summary.totals.estimated_cost_usd)}
          />
        </div>
      )}

      {/* Capability Selector */}
      <GlassCard>
        <h2 className="text-lg font-semibold text-white mb-4">
          {t("usage.selectCapability")}
        </h2>
        <div className="flex flex-wrap gap-3">
          {ALL_CAPABILITIES.map((cap) => (
            <GlassButton
              key={cap}
              variant={selectedCapability === cap ? "primary" : "ghost"}
              size="sm"
              onClick={() => handleSelect(cap)}
            >
              {CAPABILITY_LABELS[cap]}
            </GlassButton>
          ))}
        </div>
      </GlassCard>

      {/* Capability Detail */}
      {isLoading && selectedCapability && (
        <div className="flex items-center justify-center h-32">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {detail && !isLoading && (
        <GlassCard>
          <h2 className="text-lg font-semibold text-white mb-6">
            {CAPABILITY_LABELS[selectedCapability!]} &mdash;{" "}
            {t("usage.capabilityDetail")}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title={t("usage.requests")}
              value={formatNumber(detail.request_count)}
            />
            <StatCard
              title={t("usage.audioSeconds")}
              value={formatDuration(detail.audio_seconds_processed)}
            />
            <StatCard
              title={t("usage.tokensConsumed")}
              value={formatNumber(detail.tokens_consumed)}
            />
            <StatCard
              title={t("usage.estimatedCost")}
              value={formatCurrency(detail.estimated_cost_usd)}
            />
          </div>
        </GlassCard>
      )}

      {!selectedCapability && !isLoading && (
        <div className="flex items-center justify-center h-32 text-white/40">
          {t("usage.selectCapability")}
        </div>
      )}
    </div>
  );
};

export default UsagePage;
