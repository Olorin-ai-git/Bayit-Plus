/**
 * Service Data Constants
 *
 * Service links and system metrics for Shell App.
 * Extracted from App.tsx to maintain < 200 line limit.
 */

export interface ServiceLink {
  name: string;
  path: string;
  icon: string;
  description: string;
  status: 'ready' | 'loading' | 'error';
  color: string;
  bgGradient: string;
}

export const serviceLinks: ServiceLink[] = [
  {
    name: 'New Investigation',
    path: '/investigation/settings',
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
  },
  {
    name: 'Investigations Management',
    path: '/investigations-management',
    icon: '📋',
    description: 'Manage, view, and monitor fraud investigations',
    status: 'ready',
    color: 'from-purple-600 to-violet-700',
    bgGradient: 'from-purple-50 to-violet-100'
  },
  {
    name: 'Comparison',
    path: '/compare',
    icon: '⚖️',
    description: 'Compare investigation results and prediction quality',
    status: 'ready',
    color: 'from-amber-600 to-orange-700',
    bgGradient: 'from-amber-50 to-orange-100'
  },
  {
    name: 'Parallel Investigations',
    path: '/parallel',
    icon: '⚡',
    description: 'Track parallel automated investigations',
    status: 'ready',
    color: 'from-pink-600 to-rose-700',
    bgGradient: 'from-pink-50 to-rose-100'
  },
  {
    name: 'Financial Analysis',
    path: '/financial-analysis',
    icon: '💰',
    description: 'Revenue impact and financial metrics dashboard',
    status: 'ready',
    color: 'from-emerald-600 to-green-700',
    bgGradient: 'from-emerald-50 to-green-100'
  }
];

export interface SystemMetric {
  label: string;
  value: string;
  icon: string;
  color: 'text-corporate-success' | 'text-corporate-info' | 'text-corporate-accentSecondary' | 'text-corporate-warning';
  borderColor: 'border-corporate-success' | 'border-corporate-info' | 'border-corporate-accentSecondary' | 'border-corporate-warning';
  description: string;
}

export const systemMetrics: SystemMetric[] = [
  {
    label: 'Active Services',
    value: '6',
    icon: '✓',
    color: 'text-corporate-success',
    borderColor: 'border-corporate-success',
    description: 'All core services operational'
  },
  {
    label: 'Uptime',
    value: '99.9%',
    icon: '⏱',
    color: 'text-corporate-info',
    borderColor: 'border-corporate-info',
    description: 'System availability'
  },
  {
    label: 'Response Time',
    value: '<50ms',
    icon: '⚡',
    color: 'text-corporate-accentSecondary',
    borderColor: 'border-corporate-accentSecondary',
    description: 'Average API latency'
  },
  {
    label: 'Events/sec',
    value: '1.2k',
    icon: '📊',
    color: 'text-corporate-warning',
    borderColor: 'border-corporate-warning',
    description: 'Real-time event processing'
  }
];
