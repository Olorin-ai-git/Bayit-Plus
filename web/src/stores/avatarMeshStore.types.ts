export interface MeshBlendShape {
  name: string;
  default_weight: number;
}

export interface AvatarMeshStatus {
  id: string;
  avatar_id: string;
  user_id: string;
  status: string;
  glb_gcs_path: string | null;
  thumbnail_gcs_path: string | null;
  blend_shapes: MeshBlendShape[];
  bone_count: number;
  vertex_count: number;
  credits_charged: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface MeshGlbUrl {
  avatar_id: string;
  signed_url: string;
  expires_in_seconds: number;
}

export interface BiometricConsentEntry {
  consent_type: string;
  active: boolean;
}

export interface BiometricConsentStatus {
  profile_id: string;
  consents: BiometricConsentEntry[];
}

export interface AvatarMeshStore {
  mesh: AvatarMeshStatus | null;
  glbUrl: MeshGlbUrl | null;
  consentStatus: BiometricConsentStatus | null;
  loading: boolean;
  error: string | null;

  generateMesh: (avatarId: string, profileId: string, pin: string) => Promise<void>;
  fetchMeshStatus: (avatarId: string) => Promise<void>;
  fetchGlbUrl: (avatarId: string) => Promise<void>;
  grantConsent: (profileId: string, consentType: string, pin: string) => Promise<boolean>;
  checkConsent: (profileId: string) => Promise<void>;
  revokeConsent: (profileId: string, consentType: string) => Promise<boolean>;
  clearError: () => void;
}
