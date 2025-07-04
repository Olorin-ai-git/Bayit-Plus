import React from 'react';
import { EnhancedChatMessage } from '../../../types/EnhancedChatMessage';

export interface BaseViewProps {
  message: EnhancedChatMessage;
  onExport?: (format: string) => void;
  className?: string;
}

export interface ViewComponentConfig {
  exportFormats?: string[];
  supportsPagination?: boolean;
  supportsSearch?: boolean;
  supportsSorting?: boolean;
  supportsFiltering?: boolean;
}

export abstract class BaseViewComponent extends React.Component<BaseViewProps> {
  protected config: ViewComponentConfig = {
    exportFormats: ['json'],
    supportsPagination: false,
    supportsSearch: false,
    supportsSorting: false,
    supportsFiltering: false,
  };

  abstract render(): React.ReactNode;

  protected handleExport = (format: string) => {
    if (this.props.onExport) {
      this.props.onExport(format);
    }
  };

  protected getDefaultClassName(): string {
    return 'base-view-component p-4';
  }

  protected getClassName(): string {
    return `${this.getDefaultClassName()} ${this.props.className || ''}`.trim();
  }

  protected getStructuredData() {
    return this.props.message.structured_data;
  }

  protected getData() {
    return this.props.message.structured_data?.data || [];
  }

  protected getColumns() {
    return this.props.message.structured_data?.columns || [];
  }

  protected getMetadata() {
    return this.props.message.structured_data?.metadata;
  }

  protected renderEmptyState(message: string = 'No data available') {
    return (
      <div className="flex items-center justify-center p-8 text-gray-500">
        <div className="text-center">
          <p className="text-lg font-medium mb-2">No Data</p>
          <p className="text-sm">{message}</p>
        </div>
      </div>
    );
  }

  protected renderErrorState(error: string) {
    return (
      <div className="flex items-center justify-center p-8 text-red-500">
        <div className="text-center">
          <p className="text-lg font-medium mb-2">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }
}

export default BaseViewComponent;
