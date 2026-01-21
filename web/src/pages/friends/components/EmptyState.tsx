import { View, Text } from 'react-native';
import { GlassView, GlassButton } from '@bayit/shared/ui';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  buttonLabel?: string;
  onButtonPress?: () => void;
  compact?: boolean;
}

export function EmptyState({
  icon,
  title,
  subtitle,
  buttonLabel,
  onButtonPress,
  compact = false,
}: EmptyStateProps) {
  const containerClass = compact ? 'p-6 items-center' : 'p-8 items-center gap-4';

  return (
    <GlassView className={containerClass}>
      {icon}
      <Text className="text-lg font-semibold text-white">{title}</Text>
      <Text className="text-sm text-white/60 text-center">{subtitle}</Text>
      {buttonLabel && onButtonPress && (
        <GlassButton
          label={buttonLabel}
          onPress={onButtonPress}
          className="mt-4"
        />
      )}
    </GlassView>
  );
}
