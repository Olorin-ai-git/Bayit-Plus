import { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { colors, spacing, fontSize, borderRadius } from '@olorin/design-tokens';
import { GlassView, GlassToggle } from '@bayit/shared/ui';
import { Shield } from 'lucide-react';
import { useFamilyControlsStore } from '@bayit/shared-stores/familyControlsStore';
import { FamilyPinModal } from '@bayit/shared/components/family-controls/FamilyPinModal';
import { AgeSlider } from '@bayit/shared/components/family-controls/AgeSlider';
import { ContentRatingSelector } from '@bayit/shared/components/family-controls/ContentRatingSelector';
import { TimeRangePicker } from '@bayit/shared/components/family-controls/TimeRangePicker';
import logger from '@/utils/logger';

export default function FamilyControlsPage() {
  const { t } = useTranslation();
  const { textAlign } = useDirection();
  
  const {
    controls,
    hasFamilyPin,
    loading,
    error,
    loadControls,
    updateControls,
    toggleKidsSection,
    toggleYoungstersSection,
    toggleViewingHours,
    updateKidsAgeLimit,
    updateYoungstersAgeLimit,
    updateContentRating,
    updateViewingHours: updateViewingHoursAction,
  } = useFamilyControlsStore();

  const [showPinModal, setShowPinModal] = useState(false);

  useEffect(() => {
    loadControls();
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Text style={[styles.title, textAlign === 'right' && styles.textRight]}>
        {t('familyControls.title')}
      </Text>

      {/* PIN Setup */}
      <GlassView style={styles.section}>
        <Text style={[styles.sectionHeader, textAlign === 'right' && styles.textRight]}>
          {t('familyControls.pinSetup')}
        </Text>
        <Text style={[styles.description, textAlign === 'right' && styles.textRight]}>
          {hasFamilyPin 
            ? t('familyControls.pinConfigured')
            : t('familyControls.pinNotConfigured')}
        </Text>
      </GlassView>

      {/* Kids Section */}
      <GlassView style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Text style={[styles.sectionHeader, textAlign === 'right' && styles.textRight]}>
            {t('familyControls.kidsSection')}
          </Text>
          <GlassToggle
            value={controls?.kids_enabled ?? true}
            onValueChange={toggleKidsSection}
            disabled={loading}
          />
        </View>
        {controls?.kids_enabled && (
          <AgeSlider
            value={controls?.kids_age_limit ?? 12}
            min={0}
            max={12}
            onChange={updateKidsAgeLimit}
            label={t('familyControls.kidsAgeLimit')}
          />
        )}
      </GlassView>

      {/* Youngsters Section */}
      <GlassView style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Text style={[styles.sectionHeader, textAlign === 'right' && styles.textRight]}>
            {t('familyControls.youngstersSection')}
          </Text>
          <GlassToggle
            value={controls?.youngsters_enabled ?? true}
            onValueChange={toggleYoungstersSection}
            disabled={loading}
          />
        </View>
        {controls?.youngsters_enabled && (
          <AgeSlider
            value={controls?.youngsters_age_limit ?? 17}
            min={12}
            max={17}
            onChange={updateYoungstersAgeLimit}
            label={t('familyControls.youngstersAgeLimit')}
          />
        )}
      </GlassView>

      {/* Content Ratings */}
      <GlassView style={styles.section}>
        <Text style={[styles.sectionHeader, textAlign === 'right' && styles.textRight]}>
          {t('familyControls.contentRatings')}
        </Text>
        <ContentRatingSelector
          value={controls?.max_content_rating ?? 'PG-13'}
          onChange={updateContentRating}
        />
      </GlassView>

      {/* Viewing Hours */}
      <GlassView style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Text style={[styles.sectionHeader, textAlign === 'right' && styles.textRight]}>
            {t('familyControls.viewingHours')}
          </Text>
          <GlassToggle
            value={controls?.viewing_hours_enabled ?? false}
            onValueChange={toggleViewingHours}
            disabled={loading}
          />
        </View>
        {controls?.viewing_hours_enabled && (
          <TimeRangePicker
            startHour={controls?.viewing_start_hour ?? 6}
            endHour={controls?.viewing_end_hour ?? 22}
            onChange={(start, end) => updateViewingHoursAction(start, end)}
          />
        )}
      </GlassView>

      {error && (
        <Text style={styles.error}>{error}</Text>
      )}

      <FamilyPinModal visible={showPinModal} onClose={() => setShowPinModal(false)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  title: {
    fontSize: fontSize['3xl'],
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.md,
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
    marginBottom: spacing.md,
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  textRight: {
    textAlign: 'right',
  },
  error: {
    color: colors.error,
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
