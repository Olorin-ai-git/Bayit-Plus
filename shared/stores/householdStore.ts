/**
 * Household Store - Shared household management state
 *
 * Manages household creation, member management, invitations, and shared family controls.
 * Shared across web, mobile, and tvOS platforms.
 */

import { create } from 'zustand';

export enum HouseholdRole {
  PARENT = 'PARENT',
  CHILD = 'CHILD',
  GUARDIAN = 'GUARDIAN',
}

export interface HouseholdMember {
  user_id: string;
  role: HouseholdRole;
  joined_at: string;
  invited_by?: string;
}

export interface PendingInvitation {
  invitation_id: string;
  email: string;
  role: HouseholdRole;
  invited_by: string;
  invited_at: string;
  expires_at: string;
}

export interface Household {
  household_id: string;
  name: string;
  owner_id: string;
  members: HouseholdMember[];
  shared_controls_id?: string;
  pending_invitations: PendingInvitation[];
  created_at: string;
  updated_at: string;
}

interface HouseholdStore {
  household: Household | null;
  loading: boolean;
  error: string | null;

  loadHousehold: () => Promise<void>;
  createHousehold: (name: string) => Promise<void>;
  inviteMember: (email: string, role: HouseholdRole) => Promise<void>;
  removeMember: (userId: string) => Promise<void>;
  updateHouseholdName: (name: string) => Promise<void>;
  deleteHousehold: () => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

export const useHouseholdStore = create<HouseholdStore>((set, get) => ({
  household: null,
  loading: false,
  error: null,

  loadHousehold: async () => {
    set({ loading: true, error: null });
    try {
      const { getHousehold } = await import('../services/householdApi');
      const household = await getHousehold();
      set({ household, loading: false });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to load household',
        loading: false
      });
    }
  },

  createHousehold: async (name: string) => {
    set({ loading: true, error: null });
    try {
      const { createHousehold } = await import('../services/householdApi');
      const household = await createHousehold(name);
      set({ household, loading: false });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to create household',
        loading: false
      });
      throw error;
    }
  },

  inviteMember: async (email: string, role: HouseholdRole) => {
    const { household } = get();
    if (!household) {
      throw new Error('No household found');
    }

    set({ loading: true, error: null });
    try {
      const { inviteHouseholdMember } = await import('../services/householdApi');
      await inviteHouseholdMember(household.household_id, email, role);
      await get().loadHousehold();
    } catch (error: any) {
      set({
        error: error.message || 'Failed to send invitation',
        loading: false
      });
      throw error;
    }
  },

  removeMember: async (userId: string) => {
    const { household } = get();
    if (!household) {
      throw new Error('No household found');
    }

    set({ loading: true, error: null });
    try {
      const { removeHouseholdMember } = await import('../services/householdApi');
      await removeHouseholdMember(household.household_id, userId);
      await get().loadHousehold();
    } catch (error: any) {
      set({
        error: error.message || 'Failed to remove member',
        loading: false
      });
      throw error;
    }
  },

  updateHouseholdName: async (name: string) => {
    const { household } = get();
    if (!household) {
      throw new Error('No household found');
    }

    set({ loading: true, error: null });
    try {
      const { updateHousehold } = await import('../services/householdApi');
      const updated = await updateHousehold(household.household_id, name);
      set({ household: updated, loading: false });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to update household',
        loading: false
      });
      throw error;
    }
  },

  deleteHousehold: async () => {
    const { household } = get();
    if (!household) {
      throw new Error('No household found');
    }

    set({ loading: true, error: null });
    try {
      const { deleteHousehold } = await import('../services/householdApi');
      await deleteHousehold(household.household_id);
      set({ household: null, loading: false });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to delete household',
        loading: false
      });
      throw error;
    }
  },

  clearError: () => set({ error: null }),

  reset: () => set({
    household: null,
    loading: false,
    error: null,
  }),
}));
