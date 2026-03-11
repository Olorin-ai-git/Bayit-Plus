/**
 * Household Service
 *
 * API client for household management endpoints.
 */

import { api } from "@bayit/shared-services/api";
import type { Household } from "@/stores/householdStore";

export const householdService = {
  get: (): Promise<Household> => api.get("/household"),

  create: (data: { name: string }): Promise<Household> =>
    api.post("/household/create", data),

  update: (data: { name: string }): Promise<Household> =>
    api.patch("/household", data),

  remove: (): Promise<void> => api.delete("/household"),

  invite: (data: {
    email: string;
    role: "guardian" | "child";
  }): Promise<void> => api.post("/household/invite", data),

  removeMember: (userId: string): Promise<void> =>
    api.delete(`/household/members/${userId}`),
};
