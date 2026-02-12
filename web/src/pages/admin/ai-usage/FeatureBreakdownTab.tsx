// Feature breakdown table for AI usage analytics

import type { TFunction } from "i18next";

interface FeatureSummary {
  feature: string;
  total_credits: number;
  transaction_count: number;
  unique_users: number;
  avg_credits_per_use: number;
  credit_rate: number;
}

interface Props {
  features: FeatureSummary[];
  t: TFunction;
}

export default function FeatureBreakdownTab({ features, t }: Props) {
  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 text-gray-400">
            <th className="text-left p-4">{t("aiUsage.colFeature")}</th>
            <th className="text-right p-4">{t("aiUsage.colCredits")}</th>
            <th className="text-right p-4">{t("aiUsage.colTransactions")}</th>
            <th className="text-right p-4">{t("aiUsage.colUsers")}</th>
            <th className="text-right p-4">{t("aiUsage.colAvgPerUse")}</th>
            <th className="text-right p-4">{t("aiUsage.colRate")}</th>
          </tr>
        </thead>
        <tbody>
          {features.map((f) => (
            <tr
              key={f.feature}
              className="border-b border-white/5 hover:bg-white/5 transition-colors"
            >
              <td className="p-4 text-white font-medium">{f.feature}</td>
              <td className="p-4 text-right text-white">
                {f.total_credits.toLocaleString()}
              </td>
              <td className="p-4 text-right text-gray-300">
                {f.transaction_count.toLocaleString()}
              </td>
              <td className="p-4 text-right text-gray-300">{f.unique_users}</td>
              <td className="p-4 text-right text-gray-300">
                {f.avg_credits_per_use.toFixed(1)}
              </td>
              <td className="p-4 text-right text-purple-400">{f.credit_rate}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
