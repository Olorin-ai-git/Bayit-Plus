import React from 'react'
import type { DataFlowNodeConfig } from './types'
import DataFlowPipeline from './components/DataFlowPipeline'

const DUBBING_NODES: DataFlowNodeConfig[] = [
  {
    id: 'dub-auth',
    stepNumber: 1,
    titleKey: 'liveAiDataFlow.dubbing.nodes.auth.title',
    category: 'auth',
    inputKey: 'liveAiDataFlow.dubbing.nodes.auth.input',
    outputKey: 'liveAiDataFlow.dubbing.nodes.auth.output',
    externalServices: [],
  },
  {
    id: 'dub-quota',
    stepNumber: 2,
    titleKey: 'liveAiDataFlow.dubbing.nodes.quota.title',
    category: 'quota',
    inputKey: 'liveAiDataFlow.dubbing.nodes.quota.input',
    outputKey: 'liveAiDataFlow.dubbing.nodes.quota.output',
    externalServices: [],
    latency: '~0ms',
  },
  {
    id: 'dub-session',
    stepNumber: 3,
    titleKey: 'liveAiDataFlow.dubbing.nodes.session.title',
    category: 'session',
    inputKey: 'liveAiDataFlow.dubbing.nodes.session.input',
    outputKey: 'liveAiDataFlow.dubbing.nodes.session.output',
    externalServices: [],
  },
  {
    id: 'dub-stt',
    stepNumber: 4,
    titleKey: 'liveAiDataFlow.dubbing.nodes.stt.title',
    category: 'stt',
    inputKey: 'liveAiDataFlow.dubbing.nodes.stt.input',
    outputKey: 'liveAiDataFlow.dubbing.nodes.stt.output',
    externalServices: ['elevenlabs'],
    latency: '~150ms',
  },
  {
    id: 'dub-transcript-emit',
    stepNumber: 5,
    titleKey: 'liveAiDataFlow.dubbing.nodes.transcriptEmit.title',
    category: 'output',
    inputKey: 'liveAiDataFlow.dubbing.nodes.transcriptEmit.input',
    outputKey: 'liveAiDataFlow.dubbing.nodes.transcriptEmit.output',
    externalServices: [],
  },
  {
    id: 'dub-translate',
    stepNumber: 6,
    titleKey: 'liveAiDataFlow.dubbing.nodes.translate.title',
    category: 'translation',
    inputKey: 'liveAiDataFlow.dubbing.nodes.translate.input',
    outputKey: 'liveAiDataFlow.dubbing.nodes.translate.output',
    externalServices: ['google_translate', 'openai', 'claude'],
    latency: '~30ms',
  },
  {
    id: 'dub-translation-emit',
    stepNumber: 7,
    titleKey: 'liveAiDataFlow.dubbing.nodes.translationEmit.title',
    category: 'output',
    inputKey: 'liveAiDataFlow.dubbing.nodes.translationEmit.input',
    outputKey: 'liveAiDataFlow.dubbing.nodes.translationEmit.output',
    externalServices: [],
  },
  {
    id: 'dub-tts',
    stepNumber: 8,
    titleKey: 'liveAiDataFlow.dubbing.nodes.tts.title',
    category: 'tts',
    inputKey: 'liveAiDataFlow.dubbing.nodes.tts.input',
    outputKey: 'liveAiDataFlow.dubbing.nodes.tts.output',
    externalServices: ['elevenlabs'],
    latency: '~200-400ms',
  },
  {
    id: 'dub-encode',
    stepNumber: 9,
    titleKey: 'liveAiDataFlow.dubbing.nodes.encode.title',
    category: 'deduplication',
    inputKey: 'liveAiDataFlow.dubbing.nodes.encode.input',
    outputKey: 'liveAiDataFlow.dubbing.nodes.encode.output',
    externalServices: [],
  },
  {
    id: 'dub-audio-emit',
    stepNumber: 10,
    titleKey: 'liveAiDataFlow.dubbing.nodes.audioEmit.title',
    category: 'output',
    inputKey: 'liveAiDataFlow.dubbing.nodes.audioEmit.input',
    outputKey: 'liveAiDataFlow.dubbing.nodes.audioEmit.output',
    externalServices: [],
  },
]

const DubbingFlowTab: React.FC = () => {
  return <DataFlowPipeline nodes={DUBBING_NODES} />
}

export default DubbingFlowTab
