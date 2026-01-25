import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Play, Check } from 'lucide-react';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { GlassCard, GlassButton, GlassModal } from '@bayit/shared/ui';
import { voiceManagementService } from '@/services/voiceManagementApi';
import logger from '@/utils/logger';

interface Voice {
  voice_id: string;
  name: string;
  category: string;
  description?: string;
  labels?: {
    language?: string;
    gender?: string;
    age?: string;
  };
}

export default function VoiceLibraryPanel() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [playing, setPlaying] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const loadVoices = async () => {
    setLoading(true);
    try {
      const response = await voiceManagementService.getAvailableVoices();
      setVoices(response.voices);
    } catch (error: any) {
      logger.error('Failed to load voices', 'VoiceLibraryPanel', error);
      setErrorMessage(error?.message || 'Failed to load voice library');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVoices();
  }, []);

  const handlePreview = async (voiceId: string) => {
    setPlaying(voiceId);
    try {
      const response = await voiceManagementService.previewVoice(voiceId, 'Hello, this is a preview of this voice.');
      const audio = new Audio(`data:audio/mp3;base64,${response.audio_base64}`);
      await audio.play();
    } catch (error: any) {
      logger.error('Failed to preview voice', 'VoiceLibraryPanel', error);
      setErrorMessage(error?.message || 'Failed to preview voice');
    } finally {
      setPlaying(null);
    }
  };

  const handleAssign = async (voiceId: string, role: string) => {
    try {
      await voiceManagementService.assignVoiceToRole(voiceId, role);
      setErrorMessage(`Voice assigned to ${role} role`);
    } catch (error: any) {
      logger.error('Failed to assign voice', 'VoiceLibraryPanel', error);
      setErrorMessage(error?.message || 'Failed to assign voice');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View>
      <FlatList
        data={voices}
        keyExtractor={(item) => item.voice_id}
        renderItem={({ item }) => (
          <GlassCard style={styles.card}>
            <View style={styles.voiceHeader}>
              <View style={styles.voiceInfo}>
                <Text style={styles.voiceName}>{item.name}</Text>
                <Text style={styles.voiceCategory}>{item.category}</Text>
                {item.labels?.language && (
                  <Text style={styles.voiceLabel}>Language: {item.labels.language}</Text>
                )}
              </View>
              <View style={styles.actions}>
                <GlassButton
                  title=""
                  icon={<Play size={16} color={colors.primary} />}
                  variant="secondary"
                  onPress={() => handlePreview(item.voice_id)}
                  loading={playing === item.voice_id}
                  style={styles.actionButton}
                />
                <GlassButton
                  title="Assign"
                  variant="primary"
                  onPress={() => handleAssign(item.voice_id, 'default')}
                  style={styles.actionButton}
                />
              </View>
            </View>
          </GlassCard>
        )}
      />

      {errorMessage && (
        <GlassModal visible={true} onClose={() => setErrorMessage('')}>
          <Text style={styles.modalText}>{errorMessage}</Text>
        </GlassModal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  card: {
    marginBottom: spacing.md,
  },
  voiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  voiceInfo: {
    flex: 1,
  },
  voiceName: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  voiceCategory: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  voiceLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    minWidth: 60,
  },
  modalText: {
    fontSize: fontSize.base,
    color: colors.text,
    textAlign: 'center',
  },
});
