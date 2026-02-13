/**
 * SettingRow - Reusable setting component for tvOS
 *
 * Supports toggle, select, and slider input types with TV focus management
 */

import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { config } from '../../config/appConfig';

interface SettingRowProps {
  icon: any;
  label: string;
  description?: string;
  type: 'toggle' | 'select' | 'slider';
  value: boolean | string | number;
  options?: Array<{ label: string; value: string | number }>;
  onChange: (newValue: any) => Promise<void>;
  isFocused: boolean;
  onFocus: () => void;
  hasTVPreferredFocus?: boolean;
  min?: number;
  max?: number;
  step?: number;
}

export const SettingRow: React.FC<SettingRowProps> = ({
  icon: Icon,
  label,
  description,
  type,
  value,
  options,
  onChange,
  isFocused,
  onFocus,
  hasTVPreferredFocus,
  min = 0,
  max = 100,
  step = 1,
}) => {
  const [isSaving, setIsSaving] = useState(false);

  const handleToggle = async () => {
    if (type !== 'toggle' || isSaving) return;

    setIsSaving(true);
    try {
      await onChange(!value);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectNext = async () => {
    if (type !== 'select' || !options || isSaving) return;

    const currentIndex = options.findIndex(opt => opt.value === value);
    const nextIndex = (currentIndex + 1) % options.length;

    setIsSaving(true);
    try {
      await onChange(options[nextIndex].value);
    } finally {
      setIsSaving(false);
    }
  };

  const renderControl = () => {
    if (isSaving) {
      return <ActivityIndicator color="#A855F7" size="small" />;
    }

    if (type === 'toggle') {
      return (
        <View style={[styles.toggle, value && styles.toggleActive]}>
          <View style={[styles.toggleThumb, value && styles.toggleThumbActive]} />
        </View>
      );
    }

    if (type === 'select' && options) {
      const selected = options.find(opt => opt.value === value);
      return (
        <Text style={styles.selectValue}>
          {selected?.label || String(value)}
        </Text>
      );
    }

    if (type === 'slider') {
      return (
        <Text style={styles.sliderValue}>
          {typeof value === 'number' ? value.toFixed(1) : value}
        </Text>
      );
    }

    return null;
  };

  return (
    <Pressable
      onPress={type === 'toggle' ? handleToggle : handleSelectNext}
      onFocus={onFocus}
      hasTVPreferredFocus={hasTVPreferredFocus}
      style={styles.container}
      disabled={isSaving}
    >
      <View style={[styles.row, isFocused && styles.rowFocused]}>
        <View style={styles.iconContainer}>
          <Icon size={28} color="#A855F7" />
        </View>
        <View style={styles.content}>
          <Text style={styles.label}>{label}</Text>
          {description && <Text style={styles.description}>{description}</Text>}
        </View>
        <View style={styles.controlContainer}>
          {renderControl()}
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    backgroundColor: 'rgba(20,20,35,0.85)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  rowFocused: {
    borderColor: '#A855F7',
    borderWidth: config.tv.focusBorderWidth,
    transform: [{ scale: 1.02 }],
  },
  iconContainer: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(168,85,247,0.2)',
    borderRadius: 10,
  },
  content: {
    flex: 1,
    gap: 4,
  },
  label: {
    fontSize: config.tv.minBodyTextSizePt,
    fontWeight: '700',
    color: '#ffffff',
  },
  description: {
    fontSize: 22,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.6)',
  },
  controlContainer: {
    minWidth: 80,
    alignItems: 'flex-end',
  },
  toggle: {
    width: 60,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: '#A855F7',
  },
  toggleThumb: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    alignSelf: 'flex-start',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  selectValue: {
    fontSize: 24,
    fontWeight: '600',
    color: '#A855F7',
  },
  sliderValue: {
    fontSize: 24,
    fontWeight: '600',
    color: '#A855F7',
  },
});
