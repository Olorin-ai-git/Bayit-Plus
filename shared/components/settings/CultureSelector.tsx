/**
 * CultureSelector Component
 *
 * Allows users to select their preferred culture in Settings.
 * Displays a grid of available cultures with flags and names.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '../../hooks/useDirection';
import { GlassView } from '../ui/GlassView';
import { useCultureStore, Culture } from '../../contexts/CultureContext';
import { colors, spacing, borderRadius, fontSize } from '../../theme';
import { isTV } from '../../utils/platform';

interface CultureSelectorProps {
  variant?: 'inline' | 'modal';
  showLabel?: boolean;
  onCultureChange?: (cultureId: string) => void;
}

/**
 * CultureSelector Component
 *
 * Displays the current culture selection and allows changing it.
 * Supports both inline and modal display modes.
 */
export const CultureSelector: React.FC<CultureSelectorProps> = ({
  variant = 'modal',
  showLabel = true,
  onCultureChange,
}) => {
  const { t, i18n } = useTranslation();
  const { isRTL } = useDirection();
  const {
    cultures,
    currentCulture,
    setCulture,
    isLoading,
    fetchCultures,
    getLocalizedName,
  } = useCultureStore();

  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [focusedCultureId, setFocusedCultureId] = useState<string | null>(null);
  const [backdropActive, setBackdropActive] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Fetch cultures on mount if not loaded
  useEffect(() => {
    if (cultures.length === 0) {
      fetchCultures();
    }
  }, [cultures.length, fetchCultures]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: isOpen ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isOpen, fadeAnim]);

  // Delay backdrop activation to prevent immediate close on open
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setBackdropActive(true), 500);
      return () => clearTimeout(timer);
    }
    setBackdropActive(false);
    return undefined;
  }, [isOpen]);

  const handleSelectCulture = async (cultureId: string) => {
    await setCulture(cultureId);
    onCultureChange?.(cultureId);
    setIsOpen(false);
  };

  const getCurrentCultureDisplay = () => {
    if (!currentCulture) {
      return {
        flag: '🌍',
        name: t('cultures.select'),
      };
    }
    return {
      flag: currentCulture.flag_emoji || '🌍',
      name: getLocalizedName(currentCulture, i18n.language),
    };
  };

  const currentDisplay = getCurrentCultureDisplay();

  // For inline variant, render a horizontal list
  if (variant === 'inline') {
    return (
      <View style={styles.inlineContainer}>
        {showLabel && (
          <Text style={[styles.inlineLabel, { textAlign: isRTL ? 'right' : 'left' }]}>
            {t('cultures.selectCulture')}
          </Text>
        )}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[
              styles.inlineScrollContent,
              { flexDirection: isRTL ? 'row-reverse' : 'row' },
            ]}
          >
            {cultures.map((culture, index) => (
              <CultureCard
                key={culture.culture_id}
                culture={culture}
                isSelected={currentCulture?.culture_id === culture.culture_id}
                isFocused={focusedCultureId === culture.culture_id}
                onFocus={() => setFocusedCultureId(culture.culture_id)}
                onBlur={() => setFocusedCultureId(null)}
                onPress={() => handleSelectCulture(culture.culture_id)}
                localizedName={getLocalizedName(culture, i18n.language)}
                autoFocus={index === 0}
              />
            ))}
          </ScrollView>
        )}
      </View>
    );
  }

  // Modal variant - button that opens a modal
  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => setIsOpen(true)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={[styles.button, isFocused && styles.buttonFocused]}
        accessibilityLabel={t('cultures.changeCulture')}
        accessibilityRole="button"
      >
        <Text style={styles.buttonFlag}>{currentDisplay.flag}</Text>
        {showLabel && (
          <Text style={[styles.buttonText, { textAlign: isRTL ? 'right' : 'left' }]}>
            {currentDisplay.name}
          </Text>
        )}
        <Text style={styles.chevron}>{isRTL ? '◂' : '▸'}</Text>
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={backdropActive ? () => setIsOpen(false) : undefined}
        >
          <View
            style={styles.modalContent}
            onStartShouldSetResponder={() => true}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            <GlassView intensity="high" style={styles.modalDropdown}>
              <Text style={styles.modalTitle}>
                {t('cultures.selectCulture')}
              </Text>
              <Text style={styles.modalSubtitle}>
                {t('cultures.selectCultureDescription')}
              </Text>

              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color={colors.primary} size="large" />
                </View>
              ) : (
                <View style={[styles.culturesGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  {cultures.map((culture, index) => (
                    <CultureCard
                      key={culture.culture_id}
                      culture={culture}
                      isSelected={currentCulture?.culture_id === culture.culture_id}
                      isFocused={focusedCultureId === culture.culture_id}
                      onFocus={() => setFocusedCultureId(culture.culture_id)}
                      onBlur={() => setFocusedCultureId(null)}
                      onPress={() => handleSelectCulture(culture.culture_id)}
                      localizedName={getLocalizedName(culture, i18n.language)}
                      autoFocus={index === 0}
                    />
                  ))}
                </View>
              )}

              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setIsOpen(false)}
              >
                <Text style={styles.closeButtonText}>{t('common.close')}</Text>
              </TouchableOpacity>
            </GlassView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

interface CultureCardProps {
  culture: Culture;
  isSelected: boolean;
  isFocused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  onPress: () => void;
  localizedName: string;
  autoFocus?: boolean;
}

const CultureCard: React.FC<CultureCardProps> = ({
  culture,
  isSelected,
  isFocused,
  onFocus,
  onBlur,
  onPress,
  localizedName,
  autoFocus,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isTV) {
      Animated.spring(scaleAnim, {
        toValue: isFocused ? 1.08 : 1,
        friction: 5,
        useNativeDriver: true,
      }).start();
    }
  }, [isFocused, scaleAnim]);

  return (
    <TouchableOpacity
      onPress={onPress}
      onFocus={onFocus}
      onBlur={onBlur}
      activeOpacity={0.8}
      accessibilityLabel={localizedName}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      // @ts-expect-error - TV/Web specific props
      autoFocus={autoFocus}
      tabIndex={0}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <GlassView
          style={[
            styles.cultureCard,
            isSelected && styles.cultureCardSelected,
            isFocused && styles.cultureCardFocused,
          ]}
          intensity="medium"
        >
          {isSelected && (
            <View style={styles.checkmarkContainer}>
              <Text style={styles.checkmark}>✓</Text>
            </View>
          )}
          <Text style={styles.cultureFlag}>{culture.flag_emoji || '🌍'}</Text>
          <Text style={[styles.cultureName, isSelected && styles.cultureNameSelected]} numberOfLines={1}>
            {localizedName}
          </Text>
          {culture.has_shabbat_mode && (
            <Text style={styles.featureBadge}>🕯️</Text>
          )}
          {culture.has_lunar_calendar && (
            <Text style={styles.featureBadge}>🌙</Text>
          )}
        </GlassView>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'transparent',
    gap: spacing.sm,
  },
  buttonFocused: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
  },
  buttonFlag: {
    fontSize: isTV ? 28 : 24,
  },
  buttonText: {
    flex: 1,
    fontSize: isTV ? fontSize.md : fontSize.sm,
    color: colors.text.primary,
  },
  chevron: {
    fontSize: 12,
    color: colors.text.muted,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: isTV ? 600 : 340,
    maxWidth: '90%',
  },
  modalDropdown: {
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
  },
  modalTitle: {
    fontSize: isTV ? fontSize.xl : fontSize.lg,
    fontWeight: 'bold',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  modalSubtitle: {
    fontSize: isTV ? fontSize.sm : fontSize.xs,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  loadingContainer: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  culturesGrid: {
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  cultureCard: {
    width: isTV ? 140 : 100,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: 'rgba(30, 30, 50, 0.6)',
  },
  cultureCardSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
  },
  cultureCardFocused: {
    borderColor: '#a855f7',
    backgroundColor: 'rgba(107, 33, 168, 0.4)',
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  checkmarkContainer: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  cultureFlag: {
    fontSize: isTV ? 40 : 32,
    marginBottom: spacing.xs,
  },
  cultureName: {
    fontSize: isTV ? fontSize.sm : fontSize.xs,
    color: colors.text.primary,
    textAlign: 'center',
  },
  cultureNameSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  featureBadge: {
    fontSize: 12,
    marginTop: spacing.xs,
  },
  closeButton: {
    padding: spacing.md,
    alignItems: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeButtonText: {
    fontSize: isTV ? fontSize.md : fontSize.sm,
    color: colors.text.secondary,
  },
  inlineContainer: {
    marginVertical: spacing.md,
  },
  inlineLabel: {
    fontSize: isTV ? fontSize.lg : fontSize.md,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  inlineScrollContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
});

export default CultureSelector;
