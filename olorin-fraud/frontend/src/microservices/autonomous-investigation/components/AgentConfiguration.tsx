import React, { useState, useEffect } from 'react';
import {
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline';
import { AIAgent, AgentConfiguration as AgentConfig } from '../types/investigation';

interface AgentConfigurationProps {
  onSave: (configurations: AgentConfig[]) => void;
  onCancel: () => void;
  initialConfigurations?: AgentConfig[];
}

interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  configuration: AgentConfig[];
  isDefault: boolean;
}

const agentDefinitions: AIAgent[] = [
  {
    id: 'device-analyzer',
    name: 'Device Analyzer',
    description: 'Analyzes device fingerprints, hardware characteristics, and behavioral patterns',
    type: 'device',
    version: '2.1.0',
    enabled: true,
    configuration: {
      sensitivity: 'medium',
      includeHistory: true,
      fingerprintDepth: 'full',
      behaviorTracking: true,
    },
    capabilities: [
      'Device fingerprint analysis',
      'Hardware profiling',
      'Browser characteristics',
      'Screen resolution patterns',
      'Timezone analysis',
      'Language preferences',
      'Plugin detection',
      'Canvas fingerprinting',
    ],
    requiredInputs: ['user_agent', 'screen_resolution', 'timezone', 'language'],
    outputFormat: 'structured_json',
  },
  {
    id: 'location-analyzer',
    name: 'Location Analyzer',
    description: 'Examines geographic patterns, IP geolocation, and travel behavior anomalies',
    type: 'location',
    version: '1.9.2',
    enabled: true,
    configuration: {
      radiusKm: 50,
      includeVPN: true,
      proxyDetection: true,
      travelPatterns: true,
    },
    capabilities: [
      'IP geolocation analysis',
      'VPN/Proxy detection',
      'Travel pattern analysis',
      'Geographic anomaly detection',
      'Time zone correlation',
      'ISP analysis',
      'Connection type detection',
      'Mobile network analysis',
    ],
    requiredInputs: ['ip_address', 'timestamp', 'user_id'],
    outputFormat: 'geojson_with_metadata',
  },
  {
    id: 'network-analyzer',
    name: 'Network Analyzer',
    description: 'Investigates network patterns, connection behaviors, and infrastructure analysis',
    type: 'network',
    version: '3.0.1',
    enabled: true,
    configuration: {
      depth: 'medium',
      includeProxy: true,
      portScanning: false,
      dnsAnalysis: true,
    },
    capabilities: [
      'Network topology analysis',
      'Connection pattern detection',
      'DNS resolution analysis',
      'Proxy chain detection',
      'ISP reputation scoring',
      'Network latency analysis',
      'Route tracing',
      'Infrastructure mapping',
    ],
    requiredInputs: ['ip_address', 'connection_logs', 'dns_records'],
    outputFormat: 'network_graph',
  },
  {
    id: 'behavior-analyzer',
    name: 'Behavior Analyzer',
    description: 'Analyzes user behavior patterns, session activities, and interaction anomalies',
    type: 'behavior',
    version: '2.5.0',
    enabled: true,
    configuration: {
      lookbackDays: 30,
      sensitivity: 'high',
      sessionAnalysis: true,
      clickstreamAnalysis: true,
    },
    capabilities: [
      'Session behavior analysis',
      'Clickstream pattern detection',
      'Typing behavior analysis',
      'Navigation pattern recognition',
      'Time-based activity analysis',
      'Interaction velocity tracking',
      'Mouse movement analysis',
      'Scroll behavior profiling',
    ],
    requiredInputs: ['session_logs', 'click_events', 'navigation_history'],
    outputFormat: 'behavioral_profile',
  },
  {
    id: 'transaction-analyzer',
    name: 'Transaction Analyzer',
    description: 'Examines financial transaction patterns, amounts, and payment method analysis',
    type: 'transaction',
    version: '1.8.5',
    enabled: true,
    configuration: {
      threshold: 0.8,
      includeRelated: true,
      velocityChecks: true,
      amountPatterns: true,
    },
    capabilities: [
      'Transaction velocity analysis',
      'Amount pattern detection',
      'Payment method analysis',
      'Merchant category analysis',
      'Cross-account correlation',
      'Seasonal pattern detection',
      'Risk scoring',
      'Fraud indicator analysis',
    ],
    requiredInputs: ['transaction_history', 'payment_methods', 'account_details'],
    outputFormat: 'transaction_analysis',
  },
  {
    id: 'logs-analyzer',
    name: 'Logs Analyzer',
    description: 'Searches and analyzes system logs, audit trails, and activity records',
    type: 'logs',
    version: '2.2.3',
    enabled: true,
    configuration: {
      sources: ['api', 'auth', 'audit'],
      timespan: '7d',
      logLevel: 'info',
      patternMatching: true,
    },
    capabilities: [
      'Log pattern analysis',
      'Anomaly detection in logs',
      'Error correlation analysis',
      'Authentication log analysis',
      'API access pattern detection',
      'Audit trail examination',
      'Performance log analysis',
      'Security event detection',
    ],
    requiredInputs: ['log_files', 'audit_trails', 'api_logs'],
    outputFormat: 'log_analysis_report',
  },
];

const defaultTemplates: AgentTemplate[] = [
  {
    id: 'fraud-detection',
    name: 'Fraud Detection',
    description: 'Comprehensive fraud detection with all agents',
    category: 'security',
    configuration: agentDefinitions.map(agent => ({
      id: agent.id,
      enabled: true,
      config: agent.configuration,
    })),
    isDefault: true,
  },
  {
    id: 'account-takeover',
    name: 'Account Takeover Detection',
    description: 'Focused on device and behavior analysis',
    category: 'security',
    configuration: [
      { id: 'device-analyzer', enabled: true, config: { sensitivity: 'high' } },
      { id: 'location-analyzer', enabled: true, config: { radiusKm: 25 } },
      { id: 'behavior-analyzer', enabled: true, config: { sensitivity: 'high' } },
    ],
    isDefault: true,
  },
  {
    id: 'transaction-monitoring',
    name: 'Transaction Monitoring',
    description: 'Focus on financial transaction analysis',
    category: 'finance',
    configuration: [
      { id: 'transaction-analyzer', enabled: true, config: { threshold: 0.9 } },
      { id: 'behavior-analyzer', enabled: true, config: { lookbackDays: 14 } },
      { id: 'location-analyzer', enabled: true, config: { includeVPN: true } },
    ],
    isDefault: true,
  },
];

export const AgentConfiguration: React.FC<AgentConfigurationProps> = ({
  onSave,
  onCancel,
  initialConfigurations = [],
}) => {
  const [configurations, setConfigurations] = useState<AgentConfig[]>(initialConfigurations);
  const [templates, setTemplates] = useState<AgentTemplate[]>(defaultTemplates);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Initialize with default configuration if none provided
    if (configurations.length === 0) {
      setConfigurations(
        agentDefinitions.map(agent => ({
          id: agent.id,
          enabled: agent.enabled,
          config: { ...agent.configuration },
        }))
      );
    }
  }, [configurations.length]);

  const getAgentDefinition = (agentId: string): AIAgent | undefined => {
    return agentDefinitions.find(agent => agent.id === agentId);
  };

  const getAgentConfiguration = (agentId: string): AgentConfig | undefined => {
    return configurations.find(config => config.id === agentId);
  };

  const updateAgentConfiguration = (agentId: string, updates: Partial<AgentConfig>) => {
    setConfigurations(prev =>
      prev.map(config =>
        config.id === agentId ? { ...config, ...updates } : config
      )
    );
  };

  const updateAgentConfigValue = (agentId: string, key: string, value: any) => {
    setConfigurations(prev =>
      prev.map(config =>
        config.id === agentId
          ? { ...config, config: { ...config.config, [key]: value } }
          : config
      )
    );
  };

  const toggleAgent = (agentId: string) => {
    const config = getAgentConfiguration(agentId);
    if (config) {
      updateAgentConfiguration(agentId, { enabled: !config.enabled });
    }
  };

  const resetAgentConfig = (agentId: string) => {
    const agentDef = getAgentDefinition(agentId);
    if (agentDef) {
      updateAgentConfiguration(agentId, {
        config: { ...agentDef.configuration },
      });
    }
  };

  const applyTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setConfigurations(template.configuration.map(config => ({ ...config })));
      setSelectedTemplate(templateId);
    }
  };

  const saveCustomTemplate = () => {
    const name = prompt('Enter template name:');
    if (name) {
      const newTemplate: AgentTemplate = {
        id: `custom-${Date.now()}`,
        name,
        description: 'Custom agent configuration',
        category: 'custom',
        configuration: configurations.map(config => ({ ...config })),
        isDefault: false,
      };
      setTemplates(prev => [...prev, newTemplate]);
    }
  };

  const toggleAdvanced = (agentId: string) => {
    setShowAdvanced(prev => ({
      ...prev,
      [agentId]: !prev[agentId],
    }));
  };

  const renderAgentConfigForm = (agent: AIAgent, config: AgentConfig) => {
    const isAdvanced = showAdvanced[agent.id];

    return (
      <div key={agent.id} className="bg-white border border-gray-200 rounded-lg">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => toggleAgent(agent.id)}
                className={`
                  relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                  ${config.enabled ? 'bg-blue-600' : 'bg-gray-200'}
                `}
              >
                <span
                  className={`
                    pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                    ${config.enabled ? 'translate-x-5' : 'translate-x-0'}
                  `}
                />
              </button>
              <div>
                <h3 className="text-lg font-medium text-gray-900">{agent.name}</h3>
                <p className="text-sm text-gray-600">{agent.description}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                config.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {config.enabled ? 'Enabled' : 'Disabled'}
              </span>
              <span className="text-xs text-gray-500">v{agent.version}</span>
            </div>
          </div>

          <div className="mt-3 flex items-center space-x-4">
            <button
              onClick={() => toggleAdvanced(agent.id)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {isAdvanced ? 'Hide' : 'Show'} Advanced Settings
            </button>
            <button
              onClick={() => resetAgentConfig(agent.id)}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Reset to Defaults
            </button>
          </div>
        </div>

        {config.enabled && (
          <div className="p-4 space-y-4">
            {/* Basic Configuration */}
            {agent.type === 'device' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sensitivity Level
                  </label>
                  <select
                    value={config.config.sensitivity || 'medium'}
                    onChange={(e) => updateAgentConfigValue(agent.id, 'sensitivity', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fingerprint Depth
                  </label>
                  <select
                    value={config.config.fingerprintDepth || 'full'}
                    onChange={(e) => updateAgentConfigValue(agent.id, 'fingerprintDepth', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="basic">Basic</option>
                    <option value="standard">Standard</option>
                    <option value="full">Full</option>
                  </select>
                </div>
              </div>
            )}

            {agent.type === 'location' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Detection Radius (km)
                  </label>
                  <input
                    type="number"
                    value={config.config.radiusKm || 50}
                    onChange={(e) => updateAgentConfigValue(agent.id, 'radiusKm', parseInt(e.target.value))}
                    min="1"
                    max="1000"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={config.config.includeVPN || false}
                      onChange={(e) => updateAgentConfigValue(agent.id, 'includeVPN', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Include VPN Detection</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={config.config.proxyDetection || false}
                      onChange={(e) => updateAgentConfigValue(agent.id, 'proxyDetection', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Proxy Detection</span>
                  </label>
                </div>
              </div>
            )}

            {agent.type === 'behavior' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lookback Period (days)
                  </label>
                  <select
                    value={config.config.lookbackDays || 30}
                    onChange={(e) => updateAgentConfigValue(agent.id, 'lookbackDays', parseInt(e.target.value))}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={7}>7 days</option>
                    <option value={14}>14 days</option>
                    <option value={30}>30 days</option>
                    <option value={60}>60 days</option>
                    <option value={90}>90 days</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Analysis Sensitivity
                  </label>
                  <select
                    value={config.config.sensitivity || 'medium'}
                    onChange={(e) => updateAgentConfigValue(agent.id, 'sensitivity', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
            )}

            {agent.type === 'transaction' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Risk Threshold ({config.config.threshold || 0.8})
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.1"
                    value={config.config.threshold || 0.8}
                    onChange={(e) => updateAgentConfigValue(agent.id, 'threshold', parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0.1 (Low)</span>
                    <span>1.0 (High)</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={config.config.includeRelated || false}
                      onChange={(e) => updateAgentConfigValue(agent.id, 'includeRelated', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Include Related Accounts</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={config.config.velocityChecks || false}
                      onChange={(e) => updateAgentConfigValue(agent.id, 'velocityChecks', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Velocity Checks</span>
                  </label>
                </div>
              </div>
            )}

            {/* Advanced Configuration */}
            {isAdvanced && (
              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Advanced Settings</h4>

                <div className="space-y-4">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                    <div className="flex">
                      <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
                      <div className="ml-3">
                        <p className="text-sm text-yellow-800">
                          Advanced settings may affect agent performance. Modify only if you understand the implications.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Processing Time (seconds)
                      </label>
                      <input
                        type="number"
                        value={config.config.maxProcessingTime || 300}
                        onChange={(e) => updateAgentConfigValue(agent.id, 'maxProcessingTime', parseInt(e.target.value))}
                        min="60"
                        max="3600"
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Memory Limit (MB)
                      </label>
                      <input
                        type="number"
                        value={config.config.memoryLimit || 512}
                        onChange={(e) => updateAgentConfigValue(agent.id, 'memoryLimit', parseInt(e.target.value))}
                        min="128"
                        max="2048"
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={config.config.debugMode || false}
                        onChange={(e) => updateAgentConfigValue(agent.id, 'debugMode', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">Enable Debug Mode</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Agent Capabilities */}
            <div className="border-t border-gray-200 pt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Capabilities</h4>
              <div className="flex flex-wrap gap-2">
                {agent.capabilities.map((capability, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {capability}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const enabledAgentsCount = configurations.filter(config => config.enabled).length;

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Agent Configuration</h1>
              <p className="text-sm text-gray-600 mt-1">
                Configure AI agents for autonomous investigations ({enabledAgentsCount} of {agentDefinitions.length} enabled)
              </p>
            </div>
            <button
              onClick={onCancel}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-md"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Templates */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">Configuration Templates</h2>
              <button
                onClick={saveCustomTemplate}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <DocumentDuplicateIcon className="h-4 w-4 mr-2" />
                Save as Template
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {templates.map(template => (
                <div
                  key={template.id}
                  className={`
                    border-2 rounded-lg p-4 cursor-pointer transition-all duration-150
                    ${selectedTemplate === template.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }
                  `}
                  onClick={() => applyTemplate(template.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{template.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                      <div className="flex items-center mt-2 space-x-2">
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          {template.category}
                        </span>
                        <span className="text-xs text-gray-500">
                          {template.configuration.filter(c => c.enabled).length} agents
                        </span>
                        {template.isDefault && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                            Default
                          </span>
                        )}
                      </div>
                    </div>
                    {selectedTemplate === template.id && (
                      <CheckIcon className="h-5 w-5 text-blue-500 flex-shrink-0 ml-2" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Agent Configuration Forms */}
        <div className="space-y-4">
          {agentDefinitions.map(agent => {
            const config = getAgentConfiguration(agent.id);
            if (!config) return null;
            return renderAgentConfigForm(agent, config);
          })}
        </div>

        {/* Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Configuration Summary</h3>
              <p className="text-sm text-gray-600">
                {enabledAgentsCount} agents enabled • Ready for investigation
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={onCancel}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => onSave(configurations)}
                disabled={enabledAgentsCount === 0}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckIcon className="h-4 w-4 mr-2" />
                Save Configuration
              </button>
            </div>
          </div>

          {enabledAgentsCount === 0 && (
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
                <div className="ml-3">
                  <p className="text-sm text-yellow-800">
                    At least one agent must be enabled to save the configuration.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};