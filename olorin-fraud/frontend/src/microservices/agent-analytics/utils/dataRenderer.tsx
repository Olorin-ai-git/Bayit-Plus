
type DetailValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | DetailValue[]
  | { [key: string]: DetailValue };

interface DataRendererOptions {
  maxArrayItems?: number;
  maxStringLength?: number;
  showNullValues?: boolean;
  colorizeTypes?: boolean;
}

class DataRenderer {
  private options: Required<DataRendererOptions>;

  constructor(options: DataRendererOptions = {}) {
    this.options = {
      maxArrayItems: options.maxArrayItems ?? 5,
      maxStringLength: options.maxStringLength ?? 500,
      showNullValues: options.showNullValues ?? true,
      colorizeTypes: options.colorizeTypes ?? true
    };
  }

  // Generate unique keys for React components
  generateKey(prefix: string, index: number, value: DetailValue, suffix?: string): string {
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
  }

  // Render a value with appropriate formatting
  renderValue = (value: DetailValue): JSX.Element => {
    if (value === null || value === undefined) {
      if (!this.options.showNullValues) {
        return <></>;
      }
      return <span className="text-gray-400 italic">null</span>;
    }

    if (typeof value === 'boolean') {
      const colorClass = this.options.colorizeTypes
        ? (value ? 'text-green-600' : 'text-red-600')
        : 'text-gray-700';
      return (
        <span className={colorClass}>
          {value.toString()}
        </span>
      );
    }

    if (typeof value === 'number') {
      const colorClass = this.options.colorizeTypes ? 'text-blue-600' : 'text-gray-700';
      return <span className={colorClass}>{value}</span>;
    }

    if (typeof value === 'string') {
      const displayValue = this.options.maxStringLength > 0 && value.length > this.options.maxStringLength
        ? `${value.substring(0, this.options.maxStringLength)}...`
        : value;

      return <span className="text-gray-700 break-words">{displayValue}</span>;
    }

    if (Array.isArray(value)) {
      return this.renderArray(value);
    }

    if (typeof value === 'object') {
      return this.renderObject(value);
    }

    return <span className="text-gray-700">{String(value)}</span>;
  };

  // Render array values
  private renderArray = (array: DetailValue[]): JSX.Element => {
    const displayArray = this.options.maxArrayItems > 0 && array.length > this.options.maxArrayItems
      ? array.slice(0, this.options.maxArrayItems)
      : array;

    return (
      <div className="space-y-1">
        <ul className="list-disc pl-4 space-y-1">
          {displayArray.map((item, index) => (
            <li key={this.generateKey('array-item', index, item)}>
              {this.renderValue(item)}
            </li>
          ))}
        </ul>
        {this.options.maxArrayItems > 0 && array.length > this.options.maxArrayItems && (
          <p className="text-xs text-gray-500 italic pl-4">
            ... and {array.length - this.options.maxArrayItems} more items
          </p>
        )}
      </div>
    );
  };

  // Render object values
  private renderObject = (obj: { [key: string]: DetailValue }): JSX.Element => {
    return (
      <div className="pl-4 border-l-2 border-gray-200 space-y-1">
        {Object.entries(obj).map(([key, val], index) => (
          <div
            key={this.generateKey('object', index, val, key)}
            className="flex items-start space-x-2"
          >
            <span className="font-medium text-gray-900 flex-shrink-0 min-w-0">
              {key}:
            </span>
            <div className="flex-1 min-w-0">
              {this.renderValue(val)}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render vector search results
  renderVectorSearchResults = (results: DetailValue): JSX.Element => {
    if (!results || typeof results !== 'object') {
      return <span className="text-gray-500">Invalid vector search data</span>;
    }

    const data = results as { [key: string]: DetailValue };
    const { target_record, similar_records, total_candidates, total_results, max_results, distance_threshold, metadata } = data;

    const similarRecordsArray = Array.isArray(similar_records) ? similar_records : [];
    const distanceRange = (metadata as { [key: string]: DetailValue })?.distance_range as
      | { [key: string]: DetailValue } | undefined;

    return (
      <div className="space-y-3">
        {target_record && (
          <div>
            <span className="font-medium text-gray-900">Target Record:</span>
            <div className="mt-1">{this.renderValue(target_record)}</div>
          </div>
        )}

        {similarRecordsArray.length > 0 && (
          <div>
            <span className="font-medium text-gray-900">Similar Records ({similarRecordsArray.length}):</span>
            <div className="mt-1 space-y-2">
              {similarRecordsArray.slice(0, 3).map((record, index) => (
                <div key={this.generateKey('similar-record', index, record)} className="ml-4 p-2 bg-gray-50 rounded">
                  {this.renderValue(record)}
                </div>
              ))}
              {similarRecordsArray.length > 3 && (
                <p className="text-xs text-gray-500 italic ml-4">
                  ... and {similarRecordsArray.length - 3} more records
                </p>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Candidates:</span>
            <span className="ml-2">{this.renderValue(total_candidates)}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Results:</span>
            <span className="ml-2">{this.renderValue(total_results)}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Max Results:</span>
            <span className="ml-2">{this.renderValue(max_results)}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Threshold:</span>
            <span className="ml-2">{this.renderValue(distance_threshold)}</span>
          </div>
        </div>

        {distanceRange && (
          <div>
            <span className="font-medium text-gray-900">Distance Range:</span>
            <div className="mt-1 ml-4 text-sm space-y-1">
              <div>Min: {this.renderValue(distanceRange.min)}</div>
              <div>Max: {this.renderValue(distanceRange.max)}</div>
              <div>Avg: {this.renderValue(distanceRange.avg)}</div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render device intelligence results
  renderDeviceIntelligence = (diData: DetailValue): JSX.Element => {
    if (!diData || typeof diData !== 'object') {
      return <span className="text-gray-500">Invalid device intelligence data</span>;
    }

    const data = diData as { [key: string]: DetailValue };
    const { status, elapsedTime, errorMessage, parsedData } = data;

    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="font-medium text-gray-700">Status:</span>
            <span className="ml-2">{this.renderValue(status)}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Elapsed Time:</span>
            <span className="ml-2">{this.renderValue(elapsedTime)}</span>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded">
            <span className="font-medium text-red-800">Error:</span>
            <div className="mt-1 text-red-700">{this.renderValue(errorMessage)}</div>
          </div>
        )}

        {parsedData && (
          <div>
            <span className="font-medium text-gray-900">Parsed Data:</span>
            <div className="mt-2 p-3 bg-gray-100 rounded overflow-x-auto">
              <pre className="text-sm">
                {typeof parsedData === 'object'
                  ? JSON.stringify(parsedData, null, 2)
                  : String(parsedData)}
              </pre>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render structured sections based on data patterns
  renderStructuredSections = (data: { [key: string]: DetailValue }): JSX.Element[] => {
    const sections: JSX.Element[] = [];
    const processedKeys = new Set<string>();

    // Group keys by patterns
    const keyGroups = {
      risk: Object.keys(data).filter(key =>
        key.includes('risk') || key.includes('assessment')
      ),
      signals: Object.keys(data).filter(key =>
        key.includes('signal') || key.includes('extracted')
      ),
      raw: Object.keys(data).filter(key =>
        key.includes('raw_') || key.includes('splunk_')
      ),
      analysis: Object.keys(data).filter(key =>
        key.includes('thoughts') || key.includes('analysis')
      ),
      vector: Object.keys(data).filter(key =>
        key.includes('vector_search')
      ),
      device: Object.keys(data).filter(key =>
        key.includes('di_bb') || key.includes('device_intelligence')
      )
    };

    // Render each group as a section
    Object.entries(keyGroups).forEach(([groupName, keys]) => {
      if (keys.length === 0) return;

      keys.forEach(key => processedKeys.add(key));

      const sectionConfig = this.getSectionConfig(groupName);

      sections.push(
        <div key={`section-${groupName}`} className={sectionConfig.className}>
          <div className="flex items-center space-x-2 mb-3">
            {sectionConfig.icon}
            <h4 className="font-medium text-gray-900">{sectionConfig.title}</h4>
          </div>
          <div className="space-y-2">
            {keys.map((key, index) => (
              <div key={this.generateKey(groupName, index, data[key], key)}>
                <span className="font-medium text-gray-700">{key}:</span>
                <div className="mt-1">
                  {key.includes('vector_search') && this.renderVectorSearchResults(data[key])}
                  {key.includes('di_bb') && this.renderDeviceIntelligence(data[key])}
                  {!key.includes('vector_search') && !key.includes('di_bb') && this.renderValue(data[key])}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    });

    // Remaining ungrouped keys
    const remainingKeys = Object.keys(data).filter(key => !processedKeys.has(key));
    if (remainingKeys.length > 0) {
      sections.push(
        <div key="section-additional" className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Additional Information</h4>
          <div className="space-y-2">
            {remainingKeys.map((key, index) => (
              <div key={this.generateKey('additional', index, data[key], key)}>
                <span className="font-medium text-gray-700">{key}:</span>
                <div className="mt-1">{this.renderValue(data[key])}</div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return sections;
  };

  private getSectionConfig(groupName: string) {
    const configs = {
      risk: {
        title: 'Risk Assessment',
        className: 'bg-red-50 rounded-lg p-4',
        icon: <div className="w-4 h-4 bg-red-500 rounded" />
      },
      signals: {
        title: 'Extracted Signals',
        className: 'bg-green-50 rounded-lg p-4',
        icon: <div className="w-4 h-4 bg-green-500 rounded" />
      },
      raw: {
        title: 'Raw Data',
        className: 'bg-gray-50 rounded-lg p-4',
        icon: <div className="w-4 h-4 bg-gray-500 rounded" />
      },
      analysis: {
        title: 'AI Analysis',
        className: 'bg-blue-50 rounded-lg p-4',
        icon: <div className="w-4 h-4 bg-blue-500 rounded" />
      },
      vector: {
        title: 'Vector Search Results',
        className: 'bg-purple-50 rounded-lg p-4',
        icon: <div className="w-4 h-4 bg-purple-500 rounded" />
      },
      device: {
        title: 'Device Intelligence',
        className: 'bg-orange-50 rounded-lg p-4',
        icon: <div className="w-4 h-4 bg-orange-500 rounded" />
      }
    };

    return configs[groupName as keyof typeof configs] || {
      title: 'Data',
      className: 'bg-gray-50 rounded-lg p-4',
      icon: <div className="w-4 h-4 bg-gray-500 rounded" />
    };
  }
}

// Export a default instance and the class for custom configurations
export const defaultDataRenderer = new DataRenderer();
export { DataRenderer };
export type { DetailValue, DataRendererOptions };