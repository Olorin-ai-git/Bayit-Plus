import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Zap, 
  Command, 
  Route, 
  Network, 
  Home,
  ChevronRight
} from 'lucide-react';

interface NavigationItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const navigationItems: NavigationItem[] = [
  {
    path: '/',
    label: 'Overview',
    icon: Home,
    description: 'Investigation dashboard'
  },
  {
    path: '/power-grid',
    label: 'Power Grid',
    icon: Zap,
    description: 'Energy-based visualization'
  },
  {
    path: '/command-center',
    label: 'Command Center',
    icon: Command,
    description: 'Control and monitoring'
  },
  {
    path: '/evidence-trail',
    label: 'Evidence Trail',
    icon: Route,
    description: 'Temporal evidence flow'
  },
  {
    path: '/network-explorer',
    label: 'Network Explorer',
    icon: Network,
    description: 'Interactive graph navigation'
  }
];

export const Navigation: React.FC = () => {
  return (
    <nav className="p-4">
      <div className="space-y-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `
                flex items-center justify-between p-3 rounded-lg 
                transition-all duration-200 group
                ${
                  isActive
                    ? 'bg-autonomous-50 text-autonomous-700 border border-autonomous-200'
                    : 'hover:bg-secondary-50 text-secondary-700 hover:text-secondary-900'
                }
              `}
            >
              <div className="flex items-center space-x-3">
                <Icon className="h-5 w-5" />
                <div>
                  <div className="font-medium text-sm">{item.label}</div>
                  <div className="text-xs text-secondary-500 group-hover:text-secondary-600">
                    {item.description}
                  </div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </NavLink>
          );
        })}
      </div>
      
      {/* Quick Stats */}
      <div className="mt-8 p-4 bg-secondary-50 rounded-lg">
        <h3 className="text-sm font-medium text-secondary-900 mb-3">
          Investigation Status
        </h3>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-secondary-600">Active Nodes:</span>
            <span className="font-medium text-secondary-900">0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-secondary-600">Evidence Items:</span>
            <span className="font-medium text-secondary-900">0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-secondary-600">Connections:</span>
            <span className="font-medium text-secondary-900">0</span>
          </div>
        </div>
      </div>
    </nav>
  );
};
