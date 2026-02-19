import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { WifiOff, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '@bayit/shared/ui';
import { colors, spacing, fontSize, borderRadius } from '@olorin/design-tokens';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export function OfflineBanner() {
  const { t } = useTranslation();
  const { isOnline } = useOnlineStatus();
  const [dismissed, setDismissed] = useState(false);

  if (isOnline || dismissed) return null;

  return (
    <GlassCard style={styles.banner}>
      <View style={styles.content}>
        <WifiOff size={20} color={colors.warning} />
        <Text style={styles.text}>{t('downloads.offlineMessage')}</Text>
        <Pressable onPress={() => setDismissed(true)} style={styles.dismiss}>
          <X size={16} color={colors.textMuted} />
        </Pressable>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  banner: {
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.3)',
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  text: {
    flex: 1,
    color: colors.warning,
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  dismiss: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
