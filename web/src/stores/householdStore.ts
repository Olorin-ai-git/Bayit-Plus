import { create } from "zustand";
import { householdService } from "@/services/api";
import logger from "@bayit/shared-utils/logger";

const householdLogger = logger.scope("HouseholdStore");

export interface HouseholdMember {
  user_id: string;
  display_name: string;
  email: string;
  role: "owner" | "guardian" | "child";
  avatar?: string;
  joined_at: string;
}

export interface PendingInvitation {
  id: string;
  email: string;
  role: "guardian" | "child";
  expires_at: string;
  created_at: string;
}

export interface Household {
  id: string;
  name: string;
  owner_id: string;
  members: HouseholdMember[];
  pending_invitations: PendingInvitation[];
  created_at: string;
}

interface HouseholdStoreState {
  household: Household | null;
  isLoading: boolean;
  error: string | null;
}

interface HouseholdStoreActions {
  fetchHousehold: () => Promise<void>;
  createHousehold: (name: string) => Promise<void>;
  updateHousehold: (name: string) => Promise<void>;
  deleteHousehold: () => Promise<void>;
  inviteMember: (email: string, role: "guardian" | "child") => Promise<void>;
  removeMember: (userId: string) => Promise<void>;
}

type HouseholdStore = HouseholdStoreState & HouseholdStoreActions;

export const useHouseholdStore = create<HouseholdStore>((set, get) => ({
  household: null,
  isLoading: false,
  error: null,

  fetchHousehold: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await householdService.get();
      set({ household: data, isLoading: false });
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;
      if (status === 404) {
        set({ household: null, isLoading: false });
      } else {
        householdLogger.error("Failed to fetch household", { err });
        set({ error: "household.error.fetchFailed", isLoading: false });
      }
    }
  },

  createHousehold: async (name) => {
    set({ isLoading: true, error: null });
    try {
      const data = await householdService.create({ name });
      set({ household: data, isLoading: false });
    } catch (err) {
      householdLogger.error("Failed to create household", { err });
      set({ error: "household.error.createFailed", isLoading: false });
    }
  },

  updateHousehold: async (name) => {
    try {
      const data = await householdService.update({ name });
      set({ household: data });
    } catch (err) {
      householdLogger.error("Failed to update household", { err });
      set({ error: "household.error.updateFailed" });
    }
  },

  deleteHousehold: async () => {
    try {
      await householdService.remove();
      set({ household: null });
    } catch (err) {
      householdLogger.error("Failed to delete household", { err });
      set({ error: "household.error.deleteFailed" });
    }
  },

  inviteMember: async (email, role) => {
    try {
      await householdService.invite({ email, role });
      await get().fetchHousehold();
    } catch (err) {
      householdLogger.error("Failed to invite member", { err });
      set({ error: "household.error.inviteFailed" });
    }
  },

  removeMember: async (userId) => {
    try {
      await householdService.removeMember(userId);
      await get().fetchHousehold();
    } catch (err) {
      householdLogger.error("Failed to remove member", { err });
      set({ error: "household.error.removeFailed" });
    }
  },
}));
