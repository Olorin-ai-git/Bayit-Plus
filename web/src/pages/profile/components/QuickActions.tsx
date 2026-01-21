import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Mic, CreditCard } from 'lucide-react';
import { GlassView } from '@bayit/shared/ui';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
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

function ActionButton({ icon: Icon, iconColor = colors.primary, label, onPress }: ActionButtonProps) {
  return (
    <Pressable onPress={onPress} style={styles.actionButton}>
      <GlassView style={styles.actionButtonInner}>
        <View style={[styles.actionIcon, { backgroundColor: `${iconColor}20` }]}>
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
    <View style={[styles.quickActions, isRTL && styles.quickActionsRTL]}>
      <ActionButton
        icon={MessageSquare}
        iconColor={colors.primary}
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
        iconColor={colors.success}
        label={t('profile.subscriptionButton', 'Subscription')}
        onPress={() => navigate('/subscribe')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  quickActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
    flexWrap: 'wrap',
  },
  quickActionsRTL: {
    flexDirection: 'row-reverse',
  },
  actionButton: {
    flex: 1,
    minWidth: 140,
  },
  actionButtonInner: {
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
    textAlign: 'center',
  },
});
