/**
 * ProfileContext - Global profile management for multi-user profiles
 * Handles profile selection, switching, and per-profile preferences
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { profilesService } from '../services/api';
import { useAuthStore } from '../stores/authStore';

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  avatar?: string;
  avatar_color: string;
  is_kids_profile: boolean;
  kids_age_limit?: number;
  has_pin: boolean;
  preferences: {
    language: string;
    subtitles_enabled: boolean;
    nikud_enabled: boolean;
    autoplay_next: boolean;
    subtitle_language: string;
    [key: string]: any;
  };
  favorite_categories: string[];
  created_at: string;
  last_used_at?: string;
}

interface ProfileState {
  profiles: Profile[];
  activeProfile: Profile | null;
  isLoading: boolean;
  error: string | null;
  needsProfileSelection: boolean;
}

interface ProfileStore extends ProfileState {
  fetchProfiles: () => Promise<void>;
  selectProfile: (profileId: string, pin?: string) => Promise<void>;
  createProfile: (data: {
    name: string;
    avatar?: string;
    avatar_color?: string;
    is_kids_profile?: boolean;
    kids_age_limit?: number;
    pin?: string;
  }) => Promise<Profile>;
  updateProfile: (profileId: string, data: Partial<Profile>) => Promise<void>;
  deleteProfile: (profileId: string) => Promise<void>;
  setNeedsProfileSelection: (needs: boolean) => void;
  clearProfiles: () => void;
  isKidsMode: () => boolean;
}

export const useProfileStore = create<ProfileStore>()(
  persist(
    (set, get) => ({
      profiles: [],
      activeProfile: null,
      isLoading: false,
      error: null,
      needsProfileSelection: false,

      fetchProfiles: async () => {
        set({ isLoading: true, error: null });
        try {
          const profiles: Profile[] = await profilesService.getProfiles();
          const needsSelection = profiles.length > 1 && !get().activeProfile;
          set({
            profiles,
            isLoading: false,
            needsProfileSelection: needsSelection,
          });

          // If only one profile, auto-select it
          if (profiles.length === 1 && !get().activeProfile) {
            const profile = profiles[0];
            if (!profile.has_pin) {
              set({ activeProfile: profile, needsProfileSelection: false });
            }
          }
        } catch (error: any) {
          set({
            error: error.detail || 'Failed to fetch profiles',
            isLoading: false,
          });
        }
      },

      selectProfile: async (profileId: string, pin?: string) => {
        set({ isLoading: true, error: null });
        try {
          const profile: Profile = await profilesService.selectProfile(profileId, pin);
          set({
            activeProfile: profile,
            isLoading: false,
            needsProfileSelection: false,
          });
        } catch (error: any) {
          set({
            error: error.detail || 'Failed to select profile',
            isLoading: false,
          });
          throw error;
        }
      },

      createProfile: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const newProfile: Profile = await profilesService.createProfile(data);
          set(state => ({
            profiles: [...state.profiles, newProfile],
            isLoading: false,
          }));
          return newProfile;
        } catch (error: any) {
          set({
            error: error.detail || 'Failed to create profile',
            isLoading: false,
          });
          throw error;
        }
      },

      updateProfile: async (profileId: string, data) => {
        set({ isLoading: true, error: null });
        try {
          const updatedProfile: Profile = await profilesService.updateProfile(profileId, data);
          set(state => ({
            profiles: state.profiles.map(p =>
              p.id === profileId ? updatedProfile : p
            ),
            activeProfile: state.activeProfile?.id === profileId
              ? updatedProfile
              : state.activeProfile,
            isLoading: false,
          }));
        } catch (error: any) {
          set({
            error: error.detail || 'Failed to update profile',
            isLoading: false,
          });
          throw error;
        }
      },

      deleteProfile: async (profileId: string) => {
        set({ isLoading: true, error: null });
        try {
          await profilesService.deleteProfile(profileId);
          const remainingProfiles = get().profiles.filter(p => p.id !== profileId);

          // If deleted the active profile, need to select another
          let newActiveProfile = get().activeProfile;
          let needsSelection = false;
          if (get().activeProfile?.id === profileId) {
            newActiveProfile = remainingProfiles.length === 1 ? remainingProfiles[0] : null;
            needsSelection = remainingProfiles.length > 1;
          }

          set({
            profiles: remainingProfiles,
            activeProfile: newActiveProfile,
            needsProfileSelection: needsSelection,
            isLoading: false,
          });
        } catch (error: any) {
          set({
            error: error.detail || 'Failed to delete profile',
            isLoading: false,
          });
          throw error;
        }
      },

      setNeedsProfileSelection: (needs: boolean) => {
        set({ needsProfileSelection: needs });
      },

      clearProfiles: () => {
        set({
          profiles: [],
          activeProfile: null,
          needsProfileSelection: false,
          error: null,
        });
      },

      isKidsMode: () => {
        return get().activeProfile?.is_kids_profile ?? false;
      },
    }),
    {
      name: 'bayit-profiles',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        activeProfile: state.activeProfile,
      }),
    }
  )
);

// Context for React components
interface ProfileContextValue {
  profiles: Profile[];
  activeProfile: Profile | null;
  isLoading: boolean;
  error: string | null;
  needsProfileSelection: boolean;
  isKidsMode: boolean;
  fetchProfiles: () => Promise<void>;
  selectProfile: (profileId: string, pin?: string) => Promise<void>;
  createProfile: (data: {
    name: string;
    avatar?: string;
    avatar_color?: string;
    is_kids_profile?: boolean;
    kids_age_limit?: number;
    pin?: string;
  }) => Promise<Profile>;
  updateProfile: (profileId: string, data: Partial<Profile>) => Promise<void>;
  deleteProfile: (profileId: string) => Promise<void>;
  switchProfile: () => void;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export const ProfileProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  const store = useProfileStore();

  // Fetch profiles when user logs in
  useEffect(() => {
    if (isAuthenticated && user) {
      store.fetchProfiles();
    } else {
      store.clearProfiles();
    }
  }, [isAuthenticated, user?.id]);

  const switchProfile = useCallback(() => {
    store.setNeedsProfileSelection(true);
  }, []);

  const value: ProfileContextValue = {
    profiles: store.profiles,
    activeProfile: store.activeProfile,
    isLoading: store.isLoading,
    error: store.error,
    needsProfileSelection: store.needsProfileSelection,
    isKidsMode: store.isKidsMode(),
    fetchProfiles: store.fetchProfiles,
    selectProfile: store.selectProfile,
    createProfile: store.createProfile,
    updateProfile: store.updateProfile,
    deleteProfile: store.deleteProfile,
    switchProfile,
  };

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = (): ProfileContextValue => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};

export default ProfileContext;
