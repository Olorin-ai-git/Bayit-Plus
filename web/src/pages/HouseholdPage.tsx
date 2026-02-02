/**
 * Household Management Page - Web
 *
 * Provides UI for creating and managing households:
 * - Create household
 * - Invite members (email + role)
 * - View household members
 * - Remove members
 * - Delete household
 */

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHouseholdStore, HouseholdRole } from '../../../shared/stores/householdStore';
import { setApiClient } from '../../../shared/services/householdApi';
import api from '../services/api';

// Initialize API client for household store
setApiClient(api);

export default function HouseholdPage() {
  const { t } = useTranslation();
  const {
    household,
    loading,
    error,
    loadHousehold,
    createHousehold,
    inviteMember,
    removeMember,
    deleteHousehold,
    clearError,
  } = useHouseholdStore();

  const [householdName, setHouseholdName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<HouseholdRole>(HouseholdRole.CHILD);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);

  useEffect(() => {
    loadHousehold();
  }, [loadHousehold]);

  const handleCreateHousehold = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!householdName.trim()) return;

    try {
      await createHousehold(householdName.trim());
      setHouseholdName('');
      setShowCreateForm(false);
    } catch (error) {
      // Error handled by store
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    try {
      await inviteMember(inviteEmail.trim(), inviteRole);
      setInviteEmail('');
      setShowInviteForm(false);
    } catch (error) {
      // Error handled by store
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm(t('household.confirmRemoveMember'))) return;

    try {
      await removeMember(userId);
    } catch (error) {
      // Error handled by store
    }
  };

  const handleDeleteHousehold = async () => {
    if (!confirm(t('household.confirmDelete'))) return;

    try {
      await deleteHousehold();
    } catch (error) {
      // Error handled by store
    }
  };

  const getRoleDisplay = (role: HouseholdRole) => {
    switch (role) {
      case HouseholdRole.PARENT:
        return t('household.roleParent');
      case HouseholdRole.CHILD:
        return t('household.roleChild');
      case HouseholdRole.GUARDIAN:
        return t('household.roleGuardian');
      default:
        return role;
    }
  };

  if (loading && !household) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-xl">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">{t('household.title')}</h1>
          <p className="text-gray-400">{t('household.subtitle')}</p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-6">
            <p className="text-red-200">{error}</p>
            <button
              onClick={clearError}
              className="mt-2 text-sm text-red-300 hover:text-red-100"
            >
              {t('common.dismiss')}
            </button>
          </div>
        )}

        {/* No Household - Create Form */}
        {!household && (
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8">
            <h2 className="text-2xl font-semibold mb-4">{t('household.createHousehold')}</h2>
            <p className="text-gray-300 mb-6">{t('household.createDescription')}</p>

            {!showCreateForm ? (
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium"
              >
                {t('household.createButton')}
              </button>
            ) : (
              <form onSubmit={handleCreateHousehold} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('household.householdName')}
                  </label>
                  <input
                    type="text"
                    value={householdName}
                    onChange={(e) => setHouseholdName(e.target.value)}
                    placeholder={t('household.namePlaceholder')}
                    className="w-full bg-white/20 border border-white/30 rounded-lg px-4 py-2 text-white placeholder-gray-400"
                    required
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium"
                  >
                    {loading ? t('common.creating') : t('household.create')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false);
                      setHouseholdName('');
                    }}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-medium"
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Household Details */}
        {household && (
          <div className="space-y-6">
            {/* Household Info */}
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-semibold mb-2">{household.name}</h2>
                  <p className="text-gray-400">
                    {t('household.memberCount', { count: household.members.length })}
                  </p>
                </div>
                <button
                  onClick={handleDeleteHousehold}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm"
                >
                  {t('household.delete')}
                </button>
              </div>

              {/* Members List */}
              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-4">{t('household.members')}</h3>
                <div className="space-y-3">
                  {household.members.map((member) => (
                    <div
                      key={member.user_id}
                      className="flex justify-between items-center bg-white/10 rounded-lg p-4"
                    >
                      <div>
                        <p className="font-medium">{member.user_id}</p>
                        <p className="text-sm text-gray-400">{getRoleDisplay(member.role)}</p>
                      </div>
                      {member.user_id !== household.owner_id && (
                        <button
                          onClick={() => handleRemoveMember(member.user_id)}
                          className="text-red-400 hover:text-red-300 text-sm"
                        >
                          {t('household.remove')}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Pending Invitations */}
              {household.pending_invitations.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-xl font-semibold mb-4">{t('household.pendingInvitations')}</h3>
                  <div className="space-y-3">
                    {household.pending_invitations.map((invite) => (
                      <div
                        key={invite.invitation_id}
                        className="flex justify-between items-center bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4"
                      >
                        <div>
                          <p className="font-medium">{invite.email}</p>
                          <p className="text-sm text-gray-400">
                            {getRoleDisplay(invite.role)} • {t('household.expires')}: {new Date(invite.expires_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Invite Member Button */}
              {!showInviteForm ? (
                <button
                  onClick={() => setShowInviteForm(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium"
                >
                  {t('household.inviteMember')}
                </button>
              ) : (
                <form onSubmit={handleInviteMember} className="space-y-4 mt-6 bg-white/10 rounded-lg p-6">
                  <h4 className="text-lg font-semibold">{t('household.inviteMember')}</h4>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      {t('household.email')}
                    </label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder={t('household.emailPlaceholder')}
                      className="w-full bg-white/20 border border-white/30 rounded-lg px-4 py-2 text-white placeholder-gray-400"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      {t('household.role')}
                    </label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as HouseholdRole)}
                      className="w-full bg-white/20 border border-white/30 rounded-lg px-4 py-2 text-white"
                    >
                      <option value={HouseholdRole.CHILD}>{t('household.roleChild')}</option>
                      <option value={HouseholdRole.GUARDIAN}>{t('household.roleGuardian')}</option>
                    </select>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium"
                    >
                      {loading ? t('common.sending') : t('household.sendInvitation')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowInviteForm(false);
                        setInviteEmail('');
                      }}
                      className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-medium"
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
