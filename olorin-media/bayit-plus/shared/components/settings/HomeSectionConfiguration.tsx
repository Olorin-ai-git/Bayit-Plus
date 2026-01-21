/**
 * HomeSectionConfiguration - Configure visibility and order of home page sections
 * Allows users to show/hide sections and reorder them using drag-and-drop or arrow buttons
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { GlassView, GlassButton } from '../ui';
import { GlassReorderableList } from '../ui/GlassReorderableList';
import { GlassSectionItem } from '../ui/GlassSectionItem';
import { useHomePageConfigStore } from '../../stores/homePageConfigStore';
import { useDirection } from '../../hooks/useDirection';
import { colors, spacing, borderRadius, fontSize } from '../theme';
import { isTV } from '../../utils/platform';
import type { HomeSectionConfig, HomeSectionId } from '../../types/homePageConfig';

export const HomeSectionConfiguration: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { isRTL, textAlign, flexDirection } = useDirection();

  const {
    preferences,
    loading,
    saving,
    error,
    getVisibleSections,
    getHiddenSections,
    loadPreferences,
    toggleSection,
    moveSectionUp,
    moveSectionDown,
    resetToDefaults,
    clearError,
  } = useHomePageConfigStore();

  const [visibleSections, setVisibleSections] = useState<HomeSectionConfig[]>([]);
  const [hiddenSections, setHiddenSections] = useState<HomeSectionConfig[]>([]);

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  // Update local state when preferences change
  useEffect(() => {
    setVisibleSections(getVisibleSections());
    setHiddenSections(getHiddenSections());
  }, [preferences, getVisibleSections, getHiddenSections]);

  // Show error alert if error occurs
  useEffect(() => {
    if (error) {
      Alert.alert(
        t('common.error', 'Error'),
        error,
        [{ text: t('common.ok', 'OK'), onPress: clearError }]
      );
    }
  }, [error, t, clearError]);

  const handleReorder = async (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;

    const section = visibleSections[fromIndex];
    if (!section) return;

    // Calculate new order based on toIndex
    const targetOrder = visibleSections[toIndex]?.order ?? toIndex;

    // Optimistic UI update
    const newVisible = [...visibleSections];
    const [moved] = newVisible.splice(fromIndex, 1);
    newVisible.splice(toIndex, 0, moved);
    setVisibleSections(newVisible);

    // Update store
    await moveSectionUp(section.id); // This will recalculate based on current position
  };

  const handleToggleSection = async (sectionId: HomeSectionId) => {
    await toggleSection(sectionId);
  };

  const handleMoveUp = async (sectionId: HomeSectionId) => {
    await moveSectionUp(sectionId);
  };

  const handleMoveDown = async (sectionId: HomeSectionId) => {
    await moveSectionDown(sectionId);
  };

  const handleReset = () => {
    Alert.alert(
      t('settings.resetToDefault', 'Reset to Default'),
      t('settings.resetConfirmMessage', 'Are you sure you want to reset home page sections to their default configuration?'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('common.reset', 'Reset'),
          style: 'destructive',
          onPress: resetToDefaults,
        },
      ]
    );
  };

  const renderVisibleSection = (
    section: HomeSectionConfig,
    index: number,
    isDragging: boolean
  ) => (
    <GlassSectionItem
      key={section.id}
      icon={section.icon}
      labelKey={section.labelKey}
      visible={true}
      isFirst={index === 0}
      isLast={index === visibleSections.length - 1}
      isDragging={isDragging}
      onMoveUp={() => handleMoveUp(section.id)}
      onMoveDown={() => handleMoveDown(section.id)}
      onToggleVisibility={() => handleToggleSection(section.id)}
      showArrows={true}
      showDragHandle={true}
    />
  );

  const renderHiddenSection = (section: HomeSectionConfig) => (
    <TouchableOpacity
      key={section.id}
      onPress={() => handleToggleSection(section.id)}
      activeOpacity={0.8}
    >
      <GlassSectionItem
        icon={section.icon}
        labelKey={section.labelKey}
        visible={false}
        showArrows={false}
        showDragHandle={false}
      />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>{t('common.loading', 'Loading...')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={[styles.header, { flexDirection }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>{isRTL ? '→' : '←'}</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.pageTitle, { textAlign }]}>
            {t('settings.homePageSections', 'Home Page Sections')}
          </Text>
          <Text style={[styles.pageSubtitle, { textAlign }]}>
            {t('settings.configureSections', 'Configure which sections appear on your home page')}
          </Text>
        </View>
      </View>

      {/* Saving Indicator */}
      {saving && (
        <View style={styles.savingIndicator}>
          <Text style={styles.savingText}>{t('common.saving', 'Saving...')}</Text>
        </View>
      )}

      {/* Visible Sections */}
      <GlassView style={styles.section}>
        <View style={[styles.sectionHeader, { flexDirection }]}>
          <Text style={[styles.sectionTitle, { textAlign }]}>
            {t('settings.visibleSections', 'Visible Sections')}
          </Text>
          <Text style={styles.sectionHint}>
            {t('settings.dragToReorder', 'Drag to reorder')}
          </Text>
        </View>

        {visibleSections.length > 0 ? (
          <GlassReorderableList
            items={visibleSections}
            onReorder={handleReorder}
            renderItem={renderVisibleSection}
            keyExtractor={(item) => item.id}
          />
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              {t('settings.noVisibleSections', 'No visible sections. Tap a hidden section to show it.')}
            </Text>
          </View>
        )}
      </GlassView>

      {/* Hidden Sections */}
      {hiddenSections.length > 0 && (
        <GlassView style={styles.section}>
          <View style={[styles.sectionHeader, { flexDirection }]}>
            <Text style={[styles.sectionTitle, { textAlign }]}>
              {t('settings.hiddenSections', 'Hidden Sections')}
            </Text>
            <Text style={styles.sectionHint}>
              {t('settings.tapToShow', 'Tap to show')}
            </Text>
          </View>

          <View style={styles.hiddenList}>
            {hiddenSections.map(renderHiddenSection)}
          </View>
        </GlassView>
      )}

      {/* Reset Button */}
      <View style={styles.resetContainer}>
        <TouchableOpacity
          onPress={handleReset}
          style={styles.resetButton}
        >
          <Text style={styles.resetButtonText}>
            {t('settings.resetToDefault', 'Reset to Default')}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: isTV ? spacing.xl : spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.text,
    fontSize: fontSize.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  backButton: {
    width: isTV ? 48 : 40,
    height: isTV ? 48 : 40,
    borderRadius: isTV ? 24 : 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  backButtonText: {
    fontSize: isTV ? 24 : 20,
    color: colors.text,
    fontWeight: '600',
  },
  headerContent: {
    flex: 1,
  },
  pageTitle: {
    fontSize: isTV ? 32 : 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  pageSubtitle: {
    fontSize: isTV ? 16 : 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  savingIndicator: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    alignSelf: 'center',
  },
  savingText: {
    color: colors.primary,
    fontSize: isTV ? 14 : 12,
    fontWeight: '500',
  },
  section: {
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: isTV ? 16 : 14,
    fontWeight: '600',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionHint: {
    fontSize: isTV ? 12 : 10,
    color: colors.textMuted,
  },
  emptyState: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyStateText: {
    color: colors.textMuted,
    fontSize: isTV ? 16 : 14,
    textAlign: 'center',
  },
  hiddenList: {
    gap: spacing.sm,
  },
  resetContainer: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  resetButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  resetButtonText: {
    color: colors.textMuted,
    fontSize: isTV ? 16 : 14,
    fontWeight: '500',
  },
});

export default HomeSectionConfiguration;
