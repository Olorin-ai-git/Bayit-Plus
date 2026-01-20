/**
 * API Keys Page
 *
 * Create, view, and manage API keys.
 */

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePartnerStore } from '../stores/partnerStore';
import { toast } from '../stores/uiStore';
import { PageHeader, LoadingSpinner, EmptyState, ConfirmDialog } from '../components/common';
import type { ApiKeyScope } from '../types';

interface CreateKeyForm {
  name: string;
  scopes: ApiKeyScope[];
  expiresInDays: number | null;
}

const initialCreateForm: CreateKeyForm = {
  name: '',
  scopes: ['all'],
  expiresInDays: null,
};

export const ApiKeysPage: React.FC = () => {
  const { t } = useTranslation();
  const { apiKeys, isLoading, fetchApiKeys, createApiKey, revokeApiKey } = usePartnerStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRevokeDialog, setShowRevokeDialog] = useState<string | null>(null);
  const [showNewKey, setShowNewKey] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<CreateKeyForm>(initialCreateForm);
  const [isCreating, setIsCreating] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);

  useEffect(() => {
    fetchApiKeys();
  }, [fetchApiKeys]);

  const handleCreate = async () => {
    if (!createForm.name.trim()) {
      toast.error(t('common.required'));
      return;
    }

    setIsCreating(true);
    try {
      const result = await createApiKey({
        name: createForm.name,
        scopes: createForm.scopes,
        expiresInDays: createForm.expiresInDays ?? undefined,
      });
      setShowNewKey(result.rawKey);
      setShowCreateModal(false);
      setCreateForm(initialCreateForm);
      toast.success(t('apiKeys.keyCreated'));
    } catch {
      toast.error(t('errors.serverError'));
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevoke = async (keyId: string) => {
    setIsRevoking(true);
    try {
      await revokeApiKey(keyId);
      setShowRevokeDialog(null);
      toast.success(t('common.success'));
    } catch {
      toast.error(t('errors.serverError'));
    } finally {
      setIsRevoking(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t('common.copied'));
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return t('apiKeys.never');
    return new Date(dateString).toLocaleDateString();
  };

  const toggleScope = (scope: ApiKeyScope) => {
    setCreateForm((prev) => {
      if (scope === 'all') {
        return { ...prev, scopes: ['all'] };
      }
      const newScopes = prev.scopes.filter((s) => s !== 'all');
      if (newScopes.includes(scope)) {
        return { ...prev, scopes: newScopes.filter((s) => s !== scope) };
      }
      return { ...prev, scopes: [...newScopes, scope] };
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <PageHeader
        title={t('apiKeys.title')}
        actions={
          <button
            onClick={() => setShowCreateModal(true)}
            className="
              px-4 py-2.5 rounded-xl
              bg-partner-primary text-white
              font-medium text-sm
              hover:bg-partner-primary/90
              transition-colors
            "
          >
            {t('apiKeys.createKey')}
          </button>
        }
      />

      {/* API Keys List */}
      <div className="rounded-2xl border border-white/10 bg-glass-card backdrop-blur-xl p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <LoadingSpinner size="lg" />
          </div>
        ) : apiKeys.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left rtl:text-right py-3 px-4 text-sm font-medium text-white/60">
                    {t('apiKeys.keyName')}
                  </th>
                  <th className="text-left rtl:text-right py-3 px-4 text-sm font-medium text-white/60">
                    Key
                  </th>
                  <th className="text-left rtl:text-right py-3 px-4 text-sm font-medium text-white/60">
                    {t('apiKeys.scopes')}
                  </th>
                  <th className="text-left rtl:text-right py-3 px-4 text-sm font-medium text-white/60">
                    {t('apiKeys.created')}
                  </th>
                  <th className="text-left rtl:text-right py-3 px-4 text-sm font-medium text-white/60">
                    {t('apiKeys.lastUsed')}
                  </th>
                  <th className="text-left rtl:text-right py-3 px-4 text-sm font-medium text-white/60">
                    {t('apiKeys.expiresIn')}
                  </th>
                  <th className="text-right rtl:text-left py-3 px-4 text-sm font-medium text-white/60">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {apiKeys.map((key) => (
                  <tr
                    key={key.id}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="py-3 px-4 text-sm text-white font-medium">
                      {key.name}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-sm text-white/60">
                        {key.keyPrefix}...
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {key.scopes.map((scope) => (
                          <span
                            key={scope}
                            className="px-2 py-0.5 rounded-lg text-xs font-medium bg-partner-primary/20 text-partner-primary"
                          >
                            {t(`apiKeys.scope${scope.charAt(0).toUpperCase() + scope.slice(1)}`)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-white/60">
                      {formatDate(key.createdAt)}
                    </td>
                    <td className="py-3 px-4 text-sm text-white/60">
                      {formatDate(key.lastUsedAt)}
                    </td>
                    <td className="py-3 px-4 text-sm text-white/60">
                      {key.expiresAt ? formatDate(key.expiresAt) : t('apiKeys.neverExpires')}
                    </td>
                    <td className="py-3 px-4 text-right rtl:text-left">
                      <button
                        onClick={() => setShowRevokeDialog(key.id)}
                        className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
                      >
                        {t('apiKeys.revoke')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title={t('common.noData')}
            description={t('apiKeys.createFirstDescription')}
            action={{
              label: t('apiKeys.createKey'),
              onClick: () => setShowCreateModal(true),
            }}
            icon={
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            }
          />
        )}
      </div>

      {/* Create Key Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-glass-card backdrop-blur-xl p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-6">{t('apiKeys.createKey')}</h2>

            <div className="space-y-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  {t('apiKeys.keyName')}
                </label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="
                    w-full px-4 py-3 rounded-xl
                    bg-white/5 border border-white/10
                    text-white placeholder-white/40
                    focus:outline-none focus:border-partner-primary
                  "
                  placeholder={t('apiKeys.namePlaceholder')}
                />
              </div>

              {/* Scopes */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  {t('apiKeys.scopes')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {(['all', 'fraud', 'content'] as ApiKeyScope[]).map((scope) => (
                    <button
                      key={scope}
                      type="button"
                      onClick={() => toggleScope(scope)}
                      className={`
                        px-3 py-1.5 rounded-xl text-sm font-medium transition-colors
                        ${
                          createForm.scopes.includes(scope)
                            ? 'bg-partner-primary text-white'
                            : 'bg-white/10 text-white/60 hover:bg-white/20'
                        }
                      `}
                    >
                      {t(`apiKeys.scope${scope.charAt(0).toUpperCase() + scope.slice(1)}`)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Expiration */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  {t('apiKeys.expiresIn')}
                </label>
                <select
                  value={createForm.expiresInDays ?? ''}
                  onChange={(e) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      expiresInDays: e.target.value ? Number(e.target.value) : null,
                    }))
                  }
                  className="
                    w-full px-4 py-3 rounded-xl
                    bg-white/5 border border-white/10
                    text-white
                    focus:outline-none focus:border-partner-primary
                  "
                >
                  <option value="">{t('apiKeys.neverExpires')}</option>
                  <option value="30">{t('apiKeys.days', { count: 30 })}</option>
                  <option value="90">{t('apiKeys.days', { count: 90 })}</option>
                  <option value="180">{t('apiKeys.days', { count: 180 })}</option>
                  <option value="365">{t('apiKeys.days', { count: 365 })}</option>
                </select>
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleCreate}
                disabled={isCreating || !createForm.name.trim()}
                className="flex-1 py-3 rounded-xl bg-partner-primary text-white font-medium hover:bg-partner-primary/90 disabled:opacity-50 transition-colors"
              >
                {isCreating ? t('common.loading') : t('common.create')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Key Display Modal */}
      {showNewKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-glass-card backdrop-blur-xl p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-2">{t('apiKeys.keyCreated')}</h2>
            <p className="text-sm text-yellow-400 mb-6">{t('apiKeys.copyKeyWarning')}</p>

            <div className="relative">
              <input
                type="text"
                readOnly
                value={showNewKey}
                className="
                  w-full px-4 py-3 pr-12 rounded-xl
                  bg-white/5 border border-white/10
                  text-white font-mono text-sm
                "
              />
              <button
                onClick={() => copyToClipboard(showNewKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>

            <button
              onClick={() => setShowNewKey(null)}
              className="w-full mt-6 py-3 rounded-xl bg-partner-primary text-white font-medium hover:bg-partner-primary/90 transition-colors"
            >
              {t('common.close')}
            </button>
          </div>
        </div>
      )}

      {/* Revoke Confirmation */}
      <ConfirmDialog
        isOpen={!!showRevokeDialog}
        onClose={() => setShowRevokeDialog(null)}
        onConfirm={() => showRevokeDialog && handleRevoke(showRevokeDialog)}
        title={t('apiKeys.revoke')}
        message={t('apiKeys.revokeConfirm')}
        confirmLabel={t('apiKeys.revoke')}
        cancelLabel={t('common.cancel')}
        variant="danger"
        isLoading={isRevoking}
      />
    </div>
  );
};

export default ApiKeysPage;
