/**
 * Family PIN Modal - PIN setup and verification modal.
 *
 * Supports:
 * - Initial PIN setup (create new PIN)
 * - PIN verification (enter existing PIN)
 * - PIN update (change existing PIN)
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { GlassInput } from '@bayit/shared/ui';
import { useTranslation } from 'react-i18next';
import { useFamilyControlsStore } from '../../stores/familyControlsStore';

interface FamilyPinModalProps {
  visible: boolean;
  mode: 'setup' | 'verify' | 'update';
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  description?: string;
}

export const FamilyPinModal: React.FC<FamilyPinModalProps> = ({
  visible,
  mode,
  onClose,
  onSuccess,
  title,
  description,
}) => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [oldPin, setOldPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { t } = useTranslation();
  const { setFamilyPin, verifyFamilyPin, updatePin } = useFamilyControlsStore();

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    try {
      if (mode === 'setup') {
        if (pin.length < 4) {
          setError(t('familyControls.errors.pinTooShort'));
          setLoading(false);
          return;
        }
        if (pin !== confirmPin) {
          setError(t('familyControls.errors.pinMismatch'));
          setLoading(false);
          return;
        }

        const success = await setFamilyPin(pin);
        if (success) {
          onSuccess();
          resetForm();
        } else {
          setError(t('familyControls.errors.failedToSetPin'));
        }
      } else if (mode === 'verify') {
        const isValid = await verifyFamilyPin(pin);
        if (isValid) {
          onSuccess();
          resetForm();
        } else {
          setError(t('familyControls.errors.invalidPin'));
        }
      } else if (mode === 'update') {
        if (pin.length < 4) {
          setError(t('familyControls.errors.newPinTooShort'));
          setLoading(false);
          return;
        }
        if (pin !== confirmPin) {
          setError(t('familyControls.errors.pinMismatch'));
          setLoading(false);
          return;
        }

        const success = await updatePin(oldPin, pin);
        if (success) {
          onSuccess();
          resetForm();
        } else {
          setError(t('familyControls.errors.failedToUpdatePin'));
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setPin('');
    setConfirmPin('');
    setOldPin('');
    setError('');
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.modal}>
        <Text style={styles.title}>{title || t('familyControls.familyPin')}</Text>
        {description && <Text style={styles.description}>{description}</Text>}

        {mode === 'update' && (
          <GlassInput
            style={styles.input}
            placeholder={t('familyControls.placeholders.currentPin')}
            placeholderTextColor="#888"
            value={oldPin}
            onChangeText={setOldPin}
            secureTextEntry
            keyboardType="numeric"
            maxLength={6}
          />
        )}

        <GlassInput
          style={styles.input}
          placeholder={mode === 'verify' ? t('familyControls.placeholders.enterPin') : t('familyControls.placeholders.enterNewPin')}
          placeholderTextColor="#888"
          value={pin}
          onChangeText={setPin}
          secureTextEntry
          keyboardType="numeric"
          maxLength={6}
        />

        {(mode === 'setup' || mode === 'update') && (
          <GlassInput
            style={styles.input}
            placeholder={t('familyControls.placeholders.confirmNewPin')}
            placeholderTextColor="#888"
            value={confirmPin}
            onChangeText={setConfirmPin}
            secureTextEntry
            keyboardType="numeric"
            maxLength={6}
          />
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.buttons}>
          <Pressable style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
          </Pressable>
          <Pressable
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? t('common.processing') : t('common.confirm')}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: 'rgba(20, 20, 30, 0.95)',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    backdropFilter: 'blur(20px)',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  error: {
    color: '#ff4444',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#A855F7',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
