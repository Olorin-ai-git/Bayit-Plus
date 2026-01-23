import React from 'react';
import { TFunction } from 'i18next';
import {
  Calendar,
  BarChart3,
  Target,
  Database,
  RefreshCw,
  Radio,
  Volume2,
  Music,
  MessageCircle,
  Users
} from 'lucide-react';

export const getFeatures = (t: TFunction) => [
  {
    icon: <Calendar className="w-12 h-12" aria-hidden="true" />,
    color: 'radio' as const,
    title: t('features.automation.title'),
    description: t('features.automation.description'),
  },
  {
    icon: <BarChart3 className="w-12 h-12" aria-hidden="true" />,
    color: 'radio' as const,
    title: t('features.analytics.title'),
    description: t('features.analytics.description'),
  },
  {
    icon: <Target className="w-12 h-12" aria-hidden="true" />,
    color: 'radio' as const,
    title: t('features.adInsertion.title'),
    description: t('features.adInsertion.description'),
  },
];

export const getWorkflowSteps = (t: TFunction) => [
  {
    icon: <Database className="w-10 h-10" aria-hidden="true" />,
    color: 'radio' as const,
    title: t('workflow.step1.title'),
    description: t('workflow.step1.description'),
  },
  {
    icon: <RefreshCw className="w-10 h-10" aria-hidden="true" />,
    color: 'radio' as const,
    title: t('workflow.step2.title'),
    description: t('workflow.step2.description'),
  },
  {
    icon: <Radio className="w-10 h-10" aria-hidden="true" />,
    color: 'radio' as const,
    title: t('workflow.step3.title'),
    description: t('workflow.step3.description'),
  },
  {
    icon: <BarChart3 className="w-10 h-10" aria-hidden="true" />,
    color: 'radio' as const,
    title: t('workflow.step4.title'),
    description: t('workflow.step4.description'),
  },
];

export const getSolutions = (t: TFunction) => [
  {
    icon: <Volume2 className="w-10 h-10" aria-hidden="true" />,
    name: t('solutions.commercial.title'),
    description: t('solutions.commercial.description')
  },
  {
    icon: <Music className="w-10 h-10" aria-hidden="true" />,
    name: t('solutions.music.title'),
    description: t('solutions.music.description')
  },
  {
    icon: <MessageCircle className="w-10 h-10" aria-hidden="true" />,
    name: t('solutions.talk.title'),
    description: t('solutions.talk.description')
  },
  {
    icon: <Users className="w-10 h-10" aria-hidden="true" />,
    name: t('solutions.community.title'),
    description: t('solutions.community.description')
  },
];

export const getMetrics = (t: TFunction) => [
  { value: t('metrics.retention'), label: t('metrics.retentionLabel') },
  { value: t('metrics.scheduling'), label: t('metrics.schedulingLabel') },
  { value: t('metrics.revenue'), label: t('metrics.revenueLabel') },
  { value: t('metrics.engagement'), label: t('metrics.engagementLabel') },
];
