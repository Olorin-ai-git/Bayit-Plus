import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView } from '../ui/GlassView';
import { GlassButton } from '../ui/GlassButton';
import { GlassToggle } from '../ui/GlassToggle';
import { colors, spacing, borderRadius, fontSize } from '../../theme';

interface WatchPartyCreateModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (options: { chatEnabled: boolean; syncPlayback: boolean }) => Promise<void>;
  contentTitle?: string;
}

export const WatchPartyCreateModal: React.FC<WatchPartyCreateModalProps> = ({
  visible,
  onClose,
  onCreate,
  contentTitle,
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [chatEnabled, setChatEnabled] = useState(true);
  const [syncPlayback, setSyncPlayback] = useState(true);

  const handleCreate = async () => {
    setLoading(true);
    try {
      await onCreate({ chatEnabled, syncPlayback });
      onClose();
    } catch (err) {
      console.error('Failed to create party:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <GlassView style={styles.modal} intensity="high">
              <View style={styles.header}>
                <Text style={styles.title}>{t('watchParty.createTitle')}</Text>
              </View>

              {contentTitle && (
                <GlassView style={styles.contentInfo} intensity="low">
                  <Text style={styles.contentIcon}>🎬</Text>
                  <View style={styles.contentText}>
                    <Text style={styles.contentLabel}>{t('watchParty.title')}</Text>
                    <Text style={styles.contentTitle} numberOfLines={1}>
                      {contentTitle}
                    </Text>
                  </View>
                </GlassView>
              )}

              <View style={styles.options}>
                <TouchableOpacity
                  style={styles.optionRow}
                  onPress={() => setChatEnabled(!chatEnabled)}
                >
                  <View style={styles.optionInfo}>
                    <Text style={styles.optionIcon}>💬</Text>
                    <Text style={styles.optionText}>
                      {t('watchParty.options.chatEnabled')}
                    </Text>
                  </View>
                  <GlassToggle
                    value={chatEnabled}
                    onValueChange={setChatEnabled}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.optionRow}
                  onPress={() => setSyncPlayback(!syncPlayback)}
                >
                  <View style={styles.optionInfo}>
                    <Text style={styles.optionIcon}>🔄</Text>
                    <Text style={styles.optionText}>
                      {t('watchParty.options.syncPlayback')}
                    </Text>
                  </View>
                  <GlassToggle
                    value={syncPlayback}
                    onValueChange={setSyncPlayback}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.actions}>
                <GlassButton
                  title={t('common.cancel')}
                  onPress={onClose}
                  variant="ghost"
                  size="md"
                />
                <GlassButton
                  title={t('watchParty.create')}
                  onPress={handleCreate}
                  variant="primary"
                  size="md"
                  loading={loading}
                  hasTVPreferredFocus
                />
              </View>
            </GlassView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlayDark,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modal: {
    width: '100%',
    maxWidth: 400,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  header: {
    alignItems: 'center',
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.text,
  },
  contentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  contentIcon: {
    fontSize: 24,
  },
  contentText: {
    flex: 1,
  },
  contentLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  contentTitle: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.text,
  },
  options: {
    gap: spacing.sm,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.glassBorder,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  optionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  optionIcon: {
    fontSize: 20,
  },
  optionText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.text,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
  },
});

export default WatchPartyCreateModal;
