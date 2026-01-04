import React from 'react';
import { Brain, Settings, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Header: React.FC = () => {
  const navigate = useNavigate();

  return (
    <header className="bg-white border-b border-secondary-200 h-16">
      <div className="flex items-center justify-between px-6 h-full">
        {/* Logo and Title */}
        <div 
          className="flex items-center space-x-3 cursor-pointer"
          onClick={() => navigate('/autonomous-investigation')}
        >
          <Brain className="h-8 w-8 text-autonomous-600" />
          <div>
            <h1 className="text-lg font-semibold text-secondary-900">
              Autonomous Investigation
            </h1>
            <p className="text-xs text-secondary-500">
              Hybrid Graph Intelligence
            </p>
          </div>
        </div>

        {/* Status and Actions */}
        <div className="flex items-center space-x-4">
          {/* Investigation Status */}
          <div className="flex items-center space-x-2 text-sm">
            <div className="w-2 h-2 bg-autonomous-500 rounded-full animate-pulse" />
            <span className="text-secondary-600">System Active</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            <button className="btn-secondary p-2 rounded-md hover:bg-secondary-100">
              <Settings className="h-4 w-4" />
            </button>
            <button className="btn-secondary p-2 rounded-md hover:bg-secondary-100">
              <User className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
