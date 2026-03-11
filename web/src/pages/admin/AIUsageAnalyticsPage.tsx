// AI Usage Analytics admin dashboard page

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { GlassButton, GlassInput } from "@bayit/shared/ui";
import { aiUsageService } from "@/services/adminApi/aiUsageAnalytics";
import { logger } from "@/utils/logger";
import FeatureBreakdownTab from "./ai-usage/FeatureBreakdownTab";
import TimelineTab from "./ai-usage/TimelineTab";
import TopUsersTab from "./ai-usage/TopUsersTab";
import RatesTab from "./ai-usage/RatesTab";

type ActiveTab = "overview" | "timeline" | "top-users" | "rates";

function getDefaultDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return {
    startDate: start.toISOString().split("T")[0],
    endDate: end.toISOString().split("T")[0],
  };
}

export default function AIUsageAnalyticsPage() {
  const { t } = useTranslation("admin");
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [dateRange, setDateRange] = useState(getDefaultDateRange);
  const [overview, setOverview] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [selectedFeature, setSelectedFeature] = useState("");
  const [topUsers, setTopUsers] = useState<any[]>([]);
  const [rates, setRates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await aiUsageService.getOverview(
        dateRange.startDate,
        dateRange.endDate,
      );
      setOverview(data);
      if ((data as any).features?.length && !selectedFeature) {
        setSelectedFeature((data as any).features[0].feature);
      }
    } catch (err: any) {
      logger.error("Failed to fetch AI usage overview", "AIUsage", err);
      setError(err?.detail || t("aiUsage.errorLoadingOverview"));
    } finally {
      setLoading(false);
    }
  }, [dateRange.startDate, dateRange.endDate, selectedFeature, t]);

  const fetchTimeline = useCallback(async () => {
    if (!selectedFeature) return;
    setLoading(true);
    setError(null);
    try {
      const data = await aiUsageService.getFeatureTimeline(
        selectedFeature,
        dateRange.startDate,
        dateRange.endDate,
      );
      setTimeline((data as any).timeline || []);
    } catch (err: any) {
      logger.error("Failed to fetch timeline", "AIUsage", err);
      setError(err?.detail || t("aiUsage.errorLoadingOverview"));
    } finally {
      setLoading(false);
    }
  }, [selectedFeature, dateRange.startDate, dateRange.endDate, t]);

  const fetchTopUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await aiUsageService.getTopUsers(
        dateRange.startDate,
        dateRange.endDate,
      );
      setTopUsers((data as any).users || []);
    } catch (err: any) {
      logger.error("Failed to fetch top users", "AIUsage", err);
      setError(err?.detail || t("aiUsage.errorLoadingOverview"));
    } finally {
      setLoading(false);
    }
  }, [dateRange.startDate, dateRange.endDate, t]);

  const fetchRates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await aiUsageService.getRates();
      setRates((data as any).rates || []);
    } catch (err: any) {
      logger.error("Failed to fetch rates", "AIUsage", err);
      setError(err?.detail || t("aiUsage.errorLoadingOverview"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  useEffect(() => {
    if (activeTab === "timeline") fetchTimeline();
    if (activeTab === "top-users") fetchTopUsers();
    if (activeTab === "rates") fetchRates();
  }, [activeTab, fetchTimeline, fetchTopUsers, fetchRates]);

  const tabs: { id: ActiveTab; label: string }[] = [
    { id: "overview", label: t("aiUsage.featureBreakdown") },
    { id: "timeline", label: t("aiUsage.timeline") },
    { id: "top-users", label: t("aiUsage.topUsers") },
    { id: "rates", label: t("aiUsage.rates") },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-purple-900/10 to-black p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white">{t("aiUsage.title")}</h1>
        <div className="flex gap-4 mt-4 items-end">
          <GlassInput
            label={t("aiUsage.startDate")}
            value={dateRange.startDate}
            onChangeText={(v: string) =>
              setDateRange((p) => ({ ...p, startDate: v }))
            }
            placeholder="YYYY-MM-DD"
          />
          <GlassInput
            label={t("aiUsage.endDate")}
            value={dateRange.endDate}
            onChangeText={(v: string) =>
              setDateRange((p) => ({ ...p, endDate: v }))
            }
            placeholder="YYYY-MM-DD"
          />
          <GlassButton variant="primary" onPress={fetchOverview}>
            {t("aiUsage.refresh")}
          </GlassButton>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/40 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {[
            {
              label: t("aiUsage.totalCredits"),
              value: overview.total_credits_consumed,
            },
            {
              label: t("aiUsage.totalTransactions"),
              value: overview.total_transactions,
            },
          ].map((card) => (
            <div
              key={card.label}
              className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-5"
            >
              <div className="text-gray-400 text-sm">{card.label}</div>
              <div className="text-3xl font-bold text-white mt-1">
                {card.value.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex border-b border-purple-500/30 gap-4 mb-6">
        {tabs.map((tab) => (
          <GlassButton
            key={tab.id}
            onPress={() => setActiveTab(tab.id)}
            variant={activeTab === tab.id ? "primary" : "ghost"}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === tab.id
                ? "text-purple-400 border-b-2 border-purple-400"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            {tab.label}
          </GlassButton>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && activeTab === "overview" && overview && (
        <FeatureBreakdownTab features={overview.features} t={t} />
      )}
      {!loading && activeTab === "timeline" && (
        <TimelineTab
          timeline={timeline}
          features={overview?.features || []}
          selectedFeature={selectedFeature}
          onFeatureChange={setSelectedFeature}
          t={t}
        />
      )}
      {!loading && activeTab === "top-users" && (
        <TopUsersTab users={topUsers} t={t} />
      )}
      {!loading && activeTab === "rates" && <RatesTab rates={rates} t={t} />}
    </div>
  );
}
