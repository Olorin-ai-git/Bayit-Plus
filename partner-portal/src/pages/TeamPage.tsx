/**
 * Team Management Page
 *
 * Invite, manage, and remove team members.
 * With API-key auth, the authenticated partner is always the owner.
 */

import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  GlassButton,
  GlassCard,
  GlassInput,
  GlassSelect,
} from "@olorin/glass-ui/web";
import { usePartnerStore } from "../stores/partnerStore";
import { useAuthStore } from "../stores/authStore";
import { toast } from "../stores/uiStore";
import {
  PageHeader,
  LoadingSpinner,
  EmptyState,
  ConfirmDialog,
} from "../components/common";
import type { B2BUserRole } from "../types";

interface InviteForm {
  name: string;
  email: string;
  role: B2BUserRole;
}

const initialInviteForm: InviteForm = { name: "", email: "", role: "member" };

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "member", label: "Member" },
  { value: "viewer", label: "Viewer" },
];

const ROLE_BADGE: Record<string, string> = {
  owner: "bg-yellow-500/20 text-yellow-400",
  admin: "bg-purple-500/20 text-purple-400",
  member: "bg-blue-500/20 text-blue-400",
  viewer: "bg-gray-500/20 text-gray-400",
};

export const TeamPage: React.FC = () => {
  const { t } = useTranslation();
  const { partner } = useAuthStore();
  const {
    teamMembers,
    isLoading,
    fetchTeamMembers,
    inviteMember,
    updateMemberRole,
    removeMember,
  } = usePartnerStore();

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
      toast.error(t("common.required"));
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
      toast.success(t("team.inviteSent"));
    } catch {
      toast.error(t("errors.serverError"));
    } finally {
      setIsInviting(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await updateMemberRole(userId, newRole as B2BUserRole);
      toast.success(t("common.success"));
    } catch {
      toast.error(t("errors.serverError"));
    }
  };

  const handleRemove = async (userId: string) => {
    setIsRemoving(true);
    try {
      await removeMember(userId);
      setShowRemoveDialog(null);
      toast.success(t("common.success"));
    } catch {
      toast.error(t("errors.serverError"));
    } finally {
      setIsRemoving(false);
    }
  };

  const canManageMember = (member: (typeof teamMembers)[0]) => {
    if (member.id === partner?.partner_id) return false;
    if (member.role === "owner") return false;
    return true; // API-key holder is always the partner owner
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t("common.copied"));
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("team.title")}
        actions={
          <GlassButton onClick={() => setShowInviteModal(true)} size="md">
            {t("team.inviteMember")}
          </GlassButton>
        }
      />

      <GlassCard>
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <LoadingSpinner size="lg" />
          </div>
        ) : teamMembers.length > 0 ? (
          <MemberTable
            t={t}
            members={teamMembers}
            partnerId={partner?.partner_id}
            canManage={canManageMember}
            onRoleChange={handleRoleChange}
            onRemove={(id) => setShowRemoveDialog(id)}
          />
        ) : (
          <EmptyState
            title={t("common.noData")}
            description={t("team.inviteDescription")}
            action={{
              label: t("team.inviteMember"),
              onClick: () => setShowInviteModal(true),
            }}
          />
        )}
      </GlassCard>

      {showInviteModal && (
        <InviteModal
          t={t}
          form={inviteForm}
          setForm={setInviteForm}
          isInviting={isInviting}
          onInvite={handleInvite}
          onClose={() => setShowInviteModal(false)}
        />
      )}

      {showTempPassword && (
        <TempPasswordModal
          t={t}
          password={showTempPassword}
          onCopy={copyToClipboard}
          onClose={() => setShowTempPassword(null)}
        />
      )}

      <ConfirmDialog
        isOpen={!!showRemoveDialog}
        onClose={() => setShowRemoveDialog(null)}
        onConfirm={() => showRemoveDialog && handleRemove(showRemoveDialog)}
        title={t("team.remove")}
        message={t("team.removeConfirm", {
          name: teamMembers.find((m) => m.id === showRemoveDialog)?.name || "",
        })}
        confirmLabel={t("team.remove")}
        cancelLabel={t("common.cancel")}
        variant="danger"
        isLoading={isRemoving}
      />
    </div>
  );
};

export default TeamPage;

/* ---- Sub-components (kept under 200 lines total) ---- */

interface MemberTableProps {
  t: (key: string) => string;
  members: {
    id: string;
    name: string;
    email: string;
    role: B2BUserRole;
    lastLoginAt: string | null;
  }[];
  partnerId: string | undefined;
  canManage: (m: MemberTableProps["members"][0]) => boolean;
  onRoleChange: (id: string, role: string) => void;
  onRemove: (id: string) => void;
}

const MemberTable: React.FC<MemberTableProps> = ({
  t,
  members,
  partnerId,
  canManage,
  onRoleChange,
  onRemove,
}) => (
  <div className="overflow-x-auto">
    <table className="w-full">
      <thead>
        <tr className="border-b border-white/10">
          {[
            "memberName",
            "memberEmail",
            "memberRole",
            "memberStatus",
            "actions",
          ].map((key) => (
            <th
              key={key}
              className="text-left rtl:text-right py-3 px-4 text-sm font-medium text-white/60"
            >
              {t(`team.${key}`)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {members.map((m) => (
          <tr
            key={m.id}
            className="border-b border-white/5 hover:bg-white/5 transition-colors"
          >
            <td className="py-3 px-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-partner-primary/20 flex items-center justify-center">
                  <span className="text-partner-primary font-semibold text-sm">
                    {m.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-sm text-white font-medium">{m.name}</span>
              </div>
            </td>
            <td className="py-3 px-4 text-sm text-white/60">{m.email}</td>
            <td className="py-3 px-4">
              {canManage(m) && m.role !== "owner" ? (
                <GlassSelect
                  options={ROLE_OPTIONS}
                  value={m.role}
                  onChange={(val) => onRoleChange(m.id, val)}
                />
              ) : (
                <span
                  className={`inline-flex px-2 py-1 rounded-lg text-xs font-medium ${ROLE_BADGE[m.role] || "bg-white/20 text-white"}`}
                >
                  {t(`team.${m.role}`)}
                </span>
              )}
            </td>
            <td className="py-3 px-4">
              <span
                className={`inline-flex px-2 py-1 rounded-lg text-xs font-medium ${m.lastLoginAt ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}`}
              >
                {m.lastLoginAt ? t("team.active") : t("team.pending")}
              </span>
            </td>
            <td className="py-3 px-4 text-right rtl:text-left">
              {canManage(m) ? (
                <GlassButton
                  variant="danger"
                  size="sm"
                  onClick={() => onRemove(m.id)}
                >
                  {t("team.remove")}
                </GlassButton>
              ) : m.id === partnerId ? (
                <span className="text-xs text-white/40">{t("team.you")}</span>
              ) : null}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

interface InviteModalProps {
  t: (key: string) => string;
  form: InviteForm;
  setForm: React.Dispatch<React.SetStateAction<InviteForm>>;
  isInviting: boolean;
  onInvite: () => void;
  onClose: () => void;
}

const InviteModal: React.FC<InviteModalProps> = ({
  t,
  form,
  setForm,
  isInviting,
  onInvite,
  onClose,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div
      className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    />
    <div className="relative z-10 w-full max-w-md rounded-2xl border border-glass-border bg-glass-bg backdrop-blur-xl p-6 shadow-2xl">
      <h2 className="text-xl font-bold text-white mb-6">
        {t("team.inviteMember")}
      </h2>
      <div className="space-y-6">
        <GlassInput
          label={t("team.memberName")}
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          placeholder="John Doe"
        />
        <GlassInput
          label={t("team.memberEmail")}
          type="email"
          value={form.email}
          onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
          placeholder="john@company.com"
        />
        <GlassSelect
          label={t("team.memberRole")}
          options={ROLE_OPTIONS}
          value={form.role}
          onChange={(val) =>
            setForm((p) => ({ ...p, role: val as B2BUserRole }))
          }
        />
      </div>
      <div className="mt-8 flex gap-3">
        <GlassButton variant="ghost" onClick={onClose} className="flex-1">
          {t("common.cancel")}
        </GlassButton>
        <GlassButton
          onClick={onInvite}
          disabled={isInviting || !form.name.trim() || !form.email.trim()}
          loading={isInviting}
          className="flex-1"
        >
          {t("common.submit")}
        </GlassButton>
      </div>
    </div>
  </div>
);

interface TempPasswordModalProps {
  t: (key: string) => string;
  password: string;
  onCopy: (text: string) => void;
  onClose: () => void;
}

const TempPasswordModal: React.FC<TempPasswordModalProps> = ({
  t,
  password,
  onCopy,
  onClose,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
    <div className="relative z-10 w-full max-w-md rounded-2xl border border-glass-border bg-glass-bg backdrop-blur-xl p-6 shadow-2xl">
      <h2 className="text-xl font-bold text-white mb-2">
        {t("team.inviteSent")}
      </h2>
      <p className="text-sm text-yellow-400 mb-6">
        {t("team.tempPasswordWarning")}
      </p>
      <div className="relative">
        <GlassInput
          type="text"
          readOnly
          value={password}
          className="font-mono pr-12"
        />
        <GlassButton
          variant="ghost"
          size="sm"
          onClick={() => onCopy(password)}
          className="absolute right-2 top-1/2 -translate-y-1/2"
        >
          {t("common.copied")}
        </GlassButton>
      </div>
      <GlassButton onClick={onClose} className="w-full mt-6">
        {t("common.close")}
      </GlassButton>
    </div>
  </div>
);
