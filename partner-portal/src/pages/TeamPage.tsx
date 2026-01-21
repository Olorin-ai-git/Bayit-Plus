/**
 * Team Management Page
 *
 * Invite, manage, and remove team members.
 */

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePartnerStore } from '../stores/partnerStore';
import { useB2BAuthStore } from '../stores/authStore';
import { toast } from '../stores/uiStore';
import { PageHeader, LoadingSpinner, EmptyState, ConfirmDialog } from '../components/common';
import type { B2BUserRole } from '../types';

interface InviteForm {
  name: string;
  email: string;
  role: B2BUserRole;
}

const initialInviteForm: InviteForm = {
  name: '',
  email: '',
  role: 'member',
};

const roleOptions: B2BUserRole[] = ['admin', 'member', 'viewer'];

export const TeamPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useB2BAuthStore();
  const { teamMembers, isLoading, fetchTeamMembers, inviteMember, updateMemberRole, removeMember } = usePartnerStore();

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState<string | null>(null);
  const [showTempPassword, setShowTempPassword] = useState<string | null>(null);
  const [inviteForm, setInviteForm] = useState<InviteForm>(initialInviteForm);
  const [isInviting, setIsInviting] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    fetchTeamMembers();
  }, [fetchTeamMembers]);

  const handleInvite = async () => {
    if (!inviteForm.name.trim() || !inviteForm.email.trim()) {
      toast.error(t('common.required'));
      return;
    }

    setIsInviting(true);
    try {
      const result = await inviteMember({
        name: inviteForm.name,
        email: inviteForm.email,
        role: inviteForm.role,
      });
      setShowTempPassword(result.temporaryPassword);
      setShowInviteModal(false);
      setInviteForm(initialInviteForm);
      toast.success(t('team.inviteSent'));
    } catch {
      toast.error(t('errors.serverError'));
    } finally {
      setIsInviting(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: B2BUserRole) => {
    try {
      await updateMemberRole(userId, newRole);
      toast.success(t('common.success'));
    } catch {
      toast.error(t('errors.serverError'));
    }
  };

  const handleRemove = async (userId: string) => {
    setIsRemoving(true);
    try {
      await removeMember(userId);
      setShowRemoveDialog(null);
      toast.success(t('common.success'));
    } catch {
      toast.error(t('errors.serverError'));
    } finally {
      setIsRemoving(false);
    }
  };

  const canManageMember = (member: typeof teamMembers[0]) => {
    // Cannot manage self
    if (member.id === user?.id) return false;
    // Cannot manage owner
    if (member.role === 'owner') return false;
    // Only owner and admin can manage
    return user?.role === 'owner' || user?.role === 'admin';
  };

  const getRoleBadgeColor = (role: B2BUserRole) => {
    switch (role) {
      case 'owner':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'admin':
        return 'bg-purple-500/20 text-purple-400';
      case 'member':
        return 'bg-blue-500/20 text-blue-400';
      case 'viewer':
        return 'bg-gray-500/20 text-gray-400';
      default:
        return 'bg-white/20 text-white';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t('common.copied'));
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <PageHeader
        title={t('team.title')}
        actions={
          (user?.role === 'owner' || user?.role === 'admin') && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="
                px-4 py-2.5 rounded-xl
                bg-partner-primary text-white
                font-medium text-sm
                hover:bg-partner-primary/90
                transition-colors
              "
            >
              {t('team.inviteMember')}
            </button>
          )
        }
      />

      {/* Team Members List */}
      <div className="rounded-2xl border border-white/10 bg-glass-card backdrop-blur-xl p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <LoadingSpinner size="lg" />
          </div>
        ) : teamMembers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left rtl:text-right py-3 px-4 text-sm font-medium text-white/60">
                    {t('team.memberName')}
                  </th>
                  <th className="text-left rtl:text-right py-3 px-4 text-sm font-medium text-white/60">
                    {t('team.memberEmail')}
                  </th>
                  <th className="text-left rtl:text-right py-3 px-4 text-sm font-medium text-white/60">
                    {t('team.memberRole')}
                  </th>
                  <th className="text-left rtl:text-right py-3 px-4 text-sm font-medium text-white/60">
                    {t('team.memberStatus')}
                  </th>
                  <th className="text-right rtl:text-left py-3 px-4 text-sm font-medium text-white/60">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {teamMembers.map((member) => (
                  <tr
                    key={member.id}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-partner-primary/20 flex items-center justify-center">
                          <span className="text-partner-primary font-semibold text-sm">
                            {member.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-sm text-white font-medium">{member.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-white/60">{member.email}</td>
                    <td className="py-3 px-4">
                      {canManageMember(member) && member.role !== 'owner' ? (
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.id, e.target.value as B2BUserRole)}
                          className="
                            px-2 py-1 rounded-lg text-xs font-medium
                            bg-white/10 border border-white/10
                            text-white
                            focus:outline-none focus:border-partner-primary
                          "
                        >
                          {roleOptions.map((role) => (
                            <option key={role} value={role}>
                              {t(`team.${role}`)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className={`inline-flex px-2 py-1 rounded-lg text-xs font-medium ${getRoleBadgeColor(member.role)}`}>
                          {t(`team.${member.role}`)}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`
                          inline-flex px-2 py-1 rounded-lg text-xs font-medium
                          ${member.lastLoginAt ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}
                        `}
                      >
                        {member.lastLoginAt ? t('team.active') : t('team.pending')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right rtl:text-left">
                      {canManageMember(member) ? (
                        <button
                          onClick={() => setShowRemoveDialog(member.id)}
                          className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
                        >
                          {t('team.remove')}
                        </button>
                      ) : member.id === user?.id ? (
                        <span className="text-xs text-white/40">{t('team.you')}</span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title={t('common.noData')}
            description={t('team.inviteDescription')}
            action={
              (user?.role === 'owner' || user?.role === 'admin')
                ? {
                    label: t('team.inviteMember'),
                    onClick: () => setShowInviteModal(true),
                  }
                : undefined
            }
            icon={
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            }
          />
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowInviteModal(false)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-glass-card backdrop-blur-xl p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-6">{t('team.inviteMember')}</h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  {t('team.memberName')}
                </label>
                <input
                  type="text"
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="
                    w-full px-4 py-3 rounded-xl
                    bg-white/5 border border-white/10
                    text-white placeholder-white/40
                    focus:outline-none focus:border-partner-primary
                  "
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  {t('team.memberEmail')}
                </label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="
                    w-full px-4 py-3 rounded-xl
                    bg-white/5 border border-white/10
                    text-white placeholder-white/40
                    focus:outline-none focus:border-partner-primary
                  "
                  placeholder="john@company.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  {t('team.memberRole')}
                </label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm((prev) => ({ ...prev, role: e.target.value as B2BUserRole }))}
                  className="
                    w-full px-4 py-3 rounded-xl
                    bg-white/5 border border-white/10
                    text-white
                    focus:outline-none focus:border-partner-primary
                  "
                >
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {t(`team.${role}`)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button
                onClick={() => setShowInviteModal(false)}
                className="flex-1 py-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleInvite}
                disabled={isInviting || !inviteForm.name.trim() || !inviteForm.email.trim()}
                className="flex-1 py-3 rounded-xl bg-partner-primary text-white font-medium hover:bg-partner-primary/90 disabled:opacity-50 transition-colors"
              >
                {isInviting ? t('common.loading') : t('common.submit')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Temp Password Modal */}
      {showTempPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-glass-card backdrop-blur-xl p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-2">{t('team.inviteSent')}</h2>
            <p className="text-sm text-yellow-400 mb-6">{t('team.tempPasswordWarning')}</p>

            <div>
              <label className="block text-sm font-medium text-white/60 mb-2">
                {t('team.tempPassword')}
              </label>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={showTempPassword}
                  className="
                    w-full px-4 py-3 pr-12 rounded-xl
                    bg-white/5 border border-white/10
                    text-white font-mono text-sm
                  "
                />
                <button
                  onClick={() => copyToClipboard(showTempPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowTempPassword(null)}
              className="w-full mt-6 py-3 rounded-xl bg-partner-primary text-white font-medium hover:bg-partner-primary/90 transition-colors"
            >
              {t('common.close')}
            </button>
          </div>
        </div>
      )}

      {/* Remove Confirmation */}
      <ConfirmDialog
        isOpen={!!showRemoveDialog}
        onClose={() => setShowRemoveDialog(null)}
        onConfirm={() => showRemoveDialog && handleRemove(showRemoveDialog)}
        title={t('team.remove')}
        message={t('team.removeConfirm', { name: teamMembers.find((m) => m.id === showRemoveDialog)?.name || '' })}
        confirmLabel={t('team.remove')}
        cancelLabel={t('common.cancel')}
        variant="danger"
        isLoading={isRemoving}
      />
    </div>
  );
};

export default TeamPage;
