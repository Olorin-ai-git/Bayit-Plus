import React, { useState } from 'react';
import './styles/tailwind.css';

// Power Grid Interface Component
const PowerGridInterface: React.FC = () => {
  const [gridStability, setGridStability] = useState(92);
  const [energyFlow, setEnergyFlow] = useState(2.4);
  const [activeNodes, setActiveNodes] = useState(85);

  return (
    <div className="p-6 space-y-6 bg-gray-900 min-h-screen">
      {/* Grid Metrics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 shadow-xl border border-gray-700 hover:border-green-400/60 hover:shadow-green-400/20 transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 uppercase tracking-wider font-medium">Grid Stability</p>
              <p className="text-3xl font-bold text-green-400 group-hover:text-green-300 transition-colors">{gridStability}%</p>
            </div>
            <div className="w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center text-2xl group-hover:bg-green-400/30 transition-all duration-300">
              <span className="text-green-400 group-hover:scale-110 transition-transform">⚡</span>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 shadow-xl border border-gray-700 hover:border-blue-400/60 hover:shadow-blue-400/20 transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 uppercase tracking-wider font-medium">Energy Flow</p>
              <p className="text-3xl font-bold text-blue-400 group-hover:text-blue-300 transition-colors">{energyFlow} GW</p>
            </div>
            <div className="w-14 h-14 bg-blue-500/20 rounded-full flex items-center justify-center text-2xl group-hover:bg-blue-400/30 transition-all duration-300">
              <span className="text-blue-400 group-hover:scale-110 transition-transform">🔋</span>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 shadow-xl border border-gray-700 hover:border-purple-400/60 hover:shadow-purple-400/20 transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 uppercase tracking-wider font-medium">Active Nodes</p>
              <p className="text-3xl font-bold text-purple-400 group-hover:text-purple-300 transition-colors">{activeNodes}</p>
            </div>
            <div className="w-14 h-14 bg-purple-500/20 rounded-full flex items-center justify-center text-2xl group-hover:bg-purple-400/30 transition-all duration-300">
              <span className="text-purple-400 group-hover:scale-110 transition-transform">🔗</span>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 shadow-xl border border-gray-700 hover:border-orange-400/60 hover:shadow-orange-400/20 transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 uppercase tracking-wider font-medium">Peak Load</p>
              <p className="text-3xl font-bold text-orange-400 group-hover:text-orange-300 transition-colors">78%</p>
            </div>
            <div className="w-14 h-14 bg-orange-500/20 rounded-full flex items-center justify-center text-2xl group-hover:bg-orange-400/30 transition-all duration-300">
              <span className="text-orange-400 group-hover:scale-110 transition-transform">📊</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid Visualization */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 shadow-xl border border-gray-700">
        <h2 className="text-xl font-semibold mb-6 text-gray-100 flex items-center">
          <span className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center mr-3">
            <span className="text-blue-400">⚡</span>
          </span>
          Energy Flow Visualization
        </h2>
        <div className="h-96 bg-gradient-to-br from-gray-900 to-black rounded-xl flex items-center justify-center border-2 border-dashed border-gray-600 hover:border-blue-500/50 transition-all duration-300">
          <div className="text-center">
            <div className="flex justify-center space-x-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-2xl animate-pulse shadow-lg shadow-yellow-400/30">⚡</div>
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-2xl animate-pulse shadow-lg shadow-blue-400/30" style={{animationDelay: '0.5s'}}>🔋</div>
              <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center text-2xl animate-pulse shadow-lg shadow-green-400/30" style={{animationDelay: '1s'}}>⚡</div>
            </div>
            <p className="text-gray-200 font-semibold text-lg">Interactive Energy Grid</p>
            <p className="text-sm text-gray-400 mt-2">Real-time power flow visualization</p>
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 shadow-xl border border-gray-700">
          <h3 className="text-lg font-semibold mb-6 text-gray-100 flex items-center">
            <span className="w-6 h-6 bg-emerald-500/20 rounded flex items-center justify-center mr-3">
              <span className="text-emerald-400 text-sm">⚙️</span>
            </span>
            Grid Controls
          </h3>
          <div className="space-y-4">
            <button className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl hover:from-green-500 hover:to-green-400 transition-all duration-300 shadow-lg hover:shadow-green-400/30 font-semibold flex items-center justify-center space-x-2 group">
              <span>✨</span>
              <span>Optimize Flow</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </button>
            <button className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl hover:from-blue-500 hover:to-blue-400 transition-all duration-300 shadow-lg hover:shadow-blue-400/30 font-semibold flex items-center justify-center space-x-2 group">
              <span>⚖️</span>
              <span>Balance Load</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </button>
            <button className="w-full px-6 py-3 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl hover:from-red-500 hover:to-red-400 transition-all duration-300 shadow-lg hover:shadow-red-400/30 font-semibold flex items-center justify-center space-x-2 group">
              <span>🛑</span>
              <span>Emergency Stop</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </button>
          </div>
        </div>
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 shadow-xl border border-gray-700">
          <h3 className="text-lg font-semibold mb-6 text-gray-100 flex items-center">
            <span className="w-6 h-6 bg-purple-500/20 rounded flex items-center justify-center mr-3">
              <span className="text-purple-400 text-sm">📊</span>
            </span>
            Investigation Data
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-red-900/20 rounded-lg border border-red-700/50">
              <span className="text-gray-300 flex items-center">
                <span className="w-3 h-3 bg-red-500 rounded-full mr-2 animate-pulse"></span>
                High Risk Domains
              </span>
              <span className="font-bold text-red-400 text-lg">5</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-yellow-900/20 rounded-lg border border-yellow-700/50">
              <span className="text-gray-300 flex items-center">
                <span className="w-3 h-3 bg-yellow-500 rounded-full mr-2 animate-pulse"></span>
                Medium Risk Domains
              </span>
              <span className="font-bold text-yellow-400 text-lg">8</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-900/20 rounded-lg border border-green-700/50">
              <span className="text-gray-300 flex items-center">
                <span className="w-3 h-3 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                Low Risk Domains
              </span>
              <span className="font-bold text-green-400 text-lg">12</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Command Center Interface Component
const CommandCenterInterface: React.FC = () => {
  const [alerts, setAlerts] = useState(3);
  const [activeInvestigations, setActiveInvestigations] = useState(7);

  return (
    <div className="p-6 space-y-6 bg-gray-900 min-h-screen">
      {/* Mission Control Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-red-900/30 to-gray-900 rounded-xl p-6 shadow-xl border border-red-700/50 hover:border-red-500/70 transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-300/80 uppercase tracking-wider font-medium mb-1">Critical Alerts</p>
              <p className="text-4xl font-bold text-red-400 group-hover:text-red-300 transition-colors">{alerts}</p>
            </div>
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center group-hover:bg-red-400/30 transition-all duration-300">
              <span className="text-3xl text-red-400 group-hover:scale-110 transition-transform animate-pulse">🚨</span>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-blue-900/30 to-gray-900 rounded-xl p-6 shadow-xl border border-blue-700/50 hover:border-blue-500/70 transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-300/80 uppercase tracking-wider font-medium mb-1">Active Investigations</p>
              <p className="text-4xl font-bold text-blue-400 group-hover:text-blue-300 transition-colors">{activeInvestigations}</p>
            </div>
            <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center group-hover:bg-blue-400/30 transition-all duration-300">
              <span className="text-3xl text-blue-400 group-hover:scale-110 transition-transform">🔍</span>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-900/30 to-gray-900 rounded-xl p-6 shadow-xl border border-green-700/50 hover:border-green-500/70 transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-300/80 uppercase tracking-wider font-medium mb-1">System Status</p>
              <p className="text-2xl font-bold text-green-400 group-hover:text-green-300 transition-colors">Operational</p>
            </div>
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center group-hover:bg-green-400/30 transition-all duration-300">
              <span className="text-3xl text-green-400 group-hover:scale-110 transition-transform animate-pulse">✅</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mission Control Panel */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 shadow-xl border border-gray-700">
        <h2 className="text-xl font-semibold mb-6 text-gray-100 flex items-center">
          <span className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center mr-3">
            <span className="text-purple-400">🎛️</span>
          </span>
          Mission Control Center
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-200 flex items-center mb-4">
              <span className="w-6 h-6 bg-orange-500/20 rounded flex items-center justify-center mr-3">
                <span className="text-orange-400 text-sm">📋</span>
              </span>
              Investigation Queue
            </h3>
            <div className="space-y-3">
              <div className="p-4 bg-gradient-to-r from-red-900/40 to-red-800/20 border border-red-600/50 rounded-xl hover:border-red-500/70 transition-all duration-300 group">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors flex items-center">
                    <span className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></span>
                    High Priority: Financial Fraud
                  </span>
                  <span className="text-xs bg-red-700 text-red-200 px-3 py-1 rounded-full font-semibold border border-red-600">🔥 URGENT</span>
                </div>
              </div>
              <div className="p-4 bg-gradient-to-r from-yellow-900/40 to-yellow-800/20 border border-yellow-600/50 rounded-xl hover:border-yellow-500/70 transition-all duration-300 group">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors flex items-center">
                    <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2 animate-pulse"></span>
                    Medium: Account Takeover
                  </span>
                  <span className="text-xs bg-yellow-700 text-yellow-200 px-3 py-1 rounded-full font-semibold border border-yellow-600">⚡ ACTIVE</span>
                </div>
              </div>
              <div className="p-4 bg-gradient-to-r from-green-900/40 to-green-800/20 border border-green-600/50 rounded-xl hover:border-green-500/70 transition-all duration-300 group">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    Low: Device Analysis
                  </span>
                  <span className="text-xs bg-green-700 text-green-200 px-3 py-1 rounded-full font-semibold border border-green-600">⏳ QUEUED</span>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-200 flex items-center mb-4">
              <span className="w-6 h-6 bg-cyan-500/20 rounded flex items-center justify-center mr-3">
                <span className="text-cyan-400 text-sm">📊</span>
              </span>
              Resource Management
            </h3>
            <div className="space-y-4">
              <div className="p-3 bg-blue-900/20 rounded-lg border border-blue-700/50">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-300 font-medium">AI Agents Available</span>
                  <span className="text-blue-400 font-bold">8/12</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-500 to-blue-400 h-3 rounded-full w-2/3 shadow-lg transition-all duration-500"></div>
                </div>
              </div>
              <div className="p-3 bg-green-900/20 rounded-lg border border-green-700/50">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-300 font-medium">Processing Power</span>
                  <span className="text-green-400 font-bold">65%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                  <div className="bg-gradient-to-r from-green-500 to-green-400 h-3 rounded-full w-2/3 shadow-lg transition-all duration-500"></div>
                </div>
              </div>
              <div className="p-3 bg-yellow-900/20 rounded-lg border border-yellow-700/50">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-300 font-medium">Database Load</span>
                  <span className="text-yellow-400 font-bold">42%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                  <div className="bg-gradient-to-r from-yellow-500 to-yellow-400 h-3 rounded-full w-2/5 shadow-lg transition-all duration-500"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Evidence Trail Interface Component
const EvidenceTrailInterface: React.FC = () => {
  return (
    <div className="p-6 space-y-6 bg-gray-900 min-h-screen">
      {/* Timeline Header */}
      <div className="bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-700">
        <h2 className="text-xl font-semibold mb-4 text-gray-100">Evidence Timeline</h2>
        <div className="flex items-center space-x-4">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-500 transition-colors">Last 24h</button>
          <button className="px-4 py-2 bg-gray-700 text-gray-300 rounded-md text-sm hover:bg-gray-600 transition-colors">Last Week</button>
          <button className="px-4 py-2 bg-gray-700 text-gray-300 rounded-md text-sm hover:bg-gray-600 transition-colors">Last Month</button>
          <span className="text-sm text-gray-400">Total Evidence: 127 items</span>
        </div>
      </div>

      {/* Timeline Visualization */}
      <div className="bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-700">
        <div className="space-y-6">
          <div className="flex items-start space-x-4">
            <div className="flex flex-col items-center">
              <div className="w-4 h-4 bg-red-500 rounded-full shadow-lg"></div>
              <div className="w-px h-16 bg-gray-600"></div>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-red-400">Suspicious Login Detected</h3>
                <span className="text-sm text-gray-400">2 hours ago</span>
              </div>
              <p className="text-sm text-gray-300 mt-1">
                Multiple failed login attempts from IP 192.168.1.100
              </p>
              <div className="mt-2 flex space-x-2">
                <span className="px-2 py-1 bg-red-900/50 text-red-300 text-xs rounded border border-red-700">HIGH RISK</span>
                <span className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded border border-gray-600">AUTHENTICATION</span>
              </div>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="flex flex-col items-center">
              <div className="w-4 h-4 bg-yellow-500 rounded-full shadow-lg"></div>
              <div className="w-px h-16 bg-gray-600"></div>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-yellow-400">Device Fingerprint Change</h3>
                <span className="text-sm text-gray-400">4 hours ago</span>
              </div>
              <p className="text-sm text-gray-300 mt-1">
                User agent string modified on device registration
              </p>
              <div className="mt-2 flex space-x-2">
                <span className="px-2 py-1 bg-yellow-900/50 text-yellow-300 text-xs rounded border border-yellow-700">MEDIUM RISK</span>
                <span className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded border border-gray-600">DEVICE</span>
              </div>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="flex flex-col items-center">
              <div className="w-4 h-4 bg-green-500 rounded-full shadow-lg"></div>
              <div className="w-px h-16 bg-gray-600"></div>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-green-400">Normal Transaction</h3>
                <span className="text-sm text-gray-400">6 hours ago</span>
              </div>
              <p className="text-sm text-gray-300 mt-1">
                Standard payment processed successfully
              </p>
              <div className="mt-2 flex space-x-2">
                <span className="px-2 py-1 bg-green-900/50 text-green-300 text-xs rounded border border-green-700">LOW RISK</span>
                <span className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded border border-gray-600">TRANSACTION</span>
              </div>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="flex flex-col items-center">
              <div className="w-4 h-4 bg-blue-500 rounded-full shadow-lg"></div>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-blue-400">Account Created</h3>
                <span className="text-sm text-gray-400">1 day ago</span>
              </div>
              <p className="text-sm text-gray-300 mt-1">
                New user account registration completed
              </p>
              <div className="mt-2 flex space-x-2">
                <span className="px-2 py-1 bg-blue-900/50 text-blue-300 text-xs rounded border border-blue-700">INFO</span>
                <span className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded border border-gray-600">REGISTRATION</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Evidence Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-700">
          <h3 className="text-lg font-semibold mb-4 text-gray-100">Evidence Categories</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-300">Authentication Events</span>
              <span className="bg-blue-900/50 text-blue-300 px-2 py-1 rounded text-xs border border-blue-700">45</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-300">Device Changes</span>
              <span className="bg-yellow-900/50 text-yellow-300 px-2 py-1 rounded text-xs border border-yellow-700">23</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-300">Financial Transactions</span>
              <span className="bg-green-900/50 text-green-300 px-2 py-1 rounded text-xs border border-green-700">34</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-300">Network Events</span>
              <span className="bg-purple-900/50 text-purple-300 px-2 py-1 rounded text-xs border border-purple-700">25</span>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-700">
          <h3 className="text-lg font-semibold mb-4 text-gray-100">Chain of Custody</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-300">Evidence Collected:</span>
              <span className="font-semibold text-gray-200">127 items</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Verified:</span>
              <span className="font-semibold text-green-400">119 items</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Pending Review:</span>
              <span className="font-semibold text-yellow-400">8 items</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Integrity Score:</span>
              <span className="font-semibold text-green-400">98.4%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Network Explorer Interface Component
const NetworkExplorerInterface: React.FC = () => {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  return (
    <div className="p-6 space-y-6 bg-gray-900 min-h-screen">
      {/* Network Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-700 hover:border-blue-500/50 transition-all">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">127</div>
            <div className="text-sm text-gray-400">Total Nodes</div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-700 hover:border-green-500/50 transition-all">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">89</div>
            <div className="text-sm text-gray-400">Connections</div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-700 hover:border-orange-500/50 transition-all">
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-400">12</div>
            <div className="text-sm text-gray-400">Clusters</div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-700 hover:border-red-500/50 transition-all">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-400">5</div>
            <div className="text-sm text-gray-400">Anomalies</div>
          </div>
        </div>
      </div>

      {/* Interactive Graph */}
      <div className="bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-100">Network Graph</h2>
          <div className="flex space-x-2">
            <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-500 transition-colors">Force Layout</button>
            <button className="px-3 py-1 bg-gray-700 text-gray-300 rounded text-sm hover:bg-gray-600 transition-colors">Radial</button>
            <button className="px-3 py-1 bg-gray-700 text-gray-300 rounded text-sm hover:bg-gray-600 transition-colors">Hierarchical</button>
          </div>
        </div>
        <div className="h-96 bg-gray-900 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-600">
          <div className="text-center space-y-4">
            <div className="flex justify-center space-x-4 text-4xl">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg">🔗</div>
              <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white shadow-lg">🌐</div>
              <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center text-white shadow-lg">⚠️</div>
            </div>
            <div>
              <p className="text-gray-300 font-semibold">Interactive Network Graph</p>
              <p className="text-sm text-gray-500 mt-2">Click and drag to explore connections</p>
            </div>
          </div>
        </div>
      </div>

      {/* Network Analysis Tools */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 shadow-xl border border-gray-700">
          <h3 className="text-lg font-semibold mb-6 text-gray-100 flex items-center">
            <span className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center mr-3">
              <span className="text-emerald-400">🔍</span>
            </span>
            Path Analysis
          </h3>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2 uppercase tracking-wider">Source Node</label>
              <select className="w-full p-4 border border-gray-600 rounded-xl text-sm bg-gradient-to-r from-gray-700 to-gray-800 text-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-400/50 transition-all duration-300 shadow-lg">
                <option>🏠 User Account: user123</option>
                <option>📱 Device: mobile_001</option>
                <option>🌐 IP Address: 192.168.1.1</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2 uppercase tracking-wider">Target Node</label>
              <select className="w-full p-4 border border-gray-600 rounded-xl text-sm bg-gradient-to-r from-gray-700 to-gray-800 text-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-400/50 transition-all duration-300 shadow-lg">
                <option>💳 Transaction: tx_456</option>
                <option>🔧 Service: payment_gateway</option>
                <option>📍 Location: New York</option>
              </select>
            </div>
            <button className="w-full px-6 py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-xl hover:from-emerald-500 hover:to-emerald-400 text-sm transition-all duration-300 shadow-lg hover:shadow-emerald-400/30 font-semibold flex items-center justify-center space-x-3 group">
              <span>🔍</span>
              <span>Find Shortest Path</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </button>
          </div>
        </div>
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 shadow-xl border border-gray-700">
          <h3 className="text-lg font-semibold mb-6 text-gray-100 flex items-center">
            <span className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center mr-3">
              <span className="text-purple-400">🔗</span>
            </span>
            Cluster Information
          </h3>
          <div className="space-y-4">
            <div className="p-4 bg-gradient-to-r from-blue-900/40 to-blue-800/20 border border-blue-600/50 rounded-xl hover:border-blue-500/70 transition-all duration-300 group">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors flex items-center">
                  <span className="w-3 h-3 bg-blue-500 rounded-full mr-3 animate-pulse"></span>
                  Authentication Cluster
                </span>
                <span className="text-sm bg-blue-700 text-blue-200 px-3 py-1 rounded-full font-semibold border border-blue-600">
                  🔐 23 nodes
                </span>
              </div>
            </div>
            <div className="p-4 bg-gradient-to-r from-green-900/40 to-green-800/20 border border-green-600/50 rounded-xl hover:border-green-500/70 transition-all duration-300 group">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors flex items-center">
                  <span className="w-3 h-3 bg-green-500 rounded-full mr-3 animate-pulse"></span>
                  Transaction Cluster
                </span>
                <span className="text-sm bg-green-700 text-green-200 px-3 py-1 rounded-full font-semibold border border-green-600">
                  💰 34 nodes
                </span>
              </div>
            </div>
            <div className="p-4 bg-gradient-to-r from-red-900/40 to-red-800/20 border border-red-600/50 rounded-xl hover:border-red-500/70 transition-all duration-300 group">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors flex items-center">
                  <span className="w-3 h-3 bg-red-500 rounded-full mr-3 animate-pulse"></span>
                  Suspicious Activity
                </span>
                <span className="text-sm bg-red-700 text-red-200 px-3 py-1 rounded-full font-semibold border border-red-600">
                  ⚠️ 5 nodes
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Test minimal version without lucide-react icons
const AutonomousInvestigationApp: React.FC = () => {
  const [selectedConcept, setSelectedConcept] = useState<string | null>(null);

  const concepts = [
    {
      id: 'power-grid',
      title: 'Power Grid',
      description: 'Energy-based investigation visualization with dynamic node relationships',
      color: 'bg-blue-500',
      features: [
        'Energy flow visualization',
        'Dynamic node sizing',
        'Real-time power metrics',
        'Grid topology analysis'
      ]
    },
    {
      id: 'command-center',
      title: 'Command Center',
      description: 'Mission control interface for investigation management and monitoring',
      color: 'bg-purple-500',
      features: [
        'Real-time monitoring',
        'Investigation control',
        'Resource management',
        'Alert system'
      ]
    },
    {
      id: 'evidence-trail',
      title: 'Evidence Trail',
      description: 'Temporal evidence tracking with chronological visualization',
      color: 'bg-green-500',
      features: [
        'Timeline visualization',
        'Evidence correlation',
        'Temporal analysis',
        'Chain of custody'
      ]
    },
    {
      id: 'network-explorer',
      title: 'Network Explorer',
      description: 'Interactive graph navigation with advanced exploration tools',
      color: 'bg-orange-500',
      features: [
        'Interactive navigation',
        'Graph exploration',
        'Node clustering',
        'Path analysis'
      ]
    }
  ];

  if (selectedConcept) {
    const concept = concepts.find(c => c.id === selectedConcept);

    return (
      <div className="min-h-screen bg-gray-900">
        {/* Header */}
        <header className="bg-gray-800 border-b border-gray-700 px-6 py-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSelectedConcept(null)}
                className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-md text-gray-300 hover:text-white transition-colors border border-gray-600"
              >
                ← Back to Concepts
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-100">
                  {concept?.title} Investigation
                </h1>
                <p className="text-gray-400">{concept?.description}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-400">Connected</span>
            </div>
          </div>
        </header>

        {/* Concept-specific content */}
        {selectedConcept === 'power-grid' && <PowerGridInterface />}
        {selectedConcept === 'command-center' && <CommandCenterInterface />}
        {selectedConcept === 'evidence-trail' && <EvidenceTrailInterface />}
        {selectedConcept === 'network-explorer' && <NetworkExplorerInterface />}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-gray-100 mb-4">
          Hybrid Graph Investigation Interface
        </h1>
        <p className="text-lg text-gray-400 max-w-3xl mx-auto">
          Choose your investigation visualization concept. Each interface provides
          unique perspectives on the same underlying data through specialized interaction paradigms.
        </p>
      </div>

      {/* Concept Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {concepts.map((concept) => {
          return (
            <div
              key={concept.id}
              className="bg-gray-800 border border-gray-700 rounded-lg p-6 shadow-lg hover:shadow-xl hover:border-gray-600 transition-all duration-300 cursor-pointer group"
              onClick={() => setSelectedConcept(concept.id)}
            >
              {/* Header */}
              <div className="flex items-center space-x-4 mb-4">
                <div className={`${concept.color} p-3 rounded-lg text-white group-hover:scale-110 transition-transform shadow-lg`}>
                  {concept.id === 'power-grid' && <span className="text-xl">⚡</span>}
                  {concept.id === 'command-center' && <span className="text-xl">🎛️</span>}
                  {concept.id === 'evidence-trail' && <span className="text-xl">🔍</span>}
                  {concept.id === 'network-explorer' && <span className="text-xl">🌐</span>}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-100 group-hover:text-blue-400 transition-colors">
                    {concept.title}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Investigation Interface
                  </p>
                </div>
              </div>

              {/* Description */}
              <p className="text-gray-300 mb-6">
                {concept.description}
              </p>

              {/* Features */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-300 mb-3">
                  Key Features:
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {concept.features.map((feature, index) => (
                    <div key={index} className="flex items-center text-sm text-gray-400">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2" />
                      {feature}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action */}
              <div className="mt-6 pt-4 border-t border-gray-700">
                <button className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl hover:from-blue-500 hover:to-blue-400 group-hover:from-blue-500 group-hover:to-blue-400 transition-all duration-300 shadow-lg hover:shadow-blue-400/30 font-semibold flex items-center justify-center space-x-2 group-button">
                  <span>🚀</span>
                  <span>Launch {concept.title}</span>
                  <span className="group-button-hover:translate-x-1 transition-transform">→</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-16 text-center">
        <div className="inline-flex items-center space-x-2 text-sm text-gray-500">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          <span>All interfaces share real-time investigation data</span>
        </div>
      </div>
    </div>
  );
};

// Export as default for Module Federation
const App: React.FC = () => {
  return <AutonomousInvestigationApp />;
};

export default App;