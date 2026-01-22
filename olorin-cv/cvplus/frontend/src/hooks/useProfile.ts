/**
 * React Hooks for Profile Management
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { profileAPI } from '../services/api';

export function useCreateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      cvId,
      slug,
      visibility = 'public',
    }: {
      cvId: string;
      slug?: string;
      visibility?: string;
    }) => profileAPI.create(cvId, slug, visibility),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
  });
}

export function useProfile(slug: string | null, enabled = true) {
  return useQuery({
    queryKey: ['profile', slug],
    queryFn: () => profileAPI.get(slug!),
    enabled: enabled && !!slug,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ profileId, updates }: { profileId: string; updates: object }) =>
      profileAPI.update(profileId, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['profile', variables.profileId] });
    },
  });
}

export function useDeleteProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (profileId: string) => profileAPI.delete(profileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
  });
}

export function useSubmitContact() {
  return useMutation({
    mutationFn: ({
      slug,
      contactData,
    }: {
      slug: string;
      contactData: {
        sender_name: string;
        sender_email: string;
        message: string;
        sender_phone?: string;
        company?: string;
      };
    }) => profileAPI.submitContact(slug, contactData),
  });
}
