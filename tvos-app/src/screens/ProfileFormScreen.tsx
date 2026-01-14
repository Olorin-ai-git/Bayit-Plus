/**
 * ProfileFormScreen - Create or Edit Profile
 * Used for both creating new profiles and editing existing ones on tvOS
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useProfile } from '@bayit/shared-contexts';
import { useDirection } from '@bayit/shared-hooks';
import { GlassView, GlassButton } from '@bayit/shared';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';

// Avatar options
const AVATAR_COLORS = [
  '#a855f7', '#ff6b6b', '#4ecdc4', '#ffd93d',
  '#6c5ce7', '#a8e6cf', '#ff8b94', '#ffaaa5',
];

const AVATAR_EMOJIS = ['👤', '👨', '👩', '👶', '👦', '👧', '🧒', '👨‍💼', '👩‍💼', '🎭'];

const KIDS_AGE_LIMITS = [
  { value: 3, label: '0-3' },
  { value: 7, label: '4-7' },
  { value: 12, label: '8-12' },
  { value: 18, label: '13+' },
];

export const ProfileFormScreen: React.FC = () => {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { createProfile, updateProfile, profiles, isLoading } = useProfile();

  const isEditMode = !!route.params?.profileId;
  const existingProfile = profiles.find(p => p.id === route.params?.profileId);

  // Form state
  const [name, setName] = useState(existingProfile?.name || '');
  const [selectedColor, setSelectedColor] = useState(
    existingProfile?.avatar_color || AVATAR_COLORS[0]
  );
  const [selectedEmoji, setSelectedEmoji] = useState(
    existingProfile?.avatar || AVATAR_EMOJIS[0]
  );
  const [isKidsProfile, setIsKidsProfile] = useState(
    existingProfile?.is_kids_profile || false
  );
  const [kidsAgeLimit, setKidsAgeLimit] = useState(
    existingProfile?.kids_age_limit || 12
  );
  const [hasPin, setHasPin] = useState(existingProfile?.has_pin || false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Focus states for TV navigation
  const [focusedItem, setFocusedItem] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);

    // Validation
    if (!name.trim()) {
      setError(t('profiles.errors.nameRequired', 'Profile name is required'));
      return;
    }

    if (name.trim().length < 2) {
      setError(t('profiles.errors.nameTooShort', 'Profile name must be at least 2 characters'));
      return;
    }

    if (hasPin && !isEditMode) {
      if (pin.length !== 4) {
        setError(t('profiles.errors.pinLength', 'PIN must be 4 digits'));
        return;
      }
      if (pin !== confirmPin) {
        setError(t('profiles.errors.pinMismatch', 'PINs do not match'));
        return;
      }
    }

    setSaving(true);
    try {
      const profileData = {
        name: name.trim(),
        avatar: selectedEmoji,
        avatar_color: selectedColor,
        is_kids_profile: isKidsProfile,
        kids_age_limit: isKidsProfile ? kidsAgeLimit : undefined,
        pin: hasPin && pin ? pin : undefined,
      };

      if (isEditMode) {
        await updateProfile(route.params.profileId, profileData);
      } else {
        await createProfile(profileData);
      }

      navigation.goBack();
    } catch (err: any) {
      setError(err.message || t('profiles.errors.saveFailed', 'Failed to save profile'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <GlassView intensity="medium" style={styles.formContainer}>
        <Text style={[styles.title, { textAlign }]}>
          {isEditMode
            ? t('profiles.editProfile', 'Edit Profile')
            : t('profiles.createProfile', 'Create Profile')}
        </Text>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Name Input */}
        <View style={styles.section}>
          <Text style={[styles.label, { textAlign }]}>
            {t('profiles.name', 'Profile Name')}
          </Text>
          <TextInput
            style={[
              styles.input,
              focusedItem === 'name' && styles.inputFocused,
              { textAlign },
            ]}
            value={name}
            onChangeText={setName}
            placeholder={t('profiles.namePlaceholder', 'Enter profile name')}
            placeholderTextColor="#666"
            maxLength={30}
            onFocus={() => setFocusedItem('name')}
            onBlur={() => setFocusedItem(null)}
          />
        </View>

        {/* Avatar Emoji Selection */}
        <View style={styles.section}>
          <Text style={[styles.label, { textAlign }]}>
            {t('profiles.avatar', 'Avatar')}
          </Text>
          <View style={[styles.avatarGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {AVATAR_EMOJIS.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                style={[
                  styles.avatarOption,
                  selectedEmoji === emoji && styles.avatarOptionSelected,
                  focusedItem === `emoji-${emoji}` && styles.avatarOptionFocused,
                ]}
                onPress={() => setSelectedEmoji(emoji)}
                onFocus={() => setFocusedItem(`emoji-${emoji}`)}
                onBlur={() => setFocusedItem(null)}
              >
                <Text style={styles.avatarEmoji}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Color Selection */}
        <View style={styles.section}>
          <Text style={[styles.label, { textAlign }]}>
            {t('profiles.color', 'Color')}
          </Text>
          <View style={[styles.colorGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {AVATAR_COLORS.map((color) => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorOption,
                  { backgroundColor: color },
                  selectedColor === color && styles.colorOptionSelected,
                  focusedItem === `color-${color}` && styles.colorOptionFocused,
                ]}
                onPress={() => setSelectedColor(color)}
                onFocus={() => setFocusedItem(`color-${color}`)}
                onBlur={() => setFocusedItem(null)}
              />
            ))}
          </View>
        </View>

        {/* Kids Profile Toggle */}
        <View style={styles.section}>
          <View style={[styles.toggleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.label, { textAlign }]}>
              {t('profiles.kidsProfile', 'Kids Profile')}
            </Text>
            <Switch
              value={isKidsProfile}
              onValueChange={setIsKidsProfile}
              trackColor={{ false: '#666', true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
          <Text style={[styles.hint, { textAlign }]}>
            {t('profiles.kidsProfileHint', 'Restricts content to age-appropriate material')}
          </Text>
        </View>

        {/* Age Limit (only for kids profiles) */}
        {isKidsProfile && (
          <View style={styles.section}>
            <Text style={[styles.label, { textAlign }]}>
              {t('profiles.ageLimit', 'Age Limit')}
            </Text>
            <View style={[styles.ageLimitGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              {KIDS_AGE_LIMITS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.ageLimitOption,
                    kidsAgeLimit === option.value && styles.ageLimitOptionSelected,
                    focusedItem === `age-${option.value}` && styles.ageLimitOptionFocused,
                  ]}
                  onPress={() => setKidsAgeLimit(option.value)}
                  onFocus={() => setFocusedItem(`age-${option.value}`)}
                  onBlur={() => setFocusedItem(null)}
                >
                  <Text style={[
                    styles.ageLimitText,
                    kidsAgeLimit === option.value && styles.ageLimitTextSelected,
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* PIN Protection (only for new profiles or if changing) */}
        <View style={styles.section}>
          <View style={[styles.toggleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.label, { textAlign }]}>
              {t('profiles.pinProtection', 'PIN Protection')}
            </Text>
            <Switch
              value={hasPin}
              onValueChange={setHasPin}
              trackColor={{ false: '#666', true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
          <Text style={[styles.hint, { textAlign }]}>
            {t('profiles.pinHint', 'Require a 4-digit PIN to access this profile')}
          </Text>

          {hasPin && !isEditMode && (
            <View style={styles.pinInputs}>
              <TextInput
                style={[
                  styles.input,
                  styles.pinInput,
                  focusedItem === 'pin' && styles.inputFocused,
                ]}
                value={pin}
                onChangeText={(text) => setPin(text.replace(/[^0-9]/g, ''))}
                placeholder={t('profiles.enterPin', 'Enter 4-digit PIN')}
                placeholderTextColor="#666"
                keyboardType="numeric"
                maxLength={4}
                secureTextEntry
                onFocus={() => setFocusedItem('pin')}
                onBlur={() => setFocusedItem(null)}
              />
              <TextInput
                style={[
                  styles.input,
                  styles.pinInput,
                  focusedItem === 'confirmPin' && styles.inputFocused,
                ]}
                value={confirmPin}
                onChangeText={(text) => setConfirmPin(text.replace(/[^0-9]/g, ''))}
                placeholder={t('profiles.confirmPin', 'Confirm PIN')}
                placeholderTextColor="#666"
                keyboardType="numeric"
                maxLength={4}
                secureTextEntry
                onFocus={() => setFocusedItem('confirmPin')}
                onBlur={() => setFocusedItem(null)}
              />
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={[styles.buttonRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <TouchableOpacity
            style={[
              styles.button,
              styles.cancelButton,
              focusedItem === 'cancel' && styles.buttonFocused,
            ]}
            onPress={() => navigation.goBack()}
            onFocus={() => setFocusedItem('cancel')}
            onBlur={() => setFocusedItem(null)}
            disabled={saving}
          >
            <Text style={styles.cancelButtonText}>
              {t('common.cancel', 'Cancel')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.saveButton,
              focusedItem === 'save' && styles.buttonFocused,
              saving && styles.buttonDisabled,
            ]}
            onPress={handleSave}
            onFocus={() => setFocusedItem('save')}
            onBlur={() => setFocusedItem(null)}
            disabled={saving || isLoading}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.saveButtonText}>
                {t('common.save', 'Save')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </GlassView>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  formContainer: {
    padding: spacing.xl,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xl,
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: '#ff6b6b',
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
    textAlign: 'center',
  },
  section: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 16,
    color: colors.primary,
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 18,
    color: colors.text,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  inputFocused: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
  },
  avatarGrid: {
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  avatarOption: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  avatarOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
  },
  avatarOptionFocused: {
    borderColor: colors.text,
    transform: [{ scale: 1.1 }],
  },
  avatarEmoji: {
    fontSize: 32,
  },
  colorGrid: {
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  colorOption: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: colors.text,
  },
  colorOptionFocused: {
    transform: [{ scale: 1.15 }],
    borderColor: colors.text,
  },
  toggleRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ageLimitGrid: {
    gap: spacing.sm,
  },
  ageLimitOption: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
  },
  ageLimitOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  ageLimitOptionFocused: {
    borderColor: colors.text,
    transform: [{ scale: 1.05 }],
  },
  ageLimitText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
  },
  ageLimitTextSelected: {
    color: colors.background,
  },
  pinInputs: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  pinInput: {
    textAlign: 'center',
    letterSpacing: 8,
    fontSize: 24,
  },
  buttonRow: {
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  buttonFocused: {
    borderColor: colors.text,
    transform: [{ scale: 1.03 }],
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  cancelButtonText: {
    fontSize: 18,
    color: colors.text,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  saveButtonText: {
    fontSize: 18,
    color: colors.background,
    fontWeight: 'bold',
  },
});

export default ProfileFormScreen;
