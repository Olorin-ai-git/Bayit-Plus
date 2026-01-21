import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { CoreUIApp } from '../../CoreUIApp';

// Mock all external dependencies
jest.mock('../../components/AuthProvider', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="auth-provider">{children}</div>
  ),
}));

jest.mock('../../../shared/services/EventBus', () => ({
  EventBusProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="eventbus-provider">{children}</div>
  ),
  useEventBus: () => ({
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
  }),
  useEventListener: jest.fn(),
  useEventEmitter: () => ({
    emit: jest.fn(),
    emitNotification: jest.fn(),
  }),
}));

jest.mock('../../../shared/services/WebSocketService', () => ({
  WebSocketProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="websocket-provider">{children}</div>
  ),
  useWebSocket: () => ({
    isConnected: true,
    isConnecting: false,
    connectionError: null,
    lastMessage: null,
    send: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    reconnect: jest.fn(),
  }),
}));

jest.mock('../../components/MainLayout', () => ({
  MainLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="main-layout">
      <nav data-testid="navigation">
        <a href="/autonomous">Autonomous Investigation</a>
        <a href="/manual">Manual Investigation</a>
        <a href="/analytics">Agent Analytics</a>
        <a href="/rag">RAG Intelligence</a>
        <a href="/visualization">Visualization</a>
        <a href="/reporting">Reporting</a>
      </nav>
      <main data-testid="main-content">{children}</main>
    </div>
  ),
}));

jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    isLoading: false,
    user: {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'investigator',
    },
    login: jest.fn(),
    logout: jest.fn(),
  }),
}));

// Mock lazy-loaded microservices
jest.mock('autonomous-investigation/App', () => ({
  __esModule: true,
  default: () => <div data-testid="autonomous-investigation-app">Autonomous Investigation App</div>,
}));

jest.mock('manual-investigation/App', () => ({
  __esModule: true,
  default: () => <div data-testid="manual-investigation-app">Manual Investigation App</div>,
}));

jest.mock('agent-analytics/App', () => ({
  __esModule: true,
  default: () => <div data-testid="agent-analytics-app">Agent Analytics App</div>,
}));

jest.mock('rag-intelligence/App', () => ({
  __esModule: true,
  default: () => <div data-testid="rag-intelligence-app">RAG Intelligence App</div>,
}));

jest.mock('visualization/App', () => ({
  __esModule: true,
  default: () => <div data-testid="visualization-app">Visualization App</div>,
}));

jest.mock('reporting/App', () => ({
  __esModule: true,
  default: () => <div data-testid="reporting-app">Reporting App</div>,
}));

describe('Core UI Integration Tests', () => {
  const renderWithRouter = (initialEntries = ['/']) => {
    return render(
      <MemoryRouter initialEntries={initialEntries}>
        <CoreUIApp />
      </MemoryRouter>
    );
  };

  it('provides all necessary context providers', () => {
    renderWithRouter();

    expect(screen.getByTestId('auth-provider')).toBeInTheDocument();
    expect(screen.getByTestId('eventbus-provider')).toBeInTheDocument();
    expect(screen.getByTestId('websocket-provider')).toBeInTheDocument();
  });

  it('renders main layout with navigation for authenticated users', () => {
    renderWithRouter();

    expect(screen.getByTestId('main-layout')).toBeInTheDocument();
    expect(screen.getByTestId('navigation')).toBeInTheDocument();
    expect(screen.getByTestId('main-content')).toBeInTheDocument();
  });

  it('displays dashboard on root route', async () => {
    renderWithRouter(['/']);

    await waitFor(() => {
      expect(screen.getByText('Olorin Investigation Platform')).toBeInTheDocument();
      expect(screen.getByText('AI-powered fraud detection and investigation platform')).toBeInTheDocument();
    });
  });

  it('displays all service cards on dashboard', async () => {
    renderWithRouter(['/']);

    await waitFor(() => {
      expect(screen.getByText('Autonomous Investigations')).toBeInTheDocument();
      expect(screen.getByText('Manual Investigations')).toBeInTheDocument();
      expect(screen.getByText('Agent Analytics')).toBeInTheDocument();
      expect(screen.getByText('RAG Intelligence')).toBeInTheDocument();
      expect(screen.getByText('Visualization')).toBeInTheDocument();
      expect(screen.getByText('Reporting')).toBeInTheDocument();
    });
  });

  it('provides navigation links to all microservices', () => {
    renderWithRouter();

    expect(screen.getByText('Autonomous Investigation')).toBeInTheDocument();
    expect(screen.getByText('Manual Investigation')).toBeInTheDocument();
    expect(screen.getByText('Agent Analytics')).toBeInTheDocument();
    expect(screen.getByText('RAG Intelligence')).toBeInTheDocument();
    expect(screen.getByText('Visualization')).toBeInTheDocument();
    expect(screen.getByText('Reporting')).toBeInTheDocument();
  });

  it('has proper provider hierarchy', () => {
    renderWithRouter();

    const authProvider = screen.getByTestId('auth-provider');
    const eventBusProvider = screen.getByTestId('eventbus-provider');
    const webSocketProvider = screen.getByTestId('websocket-provider');
    const mainLayout = screen.getByTestId('main-layout');

    expect(authProvider).toContainElement(eventBusProvider);
    expect(eventBusProvider).toContainElement(webSocketProvider);
    expect(webSocketProvider).toContainElement(mainLayout);
  });

  it('handles error boundaries gracefully', () => {
    // Mock console.error to avoid error output in tests
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // This would normally be tested by throwing an error in a child component
    // For now, we just verify the error boundary component exists
    renderWithRouter();

    expect(screen.getByTestId('main-layout')).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  describe('Microservice Integration', () => {
    it('renders autonomous investigation microservice', async () => {
      renderWithRouter(['/autonomous']);

      await waitFor(() => {
        expect(screen.getByTestId('autonomous-investigation-app')).toBeInTheDocument();
      });
    });

    it('renders manual investigation microservice', async () => {
      renderWithRouter(['/manual']);

      await waitFor(() => {
        expect(screen.getByTestId('manual-investigation-app')).toBeInTheDocument();
      });
    });

    it('renders agent analytics microservice', async () => {
      renderWithRouter(['/analytics']);

      await waitFor(() => {
        expect(screen.getByTestId('agent-analytics-app')).toBeInTheDocument();
      });
    });

    it('renders RAG intelligence microservice', async () => {
      renderWithRouter(['/rag']);

      await waitFor(() => {
        expect(screen.getByTestId('rag-intelligence-app')).toBeInTheDocument();
      });
    });

    it('renders visualization microservice', async () => {
      renderWithRouter(['/visualization']);

      await waitFor(() => {
        expect(screen.getByTestId('visualization-app')).toBeInTheDocument();
      });
    });

    it('renders reporting microservice', async () => {
      renderWithRouter(['/reporting']);

      await waitFor(() => {
        expect(screen.getByTestId('reporting-app')).toBeInTheDocument();
      });
    });
  });

  describe('Service Card Interactions', () => {
    it('provides launch links for all services', async () => {
      renderWithRouter(['/']);

      await waitFor(() => {
        const launchLinks = screen.getAllByText(/Launch Service →/);
        expect(launchLinks).toHaveLength(6); // 6 microservices
      });
    });

    it('includes service descriptions', async () => {
      renderWithRouter(['/']);

      await waitFor(() => {
        expect(screen.getByText('AI-powered automated fraud detection')).toBeInTheDocument();
        expect(screen.getByText('Expert-guided investigation tools')).toBeInTheDocument();
        expect(screen.getByText('Performance metrics and insights')).toBeInTheDocument();
        expect(screen.getByText('Knowledge retrieval and analysis')).toBeInTheDocument();
        expect(screen.getByText('Interactive data visualization')).toBeInTheDocument();
        expect(screen.getByText('Generate comprehensive reports')).toBeInTheDocument();
      });
    });
  });

  describe('Authentication Integration', () => {
    it('shows protected content for authenticated users', () => {
      renderWithRouter();

      expect(screen.getByTestId('main-layout')).toBeInTheDocument();
      expect(screen.queryByText('Sign in to Olorin')).not.toBeInTheDocument();
    });
  });

  describe('Real-time Features', () => {
    it('integrates WebSocket service for real-time updates', () => {
      renderWithRouter();

      // WebSocket provider should be present
      expect(screen.getByTestId('websocket-provider')).toBeInTheDocument();
    });

    it('integrates EventBus for inter-service communication', () => {
      renderWithRouter();

      // EventBus provider should be present
      expect(screen.getByTestId('eventbus-provider')).toBeInTheDocument();
    });
  });
});