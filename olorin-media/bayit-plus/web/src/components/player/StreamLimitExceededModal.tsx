import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { GlassModal } from '@bayit/shared/ui';
import { Smartphone, Monitor, Tv, Tablet } from 'lucide-react';
import { colors, spacing } from '@olorin/design-tokens';

interface StreamLimitExceededModalProps {
  visible: boolean;
  maxStreams: number;
  activeStreams: number;
  activeDevices: Array<{
    device_id: string;
    device_name: string;
    content_id: string;
  }>;
  onClose: () => void;
}

export function StreamLimitExceededModal({
  visible,
  maxStreams,
  activeStreams,
  activeDevices,
  onClose,
}: StreamLimitExceededModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleManageDevices = () => {
    onClose();
    navigate('/profile?tab=devices');
  };

  const getDeviceIcon = (deviceName: string) => {
    const nameLower = deviceName.toLowerCase();
    if (nameLower.includes('iphone') || nameLower.includes('android') || nameLower.includes('mobile')) {
      return Smartphone;
    }
    if (nameLower.includes('tv') || nameLower.includes('apple tv') || nameLower.includes('roku')) {
      return Tv;
    }
    if (nameLower.includes('ipad') || nameLower.includes('tablet')) {
      return Tablet;
    }
    return Monitor;
  };

  return (
    <GlassModal
      visible={visible}
      type="warning"
      title={t('player.streamLimit.title', 'Stream Limit Reached')}
      onClose={onClose}
      buttons={[
        {
          text: t('common.cancel', 'Cancel'),
          style: 'cancel',
          onPress: onClose,
        },
        {
          text: t('player.streamLimit.manageDevices', 'Manage Devices'),
          style: 'default',
          onPress: handleManageDevices,
        },
      ]}
    >
      <View style={styles.content}>
        <Text style={styles.message}>
          {t(
            'player.streamLimit.message',
            'You have reached the maximum number of concurrent streams ({{maxStreams}}) for your plan.',
            { maxStreams }
          )}
        </Text>

        <Text style={styles.subtitle}>
          {t(
            'player.streamLimit.activeDevices',
            'Currently streaming on {{count}} device(s):',
            { count: activeStreams }
          )}
        </Text>

        <View style={styles.devicesList}>
          {activeDevices.map((device, index) => {
            const DeviceIcon = getDeviceIcon(device.device_name);
            return (
              <View key={device.device_id || index} style={styles.deviceItem}>
                <View style={styles.deviceIcon}>
                  <DeviceIcon size={20} color="rgba(255,255,255,0.8)" />
                </View>
                <Text style={styles.deviceName} numberOfLines={1}>
                  {device.device_name}
                </Text>
              </View>
            );
          })}
        </View>

        <Text style={styles.hint}>
          {t(
            'player.streamLimit.hint',
            'Disconnect a device to free up a streaming slot, or upgrade your plan for more concurrent streams.'
          )}
        </Text>
      </View>
    </GlassModal>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
  },
  message: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 20,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  devicesList: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
  },
  deviceIcon: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceName: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    flex: 1,
  },
  hint: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 18,
    marginTop: spacing.sm,
  },
});
