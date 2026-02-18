/**
 * SettingAction - Reusable action button for tvOS settings screens
 *
 * Renders a focusable action card with icon, label, and description.
 * Supports standard and danger variants for destructive actions.
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { config } from '../../config/appConfig';

interface SettingActionProps {
  icon: any;
  label: string;
  description: string;
  onPress: () => void;
  isFocused: boolean;
  onFocus: () => void;
  variant?: 'standard' | 'danger';
  hasTVPreferredFocus?: boolean;
}

export const SettingAction: React.FC<SettingActionProps> = ({
  icon: Icon,
  label,
  description,
  onPress,
  isFocused,
  onFocus,
  variant = 'standard',
  hasTVPreferredFocus,
}) => {
  const isDanger = variant === 'danger';
  const iconColor = isDanger ? '#EF4444' : '#A855F7';

  return (
    <Pressable
      onPress={onPress}
      onFocus={onFocus}
      hasTVPreferredFocus={hasTVPreferredFocus}
      style={styles.button}
    >
      <View style={[
        styles.card,
        isDanger && styles.cardDanger,
        isFocused && (isDanger ? styles.cardDangerFocused : styles.cardFocused),
      ]}>
        <View style={[styles.iconContainer, isDanger && styles.iconContainerDanger]}>
          <Icon size={28} color={iconColor} />
        </View>
        <View style={styles.content}>
          <Text style={[styles.label, isDanger && styles.labelDanger]}>{label}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    width: '100%',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    backgroundColor: 'rgba(20,20,35,0.85)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cardFocused: {
    borderColor: '#A855F7',
    borderWidth: config.tv.focusBorderWidth,
    transform: [{ scale: 1.02 }],
  },
  cardDanger: {
    borderColor: 'rgba(239,68,68,0.3)',
  },
  cardDangerFocused: {
    borderColor: '#EF4444',
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
  iconContainerDanger: {
    backgroundColor: 'rgba(239,68,68,0.2)',
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
  labelDanger: {
    color: '#EF4444',
  },
  description: {
    fontSize: 22,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.6)',
  },
});
