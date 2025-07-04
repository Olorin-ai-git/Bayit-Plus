/**
 * Base View Component interface for RAG data visualization
 */

import { EnhancedChatMessage } from '../../../types/EnhancedChatMessage';

export interface BaseViewProps {
  message: EnhancedChatMessage;
  onExport?: (format: string, data?: any) => void;
  className?: string;
}

export interface ViewComponentConfig {
  name: string;
  displayName: string;
  icon: string;
  description: string;
  supportedDataTypes: string[];
  defaultProps?: Record<string, any>;
}
