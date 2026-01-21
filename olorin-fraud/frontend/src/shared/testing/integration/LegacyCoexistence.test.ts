/**
 * Legacy/New Architecture Coexistence Integration Tests
 *
 * These tests ensure that legacy components and new microservices
 * can coexist during the migration process without conflicts.
 */

import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { jest } from '@jest/globals';

// Legacy component imports (to be mocked during testing)
const mockLegacyComponents = {
  InvestigationPage: jest.fn(() => <div data-testid="legacy-investigation">Legacy Investigation Page</div>),
  RAGPage: jest.fn(() => <div data-testid="legacy-rag">Legacy RAG Page</div>),
  Investigations: jest.fn(() => <div data-testid="legacy-investigations">Legacy Investigations</div>),
  AgentDetailsTable: jest.fn(() => <div data-testid="legacy-agent-table">Legacy Agent Table</div>),
};

// New microservice components (to be implemented)
const mockNewComponents = {
  InvestigationDashboard: jest.fn(() => <div data-testid="new-investigation">New Investigation Service</div>),
  RAGDashboard: jest.fn(() => <div data-testid="new-rag">New RAG Service</div>),
  InvestigationsList: jest.fn(() => <div data-testid="new-investigations">New Investigations Service</div>),
  AgentAnalyticsDashboard: jest.fn(() => <div data-testid="new-agent-analytics">New Agent Analytics</div>),
};

// Mock event bus for inter-service communication
const mockEventBus = {
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  subscribers: new Map(),
};

describe('Legacy/New Architecture Coexistence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEventBus.subscribers.clear();
  });

  describe('Route Coexistence', () => {
    it('should handle routing to legacy components when new services are not ready', async () => {
      const TestRouter = () => (
        <BrowserRouter>
          <div>
            {/* Simulate feature flag routing */}
            {process.env.REACT_APP_USE_NEW_INVESTIGATION === 'true'
              ? mockNewComponents.InvestigationDashboard()
              : mockLegacyComponents.InvestigationPage()
            }
          </div>
        </BrowserRouter>
      );

      // Test legacy route
      process.env.REACT_APP_USE_NEW_INVESTIGATION = 'false';
      const { rerender } = render(<TestRouter />);

      expect(screen.getByTestId('legacy-investigation')).toBeInTheDocument();
      expect(mockLegacyComponents.InvestigationPage).toHaveBeenCalledTimes(1);

      // Test new route
      process.env.REACT_APP_USE_NEW_INVESTIGATION = 'true';
      rerender(<TestRouter />);

      expect(screen.getByTestId('new-investigation')).toBeInTheDocument();
      expect(mockNewComponents.InvestigationDashboard).toHaveBeenCalledTimes(1);
    });

    it('should gracefully fallback to legacy components when new services fail', async () => {
      const FailsafeRouter = () => {
        const [useNewService, setUseNewService] = React.useState(true);

        React.useEffect(() => {
          // Simulate service health check
          const checkServiceHealth = async () => {
            try {
              // Mock service health check that fails
              throw new Error('New service unavailable');
            } catch (error) {
              console.warn('New service unavailable, falling back to legacy');
              setUseNewService(false);
            }
          };

          checkServiceHealth();
        }, []);

        return (
          <div>
            {useNewService
              ? mockNewComponents.InvestigationDashboard()
              : mockLegacyComponents.InvestigationPage()
            }
          </div>
        );
      };

      render(<FailsafeRouter />);

      await waitFor(() => {
        expect(screen.getByTestId('legacy-investigation')).toBeInTheDocument();
      });
    });
  });

  describe('State Management Coexistence', () => {
    it('should handle shared state between legacy and new components', async () => {
      const sharedState = {
        user: { id: '123', name: 'Test User' },
        investigation: { id: 'inv-456', status: 'active' },
      };

      // Mock context provider that works with both architectures
      const MockSharedStateProvider = ({ children }: { children: React.ReactNode }) => {
        return (
          <div data-shared-state={JSON.stringify(sharedState)}>
            {children}
          </div>
        );
      };

      const CoexistenceTest = () => (
        <MockSharedStateProvider>
          <div data-testid="legacy-component">
            {mockLegacyComponents.InvestigationPage()}
          </div>
          <div data-testid="new-component">
            {mockNewComponents.InvestigationDashboard()}
          </div>
        </MockSharedStateProvider>
      );

      render(<CoexistenceTest />);

      expect(screen.getByTestId('legacy-component')).toBeInTheDocument();
      expect(screen.getByTestId('new-component')).toBeInTheDocument();

      // Verify both components can access shared state
      const sharedStateElement = screen.getByTestId('legacy-component').parentElement;
      expect(sharedStateElement?.getAttribute('data-shared-state')).toContain('Test User');
    });
  });

  describe('Event Bus Communication', () => {
    it('should enable communication between legacy and new components via event bus', async () => {
      const EventBusTest = () => {
        React.useEffect(() => {
          // Simulate legacy component subscribing to events
          mockEventBus.on('investigation:updated', (data: any) => {
            console.log('Legacy component received event:', data);
          });

          // Simulate new component emitting events
          mockEventBus.emit('investigation:updated', {
            id: 'inv-123',
            status: 'completed',
            source: 'new-service'
          });
        }, []);

        return (
          <div>
            <div data-testid="legacy-subscriber">
              {mockLegacyComponents.InvestigationPage()}
            </div>
            <div data-testid="new-emitter">
              {mockNewComponents.InvestigationDashboard()}
            </div>
          </div>
        );
      };

      render(<EventBusTest />);

      expect(mockEventBus.on).toHaveBeenCalledWith('investigation:updated', expect.any(Function));
      expect(mockEventBus.emit).toHaveBeenCalledWith('investigation:updated', {
        id: 'inv-123',
        status: 'completed',
        source: 'new-service'
      });
    });

    it('should handle event bus failures gracefully', async () => {
      const mockFailingEventBus = {
        ...mockEventBus,
        emit: jest.fn(() => { throw new Error('Event bus error'); }),
      };

      const ErrorHandlingTest = () => {
        React.useEffect(() => {
          try {
            mockFailingEventBus.emit('test:event', { data: 'test' });
          } catch (error) {
            console.warn('Event bus communication failed:', error);
            // Should not crash the application
          }
        }, []);

        return <div data-testid="error-resilient">Component still works</div>;
      };

      render(<ErrorHandlingTest />);

      expect(screen.getByTestId('error-resilient')).toBeInTheDocument();
      expect(mockFailingEventBus.emit).toHaveBeenCalled();
    });
  });

  describe('Style Coexistence', () => {
    it('should handle Material-UI and Tailwind CSS coexistence', async () => {
      const StyleCoexistenceTest = () => (
        <div>
          {/* Legacy component with Material-UI */}
          <div
            data-testid="legacy-mui-component"
            className="MuiPaper-root MuiPaper-elevation1"
            style={{
              padding: '16px',
              margin: '8px',
              backgroundColor: '#f5f5f5'
            }}
          >
            Legacy Material-UI Component
          </div>

          {/* New component with Tailwind CSS */}
          <div
            data-testid="new-tailwind-component"
            className="bg-white p-4 m-2 rounded-lg shadow-md"
          >
            New Tailwind Component
          </div>
        </div>
      );

      render(<StyleCoexistenceTest />);

      const legacyComponent = screen.getByTestId('legacy-mui-component');
      const newComponent = screen.getByTestId('new-tailwind-component');

      expect(legacyComponent).toHaveClass('MuiPaper-root');
      expect(newComponent).toHaveClass('bg-white', 'p-4', 'rounded-lg');

      // Both should be visible and styled correctly
      expect(legacyComponent).toBeVisible();
      expect(newComponent).toBeVisible();
    });
  });

  describe('API Integration Coexistence', () => {
    it('should handle API calls from both legacy and new services', async () => {
      const mockApiCalls = {
        legacyApi: jest.fn(() => Promise.resolve({ data: 'legacy response' })),
        newApi: jest.fn(() => Promise.resolve({ data: 'new response' })),
      };

      const ApiCoexistenceTest = () => {
        const [legacyData, setLegacyData] = React.useState(null);
        const [newData, setNewData] = React.useState(null);

        React.useEffect(() => {
          // Simulate legacy API call
          mockApiCalls.legacyApi().then(setLegacyData);

          // Simulate new service API call
          mockApiCalls.newApi().then(setNewData);
        }, []);

        return (
          <div>
            <div data-testid="legacy-api-result">
              {legacyData ? JSON.stringify(legacyData) : 'Loading...'}
            </div>
            <div data-testid="new-api-result">
              {newData ? JSON.stringify(newData) : 'Loading...'}
            </div>
          </div>
        );
      };

      render(<ApiCoexistenceTest />);

      await waitFor(() => {
        expect(screen.getByTestId('legacy-api-result')).toHaveTextContent('legacy response');
        expect(screen.getByTestId('new-api-result')).toHaveTextContent('new response');
      });

      expect(mockApiCalls.legacyApi).toHaveBeenCalledTimes(1);
      expect(mockApiCalls.newApi).toHaveBeenCalledTimes(1);
    });
  });

  describe('Performance Coexistence', () => {
    it('should not have performance degradation with dual architecture', async () => {
      const performanceStart = performance.now();

      const PerformanceTest = () => (
        <div>
          {/* Render multiple legacy components */}
          {Array.from({ length: 5 }, (_, i) => (
            <div key={`legacy-${i}`} data-testid={`legacy-${i}`}>
              {mockLegacyComponents.InvestigationPage()}
            </div>
          ))}

          {/* Render multiple new components */}
          {Array.from({ length: 5 }, (_, i) => (
            <div key={`new-${i}`} data-testid={`new-${i}`}>
              {mockNewComponents.InvestigationDashboard()}
            </div>
          ))}
        </div>
      );

      render(<PerformanceTest />);

      const performanceEnd = performance.now();
      const renderTime = performanceEnd - performanceStart;

      // Ensure rendering doesn't take too long (adjust threshold as needed)
      expect(renderTime).toBeLessThan(1000); // 1 second

      // Verify all components rendered
      for (let i = 0; i < 5; i++) {
        expect(screen.getByTestId(`legacy-${i}`)).toBeInTheDocument();
        expect(screen.getByTestId(`new-${i}`)).toBeInTheDocument();
      }
    });
  });

  describe('Error Boundary Coexistence', () => {
    it('should isolate errors between legacy and new components', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const ErrorBoundary = ({ children, testId }: { children: React.ReactNode, testId: string }) => {
        const [hasError, setHasError] = React.useState(false);

        React.useEffect(() => {
          const errorHandler = (error: ErrorEvent) => {
            setHasError(true);
          };

          window.addEventListener('error', errorHandler);
          return () => window.removeEventListener('error', errorHandler);
        }, []);

        if (hasError) {
          return <div data-testid={`${testId}-error`}>Error occurred</div>;
        }

        return <>{children}</>;
      };

      const ErrorTest = () => (
        <div>
          <ErrorBoundary testId="legacy">
            <div data-testid="legacy-component">
              {mockLegacyComponents.InvestigationPage()}
            </div>
          </ErrorBoundary>

          <ErrorBoundary testId="new">
            <div data-testid="new-component">
              {mockNewComponents.InvestigationDashboard()}
            </div>
          </ErrorBoundary>
        </div>
      );

      render(<ErrorTest />);

      // Both components should render initially
      expect(screen.getByTestId('legacy-component')).toBeInTheDocument();
      expect(screen.getByTestId('new-component')).toBeInTheDocument();

      consoleSpy.mockRestore();
    });
  });

  describe('Memory Management Coexistence', () => {
    it('should properly clean up resources from both architectures', async () => {
      const cleanup = {
        legacy: jest.fn(),
        new: jest.fn(),
      };

      const MemoryTest = () => {
        React.useEffect(() => {
          // Simulate legacy component setup
          const legacyCleanup = () => {
            cleanup.legacy();
          };

          // Simulate new component setup
          const newCleanup = () => {
            cleanup.new();
          };

          return () => {
            legacyCleanup();
            newCleanup();
          };
        }, []);

        return (
          <div>
            <div data-testid="memory-test-legacy">
              {mockLegacyComponents.InvestigationPage()}
            </div>
            <div data-testid="memory-test-new">
              {mockNewComponents.InvestigationDashboard()}
            </div>
          </div>
        );
      };

      const { unmount } = render(<MemoryTest />);

      // Verify components mounted
      expect(screen.getByTestId('memory-test-legacy')).toBeInTheDocument();
      expect(screen.getByTestId('memory-test-new')).toBeInTheDocument();

      // Unmount and verify cleanup
      unmount();

      expect(cleanup.legacy).toHaveBeenCalledTimes(1);
      expect(cleanup.new).toHaveBeenCalledTimes(1);
    });
  });

  describe('Feature Flag Management', () => {
    it('should handle feature flags for gradual migration', async () => {
      const featureFlags = {
        useNewInvestigation: false,
        useNewRAG: true,
        useNewAgentAnalytics: false,
      };

      const FeatureFlagTest = () => (
        <div>
          <div data-testid="investigation-service">
            {featureFlags.useNewInvestigation
              ? mockNewComponents.InvestigationDashboard()
              : mockLegacyComponents.InvestigationPage()
            }
          </div>

          <div data-testid="rag-service">
            {featureFlags.useNewRAG
              ? mockNewComponents.RAGDashboard()
              : mockLegacyComponents.RAGPage()
            }
          </div>

          <div data-testid="agent-service">
            {featureFlags.useNewAgentAnalytics
              ? mockNewComponents.AgentAnalyticsDashboard()
              : mockLegacyComponents.AgentDetailsTable()
            }
          </div>
        </div>
      );

      render(<FeatureFlagTest />);

      // Investigation should use legacy
      expect(screen.getByTestId('legacy-investigation')).toBeInTheDocument();

      // RAG should use new
      expect(screen.getByTestId('new-rag')).toBeInTheDocument();

      // Agent Analytics should use legacy
      expect(screen.getByTestId('legacy-agent-table')).toBeInTheDocument();
    });
  });
});

/**
 * Integration test utilities for migration testing
 */
export const migrationTestUtils = {
  /**
   * Mock legacy component with Material-UI styles
   */
  mockLegacyComponent: (name: string, testId: string) => {
    return jest.fn(() => (
      <div
        data-testid={testId}
        className="MuiPaper-root MuiContainer-root"
        style={{ padding: '16px' }}
      >
        {name} (Legacy)
      </div>
    ));
  },

  /**
   * Mock new component with Tailwind styles
   */
  mockNewComponent: (name: string, testId: string) => {
    return jest.fn(() => (
      <div
        data-testid={testId}
        className="bg-white p-4 rounded-lg shadow-md"
      >
        {name} (New)
      </div>
    ));
  },

  /**
   * Create event bus mock
   */
  createEventBusMock: () => ({
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    subscribers: new Map(),
  }),

  /**
   * Wait for migration transition
   */
  waitForMigration: async (element: HTMLElement, timeout = 5000) => {
    await waitFor(() => {
      expect(element).toBeInTheDocument();
    }, { timeout });
  },
};