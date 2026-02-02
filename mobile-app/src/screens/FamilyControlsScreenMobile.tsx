import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, fontSize } from '@olorin/design-tokens';
import { GlassView, GlassToggle, GlassButton } from '@bayit/glass';
import { useFamilyControlsStore } from '../../../shared/stores/familyControlsStore';
import { FamilyPinModal } from '../../../shared/components/family-controls/FamilyPinModal';
import { AgeSlider } from '../../../shared/components/family-controls/AgeSlider';
import { ContentRatingSelector } from '../../../shared/components/family-controls/ContentRatingSelector';
import { TimeRangePicker } from '../../../shared/components/family-controls/TimeRangePicker';

/**
 * Family Controls Screen - Mobile (iOS/Android)
 *
 * Provides unified parental control management for:
 * - Family PIN setup and management
 * - Kids content (ages 0-12) controls
 * - Youngsters content (ages 12-17) controls
 * - Content rating limits (G, PG, PG-13)
 * - Time-based viewing restrictions
 */
export default function FamilyControlsScreenMobile() {
  const { t } = useTranslation();

  const {
    controls,
    hasFamilyPin,
    loading,
    error,
    loadControls,
    toggleKidsSection,
    toggleYoungstersSection,
    toggleViewingHours,
    updateKidsAgeLimit,
    updateYoungstersAgeLimit,
    updateContentRating,
    updateViewingHours: updateViewingHoursAction,
  } = useFamilyControlsStore();

  const [showPinModal, setShowPinModal] = useState(false);
  const [showChangePinModal, setShowChangePinModal] = useState(false);

  useEffect(() => {
    loadControls();
  }, [loadControls]);

  const handleSetupPin = () => {
    setShowPinModal(true);
  };

  const handleChangePin = () => {
    setShowChangePinModal(true);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('familyControls.title')}</Text>
          <Text style={styles.subtitle}>{t('familyControls.subtitle')}</Text>
        </View>

        {/* PIN Setup Section */}
        <GlassView style={styles.section}>
          <Text style={styles.sectionHeader}>{t('familyControls.pinSetup')}</Text>
          <Text style={styles.description}>
            {hasFamilyPin
              ? t('familyControls.pinConfigured')
              : t('familyControls.pinNotConfigured')}
          </Text>
          <GlassButton
            onPress={hasFamilyPin ? handleChangePin : handleSetupPin}
            variant="primary"
            style={styles.pinButton}
          >
            {hasFamilyPin ? t('familyControls.changePin') : t('familyControls.setupPin')}
          </GlassButton>
        </GlassView>

        {/* Kids Section */}
        <GlassView style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionHeader}>{t('familyControls.kidsSection')}</Text>
            <GlassToggle
              value={controls?.kids_enabled ?? true}
              onValueChange={toggleKidsSection}
              disabled={loading}
            />
          </View>
          <Text style={styles.description}>{t('familyControls.kidsDescription')}</Text>
          {controls?.kids_enabled && (
            <View style={styles.sliderContainer}>
              <AgeSlider
                value={controls?.kids_age_limit ?? 12}
                min={0}
                max={12}
                onChange={updateKidsAgeLimit}
                label={t('familyControls.kidsAgeLimit')}
              />
            </View>
          )}
        </GlassView>

        {/* Youngsters Section */}
        <GlassView style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionHeader}>{t('familyControls.youngstersSection')}</Text>
            <GlassToggle
              value={controls?.youngsters_enabled ?? true}
              onValueChange={toggleYoungstersSection}
              disabled={loading}
            />
          </View>
          <Text style={styles.description}>{t('familyControls.youngstersDescription')}</Text>
          {controls?.youngsters_enabled && (
            <View style={styles.sliderContainer}>
              <AgeSlider
                value={controls?.youngsters_age_limit ?? 17}
                min={12}
                max={17}
                onChange={updateYoungstersAgeLimit}
                label={t('familyControls.youngstersAgeLimit')}
              />
            </View>
          )}
        </GlassView>

        {/* Content Ratings */}
        <GlassView style={styles.section}>
          <Text style={styles.sectionHeader}>{t('familyControls.contentRatings')}</Text>
          <Text style={styles.description}>{t('familyControls.contentRatingsDescription')}</Text>
          <ContentRatingSelector
            value={controls?.max_content_rating ?? 'PG-13'}
            onChange={updateContentRating}
          />
        </GlassView>

        {/* Viewing Hours */}
        <GlassView style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionHeader}>{t('familyControls.viewingHours')}</Text>
            <GlassToggle
              value={controls?.viewing_hours_enabled ?? false}
              onValueChange={toggleViewingHours}
              disabled={loading}
            />
          </View>
          <Text style={styles.description}>{t('familyControls.viewingHoursDescription')}</Text>
          {controls?.viewing_hours_enabled && (
            <View style={styles.timePickerContainer}>
              <TimeRangePicker
                startHour={controls?.viewing_start_hour ?? 6}
                endHour={controls?.viewing_end_hour ?? 22}
                onChange={(start, end) => updateViewingHoursAction(start, end)}
              />
            </View>
          )}
        </GlassView>

        {/* Error Display */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.error}>{error}</Text>
          </View>
        )}

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Modals */}
      <FamilyPinModal
        visible={showPinModal}
        onClose={() => setShowPinModal(false)}
        mode="setup"
      />
      <FamilyPinModal
        visible={showChangePinModal}
        onClose={() => setShowChangePinModal(false)}
        mode="change"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: fontSize['3xl'],
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  section: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  sectionHeader: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: fontSize.sm * 1.5,
    marginBottom: spacing.md,
  },
  pinButton: {
    marginTop: spacing.md,
  },
  sliderContainer: {
    marginTop: spacing.md,
  },
  timePickerContainer: {
    marginTop: spacing.md,
  },
  errorContainer: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.errorBackground,
    borderRadius: 8,
  },
  error: {
    color: colors.error,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  bottomSpacing: {
    height: spacing.xxl,
  },
});
