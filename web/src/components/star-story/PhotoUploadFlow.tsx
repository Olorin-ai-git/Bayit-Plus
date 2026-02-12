import { useState, useCallback, useRef } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Upload, Shield, CheckCircle, Loader } from 'lucide-react';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { useStarStoryStore } from '@/stores/starStoryStore';
import { AvatarStylePicker } from './AvatarStylePicker';
import logger from '@bayit/shared-utils/logger';

const uploadLogger = logger.scope('PhotoUploadFlow');

interface PhotoUploadFlowProps {
  profileId: string;
  onComplete: () => void;
  onDismiss: () => void;
}

type FlowStep = 'consent' | 'upload' | 'style' | 'processing';

export function PhotoUploadFlow({ profileId, onComplete, onDismiss }: PhotoUploadFlowProps) {
  const { grantConsent } = useStarStoryStore();
  const [step, setStep] = useState<FlowStep>('consent');
  const [consentChecked, setConsentChecked] = useState(false);
  const [pinValue, setPinValue] = useState('');
  const [childName, setChildName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleConsentSubmit = useCallback(async () => {
    if (!consentChecked || !pinValue || !childName) return;
    setError(null);
    try {
      await grantConsent({ profile_id: profileId, child_first_name: childName, pin_hash: pinValue });
      setStep('upload');
    } catch (err: any) {
      setError(err?.detail || err?.message || 'Consent failed');
      uploadLogger.error('Consent grant failed', err);
    }
  }, [consentChecked, pinValue, childName, profileId, grantConsent]);

  const handleFileSelect = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  const handleFileChange = useCallback((event: any) => {
    const file = event?.target?.files?.[0];
    if (file) {
      setSelectedFile(file);
      setStep('style');
    }
  }, []);

  const handleDrop = useCallback((event: any) => {
    event.preventDefault();
    const file = event?.dataTransfer?.files?.[0];
    if (file) {
      setSelectedFile(file);
      setStep('style');
    }
  }, []);

  const handleStyleSelected = useCallback(() => {
    setStep('processing');
    const timer = setTimeout(() => onComplete(), 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <View style={styles.overlay}>
      <View style={styles.modal}>
        <View style={styles.stepIndicator}>
          {(['consent', 'upload', 'style', 'processing'] as FlowStep[]).map((s, i) => (
            <View key={s} style={[styles.stepDot, step === s && styles.stepDotActive, (['consent', 'upload', 'style', 'processing'].indexOf(step) > i) && styles.stepDotDone]} />
          ))}
        </View>

        {step === 'consent' && (
          <View style={styles.stepContent}>
            <Shield size={32} color={colors.primary[400]} />
            <Text style={styles.stepTitle}>Family Safety Consent</Text>
            <Text style={styles.consentText}>
              Star in Story creates personalized content for children. Photos are processed securely
              and used solely for avatar generation. Data is handled in compliance with COPPA regulations.
              A parent or guardian must provide consent.
            </Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Child First Name</Text>
              <View style={styles.textInput}>
                <Text style={styles.inputPlaceholder}>{childName || 'Enter name...'}</Text>
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Family PIN</Text>
              <View style={styles.textInput}>
                <Text style={styles.inputPlaceholder}>{pinValue ? '****' : 'Enter PIN...'}</Text>
              </View>
            </View>
            <Pressable style={styles.checkboxRow} onPress={() => setConsentChecked(!consentChecked)}>
              <View style={[styles.checkbox, consentChecked && styles.checkboxChecked]}>
                {consentChecked && <CheckCircle size={16} color={colors.white} />}
              </View>
              <Text style={styles.checkboxLabel}>I consent as parent/guardian to create a personalized avatar</Text>
            </Pressable>
            {error && <Text style={styles.errorText}>{error}</Text>}
            <View style={styles.buttonRow}>
              <Pressable style={styles.secondaryButton} onPress={onDismiss}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.primaryButton, (!consentChecked || !pinValue || !childName) && styles.buttonDisabled]} onPress={handleConsentSubmit}>
                <Text style={styles.primaryButtonText}>Continue</Text>
              </Pressable>
            </View>
          </View>
        )}

        {step === 'upload' && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Upload Photo</Text>
            <Pressable style={styles.dropZone} onPress={handleFileSelect}>
              <Upload size={40} color={colors.primary[400]} />
              <Text style={styles.dropTitle}>Drag and drop or tap to select</Text>
              <Text style={styles.dropHint}>PNG or JPG, clear face visible</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={onDismiss}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>
          </View>
        )}

        {step === 'style' && (
          <AvatarStylePicker onStyleSelected={handleStyleSelected} onBack={() => setStep('upload')} />
        )}

        {step === 'processing' && (
          <View style={styles.stepContent}>
            <Loader size={40} color={colors.primary[400]} />
            <Text style={styles.stepTitle}>Creating Avatar</Text>
            <Text style={styles.processingText}>Generating your personalized avatar...</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  modal: { backgroundColor: colors.glass.bgStrong, borderRadius: borderRadius.xl, borderWidth: 1, borderColor: colors.glass.border, padding: spacing[6], maxWidth: 480, width: '90%', maxHeight: '90%' },
  stepIndicator: { flexDirection: 'row', justifyContent: 'center', gap: spacing[2], marginBottom: spacing[5] },
  stepDot: { width: 8, height: 8, borderRadius: borderRadius.full, backgroundColor: colors.glass.bgMedium },
  stepDotActive: { backgroundColor: colors.primary[400], width: 24 },
  stepDotDone: { backgroundColor: colors.primary[600] },
  stepContent: { alignItems: 'center', gap: spacing[4] },
  stepTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  consentText: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  inputGroup: { width: '100%', gap: spacing[1] },
  inputLabel: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '500' },
  textInput: { backgroundColor: colors.glass.bgMedium, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.glass.border, padding: spacing[3] },
  inputPlaceholder: { fontSize: fontSize.sm, color: colors.textMuted },
  checkboxRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2], width: '100%' },
  checkbox: { width: 24, height: 24, borderRadius: borderRadius.sm, borderWidth: 2, borderColor: colors.glass.border, justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
  checkboxLabel: { flex: 1, fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },
  errorText: { fontSize: fontSize.sm, color: colors.error[500] },
  buttonRow: { flexDirection: 'row', gap: spacing[3], width: '100%' },
  primaryButton: { flex: 1, backgroundColor: colors.primary[600], borderRadius: borderRadius.md, padding: spacing[3], alignItems: 'center' },
  primaryButtonText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.white },
  secondaryButton: { flex: 1, backgroundColor: colors.glass.bgMedium, borderRadius: borderRadius.md, padding: spacing[3], alignItems: 'center', borderWidth: 1, borderColor: colors.glass.border },
  secondaryButtonText: { fontSize: fontSize.sm, fontWeight: '500', color: colors.textSecondary },
  buttonDisabled: { opacity: 0.5 },
  dropZone: { width: '100%', borderWidth: 2, borderColor: colors.glass.borderLight, borderStyle: 'dashed', borderRadius: borderRadius.lg, padding: spacing[8], alignItems: 'center', gap: spacing[3], backgroundColor: colors.glass.bgLight },
  dropTitle: { fontSize: fontSize.base, color: colors.text, fontWeight: '500' },
  dropHint: { fontSize: fontSize.xs, color: colors.textMuted },
  processingText: { fontSize: fontSize.sm, color: colors.textSecondary },
});
