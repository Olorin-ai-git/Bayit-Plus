import React, { useCallback } from 'react';
import {
  Database,
  Activity,
  AlertTriangle,
  CheckCircle,
  Info,
  MapPin,
  Network,
  Monitor,
  FileText
} from 'lucide-react';

type DetailValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | DetailValue[]
  | { [key: string]: DetailValue };

interface AgentDetailsViewerProps {
  details: { [key: string]: DetailValue };
  agentType: string;
  className?: string;
}

// Label mapping for user-friendly display
const labelMap: Record<string, string> = {
  risk_level: 'Risk Score',
  thoughts: 'LLM Thoughts',
  location_signal_risk_assessment: 'Location Risk Assessment',
  network_risk_assessment: 'Network Risk Assessment',
  device_signal_risk_assessment: 'Device Risk Assessment'
};

const AgentDetailsViewer: React.FC<AgentDetailsViewerProps> = ({
  details,
  agentType,
  className = ""
}) => {
  // Generate unique keys to avoid React warnings
  const generateUniqueKey = useCallback((
    prefix: string,
    index: number,
    value: DetailValue,
    suffix?: string,
  ): string => {
    let valueStr = '';
    if (value === null) valueStr = 'null';
    else if (value === undefined) valueStr = 'undefined';
    else if (typeof value === 'object') {
      valueStr = `obj-${Object.keys(value as object).join('-')}-${Math.random()
        .toString(36)
        .substring(2, 8)}`;
    } else {
      valueStr = String(value).substring(0, 50);
    }

    const parts = [prefix, index, valueStr];
    if (suffix) parts.push(suffix);
    return parts.join('-');
  }, []);

  // Render value in user-friendly format
  const renderValue = useCallback((value: DetailValue): JSX.Element => {
    if (value === null || value === undefined) {
      return <span className="text-gray-400">null</span>;
    }

    if (typeof value === 'boolean') {
      return (
        <span className={value ? 'text-green-600' : 'text-red-600'}>
          {value.toString()}
        </span>
      );
    }

    if (typeof value === 'number') {
      return <span className="text-blue-600">{value}</span>;
    }

    if (typeof value === 'string') {
      return <span className="text-gray-700">{value}</span>;
    }

    if (Array.isArray(value)) {
      return (
        <ul className="list-disc pl-4 space-y-1">
          {value.map((item, index) => (
            <li key={generateUniqueKey('array-item', index, item)}>
              {renderValue(item)}
            </li>
          ))}
        </ul>
      );
    }

    if (typeof value === 'object') {
      return (
        <div className="pl-4 border-l-2 border-gray-200">
          {Object.entries(value).map(([key, val], index) => (
            <div
              key={generateUniqueKey('object', index, val, key)}
              className="py-1"
            >
              <span className="font-medium text-gray-900">{key}: </span>
              {renderValue(val)}
            </div>
          ))}
        </div>
      );
    }

    return <span>{String(value)}</span>;
  }, [generateUniqueKey]);

  // Get appropriate icon for agent type
  const getAgentIcon = () => {
    switch (agentType) {
      case 'Location Agent':
        return <MapPin className="w-5 h-5 text-blue-600" />;
      case 'Network Agent':
        return <Network className="w-5 h-5 text-purple-600" />;
      case 'Device Agent':
        return <Monitor className="w-5 h-5 text-green-600" />;
      case 'Log Agent':
        return <FileText className="w-5 h-5 text-orange-600" />;
      default:
        return <Activity className="w-5 h-5 text-gray-600" />;
    }
  };

  // Render structured sections based on data content
  const renderStructuredData = () => {
    const sections = [];
    const processedKeys = new Set<string>();

    // Risk assessments
    const riskKeys = Object.keys(details).filter(key =>
      key.includes('risk_assessment') || key.includes('risk_level')
    );

    if (riskKeys.length > 0) {
      sections.push(
        <div key="risk-section" className="bg-red-50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <h4 className="font-medium text-gray-900">Risk Assessment</h4>
          </div>
          <div className="space-y-2">
            {riskKeys.map((key, index) => {
              processedKeys.add(key);
              return (
                <div key={generateUniqueKey('risk', index, details[key], key)} className="pl-4 border-l-2 border-red-300">
                  <span className="font-medium text-gray-900">
                    {labelMap[key] || key}:{' '}
                  </span>
                  {renderValue(details[key])}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // LLM thoughts
    if (details.llm_thoughts || details.thoughts) {
      const thoughtsData = details.llm_thoughts || details.thoughts;
      processedKeys.add('llm_thoughts');
      processedKeys.add('thoughts');

      sections.push(
        <div key="thoughts-section" className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <Info className="w-4 h-4 text-blue-600" />
            <h4 className="font-medium text-gray-900">AI Analysis</h4>
          </div>
          <div className="pl-4 border-l-2 border-blue-300">
            {renderValue(thoughtsData)}
          </div>
        </div>
      );
    }

    // Extracted signals
    const signalKeys = Object.keys(details).filter(key =>
      key.includes('extracted_') || key.includes('_signals')
    );

    if (signalKeys.length > 0) {
      sections.push(
        <div key="signals-section" className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <h4 className="font-medium text-gray-900">Extracted Signals</h4>
          </div>
          <div className="space-y-2">
            {signalKeys.map((key, index) => {
              processedKeys.add(key);
              return (
                <div key={generateUniqueKey('signal', index, details[key], key)}>
                  <span className="font-medium text-gray-700">{key}:</span>
                  <div className="mt-1">{renderValue(details[key])}</div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // Raw data
    const rawKeys = Object.keys(details).filter(key =>
      key.includes('raw_') || key.includes('splunk_')
    );

    if (rawKeys.length > 0) {
      sections.push(
        <div key="raw-section" className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <Database className="w-4 h-4 text-gray-600" />
            <h4 className="font-medium text-gray-900">Raw Data</h4>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {rawKeys.map((key, index) => {
              processedKeys.add(key);
              const data = details[key];
              if (Array.isArray(data) && data.length > 5) {
                return (
                  <div key={generateUniqueKey('raw', index, data, key)}>
                    <span className="font-medium text-gray-700">{key} ({data.length} records):</span>
                    <div className="mt-1 text-sm">{renderValue(data.slice(0, 3))}</div>
                    <p className="text-xs text-gray-500 italic">... and {data.length - 3} more records</p>
                  </div>
                );
              }
              return (
                <div key={generateUniqueKey('raw', index, data, key)}>
                  <span className="font-medium text-gray-700">{key}:</span>
                  <div className="mt-1">{renderValue(data)}</div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // Additional details
    const additionalKeys = Object.keys(details).filter(key => !processedKeys.has(key));

    if (additionalKeys.length > 0) {
      sections.push(
        <div key="additional-section" className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Additional Information</h4>
          <div className="space-y-2">
            {additionalKeys.map((key, index) => (
              <div key={generateUniqueKey('additional', index, details[key], key)} className="py-1">
                <span className="font-medium text-gray-900">{key}: </span>
                {renderValue(details[key])}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return sections;
  };

  if (!details || Object.keys(details).length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No agent details available</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-2">
          {getAgentIcon()}
          <h3 className="text-lg font-semibold text-gray-900">
            {agentType} Details
          </h3>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {renderStructuredData()}
      </div>
    </div>
  );
};

export default AgentDetailsViewer;