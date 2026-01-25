import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Save, Play, RefreshCw } from 'lucide-react';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { GlassCard, GlassButton, GlassInput, GlassSelect, GlassModal } from '@bayit/shared/ui';
import { voiceManagementService } from '@/services/voiceManagementApi';
import { useDirection } from '@/hooks/useDirection';
import logger from '@/utils/logger';

interface VoiceConfig {
  default_voice_id: string;
  assistant_voice_id: string;
  support_voice_id: string;
  stt_provider: string;
  translation_provider: string;
}

export default function VoiceConfigurationPanel() {
  const { t } = useTranslation();
  const { textAlign } = useDirection();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<VoiceConfig | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [testVoiceId, setTestVoiceId] = useState<string>('');
  const [testing, setTesting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const loadConfiguration = async () => {
    setLoading(true);
    try {
      const response = await voiceManagementService.getVoiceConfig();
      setConfig(response.config);
    } catch (error: any) {
      logger.error('Failed to load voice config', 'VoiceConfigurationPanel', error);
      setErrorMessage(error?.message || 'Failed to load voice configuration');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfiguration();
  }, []);

  const handleConfigChange = (key: keyof VoiceConfig, value: string) => {
    if (!config) return;
    setConfig({ ...config, [key]: value });
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      // Save each config key separately
      const updates = Object.entries(config).map(([key, value]) =>
        voiceManagementService.updateVoiceConfig({
          config_key: key,
          config_value: value,
          config_type: key.includes('voice_id') ? 'voice_id' : 'provider',
        })
      );

      await Promise.all(updates);

      setHasChanges(false);
      setSuccessMessage('Voice configuration saved successfully');
    } catch (error: any) {
      logger.error('Failed to save voice config', 'VoiceConfigurationPanel', error);
      setErrorMessage(error?.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleTestVoice = async (voiceId: string) => {
    if (!voiceId) return;
    setTesting(true);
    setErrorMessage('');

    try {
      const response = await voiceManagementService.testVoice(voiceId, 'Hello, this is a voice test.', 'en');

      // Play audio
      const audio = new Audio(`data:audio/mp3;base64,${response.audio_base64}`);
      await audio.play();

      setSuccessMessage('Voice test played successfully');
    } catch (error: any) {
      logger.error('Failed to test voice', 'VoiceConfigurationPanel', error);
      setErrorMessage(error?.message || 'Failed to test voice');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (!config) {
    return (
      <GlassCard>
        <Text style={styles.errorText}>{t('admin.voiceManagement.configuration.loadError')}</Text>
      </GlassCard>
    );
  }

  return (
    <View>
      <GlassCard style={styles.card}>
        <Text style={[styles.sectionTitle, { textAlign }]}>
          {t('admin.voiceManagement.configuration.voiceIds')}
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('admin.voiceManagement.configuration.defaultVoice')}</Text>
          <View style={styles.inputRow}>
            <GlassInput
              value={config.default_voice_id}
              onChangeText={(value) => handleConfigChange('default_voice_id', value)}
              placeholder="EXAVITQu4vr4xnSDxMaL"
              style={styles.input}
            />
            <GlassButton
              title=""
              icon={<Play size={16} color={colors.primary} />}
              variant="secondary"
              onPress={() => handleTestVoice(config.default_voice_id)}
              disabled={testing}
              style={styles.testButton}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('admin.voiceManagement.configuration.assistantVoice')}</Text>
          <View style={styles.inputRow}>
            <GlassInput
              value={config.assistant_voice_id}
              onChangeText={(value) => handleConfigChange('assistant_voice_id', value)}
              placeholder="ashjVK50jp28G73AUTnb"
              style={styles.input}
            />
            <GlassButton
              title=""
              icon={<Play size={16} color={colors.primary} />}
              variant="secondary"
              onPress={() => handleTestVoice(config.assistant_voice_id)}
              disabled={testing}
              style={styles.testButton}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('admin.voiceManagement.configuration.supportVoice')}</Text>
          <View style={styles.inputRow}>
            <GlassInput
              value={config.support_voice_id}
              onChangeText={(value) => handleConfigChange('support_voice_id', value)}
              placeholder="ashjVK50jp28G73AUTnb"
              style={styles.input}
            />
            <GlassButton
              title=""
              icon={<Play size={16} color={colors.primary} />}
              variant="secondary"
              onPress={() => handleTestVoice(config.support_voice_id)}
              disabled={testing}
              style={styles.testButton}
            />
          </View>
        </View>

        <Text style={[styles.sectionTitle, { textAlign, marginTop: spacing.lg }]}>
          {t('admin.voiceManagement.configuration.providers')}
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('admin.voiceManagement.configuration.sttProvider')}</Text>
          <GlassSelect
            value={config.stt_provider}
            onValueChange={(value) => handleConfigChange('stt_provider', value)}
            options={[
              { label: 'ElevenLabs', value: 'elevenlabs' },
              { label: 'OpenAI Whisper', value: 'whisper' },
              { label: 'Google Cloud', value: 'google' },
            ]}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('admin.voiceManagement.configuration.translationProvider')}</Text>
          <GlassSelect
            value={config.translation_provider}
            onValueChange={(value) => handleConfigChange('translation_provider', value)}
            options={[
              { label: 'Google Translate', value: 'google' },
              { label: 'OpenAI GPT-4', value: 'openai' },
              { label: 'Claude', value: 'claude' },
            ]}
          />
        </View>

        {hasChanges && (
          <View style={styles.actionRow}>
            <GlassButton
              title={t('common.save')}
              icon={<Save size={16} color="#fff" />}
              variant="primary"
              onPress={handleSave}
              loading={saving}
              style={styles.saveButton}
            />
            <GlassButton
              title={t('common.refresh')}
              icon={<RefreshCw size={16} color={colors.textMuted} />}
              variant="secondary"
              onPress={loadConfiguration}
            />
          </View>
        )}
      </GlassCard>

      {successMessage && (
        <GlassModal visible={true} onClose={() => setSuccessMessage('')}>
          <Text style={styles.modalText}>{successMessage}</Text>
        </GlassModal>
      )}

      {errorMessage && (
        <GlassModal visible={true} onClose={() => setErrorMessage('')}>
          <Text style={[styles.modalText, styles.errorModalText]}>{errorMessage}</Text>
        </GlassModal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.base,
    color: colors.textMuted,
  },
  card: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
  },
  testButton: {
    width: 48,
    paddingHorizontal: 0,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  saveButton: {
    flex: 1,
  },
  modalText: {
    fontSize: fontSize.base,
    color: colors.text,
    textAlign: 'center',
  },
  errorModalText: {
    color: colors.error.DEFAULT,
  },
  errorText: {
    color: colors.error.DEFAULT,
    fontSize: fontSize.base,
    textAlign: 'center',
  },
});
