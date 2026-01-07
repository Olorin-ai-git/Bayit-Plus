/**
 * ProfileSelectionScreen - Netflix-style profile picker
 * Shows when user logs in and has multiple profiles
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useProfile, Profile } from '../contexts/ProfileContext';
import { AnimatedLogo, GlassView } from '../components';
import { colors } from '../theme';
import { useDirection } from '@bayit/shared/hooks';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PROFILE_SIZE = Platform.OS === 'web' ? 140 : 100;

// Profile avatar colors
const AVATAR_COLORS = [
  '#00d9ff', // Cyan
  '#ff6b6b', // Red
  '#4ecdc4', // Teal
  '#ffd93d', // Yellow
  '#6c5ce7', // Purple
  '#a8e6cf', // Mint
  '#ff8b94', // Pink
  '#ffaaa5', // Coral
];

// Profile avatar emojis
const AVATAR_EMOJIS = ['', '', '', '', '', '', '', '', '', ''];

interface ProfileCardProps {
  profile: Profile;
  onSelect: (profile: Profile) => void;
  isSelected: boolean;
  isManageMode: boolean;
}

const ProfileCard: React.FC<ProfileCardProps> = ({
  profile,
  onSelect,
  isSelected,
  isManageMode,
}) => {
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <TouchableOpacity
      style={[
        styles.profileCard,
        isSelected && styles.profileCardSelected,
        isManageMode && styles.profileCardManage,
      ]}
      onPress={() => onSelect(profile)}
      activeOpacity={0.7}
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
        {profile.is_kids_profile && (
          <View style={styles.kidsIndicator}>
            <Text style={styles.kidsIcon}></Text>
          </View>
        )}
        {profile.has_pin && (
          <View style={styles.pinIndicator}>
            <Text style={styles.pinIcon}></Text>
          </View>
        )}
      </View>
      <Text style={styles.profileName} numberOfLines={1}>
        {profile.name}
      </Text>
      {isManageMode && (
        <View style={styles.editOverlay}>
          <Text style={styles.editIcon}></Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

interface PinModalProps {
  visible: boolean;
  onSubmit: (pin: string) => void;
  onCancel: () => void;
  error?: string;
  isLoading?: boolean;
}

const PinModal: React.FC<PinModalProps> = ({
  visible,
  onSubmit,
  onCancel,
  error,
  isLoading,
}) => {
  const { t } = useTranslation();
  const [pin, setPin] = useState('');
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setPin('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [visible]);

  if (!visible) return null;

  const handleSubmit = () => {
    if (pin.length >= 4) {
      onSubmit(pin);
    }
  };

  return (
    <View style={styles.modalOverlay}>
      <GlassView intensity="high" style={styles.pinModal}>
        <Text style={styles.pinTitle}>{t('profiles.enterPin', 'Enter PIN')}</Text>
        <TextInput
          ref={inputRef}
          style={styles.pinInput}
          value={pin}
          onChangeText={setPin}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={6}
          placeholder="••••"
          placeholderTextColor="#666666"
          onSubmitEditing={handleSubmit}
        />
        {error && <Text style={styles.pinError}>{error}</Text>}
        <View style={styles.pinButtons}>
          <TouchableOpacity style={styles.pinCancelButton} onPress={onCancel}>
            <Text style={styles.pinCancelText}>{t('common.cancel', 'Cancel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.pinSubmitButton, pin.length < 4 && styles.pinSubmitDisabled]}
            onPress={handleSubmit}
            disabled={pin.length < 4 || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.pinSubmitText}>{t('common.confirm', 'Confirm')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </GlassView>
    </View>
  );
};

export const ProfileSelectionScreen: React.FC = () => {
  const { t } = useTranslation();
  const { isRTL } = useDirection();
  const navigation = useNavigation<any>();
  const {
    profiles,
    isLoading,
    error,
    selectProfile,
    fetchProfiles,
    setNeedsProfileSelection,
  } = useProfile();

  const [isManageMode, setIsManageMode] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinError, setPinError] = useState('');

  useEffect(() => {
    fetchProfiles();
  }, []);

  const handleProfileSelect = async (profile: Profile) => {
    if (isManageMode) {
      // Navigate to edit profile
      navigation.navigate('EditProfile', { profileId: profile.id });
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
      navigation.replace('Main');
    } catch (err: any) {
      setPinError(err.detail || t('profiles.selectFailed', 'Failed to select profile'));
    }
  };

  const handlePinSubmit = async (pin: string) => {
    if (!selectedProfile) return;

    try {
      await selectProfile(selectedProfile.id, pin);
      setShowPinModal(false);
      setSelectedProfile(null);
      navigation.replace('Main');
    } catch (err: any) {
      setPinError(err.detail || t('profiles.incorrectPin', 'Incorrect PIN'));
    }
  };

  const handleAddProfile = () => {
    navigation.navigate('CreateProfile');
  };

  const canAddProfile = profiles.length < 5; // Max 5 profiles

  if (isLoading && profiles.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('common.loading', 'Loading...')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Background */}
      <View style={styles.backgroundGradient} pointerEvents="none" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <AnimatedLogo size="medium" />
        </View>

        {/* Title */}
        <Text style={styles.title}>
          {isManageMode
            ? t('profiles.manageProfiles', 'Manage Profiles')
            : t('profiles.whoIsWatching', "Who's Watching?")}
        </Text>

        {/* Profiles Grid */}
        <View style={[styles.profilesContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {profiles.map(profile => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              onSelect={handleProfileSelect}
              isSelected={selectedProfile?.id === profile.id}
              isManageMode={isManageMode}
            />
          ))}

          {/* Add Profile Button */}
          {canAddProfile && (
            <TouchableOpacity
              style={styles.addProfileCard}
              onPress={handleAddProfile}
              activeOpacity={0.7}
            >
              <View style={styles.addAvatar}>
                <Text style={styles.addIcon}>+</Text>
              </View>
              <Text style={styles.addProfileText}>
                {t('profiles.addProfile', 'Add Profile')}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Manage Profiles Button */}
        <TouchableOpacity
          style={styles.manageButton}
          onPress={() => setIsManageMode(!isManageMode)}
        >
          <Text style={styles.manageButtonText}>
            {isManageMode
              ? t('common.done', 'Done')
              : t('profiles.manageProfiles', 'Manage Profiles')}
          </Text>
        </TouchableOpacity>

        {error && <Text style={styles.errorText}>{error}</Text>}
      </ScrollView>

      {/* PIN Modal */}
      <PinModal
        visible={showPinModal}
        onSubmit={handlePinSubmit}
        onCancel={() => {
          setShowPinModal(false);
          setSelectedProfile(null);
          setPinError('');
        }}
        error={pinError}
        isLoading={isLoading}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 217, 255, 0.03)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  logoContainer: {
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 40,
    textAlign: 'center',
  },
  profilesContainer: {
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'flex-start',
    maxWidth: 700,
    gap: 24,
  },
  profileCard: {
    alignItems: 'center',
    width: PROFILE_SIZE + 20,
  },
  profileCardSelected: {
    opacity: 0.7,
  },
  profileCardManage: {
    opacity: 0.9,
  },
  avatar: {
    width: PROFILE_SIZE,
    height: PROFILE_SIZE,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  avatarEmoji: {
    fontSize: PROFILE_SIZE * 0.5,
  },
  avatarInitials: {
    fontSize: PROFILE_SIZE * 0.35,
    fontWeight: '700',
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  kidsIndicator: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    backgroundColor: '#ffd93d',
    borderRadius: 12,
    padding: 4,
  },
  kidsIcon: {
    fontSize: 12,
  },
  pinIndicator: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 10,
    padding: 4,
  },
  pinIcon: {
    fontSize: 10,
  },
  profileName: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: PROFILE_SIZE + 20,
  },
  editOverlay: {
    position: 'absolute',
    top: 0,
    left: (PROFILE_SIZE + 20 - PROFILE_SIZE) / 2,
    width: PROFILE_SIZE,
    height: PROFILE_SIZE,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editIcon: {
    fontSize: 24,
  },
  addProfileCard: {
    alignItems: 'center',
    width: PROFILE_SIZE + 20,
  },
  addAvatar: {
    width: PROFILE_SIZE,
    height: PROFILE_SIZE,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderStyle: 'dashed',
  },
  addIcon: {
    fontSize: PROFILE_SIZE * 0.4,
    color: colors.textSecondary,
    fontWeight: '300',
  },
  addProfileText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  manageButton: {
    marginTop: 40,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.textSecondary,
  },
  manageButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  errorText: {
    marginTop: 20,
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
  },
  // PIN Modal Styles
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinModal: {
    width: 320,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  pinTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 20,
  },
  pinInput: {
    width: '100%',
    height: 56,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 24,
    color: colors.text,
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: 16,
  },
  pinError: {
    fontSize: 14,
    color: colors.error,
    marginBottom: 16,
  },
  pinButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  pinCancelButton: {
    flex: 1,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  pinCancelText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  pinSubmitButton: {
    flex: 1,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  pinSubmitDisabled: {
    opacity: 0.5,
  },
  pinSubmitText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default ProfileSelectionScreen;
