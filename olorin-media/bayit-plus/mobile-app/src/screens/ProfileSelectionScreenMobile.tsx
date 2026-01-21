/**
 * ProfileSelectionScreenMobile - Mobile-optimized Netflix-style profile picker
 *
 * Features:
 * - 2-3 column profile grid
 * - PIN via native keyboard
 * - Biometric auth (Face ID/Touch ID)
 * - RTL support
 * - Haptic feedback
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  ScrollView,
  SafeAreaView,
  Modal,
  Alert,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import * as BiometricAuth from '../utils/biometricAuth';
import { useProfile, Profile } from '@bayit/shared-contexts';
import { useDirection } from '@bayit/shared-hooks';
import { useResponsive } from '../hooks/useResponsive';
import { getGridColumns } from '../utils/responsive';
import { spacing, colors, borderRadius } from '../theme';

const AVATAR_COLORS = [
  '#a855f7',
  '#ff6b6b',
  '#4ecdc4',
  '#ffd93d',
  '#6c5ce7',
  '#a8e6cf',
  '#ff8b94',
  '#ffaaa5',
];

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

  const handlePress = useCallback(() => {
    ReactNativeHapticFeedback.trigger('impactMedium');
    onSelect(profile);
  }, [profile, onSelect]);

  return (
    <TouchableOpacity
      style={[
        styles.profileCard,
        isSelected && styles.profileCardSelected,
        isManageMode && styles.profileCardManage,
      ]}
      onPress={handlePress}
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
            <Text style={styles.kidsIcon}>👶</Text>
          </View>
        )}
        {profile.has_pin && (
          <View style={styles.pinIndicator}>
            <Text style={styles.pinIcon}>🔒</Text>
          </View>
        )}
      </View>
      <Text style={styles.profileName} numberOfLines={1}>
        {profile.name}
      </Text>
      {isManageMode && (
        <View style={styles.editOverlay}>
          <Text style={styles.editIcon}>✏️</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

interface PinModalProps {
  visible: boolean;
  onSubmit: (pin: string) => void;
  onCancel: () => void;
  onBiometric: () => void;
  hasBiometric: boolean;
  error?: string;
  isLoading?: boolean;
}

const PinModal: React.FC<PinModalProps> = ({
  visible,
  onSubmit,
  onCancel,
  onBiometric,
  hasBiometric,
  error,
  isLoading,
}) => {
  const { t } = useTranslation();
  const [pin, setPin] = useState('');
  const inputRef = useRef<TextInput>(null);
  const { isRTL } = useDirection();

  useEffect(() => {
    if (visible) {
      setPin('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [visible]);

  const handleSubmit = useCallback(() => {
    if (pin.length >= 4) {
      ReactNativeHapticFeedback.trigger('impactLight');
      onSubmit(pin);
    }
  }, [pin, onSubmit]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.pinModal}>
          <Text style={styles.pinTitle}>{t('profiles.enterPin', 'Enter PIN')}</Text>

          <TextInput
            ref={inputRef}
            style={[styles.pinInput, { textAlign: isRTL ? 'right' : 'center' }]}
            value={pin}
            onChangeText={setPin}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={6}
            placeholder="••••"
            placeholderTextColor={colors.textSecondary}
            onSubmitEditing={handleSubmit}
          />

          {error && <Text style={styles.pinError}>{error}</Text>}

          <View style={styles.pinButtons}>
            <TouchableOpacity
              style={styles.pinCancelButton}
              onPress={() => {
                ReactNativeHapticFeedback.trigger('impactLight');
                onCancel();
              }}
            >
              <Text style={styles.pinCancelText}>{t('common.cancel', 'Cancel')}</Text>
            </TouchableOpacity>

            {hasBiometric && (
              <TouchableOpacity
                style={styles.biometricButton}
                onPress={() => {
                  ReactNativeHapticFeedback.trigger('impactLight');
                  onBiometric();
                }}
              >
                <Text style={styles.biometricIcon}>👆</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.pinSubmitButton, pin.length < 4 && styles.pinSubmitDisabled]}
              onPress={handleSubmit}
              disabled={pin.length < 4 || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.text} />
              ) : (
                <Text style={styles.pinSubmitText}>{t('common.confirm', 'Confirm')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export const ProfileSelectionScreenMobile: React.FC = () => {
  const { t } = useTranslation();
  const { isRTL } = useDirection();
  const navigation = useNavigation<any>();
  const { isPhone } = useResponsive();
  const {
    profiles,
    isLoading,
    error,
    selectProfile,
    fetchProfiles,
  } = useProfile();

  const [isManageMode, setIsManageMode] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinError, setPinError] = useState('');
  const [hasBiometric, setHasBiometric] = useState(false);
  const [biometricType, setBiometricType] = useState<'fingerprint' | 'face' | 'none'>('none');

  // Responsive columns: 2 on phone, 3 on tablet
  const numColumns = getGridColumns({ phone: 2, tablet: 3 });

  useEffect(() => {
    fetchProfiles();
    checkBiometrics();
  }, []);

  const checkBiometrics = async () => {
    try {
      const compatible = await BiometricAuth.hasHardwareAsync();
      if (compatible) {
        const types = await BiometricAuth.supportedAuthenticationTypesAsync();
        if (types.includes(BiometricAuth.AuthenticationType.FACIAL_RECOGNITION)) {
          setBiometricType('face');
          setHasBiometric(true);
        } else if (types.includes(BiometricAuth.AuthenticationType.FINGERPRINT)) {
          setBiometricType('fingerprint');
          setHasBiometric(true);
        }
      }
    } catch (error) {
      console.error('Biometric check failed:', error);
    }
  };

  const handleProfileSelect = useCallback(async (profile: Profile) => {
    if (isManageMode) {
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
      ReactNativeHapticFeedback.trigger('notificationSuccess');
      navigation.replace('Main');
    } catch (err: any) {
      ReactNativeHapticFeedback.trigger('notificationError');
      setPinError(err.detail || t('profiles.selectFailed', 'Failed to select profile'));
    }
  }, [isManageMode, navigation, selectProfile, t]);

  const handlePinSubmit = useCallback(async (pin: string) => {
    if (!selectedProfile) return;

    try {
      await selectProfile(selectedProfile.id, pin);
      setShowPinModal(false);
      setSelectedProfile(null);
      ReactNativeHapticFeedback.trigger('notificationSuccess');
      navigation.replace('Main');
    } catch (err: any) {
      ReactNativeHapticFeedback.trigger('notificationError');
      setPinError(err.detail || t('profiles.incorrectPin', 'Incorrect PIN'));
    }
  }, [selectedProfile, selectProfile, navigation, t]);

  const handleBiometricAuth = useCallback(async () => {
    if (!selectedProfile) return;

    try {
      const result = await BiometricAuth.authenticateAsync({
        promptMessage: t('profiles.biometricPrompt', 'Authenticate to access profile'),
        cancelLabel: t('common.cancel', 'Cancel'),
        fallbackLabel: t('profiles.usePin', 'Use PIN'),
      });

      if (result.success) {
        // Biometric success - still need to verify with backend
        // For now, we'll bypass PIN for biometric-authenticated profiles
        await selectProfile(selectedProfile.id);
        setShowPinModal(false);
        setSelectedProfile(null);
        ReactNativeHapticFeedback.trigger('notificationSuccess');
        navigation.replace('Main');
      }
    } catch (err: any) {
      console.error('Biometric auth failed:', err);
      ReactNativeHapticFeedback.trigger('notificationError');
    }
  }, [selectedProfile, selectProfile, navigation, t]);

  const handleAddProfile = useCallback(() => {
    ReactNativeHapticFeedback.trigger('impactLight');
    navigation.navigate('CreateProfile');
  }, [navigation]);

  const canAddProfile = profiles.length < 5;

  if (isLoading && profiles.length === 0) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('common.loading', 'Loading...')}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../../../shared/assets/images/logos/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Title */}
        <Text style={styles.title}>
          {isManageMode
            ? t('profiles.manageProfiles', 'Manage Profiles')
            : t('profiles.whoIsWatching', "Who's Watching?")}
        </Text>

        {/* Profiles Grid */}
        <View
          style={[
            styles.profilesContainer,
            { flexDirection: isRTL ? 'row-reverse' : 'row' },
          ]}
        >
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
          onPress={() => {
            ReactNativeHapticFeedback.trigger('impactLight');
            setIsManageMode(!isManageMode);
          }}
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
        onBiometric={handleBiometricAuth}
        hasBiometric={hasBiometric && !!selectedProfile}
        error={pinError}
        isLoading={isLoading}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: colors.textSecondary,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  logoContainer: {
    marginBottom: spacing.xl,
  },
  logo: {
    width: 120,
    height: 44,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  profilesContainer: {
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'flex-start',
    maxWidth: 400,
    gap: spacing.lg,
  },
  profileCard: {
    alignItems: 'center',
    width: 100,
  },
  profileCardSelected: {
    opacity: 0.7,
  },
  profileCardManage: {
    opacity: 0.9,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  avatarEmoji: {
    fontSize: 40,
  },
  avatarInitials: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
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
    maxWidth: 100,
  },
  editOverlay: {
    position: 'absolute',
    top: 0,
    left: 10,
    width: 80,
    height: 80,
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
    width: 100,
  },
  addAvatar: {
    width: 80,
    height: 80,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderStyle: 'dashed',
  },
  addIcon: {
    fontSize: 32,
    color: colors.textSecondary,
    fontWeight: '300',
  },
  addProfileText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  manageButton: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.textSecondary,
    minHeight: 48,
    justifyContent: 'center',
  },
  manageButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  errorText: {
    marginTop: spacing.lg,
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
  },
  // PIN Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  pinModal: {
    width: '100%',
    maxWidth: 320,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
  },
  pinTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.lg,
  },
  pinInput: {
    width: '100%',
    height: 56,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    fontSize: 24,
    color: colors.text,
    letterSpacing: 8,
    marginBottom: spacing.md,
  },
  pinError: {
    fontSize: 14,
    color: colors.error,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  pinButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  pinCancelButton: {
    flex: 1,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  pinCancelText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  biometricButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(126, 34, 206, 0.2)',
  },
  biometricIcon: {
    fontSize: 24,
  },
  pinSubmitButton: {
    flex: 1,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
  },
  pinSubmitDisabled: {
    opacity: 0.5,
  },
  pinSubmitText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
});

export default ProfileSelectionScreenMobile;
