import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Mic, CreditCard } from 'lucide-react';
import { GlassView } from '@bayit/shared/ui';
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
    <Pressable onPress={onPress} className="flex-1 min-w-[140px]">
      <GlassView className="p-4 items-center gap-2">
        <View className="w-12 h-12 rounded-lg justify-center items-center" style={{ backgroundColor: `${iconColor}20` }}>
          <Icon size={24} color={iconColor} />
        </View>
        <Text className="text-[13px] font-medium text-white text-center">{label}</Text>
      </GlassView>
    </Pressable>
  );
}

export function QuickActions({ isRTL, onTabChange }: QuickActionsProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <View className={`gap-4 mb-6 flex-wrap ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
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
