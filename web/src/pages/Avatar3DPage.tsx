import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { useAvatarMeshStore } from '@/stores/avatarMeshStore';
import { GlassCard, GlassButton } from '@bayit/glass';
import { Avatar3DViewer } from '@/components/zeh-ani/Avatar3DViewer';
import { MeshGenerationProgress } from '@/components/zeh-ani/MeshGenerationProgress';
import logger from '@bayit/shared-utils/logger';

const avatarLogger = logger.scope('Avatar3DPage');

export default function Avatar3DPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentProfile } = useAuthStore();
  const { mesh, glbUrl, fetchMeshStatus, fetchGlbUrl } = useAvatarMeshStore();
  const [loading, setLoading] = useState(true);
  const [avatarId, setAvatarId] = useState<string | null>(null);

  // Get avatar ID from URL params or fetch from profile
  useEffect(() => {
    const loadAvatar = async () => {
      const paramAvatarId = searchParams.get('avatarId');

      if (paramAvatarId) {
        setAvatarId(paramAvatarId);
        await fetchMeshStatus(paramAvatarId);
        await fetchGlbUrl(paramAvatarId);
        setLoading(false);
        return;
      }

      // Fetch from profile's StarStory avatars
      if (!currentProfile?.id) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/v1/star-story/avatars/${currentProfile.id}`);
        if (response.ok) {
          const data = await response.json();
          if (data.avatars && data.avatars.length > 0) {
            const firstAvatar = data.avatars[0];
            setAvatarId(firstAvatar.avatar_id);
            await fetchMeshStatus(firstAvatar.avatar_id);
            await fetchGlbUrl(firstAvatar.avatar_id);
          }
        }
      } catch (error) {
        avatarLogger.error('Failed to load avatar', error);
      } finally {
        setLoading(false);
      }
    };

    loadAvatar();
  }, [searchParams, currentProfile?.id, fetchMeshStatus, fetchGlbUrl]);

  if (!currentProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <GlassCard className="p-8 text-center">
          <p className="text-white/70">{t('zehAni.avatar.noProfile')}</p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background/90 px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/zeh-ani')}
            className="text-white/60 hover:text-white mb-4 flex items-center gap-2"
          >
            ← {t('common.back')}
          </button>
          <h1 className="text-3xl font-bold text-white mb-2">
            🎨 {t('zehAni.avatar.title')}
          </h1>
          <p className="text-white/70">
            {t('zehAni.avatar.subtitle')}
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-12 h-12 border-4 border-primary-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !avatarId ? (
          <GlassCard className="p-8 text-center">
            <div className="text-5xl mb-4">🎭</div>
            <h3 className="text-xl font-semibold text-white mb-2">
              {t('zehAni.avatar.noAvatar')}
            </h3>
            <p className="text-white/70 mb-6">
              {t('zehAni.avatar.noAvatarDesc')}
            </p>
            <GlassButton onClick={() => navigate('/star-story/create')}>
              {t('zehAni.avatar.createAvatar')}
            </GlassButton>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 3D Viewer */}
            <div className="lg:col-span-2">
              {mesh?.status === 'ready' && glbUrl ? (
                <Avatar3DViewer
                  avatarId={avatarId}
                  glbUrl={glbUrl.signed_url}
                  autoRotate
                  showControls
                />
              ) : (
                <MeshGenerationProgress avatarId={avatarId} />
              )}
            </div>

            {/* Info Panel */}
            <div className="lg:col-span-1 space-y-6">
              {/* Status Card */}
              <GlassCard>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">
                    {t('zehAni.avatar.status')}
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-white/60">{t('zehAni.avatar.meshStatus')}</span>
                      <span className="text-white font-medium">
                        {mesh?.status || 'unknown'}
                      </span>
                    </div>
                    {mesh?.blend_shapes && (
                      <div className="flex justify-between text-sm">
                        <span className="text-white/60">{t('zehAni.avatar.blendShapes')}</span>
                        <span className="text-white font-medium">
                          {mesh.blend_shapes.length}
                        </span>
                      </div>
                    )}
                    {mesh?.vertex_count && (
                      <div className="flex justify-between text-sm">
                        <span className="text-white/60">{t('zehAni.avatar.vertices')}</span>
                        <span className="text-white font-medium">
                          {mesh.vertex_count.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </GlassCard>

              {/* Actions */}
              <GlassCard>
                <div className="p-6 space-y-3">
                  <GlassButton
                    variant="secondary"
                    fullWidth
                    onClick={() => navigate('/star-story/create')}
                  >
                    {t('zehAni.avatar.reRecord')}
                  </GlassButton>
                  <GlassButton
                    variant="ghost"
                    fullWidth
                    onClick={() => window.open(glbUrl?.signed_url, '_blank')}
                    disabled={!glbUrl}
                  >
                    {t('zehAni.avatar.downloadMesh')}
                  </GlassButton>
                </div>
              </GlassCard>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
