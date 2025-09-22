import React, { useState, useEffect } from 'react';
import { BrowserRouter, Link, useLocation, Routes, Route } from 'react-router-dom';
import ErrorBoundary from '@shared/components/ErrorBoundary';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import { EventBusManager, eventBus } from '@shared/events/eventBus';
import RemoteInvestigationService from './components/RemoteInvestigationService';
import './globals';

interface ShellState {
  isInitialized: boolean;
  error: string | null;
  servicesStatus: Record<string, 'ready' | 'loading' | 'error'>;
}

interface ServiceLink {
  name: string;
  path: string;
  icon: string;
  description: string;
  status: 'ready' | 'loading' | 'error';
  color: string;
  bgGradient: string;
}

const serviceLinks: ServiceLink[] = [
  {
    name: 'Investigations',
    path: '/investigations',
    icon: '🔍',
    description: 'AI-powered fraud investigation workflows',
    status: 'ready',
    color: 'from-blue-600 to-indigo-700',
    bgGradient: 'from-blue-50 to-indigo-100'
  },
  {
    name: 'Analytics',
    path: '/analytics',
    icon: '📊',
    description: 'Real-time agent performance insights',
    status: 'ready',
    color: 'from-purple-600 to-violet-700',
    bgGradient: 'from-purple-50 to-violet-100'
  },
  {
    name: 'Knowledge Base',
    path: '/rag',
    icon: '🧠',
    description: 'Intelligent document retrieval system',
    status: 'ready',
    color: 'from-emerald-600 to-teal-700',
    bgGradient: 'from-emerald-50 to-teal-100'
  },
  {
    name: 'Visualization',
    path: '/visualization',
    icon: '📈',
    description: 'Interactive data visualization tools',
    status: 'ready',
    color: 'from-orange-600 to-red-700',
    bgGradient: 'from-orange-50 to-red-100'
  },
  {
    name: 'Reports',
    path: '/reports',
    icon: '📄',
    description: 'Automated report generation',
    status: 'ready',
    color: 'from-cyan-600 to-blue-700',
    bgGradient: 'from-cyan-50 to-blue-100'
  },
  {
    name: 'Status',
    path: '/status',
    icon: '⚡',
    description: 'System health & monitoring',
    status: 'ready',
    color: 'from-green-600 to-emerald-700',
    bgGradient: 'from-green-50 to-emerald-100'
  }
];

const NavigationHeader: React.FC = () => {
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-gray-200/50 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-18">
          <div className="flex items-center space-x-4">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="relative">
                <img
                  src="/assets/images/Olorin-Logo-With-Text-transparent.png"
                  alt="Olorin Logo"
                  className="h-12 w-auto transition-all duration-200 group-hover:scale-105 filter drop-shadow-lg group-hover:drop-shadow-xl"
                />
                <div className="absolute -inset-1 bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-indigo-700/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 blur-sm"></div>
              </div>
            </Link>

            <div className="hidden sm:flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <div className="px-3 py-1.5 bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 text-xs font-semibold rounded-full flex items-center space-x-2 border border-green-200">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>System Live</span>
                </div>
                <div className="px-3 py-1.5 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 text-xs font-semibold rounded-full border border-blue-200">
                  v1.0.0
                </div>
                <div className="px-3 py-1.5 bg-gradient-to-r from-purple-100 to-violet-100 text-purple-800 text-xs font-semibold rounded-full border border-purple-200 flex items-center space-x-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>AI Ready</span>
                </div>
              </div>
            </div>
          </div>

          {!isHomePage && (
            <nav className="hidden lg:flex items-center space-x-1">
              {serviceLinks.slice(0, 5).map((service) => {
                const isActive = location.pathname.startsWith(service.path);
                return (
                  <Link
                    key={service.name}
                    to={service.path}
                    className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      isActive
                        ? `bg-gradient-to-r ${service.bgGradient} ${service.color.replace('from-', 'text-').replace(' to-', '').split('-')[0]}-700 border border-blue-200 shadow-sm`
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50/80 hover:scale-105'
                    }`}
                  >
                    <span className="mr-2">{service.icon}</span>
                    {service.name}
                  </Link>
                );
              })}
            </nav>
          )}

          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-gradient-to-r from-gray-50 to-gray-100 rounded-full border border-gray-200">
                <div className="flex items-center space-x-1 text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="font-semibold">Event Bus</span>
                </div>
                <div className="text-gray-400">•</div>
                <div className="text-gray-600 font-medium">
                  {process.env.NODE_ENV}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                className="p-2.5 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100/80 transition-all duration-200 hover:scale-105"
                title="Settings"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                </svg>
              </button>

              {!isHomePage && (
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="lg:hidden p-2.5 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100/80 transition-all duration-200"
                  aria-label="Toggle mobile menu"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {!isHomePage && isMobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200/50 bg-white/95 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
              <div className="grid grid-cols-1 gap-3">
                {serviceLinks.slice(0, 5).map((service) => {
                  const isActive = location.pathname.startsWith(service.path);
                  return (
                    <Link
                      key={service.name}
                      to={service.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                        isActive
                          ? `bg-gradient-to-r ${service.bgGradient} ${service.color.replace('from-', 'text-').replace(' to-', '').split('-')[0]}-700 border border-blue-200 shadow-sm`
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50/80'
                      }`}
                    >
                      <span className="mr-3 text-lg">{service.icon}</span>
                      <div>
                        <div>{service.name}</div>
                        <div className="text-xs opacity-75">{service.description}</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

const ShellHomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-purple-600/5 to-indigo-600/5"></div>
        <div className="relative max-w-7xl mx-auto pt-16 pb-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 rounded-full text-sm font-medium mb-6">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
              All Systems Operational
            </div>

            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent mb-6">
              Olorin Platform
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-4 max-w-3xl mx-auto leading-relaxed">
              AI-Powered Fraud Detection & Investigation
            </p>
            <p className="text-lg text-gray-500 mb-12 max-w-2xl mx-auto">
              Advanced microservices architecture with real-time analytics, intelligent automation, and comprehensive reporting
            </p>
          </div>
        </div>
      </div>

      {/* Services Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {serviceLinks.map((service, index) => (
            <Link
              key={service.name}
              to={service.path}
              className={`group relative bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 p-8 border border-gray-100 hover:border-gray-200 transform hover:-translate-y-1`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Background Gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${service.bgGradient} rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>

              {/* Content */}
              <div className="relative">
                <div className="flex items-start justify-between mb-6">
                  <div className={`w-16 h-16 bg-gradient-to-br ${service.color} rounded-2xl flex items-center justify-center text-2xl shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110`}>
                    {service.icon}
                  </div>
                  <div className={`w-3 h-3 rounded-full ${
                    service.status === 'ready' ? 'bg-green-500' :
                    service.status === 'loading' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}></div>
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-gray-800 transition-colors">
                  {service.name}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed mb-4">
                  {service.description}
                </p>

                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium text-gray-500">
                    {service.status === 'ready' ? 'Ready' :
                     service.status === 'loading' ? 'Starting...' : 'Offline'}
                  </div>
                  <div className="text-blue-600 group-hover:text-blue-700 transition-colors">
                    <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* System Metrics */}
        <div className="mt-16 bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">System Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { label: 'Active Services', value: '6', color: 'text-green-600', bg: 'bg-green-50' },
              { label: 'Uptime', value: '99.9%', color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Response Time', value: '<50ms', color: 'text-purple-600', bg: 'bg-purple-50' },
              { label: 'Events/sec', value: '1.2k', color: 'text-orange-600', bg: 'bg-orange-50' }
            ].map((metric) => (
              <div key={metric.label} className="text-center">
                <div className={`w-16 h-16 ${metric.bg} rounded-2xl flex items-center justify-center mx-auto mb-3`}>
                  <div className={`text-2xl font-bold ${metric.color}`}>
                    {metric.value}
                  </div>
                </div>
                <div className="text-sm font-medium text-gray-600">{metric.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const ServicePlaceholder: React.FC<{
  title: string;
  description: string;
  icon: string;
  gradient: string;
}> = ({ title, description, icon, gradient }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <div className={`w-24 h-24 bg-gradient-to-br ${gradient} rounded-3xl flex items-center justify-center text-4xl mx-auto mb-6 shadow-xl`}>
            {icon}
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{title}</h1>
          <p className="text-xl text-gray-600 mb-8">{description}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 8.172V5L8 4z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Service Under Development</h3>
            <p className="text-gray-600 mb-6">This microservice is being built with the latest fraud detection technologies.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="font-medium text-gray-900 mb-1">AI Integration</div>
                <div className="text-sm text-gray-600">Advanced machine learning models</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="font-medium text-gray-900 mb-1">Real-time Processing</div>
                <div className="text-sm text-gray-600">Live data analysis & alerts</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="font-medium text-gray-900 mb-1">Secure Architecture</div>
                <div className="text-sm text-gray-600">Enterprise-grade security</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [shellState, setShellState] = useState<ShellState>({
    isInitialized: false,
    error: null,
    servicesStatus: {}
  });

  useEffect(() => {
    initializeShell();
  }, []);

  const initializeShell = async () => {
    try {
      console.log('[Shell] Starting shell initialization...');

      const eventBusManager = new EventBusManager();
      window.olorin.eventBus = eventBus;
      window.olorin.eventBusManager = eventBusManager;

      console.log('[Shell] Event bus initialized');

      const servicesStatus = serviceLinks.reduce((acc, service) => {
        acc[service.name.toLowerCase()] = 'ready';
        return acc;
      }, {} as Record<string, 'ready' | 'loading' | 'error'>);

      setShellState({
        isInitialized: true,
        error: null,
        servicesStatus
      });

      console.log('[Shell] Shell initialization complete');
    } catch (error) {
      console.error('[Shell] Shell initialization failed:', error);
      setShellState({
        isInitialized: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        servicesStatus: {}
      });
    }
  };

  if (!shellState.isInitialized && !shellState.error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative mx-auto mb-6">
            <img
              src="/assets/images/Olorin-Logo-With-Text-transparent.png"
              alt="Olorin Logo"
              className="h-20 w-auto animate-pulse filter drop-shadow-xl"
            />
            <div className="absolute -inset-2 bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-indigo-700/20 rounded-xl opacity-50 animate-pulse blur-lg"></div>
          </div>
          <LoadingSpinner size="lg" />
          <h2 className="mt-6 text-2xl font-bold text-gray-900">
            Initializing Olorin Platform
          </h2>
          <p className="mt-2 text-gray-600">
            Setting up AI-powered fraud detection services...
          </p>
        </div>
      </div>
    );
  }

  if (shellState.error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white shadow-xl rounded-2xl p-8 border border-red-100">
          <div className="flex items-center justify-center w-16 h-16 mx-auto bg-red-100 rounded-2xl mb-6">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-4">
            Platform Error
          </h1>
          <p className="text-gray-600 text-center mb-6">
            {shellState.error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-gradient-to-r from-red-600 to-pink-600 text-white px-6 py-3 rounded-xl hover:from-red-700 hover:to-pink-700 transition-all duration-200 font-medium"
          >
            Restart Platform
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary serviceName="shell">
      <BrowserRouter>
        <div className="shell-application min-h-screen bg-gray-50">
          <NavigationHeader />

          <main>
            <Routes>
              <Route path="/" element={<ShellHomePage />} />
              <Route path="/investigations/*" element={<RemoteInvestigationService />} />
              <Route path="/analytics" element={
                <ServicePlaceholder
                  title="Analytics Service"
                  description="Real-time agent performance insights and system metrics"
                  icon="📊"
                  gradient="from-purple-600 to-violet-700"
                />
              } />
              <Route path="/rag" element={
                <ServicePlaceholder
                  title="Knowledge Base"
                  description="Intelligent document retrieval and RAG intelligence system"
                  icon="🧠"
                  gradient="from-emerald-600 to-teal-700"
                />
              } />
              <Route path="/visualization" element={
                <ServicePlaceholder
                  title="Visualization Service"
                  description="Interactive data visualization and network analysis tools"
                  icon="📈"
                  gradient="from-orange-600 to-red-700"
                />
              } />
              <Route path="/reports" element={
                <ServicePlaceholder
                  title="Reporting Service"
                  description="Automated report generation and export capabilities"
                  icon="📄"
                  gradient="from-cyan-600 to-blue-700"
                />
              } />
              <Route path="/status" element={
                <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 py-12">
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                      <div className="w-24 h-24 bg-gradient-to-br from-green-600 to-emerald-700 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-6 shadow-xl">
                        ⚡
                      </div>
                      <h1 className="text-4xl font-bold text-gray-900 mb-4">System Status</h1>
                      <p className="text-xl text-gray-600">Real-time monitoring of all platform services</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {serviceLinks.map((service) => (
                        <div key={service.name} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-3">
                              <div className={`w-12 h-12 bg-gradient-to-br ${service.color} rounded-xl flex items-center justify-center text-xl`}>
                                {service.icon}
                              </div>
                              <div>
                                <h3 className="font-bold text-gray-900">{service.name}</h3>
                                <p className="text-sm text-gray-500">{service.description}</p>
                              </div>
                            </div>
                            <div className={`w-4 h-4 rounded-full ${
                              service.status === 'ready' ? 'bg-green-500' :
                              service.status === 'loading' ? 'bg-yellow-500' : 'bg-red-500'
                            }`}></div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Status</span>
                              <span className={`font-medium ${
                                service.status === 'ready' ? 'text-green-600' :
                                service.status === 'loading' ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {service.status === 'ready' ? 'Operational' :
                                 service.status === 'loading' ? 'Starting' : 'Offline'}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Response Time</span>
                              <span className="text-gray-900 font-medium">&lt;50ms</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Uptime</span>
                              <span className="text-gray-900 font-medium">99.9%</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              } />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;