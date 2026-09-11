import { renderHook, act, waitFor } from '@testing-library/react';
import { useCostDashboard } from '../useCostDashboard';
import { costDashboardService as service } from '@/services/adminApi/costDashboard';

jest.mock('@/services/adminApi/costDashboard', () => ({ costDashboardService: { getOverview: jest.fn(), getTimeline: jest.fn(), getBreakdown: jest.fn(), getTopSpenders: jest.fn(), getUserBreakdown: jest.fn() } }));
const overview = { revenue: 15000, total_costs: 8500, profit_loss: 6500, profit_margin: 43.3, cost_per_minute: 0, last_updated: '2026-09-10T00:00:00Z' };
const breakdown = { ai_costs: { stt: '0' }, infrastructure_costs: { gcp: '12' }, thirdparty_costs: { stripe: '3' }, total_platform: 15, total_permanent: 12, total_transient: 3 };
beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(service.getOverview).mockResolvedValue(overview as never);
  jest.mocked(service.getTimeline).mockResolvedValue([] as never);
  jest.mocked(service.getBreakdown).mockResolvedValue(breakdown as never);
  jest.mocked(service.getUserBreakdown).mockResolvedValue({ ai_costs: { stt: '7' }, total_cost: 7 } as never);
  jest.mocked(service.getTopSpenders).mockResolvedValue({ spenders: [] } as never);
});
async function settledDashboard() {
  const hook = renderHook(() => useCostDashboard());
  await waitFor(() => expect(hook.result.current.loading.overview).toBe(false));
  return hook;
}
describe('useCostDashboard', () => {
  it('initializes with default state', async () => {
    const { result } = await settledDashboard();
    expect(result.current.scope).toBe('system_wide');
    expect(result.current.selectedUserId).toBeUndefined();
    expect(result.current.activeTab).toBe('overview');
  });
  it('updates scope when setScope is called', async () => {
    const { result } = await settledDashboard();
    act(() => result.current.setScope('per_user'));
    expect(result.current.scope).toBe('per_user');
    expect(result.current.data.overview).toBeNull();
  });
  it('updates selected user when setScope is called with userId', async () => {
    const { result } = await settledDashboard();
    await act(async () => result.current.setScope('per_user', 'user-123'));
    expect(result.current.selectedUserId).toBe('user-123');
    expect(service.getUserBreakdown).toHaveBeenCalledWith('user-123', expect.objectContaining({ startDate: expect.any(String), endDate: expect.any(String) }));
  });
  it('updates active tab when setActiveTab is called', async () => {
    const { result } = await settledDashboard();
    act(() => result.current.setActiveTab('timeline'));
    expect(result.current.activeTab).toBe('timeline');
  });
  it('marks only requested datasets loading initially', () => {
    jest.mocked(service.getOverview).mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useCostDashboard());
    expect(result.current.loading).toEqual({ overview: true, breakdown: true, timeline: true, balanceSheet: false, topSpenders: false });
  });
  it('has correct initial error state', async () => {
    const { result } = await settledDashboard();
    expect(result.current.errors).toEqual({ overview: null, breakdown: null, timeline: null, balanceSheet: null, topSpenders: null });
  });
  it('keeps API financial fields under overview', async () => {
    const { result } = await settledDashboard();
    expect(result.current.data.overview).toEqual(expect.objectContaining(overview));
    expect(result.current.data.timeline).toEqual([]);
  });
  it('updates scope with user ID when setScope includes userId', async () => {
    const { result } = await settledDashboard();
    await act(async () => result.current.setScope('per_user', 'user-456'));
    expect(result.current.scope).toBe('per_user');
    expect(result.current.selectedUserId).toBe('user-456');
    expect(result.current.data.overview).toBeNull();
    expect(result.current.data.breakdown?.total_platform).toBe(7);
    expect(service.getOverview).toHaveBeenCalledTimes(1);
  });
  it('maintains and forwards the supported date range', async () => {
    const { result } = await settledDashboard();
    expect(result.current.dateRange).toHaveProperty('start');
    expect(result.current.dateRange).toHaveProperty('end');
    expect(service.getTimeline).toHaveBeenCalledWith({ scope: 'system_wide', startDate: result.current.dateRange.start.toISOString(), endDate: result.current.dateRange.end.toISOString() });
  });
  it('parses the actual cost category dictionaries preserving zero', async () => {
    const { result } = await settledDashboard();
    expect(result.current.data.breakdown?.ai_costs).toEqual({ stt: 0 });
    expect(result.current.data.breakdown?.infrastructure_costs).toEqual({ gcp: 12 });
    expect(result.current.data.breakdown?.thirdparty_costs).toEqual({ stripe: 3 });
  });
  it('retains supplied cost-per-minute without inventing unavailable metrics', async () => {
    const { result } = await settledDashboard();
    expect(result.current.data.overview?.cost_per_minute).toBe(0);
    expect(result.current.data.overview).not.toHaveProperty('ytdRevenue');
    expect(result.current.data.overview).not.toHaveProperty('monthlyRate');
  });
  it('ignores a delayed system response after selecting a user', async () => {
    let resolveOverview!: (value: unknown) => void;
    jest.mocked(service.getOverview).mockReturnValue(new Promise(resolve => { resolveOverview = value => resolve(value as never); }));
    const { result } = renderHook(() => useCostDashboard());
    await act(async () => result.current.setScope('per_user', 'user-123'));
    await act(async () => resolveOverview(overview));
    expect(result.current.data.overview).toBeNull();
    expect(result.current.data.breakdown?.total_platform).toBe(7);
  });
  it('fetches privileged rankings only when their tab opens and reuses results', async () => {
    const { result } = await settledDashboard();
    expect(service.getTopSpenders).not.toHaveBeenCalled();
    await act(async () => result.current.setActiveTab('spenders'));
    expect(result.current.data.topSpenders).toEqual({ spenders: [] });
    act(() => result.current.setActiveTab('overview'));
    act(() => result.current.setActiveTab('spenders'));
    expect(service.getTopSpenders).toHaveBeenCalledTimes(1);
  });
  it('keeps failed financial data unknown and exposes the request error', async () => {
    jest.mocked(service.getOverview).mockRejectedValue(new Error('Unavailable'));
    const { result } = await settledDashboard();
    expect(result.current.data.overview).toBeNull();
    expect(result.current.errors.overview).toBe('Unavailable');
  });
});
