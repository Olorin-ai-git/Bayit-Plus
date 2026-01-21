import {
  InvestigationParams,
  InvestigationResult,
} from '../shared/types/investigation';

export interface FraudInvestigationService {
  investigateFraud: (
    params: InvestigationParams,
  ) => Promise<InvestigationResult>;
  investigateUser: (
    params: InvestigationParams,
  ) => Promise<InvestigationResult>;
  investigateDevice: (
    params: InvestigationParams,
  ) => Promise<InvestigationResult>;
}

export class FraudInvestigationServiceImpl
  implements FraudInvestigationService
{
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async investigateFraud(
    params: InvestigationParams,
  ): Promise<InvestigationResult> {
    const response = await fetch(`${this.baseUrl}/investigate/fraud`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error('Failed to investigate fraud');
    }

    return response.json();
  }

  async investigateUser(
    params: InvestigationParams,
  ): Promise<InvestigationResult> {
    const response = await fetch(`${this.baseUrl}/investigate/user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error('Failed to investigate user');
    }

    return response.json();
  }

  async investigateDevice(
    params: InvestigationParams,
  ): Promise<InvestigationResult> {
    const response = await fetch(`${this.baseUrl}/investigate/device`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error('Failed to investigate device');
    }

    return response.json();
  }
}
