import React from 'react';
import type {
  DailyFlowProgression,
  MonthlyFlowProgression,
} from '../../services/investigationService';

function formatStatusLabel(status: string): string {
  return status.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

function StatusChips({ byStatus }: { byStatus: Record<string, number> }) {
  const entries = Object.entries(byStatus).sort(([a], [b]) => a.localeCompare(b));
  if (entries.length === 0) {
    return <div className="text-sm text-gray-500">No status data available</div>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {entries.map(([status, count]) => (
        <div
          key={status}
          className="px-2 py-1 rounded bg-gray-100 text-gray-800 text-xs font-medium"
        >
          {formatStatusLabel(status)}: {count}
        </div>
      ))}
    </div>
  );
}

export function FlowProgressionPanels(props: {
  daily: DailyFlowProgression | null;
  monthly: MonthlyFlowProgression | null;
  loading: boolean;
  error: string | null;
}) {
  const { daily, monthly, loading, error } = props;

  // #region agent log
  React.useEffect(() => {
    fetch('http://127.0.0.1:7242/ingest/06c5fffe-6ae5-4788-a989-0bf06eb0cb8b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'FlowProgressionPanels.tsx:42',message:'Component rendered with props',data:{hasDaily:!!daily,hasMonthly:!!monthly,loading,error,dailyTotal:daily?.total,monthlyTotal:monthly?.total},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4'})}).catch(()=>{});
  }, [daily, monthly, loading, error]);
  // #endregion

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-gray-900">Daily Flow Progression</h2>
        </div>
        {loading ? (
          <div className="text-sm text-gray-600">Loading daily progression…</div>
        ) : error ? (
          <div className="text-sm text-red-700">{error}</div>
        ) : !daily ? (
          <div className="text-sm text-gray-600">No data available for the selected day.</div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm text-gray-600">
              Date (UTC): <span className="font-medium text-gray-900">{daily.date}</span> • Total:{" "}
              <span className="font-medium text-gray-900">{daily.total}</span>
            </div>
            <StatusChips byStatus={daily.statusCounts.byStatus} />
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-gray-900">Monthly Flow Progression</h2>
        </div>
        {loading ? (
          <div className="text-sm text-gray-600">Loading monthly progression…</div>
        ) : error ? (
          <div className="text-sm text-red-700">{error}</div>
        ) : !monthly ? (
          <div className="text-sm text-gray-600">No data available for the selected month.</div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm text-gray-600">
              Month (UTC):{" "}
              <span className="font-medium text-gray-900">
                {monthly.year}-{String(monthly.month).padStart(2, '0')}
              </span>{" "}
              • Total: <span className="font-medium text-gray-900">{monthly.total}</span>
            </div>
            <StatusChips byStatus={monthly.statusCounts.byStatus} />

            <div className="pt-2">
              <div className="text-sm font-semibold text-gray-900 mb-2">By Day</div>
              {monthly.byDay.length === 0 ? (
                <div className="text-sm text-gray-600">No daily breakdown available.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 pr-4 text-gray-600 font-medium">Date</th>
                        <th className="text-right py-2 pr-4 text-gray-600 font-medium">Total</th>
                        <th className="text-left py-2 text-gray-600 font-medium">Statuses</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthly.byDay.map((d) => (
                        <tr key={d.date} className="border-b border-gray-100">
                          <td className="py-2 pr-4 text-gray-900">{d.date}</td>
                          <td className="py-2 pr-4 text-right text-gray-900">{d.total}</td>
                          <td className="py-2">
                            <StatusChips byStatus={d.statusCounts.byStatus} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


