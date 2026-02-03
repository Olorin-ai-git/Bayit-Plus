/**
 * Effective Controls Grid - Mobile
 *
 * Shows the currently active family controls for a profile.
 */

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';

interface EffectiveControls {
  kids_enabled: boolean;
  kids_age_limit: number;
  youngsters_enabled: boolean;
  youngsters_age_limit: number;
  max_content_rating: string;
  viewing_hours_enabled: boolean;
  viewing_start_hour: number;
  viewing_end_hour: number;
}

interface EffectiveControlsGridProps {
  effectiveControls: EffectiveControls | null;
  isLoading: boolean;
}

export function EffectiveControlsGrid({
  effectiveControls,
  isLoading,
}: EffectiveControlsGridProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  if (!effectiveControls) {
    return (
      <View style={styles.section}>
        <Text style={styles.noControlsText}>
          {t('profileControls.effectiveControls.noControls', 'No family controls active for this profile')}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        {t('profileControls.effectiveControls.title', 'Active Controls')}
      </Text>

      <View style={styles.controlsGrid}>
        <View style={styles.controlCard}>
          <Text style={styles.controlCardLabel}>
            {t('profileControls.effectiveControls.kidsEnabled', 'Kids Content')}
          </Text>
          <Text style={styles.controlCardValue}>
            {effectiveControls.kids_enabled
              ? t('profileControls.effectiveControls.enabled', 'Enabled')
              : t('profileControls.effectiveControls.disabled', 'Disabled')}
          </Text>
          {effectiveControls.kids_enabled && (
            <Text style={styles.controlCardDetail}>
              {t('profileControls.effectiveControls.ageLimit', 'Age limit: {{age}}', {
                age: effectiveControls.kids_age_limit,
              })}
            </Text>
          )}
        </View>

        <View style={styles.controlCard}>
          <Text style={styles.controlCardLabel}>
            {t('profileControls.effectiveControls.youngstersEnabled', 'Youngsters Content')}
          </Text>
          <Text style={styles.controlCardValue}>
            {effectiveControls.youngsters_enabled
              ? t('profileControls.effectiveControls.enabled', 'Enabled')
              : t('profileControls.effectiveControls.disabled', 'Disabled')}
          </Text>
          {effectiveControls.youngsters_enabled && (
            <Text style={styles.controlCardDetail}>
              {t('profileControls.effectiveControls.ageLimit', 'Age limit: {{age}}', {
                age: effectiveControls.youngsters_age_limit,
              })}
            </Text>
          )}
        </View>

        <View style={styles.controlCard}>
          <Text style={styles.controlCardLabel}>
            {t('profileControls.effectiveControls.contentRating', 'Content Rating Limit')}
          </Text>
          <Text style={styles.controlCardValue}>{effectiveControls.max_content_rating}</Text>
        </View>

        <View style={styles.controlCard}>
          <Text style={styles.controlCardLabel}>
            {t('profileControls.effectiveControls.viewingHours', 'Viewing Hours')}
          </Text>
          <Text style={styles.controlCardValue}>
            {effectiveControls.viewing_hours_enabled
              ? `${effectiveControls.viewing_start_hour}:00 - ${effectiveControls.viewing_end_hour}:00`
              : t('profileControls.effectiveControls.noRestriction', 'No restriction')}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  controlsGrid: {
    gap: 12,
  },
  controlCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
  },
  controlCardLabel: {
    fontSize: 14,
    color: '#d1d5db',
    marginBottom: 4,
  },
  controlCardValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
  },
  controlCardDetail: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  noControlsText: {
    color: '#d1d5db',
    textAlign: 'center',
    fontSize: 14,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
