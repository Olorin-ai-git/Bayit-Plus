import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { GlassCard, GlassButton } from '@bayit/glass';
import { MagicMirrorWidget } from '@/components/zeh-ani/MagicMirrorWidget';
import { Avatar3DViewer } from '@/components/zeh-ani/Avatar3DViewer';
import { useAvatarMeshStore } from '@/stores/avatarMeshStore';
import logger from '@bayit/shared-utils/logger';

const mmLogger = logger.scope('MagicMirrorPage');

export default function MagicMirrorPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentProfile } = useAuthStore();
  const { mesh, fetchMeshStatus, fetchGlbUrl, glbUrl } = useAvatarMeshStore();
  const [loading, setLoading] = useState(true);
  const [avatarId, setAvatarId] = useState<string | null>(null);

  useEffect(() => {
    const loadAvatarData = async () => {
      if (!currentProfile?.id) {
        mmLogger.warn('No profile selected');
        setLoading(false);
        return;
      }

      try {
        // Fetch avatar ID from profile's StarStory avatars
        const response = await fetch(`/api/v1/star-story/avatars/${currentProfile.id}`);
        if (response.ok) {
          const data = await response.json();
          if (data.avatars && data.avatars.length > 0) {
            const firstAvatar = data.avatars[0];
            setAvatarId(firstAvatar.avatar_id);

            // Fetch mesh status and GLB URL
            await fetchMeshStatus(firstAvatar.avatar_id);
            await fetchGlbUrl(firstAvatar.avatar_id);
          }
        }
      } catch (error) {
        mmLogger.error('Failed to load avatar data', error);
      } finally {
        setLoading(false);
      }
    };

    loadAvatarData();
  }, [currentProfile?.id, fetchMeshStatus, fetchGlbUrl]);

  if (!currentProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <GlassCard className="p-8 text-center">
          <p className="text-white/70 mb-4">{t('zehAni.magicMirror.noProfile')}</p>
          <GlassButton onClick={() => navigate('/profiles')}>
            {t('common.selectProfile')}
          </GlassButton>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background/90 px-4 py-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/zeh-ani')}
            className="text-white/60 hover:text-white mb-4 flex items-center gap-2"
          >
            ← {t('common.back')}
          </button>
          <h1 className="text-3xl font-bold text-white mb-2">
            🪞 {t('zehAni.magicMirror.title')}
          </h1>
          <p className="text-white/70">
            {t('zehAni.magicMirror.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Magic Mirror Widget */}
          <div className="lg:col-span-2">
            <MagicMirrorWidget profileId={currentProfile.id} />
          </div>

          {/* 3D Avatar Viewer */}
          {avatarId && glbUrl && mesh?.status === 'ready' && (
            <div className="lg:col-span-2">
              <GlassCard>
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-white mb-4">
                    {t('zehAni.magicMirror.avatarPreview')}
                  </h2>
                  <Avatar3DViewer
                    avatarId={avatarId}
                    glbUrl={glbUrl.signed_url}
                    autoRotate
                  />
                </div>
              </GlassCard>
            </div>
          )}

          {/* No Avatar State */}
          {!loading && !avatarId && (
            <div className="lg:col-span-2">
              <GlassCard className="p-8 text-center">
                <div className="text-5xl mb-4">🎭</div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  {t('zehAni.magicMirror.noAvatar')}
                </h3>
                <p className="text-white/70 mb-6">
                  {t('zehAni.magicMirror.noAvatarDesc')}
                </p>
                <GlassButton onClick={() => navigate('/star-story/create')}>
                  {t('zehAni.magicMirror.createAvatar')}
                </GlassButton>
              </GlassCard>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
