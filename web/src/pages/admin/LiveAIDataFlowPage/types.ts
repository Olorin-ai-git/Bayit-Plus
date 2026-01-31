import type { ReactNode } from 'react'
import { colors } from '@olorin/design-tokens'

export type NodeCategory =
  | 'auth'
  | 'quota'
  | 'stt'
  | 'translation'
  | 'tts'
  | 'deduplication'
  | 'cache'
  | 'ai'
  | 'output'
  | 'session'
  | 'search'
  | 'tracking'

export type ExternalService =
  | 'elevenlabs'
  | 'google_cloud'
  | 'google_translate'
  | 'openai'
  | 'claude'
  | 'spacy'
  | 'redis'
  | 'tavily'

export interface ExternalServiceConfig {
  id: ExternalService
  labelKey: string
  color: string
}

export interface DataFlowNodeConfig {
  id: string
  stepNumber: number
  titleKey: string
  category: NodeCategory
  inputKey: string
  outputKey: string
  externalServices: ExternalService[]
  latency?: string
  optional?: boolean
}

export interface DataFlowPipelineConfig {
  id: string
  titleKey: string
  nodes: DataFlowNodeConfig[]
}

export interface TabContentItem {
  tabId: string
  render: () => ReactNode
}

export const EXTERNAL_SERVICE_CONFIGS: Record<ExternalService, ExternalServiceConfig> = {
  elevenlabs: { id: 'elevenlabs', labelKey: 'liveAiDataFlow.services.elevenlabs', color: colors.warning.DEFAULT },
  google_cloud: { id: 'google_cloud', labelKey: 'liveAiDataFlow.services.googleCloud', color: colors.info.DEFAULT },
  google_translate: { id: 'google_translate', labelKey: 'liveAiDataFlow.services.googleTranslate', color: colors.info[600] },
  openai: { id: 'openai', labelKey: 'liveAiDataFlow.services.openai', color: colors.success.DEFAULT },
  claude: { id: 'claude', labelKey: 'liveAiDataFlow.services.claude', color: colors.secondary.DEFAULT },
  spacy: { id: 'spacy', labelKey: 'liveAiDataFlow.services.spacy', color: colors.primary[400] },
  redis: { id: 'redis', labelKey: 'liveAiDataFlow.services.redis', color: colors.error.DEFAULT },
  tavily: { id: 'tavily', labelKey: 'liveAiDataFlow.services.tavily', color: colors.info[400] },
}

export const CATEGORY_COLOR_MAP: Record<NodeCategory, string> = {
  auth: colors.info.DEFAULT,
  quota: colors.warning.DEFAULT,
  stt: colors.success.DEFAULT,
  translation: colors.secondary.DEFAULT,
  tts: colors.warning[600],
  deduplication: colors.info[400],
  cache: colors.primary[400],
  ai: colors.secondary[400],
  output: colors.success[400],
  session: colors.primary.DEFAULT,
  search: colors.info[600],
  tracking: colors.warning[400],
}
