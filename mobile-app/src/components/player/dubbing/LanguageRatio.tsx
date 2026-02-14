/**
 * LanguageRatio - Volume ratio slider between original and dubbed audio
 *
 * Provides a visual slider showing the percentage mix between the
 * original language audio and the dubbed target language audio.
 */

import React, { useCallback } from 'react';
import { View, Text, StyleSheet, PanResponder, Dimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { spacing, borderRadius } from '@olorin/design-tokens';
import Colors from '../../../theme/colors';

const SLIDER_HEIGHT = 6;
const THUMB_SIZE = 24;
const TRACK_HORIZONTAL_PAD = 16;

interface LanguageRatioProps {
  ratio: number;
  onChange: (ratio: number) => void;
  originalLang: string;
  targetLang: string;
}

export const LanguageRatio: React.FC<LanguageRatioProps> = ({
  ratio,
  onChange,
  originalLang,
  targetLang,
}) => {
  const { t } = useTranslation();
  const screenWidth = Dimensions.get('window').width;
  const trackWidth = screenWidth - TRACK_HORIZONTAL_PAD * 4;

  const originalPercent = Math.round((1 - ratio) * 100);
  const dubbedPercent = Math.round(ratio * 100);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (_, gestureState) => {
      const newRatio = Math.max(
        0,
        Math.min(1, gestureState.x0 / trackWidth),
      );
      onChange(newRatio);
    },
    onPanResponderMove: (_, gestureState) => {
      const newRatio = Math.max(
        0,
        Math.min(1, (gestureState.x0 + gestureState.dx) / trackWidth),
      );
      onChange(newRatio);
    },
  });

  return (
    <View
      style={styles.container}
      accessibilityLabel={t('dubbing.languageRatio.label')}
      accessibilityHint={t('dubbing.languageRatio.hint')}
      accessibilityRole="adjustable"
      accessibilityValue={{
        min: 0,
        max: 100,
        now: dubbedPercent,
      }}
    >
      <View style={styles.labelsRow}>
        <View style={styles.langLabel}>
          <Text style={styles.langCode}>{originalLang.toUpperCase()}</Text>
          <Text style={styles.percentText}>{originalPercent}%</Text>
        </View>
        <Text style={styles.sliderTitle}>
          {t('dubbing.languageRatio.title')}
        </Text>
        <View style={styles.langLabel}>
          <Text style={styles.langCode}>{targetLang.toUpperCase()}</Text>
          <Text style={styles.percentText}>{dubbedPercent}%</Text>
        </View>
      </View>

      <View style={styles.trackContainer} {...panResponder.panHandlers}>
        <View style={styles.track}>
          <View
            style={[styles.trackFillOriginal, { flex: 1 - ratio }]}
          />
          <View
            style={[styles.trackFillDubbed, { flex: ratio }]}
          />
        </View>
        <View
          style={[
            styles.thumb,
            { left: ratio * trackWidth - THUMB_SIZE / 2 },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  langLabel: {
    alignItems: 'center',
    gap: 2,
  },
  langCode: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.Text.secondary,
  },
  percentText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.Text.primary,
  },
  sliderTitle: {
    fontSize: 12,
    color: Colors.Text.muted,
    fontWeight: '500',
  },
  trackContainer: {
    height: THUMB_SIZE,
    justifyContent: 'center',
    paddingHorizontal: THUMB_SIZE / 2,
  },
  track: {
    height: SLIDER_HEIGHT,
    borderRadius: SLIDER_HEIGHT / 2,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  trackFillOriginal: {
    backgroundColor: Colors.Info.default,
  },
  trackFillDubbed: {
    backgroundColor: Colors.Primary.p500,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: Colors.Text.primary,
    borderWidth: 3,
    borderColor: Colors.Primary.p600,
    elevation: 3,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
});
