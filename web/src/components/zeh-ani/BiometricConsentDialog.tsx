import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAvatarMeshStore } from '@/stores/avatarMeshStore';
import logger from '@bayit/shared-utils/logger';

const consentLogger = logger.scope('BiometricConsentDialog');

const CONSENT_TYPES = ['mesh_generation', 'voice_v2v', 'latent_features'] as const;
type ConsentType = typeof CONSENT_TYPES[number];

interface BiometricConsentDialogProps {
  profileId: string;
  onConsentGranted: () => void;
}

export function BiometricConsentDialog({
  profileId,
  onConsentGranted,
}: BiometricConsentDialogProps) {
  const { t } = useTranslation();
  const { consentStatus, loading, error, grantConsent, checkConsent, clearError } =
    useAvatarMeshStore();

  const [pin, setPin] = useState('');
  const [checkedTypes, setCheckedTypes] = useState<Record<ConsentType, boolean>>({
    mesh_generation: false,
    voice_v2v: false,
    latent_features: false,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    checkConsent(profileId);
  }, [profileId, checkConsent]);

  useEffect(() => {
    if (!consentStatus) return;
    const updated = { ...checkedTypes };
    for (const entry of consentStatus.consents) {
      if (CONSENT_TYPES.includes(entry.consent_type as ConsentType) && entry.active) {
        updated[entry.consent_type as ConsentType] = true;
      }
    }
    setCheckedTypes(updated);
  }, [consentStatus]);

  const handleToggle = useCallback((type: ConsentType) => {
    setCheckedTypes((prev) => ({ ...prev, [type]: !prev[type] }));
  }, []);

  const selectedCount = CONSENT_TYPES.filter((ct) => checkedTypes[ct]).length;
  const hasPin = pin.length >= 4;
  const canSubmit = selectedCount > 0 && hasPin && !submitting;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    clearError();

    const typesToGrant = CONSENT_TYPES.filter((ct) => checkedTypes[ct]);
    let allSuccess = true;

    for (const consentType of typesToGrant) {
      const alreadyActive = consentStatus?.consents.some(
        (c) => c.consent_type === consentType && c.active,
      );
      if (alreadyActive) continue;

      const success = await grantConsent(profileId, consentType, pin);
      if (!success) {
        allSuccess = false;
        break;
      }
    }

    setSubmitting(false);

    if (allSuccess) {
      consentLogger.info('Biometric consents granted', {
        profileId,
        types: typesToGrant.join(','),
      });
      onConsentGranted();
    }
  }, [
    canSubmit,
    checkedTypes,
    consentStatus,
    grantConsent,
    profileId,
    pin,
    clearError,
    onConsentGranted,
  ]);

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-6 backdrop-blur-md">
      <h3 className="text-lg font-semibold text-white/90 mb-4">
        {t('zehAni.consent.biometric.title')}
      </h3>

      <p className="text-sm text-white/60 mb-6">
        {t('zehAni.consent.biometric.description')}
      </p>

      <div className="flex flex-col gap-3 mb-6">
        {CONSENT_TYPES.map((type) => {
          const isActive = consentStatus?.consents.some(
            (c) => c.consent_type === type && c.active,
          );
          return (
            <label
              key={type}
              className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <input
                type="checkbox"
                checked={checkedTypes[type]}
                onChange={() => handleToggle(type)}
                disabled={isActive}
                className="w-4 h-4 rounded border-white/30 bg-transparent accent-blue-500"
              />
              <div className="flex flex-col">
                <span className="text-sm text-white/80">
                  {t(`zehAni.consent.biometric.types.${type}`)}
                </span>
                <span className="text-xs text-white/40">
                  {isActive
                    ? t('zehAni.consent.biometric.alreadyGranted')
                    : t(`zehAni.consent.biometric.typeDescriptions.${type}`)}
                </span>
              </div>
            </label>
          );
        })}
      </div>

      <div className="mb-6">
        <label htmlFor="consent-pin" className="block text-sm text-white/60 mb-2">
          {t('zehAni.consent.biometric.pinLabel')}
        </label>
        <input
          id="consent-pin"
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/15 text-white placeholder-white/30 text-sm focus:outline-none focus:border-blue-500/50 transition-colors"
          placeholder={t('zehAni.consent.biometric.pinPlaceholder')}
        />
      </div>

      {error && (
        <p className="text-sm text-red-400 mb-4">{error}</p>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-white/10 disabled:text-white/30 text-white font-medium text-sm transition-colors"
      >
        {submitting
          ? t('zehAni.consent.biometric.submitting')
          : t('zehAni.consent.biometric.submit')}
      </button>
    </div>
  );
}
