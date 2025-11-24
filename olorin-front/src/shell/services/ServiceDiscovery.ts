export interface ServiceConfig {
  name: string;
  port: number;
  url: string;
  remoteEntry: string;
  status: 'loading' | 'ready' | 'error' | 'offline';
  health?: {
    lastCheck: string;
    responseTime: number;
    uptime: number;
  };
  exposes?: Record<string, string>;
  remotes?: Record<string, string>;
}

export interface ServiceRegistry {
  [serviceName: string]: ServiceConfig;
}

export class ServiceDiscovery {
  private registry: ServiceRegistry = {};
  private discoveryTimeout = 5000; // 5 seconds

  constructor() {
    this.initializeStaticServices();
  }

  private initializeStaticServices(): void {
    const baseUrl = process.env.NODE_ENV === 'development'
      ? 'http://localhost'
      : window.location.origin;

    this.registry = {
      shell: {
        name: 'shell',
        port: 3000,
        url: `${baseUrl}:3000`,
        remoteEntry: `${baseUrl}:3000/remoteEntry.js`,
        status: 'ready',
        exposes: {
          './App': './src/shell/App.tsx',
          './Router': './src/shell/Router.tsx'
        },
        remotes: {
          coreUi: 'coreUi@http://localhost:3006/remoteEntry.js',
          investigation: 'investigation@http://localhost:3001/remoteEntry.js',
          agentAnalytics: 'agentAnalytics@http://localhost:3002/remoteEntry.js',
          ragIntelligence: 'ragIntelligence@http://localhost:3003/remoteEntry.js',
          visualization: 'visualization@http://localhost:3004/remoteEntry.js',
          reporting: 'reporting@http://localhost:3005/remoteEntry.js',
          designSystem: 'designSystem@http://localhost:3007/remoteEntry.js'
        }
      },
      investigation: {
        name: 'investigation',
        port: 3001,
        url: `${baseUrl}:3001`,
        remoteEntry: `${baseUrl}:3001/remoteEntry.js`,
        status: 'loading',
        exposes: {
          './InvestigationDashboard': './src/microservices/investigation/components/InvestigationDashboard.tsx',
<<<<<<< HEAD
          './AutonomousInvestigation': './src/microservices/investigation/components/AutonomousInvestigation.tsx',
          './ManualInvestigationDetails': './src/microservices/investigation/components/ManualInvestigationDetails.tsx',
          './InvestigationWizard': './src/microservices/investigation/components/InvestigationWizard.tsx',
=======
          './StructuredInvestigation': './src/microservices/investigation/components/StructuredInvestigation.tsx',
          './ManualInvestigationDetails': './src/microservices/investigation/components/ManualInvestigationDetails.tsx',
          './InvestigationWizard': './src/microservices/investigation/containers/InvestigationWizard.tsx',
>>>>>>> 001-modify-analyzer-method
          './EvidenceManager': './src/microservices/investigation/components/EvidenceManager.tsx'
        },
        remotes: {
          coreUi: 'coreUi@http://localhost:3006/remoteEntry.js',
          designSystem: 'designSystem@http://localhost:3007/remoteEntry.js'
        }
      },
      agentAnalytics: {
        name: 'agentAnalytics',
        port: 3002,
        url: `${baseUrl}:3002`,
        remoteEntry: `${baseUrl}:3002/remoteEntry.js`,
        status: 'loading',
        exposes: {
          './AgentAnalyticsDashboard': './src/microservices/agent-analytics/components/AgentAnalyticsDashboard.tsx',
          './PerformanceMetrics': './src/microservices/agent-analytics/components/PerformanceMetrics.tsx',
          './ModelAnalytics': './src/microservices/agent-analytics/components/ModelAnalytics.tsx',
          './UsageTracking': './src/microservices/agent-analytics/components/UsageTracking.tsx',
          './CostAnalytics': './src/microservices/agent-analytics/components/CostAnalytics.tsx'
        },
        remotes: {
          coreUi: 'coreUi@http://localhost:3006/remoteEntry.js',
          designSystem: 'designSystem@http://localhost:3007/remoteEntry.js',
          visualization: 'visualization@http://localhost:3004/remoteEntry.js'
        }
      },
      ragIntelligence: {
        name: 'ragIntelligence',
        port: 3003,
        url: `${baseUrl}:3003`,
        remoteEntry: `${baseUrl}:3003/remoteEntry.js`,
        status: 'loading',
        exposes: {
          './KnowledgeBase': './src/microservices/rag-intelligence/components/KnowledgeBase.tsx',
          './DocumentRetrieval': './src/microservices/rag-intelligence/components/DocumentRetrieval.tsx',
          './IntelligentSearch': './src/microservices/rag-intelligence/components/IntelligentSearch.tsx',
          './VectorDatabase': './src/microservices/rag-intelligence/components/VectorDatabase.tsx'
        },
        remotes: {
          coreUi: 'coreUi@http://localhost:3006/remoteEntry.js',
          designSystem: 'designSystem@http://localhost:3007/remoteEntry.js'
        }
      },
      visualization: {
        name: 'visualization',
        port: 3004,
        url: `${baseUrl}:3004`,
        remoteEntry: `${baseUrl}:3004/remoteEntry.js`,
        status: 'loading',
        exposes: {
          './ChartBuilder': './src/microservices/visualization/components/ChartBuilder.tsx',
          './DataVisualization': './src/microservices/visualization/components/DataVisualization.tsx',
          './NetworkGraph': './src/microservices/visualization/components/NetworkGraph.tsx',
          './TimelineVisualization': './src/microservices/visualization/components/TimelineVisualization.tsx'
        },
        remotes: {
          coreUi: 'coreUi@http://localhost:3006/remoteEntry.js',
          designSystem: 'designSystem@http://localhost:3007/remoteEntry.js'
        }
      },
      reporting: {
        name: 'reporting',
        port: 3005,
        url: `${baseUrl}:3005`,
        remoteEntry: `${baseUrl}:3005/remoteEntry.js`,
        status: 'loading',
        exposes: {
          './ReportBuilder': './src/microservices/reporting/components/ReportBuilder.tsx',
          './ReportDashboard': './src/microservices/reporting/components/ReportDashboard.tsx',
          './ReportViewer': './src/microservices/reporting/components/ReportViewer.tsx'
        },
        remotes: {
          coreUi: 'coreUi@http://localhost:3006/remoteEntry.js',
          designSystem: 'designSystem@http://localhost:3007/remoteEntry.js',
          visualization: 'visualization@http://localhost:3004/remoteEntry.js'
        }
      },
      coreUi: {
        name: 'coreUi',
        port: 3006,
        url: `${baseUrl}:3006`,
        remoteEntry: `${baseUrl}:3006/remoteEntry.js`,
        status: 'loading',
        exposes: {
          './Navigation': './src/microservices/core-ui/components/Navigation.tsx',
          './Header': './src/microservices/core-ui/components/Header.tsx',
          './Sidebar': './src/microservices/core-ui/components/Sidebar.tsx',
          './Layout': './src/microservices/core-ui/components/Layout.tsx',
          './EventBus': './src/microservices/core-ui/services/eventBus.ts',
          './AuthProvider': './src/microservices/core-ui/providers/AuthProvider.tsx'
        },
        remotes: {
          designSystem: 'designSystem@http://localhost:3007/remoteEntry.js'
        }
      },
      designSystem: {
        name: 'designSystem',
        port: 3007,
        url: `${baseUrl}:3007`,
        remoteEntry: `${baseUrl}:3007/remoteEntry.js`,
        status: 'loading',
        exposes: {
          './DesignSystemFoundation': './src/microservices/design-system/components/DesignSystemFoundation.tsx',
          './DesignTokens': './src/microservices/design-system/types/design.ts'
        },
        remotes: {}
<<<<<<< HEAD
      },
      autonomousInvestigation: {
        name: 'autonomousInvestigation',
        port: 3008,
        url: `${baseUrl}:3008`,
        remoteEntry: `${baseUrl}:3008/remoteEntry.js`,
        status: 'loading',
        exposes: {
          './AutonomousInvestigationDashboard': './src/microservices/autonomous-investigation/components/AutonomousInvestigationDashboard.tsx',
          './AIAgentManager': './src/microservices/autonomous-investigation/components/AIAgentManager.tsx'
        },
        remotes: {
          coreUi: 'coreUi@http://localhost:3006/remoteEntry.js',
          designSystem: 'designSystem@http://localhost:3007/remoteEntry.js',
          agentAnalytics: 'agentAnalytics@http://localhost:3002/remoteEntry.js'
        }
      },
      manualInvestigation: {
        name: 'manualInvestigation',
        port: 3009,
        url: `${baseUrl}:3009`,
        remoteEntry: `${baseUrl}:3009/remoteEntry.js`,
        status: 'loading',
        exposes: {
          './ManualInvestigationDashboard': './src/microservices/manual-investigation/components/ManualInvestigationDashboard.tsx',
          './InvestigationTools': './src/microservices/manual-investigation/components/InvestigationTools.tsx'
        },
        remotes: {
          coreUi: 'coreUi@http://localhost:3006/remoteEntry.js',
          designSystem: 'designSystem@http://localhost:3007/remoteEntry.js',
          visualization: 'visualization@http://localhost:3004/remoteEntry.js'
        }
=======
>>>>>>> 001-modify-analyzer-method
      }
    };
  }

  async discoverServices(): Promise<ServiceConfig[]> {
    console.log('[Service Discovery] Starting service discovery...');

    const services = Object.values(this.registry);
    const discoveryPromises = services.map(service => this.checkServiceHealth(service));

    try {
      await Promise.all(discoveryPromises);
      const readyServices = services.filter(service => service.status === 'ready');

      console.log(`[Service Discovery] Discovery complete: ${readyServices.length}/${services.length} services ready`);
      return services;
    } catch (error) {
      console.error('[Service Discovery] Discovery failed:', error);
      throw error;
    }
  }

  async checkServiceHealth(service: ServiceConfig): Promise<boolean> {
    if (service.name === 'shell') {
      service.status = 'ready';
      return true;
    }

    const startTime = Date.now();

    try {
      // Check if remoteEntry.js is available instead of health endpoint
      const remoteEntryUrl = service.remoteEntry;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.discoveryTimeout);

      const response = await fetch(remoteEntryUrl, {
        method: 'HEAD', // Use HEAD to check availability without downloading
        signal: controller.signal,
        headers: {
          'Accept': 'application/javascript',
          'X-Service-Discovery': 'true'
        }
      });

      clearTimeout(timeoutId);

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        service.status = 'ready';
        service.health = {
          lastCheck: new Date().toISOString(),
          responseTime,
          uptime: responseTime
        };

        console.log(`[Service Discovery] ${service.name} is ready - remoteEntry available (${responseTime}ms)`);
        return true;
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;

      if (error instanceof Error && error.name === 'AbortError') {
        console.warn(`[Service Discovery] ${service.name} check timeout after ${this.discoveryTimeout}ms`);
        service.status = 'offline';
      } else {
        console.warn(`[Service Discovery] ${service.name} check failed:`, error);
        service.status = 'error';
      }

      service.health = {
        lastCheck: new Date().toISOString(),
        responseTime,
        uptime: 0
      };

      return false;
    }
  }

  getService(serviceName: string): ServiceConfig | undefined {
    return this.registry[serviceName];
  }

  getAllServices(): ServiceConfig[] {
    return Object.values(this.registry);
  }

  getReadyServices(): ServiceConfig[] {
    return Object.values(this.registry).filter(service => service.status === 'ready');
  }

  getServiceByPort(port: number): ServiceConfig | undefined {
    return Object.values(this.registry).find(service => service.port === port);
  }

  registerService(config: ServiceConfig): void {
    this.registry[config.name] = config;
    console.log(`[Service Discovery] Registered service: ${config.name} at ${config.url}`);
  }

  unregisterService(serviceName: string): void {
    if (this.registry[serviceName]) {
      delete this.registry[serviceName];
      console.log(`[Service Discovery] Unregistered service: ${serviceName}`);
    }
  }

  async refreshServiceHealth(): Promise<void> {
    console.log('[Service Discovery] Refreshing service health...');
    const services = Object.values(this.registry);
    await Promise.all(services.map(service => this.checkServiceHealth(service)));
  }

  getServiceStatus(): Record<string, string> {
    const status: Record<string, string> = {};
    Object.values(this.registry).forEach(service => {
      status[service.name] = service.status;
    });
    return status;
  }

  isServiceReady(serviceName: string): boolean {
    const service = this.registry[serviceName];
    return service ? service.status === 'ready' : false;
  }

  waitForService(serviceName: string, timeoutMs: number = 30000): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const checkInterval = setInterval(() => {
        if (this.isServiceReady(serviceName)) {
          clearInterval(checkInterval);
          resolve(true);
        } else if (Date.now() - startTime > timeoutMs) {
          clearInterval(checkInterval);
          reject(new Error(`Timeout waiting for service: ${serviceName}`));
        }
      }, 1000);
    });
  }
}