import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { CoreUIApp } from '../CoreUIApp';

// Mock external dependencies
jest.mock('../components/AuthProvider', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="auth-provider">{children}</div>,
}));

jest.mock('../../shared/services/EventBus', () => ({
  EventBusProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="eventbus-provider">{children}</div>,
}));

jest.mock('../../shared/services/WebSocketService', () => ({
  WebSocketProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="websocket-provider">{children}</div>,
}));

jest.mock('../components/MainLayout', () => ({
  MainLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="main-layout">{children}</div>,
}));

jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    isLoading: false,
    user: { email: 'test@example.com' },
    login: jest.fn(),
    logout: jest.fn(),
  }),
}));

// Mock lazy-loaded components
jest.mock('autonomous-investigation/App', () => ({
  __esModule: true,
  default: () => <div data-testid="autonomous-investigation">Autonomous Investigation App</div>,
}));

jest.mock('manual-investigation/App', () => ({
  __esModule: true,
  default: () => <div data-testid="manual-investigation">Manual Investigation App</div>,
}));

jest.mock('agent-analytics/App', () => ({
  __esModule: true,
  default: () => <div data-testid="agent-analytics">Agent Analytics App</div>,
}));

jest.mock('rag-intelligence/App', () => ({
  __esModule: true,
  default: () => <div data-testid="rag-intelligence">RAG Intelligence App</div>,
}));

jest.mock('visualization/App', () => ({
  __esModule: true,
  default: () => <div data-testid="visualization">Visualization App</div>,
}));

jest.mock('reporting/App', () => ({
  __esModule: true,
  default: () => <div data-testid="reporting">Reporting App</div>,
}));

describe('CoreUIApp', () => {
  const renderWithRouter = (initialEntries = ['/']) => {
    return render(
      <MemoryRouter initialEntries={initialEntries}>
        <CoreUIApp />
      </MemoryRouter>
    );
  };

  it('renders without crashing', () => {
    renderWithRouter();
    expect(screen.getByTestId('auth-provider')).toBeInTheDocument();
    expect(screen.getByTestId('eventbus-provider')).toBeInTheDocument();
    expect(screen.getByTestId('websocket-provider')).toBeInTheDocument();
  });

  it('displays dashboard on root route', async () => {
    renderWithRouter(['/']);

    await waitFor(() => {
      expect(screen.getByText('Olorin Investigation Platform')).toBeInTheDocument();
      expect(screen.getByText('AI-powered fraud detection and investigation platform')).toBeInTheDocument();
    });
  });

  it('displays service cards on dashboard', async () => {
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

  it('renders main layout for authenticated routes', async () => {
    renderWithRouter(['/']);

    await waitFor(() => {
      expect(screen.getByTestId('main-layout')).toBeInTheDocument();
    });
  });

  it('provides all necessary context providers', () => {
    renderWithRouter();

    expect(screen.getByTestId('auth-provider')).toBeInTheDocument();
    expect(screen.getByTestId('eventbus-provider')).toBeInTheDocument();
    expect(screen.getByTestId('websocket-provider')).toBeInTheDocument();
  });

  it('has proper component hierarchy', () => {
    renderWithRouter();

    const authProvider = screen.getByTestId('auth-provider');
    const eventBusProvider = screen.getByTestId('eventbus-provider');
    const webSocketProvider = screen.getByTestId('websocket-provider');

    expect(authProvider).toContainElement(eventBusProvider);
    expect(eventBusProvider).toContainElement(webSocketProvider);
  });
});