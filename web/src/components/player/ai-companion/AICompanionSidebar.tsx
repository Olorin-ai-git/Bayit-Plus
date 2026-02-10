/**
 * AI Companion Sidebar Component
 *
 * Positioned BESIDE the YouTube iframe (right side, or left in RTL).
 * Contains tabs for Vocabulary, Episode Context, and Quick Quiz.
 */

import { useEffect, useRef, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, Animated } from 'react-native';
import { useTranslation } from 'react-i18next';
import { X, BookOpen, Info, HelpCircle } from 'lucide-react';
import { colors } from '@olorin/design-tokens';
import { useDirection } from '@/hooks/useDirection';
import { useAICompanionStore, AICompanionTab } from '@/stores/aiCompanionStore';
import { useAICompanion } from './useAICompanion';
import { VocabularyTab } from './VocabularyTab';
import { ContextTab } from './ContextTab';
import { QuizTab } from './QuizTab';
import { styles, SIDEBAR_WIDTH } from './AICompanionSidebar.styles';

interface AICompanionSidebarProps {
  contentId: string | null;
  programTitle?: string;
  educationalTags?: string[];
  attribution?: string;
  isVisible: boolean;
  onClose: () => void;
}

const TABS: { key: AICompanionTab; icon: typeof BookOpen }[] = [
  { key: 'vocabulary', icon: BookOpen },
  { key: 'context', icon: Info },
  { key: 'quiz', icon: HelpCircle },
];

export default function AICompanionSidebar({
  contentId,
  programTitle,
  educationalTags,
  attribution,
  isVisible,
  onClose,
}: AICompanionSidebarProps) {
  const { t } = useTranslation();
  const { isRTL } = useDirection();
  const slideAnim = useRef(new Animated.Value(SIDEBAR_WIDTH)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const { activeTab, setActiveTab } = useAICompanionStore();
  const { data, isLoading } = useAICompanion({
    contentId, programTitle, educationalTags, enabled: isVisible,
  });

  useEffect(() => {
    const toValue = isVisible ? 0 : SIDEBAR_WIDTH;
    Animated.parallel([
      Animated.spring(slideAnim, { toValue, friction: 8, tension: 65, useNativeDriver: false }),
      Animated.timing(backdropAnim, { toValue: isVisible ? 1 : 0, duration: 200, useNativeDriver: false }),
    ]).start();
  }, [isVisible, slideAnim, backdropAnim]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && isVisible) onClose();
  }, [isVisible, onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const translateStyle = isRTL
    ? { transform: [{ translateX: Animated.multiply(slideAnim, new Animated.Value(-1)) }] }
    : { transform: [{ translateX: slideAnim }] };

  const renderTabContent = () => {
    if (isLoading) {
      return <View style={styles.loadingContainer}><Text style={styles.loadingText}>{t('common.loading')}</Text></View>;
    }
    switch (activeTab) {
      case 'vocabulary': return <VocabularyTab vocabulary={data.vocabulary} isRTL={isRTL} />;
      case 'context': return <ContextTab context={data.context} isRTL={isRTL} />;
      case 'quiz': return <QuizTab quiz={data.quiz} isRTL={isRTL} />;
      default: return null;
    }
  };

  return (
    <>
      {isVisible && (
        <Animated.View style={[styles.backdrop, { opacity: Animated.multiply(backdropAnim, new Animated.Value(0.4)) }]}>
          <Pressable style={styles.backdropPress} onPress={onClose} accessibilityRole="button" accessibilityLabel={t('common.close')} />
        </Animated.View>
      )}
      <Animated.View style={[styles.sidebar, isRTL ? { left: 0 } : { right: 0 }, translateStyle]}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('aiCompanion.title')}</Text>
          <Pressable onPress={onClose} style={styles.closeButton} accessibilityLabel={t('common.close')} accessibilityRole="button">
            <X size={18} color={colors.text} />
          </Pressable>
        </View>
        <View style={[styles.tabBar, { flexDirection: isRTL ? 'row-reverse' : 'row' }]} accessibilityRole="tablist">
          {TABS.map(({ key, icon: Icon }) => (
            <Pressable key={key} onPress={() => setActiveTab(key)} style={[styles.tab, activeTab === key && styles.tabActive]}
              accessibilityRole="tab" accessibilityState={{ selected: activeTab === key }} accessibilityLabel={t(`aiCompanion.${key}`)}>
              <Icon size={16} color={activeTab === key ? colors.primary.DEFAULT : colors.textMuted} />
              <Text style={[styles.tabText, activeTab === key && styles.tabTextActive]}>{t(`aiCompanion.${key}`)}</Text>
            </Pressable>
          ))}
        </View>
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>{renderTabContent()}</ScrollView>
        {attribution && (
          <View style={styles.attributionFooter}>
            <Text style={[styles.attributionText, { textAlign: isRTL ? 'right' : 'left' }]}>{attribution}</Text>
          </View>
        )}
      </Animated.View>
    </>
  );
}
