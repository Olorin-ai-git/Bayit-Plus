import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Timezone } from '../../services/epgApi';
import { colors, spacing, borderRadius } from '../../theme';
import { isTV } from '../../utils/platform';

// Simple time formatting
const formatTime = (date: Date, timezone: Timezone): string => {
  const options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone === 'israel' ? 'Asia/Jerusalem' : undefined,
  };
  return date.toLocaleTimeString('en-US', options);
};

interface EPGTimeControlsProps {
  currentTime: Date;
  timezone: Timezone;
  onTimeShift: (hours: number) => void;
  onJumpToNow: () => void;
  onTimezoneToggle: () => void;
}

export const EPGTimeControls: React.FC<EPGTimeControlsProps> = ({
  currentTime,
  timezone,
  onTimeShift,
  onJumpToNow,
  onTimezoneToggle,
}) => {
  const { t } = useTranslation();
  const [focusedButton, setFocusedButton] = useState<string | null>(null);

  const israelTime = formatTime(currentTime, 'israel');
  const localTime = formatTime(currentTime, 'local');

  return (
    <View style={styles.container}>
      {/* Time Navigation */}
      <View style={styles.navContainer}>
        <TouchableOpacity
          onPress={() => onTimeShift(-2)}
          onFocus={() => setFocusedButton('back')}
          onBlur={() => setFocusedButton(null)}
          style={[
            styles.navButton,
            focusedButton === 'back' && styles.navButtonFocused,
          ]}
        >
          <Text style={styles.navIcon}>◀</Text>
          <Text style={styles.navText}>{t('epg.goBack', '-2 Hours')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onJumpToNow}
          onFocus={() => setFocusedButton('now')}
          onBlur={() => setFocusedButton(null)}
          style={[
            styles.nowButton,
            focusedButton === 'now' && styles.nowButtonFocused,
          ]}
        >
          <Text style={styles.nowIcon}>🕐</Text>
          <Text style={styles.nowText}>{t('epg.jumpToNow', 'Now')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onTimeShift(2)}
          onFocus={() => setFocusedButton('forward')}
          onBlur={() => setFocusedButton(null)}
          style={[
            styles.navButton,
            focusedButton === 'forward' && styles.navButtonFocused,
          ]}
        >
          <Text style={styles.navText}>{t('epg.goForward', '+2 Hours')}</Text>
          <Text style={styles.navIcon}>▶</Text>
        </TouchableOpacity>
      </View>

      {/* Timezone Toggle */}
      <TouchableOpacity
        onPress={onTimezoneToggle}
        onFocus={() => setFocusedButton('timezone')}
        onBlur={() => setFocusedButton(null)}
        style={[
          styles.timezoneButton,
          focusedButton === 'timezone' && styles.timezoneButtonFocused,
        ]}
      >
        <Text style={styles.timezoneIcon}>🌍</Text>
        <View style={styles.timezoneInfo}>
          <Text style={styles.timezoneLabel}>
            {timezone === 'israel' ? t('epg.israelTime', 'Israel Time') : t('epg.localTime', 'Local Time')}
          </Text>
          <View style={styles.timezoneValues}>
            <Text style={[styles.timezoneValue, timezone === 'israel' && styles.timezoneActive]}>
              {t('epg.il', 'IL')}: {israelTime}
            </Text>
            <Text style={styles.timezoneSeparator}>|</Text>
            <Text style={[styles.timezoneValue, timezone === 'local' && styles.timezoneActive]}>
              {t('epg.local', 'Local')}: {localTime}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  navContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: borderRadius.xl,
    padding: spacing.xs,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  navButtonFocused: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: colors.primary,
  },
  navIcon: {
    fontSize: isTV ? 16 : 14,
    color: colors.textSecondary,
    marginHorizontal: spacing.xs,
  },
  navText: {
    fontSize: isTV ? 16 : 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  nowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  nowButtonFocused: {
    backgroundColor: 'rgba(168, 85, 247, 0.4)',
    borderColor: colors.primary,
  },
  nowIcon: {
    fontSize: isTV ? 18 : 16,
    marginRight: spacing.sm,
  },
  nowText: {
    fontSize: isTV ? 16 : 14,
    fontWeight: '500',
    color: colors.primary,
  },
  timezoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  timezoneButtonFocused: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderColor: colors.primary,
  },
  timezoneIcon: {
    fontSize: isTV ? 20 : 18,
    marginRight: spacing.md,
  },
  timezoneInfo: {
    alignItems: 'flex-start',
  },
  timezoneLabel: {
    fontSize: isTV ? 12 : 10,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 2,
  },
  timezoneValues: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timezoneValue: {
    fontSize: isTV ? 14 : 12,
    fontWeight: '500',
    color: colors.text,
  },
  timezoneActive: {
    color: colors.primary,
  },
  timezoneSeparator: {
    fontSize: isTV ? 14 : 12,
    color: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: spacing.sm,
  },
});

export default EPGTimeControls;
