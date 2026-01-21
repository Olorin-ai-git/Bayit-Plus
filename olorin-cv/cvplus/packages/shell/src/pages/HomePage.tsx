import React from 'react';
import { useAuth } from '@cvplus/auth';
import { Link } from 'react-router-dom';

/**
 * HomePage component - Landing dashboard for the CVPlus application
 *
 * Features:
 * - Welcome message and user greeting
 * - Quick action buttons for main features
 * - Recent activity summary
 * - Feature overview for new users
 */
const HomePage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          {isAuthenticated && user ? (
            <>Welcome back, {user.displayName || 'Professional'}!</>
          ) : (
            <>Transform your CV from Paper to Powerful</>
          )}
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          CVPlus uses AI to enhance your CV with multimedia content, personality insights,
          and professional recommendations that make you stand out.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <Link
          to="/cv-processing"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-200"
        >
          <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-4">
            <span className="text-2xl">📄</span>
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Process CV</h3>
          <p className="text-gray-600 text-sm">Upload and enhance your CV with AI analysis</p>
        </Link>

        <Link
          to="/multimedia"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-200"
        >
          <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mb-4">
            <span className="text-2xl">🎬</span>
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Create Media</h3>
          <p className="text-gray-600 text-sm">Generate podcasts and video introductions</p>
        </Link>

        <Link
          to="/profiles"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-200"
        >
          <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mb-4">
            <span className="text-2xl">👤</span>
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Public Profile</h3>
          <p className="text-gray-600 text-sm">Create shareable professional profiles</p>
        </Link>

        <Link
          to="/analytics"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-200"
        >
          <div className="flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-lg mb-4">
            <span className="text-2xl">📊</span>
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Analytics</h3>
          <p className="text-gray-600 text-sm">Track engagement and profile performance</p>
        </Link>
      </div>

      {/* Features Overview */}
      <div className="bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Why Choose CVPlus?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🤖</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">AI-Powered Analysis</h3>
            <p className="text-gray-600">
              Advanced AI analyzes your CV for ATS compatibility, skills gaps, and improvement opportunities.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🎵</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Multimedia Content</h3>
            <p className="text-gray-600">
              Generate professional podcasts and video introductions that showcase your personality.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📈</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Performance Insights</h3>
            <p className="text-gray-600">
              Track how your profile performs and get data-driven recommendations for improvement.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;