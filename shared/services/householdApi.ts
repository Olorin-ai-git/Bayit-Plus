/**
 * Household API Service
 *
 * API client for household management endpoints.
 * Used by all platforms (web, mobile, tvOS).
 */

import type { Household, HouseholdRole } from '../stores/householdStore';

// Platform-specific API client will be injected
let apiClient: any = null;

export const setApiClient = (client: any) => {
  apiClient = client;
};

const getClient = () => {
  if (!apiClient) {
    throw new Error('API client not initialized. Call setApiClient() first.');
  }
  return apiClient;
};

export const getHousehold = async (): Promise<Household | null> => {
  const api = getClient();
  const response = await api.get('/household');
  return response.data || null;
};

export const createHousehold = async (name: string): Promise<Household> => {
  const api = getClient();
  const response = await api.post('/household/create', { name });
  return response.data;
};

export const updateHousehold = async (
  householdId: string,
  name: string
): Promise<Household> => {
  const api = getClient();
  const response = await api.patch(`/household/${householdId}`, { name });
  return response.data;
};

export const deleteHousehold = async (householdId: string): Promise<void> => {
  const api = getClient();
  await api.delete(`/household/${householdId}`);
};

export const inviteHouseholdMember = async (
  householdId: string,
  email: string,
  role: HouseholdRole
): Promise<{ invitation_id: string; expires_at: string }> => {
  const api = getClient();
  const response = await api.post(`/household/${householdId}/invite`, {
    email,
    role,
  });
  return response.data;
};

export const acceptHouseholdInvitation = async (
  invitationCode: string
): Promise<Household> => {
  const api = getClient();
  const response = await api.post('/household/accept-invitation', {
    invitation_code: invitationCode,
  });
  return response.data;
};

export const removeHouseholdMember = async (
  householdId: string,
  memberId: string
): Promise<Household> => {
  const api = getClient();
  const response = await api.delete(
    `/household/${householdId}/members/${memberId}`
  );
  return response.data;
};

export const getHouseholdMembers = async (
  householdId: string
): Promise<any[]> => {
  const api = getClient();
  const response = await api.get(`/household/${householdId}/members`);
  return response.data || [];
};
