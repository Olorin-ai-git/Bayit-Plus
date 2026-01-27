// Cost Admin Dashboard main page

import React from "react";
import { useCostDashboard } from "@/hooks/admin/useCostDashboard";
import PLSummary from "@/components/admin/cost-dashboard/PLSummary";
import MetricsGrid from "@/components/admin/cost-dashboard/MetricsGrid";
import ScopeToggle from "@/components/admin/cost-dashboard/ScopeToggle";
import OverviewTab from "@/components/admin/cost-dashboard/tabs/OverviewTab";
import TimelineTab from "@/components/admin/cost-dashboard/tabs/TimelineTab";
import CategoriesTab from "@/components/admin/cost-dashboard/tabs/CategoriesTab";
import TopSpendersTab from "@/components/admin/cost-dashboard/tabs/TopSpendersTab";
import RealTimeStatusBadge from "@/components/admin/cost-dashboard/RealTimeStatusBadge";

export default function CostDashboardPage() {
  const dashboard = useCostDashboard();

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-purple-900/10 to-black p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Cost Dashboard</h1>
            <p className="text-gray-400">Platform cost tracking and analytics</p>
          </div>
          <RealTimeStatusBadge />
        </div>
      </div>

      {/* Controls */}
      <div className="mb-6 space-y-4">
        <ScopeToggle
          scope={dashboard.scope}
          onScopeChange={(scope, userId) => dashboard.setScope(scope, userId)}
        />
      </div>

      {/* P&L Summary */}
      {dashboard.data.overview && <PLSummary data={dashboard.data.overview} />}

      {/* Key Metrics */}
      {dashboard.data.overview && <MetricsGrid data={dashboard.data.overview} />}

      {/* Tabs */}
      <div className="mt-8">
        <div className="flex border-b border-purple-500/30 gap-4">
          {(
            [
              { id: "overview", label: "Overview" },
              { id: "timeline", label: "Timeline" },
              { id: "categories", label: "Categories" },
              { id: "spenders", label: "Top Spenders" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => dashboard.setActiveTab(tab.id)}
              className={`px-4 py-2 font-medium transition-colors ${
                dashboard.activeTab === tab.id
                  ? "text-purple-400 border-b-2 border-purple-400"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {dashboard.activeTab === "overview" && (
            <OverviewTab dashboard={dashboard} />
          )}
          {dashboard.activeTab === "timeline" && (
            <TimelineTab dashboard={dashboard} />
          )}
          {dashboard.activeTab === "categories" && (
            <CategoriesTab dashboard={dashboard} />
          )}
          {dashboard.activeTab === "spenders" && (
            <TopSpendersTab dashboard={dashboard} />
          )}
        </div>
      </div>
    </div>
  );
}
