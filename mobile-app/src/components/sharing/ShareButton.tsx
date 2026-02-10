import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { shareContent, type ShareContent } from '../../services/shareService';

interface ShareButtonProps {
  content: ShareContent;
  variant?: 'primary' | 'secondary' | 'icon';
  size?: 'small' | 'medium' | 'large';
  onShareSuccess?: () => void;
  onShareError?: (error: Error) => void;
}

export function ShareButton({
  content,
  variant = 'secondary',
  size = 'medium',
  onShareSuccess,
  onShareError,
}: ShareButtonProps) {
  const { t } = useTranslation();
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async () => {
    setIsSharing(true);
    try {
      const success = await shareContent(content);
      if (success) {
        onShareSuccess?.();
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Share failed');
      onShareError?.(err);
      Alert.alert(
        t('common.error', 'Error'),
        err.message || t('sharing.failed', 'Failed to share content')
      );
    } finally {
      setIsSharing(false);
    }
  };

  const buttonStyles = [
    styles.button,
    styles[`button${variant.charAt(0).toUpperCase() + variant.slice(1)}` as keyof typeof styles],
    styles[`button${size.charAt(0).toUpperCase() + size.slice(1)}` as keyof typeof styles],
  ];

  const textStyles = [
    styles.text,
    styles[`text${variant.charAt(0).toUpperCase() + variant.slice(1)}` as keyof typeof styles],
    styles[`text${size.charAt(0).toUpperCase() + size.slice(1)}` as keyof typeof styles],
  ];

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={handleShare}
      disabled={isSharing}
      activeOpacity={0.7}
    >
      {isSharing ? (
        <ActivityIndicator size="small" color={variant === 'primary' ? '#fff' : '#A855F7'} />
      ) : (
        <Text style={textStyles}>
          {variant === 'icon' ? '↗' : t('sharing.share', 'Share')}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  buttonPrimary: {
    backgroundColor: '#A855F7',
  },
  buttonSecondary: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  buttonIcon: {
    backgroundColor: 'transparent',
  },
  buttonSmall: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  buttonMedium: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  buttonLarge: {
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  text: {
    fontWeight: '600',
  },
  textPrimary: {
    color: '#fff',
  },
  textSecondary: {
    color: '#fff',
  },
  textIcon: {
    fontSize: 20,
    color: '#fff',
  },
  textSmall: {
    fontSize: 13,
  },
  textMedium: {
    fontSize: 14,
  },
  textLarge: {
    fontSize: 16,
  },
});
