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
};
