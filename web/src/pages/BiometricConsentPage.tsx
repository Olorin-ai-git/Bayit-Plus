import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { useAvatarMeshStore } from '@/stores/avatarMeshStore';
import { GlassCard, GlassButton } from '@bayit/glass';
import { BiometricConsentDialog } from '@/components/zeh-ani/BiometricConsentDialog';
import logger from '@bayit/shared-utils/logger';

const consentLogger = logger.scope('BiometricConsentPage');

const CONSENT_TYPES = [
  {
    type: 'mesh_generation',
    icon: '🎭',
    titleKey: 'zehAni.consent.mesh.title',
    descKey: 'zehAni.consent.mesh.desc',
    detailsKey: 'zehAni.consent.mesh.details',
  },
  {
    type: 'voice_v2v',
    icon: '🎤',
    titleKey: 'zehAni.consent.voice.title',
    descKey: 'zehAni.consent.voice.desc',
    detailsKey: 'zehAni.consent.voice.details',
  },
  {
    type: 'latent_features',
    icon: '🧠',
    titleKey: 'zehAni.consent.latent.title',
    descKey: 'zehAni.consent.latent.desc',
    detailsKey: 'zehAni.consent.latent.details',
  },
];

export default function BiometricConsentPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentProfile } = useAuthStore();
  const { consentStatus, checkConsent } = useAvatarMeshStore();
  const [showDialog, setShowDialog] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  useEffect(() => {
    if (currentProfile?.id) {
      checkConsent(currentProfile.id);
    }
  }, [currentProfile?.id, checkConsent]);

  const getConsentStatus = (type: string) => {
    if (!consentStatus?.consents) return false;
    return consentStatus.consents.some(
      (c) => c.consent_type === type && c.active
    );
  };

  const handleGrantConsent = (type: string) => {
    setSelectedType(type);
    setShowDialog(true);
  };

  const handleConsentSuccess = () => {
    setShowDialog(false);
    setSelectedType(null);
    if (currentProfile?.id) {
      checkConsent(currentProfile.id);
    }
  };

  if (!currentProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <GlassCard className="p-8 text-center">
          <p className="text-white/70">{t('zehAni.consent.noProfile')}</p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background/90 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/zeh-ani')}
            className="text-white/60 hover:text-white mb-4 flex items-center gap-2"
          >
            ← {t('common.back')}
          </button>
          <h1 className="text-3xl font-bold text-white mb-2">
            🔒 {t('zehAni.consent.title')}
          </h1>
          <p className="text-white/70">
            {t('zehAni.consent.subtitle')}
          </p>
        </div>

        {/* Important Notice */}
        <GlassCard className="mb-6 border border-warning-500/30">
          <div className="p-6">
            <div className="flex gap-4">
              <span className="text-2xl">⚠️</span>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {t('zehAni.consent.important')}
                </h3>
                <p className="text-sm text-white/70">
                  {t('zehAni.consent.importantDesc')}
                </p>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Consent Types */}
        <div className="space-y-4">
          {CONSENT_TYPES.map((consent) => {
            const hasConsent = getConsentStatus(consent.type);

            return (
              <GlassCard
                key={consent.type}
                className={hasConsent ? 'border border-success-500/30' : ''}
              >
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    <span className="text-4xl">{consent.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-xl font-semibold text-white">
                          {t(consent.titleKey)}
                        </h3>
                        {hasConsent && (
                          <span className="text-success-400 text-sm font-medium">
                            ✓ {t('zehAni.consent.active')}
                          </span>
                        )}
                      </div>
                      <p className="text-white/70 mb-4">{t(consent.descKey)}</p>
                      <details className="mb-4">
                        <summary className="cursor-pointer text-sm text-primary-400 hover:text-primary-300">
                          {t('zehAni.consent.readMore')}
                        </summary>
                        <p className="mt-3 text-sm text-white/60">
                          {t(consent.detailsKey)}
                        </p>
                      </details>
                      {!hasConsent && (
                        <GlassButton
                          variant="primary"
                          size="sm"
                          onClick={() => handleGrantConsent(consent.type)}
                        >
                          {t('zehAni.consent.grant')}
                        </GlassButton>
                      )}
                      {hasConsent && (
                        <GlassButton
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            consentLogger.info('Revoke consent clicked', {
                              type: consent.type,
                            });
                            // TODO: Implement revoke consent
                          }}
                        >
                          {t('zehAni.consent.revoke')}
                        </GlassButton>
                      )}
                    </div>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>

        {/* Consent Dialog */}
        {showDialog && selectedType && (
          <BiometricConsentDialog
            profileId={currentProfile.id}
            consentType={selectedType}
            onSuccess={handleConsentSuccess}
            onCancel={() => setShowDialog(false)}
          />
        )}
      </div>
    </div>
  );
}
