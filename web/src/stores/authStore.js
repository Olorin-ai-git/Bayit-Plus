import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authService } from '@/services/api'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      isHydrated: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      login: async (email, password) => {
        set({ isLoading: true, error: null })
        try {
          const response = await authService.login(email, password)

          // Update state
          set({
            user: response.user,
            token: response.token,
            isAuthenticated: true,
            isLoading: false,
          })

          // CRITICAL: Manually write to localStorage immediately to prevent race condition
          // This ensures the token is available before any API calls
          // Match zustand persist structure exactly
          const authData = {
            state: {
              user: response.user,
              token: response.token,
              isAuthenticated: true,
            },
            version: 0,
          }
          localStorage.setItem('bayit-auth', JSON.stringify(authData))
          console.log('[Auth] Login - Token saved to localStorage:', response.token?.substring(0, 20) + '...')

          return response
        } catch (error) {
          set({ error: error.message, isLoading: false })
          throw error
        }
      },

      register: async (userData) => {
        set({ isLoading: true, error: null })
        try {
          const response = await authService.register(userData)

          // Update state
          set({
            user: response.user,
            token: response.token,
            isAuthenticated: true,
            isLoading: false,
          })

          // CRITICAL: Manually write to localStorage immediately to prevent race condition
          // This ensures the token is available before any API calls
          // Match zustand persist structure exactly
          const authData = {
            state: {
              user: response.user,
              token: response.token,
              isAuthenticated: true,
            },
            version: 0,
          }
          localStorage.setItem('bayit-auth', JSON.stringify(authData))
          console.log('[Auth] Register - Token saved to localStorage:', response.token?.substring(0, 20) + '...')

          return response
        } catch (error) {
          set({ error: error.message, isLoading: false })
          throw error
        }
      },

      loginWithGoogle: async () => {
        set({ isLoading: true, error: null })
        try {
          // Build redirect URI dynamically based on current origin
          const redirectUri = `${window.location.origin}/auth/google/callback`
          console.log('[Auth] Starting Google login with redirect URI:', redirectUri)
          const response = await authService.getGoogleAuthUrl(redirectUri)
          console.log('[Auth] Got Google auth URL:', response.url)
          console.log('[Auth] Redirecting to Google...')
          window.location.href = response.url
        } catch (error) {
          console.error('[Auth] Error getting Google auth URL:', error)
          set({ error: error.message, isLoading: false })
          throw error
        }
      },

      handleGoogleCallback: async (code) => {
        set({ isLoading: true, error: null })
        try {
          // Build redirect URI dynamically based on current origin
          const redirectUri = `${window.location.origin}/auth/google/callback`
          const response = await authService.googleCallback(code, redirectUri)

          // Update state
          set({
            user: response.user,
            token: response.access_token,
            isAuthenticated: true,
            isLoading: false,
          })

          // CRITICAL: Manually write to localStorage immediately to prevent race condition
          // This ensures the token is available before navigation happens
          // Match zustand persist structure exactly
          const authData = {
            state: {
              user: response.user,
              token: response.access_token,
              isAuthenticated: true,
            },
            version: 0,
          }
          localStorage.setItem('bayit-auth', JSON.stringify(authData))
          console.log('[Auth] Token saved to localStorage:', response.access_token?.substring(0, 20) + '...')

          return response
        } catch (error) {
          set({ error: error.message, isLoading: false })
          throw error
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        })
      },

      updateProfile: async (updates) => {
        set({ isLoading: true, error: null })
        try {
          const response = await authService.updateProfile(updates)
          set({ user: response.user, isLoading: false })
          return response
        } catch (error) {
          set({ error: error.message, isLoading: false })
          throw error
        }
      },

      // RBAC helper - check if user has admin role
      isAdmin: () => {
        const { user } = get()
        if (!user) return false
        const adminRoles = ['super_admin', 'admin', 'content_manager', 'billing_admin', 'support']
        return adminRoles.includes(user.role)
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'bayit-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // Mark as hydrated after rehydration from localStorage
        if (state) {
          state.isHydrated = true;
        }
      },
    }
  )
)
