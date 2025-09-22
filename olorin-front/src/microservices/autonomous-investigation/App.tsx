import React, { useState } from 'react';
import './styles/tailwind.css';

// Power Grid Interface Component
const PowerGridInterface: React.FC = () => {
  const [gridStability, setGridStability] = useState(92);
  const [energyFlow, setEnergyFlow] = useState(2.4);
  const [activeNodes, setActiveNodes] = useState(85);

  return (
    <div className="p-6 space-y-6">
      {/* Grid Metrics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Grid Stability</p>
              <p className="text-2xl font-bold text-green-600">{gridStability}%</p>
            </div>
            <div className="text-2xl">⚡</div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Energy Flow</p>
              <p className="text-2xl font-bold text-blue-600">{energyFlow} GW</p>
            </div>
            <div className="text-2xl">🔋</div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Nodes</p>
              <p className="text-2xl font-bold text-purple-600">{activeNodes}</p>
            </div>
            <div className="text-2xl">🔗</div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Peak Load</p>
              <p className="text-2xl font-bold text-orange-600">78%</p>
            </div>
            <div className="text-2xl">📊</div>
          </div>
        </div>
      </div>

      {/* Main Grid Visualization */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Energy Flow Visualization</h2>
        <div className="h-96 bg-gray-50 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
          <div className="text-center">
            <div className="text-6xl mb-4">⚡🔋⚡</div>
            <p className="text-gray-600">Interactive Energy Grid</p>
            <p className="text-sm text-gray-500 mt-2">Real-time power flow visualization</p>
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Grid Controls</h3>
          <div className="space-y-4">
            <button className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
              Optimize Flow
            </button>
            <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              Balance Load
            </button>
            <button className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
              Emergency Stop
            </button>
          </div>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Investigation Data</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>High Risk Domains:</span>
              <span className="font-semibold text-red-600">5</span>
            </div>
            <div className="flex justify-between">
              <span>Medium Risk Domains:</span>
              <span className="font-semibold text-yellow-600">8</span>
            </div>
            <div className="flex justify-between">
              <span>Low Risk Domains:</span>
              <span className="font-semibold text-green-600">12</span>
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
    <div className="p-6 space-y-6">
      {/* Mission Control Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg p-6 shadow-sm border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Critical Alerts</p>
              <p className="text-3xl font-bold text-red-600">{alerts}</p>
            </div>
            <div className="text-3xl">🚨</div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-sm border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Investigations</p>
              <p className="text-3xl font-bold text-blue-600">{activeInvestigations}</p>
            </div>
            <div className="text-3xl">🔍</div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-sm border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">System Status</p>
              <p className="text-lg font-bold text-green-600">Operational</p>
            </div>
            <div className="text-3xl">✅</div>
          </div>
        </div>
      </div>

      {/* Mission Control Panel */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Mission Control Center</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="font-semibold">Investigation Queue</h3>
            <div className="space-y-2">
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">High Priority: Financial Fraud</span>
                  <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">URGENT</span>
                </div>
              </div>
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Medium: Account Takeover</span>
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">ACTIVE</span>
                </div>
              </div>
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Low: Device Analysis</span>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">QUEUED</span>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="font-semibold">Resource Management</h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm">
                  <span>AI Agents Available</span>
                  <span>8/12</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full w-2/3"></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm">
                  <span>Processing Power</span>
                  <span>65%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full w-2/3"></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm">
                  <span>Database Load</span>
                  <span>42%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-yellow-500 h-2 rounded-full w-2/5"></div>
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
    <div className="p-6 space-y-6">
      {/* Timeline Header */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Evidence Timeline</h2>
        <div className="flex items-center space-x-4">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm">Last 24h</button>
          <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm">Last Week</button>
          <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm">Last Month</button>
          <span className="text-sm text-gray-600">Total Evidence: 127 items</span>
        </div>
      </div>

      {/* Timeline Visualization */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <div className="space-y-6">
          <div className="flex items-start space-x-4">
            <div className="flex flex-col items-center">
              <div className="w-4 h-4 bg-red-500 rounded-full"></div>
              <div className="w-px h-16 bg-gray-300"></div>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-red-600">Suspicious Login Detected</h3>
                <span className="text-sm text-gray-500">2 hours ago</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Multiple failed login attempts from IP 192.168.1.100
              </p>
              <div className="mt-2 flex space-x-2">
                <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">HIGH RISK</span>
                <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">AUTHENTICATION</span>
              </div>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="flex flex-col items-center">
              <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
              <div className="w-px h-16 bg-gray-300"></div>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-yellow-600">Device Fingerprint Change</h3>
                <span className="text-sm text-gray-500">4 hours ago</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                User agent string modified on device registration
              </p>
              <div className="mt-2 flex space-x-2">
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">MEDIUM RISK</span>
                <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">DEVICE</span>
              </div>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="flex flex-col items-center">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <div className="w-px h-16 bg-gray-300"></div>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-green-600">Normal Transaction</h3>
                <span className="text-sm text-gray-500">6 hours ago</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Standard payment processed successfully
              </p>
              <div className="mt-2 flex space-x-2">
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">LOW RISK</span>
                <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">TRANSACTION</span>
              </div>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="flex flex-col items-center">
              <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-blue-600">Account Created</h3>
                <span className="text-sm text-gray-500">1 day ago</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                New user account registration completed
              </p>
              <div className="mt-2 flex space-x-2">
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">INFO</span>
                <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">REGISTRATION</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Evidence Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Evidence Categories</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Authentication Events</span>
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">45</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Device Changes</span>
              <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">23</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Financial Transactions</span>
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">34</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Network Events</span>
              <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">25</span>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Chain of Custody</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Evidence Collected:</span>
              <span className="font-semibold">127 items</span>
            </div>
            <div className="flex justify-between">
              <span>Verified:</span>
              <span className="font-semibold text-green-600">119 items</span>
            </div>
            <div className="flex justify-between">
              <span>Pending Review:</span>
              <span className="font-semibold text-yellow-600">8 items</span>
            </div>
            <div className="flex justify-between">
              <span>Integrity Score:</span>
              <span className="font-semibold text-green-600">98.4%</span>
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
    <div className="p-6 space-y-6">
      {/* Network Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">127</div>
            <div className="text-sm text-gray-600">Total Nodes</div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">89</div>
            <div className="text-sm text-gray-600">Connections</div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">12</div>
            <div className="text-sm text-gray-600">Clusters</div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">5</div>
            <div className="text-sm text-gray-600">Anomalies</div>
          </div>
        </div>
      </div>

      {/* Interactive Graph */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Network Graph</h2>
          <div className="flex space-x-2">
            <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm">Force Layout</button>
            <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm">Radial</button>
            <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm">Hierarchical</button>
          </div>
        </div>
        <div className="h-96 bg-gray-50 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
          <div className="text-center space-y-4">
            <div className="flex justify-center space-x-4 text-4xl">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white">🔗</div>
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white">🌐</div>
              <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center text-white">⚠️</div>
            </div>
            <div>
              <p className="text-gray-600 font-semibold">Interactive Network Graph</p>
              <p className="text-sm text-gray-500 mt-2">Click and drag to explore connections</p>
            </div>
          </div>
        </div>
      </div>

      {/* Network Analysis Tools */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Path Analysis</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source Node</label>
              <select className="w-full p-2 border border-gray-300 rounded-md text-sm">
                <option>User Account: user123</option>
                <option>Device: mobile_001</option>
                <option>IP Address: 192.168.1.1</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Node</label>
              <select className="w-full p-2 border border-gray-300 rounded-md text-sm">
                <option>Transaction: tx_456</option>
                <option>Service: payment_gateway</option>
                <option>Location: New York</option>
              </select>
            </div>
            <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">
              Find Shortest Path
            </button>
          </div>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Cluster Information</h3>
          <div className="space-y-3">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Authentication Cluster</span>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">23 nodes</span>
              </div>
            </div>
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Transaction Cluster</span>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">34 nodes</span>
              </div>
            </div>
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Suspicious Activity</span>
                <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">5 nodes</span>
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
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSelectedConcept(null)}
                className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                ← Back to Concepts
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {concept?.title} Investigation
                </h1>
                <p className="text-gray-600">{concept?.description}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Connected</span>
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
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Hybrid Graph Investigation Interface
        </h1>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
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
              className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer group"
              onClick={() => setSelectedConcept(concept.id)}
            >
              {/* Header */}
              <div className="flex items-center space-x-4 mb-4">
                <div className={`${concept.color} p-3 rounded-lg text-white group-hover:scale-110 transition-transform`}>
                  {concept.id === 'power-grid' && <span className="text-xl">⚡</span>}
                  {concept.id === 'command-center' && <span className="text-xl">🎛️</span>}
                  {concept.id === 'evidence-trail' && <span className="text-xl">🔍</span>}
                  {concept.id === 'network-explorer' && <span className="text-xl">🌐</span>}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {concept.title}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Investigation Interface
                  </p>
                </div>
              </div>

              {/* Description */}
              <p className="text-gray-600 mb-6">
                {concept.description}
              </p>

              {/* Features */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Key Features:
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {concept.features.map((feature, index) => (
                    <div key={index} className="flex items-center text-sm text-gray-600">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2" />
                      {feature}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action */}
              <div className="mt-6 pt-4 border-t border-gray-100">
                <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 group-hover:bg-blue-700 transition-colors">
                  Launch {concept.title}
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