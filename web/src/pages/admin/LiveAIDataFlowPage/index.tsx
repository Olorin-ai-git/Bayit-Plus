import React, { useMemo } from 'react'
import { View, ScrollView, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Workflow } from 'lucide-react'
import { GlassPageHeader, GlassTabContainer } from '@bayit/shared/ui'
import { colors, spacing } from '@olorin/design-tokens'
import { useDirection } from '@/hooks/useDirection'
import { ADMIN_PAGE_CONFIG } from '../../../../../shared/utils/adminConstants'
import TranslationFlowTab from './TranslationFlowTab'
import DubbingFlowTab from './DubbingFlowTab'
import TriviaFlowTab from './TriviaFlowTab'
import type { TabContent } from '@bayit/shared/ui'

const PAGE_KEY = 'live-ai-dataflow'

export default function LiveAIDataFlowPage() {
  const { t } = useTranslation()
  const { isRTL } = useDirection()
  const pageConfig = ADMIN_PAGE_CONFIG[PAGE_KEY] || ADMIN_PAGE_CONFIG.diagnostics

  const tabs = useMemo(() => [
    { id: 'translation', label: t('liveAiDataFlow.tabs.translation') },
    { id: 'dubbing', label: t('liveAiDataFlow.tabs.dubbing') },
    { id: 'trivia', label: t('liveAiDataFlow.tabs.trivia') },
  ], [t])

  const content: TabContent[] = useMemo(() => [
    { tabId: 'translation', render: () => <TranslationFlowTab /> },
    { tabId: 'dubbing', render: () => <DubbingFlowTab /> },
    { tabId: 'trivia', render: () => <TriviaFlowTab /> },
  ], [])

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <GlassPageHeader
        title={t('liveAiDataFlow.title')}
        subtitle={t('liveAiDataFlow.subtitle')}
        icon={<Workflow size={24} color={pageConfig.iconColor} strokeWidth={2} />}
        iconColor={pageConfig.iconColor}
        iconBackgroundColor={pageConfig.iconBackgroundColor}
        isRTL={isRTL}
      />

      <View style={styles.tabSection}>
        <GlassTabContainer
          tabs={tabs}
          content={content}
          variant="underline"
          defaultActiveTab="translation"
          contentStyle={styles.tabContent}
        />
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  tabSection: {
    marginTop: spacing.md,
  },
  tabContent: {
    marginTop: spacing.lg,
  },
})
