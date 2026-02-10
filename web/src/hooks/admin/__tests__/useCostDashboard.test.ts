import { renderHook, act } from '@testing-library/react';
import { useCostDashboard } from '../useCostDashboard';

describe('useCostDashboard', () => {
  it('initializes with default state', () => {
    const { result } = renderHook(() => useCostDashboard());

    expect(result.current.scope).toBe('system_wide');
    expect(result.current.selectedUserId).toBeUndefined();
    expect(result.current.activeTab).toBe('overview');
  });

  it('updates scope when setScope is called', () => {
    const { result } = renderHook(() => useCostDashboard());

    act(() => {
      result.current.setScope('per_user');
    });

    expect(result.current.scope).toBe('per_user');
  });

  it('updates selected user when setScope is called with userId', () => {
    const { result } = renderHook(() => useCostDashboard());

    act(() => {
      result.current.setScope('per_user', 'user-123');
    });

    expect(result.current.selectedUserId).toBe('user-123');
  });

  it('updates active tab when setActiveTab is called', () => {
    const { result } = renderHook(() => useCostDashboard());

    act(() => {
      result.current.setActiveTab('timeline');
    });

    expect(result.current.activeTab).toBe('timeline');
  });

  it('has correct initial loading state', () => {
    const { result } = renderHook(() => useCostDashboard());

    expect(result.current.loading).toEqual({
      overview: true,
      breakdown: true,
      timeline: true,
      topSpenders: true,
    });
  });

  it('has correct initial error state', () => {
    const { result } = renderHook(() => useCostDashboard());

    expect(result.current.errors).toEqual({
      overview: null,
      breakdown: null,
      timeline: null,
      topSpenders: null,
    });
  });

  it('has correct initial data structure', () => {
    const { result } = renderHook(() => useCostDashboard());

    expect(result.current.data).toHaveProperty('revenue');
    expect(result.current.data).toHaveProperty('totalCost');
    expect(result.current.data).toHaveProperty('profitLoss');
    expect(result.current.data).toHaveProperty('profitMargin');
    expect(result.current.data).toHaveProperty('breakdown');
  });

  it('updates scope with user ID when setScope includes userId', () => {
    const { result } = renderHook(() => useCostDashboard());

    act(() => {
      result.current.setScope('per_user', 'user-456');
    });

    expect(result.current.scope).toBe('per_user');
    expect(result.current.selectedUserId).toBe('user-456');
  });

  it('maintains dateRange property', () => {
    const { result } = renderHook(() => useCostDashboard());

    expect(result.current.dateRange).toHaveProperty('start');
    expect(result.current.dateRange).toHaveProperty('end');
  });

  it('has breakdown property with expected cost categories', () => {
    const { result } = renderHook(() => useCostDashboard());

    expect(result.current.data.breakdown).toHaveProperty('ai_cost');
    expect(result.current.data.breakdown).toHaveProperty('infrastructure_cost');
    expect(result.current.data.breakdown).toHaveProperty('thirdparty_cost');
  });

  it('has additional metrics properties', () => {
    const { result } = renderHook(() => useCostDashboard());

    expect(result.current.data).toHaveProperty('costPerMinute');
    expect(result.current.data).toHaveProperty('monthlyRate');
    expect(result.current.data).toHaveProperty('ytdCost');
    expect(result.current.data).toHaveProperty('ytdRevenue');
  });
});
