import React, { Suspense, useCallback, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import { useTranslation } from 'react-i18next';
import logger from '@bayit/shared-utils/logger';
import type { GLTF } from 'three-stdlib';

const viewerLogger = logger.scope('Avatar3DViewer');

interface Avatar3DViewerProps {
  avatarId: string;
  glbUrl: string;
}

interface AvatarModelProps {
  url: string;
  onLoadComplete: () => void;
}

function AvatarModel({ url, onLoadComplete }: AvatarModelProps) {
  const gltf = useGLTF(url) as GLTF;

  React.useEffect(() => {
    if (gltf?.scene) {
      onLoadComplete();
    }
  }, [gltf, onLoadComplete]);

  if (!gltf?.scene) throw new Error('gltf_load_failed');

  return <primitive object={gltf.scene} dispose={null} />;
}

function LoadingFallback() {
  const { t } = useTranslation();

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
      <div className="w-8 h-8 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
      <p className="text-sm text-white/60">{t('zehAni.viewer.loading')}</p>
    </div>
  );
}

const CAMERA_POSITION: [number, number, number] = [0, 1.2, 2.5];
const CAMERA_FOV = 45;
const AMBIENT_LIGHT_INTENSITY = 0.6;
const DIRECTIONAL_LIGHT_INTENSITY = 0.8;
const DIRECTIONAL_LIGHT_POSITION: [number, number, number] = [2, 3, 4];
const MIN_DISTANCE = 1;
const MAX_DISTANCE = 5;
const MAX_POLAR_ANGLE = Math.PI / 1.8;

export function Avatar3DViewer(props: Avatar3DViewerProps) {
  return <AvatarViewerSession key={`${props.avatarId}:${props.glbUrl}`} {...props} />;
}

function AvatarViewerSession({ avatarId, glbUrl }: Avatar3DViewerProps) {
  const { t } = useTranslation();
  const [loaded, setLoaded] = useState(false);

  const handleLoadComplete = useCallback(() => {
    setLoaded(true);
    viewerLogger.info('Avatar model loaded', { avatarId });
  }, [avatarId]);

  return (
    <ErrorBoundary
      onError={() => viewerLogger.error('Avatar model load failed', { avatarId })}
      onReset={() => {
        useGLTF.clear(glbUrl);
        setLoaded(false);
      }}
      fallbackRender={({ resetErrorBoundary }: { resetErrorBoundary: () => void }) => (
        <div role="alert" className="rounded-2xl bg-white/5 border border-white/10 p-8 backdrop-blur-md flex flex-col items-center justify-center gap-4 min-h-[400px]">
          <p className="text-sm text-red-400 text-center">{t('zehAni.viewer.errors.loadFailed')}</p>
          <button type="button" onClick={resetErrorBoundary}
            className="px-4 py-2 rounded-lg bg-white/10 text-white/80 text-sm hover:bg-white/20 transition-colors">
            {t('common.retry')}
          </button>
        </div>
      )}
    >
    <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md overflow-hidden relative min-h-[400px]">
      {!loaded && <LoadingFallback />}

      <Canvas
        camera={{
          position: CAMERA_POSITION,
          fov: CAMERA_FOV,
        }}
        className="w-full h-full"
        style={{ minHeight: 400, background: 'transparent' }}
        gl={{ alpha: true, antialias: true }}
      >
        <ambientLight intensity={AMBIENT_LIGHT_INTENSITY} />
        <directionalLight
          position={DIRECTIONAL_LIGHT_POSITION}
          intensity={DIRECTIONAL_LIGHT_INTENSITY}
          castShadow
        />

        <OrbitControls
          enablePan={false}
          minDistance={MIN_DISTANCE}
          maxDistance={MAX_DISTANCE}
          maxPolarAngle={MAX_POLAR_ANGLE}
        />

        <Suspense fallback={null}>
          <AvatarModel
            url={glbUrl}
            onLoadComplete={handleLoadComplete}
          />
        </Suspense>
      </Canvas>
    </div>
    </ErrorBoundary>
  );
}
