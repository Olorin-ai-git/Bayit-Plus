import React, { Suspense, useRef, useEffect, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { useTranslation } from 'react-i18next';
import logger from '@bayit/shared-utils/logger';
import type { GLTF } from 'three-stdlib';
import type { SkinnedMesh } from 'three';
import type { LipsyncWeights } from '@/stores/liveLayerStore.types';

const overlayLogger = logger.scope('LiveAvatarOverlay');

interface LiveAvatarOverlayProps {
  avatarId: string;
  glbUrl: string;
  lipsyncWeights: LipsyncWeights | null;
}

interface AvatarMeshProps {
  url: string;
  lipsyncWeights: LipsyncWeights | null;
  onLoaded: () => void;
  onError: (msg: string) => void;
}

const CAMERA_POSITION: [number, number, number] = [0, 1.4, 1.8];
const CAMERA_FOV = 35;
const AMBIENT_INTENSITY = 0.7;
const DIR_LIGHT_INTENSITY = 0.9;
const DIR_LIGHT_POS: [number, number, number] = [1.5, 2, 3];
const WEIGHT_LERP_FACTOR = 0.15;

function AvatarMesh({ url, lipsyncWeights, onLoaded, onError }: AvatarMeshProps) {
  const gltf = useGLTF(url) as GLTF;
  const meshRef = useRef<SkinnedMesh | null>(null);
  const weightsRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (gltf?.scene) {
      gltf.scene.traverse((child) => {
        if ((child as SkinnedMesh).isSkinnedMesh) {
          meshRef.current = child as SkinnedMesh;
        }
      });
      onLoaded();
    } else {
      onError('gltf_scene_missing');
    }
  }, [gltf, onLoaded, onError]);

  useEffect(() => {
    if (lipsyncWeights) {
      weightsRef.current = { ...lipsyncWeights.weights };
    }
  }, [lipsyncWeights]);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh?.morphTargetDictionary || !mesh.morphTargetInfluences) return;

    const targetWeights = weightsRef.current;
    const dict = mesh.morphTargetDictionary;
    const influences = mesh.morphTargetInfluences;

    for (const [name, targetValue] of Object.entries(targetWeights)) {
      const index = dict[name];
      if (index !== undefined) {
        const current = influences[index] || 0;
        influences[index] = current + (targetValue - current) * WEIGHT_LERP_FACTOR;
      }
    }
  });

  if (!gltf?.scene) return null;

  return <primitive object={gltf.scene} dispose={null} />;
}

export function LiveAvatarOverlay({
  avatarId,
  glbUrl,
  lipsyncWeights,
}: LiveAvatarOverlayProps) {
  const { t } = useTranslation();
  const [loaded, setLoaded] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const handleLoaded = useCallback(() => {
    setLoaded(true);
    setLoadError(null);
    overlayLogger.info('Live avatar overlay loaded', { avatarId });
  }, [avatarId]);

  const handleError = useCallback(
    (msg: string) => {
      setLoadError(msg);
      overlayLogger.error('Live avatar overlay failed to load', { avatarId, msg });
    },
    [avatarId],
  );

  if (loadError) {
    return (
      <div className="absolute bottom-4 right-4 z-30 w-32 h-32 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
        <p className="text-xs text-red-400 text-center px-2">
          {t('zehAni.liveLayer.errors.overlayLoadFailed')}
        </p>
      </div>
    );
  }

  return (
    <div className="absolute bottom-4 right-4 z-30 w-40 h-40 rounded-xl overflow-hidden border border-white/15 shadow-lg">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <div className="w-5 h-5 border-2 border-white/20 border-t-white/70 rounded-full animate-spin" />
        </div>
      )}

      <Canvas
        camera={{ position: CAMERA_POSITION, fov: CAMERA_FOV }}
        gl={{ alpha: true, antialias: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={AMBIENT_INTENSITY} />
        <directionalLight
          position={DIR_LIGHT_POS}
          intensity={DIR_LIGHT_INTENSITY}
        />
        <Suspense fallback={null}>
          <AvatarMesh
            url={glbUrl}
            lipsyncWeights={lipsyncWeights}
            onLoaded={handleLoaded}
            onError={handleError}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
