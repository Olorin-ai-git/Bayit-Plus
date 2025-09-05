import {
  InvestigationResult,
  InvestigationType,
} from '../../types/investigation';

export const mockFraudInvestigationResponse: InvestigationResult = {
  id: 'mock-investigation-1',
  type: InvestigationType.TRANSACTION,
  status: 'SUCCESS',
  riskScore: 0.75,
  details: {
    transactionId: 'mock-transaction-1',
    timestamp: new Date().toISOString(),
    riskFactors: ['High velocity', 'Unusual location'],
  },
  agentResults: [
    {
      agentName: 'Network Agent',
      status: 'completed',
      executionTime: 1500,
      result: { networkRisk: 'high' },
      riskFactors: ['High velocity'],
    },
    {
      agentName: 'Location Agent',
      status: 'completed',
      executionTime: 1200,
      result: { locationRisk: 'medium' },
      riskFactors: ['Unusual location'],
    },
  ],
};

export const mockUserInvestigationResponse: InvestigationResult = {
  id: 'mock-user-investigation-1',
  type: InvestigationType.USER,
  status: 'SUCCESS',
  riskScore: 0.85,
  details: {
    userId: 'mock-user-1',
    timestamp: new Date().toISOString(),
    riskFactors: ['Multiple accounts', 'Suspicious behavior'],
  },
  agentResults: [
    {
      agentName: 'User Agent',
      status: 'completed',
      executionTime: 1800,
      result: { userRisk: 'high' },
      riskFactors: ['Multiple accounts'],
    },
    {
      agentName: 'Behavior Agent',
      status: 'completed',
      executionTime: 1600,
      result: { behaviorRisk: 'high' },
      riskFactors: ['Suspicious behavior'],
    },
  ],
};

export const mockDeviceInvestigationResponse: InvestigationResult = {
  id: 'mock-device-investigation-1',
  type: InvestigationType.DEVICE,
  status: 'SUCCESS',
  riskScore: 0.65,
  details: {
    deviceId: 'mock-device-1',
    timestamp: new Date().toISOString(),
    riskFactors: ['Known bad device', 'Proxy detected'],
  },
  agentResults: [
    {
      agentName: 'Device Agent',
      status: 'completed',
      executionTime: 1400,
      result: { deviceRisk: 'medium' },
      riskFactors: ['Known bad device'],
    },
    {
      agentName: 'Network Agent',
      status: 'completed',
      executionTime: 1300,
      result: { proxyRisk: 'high' },
      riskFactors: ['Proxy detected'],
    },
  ],
};
