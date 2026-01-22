/**
 * Profile API Methods
 * Endpoints for creating and managing public CV profiles
 */

import { apiClient } from './client';
import { Profile, ContactData } from './types';

export const profileAPI = {
  create: async (cvId: string, slug?: string, visibility = 'public'): Promise<Profile> => {
    const { data } = await apiClient.post<Profile>('/profile/create', {
      cv_id: cvId,
      slug,
      visibility,
    });
    return data;
  },

  get: async (slug: string) => {
    const { data } = await apiClient.get(`/profile/${slug}`);
    return data;
  },

  update: async (profileId: string, updates: object): Promise<Profile> => {
    const { data } = await apiClient.put<Profile>(`/profile/${profileId}`, updates);
    return data;
  },

  submitContact: async (slug: string, contactData: ContactData) => {
    const { data } = await apiClient.post(`/profile/${slug}/contact`, contactData);
    return data;
  },

  delete: async (profileId: string) => {
    const { data } = await apiClient.delete(`/profile/${profileId}`);
    return data;
  },
};
