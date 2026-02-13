/**
 * ConfirmModal - Confirmation dialog for tvOS
 *
 * Supports destructive, warning, and info types with TV focus management
 */

import React, { useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react-native';
import { config } from '../../config/appConfig';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  type: 'destructive' | 'warning' | 'info';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  type,
}) => {
  const [focusedButton, setFocusedButton] = useState<'confirm' | 'cancel'>('confirm');

  const getIcon = () => {
    switch (type) {
      case 'destructive':
        return <AlertCircle size={48} color="#EF4444" />;
      case 'warning':
        return <AlertTriangle size={48} color="#F59E0B" />;
      case 'info':
        return <Info size={48} color="#3B82F6" />;
    }
  };

  const getColors = () => {
    switch (type) {
      case 'destructive':
        return {
          iconBg: 'rgba(239,68,68,0.2)',
          confirmBg: '#EF4444',
          confirmBgFocused: '#DC2626',
        };
      case 'warning':
        return {
          iconBg: 'rgba(245,158,11,0.2)',
          confirmBg: '#F59E0B',
          confirmBgFocused: '#D97706',
        };
      case 'info':
        return {
          iconBg: 'rgba(59,130,246,0.2)',
          confirmBg: '#3B82F6',
          confirmBgFocused: '#2563EB',
        };
    }
  };

  const colors = getColors();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={[styles.iconContainer, { backgroundColor: colors.iconBg }]}>
            {getIcon()}
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.buttons}>
            <Pressable
              onPress={onConfirm}
              onFocus={() => setFocusedButton('confirm')}
              hasTVPreferredFocus
              style={styles.button}
            >
              <View style={[
                styles.buttonInner,
                { backgroundColor: focusedButton === 'confirm' ? colors.confirmBgFocused : colors.confirmBg },
                focusedButton === 'confirm' && styles.buttonFocused,
              ]}>
                <Text style={styles.buttonText}>{confirmLabel}</Text>
              </View>
            </Pressable>

            <Pressable
              onPress={onCancel}
              onFocus={() => setFocusedButton('cancel')}
              style={styles.button}
            >
              <View style={[
                styles.buttonInner,
                styles.cancelButton,
                focusedButton === 'cancel' && styles.buttonFocused,
              ]}>
                <Text style={styles.buttonText}>{cancelLabel}</Text>
              </View>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: 700,
    backgroundColor: 'rgba(20,20,35,0.98)',
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 16,
  },
  message: {
    fontSize: 24,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 32,
  },
  buttons: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
  },
  button: {
    flex: 1,
  },
  buttonInner: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  buttonFocused: {
    borderColor: '#ffffff',
    borderWidth: config.tv.focusBorderWidth,
    transform: [{ scale: 1.05 }],
  },
  cancelButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  buttonText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
});
