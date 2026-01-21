/**
 * CultureContext - Global culture selection and management
 *
 * Provides culture selection, cities loading, and time formatting
 * for the multi-cultural platform feature.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { cultureService } from '../services/api';

// Types
export interface Culture {
  id: string;
  culture_id: string;
  name: string;
  name_localized: Record<string, string>;
  flag_emoji: string;
  country_code: string;
  primary_timezone: string;
  primary_language: string;
  supported_languages?: string[];
  has_shabbat_mode: boolean;
  has_lunar_calendar: boolean;
  display_order: number;
  is_active: boolean;
  is_default: boolean;
  background_image_key?: string;
  accent_color?: string;
}

export interface CultureCity {
  id: string;
  city_id: string;
  culture_id: string;
  name: string;
  name_localized: Record<string, string>;
  name_native?: string;
  timezone: string;
  coordinates?: { lat: number; lng: number };
  categories?: CultureCityCategory[];
  display_order: number;
  is_active: boolean;
  is_featured: boolean;
  background_image_key?: string;
  thumbnail_image_key?: string;
  accent_color?: string;
}

export interface CultureCityCategory {
  id: string;
  name: string;
  name_localized: Record<string, string>;
  icon_emoji: string;
  display_order: number;
  is_active: boolean;
}

export interface CultureTime {
  culture_id: string;
  timezone: string;
  current_time: string;
  display_time: string;
  display_date: string;
  day_of_week: string;
  is_weekend: boolean;
}

// Store state
interface CultureState {
  cultures: Culture[];
  currentCulture: Culture | null;
  cultureCities: CultureCity[];
  cultureTime: CultureTime | null;
  isLoading: boolean;
  error: string | null;
}

interface CultureStore extends CultureState {
  fetchCultures: () => Promise<void>;
  setCulture: (cultureId: string) => Promise<void>;
  fetchCultureCities: (cultureId: string) => Promise<void>;
  fetchCultureTime: (cultureId: string) => Promise<void>;
  refreshCultureTime: () => Promise<void>;
  getLocalizedName: (item: { name: string; name_localized?: Record<string, string> }, language: string) => string;
  clearCultureData: () => void;
}

// Zustand store with persistence
export const useCultureStore = create<CultureStore>()(
  persist(
    (set, get) => ({
      cultures: [],
      currentCulture: null,
      cultureCities: [],
      cultureTime: null,
      isLoading: false,
      error: null,

      fetchCultures: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await cultureService.getCultures();
          const cultures: Culture[] = response.data || response;

          // Set default culture if none selected
          const currentCulture = get().currentCulture;
          if (!currentCulture && cultures.length > 0) {
            const defaultCulture = cultures.find(c => c.is_default) || cultures[0];
            set({
              cultures,
              currentCulture: defaultCulture,
              isLoading: false,
            });
            // Fetch cities for default culture
            await get().fetchCultureCities(defaultCulture.culture_id);
          } else {
            set({ cultures, isLoading: false });
          }
        } catch (error: any) {
          set({
            error: error?.detail || error?.message || 'Failed to fetch cultures',
            isLoading: false,
          });
        }
      },

      setCulture: async (cultureId: string) => {
        const { cultures } = get();
        const culture = cultures.find(c => c.culture_id === cultureId);

        if (culture) {
          set({ currentCulture: culture, isLoading: true });

          // Fetch cities for the new culture
          await get().fetchCultureCities(cultureId);

          // Fetch time for the new culture
          await get().fetchCultureTime(cultureId);

          set({ isLoading: false });
        }
      },

      fetchCultureCities: async (cultureId: string) => {
        try {
          const response = await cultureService.getCultureCities(cultureId);
          const cities: CultureCity[] = response.data || response;
          set({ cultureCities: cities });
        } catch (error: any) {
          set({
            error: error?.detail || error?.message || 'Failed to fetch cities',
            cultureCities: [],
          });
        }
      },

      fetchCultureTime: async (cultureId: string) => {
        try {
          const response = await cultureService.getCultureTime(cultureId);
          const time: CultureTime = response.data || response;
          set({ cultureTime: time });
        } catch (error: any) {
          // Time fetch is non-critical, just log
          console.warn('Failed to fetch culture time:', error);
        }
      },

      refreshCultureTime: async () => {
        const { currentCulture } = get();
        if (currentCulture) {
          await get().fetchCultureTime(currentCulture.culture_id);
        }
      },

      getLocalizedName: (item, language) => {
        if (item.name_localized && item.name_localized[language]) {
          return item.name_localized[language];
        }
        // Fallback order: requested language -> English -> first available -> name
        if (item.name_localized) {
          if (item.name_localized.en) return item.name_localized.en;
          const keys = Object.keys(item.name_localized);
          if (keys.length > 0) return item.name_localized[keys[0]];
        }
        return item.name;
      },

      clearCultureData: () => {
        set({
          cultures: [],
          currentCulture: null,
          cultureCities: [],
          cultureTime: null,
          isLoading: false,
          error: null,
        });
      },
    }),
    {
      name: 'bayit-culture-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        currentCulture: state.currentCulture,
      }),
    }
  )
);

// React Context for provider pattern
interface CultureContextValue {
  cultures: Culture[];
  currentCulture: Culture | null;
  cultureCities: CultureCity[];
  cultureTime: CultureTime | null;
  isLoading: boolean;
  error: string | null;
  setCulture: (cultureId: string) => Promise<void>;
  refreshCultureTime: () => Promise<void>;
  getLocalizedName: (item: { name: string; name_localized?: Record<string, string> }, language: string) => string;
}

const CultureContext = createContext<CultureContextValue | undefined>(undefined);

interface CultureProviderProps {
  children: ReactNode;
}

export function CultureProvider({ children }: CultureProviderProps) {
  const store = useCultureStore();

  // Initialize cultures on mount
  useEffect(() => {
    store.fetchCultures();
  }, []);

  // Refresh time periodically (every minute)
  useEffect(() => {
    if (!store.currentCulture) return;

    const interval = setInterval(() => {
      store.refreshCultureTime();
    }, 60000); // 1 minute

    return () => clearInterval(interval);
  }, [store.currentCulture?.culture_id]);

  const value: CultureContextValue = {
    cultures: store.cultures,
    currentCulture: store.currentCulture,
    cultureCities: store.cultureCities,
    cultureTime: store.cultureTime,
    isLoading: store.isLoading,
    error: store.error,
    setCulture: store.setCulture,
    refreshCultureTime: store.refreshCultureTime,
    getLocalizedName: store.getLocalizedName,
  };

  return (
    <CultureContext.Provider value={value}>
      {children}
    </CultureContext.Provider>
  );
}

export function useCulture(): CultureContextValue {
  const context = useContext(CultureContext);
  if (context === undefined) {
    throw new Error('useCulture must be used within a CultureProvider');
  }
  return context;
}

// Convenience hooks
export function useCurrentCulture(): Culture | null {
  return useCultureStore((state) => state.currentCulture);
}

export function useCultureCities(): CultureCity[] {
  return useCultureStore((state) => state.cultureCities);
}

export function useCultureTime(): CultureTime | null {
  return useCultureStore((state) => state.cultureTime);
}

export function useCultureLoading(): boolean {
  return useCultureStore((state) => state.isLoading);
}
