// Credit rates table for AI usage analytics

import type { TFunction } from "i18next";

interface RateEntry {
  feature: string;
  credit_rate: number;
}

interface Props {
  rates: RateEntry[];
  t: TFunction;
}

export default function RatesTab({ rates, t }: Props) {
  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 text-gray-400">
            <th className="text-left p-4">{t("aiUsage.colFeature")}</th>
            <th className="text-right p-4">{t("aiUsage.colCreditRate")}</th>
          </tr>
        </thead>
        <tbody>
          {rates.map((r) => (
            <tr
              key={r.feature}
              className="border-b border-white/5 hover:bg-white/5 transition-colors"
            >
              <td className="p-4 text-white">{r.feature}</td>
              <td className="p-4 text-right text-purple-400">{r.credit_rate}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
