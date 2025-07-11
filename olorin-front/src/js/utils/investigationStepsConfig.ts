import { InvestigationStep } from '../types/RiskAssessment';
import { InvestigationStepId, StepStatus } from '../constants/definitions';

export const allPossibleSteps: InvestigationStep[] = [
  {
    id: InvestigationStepId.NETWORK,
    agent: 'Network Agent',
    title: 'Network',
    description: 'Analyzing network characteristics and potential threats',
    status: StepStatus.PENDING,
    details: {},
    timestamp: new Date().toISOString(),
    tools: [],
  },
  {
    id: InvestigationStepId.LOCATION,
    agent: 'Location Agent',
    title: 'Location',
    description:
      'Checking for suspicious location patterns and travel anomalies',
    status: StepStatus.PENDING,
    details: {},
    timestamp: new Date().toISOString(),
    tools: [],
  },
  {
    id: InvestigationStepId.DEVICE,
    agent: 'Device Agent',
    title: 'Device',
    description: 'Examining device history and changes',
    status: StepStatus.PENDING,
    details: {},
    timestamp: new Date().toISOString(),
    tools: [],
  },
  {
    id: InvestigationStepId.LOG,
    agent: 'Log Agent',
    title: 'Log',
    description: 'Reviewing system logs for suspicious patterns',
    status: StepStatus.PENDING,
    details: {},
    timestamp: new Date().toISOString(),
    tools: [],
  },
];

export const defaultSelectedInvestigationSteps: InvestigationStep[] = [
  {
    id: InvestigationStepId.INIT,
    agent: 'Initialization',
    title: 'Initialization',
    description: 'Starting investigation process',
    status: StepStatus.PENDING,
    details: {},
    timestamp: new Date().toISOString(),
    tools: [],
  },
  ...allPossibleSteps,
  {
    id: InvestigationStepId.RISK,
    agent: 'Risk Assessment Agent',
    title: 'Risk Assessment',
    description: 'Calculating overall risk score and determining threat level',
    status: StepStatus.PENDING,
    details: {},
    timestamp: new Date().toISOString(),
    tools: [],
  },
];

export function createStep(
  params: {
    id: InvestigationStepId;
    agent: string;
    title: string;
    description: string;
  },
  status: StepStatus = StepStatus.PENDING,
  details: any = {},
): InvestigationStep {
  return {
    ...params,
    status,
    details,
    timestamp: new Date().toISOString(),
    tools: [],
  };
}
