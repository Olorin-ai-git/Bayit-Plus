// AI Usage Analytics API service integration

import api from "../api";

export const aiUsageService = {
  async getOverview(startDate: string, endDate: string) {
    const query = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
    });
    return api.get(`/admin/ai-usage/overview?${query.toString()}`);
  },

  async getFeatureTimeline(
    feature: string,
    startDate: string,
    endDate: string,
  ) {
    const query = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
    });
    return api.get(
      `/admin/ai-usage/feature/${feature}/timeline?${query.toString()}`,
    );
  },

  async getTopUsers(startDate: string, endDate: string, limit?: number) {
    const query = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
      ...(limit && { limit: limit.toString() }),
    });
    return api.get(`/admin/ai-usage/top-users?${query.toString()}`);
  },

  async getRates() {
    return api.get("/admin/ai-usage/rates");
  },
};
