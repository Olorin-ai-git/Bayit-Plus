import { useState, useCallback, useEffect, useRef } from 'react';
import { costDashboardService } from '@/services/adminApi/costDashboard';
import { costOverviewSchema, costTimelineSchema, costBreakdownSchema, userCostSchema, topSpendersSchema, type CostOverview, type CostTimeline, type CostBreakdown, type TopSpenders } from '@/services/adminApi/costData';
import i18n from 'i18next';

export type CostScope = 'system_wide' | 'per_user';
export type CostTab = 'overview' | 'timeline' | 'categories' | 'spenders';
type Dataset = 'overview' | 'timeline' | 'breakdown' | 'balanceSheet' | 'topSpenders';
const emptyData = () => ({ overview: null as CostOverview | null, timeline: null as CostTimeline | null, breakdown: null as CostBreakdown | null, balanceSheet: null, topSpenders: null as TopSpenders | null });
const emptyFlags = <T,>(value: T): Record<Dataset, T> => ({ overview: value, timeline: value, breakdown: value, balanceSheet: value, topSpenders: value });

export const useCostDashboard = () => {
  const [scope, updateScope] = useState<CostScope>('system_wide');
  const [selectedUserId, setSelectedUserId] = useState<string>();
  const [activeTab, setActiveTab] = useState<CostTab>('overview');
  const [dateRange, setDateRange] = useState(() => ({ start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), end: new Date() }));
  const [revision, setRevision] = useState(0);
  const key = JSON.stringify([scope, selectedUserId, dateRange.start.toISOString(), dateRange.end.toISOString(), revision]);
  const [state, setState] = useState(() => ({ key, data: emptyData(), loading: emptyFlags(false), errors: emptyFlags<string | null>(null) }));
  const generation = useRef(0);
  const setScope = useCallback((nextScope: CostScope, userId?: string) => { updateScope(nextScope); setSelectedUserId(userId); }, []);
  const refresh = useCallback(() => setRevision(value => value + 1), []);

  useEffect(() => {
    const current = ++generation.current;
    const dates = { startDate: dateRange.start.toISOString(), endDate: dateRange.end.toISOString() };
    setState({ key, data: emptyData(), loading: emptyFlags(false), errors: emptyFlags(null) });
    const request = async (name: Dataset, load: () => Promise<unknown>) => {
      setState(previous => ({ ...previous, loading: { ...previous.loading, [name]: true } }));
      try {
        const data = await load();
        if (generation.current === current) setState(previous => ({ ...previous, data: { ...previous.data, [name]: data } }));
      } catch (error) {
        if (generation.current === current) setState(previous => ({ ...previous, errors: { ...previous.errors, [name]: error instanceof Error ? error.message : i18n.t('common.error') } }));
      } finally {
        if (generation.current === current) setState(previous => ({ ...previous, loading: { ...previous.loading, [name]: false } }));
      }
    };
    if (scope === 'system_wide') {
      void request('overview', async () => costOverviewSchema.parse(await costDashboardService.getOverview(scope)));
      void request('timeline', async () => costTimelineSchema.parse(await costDashboardService.getTimeline({ scope, ...dates })));
      void request('breakdown', async () => costBreakdownSchema.parse(await costDashboardService.getBreakdown({ scope, ...dates })));
    } else if (selectedUserId) {
      void request('breakdown', async () => {
        const user = userCostSchema.parse(await costDashboardService.getUserBreakdown(selectedUserId, dates));
        return { ai_costs: user.ai_costs, infrastructure_costs: null, thirdparty_costs: null, total_permanent: null, total_transient: null, total_platform: user.total_cost };
      });
    }
    return () => { generation.current++; };
  }, [key]);

  useEffect(() => {
    if (activeTab !== 'spenders' || scope !== 'system_wide' || state.key !== key || state.data.topSpenders) return;
    let active = true;
    setState(previous => ({ ...previous, loading: { ...previous.loading, topSpenders: true }, errors: { ...previous.errors, topSpenders: null } }));
    // The endpoint defines its reporting period and page limit when omitted.
    costDashboardService.getTopSpenders({}).then(topSpendersSchema.parse).then(data => {
      if (active) setState(previous => ({ ...previous, data: { ...previous.data, topSpenders: data } }));
    }).catch(error => {
      if (active) setState(previous => ({ ...previous, errors: { ...previous.errors, topSpenders: error instanceof Error ? error.message : i18n.t('common.error') } }));
    }).finally(() => {
      if (active) setState(previous => ({ ...previous, loading: { ...previous.loading, topSpenders: false } }));
    });
    return () => { active = false; };
  }, [activeTab, key, state.key]);

  const visible = state.key === key ? state : { data: emptyData(), loading: emptyFlags(false), errors: emptyFlags(null) };
  return { scope, selectedUserId, activeTab, dateRange, ...visible, setScope, setDateRange, setActiveTab, refresh, fetchOverview: refresh, fetchTimeline: refresh };
};
