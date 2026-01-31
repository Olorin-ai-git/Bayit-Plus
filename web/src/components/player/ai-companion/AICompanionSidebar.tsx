/**
 * AI Companion Sidebar Component
 *
 * Positioned BESIDE the YouTube iframe (right side, or left in RTL).
 * Contains tabs for Vocabulary, Episode Context, and Quick Quiz.
 * Uses Glass UI components with glassmorphic dark theme.
 * Attribution footer always visible at bottom.
 */

import { useEffect, useRef, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, Animated, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { X, BookOpen, Info, HelpCircle, Volume2, Check, XCircle } from 'lucide-react';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { useDirection } from '@/hooks/useDirection';
import { useAICompanionStore, AICompanionTab } from '@/stores/aiCompanionStore';
import { useAICompanion, VocabularyWord, QuizQuestion } from './useAICompanion';
import { useState } from 'react';

interface AICompanionSidebarProps {
  contentId: string | null;
  programTitle?: string;
  educationalTags?: string[];
  attribution?: string;
  isVisible: boolean;
  onClose: () => void;
}

const SIDEBAR_WIDTH = 340;

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
    contentId,
    programTitle,
    educationalTags,
    enabled: isVisible,
  });

  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 65,
          useNativeDriver: false,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: SIDEBAR_WIDTH,
          friction: 8,
          tension: 65,
          useNativeDriver: false,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [isVisible, slideAnim, backdropAnim]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVisible) onClose();
    },
    [isVisible, onClose]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const translateStyle = isRTL
    ? { transform: [{ translateX: Animated.multiply(slideAnim, -1) }] }
    : { transform: [{ translateX: slideAnim }] };

  const positionStyle = isRTL ? { left: 0 } : { right: 0 };

  const handleSidebarClick = useCallback((e: any) => {
    const target = e?.target;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON')) {
      return;
    }
    e?.stopPropagation?.();
  }, []);

  return (
    <>
      {isVisible && (
        <Animated.View style={[styles.backdrop, { opacity: Animated.multiply(backdropAnim, 0.4) }]}>
          <Pressable style={styles.backdropPress} onPress={onClose} />
        </Animated.View>
      )}

      <Animated.View style={[styles.sidebar, positionStyle, translateStyle]} onClick={handleSidebarClick}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
            {t('aiCompanion.title')}
          </Text>
          <Pressable onPress={onClose} style={styles.closeButton} accessibilityLabel={t('common.close')}>
            <X size={18} color={colors.text} />
          </Pressable>
        </View>

        {/* Tabs */}
        <View style={[styles.tabBar, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {TABS.map(({ key, icon: Icon }) => (
            <Pressable
              key={key}
              onPress={() => setActiveTab(key)}
              style={[styles.tab, activeTab === key && styles.tabActive]}
            >
              <Icon size={16} color={activeTab === key ? colors.primary.DEFAULT : colors.textMuted} />
              <Text style={[styles.tabText, activeTab === key && styles.tabTextActive]}>
                {t(`aiCompanion.${key}`)}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Content */}
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>{t('common.loading')}</Text>
            </View>
          ) : activeTab === 'vocabulary' ? (
            <VocabularyTab vocabulary={data.vocabulary} isRTL={isRTL} />
          ) : activeTab === 'context' ? (
            <ContextTab context={data.context} isRTL={isRTL} />
          ) : (
            <QuizTab quiz={data.quiz} isRTL={isRTL} />
          )}
        </ScrollView>

        {/* Attribution Footer */}
        {attribution && (
          <View style={styles.attributionFooter}>
            <Text style={[styles.attributionText, { textAlign: isRTL ? 'right' : 'left' }]}>
              {attribution}
            </Text>
          </View>
        )}
      </Animated.View>
    </>
  );
}

function VocabularyTab({ vocabulary, isRTL }: { vocabulary: VocabularyWord[]; isRTL: boolean }) {
  const { t } = useTranslation();

  if (vocabulary.length === 0) {
    return <Text style={styles.emptyText}>{t('aiCompanion.noVocabulary')}</Text>;
  }

  return (
    <View style={styles.vocabularyList}>
      {vocabulary.map((word, index) => (
        <View key={index} style={styles.vocabularyCard}>
          <View style={[styles.vocabularyHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={styles.hebrewWord}>{word.hebrew}</Text>
            <Pressable style={styles.audioButton}>
              <Volume2 size={14} color={colors.textMuted} />
            </Pressable>
          </View>
          <Text style={styles.transliteration}>{word.transliteration}</Text>
          <Text style={styles.translation}>{word.english}</Text>
          {word.spanish && <Text style={styles.translationSecondary}>{word.spanish}</Text>}
          {word.context && <Text style={styles.wordContext}>{word.context}</Text>}
        </View>
      ))}
    </View>
  );
}

function ContextTab({ context, isRTL }: { context: ReturnType<typeof useAICompanion>['data']['context']; isRTL: boolean }) {
  const { t } = useTranslation();

  if (!context) {
    return <Text style={styles.emptyText}>{t('aiCompanion.noContext')}</Text>;
  }

  return (
    <View style={styles.contextContainer}>
      <Text style={[styles.contextTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{context.title}</Text>
      {context.titleEn && <Text style={styles.contextTitleEn}>{context.titleEn}</Text>}
      <Text style={[styles.contextSummary, { textAlign: isRTL ? 'right' : 'left' }]}>{context.summary}</Text>
      {context.summaryEn && <Text style={styles.contextSummaryEn}>{context.summaryEn}</Text>}

      {context.concepts.length > 0 && (
        <View style={styles.conceptsSection}>
          <Text style={styles.sectionLabel}>{t('aiCompanion.concepts')}</Text>
          <View style={styles.tagList}>
            {context.concepts.map((concept, index) => (
              <View key={index} style={styles.conceptTag}>
                <Text style={styles.conceptTagText}>{concept}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

function QuizTab({ quiz, isRTL }: { quiz: QuizQuestion[]; isRTL: boolean }) {
  const { t } = useTranslation();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});

  if (quiz.length === 0) {
    return <Text style={styles.emptyText}>{t('aiCompanion.noQuiz')}</Text>;
  }

  const handleSelect = (questionId: string, optionId: string) => {
    if (submitted[questionId]) return;
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const handleSubmit = (questionId: string) => {
    setSubmitted((prev) => ({ ...prev, [questionId]: true }));
  };

  return (
    <View style={styles.quizContainer}>
      {quiz.map((question) => {
        const selectedAnswer = answers[question.id];
        const isSubmitted = submitted[question.id];
        const isCorrect = selectedAnswer === question.correctOptionId;

        return (
          <View key={question.id} style={styles.questionCard}>
            <Text style={[styles.questionText, { textAlign: isRTL ? 'right' : 'left' }]}>
              {question.question}
            </Text>
            {question.questionEn && <Text style={styles.questionTextEn}>{question.questionEn}</Text>}

            <View style={styles.optionsContainer}>
              {question.options.map((option) => {
                const isSelected = selectedAnswer === option.id;
                const showCorrect = isSubmitted && option.id === question.correctOptionId;
                const showIncorrect = isSubmitted && isSelected && !isCorrect;

                return (
                  <Pressable
                    key={option.id}
                    onPress={() => handleSelect(question.id, option.id)}
                    style={[
                      styles.optionButton,
                      isSelected && styles.optionSelected,
                      showCorrect && styles.optionCorrect,
                      showIncorrect && styles.optionIncorrect,
                    ]}
                  >
                    <Text style={styles.optionText}>{option.text}</Text>
                    {showCorrect && <Check size={14} color={colors.success.DEFAULT} />}
                    {showIncorrect && <XCircle size={14} color={colors.error.DEFAULT} />}
                  </Pressable>
                );
              })}
            </View>

            {!isSubmitted && selectedAnswer && (
              <Pressable onPress={() => handleSubmit(question.id)} style={styles.submitButton}>
                <Text style={styles.submitButtonText}>{t('aiCompanion.checkAnswer')}</Text>
              </Pressable>
            )}

            {isSubmitted && question.explanation && (
              <Text style={styles.explanationText}>{question.explanation}</Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000', zIndex: 49 },
  backdropPress: { flex: 1 },
  sidebar: {
    position: 'absolute', top: 0, bottom: 0, width: SIDEBAR_WIDTH,
    backgroundColor: 'rgba(10, 10, 20, 0.85)',
    // @ts-ignore
    backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
    borderWidth: 1, borderColor: colors.glassBorderLight, borderRadius: borderRadius.lg,
    zIndex: 50, flexDirection: 'column', overflow: 'hidden',
  } as any,
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text },
  closeButton: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: spacing.sm, borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: colors.primary.DEFAULT },
  tabText: { fontSize: fontSize.xs, color: colors.textMuted },
  tabTextActive: { color: colors.primary.DEFAULT, fontWeight: '600' },
  content: { flex: 1 },
  contentContainer: { padding: spacing.md },
  loadingContainer: { alignItems: 'center', paddingVertical: spacing.xl },
  loadingText: { color: colors.textMuted, fontSize: fontSize.sm },
  emptyText: { color: colors.textMuted, fontSize: fontSize.sm, textAlign: 'center', paddingVertical: spacing.xl },
  vocabularyList: { gap: spacing.sm },
  vocabularyCard: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: borderRadius.md, padding: spacing.sm,
  },
  vocabularyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hebrewWord: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  audioButton: { padding: spacing.xs },
  transliteration: { fontSize: fontSize.sm, color: colors.primary.light, marginTop: 2 },
  translation: { fontSize: fontSize.base, color: colors.text, marginTop: spacing.xs },
  translationSecondary: { fontSize: fontSize.sm, color: colors.textMuted },
  wordContext: { fontSize: fontSize.xs, color: colors.textMuted, fontStyle: 'italic', marginTop: spacing.xs },
  contextContainer: { gap: spacing.sm },
  contextTitle: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text },
  contextTitleEn: { fontSize: fontSize.base, color: colors.textMuted },
  contextSummary: { fontSize: fontSize.base, color: colors.text, lineHeight: 22 },
  contextSummaryEn: { fontSize: fontSize.sm, color: colors.textMuted, lineHeight: 20 },
  conceptsSection: { marginTop: spacing.md },
  sectionLabel: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  tagList: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  conceptTag: { backgroundColor: 'rgba(107,33,168,0.3)', paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: borderRadius.full },
  conceptTagText: { fontSize: fontSize.xs, color: colors.primary.light },
  quizContainer: { gap: spacing.md },
  questionCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: borderRadius.md, padding: spacing.md },
  questionText: { fontSize: fontSize.base, fontWeight: '600', color: colors.text },
  questionTextEn: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  optionsContainer: { marginTop: spacing.sm, gap: spacing.xs },
  optionButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: borderRadius.md, padding: spacing.sm,
    borderWidth: 1, borderColor: 'transparent',
  },
  optionSelected: { borderColor: colors.primary.DEFAULT, backgroundColor: 'rgba(107,33,168,0.2)' },
  optionCorrect: { borderColor: colors.success.DEFAULT, backgroundColor: 'rgba(34,197,94,0.2)' },
  optionIncorrect: { borderColor: colors.error.DEFAULT, backgroundColor: 'rgba(239,68,68,0.2)' },
  optionText: { fontSize: fontSize.sm, color: colors.text },
  submitButton: {
    marginTop: spacing.sm, backgroundColor: colors.primary.DEFAULT, borderRadius: borderRadius.md,
    paddingVertical: spacing.sm, alignItems: 'center',
  },
  submitButtonText: { fontSize: fontSize.sm, fontWeight: '600', color: '#fff' },
  explanationText: { marginTop: spacing.sm, fontSize: fontSize.sm, color: colors.success.light, fontStyle: 'italic' },
  attributionFooter: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(0,0,0,0.3)',
  },
  attributionText: { fontSize: fontSize.xs, color: colors.textMuted },
});
