import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Timezone } from '../../services/epgApi';
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
    <View className="flex-row items-center flex-wrap gap-4 py-4">
      {/* Time Navigation */}
      <View className="flex-row items-center bg-black/20 rounded-3xl p-1">
        <TouchableOpacity
          onPress={() => onTimeShift(-2)}
          onFocus={() => setFocusedButton('back')}
          onBlur={() => setFocusedButton(null)}
          className={`flex-row items-center px-4 py-2 rounded-lg border-2 ${
            focusedButton === 'back' ? 'bg-white/10 border-purple-500' : 'border-transparent'
          }`}
        >
          <Text className="text-gray-400 mx-1" style={{ fontSize: isTV ? 16 : 14 }}>◀</Text>
          <Text className="text-gray-400 font-medium" style={{ fontSize: isTV ? 16 : 14 }}>
            {t('epg.goBack', '-2 Hours')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onJumpToNow}
          onFocus={() => setFocusedButton('now')}
          onBlur={() => setFocusedButton(null)}
          className={`flex-row items-center px-6 py-2 bg-purple-500/20 rounded-lg mx-2 border-2 ${
            focusedButton === 'now' ? 'bg-purple-500/40 border-purple-500' : 'border-transparent'
          }`}
        >
          <Text className="mr-2" style={{ fontSize: isTV ? 18 : 16 }}>🕐</Text>
          <Text className="text-purple-500 font-medium" style={{ fontSize: isTV ? 16 : 14 }}>
            {t('epg.jumpToNow', 'Now')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onTimeShift(2)}
          onFocus={() => setFocusedButton('forward')}
          onBlur={() => setFocusedButton(null)}
          className={`flex-row items-center px-4 py-2 rounded-lg border-2 ${
            focusedButton === 'forward' ? 'bg-white/10 border-purple-500' : 'border-transparent'
          }`}
        >
          <Text className="text-gray-400 font-medium" style={{ fontSize: isTV ? 16 : 14 }}>
            {t('epg.goForward', '+2 Hours')}
          </Text>
          <Text className="text-gray-400 mx-1" style={{ fontSize: isTV ? 16 : 14 }}>▶</Text>
        </TouchableOpacity>
      </View>

      {/* Timezone Toggle */}
      <TouchableOpacity
        onPress={onTimezoneToggle}
        onFocus={() => setFocusedButton('timezone')}
        onBlur={() => setFocusedButton(null)}
        className={`flex-row items-center px-6 py-2 bg-black/20 rounded-3xl border-2 ${
          focusedButton === 'timezone' ? 'bg-black/30 border-purple-500' : 'border-transparent'
        }`}
      >
        <Text className="mr-4" style={{ fontSize: isTV ? 20 : 18 }}>🌍</Text>
        <View className="items-start">
          <Text className="text-white/60 mb-0.5" style={{ fontSize: isTV ? 12 : 10 }}>
            {timezone === 'israel' ? t('epg.israelTime', 'Israel Time') : t('epg.localTime', 'Local Time')}
          </Text>
          <View className="flex-row items-center">
            <Text
              className={timezone === 'israel' ? 'text-purple-500' : 'text-white'}
              style={{ fontSize: isTV ? 14 : 12, fontWeight: '500' }}
            >
              {t('epg.il', 'IL')}: {israelTime}
            </Text>
            <Text className="text-white/40 mx-2" style={{ fontSize: isTV ? 14 : 12 }}>|</Text>
            <Text
              className={timezone === 'local' ? 'text-purple-500' : 'text-white'}
              style={{ fontSize: isTV ? 14 : 12, fontWeight: '500' }}
            >
              {t('epg.local', 'Local')}: {localTime}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default EPGTimeControls;
