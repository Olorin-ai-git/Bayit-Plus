import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Mic, CreditCard } from 'lucide-react';
import { GlassView } from '@bayit/shared/ui';
import { colors, spacing, fontSize, borderRadius } from '@olorin/design-tokens';
import type { TabId } from '../types';

interface QuickActionsProps {
  isRTL: boolean;
  onTabChange: (tab: TabId) => void;
}

interface ActionButtonProps {
  icon: any;
  iconColor?: string;
  label: string;
  onPress: () => void;
}

function ActionButton({ icon: Icon, iconColor = '#6B21A8', label, onPress }: ActionButtonProps) {
  return (
    <Pressable onPress={onPress} style={styles.actionButtonPressable}>
      <GlassView style={styles.actionButton} intensity="medium">
        <View style={[styles.iconContainer, { backgroundColor: `${iconColor}20` }]}>
          <Icon size={24} color={iconColor} />
        </View>
        <Text style={styles.actionLabel}>{label}</Text>
      </GlassView>
    </Pressable>
  );
}

export function QuickActions({ isRTL, onTabChange }: QuickActionsProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <View style={[styles.container, isRTL && styles.containerRTL]}>
      <ActionButton
        icon={MessageSquare}
        iconColor="#6B21A8"
        label={t('profile.aiAssistant', 'AI Assistant')}
        onPress={() => onTabChange('ai')}
      />
      <ActionButton
        icon={Mic}
        iconColor="#8B5CF6"
        label={t('profile.voiceSettings', 'Voice')}
        onPress={() => onTabChange('ai')}
      />
      <ActionButton
        icon={CreditCard}
        iconColor="#22C55E"
        label={t('profile.subscriptionButton', 'Subscription')}
        onPress={() => navigate('/subscribe')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
    flexWrap: 'wrap',
  },
  containerRTL: {
    flexDirection: 'row-reverse',
  },
  actionButtonPressable: {
    flex: 1,
    minWidth: 140,
  },
  actionButton: {
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.text,
    textAlign: 'center',
  },
});
