declare module '@cvplus/analytics' {
  export interface AnalyticsEvent {
    id: string;
    type: string;
    timestamp: Date;
    data: Record<string, any>;
  }

  export interface AnalyticsMetrics {
    events: AnalyticsEvent[];
    aggregations: Record<string, number>;
  }

  export interface AnalyticsService {
    track(event: AnalyticsEvent): Promise<void>;
    getMetrics(): Promise<AnalyticsMetrics>;
  }

  export const analyticsService: AnalyticsService;
}