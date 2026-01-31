import React from 'react'
import type { DataFlowNodeConfig } from './types'
import DataFlowPipeline from './components/DataFlowPipeline'

const TRANSLATION_NODES: DataFlowNodeConfig[] = [
  {
    id: 'trans-auth',
    stepNumber: 1,
    titleKey: 'liveAiDataFlow.translation.nodes.auth.title',
    category: 'auth',
    inputKey: 'liveAiDataFlow.translation.nodes.auth.input',
    outputKey: 'liveAiDataFlow.translation.nodes.auth.output',
    externalServices: [],
  },
  {
    id: 'trans-quota',
    stepNumber: 2,
    titleKey: 'liveAiDataFlow.translation.nodes.quota.title',
    category: 'quota',
    inputKey: 'liveAiDataFlow.translation.nodes.quota.input',
    outputKey: 'liveAiDataFlow.translation.nodes.quota.output',
    externalServices: [],
    latency: '~0ms',
  },
  {
    id: 'trans-stt',
    stepNumber: 3,
    titleKey: 'liveAiDataFlow.translation.nodes.stt.title',
    category: 'stt',
    inputKey: 'liveAiDataFlow.translation.nodes.stt.input',
    outputKey: 'liveAiDataFlow.translation.nodes.stt.output',
    externalServices: ['elevenlabs', 'google_cloud', 'openai'],
    latency: '~150ms',
  },
  {
    id: 'trans-dedup',
    stepNumber: 4,
    titleKey: 'liveAiDataFlow.translation.nodes.dedup.title',
    category: 'deduplication',
    inputKey: 'liveAiDataFlow.translation.nodes.dedup.input',
    outputKey: 'liveAiDataFlow.translation.nodes.dedup.output',
    externalServices: [],
  },
  {
    id: 'trans-predictive',
    stepNumber: 5,
    titleKey: 'liveAiDataFlow.translation.nodes.predictive.title',
    category: 'output',
    inputKey: 'liveAiDataFlow.translation.nodes.predictive.input',
    outputKey: 'liveAiDataFlow.translation.nodes.predictive.output',
    externalServices: [],
    optional: true,
  },
  {
    id: 'trans-translate',
    stepNumber: 6,
    titleKey: 'liveAiDataFlow.translation.nodes.translate.title',
    category: 'translation',
    inputKey: 'liveAiDataFlow.translation.nodes.translate.input',
    outputKey: 'liveAiDataFlow.translation.nodes.translate.output',
    externalServices: ['google_translate', 'openai', 'claude'],
    latency: '~30ms',
  },
  {
    id: 'trans-chunk',
    stepNumber: 7,
    titleKey: 'liveAiDataFlow.translation.nodes.chunk.title',
    category: 'deduplication',
    inputKey: 'liveAiDataFlow.translation.nodes.chunk.input',
    outputKey: 'liveAiDataFlow.translation.nodes.chunk.output',
    externalServices: [],
  },
  {
    id: 'trans-emit',
    stepNumber: 8,
    titleKey: 'liveAiDataFlow.translation.nodes.emit.title',
    category: 'output',
    inputKey: 'liveAiDataFlow.translation.nodes.emit.input',
    outputKey: 'liveAiDataFlow.translation.nodes.emit.output',
    externalServices: [],
  },
]

const TranslationFlowTab: React.FC = () => {
  return <DataFlowPipeline nodes={TRANSLATION_NODES} />
}

export default TranslationFlowTab
