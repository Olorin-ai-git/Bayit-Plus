import { IPaymentProvider } from '../../types/providers.types';
import { PaymentProviderName } from '../../types/payments.types';

export interface ProviderHealthStatus {
  isHealthy: boolean;
  lastCheck: Date;
  responseTime: number;
}

export class ProviderRegistry {
  private providers: Map<PaymentProviderName, IPaymentProvider> = new Map();
  private healthStatus: Map<PaymentProviderName, ProviderHealthStatus> = new Map();

  registerProvider(name: PaymentProviderName, provider: IPaymentProvider): void {
    this.providers.set(name, provider);
    this.healthStatus.set(name, {
      isHealthy: true,
      lastCheck: new Date(),
      responseTime: 0,
    });
  }

  getProvider(name: PaymentProviderName): IPaymentProvider | undefined {
    return this.providers.get(name);
  }

  getAllProviders(): IPaymentProvider[] {
    return Array.from(this.providers.values());
  }

  getHealthyProviders(): IPaymentProvider[] {
    const healthyProviders: IPaymentProvider[] = [];
    for (const [name, provider] of this.providers) {
      const health = this.healthStatus.get(name);
      if (health?.isHealthy) {
        healthyProviders.push(provider);
      }
    }
    return healthyProviders;
  }

  updateProviderHealth(name: PaymentProviderName, health: ProviderHealthStatus): void {
    this.healthStatus.set(name, health);
  }
}

export const providerRegistry = new ProviderRegistry();