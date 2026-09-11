// Cost Dashboard API service integration

import api from "../api";

interface CostOverviewParams {
  scope: "system_wide" | "per_user";
  userId?: string;
}

interface CostTimelineParams {
  scope: "system_wide" | "per_user";
  userId?: string;
  granularity?: "hourly" | "daily" | "monthly";
  startDate?: string;
  endDate?: string;
}

export const costDashboardService = {
  async getOverview(scope: "system_wide" | "per_user", userId?: string) {
    const query = new URLSearchParams({
      scope,
      ...(userId && { user_id: userId }),
    });

    return api.get(`/admin/costs/overview?${query.toString()}`);
  },

  async getTimeline(params: {
    scope: "system_wide" | "per_user";
    granularity?: "hourly" | "daily" | "monthly";
    startDate: string;
    endDate: string;
    userId?: string;
  }) {
    const query = new URLSearchParams({
      scope: params.scope,
      ...(params.granularity && { granularity: params.granularity }),
      start_date: params.startDate,
      end_date: params.endDate,
      ...(params.userId && { user_id: params.userId }),
    });

    return api.get(`/admin/costs/timeline?${query.toString()}`);
  },

  async getBreakdown(params: {
    period?: "month" | "year";
    startDate?: string;
    endDate?: string;
    scope: "system_wide" | "per_user";
    userId?: string;
  }) {
    const query = new URLSearchParams({
      ...(params.period && { period: params.period }),
      ...(params.startDate && { start_date: params.startDate }),
      ...(params.endDate && { end_date: params.endDate }),
      scope: params.scope,
      ...(params.userId && { user_id: params.userId }),
    });

    return api.get(`/admin/costs/breakdown?${query.toString()}`);
  },

  async getBalanceSheet(params: {
    period?: "month" | "year";
    startDate?: string;
    endDate?: string;
    scope: "system_wide" | "per_user";
    userId?: string;
  }) {
    const query = new URLSearchParams({
      ...(params.period && { period: params.period }),
      ...(params.startDate && { start_date: params.startDate }),
      ...(params.endDate && { end_date: params.endDate }),
      scope: params.scope,
      ...(params.userId && { user_id: params.userId }),
    });

    return api.get(`/admin/costs/balance-sheet?${query.toString()}`);
  },

  async getPerMinute(params: {
    period: "today" | "month";
    startDate?: string;
    endDate?: string;
    scope: "system_wide" | "per_user";
    userId?: string;
  }) {
    const query = new URLSearchParams({
      ...(params.period && { period: params.period }),
      ...(params.startDate && { start_date: params.startDate }),
      ...(params.endDate && { end_date: params.endDate }),
      scope: params.scope,
      ...(params.userId && { user_id: params.userId }),
    });

    return api.get(`/admin/costs/per-minute?${query.toString()}`);
  },

  async getTopSpenders(params: { period?: string; limit?: number }) {
    const query = new URLSearchParams({
      ...(params.period && { period: params.period }),
      ...(params.limit && { limit: params.limit.toString() }),
    });

    return api.get(`/admin/costs/users/top-spenders?${query.toString()}`);
  },

  async getComparison(params: {
    period: string;
    startDate?: string;
    endDate?: string;
    scope: "system_wide" | "per_user";
    userId?: string;
  }) {
    const query = new URLSearchParams({
      ...(params.period && { period: params.period }),
      ...(params.startDate && { start_date: params.startDate }),
      ...(params.endDate && { end_date: params.endDate }),
      scope: params.scope,
      ...(params.userId && { user_id: params.userId }),
    });

    return api.get(`/admin/costs/comparison?${query.toString()}`);
  },

  async getUserBreakdown(userId: string, dates?: { startDate: string; endDate: string }) {
    return api.get(`/admin/costs/users/${encodeURIComponent(userId)}/breakdown`, dates ? { params: { start_date: dates.startDate, end_date: dates.endDate } } : undefined);
  },
};
