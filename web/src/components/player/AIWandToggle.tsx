/**
 * AI Wand Toggle Button
 *
 * A persistent floating button (sparkle/wand icon) positioned near the player controls.
 * Only visible for AI-enhanced content. On click, opens the AI Companion Sidebar.
 *
 * Design: Circular glassmorphic button with subtle glow animation.
 */

import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';

interface AIWandToggleProps {
  isVisible: boolean;
  isActive: boolean;
  onToggle: () => void;
  features?: string[];
}

export default function AIWandToggle({
  isVisible,
  isActive,
  onToggle,
  features = [],
}: AIWandToggleProps) {
  const { t } = useTranslation();
  const [isHovered, setIsHovered] = useState(false);

  if (!isVisible) return null;

  return (
    <View style={styles.container}>
      <Pressable
        onPress={onToggle}
        // @ts-ignore - Web hover events
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={[
          styles.button,
          isActive && styles.buttonActive,
          isHovered && styles.buttonHovered,
        ]}
        accessibilityLabel={t('aiCompanion.openAiTools')}
        accessibilityRole="button"
      >
        <Sparkles
          size={24}
          color={isActive ? colors.warning.DEFAULT : colors.text}
          style={isActive ? styles.iconActive : undefined}
        />
      </Pressable>

      {/* Tooltip on hover */}
      {isHovered && !isActive && (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipText}>{t('aiCompanion.openAiTools')}</Text>
          {features.length > 0 && (
            <Text style={styles.tooltipFeatures}>
              {features.map(f => t(`aiCompanion.${f}`, f)).join(' | ')}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    // @ts-ignore - Web backdrop-filter
    backdropFilter: 'blur(12px)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    // @ts-ignore - Web transition
    transition: 'all 0.3s ease',
  },
  buttonActive: {
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
    borderColor: 'rgba(255, 193, 7, 0.4)',
    // @ts-ignore - Web box-shadow
    boxShadow: '0 0 20px rgba(255, 193, 7, 0.3)',
  },
  buttonHovered: {
    transform: [{ scale: 1.1 }],
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    // @ts-ignore - Web box-shadow
    boxShadow: '0 4px 20px rgba(107, 33, 168, 0.4)',
  },
  iconActive: {
    // @ts-ignore - Web animation (React Native Web compatibility)
    animationKeyframes: 'pulse',
    animationDuration: '2s',
    animationIterationCount: 'infinite',
  },
  tooltip: {
    position: 'absolute',
    bottom: '100%',
    left: '50%',
    // @ts-ignore - Web transform
    transform: 'translateX(-50%)',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: borderRadius.lg,
    // @ts-ignore - Web backdrop-filter
    backdropFilter: 'blur(12px)',
    // @ts-ignore - Web white-space
    whiteSpace: 'nowrap',
    zIndex: 100,
    alignItems: 'center',
  },
  tooltipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  tooltipFeatures: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
  },
});
