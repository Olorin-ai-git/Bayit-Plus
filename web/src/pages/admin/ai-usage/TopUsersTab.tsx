// Top users table for AI usage analytics

import type { TFunction } from "i18next";

interface TopUser {
  user_id_hash: string;
  total_credits: number;
  transaction_count: number;
  top_features: string[];
}

interface Props {
  users: TopUser[];
  t: TFunction;
}

export default function TopUsersTab({ users, t }: Props) {
  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 text-gray-400">
            <th className="text-left p-4">{t("aiUsage.colRank")}</th>
            <th className="text-left p-4">{t("aiUsage.colUserHash")}</th>
            <th className="text-right p-4">{t("aiUsage.colCredits")}</th>
            <th className="text-right p-4">{t("aiUsage.colTransactions")}</th>
            <th className="text-left p-4">{t("aiUsage.colTopFeatures")}</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user, idx) => (
            <tr
              key={user.user_id_hash}
              className="border-b border-white/5 hover:bg-white/5 transition-colors"
            >
              <td className="p-4 text-gray-400">{idx + 1}</td>
              <td className="p-4 text-white font-mono text-xs">
                {user.user_id_hash}
              </td>
              <td className="p-4 text-right text-white">
                {user.total_credits.toLocaleString()}
              </td>
              <td className="p-4 text-right text-gray-300">
                {user.transaction_count.toLocaleString()}
              </td>
              <td className="p-4 text-gray-300">
                {user.top_features.join(", ")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
