/* eslint-disable camelcase */
import React from 'react';

type DetailValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | DetailValue[]
  | { [key: string]: DetailValue };

interface AgentDetailsTableProps {
  details: { [key: string]: DetailValue };
  agentType: string;
}

/**
 * AgentDetailsTable component displays agent details in a table format for Network, Location, Device, or Log agents.
 * @param {AgentDetailsTableProps} props - The details table props
 * @returns {JSX.Element} The rendered details table component
 */
const AgentDetailsTable: React.FC<AgentDetailsTableProps> = ({
  details,
  agentType,
}) => {
  if (!details) {
    return <div className="text-gray-500 italic">No details available</div>;
  }

  // Label mapping for user-friendly display
  const labelMap: Record<string, string> = {
    risk_level: 'Risk Score',
    thoughts: 'LLM Thoughts',
  };

  /**
   * Generates a unique key for React components to avoid duplicate key warnings.
   * @param {string} prefix - The prefix for the key
   * @param {number} index - The index in the array or object
   * @param {DetailValue} value - The value to include in the key
   * @param {string} [suffix] - Optional suffix for additional uniqueness
   * @returns {string} A unique key string
   */
  const generateUniqueKey = (
    prefix: string,
    index: number,
    value: DetailValue,
    suffix?: string,
  ): string => {
    let valueStr = '';
    if (value === null) valueStr = 'null';
    else if (value === undefined) valueStr = 'undefined';
    else if (typeof value === 'object') {
      // Use a hash of the object structure instead of full JSON.stringify
      valueStr = `obj-${Object.keys(value as object).join('-')}-${Math.random()
        .toString(36)
        .substring(2, 8)}`;
    } else {
      valueStr = String(value).substring(0, 50); // Limit length to avoid huge keys
    }

    const parts = [prefix, index, valueStr];
    if (suffix) parts.push(suffix);
    return parts.join('-');
  };

  /**
   * Renders a value in a user-friendly way for the details table.
   * @param {DetailValue} value - The value to render
   * @returns {JSX.Element} The rendered value
   */
  const renderValue = (value: DetailValue): JSX.Element => {
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
  };

  /**
   * Renders location details for the Location agent.
   * @returns {JSX.Element} The rendered location details
   */
  const renderLocationDetails = () => {
    const {
      splunk_locations = [],
      llm_thoughts,
      user_id,
      time,
      location_signal_risk_assessment,
      // Legacy fields to exclude from additional info
      location_info,
      risk_assessment,
      location_risk_assessment,
      device_risk_assessment,
      mapData,
      vector_search_results,
      ...rest
    } = details;

    const splunk_locations_array = Array.isArray(splunk_locations)
      ? splunk_locations
      : [];

    return (
      <div className="space-y-4">
        {/* Splunk Locations */}
        {splunk_locations_array.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="font-medium text-gray-900 mb-2">
              Splunk Locations
            </div>
            <div className="space-y-2">
              {splunk_locations_array.map((info: any, index: number) => (
                <div
                  key={generateUniqueKey('splunk-location', index, info)}
                  className="pl-4 border-l-2 border-gray-200"
                >
                  <div className="font-medium text-gray-700 mb-1">
                    {info.fuzzy_device_id || 'Unknown Device'}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-start">
                      <span className="font-medium text-gray-600 w-32">
                        City:
                      </span>
                      <span className="text-gray-700">
                        {info.city || 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-start">
                      <span className="font-medium text-gray-600 w-32">
                        Country:
                      </span>
                      <span className="text-gray-700">
                        {info.country || 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-start">
                      <span className="font-medium text-gray-600 w-32">
                        Countries:
                      </span>
                      <span className="text-gray-700">
                        {Array.isArray(info.countries)
                          ? info.countries.join(', ')
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-start">
                      <span className="font-medium text-gray-600 w-32">
                        Time:
                      </span>
                      <span className="text-gray-700">
                        {info.time || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Location Signal Risk Assessment */}
        {location_signal_risk_assessment && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="font-medium text-gray-900 mb-2">
              Location Signal Risk Assessment
            </div>
            <div className="pl-4 border-l-2 border-gray-200">
              {Object.entries(location_signal_risk_assessment).map(
                ([key, value], index) => (
                  <div
                    key={generateUniqueKey(
                      'location-signal',
                      index,
                      value,
                      key,
                    )}
                    className="py-1"
                  >
                    <span className="font-medium text-gray-900">
                      {labelMap[key] || key}:{' '}
                    </span>
                    {renderValue(value)}
                  </div>
                ),
              )}
            </div>
          </div>
        )}

        {/* LLM Thoughts Risk Assessment */}
        {llm_thoughts && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="font-medium text-gray-900 mb-2">LLM Thoughts</div>
            <div className="pl-4 border-l-2 border-gray-200">
              {Object.entries(llm_thoughts).map(([key, value], index) => (
                <div
                  key={generateUniqueKey('llm-thoughts', index, value, key)}
                  className="py-1"
                >
                  <span className="font-medium text-gray-900">
                    {labelMap[key] || key}:{' '}
                  </span>
                  {renderValue(value)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vector Search Results */}
        {vector_search_results && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="font-medium text-gray-900 mb-2">
              Vector Search Results
            </div>
            <div className="pl-4 border-l-2 border-gray-200 space-y-2">
              {renderVectorSearchResults(vector_search_results)}
            </div>
          </div>
        )}

        {/* Additional Details - only show non-null values */}
        {Object.entries(rest)
          .filter(([, value]) => value !== null && value !== undefined)
          .map(([key, value], index) => (
            <div
              key={generateUniqueKey('rest', index, value, key)}
              className="py-1"
            >
              {renderValue(value as DetailValue)}
            </div>
          ))}
      </div>
    );
  };

  /**
   * Renders network details for the Network agent.
   * @returns {JSX.Element} The rendered network details
   */
  const renderNetworkDetails = () => {
    const {
      extracted_network_signals = [],
      network_risk_assessment,
      ...rest
    } = details;
    const extracted_network_signals_array = Array.isArray(
      extracted_network_signals,
    )
      ? extracted_network_signals
      : [];

    return (
      <div className="space-y-4">
        {/* Extracted Network Signals */}
        {extracted_network_signals_array.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="font-medium text-gray-900 mb-2">
              Extracted Network Signals
            </div>
            <div className="space-y-2">
              {extracted_network_signals_array.map(
                (signal: any, signalIndex: number) => (
                  <div
                    key={generateUniqueKey(
                      'network-signal',
                      signalIndex,
                      signal,
                    )}
                    className="pl-4 border-l-2 border-gray-200"
                  >
                    {Object.entries(signal).map(([key, value], entryIndex) => (
                      <div
                        key={generateUniqueKey(
                          'network-signal-entry',
                          entryIndex,
                          value as DetailValue,
                          `${signalIndex}-${key}`,
                        )}
                        className="flex items-start"
                      >
                        <span className="font-medium text-gray-600 w-32">
                          {key}:
                        </span>
                        <span className="text-gray-700">
                          {value === null ? 'null' : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                ),
              )}
            </div>
          </div>
        )}
        {/* Network Risk Assessment */}
        {network_risk_assessment && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="font-medium text-gray-900 mb-2">
              Network Risk Assessment
            </div>
            <div className="pl-4 border-l-2 border-gray-200">
              {Object.entries(network_risk_assessment).map(
                ([key, value], index) => (
                  <div
                    key={generateUniqueKey('network-risk', index, value, key)}
                    className="py-1"
                  >
                    <span className="font-medium text-gray-900">
                      {labelMap[key] || key}:{' '}
                    </span>
                    {renderValue(value)}
                  </div>
                ),
              )}
            </div>
          </div>
        )}
        {/* Additional Details */}
        {Object.keys(rest).length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="font-medium text-gray-900 mb-2">
              Additional Information
            </div>
            <div className="pl-4 border-l-2 border-gray-200">
              {Object.entries(rest).map(([key, value], index) => (
                <div
                  key={generateUniqueKey('network-rest', index, value, key)}
                  className="py-1"
                >
                  <span className="font-medium text-gray-900">{key}: </span>
                  {renderValue(value as DetailValue)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  /**
   * Renders device details for the Device agent.
   * @returns {JSX.Element} The rendered device details
   */
  const renderDeviceDetails = () => {
    const {
      raw_splunk_results = [],
      extracted_device_signals = [],
      device_signal_risk_assessment,

      di_tool_warning,
      llm_thoughts,
      // Legacy fields for backward compatibility
      current_device,
      device_history,
      risk_assessment,
      di_bb,

      ...rest
    } = details;

    const raw_splunk_results_array = Array.isArray(raw_splunk_results)
      ? raw_splunk_results
      : [];
    const extracted_device_signals_array = Array.isArray(
      extracted_device_signals,
    )
      ? extracted_device_signals
      : [];
    const device_history_array = Array.isArray(device_history)
      ? device_history
      : [];
    const di_bb_object = typeof di_bb === 'object' ? di_bb : {};

    // const anomalies_array = Array.isArray(details.anomalies)
    //   ? details.anomalies
    //   : [];

    return (
      <div className="space-y-4">
        {/* Raw Splunk Results */}
        {raw_splunk_results_array.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="font-medium text-gray-900 mb-2">
              Raw Splunk Results ({raw_splunk_results_array.length} records)
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {raw_splunk_results_array
                .slice(0, 5)
                .map((result: any, index: number) => (
                  <div
                    key={generateUniqueKey('splunk-result', index, result)}
                    className="pl-4 border-l-2 border-gray-200 text-xs"
                  >
                    <div className="font-medium text-gray-700 mb-1">
                      Record {index + 1}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="font-medium">Time:</span> {result.time}
                      </div>
                      <div>
                        <span className="font-medium">Device ID:</span>{' '}
                        {result.device_id || 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium">Fuzzy Device ID:</span>{' '}
                        {result.fuzzy_device_id || 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium">True IP:</span>{' '}
                        {result.true_ip || 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium">City:</span>{' '}
                        {result.true_ip_city || 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium">Region:</span>{' '}
                        {result.true_ip_region || 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium">Session ID:</span>{' '}
                        {result.tm_sessionid || 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium">olorin TID:</span>{' '}
                        {result.olorin_tid}
                      </div>
                    </div>
                  </div>
                ))}
              {raw_splunk_results_array.length > 5 && (
                <div className="text-xs text-gray-500 italic">
                  ... and {raw_splunk_results_array.length - 5} more records
                </div>
              )}
            </div>
          </div>
        )}

        {/* Extracted Device Signals */}
        {extracted_device_signals_array.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="font-medium text-gray-900 mb-2">
              Extracted Device Signals ({extracted_device_signals_array.length}{' '}
              signals)
            </div>
            <div className="space-y-2">
              {extracted_device_signals_array.map(
                (signal: any, index: number) => (
                  <div
                    key={generateUniqueKey('device-signal', index, signal)}
                    className="pl-4 border-l-2 border-gray-200"
                  >
                    <div className="font-medium text-gray-700 mb-1">
                      {signal.fuzzy_device_id || signal.olorin_tid}
                    </div>
                    <div className="space-y-1 text-sm">
                      {signal.true_ip && (
                        <div>
                          <span className="font-medium text-gray-600">IP:</span>{' '}
                          {signal.true_ip}
                        </div>
                      )}
                      {signal.true_ip_city && (
                        <div>
                          <span className="font-medium text-gray-600">
                            City:
                          </span>{' '}
                          {signal.true_ip_city}
                        </div>
                      )}
                      {signal.true_ip_region && (
                        <div>
                          <span className="font-medium text-gray-600">
                            Region:
                          </span>{' '}
                          {signal.true_ip_region}
                        </div>
                      )}
                      {signal.tm_sessionid && (
                        <div>
                          <span className="font-medium text-gray-600">
                            Session:
                          </span>{' '}
                          {signal.tm_sessionid}
                        </div>
                      )}
                      <div>
                        <span className="font-medium text-gray-600">Time:</span>{' '}
                        {signal.time}
                      </div>
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
        )}

        {/* Device Signal Risk Assessment */}
        {device_signal_risk_assessment && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="font-medium text-gray-900 mb-2">
              Device Signal Risk Assessment
            </div>
            <div className="pl-4 border-l-2 border-gray-200">
              {Object.entries(device_signal_risk_assessment).map(
                ([key, value], index) => (
                  <div
                    key={generateUniqueKey(
                      'device-signal-risk',
                      index,
                      value,
                      key,
                    )}
                    className="py-1"
                  >
                    <span className="font-medium text-gray-900">
                      {labelMap[key] || key}:{' '}
                    </span>
                    {renderValue(value)}
                  </div>
                ),
              )}
            </div>
          </div>
        )}

        {/* Warnings */}
        {di_tool_warning && (
          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="font-medium text-gray-900 mb-2">Warnings</div>
            <div className="pl-4 border-l-2 border-yellow-300">
              <div className="text-yellow-800 font-medium">
                DI Tool Warning: {String(di_tool_warning)}
              </div>
            </div>
          </div>
        )}

        {/* LLM Thoughts */}
        {llm_thoughts && (
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="font-medium text-gray-900 mb-2">LLM Thoughts</div>
            <div className="pl-4 border-l-2 border-blue-300">
              <div className="text-blue-800">
                {typeof llm_thoughts === 'string'
                  ? llm_thoughts
                  : JSON.stringify(llm_thoughts)}
              </div>
            </div>
          </div>
        )}

        {/* Legacy Device Details - for backward compatibility */}
        {current_device && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="font-medium text-gray-900 mb-2">Current Device</div>
            <div className="pl-4 border-l-2 border-gray-200">
              {Object.entries(current_device).map(([key, value], index) => (
                <div
                  key={generateUniqueKey('current-device', index, value, key)}
                  className="py-1"
                >
                  <span className="font-medium text-gray-900">{key}: </span>
                  {renderValue(value)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Legacy Device History */}
        {device_history_array.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="font-medium text-gray-900 mb-2">Device History</div>
            <div className="space-y-2">
              {device_history_array.map(
                (history: any, historyIndex: number) => (
                  <div
                    key={generateUniqueKey(
                      'device-history',
                      historyIndex,
                      history,
                    )}
                    className="pl-4 border-l-2 border-gray-200"
                  >
                    {Object.entries(history).map(([key, value], entryIndex) => (
                      <div
                        key={generateUniqueKey(
                          'device-history-entry',
                          entryIndex,
                          value as DetailValue,
                          `${historyIndex}-${key}`,
                        )}
                        className="py-1"
                      >
                        <span className="font-medium text-gray-900">
                          {key}:{' '}
                        </span>
                        {renderValue(value as DetailValue)}
                      </div>
                    ))}
                  </div>
                ),
              )}
            </div>
          </div>
        )}

        {/* Legacy Risk Assessment */}
        {risk_assessment && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="font-medium text-gray-900 mb-2">
              Risk Assessment
            </div>
            <div className="pl-4 border-l-2 border-gray-200">
              {Object.entries(risk_assessment).map(([key, value], index) => (
                <div
                  key={generateUniqueKey('risk-assessment', index, value, key)}
                  className="py-1"
                >
                  <span className="font-medium text-gray-900">
                    {labelMap[key] || key}:{' '}
                  </span>
                  {renderValue(value)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DI BB Results */}
        {di_bb_object && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="font-medium text-gray-900 mb-2">
              Device Intelligence (DI BB)
            </div>
            <div className="pl-4 border-l-2 border-gray-200 space-y-1">
              {renderDiBbResults(di_bb)}
            </div>
          </div>
        )}

        {/* Additional Details */}
        {Object.keys(rest).length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="font-medium text-gray-900 mb-2">
              Additional Information
            </div>
            <div className="pl-4 border-l-2 border-gray-200">
              {Object.entries(rest).map(([key, value], index) => (
                <div
                  key={generateUniqueKey(
                    'device-additional',
                    index,
                    value as DetailValue,
                    key,
                  )}
                  className="py-1"
                >
                  <span className="font-medium text-gray-900">{key}: </span>
                  {renderValue(value as DetailValue)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  /**
   * Renders log details for the Log agent.
   * @returns {JSX.Element} The rendered log details
   */
  const renderLogDetails = () => {
    const { behavior_patterns, anomalies, risk_assessment, ...rest } = details;
    const behavior_patterns_object =
      typeof behavior_patterns === 'object' ? behavior_patterns : {};
    const anomalies_array = Array.isArray(anomalies) ? anomalies : [];

    return (
      <div className="space-y-4">
        {/* Behavior Patterns */}
        {behavior_patterns_object && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="font-medium text-gray-900 mb-2">
              Behavior Patterns
            </div>
            <div className="pl-4 border-l-2 border-gray-200">
              {Object.entries(behavior_patterns_object).map(
                ([key, value], index) => (
                  <div
                    key={generateUniqueKey(
                      'behavior-pattern',
                      index,
                      value,
                      key,
                    )}
                    className="py-1"
                  >
                    <span className="font-medium text-gray-900">{key}: </span>
                    {renderValue(value as DetailValue)}
                  </div>
                ),
              )}
            </div>
          </div>
        )}

        {/* Anomalies */}
        {anomalies_array.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="font-medium text-gray-900 mb-2">Anomalies</div>
            <div className="space-y-2">
              {anomalies_array.map((anomaly: any, anomalyIndex: number) => (
                <div
                  key={generateUniqueKey('anomaly', anomalyIndex, anomaly)}
                  className="pl-4 border-l-2 border-gray-200"
                >
                  {Object.entries(anomaly).map(([key, value], index) => (
                    <div
                      key={generateUniqueKey(
                        'anomaly-entry',
                        index,
                        value as DetailValue,
                        `${anomalyIndex}-${key}`,
                      )}
                      className="py-1"
                    >
                      <span className="font-medium text-gray-900">{key}: </span>
                      {renderValue(value as DetailValue)}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Risk Assessment */}
        {risk_assessment && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="font-medium text-gray-900 mb-2">
              Risk Assessment
            </div>
            <div className="pl-4 border-l-2 border-gray-200">
              {Object.entries(risk_assessment).map(([key, value], index) => (
                <div
                  key={generateUniqueKey('log-risk', index, value, key)}
                  className="py-1"
                >
                  <span className="font-medium text-gray-900">
                    {labelMap[key] || key}:{' '}
                  </span>
                  {renderValue(value)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Additional Details */}
        {Object.keys(rest).length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="font-medium text-gray-900 mb-2">
              Additional Information
            </div>
            <div className="pl-4 border-l-2 border-gray-200">
              {Object.entries(rest).map(([key, value], index) => (
                <div
                  key={generateUniqueKey(
                    'log-additional',
                    index,
                    value as DetailValue,
                    key,
                  )}
                  className="py-1"
                >
                  <span className="font-medium text-gray-900">{key}: </span>
                  {renderValue(value as DetailValue)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  /**
   * Renders the appropriate details section based on the agent type.
   * @returns {JSX.Element} The rendered details section
   */
  const renderDetails = () => {
    switch (agentType) {
      case 'Location Agent':
        return renderLocationDetails();
      case 'Network Agent':
        return renderNetworkDetails();
      case 'Device Agent':
        return renderDeviceDetails();
      case 'Log Agent':
        return renderLogDetails();
      default:
        return (
          <div className="space-y-4">
            {Object.entries(details).map(([key, value], index) => (
              <div
                key={generateUniqueKey('default', index, value, key)}
                className="bg-gray-50 rounded-lg p-4"
              >
                <div className="font-medium text-gray-900 mb-2">{key}</div>
                {renderValue(value as DetailValue)}
              </div>
            ))}
          </div>
        );
    }
  };

  const renderVectorSearchResults = (vector_search_results: DetailValue) => {
    if (!vector_search_results || typeof vector_search_results !== 'object') {
      return null;
    }

    const results = vector_search_results as { [key: string]: DetailValue };
    const { target_record } = results;
    const similar_records = Array.isArray(results.similar_records)
      ? results.similar_records
      : [];
    const { total_candidates } = results;
    const { total_results } = results;
    const { max_results } = results;
    const { distance_threshold } = results;
    const metadata = results.metadata as
      | { [key: string]: DetailValue }
      | undefined;
    const distance_range = metadata?.distance_range as
      | { [key: string]: DetailValue }
      | undefined;

    return (
      <div className="space-y-4">
        <div>
          <span className="font-medium">Target Record:</span>
          {renderValue(target_record)}
        </div>
        <div>
          <span className="font-medium">Similar Records:</span>
          {similar_records.map((rec: DetailValue, index: number) => (
            <div key={index} className="ml-4">
              {renderValue(rec)}
            </div>
          ))}
        </div>
        <div>
          <span className="font-medium">Total Candidates:</span>
          {renderValue(total_candidates)}
        </div>
        <div>
          <span className="font-medium">Total Results:</span>
          {renderValue(total_results)}
        </div>
        <div>
          <span className="font-medium">Max Results:</span>
          {renderValue(max_results)}
        </div>
        <div>
          <span className="font-medium">Distance Threshold:</span>
          {renderValue(distance_threshold)}
        </div>
        {distance_range && (
          <div>
            <span className="font-medium">Distance Range:</span>
            <div className="ml-4">
              min: {renderValue(distance_range.min)}, max:{' '}
              {renderValue(distance_range.max)}, avg:{' '}
              {renderValue(distance_range.avg)}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderDiBbResults = (di_bb: DetailValue) => {
    if (!di_bb || typeof di_bb !== 'object') {
      return null;
    }

    const di_bb_object = di_bb as { [key: string]: DetailValue };
    const { status } = di_bb_object;
    const { elapsedTime } = di_bb_object;
    const { errorMessage } = di_bb_object;
    const { parsedData } = di_bb_object;

    return (
      <div className="space-y-4">
        <div>
          <span className="font-medium">Status:</span> {renderValue(status)}
        </div>
        <div>
          <span className="font-medium">Elapsed Time:</span>{' '}
          {renderValue(elapsedTime)}
        </div>
        {errorMessage && (
          <div className="text-red-500">
            <span className="font-medium">Error:</span>{' '}
            {renderValue(errorMessage)}
          </div>
        )}
        {parsedData && (
          <div>
            <span className="font-medium">Parsed Data:</span>
            <pre className="mt-2 p-2 bg-gray-100 rounded overflow-x-auto">
              {typeof parsedData === 'object'
                ? JSON.stringify(parsedData, null, 2)
                : String(parsedData)}
            </pre>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          {agentType} Details
        </h3>
      </div>
      <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
        {renderDetails()}
      </div>
    </div>
  );
};

export default AgentDetailsTable;
/* eslint-enable camelcase */
