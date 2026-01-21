import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView } from '../ui/GlassView';
import { GlassButton } from '../ui/GlassButton';
import { GlassToggle } from '../ui/GlassToggle';

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
        <View className="flex-1 bg-black/80 justify-center items-center p-6">
          <TouchableWithoutFeedback>
            <GlassView className="w-full max-w-[400px] p-8 gap-6" intensity="high">
              <View className="items-center">
                <Text className="text-2xl font-semibold text-white">{t('watchParty.createTitle')}</Text>
              </View>

              {contentTitle && (
                <GlassView className="flex-row items-center p-4 gap-4" intensity="low">
                  <Text className="text-2xl">🎬</Text>
                  <View className="flex-1">
                    <Text className="text-xs text-white/50">{t('watchParty.title')}</Text>
                    <Text className="text-sm font-medium text-white" numberOfLines={1}>
                      {contentTitle}
                    </Text>
                  </View>
                </GlassView>
              )}

              <View className="gap-3">
                <TouchableOpacity
                  className="flex-row items-center justify-between bg-white/20 p-4 rounded-lg"
                  onPress={() => setChatEnabled(!chatEnabled)}
                >
                  <View className="flex-row items-center gap-3">
                    <Text className="text-xl">💬</Text>
                    <Text className="text-sm font-medium text-white">
                      {t('watchParty.options.chatEnabled')}
                    </Text>
                  </View>
                  <GlassToggle
                    value={chatEnabled}
                    onValueChange={setChatEnabled}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  className="flex-row items-center justify-between bg-white/20 p-4 rounded-lg"
                  onPress={() => setSyncPlayback(!syncPlayback)}
                >
                  <View className="flex-row items-center gap-3">
                    <Text className="text-xl">🔄</Text>
                    <Text className="text-sm font-medium text-white">
                      {t('watchParty.options.syncPlayback')}
                    </Text>
                  </View>
                  <GlassToggle
                    value={syncPlayback}
                    onValueChange={setSyncPlayback}
                  />
                </TouchableOpacity>
              </View>

              <View className="flex-row gap-3 justify-end">
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

export default WatchPartyCreateModal;
