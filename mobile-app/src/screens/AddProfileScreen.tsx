/**
 * Add Profile Screen
 *
 * Create a new user profile with name, avatar color, and kids toggle.
 * Uses shared profilesService API and Glass UI components.
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { profilesService } from '@bayit/shared-services/api';
import {
  GlassButton,
  GlassInput,
  GlassCard,
  GlassToggle,
  GlassErrorBanner,
  GlassLoadingSpinner,
  colors,
  spacing,
  borderRadius,
} from '@olorin/glass-ui/native';
import { logger } from '../utils/logger';
import { Colors } from '../theme/colors';

const log = logger.scope('AddProfileScreen');

const AVATAR_COLORS = [
  { hex: Colors.Primary.p500, label: 'purple' },
  { hex: Colors.Error.e400, label: 'red' },
  { hex: Colors.Success.s400, label: 'green' },
  { hex: Colors.Warning.w400, label: 'yellow' },
  { hex: Colors.Secondary.s500, label: 'pink' },
  { hex: Colors.Info.i400, label: 'cyan' },
];

export const AddProfileScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();

  const [name, setName] = useState('');
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [isKidsProfile, setIsKidsProfile] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCreate = name.trim().length > 0;

  const getInitials = (): string => {
    return name
      .trim()
      .split(' ')
      .slice(0, 2)
      .map((word) => word.charAt(0))
      .join('')
      .toUpperCase();
  };

  const handleCreate = useCallback(async () => {
    if (!canCreate) return;

    setIsCreating(true);
    setError(null);

    try {
      await profilesService.createProfile({
        name: name.trim(),
        avatar_color: AVATAR_COLORS[selectedColorIndex].hex,
        is_kids_profile: isKidsProfile,
      });
      log.info('Profile created successfully');
      navigation.goBack();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('profile.add.error.generic');
      setError(message);
      log.error('Failed to create profile', err);
    } finally {
      setIsCreating(false);
    }
  }, [canCreate, name, selectedColorIndex, isKidsProfile, navigation, t]);

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
            <Text style={styles.avatarPlaceholder}>{t('profile.add.avatarPlaceholder')}</Text>
          )}
        </View>

        {/* Name Field */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>{t('profile.add.profileName')}</Text>
          <GlassInput
            placeholder={t('profile.add.namePlaceholder')}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoCorrect={false}
            editable={!isCreating}
          />
        </View>

        {/* Color Picker */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>{t('profile.add.avatarColor')}</Text>
          <View style={styles.colorRow}>
            {AVATAR_COLORS.map((color, index) => (
              <TouchableOpacity
                key={color.label}
                onPress={() => setSelectedColorIndex(index)}
                accessibilityLabel={t('profile.add.selectColor', { color: color.label })}
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
            <Text style={styles.kidsTitle}>{t('profile.add.kidsProfile')}</Text>
            <Text style={styles.kidsDescription}>{t('profile.add.kidsDescription')}</Text>
          </View>
          <GlassToggle
            value={isKidsProfile}
            onToggle={setIsKidsProfile}
            disabled={isCreating}
          />
        </View>

        {/* Error */}
        {error && (
          <GlassErrorBanner message={error} onDismiss={() => setError(null)} />
        )}

        {/* Create Button */}
        <GlassButton
          variant="primary"
          size="large"
          onPress={handleCreate}
          disabled={!canCreate || isCreating}
          style={styles.createButton}
        >
          {isCreating ? (
            <GlassLoadingSpinner size="small" />
          ) : (
            t('profile.add.create')
          )}
        </GlassButton>
      </GlassCard>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  createButton: {
    width: '100%',
    marginTop: spacing.md,
  },
});
