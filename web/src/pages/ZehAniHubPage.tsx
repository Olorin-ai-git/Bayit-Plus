import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { GlassCard, GlassButton } from '@bayit/glass';
import logger from '@bayit/shared-utils/logger';

const hubLogger = logger.scope('ZehAniHubPage');

interface FeatureCard {
  icon: string;
  titleKey: string;
  descKey: string;
  route: string;
  requiresAvatar?: boolean;
}

const features: FeatureCard[] = [
  {
    icon: '🪞',
    titleKey: 'zehAni.hub.magicMirror',
    descKey: 'zehAni.hub.magicMirrorDesc',
    route: '/zeh-ani/magic-mirror',
  },
  {
    icon: '🎬',
    titleKey: 'zehAni.hub.movieInteractions',
    descKey: 'zehAni.hub.movieInteractionsDesc',
    route: '/zeh-ani/movie-interactions',
    requiresAvatar: true,
  },
  {
    icon: '🎤',
    titleKey: 'zehAni.hub.v2v',
    descKey: 'zehAni.hub.v2vDesc',
    route: '/zeh-ani/v2v',
    requiresAvatar: true,
  },
  {
    icon: '👥',
    titleKey: 'zehAni.hub.contacts',
    descKey: 'zehAni.hub.contactsDesc',
    route: '/zeh-ani/contacts',
  },
  {
    icon: '📬',
    titleKey: 'zehAni.hub.feedback',
    descKey: 'zehAni.hub.feedbackDesc',
    route: '/zeh-ani/feedback',
  },
  {
    icon: '🎨',
    titleKey: 'zehAni.hub.avatar3d',
    descKey: 'zehAni.hub.avatar3dDesc',
    route: '/zeh-ani/avatar',
    requiresAvatar: true,
  },
];

export default function ZehAniHubPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, currentProfile } = useAuthStore();

  useEffect(() => {
    hubLogger.info('Zeh Ani Hub page loaded', {
      userId: user?.id,
      profileId: currentProfile?.id,
    });
  }, [user?.id, currentProfile?.id]);

  const handleFeatureClick = (route: string) => {
    hubLogger.info('Feature card clicked', { route });
    navigate(route);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background/90 px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            {t('zehAni.hub.title')}
          </h1>
          <p className="text-lg text-white/70 max-w-2xl mx-auto">
            {t('zehAni.hub.subtitle')}
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <GlassCard
              key={feature.route}
              className="group hover:scale-105 transition-all duration-300 cursor-pointer"
              onClick={() => handleFeatureClick(feature.route)}
            >
              <div className="p-6">
                <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  {t(feature.titleKey)}
                </h3>
                <p className="text-sm text-white/60">
                  {t(feature.descKey)}
                </p>
                {feature.requiresAvatar && (
                  <div className="mt-4 text-xs text-primary-400">
                    {t('zehAni.hub.requiresAvatar')}
                  </div>
                )}
              </div>
            </GlassCard>
          ))}
        </div>

        {/* Consent Notice */}
        <GlassCard className="mt-8 border border-warning-500/30">
          <div className="p-6 flex items-start gap-4">
            <span className="text-2xl">🔒</span>
            <div>
              <h4 className="text-lg font-semibold text-white mb-2">
                {t('zehAni.hub.consent')}
              </h4>
              <p className="text-sm text-white/70 mb-4">
                {t('zehAni.hub.consentDesc')}
              </p>
              <GlassButton
                variant="secondary"
                size="sm"
                onClick={() => navigate('/zeh-ani/consent')}
              >
                {t('zehAni.hub.manageConsent')}
              </GlassButton>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
