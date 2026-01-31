import React from 'react'
import type { DataFlowNodeConfig } from './types'
import DataFlowPipeline from './components/DataFlowPipeline'

const TRIVIA_NODES: DataFlowNodeConfig[] = [
  {
    id: 'trivia-auth',
    stepNumber: 1,
    titleKey: 'liveAiDataFlow.trivia.nodes.auth.title',
    category: 'auth',
    inputKey: 'liveAiDataFlow.trivia.nodes.auth.input',
    outputKey: 'liveAiDataFlow.trivia.nodes.auth.output',
    externalServices: [],
  },
  {
    id: 'trivia-quota',
    stepNumber: 2,
    titleKey: 'liveAiDataFlow.trivia.nodes.quota.title',
    category: 'quota',
    inputKey: 'liveAiDataFlow.trivia.nodes.quota.input',
    outputKey: 'liveAiDataFlow.trivia.nodes.quota.output',
    externalServices: [],
  },
  {
    id: 'trivia-topic',
    stepNumber: 3,
    titleKey: 'liveAiDataFlow.trivia.nodes.topic.title',
    category: 'ai',
    inputKey: 'liveAiDataFlow.trivia.nodes.topic.input',
    outputKey: 'liveAiDataFlow.trivia.nodes.topic.output',
    externalServices: ['spacy', 'claude'],
  },
  {
    id: 'trivia-mention',
    stepNumber: 4,
    titleKey: 'liveAiDataFlow.trivia.nodes.mention.title',
    category: 'tracking',
    inputKey: 'liveAiDataFlow.trivia.nodes.mention.input',
    outputKey: 'liveAiDataFlow.trivia.nodes.mention.output',
    externalServices: ['redis'],
  },
  {
    id: 'trivia-session',
    stepNumber: 5,
    titleKey: 'liveAiDataFlow.trivia.nodes.session.title',
    category: 'session',
    inputKey: 'liveAiDataFlow.trivia.nodes.session.input',
    outputKey: 'liveAiDataFlow.trivia.nodes.session.output',
    externalServices: [],
  },
  {
    id: 'trivia-cache',
    stepNumber: 6,
    titleKey: 'liveAiDataFlow.trivia.nodes.cache.title',
    category: 'cache',
    inputKey: 'liveAiDataFlow.trivia.nodes.cache.input',
    outputKey: 'liveAiDataFlow.trivia.nodes.cache.output',
    externalServices: ['redis'],
  },
  {
    id: 'trivia-search',
    stepNumber: 7,
    titleKey: 'liveAiDataFlow.trivia.nodes.search.title',
    category: 'search',
    inputKey: 'liveAiDataFlow.trivia.nodes.search.input',
    outputKey: 'liveAiDataFlow.trivia.nodes.search.output',
    externalServices: ['tavily'],
  },
  {
    id: 'trivia-extract',
    stepNumber: 8,
    titleKey: 'liveAiDataFlow.trivia.nodes.extract.title',
    category: 'ai',
    inputKey: 'liveAiDataFlow.trivia.nodes.extract.input',
    outputKey: 'liveAiDataFlow.trivia.nodes.extract.output',
    externalServices: ['claude'],
  },
  {
    id: 'trivia-tracking',
    stepNumber: 9,
    titleKey: 'liveAiDataFlow.trivia.nodes.tracking.title',
    category: 'tracking',
    inputKey: 'liveAiDataFlow.trivia.nodes.tracking.input',
    outputKey: 'liveAiDataFlow.trivia.nodes.tracking.output',
    externalServices: [],
  },
  {
    id: 'trivia-emit',
    stepNumber: 10,
    titleKey: 'liveAiDataFlow.trivia.nodes.emit.title',
    category: 'output',
    inputKey: 'liveAiDataFlow.trivia.nodes.emit.input',
    outputKey: 'liveAiDataFlow.trivia.nodes.emit.output',
    externalServices: [],
  },
]

const TriviaFlowTab: React.FC = () => {
  return <DataFlowPipeline nodes={TRIVIA_NODES} />
}

export default TriviaFlowTab
