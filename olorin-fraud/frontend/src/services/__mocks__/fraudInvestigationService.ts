import { FraudInvestigationService } from '../fraudInvestigationService';
import { mockFraudInvestigationResponse } from './mockData';

export const mockFraudInvestigationService: FraudInvestigationService = {
  investigateFraud: async (params) => {
    return Promise.resolve(mockFraudInvestigationResponse);
  },
  investigateUser: async (params) => {
    return Promise.resolve(mockFraudInvestigationResponse);
  },
  investigateDevice: async (params) => {
    return Promise.resolve(mockFraudInvestigationResponse);
  },
};
