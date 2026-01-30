// Cost Dashboard API service integration

import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api/v1";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const authData = JSON.parse(localStorage.getItem("bayit-auth") || "{}");
  if (authData?.state?.token) {
    config.headers.Authorization = `Bearer ${authData.state.token}`;
  }
  return config;
});

// Response interceptor
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("bayit-auth");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

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
    granularity: "hourly" | "daily" | "monthly";
    startDate: string;
    endDate: string;
    userId?: string;
  }) {
    const query = new URLSearchParams({
      scope: params.scope,
      granularity: params.granularity,
      start_date: params.startDate,
      end_date: params.endDate,
      ...(params.userId && { user_id: params.userId }),
    });

    return api.get(`/admin/costs/timeline?${query.toString()}`);
  },

  async getBreakdown(params: {
    period: "month" | "year";
    scope: "system_wide" | "per_user";
    userId?: string;
  }) {
    const query = new URLSearchParams({
      period: params.period,
      scope: params.scope,
      ...(params.userId && { user_id: params.userId }),
    });

    return api.get(`/admin/costs/breakdown?${query.toString()}`);
  },

  async getBalanceSheet(params: {
    period: "month" | "year";
    scope: "system_wide" | "per_user";
    userId?: string;
  }) {
    const query = new URLSearchParams({
      period: params.period,
      scope: params.scope,
      ...(params.userId && { user_id: params.userId }),
    });

    return api.get(`/admin/costs/balance-sheet?${query.toString()}`);
  },

  async getPerMinute(params: {
    period: "today" | "month";
    scope: "system_wide" | "per_user";
    userId?: string;
  }) {
    const query = new URLSearchParams({
      period: params.period,
      scope: params.scope,
      ...(params.userId && { user_id: params.userId }),
    });

    return api.get(`/admin/costs/per-minute?${query.toString()}`);
  },

  async getTopSpenders(params: { period: string; limit?: number }) {
    const query = new URLSearchParams({
      period: params.period,
      ...(params.limit && { limit: params.limit.toString() }),
    });

    return api.get(`/admin/costs/users/top-spenders?${query.toString()}`);
  },

  async getComparison(params: {
    period: string;
    scope: "system_wide" | "per_user";
    userId?: string;
  }) {
    const query = new URLSearchParams({
      period: params.period,
      scope: params.scope,
      ...(params.userId && { user_id: params.userId }),
    });

    return api.get(`/admin/costs/comparison?${query.toString()}`);
  },

  async getUserBreakdown(userId: string) {
    return api.get(`/admin/costs/users/${userId}/breakdown`);
  },
};
