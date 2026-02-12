// Usage timeline table for AI usage analytics

import type { TFunction } from "i18next";
import { GlassSelect } from "@bayit/shared/ui";

interface TimelinePoint {
  date: string;
  credits_consumed: number;
  transaction_count: number;
}

interface FeatureOption {
  feature: string;
}

interface Props {
  timeline: TimelinePoint[];
  features: FeatureOption[];
  selectedFeature: string;
  onFeatureChange: (feature: string) => void;
  t: TFunction;
}

export default function TimelineTab({
  timeline,
  features,
  selectedFeature,
  onFeatureChange,
  t,
}: Props) {
  return (
    <div>
      {features.length > 0 && (
        <div className="mb-4">
          <GlassSelect
            label={t("aiUsage.selectFeature")}
            value={selectedFeature}
            onChange={onFeatureChange}
            options={features.map((f) => ({ value: f.feature, label: f.feature }))}
          />
        </div>
      )}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-gray-400">
              <th className="text-left p-4">{t("aiUsage.colDate")}</th>
              <th className="text-right p-4">{t("aiUsage.colCredits")}</th>
              <th className="text-right p-4">{t("aiUsage.colTransactions")}</th>
            </tr>
          </thead>
          <tbody>
            {timeline.map((point) => (
              <tr
                key={point.date}
                className="border-b border-white/5 hover:bg-white/5 transition-colors"
              >
                <td className="p-4 text-white">{point.date}</td>
                <td className="p-4 text-right text-white">
                  {point.credits_consumed.toLocaleString()}
                </td>
                <td className="p-4 text-right text-gray-300">
                  {point.transaction_count.toLocaleString()}
                </td>
              </tr>
            ))}
            {timeline.length === 0 && (
              <tr>
                <td colSpan={3} className="p-8 text-center text-gray-500">
                  {t("aiUsage.noData")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
