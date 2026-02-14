/**
 * AICompanionSidebar - Animated slide-in sidebar for AI learning features
 *
 * Provides three tabbed views (Context, Quiz, Vocabulary) that appear
 * as a right-side panel during content playback on mobile.
 */

import React, { useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import Animated, { SlideInRight, SlideOutRight, FadeIn, FadeOut } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { GlassView } from '@bayit/shared';
import { spacing, borderRadius } from '@olorin/design-tokens';
import { NativeIcon } from '@olorin/shared-icons/native';
import { useAICompanion, CompanionTab } from '../../../hooks/useAICompanion';
import { CompanionContextTab } from './CompanionContextTab';
import { CompanionQuizTab } from './CompanionQuizTab';
import { CompanionVocabularyTab } from './CompanionVocabularyTab';
import { logger } from '../../../utils/logger';
import Colors from '../../../theme/colors';

const log = logger.scope('AICompanionSidebar');
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIDEBAR_WIDTH = Math.round(SCREEN_WIDTH * 0.82);
const ANIM_MS = 300;

interface AICompanionSidebarProps {
  visible: boolean;
  onClose: () => void;
  contentId: string;
  contentType: 'movie' | 'series' | 'live';
}

const TABS: { key: CompanionTab; icon: string; labelKey: string }[] = [
  { key: 'context', icon: 'book-open', labelKey: 'aiCompanion.tabs.context' },
  { key: 'quiz', icon: 'help-circle', labelKey: 'aiCompanion.tabs.quiz' },
  { key: 'vocabulary', icon: 'languages', labelKey: 'aiCompanion.tabs.vocabulary' },
];

export const AICompanionSidebar: React.FC<AICompanionSidebarProps> = ({
  visible, onClose, contentId, contentType,
}) => {
  const { t } = useTranslation();
  const companion = useAICompanion(contentId);

  const handleTabPress = useCallback((tab: CompanionTab) => {
    companion.setActiveTab(tab);
    log.info('Tab selected', { tab, contentId });
  }, [companion, contentId]);

  if (!visible) return null;

  return (
    <View style={styles.wrapper}>
      <Animated.View entering={FadeIn.duration(ANIM_MS)} exiting={FadeOut.duration(ANIM_MS)} style={styles.backdrop}>
        <Pressable style={styles.backdropTouch} onPress={onClose}
          accessibilityLabel={t('aiCompanion.closeBackdrop')}
          accessibilityHint={t('aiCompanion.closeBackdropHint')} accessibilityRole="button" />
      </Animated.View>
      <Animated.View entering={SlideInRight.duration(ANIM_MS).springify()}
        exiting={SlideOutRight.duration(ANIM_MS)} style={styles.sidebar}>
        <GlassView intensity="high" style={styles.inner}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('aiCompanion.title')}</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}
              accessibilityLabel={t('aiCompanion.close')}
              accessibilityHint={t('aiCompanion.closeHint')} accessibilityRole="button">
              <NativeIcon name="x" size="md" color={Colors.Text.primary} />
            </Pressable>
          </View>
          <View style={styles.tabBar}>
            {TABS.map((tab) => {
              const active = companion.activeTab === tab.key;
              return (
                <Pressable key={tab.key} style={[styles.tab, active && styles.tabActive]}
                  onPress={() => handleTabPress(tab.key)} accessibilityLabel={t(tab.labelKey)}
                  accessibilityHint={t('aiCompanion.switchTabHint', { tab: t(tab.labelKey) })}
                  accessibilityRole="tab" accessibilityState={{ selected: active }}>
                  <NativeIcon name={tab.icon} size="sm"
                    color={active ? Colors.Primary.p400 : Colors.Text.muted} />
                  <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                    {t(tab.labelKey)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.content}>
            {companion.activeTab === 'context' && (
              <CompanionContextTab contentId={contentId} messages={companion.messages}
                isLoading={companion.isLoading} error={companion.error} onFetch={companion.fetchContext} />
            )}
            {companion.activeTab === 'quiz' && (
              <CompanionQuizTab contentId={contentId} questions={companion.quizQuestions}
                score={companion.quizScore} total={companion.quizTotal} isLoading={companion.isLoading}
                error={companion.error} onFetch={companion.fetchQuiz} onAnswer={companion.answerQuiz}
                onReset={companion.resetQuiz} />
            )}
            {companion.activeTab === 'vocabulary' && (
              <CompanionVocabularyTab contentId={contentId} words={companion.vocabularyWords}
                isLoading={companion.isLoading} error={companion.error} onFetch={companion.fetchVocabulary} />
            )}
          </View>
        </GlassView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { ...StyleSheet.absoluteFillObject, zIndex: 100, flexDirection: 'row' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: Colors.Glass.bgMedium },
  backdropTouch: { flex: 1 },
  sidebar: { position: 'absolute', right: 0, top: 0, bottom: 0, width: SIDEBAR_WIDTH },
  inner: { flex: 1, backgroundColor: Colors.Glass.bgStrong, borderLeftWidth: 1, borderLeftColor: Colors.Glass.border },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.Glass.borderLight,
  },
  title: { fontSize: 18, fontWeight: '700', color: Colors.Text.primary },
  closeBtn: { padding: spacing.xs, borderRadius: borderRadius.full, backgroundColor: Colors.Glass.whiteLight },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.Glass.borderLight },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xxs, paddingVertical: spacing.sm },
  tabActive: { borderBottomWidth: 2, borderBottomColor: Colors.Primary.p500 },
  tabLabel: { fontSize: 12, color: Colors.Text.muted, fontWeight: '500' },
  tabLabelActive: { color: Colors.Primary.p400, fontWeight: '600' },
  content: { flex: 1 },
});
