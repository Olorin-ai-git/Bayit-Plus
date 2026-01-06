import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { profilesService } from '@/services/api'
import { useAuthStore } from './authStore'

export const useProfileStore = create(
  persist(
    (set, get) => ({
      profiles: [],
      activeProfile: null,
      isLoading: false,
      error: null,
      needsProfileSelection: false,

      fetchProfiles: async () => {
        set({ isLoading: true, error: null })
        try {
          const profiles = await profilesService.getProfiles()
          const needsSelection = profiles.length > 1 && !get().activeProfile
          set({
            profiles,
            isLoading: false,
            needsProfileSelection: needsSelection,
          })

          // If only one profile, auto-select it
          if (profiles.length === 1 && !get().activeProfile) {
            const profile = profiles[0]
            if (!profile.has_pin) {
              set({ activeProfile: profile, needsProfileSelection: false })
            }
          }
        } catch (error) {
          set({
            error: error.detail || error.message || 'Failed to fetch profiles',
            isLoading: false,
          })
        }
      },

      selectProfile: async (profileId, pin) => {
        set({ isLoading: true, error: null })
        try {
          const profile = await profilesService.selectProfile(profileId, pin)
          set({
            activeProfile: profile,
            isLoading: false,
            needsProfileSelection: false,
          })
          return profile
        } catch (error) {
          set({
            error: error.detail || error.message || 'Failed to select profile',
            isLoading: false,
          })
          throw error
        }
      },

      createProfile: async (data) => {
        set({ isLoading: true, error: null })
        try {
          const newProfile = await profilesService.createProfile(data)
          set(state => ({
            profiles: [...state.profiles, newProfile],
            isLoading: false,
          }))
          return newProfile
        } catch (error) {
          set({
            error: error.detail || error.message || 'Failed to create profile',
            isLoading: false,
          })
          throw error
        }
      },

      updateProfile: async (profileId, data) => {
        set({ isLoading: true, error: null })
        try {
          const updatedProfile = await profilesService.updateProfile(profileId, data)
          set(state => ({
            profiles: state.profiles.map(p =>
              p.id === profileId ? updatedProfile : p
            ),
            activeProfile: state.activeProfile?.id === profileId
              ? updatedProfile
              : state.activeProfile,
            isLoading: false,
          }))
          return updatedProfile
        } catch (error) {
          set({
            error: error.detail || error.message || 'Failed to update profile',
            isLoading: false,
          })
          throw error
        }
      },

      deleteProfile: async (profileId) => {
        set({ isLoading: true, error: null })
        try {
          await profilesService.deleteProfile(profileId)
          const remainingProfiles = get().profiles.filter(p => p.id !== profileId)

          // If deleted the active profile, need to select another
          let newActiveProfile = get().activeProfile
          let needsSelection = false
          if (get().activeProfile?.id === profileId) {
            newActiveProfile = remainingProfiles.length === 1 ? remainingProfiles[0] : null
            needsSelection = remainingProfiles.length > 1
          }

          set({
            profiles: remainingProfiles,
            activeProfile: newActiveProfile,
            needsProfileSelection: needsSelection,
            isLoading: false,
          })
        } catch (error) {
          set({
            error: error.detail || error.message || 'Failed to delete profile',
            isLoading: false,
          })
          throw error
        }
      },

      setNeedsProfileSelection: (needs) => {
        set({ needsProfileSelection: needs })
      },

      switchProfile: () => {
        set({ needsProfileSelection: true })
      },

      clearProfiles: () => {
        set({
          profiles: [],
          activeProfile: null,
          needsProfileSelection: false,
          error: null,
        })
      },

      isKidsMode: () => {
        return get().activeProfile?.is_kids_profile ?? false
      },

      clearError: () => {
        set({ error: null })
      },
    }),
    {
      name: 'bayit-profiles',
      partialize: (state) => ({
        activeProfile: state.activeProfile,
      }),
    }
  )
)

// Hook to sync profile state with auth state
export const useProfileSync = () => {
  const { isAuthenticated, user } = useAuthStore()
  const { fetchProfiles, clearProfiles } = useProfileStore()

  // This should be called when auth state changes
  const syncProfiles = async () => {
    if (isAuthenticated && user) {
      await fetchProfiles()
    } else {
      clearProfiles()
    }
  }

  return { syncProfiles }
}
