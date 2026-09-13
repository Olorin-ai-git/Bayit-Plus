// Top Spenders tab - displays user cost ranking (PII redacted)

import React from "react";
import type { TopSpenders } from "@/services/adminApi/costData";
import { useTranslation } from "react-i18next";
import { GlassCard } from "@olorin/glass-ui";

interface TopSpendersTabProps {
  dashboard: any;
}

export default function TopSpendersTab({ dashboard }: TopSpendersTabProps) {
  const { t } = useTranslation();

  const spenders = dashboard?.data?.topSpenders?.spenders;

  return (
    <GlassCard className="p-6 backdrop-blur-xl rounded-lg bg-black/30 border border-purple-500/20">
      <h3 className="text-lg font-semibold text-white mb-4">{t('admin.costDashboard.topSpenders.title')}</h3>

      {dashboard.loading.topSpenders ? (
        <p className="text-gray-400">{t('admin.costDashboard.topSpenders.loading')}</p>
      ) : dashboard.errors.topSpenders ? (
        <p className="text-red-400">{t('common.error')}: {dashboard.errors.topSpenders}</p>
      ) : !spenders ? (<p>{t("common.unknown")}</p>) : spenders.length === 0 ? (<p>{t("common.noData")}</p>) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-purple-500/20">
                <th className="text-left py-3 px-4 text-gray-400 font-medium">{t('admin.costDashboard.topSpenders.rank')}</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">{t('admin.costDashboard.topSpenders.userId')}</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">{t('admin.costDashboard.topSpenders.costRange')}</th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium">{t('admin.costDashboard.percentOfTotal')}</th>
              </tr>
            </thead>
            <tbody>
              {spenders.map((spender: TopSpenders["spenders"][number]) => (
                <tr key={spender.rank} className="border-b border-purple-500/10 hover:bg-black/30">
                  <td className="py-3 px-4 text-white font-medium">#{spender.rank}</td>
                  <td className="py-3 px-4 text-purple-300 font-mono text-xs">{spender.user_id_hash}</td>
                  <td className="py-3 px-4 text-gray-300">{spender.total_cost_range}</td>
                  <td className="py-3 px-4 text-right text-orange-400 font-semibold">
                    {spender.spend_percentage === null ? t("common.unknown") : `${spender.spend_percentage}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-gray-500 mt-4">
            {t('admin.costDashboard.topSpenders.privacyNote')}
          </p>
        </div>
      )}
    </GlassCard>
  );
}
