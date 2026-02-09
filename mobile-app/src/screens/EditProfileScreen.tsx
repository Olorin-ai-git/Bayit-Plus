/**
 * Edit Profile Screen
 *
 * Edit an existing user profile - name, avatar color, kids toggle.
 * Includes delete profile with confirmation.
 * Uses shared profilesService API and Glass UI components.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { profilesService } from '@bayit/shared-services/api';
import {
  GlassButton,
  GlassInput,
  GlassCard,
  GlassToggle,
  GlassModal,
  GlassErrorBanner,
  GlassLoadingSpinner,
  colors,
  spacing,
  borderRadius,
} from '@olorin/glass-ui/native';
import { logger } from '../utils/logger';
import { Colors } from '../theme/colors';

const log = logger.scope('EditProfileScreen');

type RouteParams = { profileId: string };

const AVATAR_COLORS = [
  { hex: Colors.Primary.p500, label: 'purple' },
  { hex: Colors.Error.e400, label: 'red' },
  { hex: Colors.Success.s400, label: 'green' },
  { hex: Colors.Warning.w400, label: 'yellow' },
  { hex: Colors.Secondary.s500, label: 'pink' },
  { hex: Colors.Info.i400, label: 'cyan' },
];

export const EditProfileScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<Record<string, RouteParams>, string>>();
  const profileId = route.params?.profileId;

  const [name, setName] = useState('');
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [isKidsProfile, setIsKidsProfile] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const canSave = name.trim().length > 0;

  useEffect(() => {
    loadProfile();
  }, [profileId]);

  const loadProfile = useCallback(async () => {
    if (!profileId) return;
    setIsLoading(true);
    try {
      const profile = await profilesService.getProfile(profileId) as {
        name: string;
        avatar_color?: string;
        is_kids_profile?: boolean;
      };
      setName(profile.name || '');
      setIsKidsProfile(profile.is_kids_profile || false);

      const colorIdx = AVATAR_COLORS.findIndex(
        (c) => c.hex.toLowerCase() === (profile.avatar_color || '').toLowerCase()
      );
      if (colorIdx >= 0) setSelectedColorIndex(colorIdx);
    } catch (err) {
      log.error('Failed to load profile', err);
      setError(t('profile.edit.error.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [profileId, t]);

  const getInitials = (): string => {
    return name
      .trim()
      .split(' ')
      .slice(0, 2)
      .map((word) => word.charAt(0))
      .join('')
      .toUpperCase();
  };

  const handleSave = useCallback(async () => {
    if (!canSave || !profileId) return;

    setIsSaving(true);
    setError(null);

    try {
      await profilesService.updateProfile(profileId, {
        name: name.trim(),
        avatar_color: AVATAR_COLORS[selectedColorIndex].hex,
        is_kids_profile: isKidsProfile,
      });
      log.info('Profile updated successfully');
      navigation.goBack();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('profile.edit.error.saveFailed');
      setError(message);
      log.error('Failed to update profile', err);
    } finally {
      setIsSaving(false);
    }
  }, [canSave, profileId, name, selectedColorIndex, isKidsProfile, navigation, t]);

  const handleDelete = useCallback(async () => {
    if (!profileId) return;

    setIsDeleting(true);
    setShowDeleteConfirm(false);

    try {
      await profilesService.deleteProfile(profileId);
      log.info('Profile deleted successfully');
      navigation.goBack();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('profile.edit.error.deleteFailed');
      setError(message);
      log.error('Failed to delete profile', err);
    } finally {
      setIsDeleting(false);
    }
  }, [profileId, navigation, t]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <GlassLoadingSpinner size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <GlassCard style={styles.card}>
        {/* Avatar Preview */}
        <View style={[styles.avatarPreview, { backgroundColor: AVATAR_COLORS[selectedColorIndex].hex }]}>
          {name.trim() ? (
            <Text style={styles.avatarInitials}>{getInitials()}</Text>
          ) : (
            <Text style={styles.avatarPlaceholder}>{t('profile.edit.avatarPlaceholder')}</Text>
          )}
        </View>

        {/* Name Field */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>{t('profile.edit.profileName')}</Text>
          <GlassInput
            placeholder={t('profile.edit.namePlaceholder')}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoCorrect={false}
            editable={!isSaving}
          />
        </View>

        {/* Color Picker */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>{t('profile.edit.avatarColor')}</Text>
          <View style={styles.colorRow}>
            {AVATAR_COLORS.map((color, index) => (
              <TouchableOpacity
                key={color.label}
                onPress={() => setSelectedColorIndex(index)}
                accessibilityLabel={t('profile.edit.selectColor', { color: color.label })}
                style={[
                  styles.colorCircle,
                  { backgroundColor: color.hex },
                  selectedColorIndex === index && styles.colorCircleSelected,
                ]}
              />
            ))}
          </View>
        </View>

        {/* Kids Toggle */}
        <View style={styles.kidsRow}>
          <View style={styles.kidsTextContainer}>
            <Text style={styles.kidsTitle}>{t('profile.edit.kidsProfile')}</Text>
            <Text style={styles.kidsDescription}>{t('profile.edit.kidsDescription')}</Text>
          </View>
          <GlassToggle
            value={isKidsProfile}
            onToggle={setIsKidsProfile}
            disabled={isSaving}
          />
        </View>

        {error && (
          <GlassErrorBanner message={error} onDismiss={() => setError(null)} />
        )}

        {/* Save Button */}
        <GlassButton
          variant="primary"
          size="large"
          onPress={handleSave}
          disabled={!canSave || isSaving}
          style={styles.saveButton}
        >
          {isSaving ? (
            <GlassLoadingSpinner size="small" />
          ) : (
            t('profile.edit.save')
          )}
        </GlassButton>

        {/* Delete Button */}
        <GlassButton
          variant="destructive"
          size="large"
          onPress={() => setShowDeleteConfirm(true)}
          disabled={isSaving || isDeleting}
          style={styles.deleteButton}
        >
          {isDeleting ? (
            <GlassLoadingSpinner size="small" />
          ) : (
            t('profile.edit.deleteProfile')
          )}
        </GlassButton>
      </GlassCard>

      {/* Delete Confirmation Modal */}
      <GlassModal
        visible={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title={t('profile.edit.deleteConfirmTitle')}
      >
        <Text style={styles.deleteConfirmText}>
          {t('profile.edit.deleteConfirmMessage', { name: name.trim() })}
        </Text>
        <View style={styles.deleteConfirmActions}>
          <GlassButton
            variant="secondary"
            onPress={() => setShowDeleteConfirm(false)}
            style={styles.deleteConfirmButton}
          >
            {t('common.cancel')}
          </GlassButton>
          <GlassButton
            variant="destructive"
            onPress={handleDelete}
            style={styles.deleteConfirmButton}
          >
            {t('profile.edit.deleteProfile')}
          </GlassButton>
        </View>
      </GlassModal>
    </ScrollView>
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
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  card: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  avatarPreview: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatarInitials: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.text,
  },
  avatarPlaceholder: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  fieldContainer: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  colorRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  colorCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 0,
  },
  colorCircleSelected: {
    borderWidth: 3,
    borderColor: colors.text,
    transform: [{ scale: 1.15 }],
  },
  kidsRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  kidsTextContainer: {
    flex: 1,
    marginRight: spacing.md,
  },
  kidsTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginBottom: spacing.xxs,
  },
  kidsDescription: {
    fontSize: 14,
    color: colors.textMuted,
  },
  saveButton: {
    width: '100%',
    marginTop: spacing.md,
  },
  deleteButton: {
    width: '100%',
    marginTop: spacing.sm,
  },
  deleteConfirmText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  deleteConfirmActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  deleteConfirmButton: {
    flex: 1,
  },
});
