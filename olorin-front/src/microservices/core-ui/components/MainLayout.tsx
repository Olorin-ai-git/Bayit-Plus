import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
<<<<<<< HEAD
import { useEventBus } from '../../shared/services/EventBus';
=======
>>>>>>> 001-modify-analyzer-method
import {
  HomeIcon,
  CogIcon,
  ChartBarIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  BeakerIcon,
  EyeIcon,
  Bars3Icon,
  XMarkIcon,
  UserCircleIcon,
<<<<<<< HEAD
  ArrowRightOnRectangleIcon
=======
  ArrowRightOnRectangleIcon,
  ArrowsRightLeftIcon
>>>>>>> 001-modify-analyzer-method
} from '@heroicons/react/24/outline';

interface MainLayoutProps {
  children: React.ReactNode;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  description: string;
}

const navigation: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/',
    icon: HomeIcon,
    description: 'Overview and quick access'
  },
  {
<<<<<<< HEAD
    name: 'Autonomous Investigation',
    href: '/autonomous',
=======
    name: 'Structured Investigation',
    href: '/structured',
>>>>>>> 001-modify-analyzer-method
    icon: BeakerIcon,
    description: 'AI-powered investigations'
  },
  {
    name: 'Manual Investigation',
    href: '/manual',
    icon: MagnifyingGlassIcon,
    description: 'Expert-guided analysis'
  },
  {
    name: 'Agent Analytics',
    href: '/analytics',
    icon: ChartBarIcon,
    description: 'Performance metrics'
  },
  {
    name: 'RAG Intelligence',
    href: '/rag',
    icon: CogIcon,
    description: 'Knowledge retrieval'
  },
  {
    name: 'Visualization',
    href: '/visualization',
    icon: EyeIcon,
    description: 'Data visualization'
  },
  {
    name: 'Reporting',
    href: '/reporting',
    icon: DocumentTextIcon,
    description: 'Generate reports'
  },
<<<<<<< HEAD
=======
  {
    name: 'Comparison',
    href: '/compare',
    icon: ArrowsRightLeftIcon,
    description: 'Compare investigation results and prediction quality'
  },
>>>>>>> 001-modify-analyzer-method
];

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
<<<<<<< HEAD
  const eventBus = useEventBus();
=======
>>>>>>> 001-modify-analyzer-method

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const isActiveRoute = (href: string): boolean => {
    if (href === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };

  return (
<<<<<<< HEAD
    <div className="h-screen flex overflow-hidden bg-gray-100">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 flex z-40 md:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
          <div className="relative flex-1 flex flex-col max-w-xs w-full pt-5 pb-4 bg-white">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setSidebarOpen(false)}
              >
                <XMarkIcon className="h-6 w-6 text-white" />
              </button>
            </div>
            <div className="flex-shrink-0 flex items-center px-4">
              <h1 className="text-xl font-bold text-gray-900">Olorin</h1>
=======
    <div className="h-screen flex overflow-hidden bg-corporate-bgPrimary">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 flex z-40 md:hidden">
          <div className="fixed inset-0 bg-black bg-opacity-75" onClick={() => setSidebarOpen(false)} />
          <div className="relative flex-1 flex flex-col max-w-xs w-full pt-5 pb-4 bg-corporate-bgSecondary">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-corporate-accentPrimary transition-all duration-200 hover:bg-corporate-bgTertiary"
                onClick={() => setSidebarOpen(false)}
              >
                <XMarkIcon className="h-6 w-6 text-corporate-textPrimary" />
              </button>
            </div>
            <div className="flex-shrink-0 flex items-center px-4">
              <h1 className="text-xl font-bold text-corporate-accentPrimary">Olorin</h1>
>>>>>>> 001-modify-analyzer-method
            </div>
            <div className="mt-5 flex-1 h-0 overflow-y-auto">
              <nav className="px-2 space-y-1">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`${
                      isActiveRoute(item.href)
<<<<<<< HEAD
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    } group flex items-center px-2 py-2 text-sm font-medium rounded-md`}
=======
                        ? 'bg-corporate-accentPrimary/20 text-corporate-textPrimary border-l-4 border-corporate-accentPrimary'
                        : 'text-corporate-textSecondary hover:bg-corporate-bgTertiary hover:text-corporate-textPrimary'
                    } group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-all duration-200`}
>>>>>>> 001-modify-analyzer-method
                    onClick={() => setSidebarOpen(false)}
                  >
                    <item.icon
                      className={`${
<<<<<<< HEAD
                        isActiveRoute(item.href) ? 'text-gray-500' : 'text-gray-400 group-hover:text-gray-500'
                      } mr-3 flex-shrink-0 h-6 w-6`}
                    />
                    <div>
                      <div>{item.name}</div>
                      <div className="text-xs text-gray-500">{item.description}</div>
=======
                        isActiveRoute(item.href) ? 'text-corporate-accentPrimary' : 'text-corporate-textTertiary group-hover:text-corporate-accentPrimary'
                      } mr-3 flex-shrink-0 h-6 w-6 transition-colors duration-200`}
                    />
                    <div>
                      <div>{item.name}</div>
                      <div className="text-xs text-corporate-textTertiary">{item.description}</div>
>>>>>>> 001-modify-analyzer-method
                    </div>
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
<<<<<<< HEAD
          <div className="flex-1 flex flex-col min-h-0 border-r border-gray-200 bg-white">
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center flex-shrink-0 px-4">
                <h1 className="text-xl font-bold text-gray-900">Olorin</h1>
              </div>
              <nav className="mt-5 flex-1 px-2 bg-white space-y-1">
=======
          <div className="flex-1 flex flex-col min-h-0 border-r border-corporate-borderPrimary bg-corporate-bgSecondary">
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center flex-shrink-0 px-4">
                <h1 className="text-xl font-bold text-corporate-accentPrimary">Olorin</h1>
              </div>
              <nav className="mt-5 flex-1 px-2 space-y-1">
>>>>>>> 001-modify-analyzer-method
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`${
                      isActiveRoute(item.href)
<<<<<<< HEAD
                        ? 'bg-gray-100 text-gray-900 border-r-2 border-blue-500'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    } group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-150`}
                  >
                    <item.icon
                      className={`${
                        isActiveRoute(item.href) ? 'text-gray-500' : 'text-gray-400 group-hover:text-gray-500'
                      } mr-3 flex-shrink-0 h-6 w-6`}
                    />
                    <div>
                      <div>{item.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>
=======
                        ? 'bg-corporate-accentPrimary/20 text-corporate-textPrimary border-l-4 border-corporate-accentPrimary'
                        : 'text-corporate-textSecondary hover:bg-corporate-bgTertiary hover:text-corporate-textPrimary'
                    } group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-all duration-200`}
                  >
                    <item.icon
                      className={`${
                        isActiveRoute(item.href) ? 'text-corporate-accentPrimary' : 'text-corporate-textTertiary group-hover:text-corporate-accentPrimary'
                      } mr-3 flex-shrink-0 h-6 w-6 transition-colors duration-200`}
                    />
                    <div>
                      <div>{item.name}</div>
                      <div className="text-xs text-corporate-textTertiary mt-0.5">{item.description}</div>
>>>>>>> 001-modify-analyzer-method
                    </div>
                  </Link>
                ))}
              </nav>
            </div>

            {/* User section */}
<<<<<<< HEAD
            <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
              <div className="flex items-center w-full">
                <div className="flex-shrink-0">
                  <UserCircleIcon className="h-8 w-8 text-gray-400" />
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-gray-700">{user?.email}</p>
                  <p className="text-xs text-gray-500">Investigation Platform</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="ml-3 flex-shrink-0 p-1 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
=======
            <div className="flex-shrink-0 flex border-t border-corporate-borderPrimary p-4">
              <div className="flex items-center w-full">
                <div className="flex-shrink-0">
                  <UserCircleIcon className="h-8 w-8 text-corporate-textTertiary" />
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-corporate-textPrimary">{user?.email}</p>
                  <p className="text-xs text-corporate-textTertiary">Investigation Platform</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="ml-3 flex-shrink-0 p-1 text-corporate-textTertiary hover:text-corporate-accentPrimary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-corporate-accentPrimary transition-colors duration-200"
>>>>>>> 001-modify-analyzer-method
                  title="Sign out"
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        {/* Top bar */}
<<<<<<< HEAD
        <div className="relative z-10 flex-shrink-0 flex h-16 bg-white shadow">
          <button
            className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 md:hidden"
=======
        <div className="relative z-10 flex-shrink-0 flex h-16 bg-corporate-bgSecondary border-b border-corporate-borderPrimary shadow-lg">
          <button
            className="px-4 border-r border-corporate-borderPrimary text-corporate-textSecondary focus:outline-none focus:ring-2 focus:ring-inset focus:ring-corporate-accentPrimary md:hidden transition-colors duration-200 hover:text-corporate-textPrimary hover:bg-corporate-bgTertiary"
>>>>>>> 001-modify-analyzer-method
            onClick={() => setSidebarOpen(true)}
          >
            <Bars3Icon className="h-6 w-6" />
          </button>

          <div className="flex-1 px-4 flex justify-between items-center">
            <div className="flex-1 flex">
<<<<<<< HEAD
              <h2 className="text-lg font-medium text-gray-900">
=======
              <h2 className="text-lg font-medium text-corporate-textPrimary">
>>>>>>> 001-modify-analyzer-method
                {navigation.find(item => isActiveRoute(item.href))?.name || 'Dashboard'}
              </h2>
            </div>

            {/* Status indicators */}
            <div className="ml-4 flex items-center md:ml-6 space-x-3">
              <div className="flex items-center text-sm">
<<<<<<< HEAD
                <div className="h-2 w-2 bg-green-400 rounded-full mr-2"></div>
                <span className="text-gray-500">Backend Connected</span>
              </div>

              <div className="flex items-center text-sm">
                <div className="h-2 w-2 bg-blue-400 rounded-full mr-2"></div>
                <span className="text-gray-500">Real-time</span>
=======
                <div className="h-2 w-2 bg-corporate-success rounded-full mr-2 animate-pulse"></div>
                <span className="text-corporate-textSecondary">Backend Connected</span>
              </div>

              <div className="flex items-center text-sm">
                <div className="h-2 w-2 bg-corporate-info rounded-full mr-2 animate-pulse"></div>
                <span className="text-corporate-textSecondary">Real-time</span>
>>>>>>> 001-modify-analyzer-method
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
<<<<<<< HEAD
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
=======
        <main className="flex-1 relative overflow-y-auto focus:outline-none bg-corporate-bgPrimary">
>>>>>>> 001-modify-analyzer-method
          <div className="h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};