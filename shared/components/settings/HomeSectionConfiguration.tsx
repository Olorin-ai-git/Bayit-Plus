/**
 * HomeSectionConfiguration - Configure visibility and order of home page sections
 * Allows users to show/hide sections and reorder them using drag-and-drop or arrow buttons
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
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
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
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
      <View className="flex-1 bg-[#0A0A1A] justify-center items-center">
        <Text className="text-white text-base">{t('common.loading', 'Loading...')}</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-[#0A0A1A]" contentContainerClassName={`${isTV ? 'p-6' : 'p-4'} pb-12`}>
      {/* Header */}
      <View className="items-start gap-4 mb-6" style={{ flexDirection }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className={`${isTV ? 'w-12 h-12' : 'w-10 h-10'} ${isTV ? 'rounded-[24px]' : 'rounded-[20px]'} bg-white/10 justify-center items-center border border-white/20`}
        >
          <Text className={`${isTV ? 'text-2xl' : 'text-xl'} text-white font-semibold`}>{isRTL ? '→' : '←'}</Text>
        </TouchableOpacity>
        <View className="flex-1">
          <Text className={`${isTV ? 'text-[32px]' : 'text-2xl'} font-bold text-white`} style={{ textAlign }}>
            {t('settings.homePageSections', 'Home Page Sections')}
          </Text>
          <Text className={`${isTV ? 'text-base' : 'text-sm'} text-white/70 mt-1`} style={{ textAlign }}>
            {t('settings.configureSections', 'Configure which sections appear on your home page')}
          </Text>
        </View>
      </View>

      {/* Saving Indicator */}
      {saving && (
        <View className="bg-purple-500/20 py-1 px-4 rounded-md mb-4 self-center">
          <Text className={`text-[#6B21A8] ${isTV ? 'text-sm' : 'text-xs'} font-medium`}>{t('common.saving', 'Saving...')}</Text>
        </View>
      )}

      {/* Visible Sections */}
      <GlassView className="p-4 mb-6 rounded-3xl">
        <View className="justify-between items-center mb-4" style={{ flexDirection }}>
          <Text className={`${isTV ? 'text-base' : 'text-sm'} font-semibold text-white uppercase tracking-wider`} style={{ textAlign }}>
            {t('settings.visibleSections', 'Visible Sections')}
          </Text>
          <Text className={`${isTV ? 'text-xs' : 'text-[10px]'} text-white/40`}>
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
          <View className="py-6 items-center">
            <Text className={`text-white/40 ${isTV ? 'text-base' : 'text-sm'} text-center`}>
              {t('settings.noVisibleSections', 'No visible sections. Tap a hidden section to show it.')}
            </Text>
          </View>
        )}
      </GlassView>

      {/* Hidden Sections */}
      {hiddenSections.length > 0 && (
        <GlassView className="p-4 mb-6 rounded-3xl">
          <View className="justify-between items-center mb-4" style={{ flexDirection }}>
            <Text className={`${isTV ? 'text-base' : 'text-sm'} font-semibold text-white uppercase tracking-wider`} style={{ textAlign }}>
              {t('settings.hiddenSections', 'Hidden Sections')}
            </Text>
            <Text className={`${isTV ? 'text-xs' : 'text-[10px]'} text-white/40`}>
              {t('settings.tapToShow', 'Tap to show')}
            </Text>
          </View>

          <View className="gap-2">
            {hiddenSections.map(renderHiddenSection)}
          </View>
        </GlassView>
      )}

      {/* Reset Button */}
      <View className="items-center mt-6">
        <TouchableOpacity
          onPress={handleReset}
          className={`py-4 px-6 bg-white/5 rounded-lg border border-white/20`}
        >
          <Text className={`text-white/40 ${isTV ? 'text-base' : 'text-sm'} font-medium`}>
            {t('settings.resetToDefault', 'Reset to Default')}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default HomeSectionConfiguration;
