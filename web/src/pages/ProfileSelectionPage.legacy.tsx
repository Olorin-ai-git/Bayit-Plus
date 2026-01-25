import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Image, ActivityIndicator } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useProfileStore } from '@/stores/profileStore';
import { useAuthStore } from '@/stores/authStore';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import { GlassButton, GlassModal, GlassInput } from '@bayit/shared/ui';

const AVATAR_COLORS = [
  '#a855f7', // Cyan
  '#ff6b6b', // Red
  '#4ecdc4', // Teal
  '#ffd93d', // Yellow
  '#6c5ce7', // Purple
  '#a8e6cf', // Mint
  '#ff8b94', // Pink
  '#ffaaa5', // Coral
];

interface Profile {
  id: string;
  name: string;
  avatar?: string;
  avatar_color?: string;
  is_kids_profile?: boolean;
  has_pin?: boolean;
}

function ProfileCard({ profile, onSelect, isManageMode }: {
  profile: Profile;
  onSelect: (profile: Profile) => void;
  isManageMode: boolean;
}) {
  const [isHovered, setIsHovered] = useState(false);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <Pressable
      onPress={() => onSelect(profile)}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      style={[styles.profileButton, isHovered && styles.profileButtonHovered]}
    >
      <View
        style={[
          styles.avatar,
          { backgroundColor: profile.avatar_color || AVATAR_COLORS[0] },
        ]}
      >
        {profile.avatar ? (
          <Text style={styles.avatarEmoji}>{profile.avatar}</Text>
        ) : (
          <Text style={styles.avatarInitials}>{getInitials(profile.name)}</Text>
        )}

        {/* Kids indicator */}
        {profile.is_kids_profile && (
          <View style={styles.kidsIndicator}>
            <Text style={styles.kidsIcon}>👶</Text>
          </View>
        )}

        {/* PIN indicator */}
        {profile.has_pin && (
          <View style={styles.pinIndicator}>
            <Lock size={12} color={colors.textMuted} />
          </View>
        )}

        {/* Edit overlay in manage mode */}
        {isManageMode && (
          <View style={styles.editOverlay}>
            <Edit2 size={24} color={colors.text} />
          </View>
        )}
      </View>

      <Text style={[styles.profileName, isHovered && styles.profileNameHovered]}>
        {profile.name}
      </Text>
    </Pressable>
  );
}

function AddProfileCard({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Pressable
      onPress={onClick}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      style={styles.profileButton}
    >
      <View style={[styles.addAvatar, isHovered && styles.addAvatarHovered]}>
        <Plus size={40} color={isHovered ? colors.primary : colors.textMuted} />
      </View>
      <Text style={[styles.addProfileText, isHovered && styles.addProfileTextHovered]}>
        {t('profiles.addProfile')}
      </Text>
    </Pressable>
  );
}

function PinModal({ isOpen, onClose, onSubmit, error, isLoading }: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (pin: string) => void;
  error: string;
  isLoading: boolean;
}) {
  const { t } = useTranslation();
  const [pin, setPin] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPin('');
    }
  }, [isOpen]);

  const handleSubmit = () => {
    if (pin.length >= 4) {
      onSubmit(pin);
    }
  };

  return (
    <GlassModal
      visible={isOpen}
      title={t('profiles.enterPin')}
      onClose={onClose}
      dismissable={true}
    >
      <GlassInput
        secureTextEntry
        keyboardType="numeric"
        maxLength={6}
        value={pin}
        onChangeText={(text) => setPin(text.replace(/\D/g, ''))}
        inputStyle={styles.pinInput}
        placeholder={t('placeholder.pin')}
        error={error}
        autoFocus
      />

      <View style={styles.modalButtons}>
        <GlassButton
          title={t('common.cancel')}
          onPress={onClose}
          style={styles.modalButton}
        />
        <GlassButton
          title={isLoading ? '' : t('common.confirm')}
          onPress={handleSubmit}
          disabled={pin.length < 4 || isLoading}
          variant="primary"
          style={styles.modalButton}
        />
      </View>
    </GlassModal>
  );
}

export default function ProfileSelectionPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const {
    profiles,
    isLoading,
    error,
    fetchProfiles,
    selectProfile,
  } = useProfileStore();

  const [isManageMode, setIsManageMode] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinError, setPinError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }
    fetchProfiles();
  }, [isAuthenticated]);

  const handleProfileSelect = async (profile: Profile) => {
    if (isManageMode) {
      navigate(`/profile/edit/${profile.id}`);
      return;
    }

    if (profile.has_pin) {
      setSelectedProfile(profile);
      setShowPinModal(true);
      setPinError('');
      return;
    }

    try {
      await selectProfile(profile.id);
      navigate('/', { replace: true });
    } catch (err: any) {
      setPinError(err.detail || t('profiles.selectError'));
    }
  };

  const handlePinSubmit = async (pin: string) => {
    if (!selectedProfile) return;

    try {
      await selectProfile(selectedProfile.id, pin);
      setShowPinModal(false);
      setSelectedProfile(null);
      navigate('/', { replace: true });
    } catch (err: any) {
      setPinError(err.detail || t('profiles.wrongPin'));
    }
  };

  const handleAddProfile = () => {
    navigate('/profile/create');
  };

  const canAddProfile = profiles.length < 5;

  if (isLoading && profiles.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('profiles.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Decorative blur circles */}
      <View style={[styles.blurCircle, styles.blurCirclePrimary]} />
      <View style={[styles.blurCircle, styles.blurCirclePurple]} />

      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={{ uri: '/assets/images/logos/logo.png' }}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Title */}
        <Text style={styles.title}>
          {isManageMode ? t('profiles.manage') : t('profiles.whoIsWatching')}
        </Text>

        {/* Profiles Grid */}
        <View style={styles.profilesGrid}>
          {profiles.map((profile: Profile) => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              onSelect={handleProfileSelect}
              isManageMode={isManageMode}
            />
          ))}

          {canAddProfile && !isManageMode && (
            <AddProfileCard onClick={handleAddProfile} />
          )}
        </View>

        {/* Manage Profiles Button */}
        <Pressable
          onPress={() => setIsManageMode(!isManageMode)}
          style={styles.manageButton}
        >
          <Text style={styles.manageButtonText}>
            {isManageMode ? t('common.done') : t('profiles.manageProfiles')}
          </Text>
        </Pressable>

        {/* Error */}
        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : null}
      </View>

      {/* PIN Modal */}
      <PinModal
        isOpen={showPinModal}
        onClose={() => {
          setShowPinModal(false);
          setSelectedProfile(null);
          setPinError('');
        }}
        onSubmit={handlePinSubmit}
        error={pinError}
        isLoading={isLoading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: '100vh' as any,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xl,
    position: 'relative',
  },
  blurCircle: {
    position: 'absolute',
    borderRadius: 9999,
    // @ts-ignore
    filter: 'blur(100px)',
  },
  blurCirclePrimary: {
    width: 320,
    height: 320,
    top: -160,
    right: -160,
    backgroundColor: colors.primary.DEFAULT,
    opacity: 0.5,
  },
  blurCirclePurple: {
    width: 256,
    height: 256,
    bottom: 80,
    left: -128,
    backgroundColor: colors.secondary.DEFAULT,
    opacity: 0.4,
  },
  content: {
    zIndex: 10,
    width: '100%',
    maxWidth: 900,
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: spacing.lg,
  },
  logo: {
    height: 64,
    width: 200,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  profilesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  profileButton: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  profileButtonHovered: {
    transform: [{ scale: 1.05 }],
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatarEmoji: {
    fontSize: 56,
  },
  avatarInitials: {
    fontSize: 40,
    fontWeight: 'bold',
    color: colors.text,
  },
  kidsIndicator: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#FBBF24',
    borderRadius: borderRadius.full,
    padding: 6,
  },
  kidsIcon: {
    fontSize: 14,
  },
  pinIndicator: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.backgroundLighter,
    borderRadius: borderRadius.full,
    padding: 6,
  },
  editOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileName: {
    fontSize: 14,
    color: colors.textMuted,
    maxWidth: 120,
    textAlign: 'center',
  },
  profileNameHovered: {
    color: colors.text,
  },
  addAvatar: {
    width: 120,
    height: 120,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.glass,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 30, 30, 0.3)',
  },
  addAvatarHovered: {
    borderColor: colors.primary.DEFAULT,
    backgroundColor: 'rgba(30, 30, 30, 0.5)',
  },
  addProfileText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  addProfileTextHovered: {
    color: colors.textSecondary,
  },
  manageButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glass,
  },
  manageButtonText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  loadingContainer: {
    flex: 1,
    minHeight: '100vh' as any,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textMuted,
  },
  errorText: {
    fontSize: 14,
    color: colors.error.DEFAULT,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  pinInput: {
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalButton: {
    flex: 1,
  },
});
