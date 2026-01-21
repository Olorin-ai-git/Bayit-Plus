#!/bin/bash

# CVPlus Logging Integration Script
# Integrates @cvplus/logging across all components with appropriate log levels

set -e

echo "🚀 Starting CVPlus Logging Integration..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Log levels guide:
# DEBUG: Detailed information for debugging and development
# INFO: General information about application flow
# WARNING: Recoverable issues that need attention
# ERROR: Error conditions that affect functionality
# CRITICAL: Critical issues that may cause system failure

echo -e "${BLUE}📋 Log Levels Guide:${NC}"
echo -e "  ${GREEN}DEBUG${NC}    - Development info, detailed flow, internal state"
echo -e "  ${BLUE}INFO${NC}     - User actions, successful operations, key milestones"
echo -e "  ${YELLOW}WARNING${NC}  - Validation failures, recoverable issues, deprecated usage"
echo -e "  ${RED}ERROR${NC}    - Operation failures, exceptions, data corruption"
echo -e "  ${RED}CRITICAL${NC} - System failures, security violations, irrecoverable errors"
echo ""

# Frontend React Components
echo -e "${BLUE}📱 Integrating logging in Frontend React Components...${NC}"

FRONTEND_COMPONENTS=(
    "frontend/src/components/AuthGuard.tsx"
    "frontend/src/components/CVPreview.tsx"
    "frontend/src/components/FeatureSelectionPanel.tsx"
    "frontend/src/components/KeywordManager.tsx"
    "frontend/src/components/MobileFeatureSelection.tsx"
    "frontend/src/components/OutcomeTracker.tsx"
    "frontend/src/components/QRCodeEditor.tsx"
    "frontend/src/components/SectionEditor.tsx"
    "frontend/src/components/session/SaveProgressButton.tsx"
    "frontend/src/components/session/SessionAwarePageWrapper.tsx"
    "frontend/src/components/progress/ProgressStageIndicator.tsx"
    "frontend/src/components/features/ChatInterface.tsx"
    "frontend/src/components/features/PersonalityInsights.tsx"
    "frontend/src/components/features/SkillsVisualization.tsx"
    "frontend/src/components/features/PublicProfile.tsx"
    "frontend/src/components/features/SocialMediaLinks.tsx"
    "frontend/src/components/recommendations/RecommendationWizard.tsx"
    "frontend/src/components/recommendations/EnhancedRecommendationCard.tsx"
)

# Backend Firebase Functions
echo -e "${BLUE}⚡ Integrating logging in Backend Firebase Functions...${NC}"

BACKEND_FUNCTIONS=(
    "functions/src/scripts/functions/sendSchedulingEmail.ts"
    "functions/src/scripts/functions/calendarIntegration.ts"
    "functions/src/scripts/functions/generateAvailabilityCalendar.ts"
)

# Service Layer Components
echo -e "${BLUE}🔧 Integrating logging in Service Layer Components...${NC}"

SERVICE_COMPONENTS=(
    "frontend/src/services/cv/CVServiceCore.ts"
    "frontend/src/services/cvService.ts"
)

# Create logging integration examples for different component types
create_react_component_example() {
    local component_path="$1"
    local component_name="$2"

    echo -e "${GREEN}📄 Creating React component logging example: ${component_name}${NC}"

    cat > "/tmp/${component_name}_logging_example.tsx" << 'EOF'
import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '@cvplus/logging';

interface ExampleComponentProps {
  userId?: string;
  data?: any;
  onUpdate?: (data: any) => void;
}

export const ExampleComponent: React.FC<ExampleComponentProps> = ({
  userId,
  data,
  onUpdate
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Component mount/unmount logging
  useEffect(() => {
    logger.logDebug(`${componentName}: Component mounted`, {
      event: '${componentName.toLowerCase()}.component.mounted',
      userId,
      hasData: !!data,
      component: '${componentName}'
    });

    return () => {
      logger.logDebug(`${componentName}: Component unmounting`, {
        event: '${componentName.toLowerCase()}.component.unmounting',
        userId,
        component: '${componentName}'
      });
    };
  }, [userId, data]);

  // User action logging (INFO level)
  const handleUserAction = useCallback(async (actionType: string, payload: any) => {
    logger.logInfo(`${componentName}: User action initiated`, {
      event: '${componentName.toLowerCase()}.user.action_initiated',
      actionType,
      userId,
      component: '${componentName}'
    });

    setLoading(true);
    setError(null);

    try {
      // Simulate API call or processing
      logger.logDebug(`${componentName}: Processing ${actionType}`, {
        event: '${componentName.toLowerCase()}.processing.started',
        actionType,
        payloadKeys: Object.keys(payload || {}),
        userId,
        component: '${componentName}'
      });

      // Process action...
      const result = await processAction(actionType, payload);

      logger.logInfo(`${componentName}: Action completed successfully`, {
        event: '${componentName.toLowerCase()}.processing.success',
        actionType,
        resultType: typeof result,
        hasResult: !!result,
        userId,
        component: '${componentName}'
      });

      onUpdate?.(result);

    } catch (error) {
      logger.logError(`${componentName}: Action failed`, error as Error, {
        event: '${componentName.toLowerCase()}.processing.failed',
        actionType,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        userId,
        component: '${componentName}'
      });

      setError(error instanceof Error ? error.message : 'An error occurred');

    } finally {
      setLoading(false);
    }
  }, [userId, onUpdate]);

  // Validation logging (WARNING level)
  const validateInput = useCallback((input: any): boolean => {
    if (!input) {
      logger.logWarning(`${componentName}: Input validation failed`, {
        event: '${componentName.toLowerCase()}.validation.failed',
        reason: 'missing_input',
        userId,
        component: '${componentName}'
      });
      return false;
    }

    if (typeof input !== 'object') {
      logger.logWarning(`${componentName}: Invalid input type`, {
        event: '${componentName.toLowerCase()}.validation.failed',
        reason: 'invalid_type',
        inputType: typeof input,
        userId,
        component: '${componentName}'
      });
      return false;
    }

    logger.logDebug(`${componentName}: Input validation passed`, {
      event: '${componentName.toLowerCase()}.validation.passed',
      inputKeys: Object.keys(input),
      userId,
      component: '${componentName}'
    });

    return true;
  }, [userId]);

  // Critical error handling (CRITICAL level)
  const handleCriticalError = useCallback((error: Error, context: string) => {
    logger.logCritical(`${componentName}: Critical system error`, error, {
      event: '${componentName.toLowerCase()}.system.critical_error',
      context,
      errorMessage: error.message,
      stack: error.stack,
      userId,
      component: '${componentName}',
      criticalFailure: true
    });
  }, [userId]);

  return (
    <div className="example-component">
      {/* Component JSX */}
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
    </div>
  );
};

// Helper function for processing actions
async function processAction(actionType: string, payload: any): Promise<any> {
  // Implementation depends on action type
  return { success: true, data: payload };
}
EOF

    echo -e "${GREEN}✅ Created React component logging example${NC}"
}

# Create Firebase function logging example
create_firebase_function_example() {
    echo -e "${GREEN}📄 Creating Firebase function logging example${NC}"

    cat > "/tmp/firebase_function_logging_example.ts" << 'EOF'
import { onCall } from 'firebase-functions/v2/https';
import { logger } from '@cvplus/logging';

export const exampleFunction = onCall(
  { timeoutSeconds: 60 },
  async (request) => {
    // Function entry logging (INFO level)
    logger.logInfo('ExampleFunction: Function invoked', {
      event: 'example.function.invoked',
      hasAuth: !!request.auth,
      dataKeys: Object.keys(request.data || {}),
      function: 'exampleFunction'
    });

    try {
      // Input validation logging (WARNING for failures)
      const { param1, param2 } = request.data;

      if (!param1) {
        logger.logWarning('ExampleFunction: Missing required parameter', {
          event: 'example.function.validation_failed',
          field: 'param1',
          function: 'exampleFunction'
        });
        throw new Error('param1 is required');
      }

      // Authentication logging (CRITICAL for security)
      if (!request.auth) {
        logger.logCritical('ExampleFunction: Unauthorized access attempt', new Error('Unauthorized'), {
          event: 'example.function.unauthorized_access',
          securityViolation: true,
          function: 'exampleFunction'
        });
        throw new Error('Authentication required');
      }

      const userId = request.auth.uid;

      // Processing steps logging (DEBUG level)
      logger.logDebug('ExampleFunction: Starting data processing', {
        event: 'example.function.processing_started',
        userId,
        function: 'exampleFunction'
      });

      // Database operations logging (INFO level)
      logger.logInfo('ExampleFunction: Database operation started', {
        event: 'example.function.database_operation',
        operationType: 'read',
        userId,
        function: 'exampleFunction'
      });

      // Simulate database call
      const result = await performDatabaseOperation(param1, param2);

      logger.logInfo('ExampleFunction: Database operation completed', {
        event: 'example.function.database_success',
        resultCount: result?.length || 0,
        userId,
        function: 'exampleFunction'
      });

      // Success logging (INFO level)
      logger.logInfo('ExampleFunction: Function completed successfully', {
        event: 'example.function.success',
        processingTime: Date.now() - startTime,
        userId,
        function: 'exampleFunction'
      });

      return {
        success: true,
        data: result
      };

    } catch (error) {
      // Error logging (ERROR level)
      logger.logError('ExampleFunction: Function execution failed', error as Error, {
        event: 'example.function.failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        function: 'exampleFunction'
      });

      throw error;
    }
  }
);

async function performDatabaseOperation(param1: string, param2: string): Promise<any> {
  // Database operation implementation
  return [];
}
EOF

    echo -e "${GREEN}✅ Created Firebase function logging example${NC}"
}

# Create service layer logging example
create_service_layer_example() {
    echo -e "${GREEN}📄 Creating Service layer logging example${NC}"

    cat > "/tmp/service_layer_logging_example.ts" << 'EOF'
import { logger } from '@cvplus/logging';

export class ExampleService {
  private serviceName = 'ExampleService';

  // Constructor logging
  constructor(private config: any) {
    logger.logDebug(`${this.serviceName}: Service initialized`, {
      event: 'service.example.initialized',
      hasConfig: !!config,
      service: this.serviceName
    });
  }

  // Public method with comprehensive logging
  async processData(userId: string, data: any): Promise<any> {
    const methodName = 'processData';

    // Method entry logging
    logger.logInfo(`${this.serviceName}: Processing data request`, {
      event: 'service.example.process_data.started',
      userId,
      dataSize: JSON.stringify(data).length,
      service: this.serviceName,
      method: methodName
    });

    try {
      // Input validation (WARNING for failures)
      if (!this.validateInput(data)) {
        logger.logWarning(`${this.serviceName}: Invalid input data`, {
          event: 'service.example.validation_failed',
          userId,
          dataType: typeof data,
          service: this.serviceName,
          method: methodName
        });
        throw new Error('Invalid input data');
      }

      // Processing steps (DEBUG level)
      logger.logDebug(`${this.serviceName}: Data validation passed`, {
        event: 'service.example.validation_passed',
        userId,
        service: this.serviceName,
        method: methodName
      });

      // Business logic execution
      const result = await this.executeBusinessLogic(data);

      // Success logging
      logger.logInfo(`${this.serviceName}: Data processed successfully`, {
        event: 'service.example.process_data.success',
        userId,
        resultSize: JSON.stringify(result).length,
        service: this.serviceName,
        method: methodName
      });

      return result;

    } catch (error) {
      // Error logging
      logger.logError(`${this.serviceName}: Data processing failed`, error as Error, {
        event: 'service.example.process_data.failed',
        userId,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        service: this.serviceName,
        method: methodName
      });

      throw error;
    }
  }

  // Private method logging (DEBUG level)
  private validateInput(data: any): boolean {
    logger.logDebug(`${this.serviceName}: Validating input data`, {
      event: 'service.example.validation.started',
      dataType: typeof data,
      service: this.serviceName
    });

    if (!data || typeof data !== 'object') {
      return false;
    }

    logger.logDebug(`${this.serviceName}: Input validation completed`, {
      event: 'service.example.validation.completed',
      isValid: true,
      service: this.serviceName
    });

    return true;
  }

  // Async method with error recovery (WARNING for recoverable errors)
  private async executeBusinessLogic(data: any): Promise<any> {
    try {
      // Simulate API call or complex processing
      logger.logDebug(`${this.serviceName}: Executing business logic`, {
        event: 'service.example.business_logic.started',
        service: this.serviceName
      });

      const result = await this.performComplexOperation(data);

      logger.logDebug(`${this.serviceName}: Business logic completed`, {
        event: 'service.example.business_logic.completed',
        service: this.serviceName
      });

      return result;

    } catch (error) {
      // Check if error is recoverable
      if (this.isRecoverableError(error)) {
        logger.logWarning(`${this.serviceName}: Recoverable error encountered`, {
          event: 'service.example.recoverable_error',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          service: this.serviceName
        });

        // Attempt recovery
        return await this.recoverFromError(data);
      }

      // Non-recoverable error
      throw error;
    }
  }

  private async performComplexOperation(data: any): Promise<any> {
    // Complex business logic implementation
    return { processed: true, data };
  }

  private isRecoverableError(error: any): boolean {
    // Logic to determine if error is recoverable
    return false;
  }

  private async recoverFromError(data: any): Promise<any> {
    logger.logInfo(`${this.serviceName}: Attempting error recovery`, {
      event: 'service.example.recovery.attempted',
      service: this.serviceName
    });

    // Recovery implementation
    return { recovered: true, data };
  }

  // Health check method (INFO level)
  async healthCheck(): Promise<boolean> {
    logger.logInfo(`${this.serviceName}: Health check started`, {
      event: 'service.example.health_check.started',
      service: this.serviceName
    });

    try {
      // Perform health check operations
      const isHealthy = true; // Check dependencies, database connections, etc.

      logger.logInfo(`${this.serviceName}: Health check completed`, {
        event: 'service.example.health_check.completed',
        isHealthy,
        service: this.serviceName
      });

      return isHealthy;

    } catch (error) {
      logger.logError(`${this.serviceName}: Health check failed`, error as Error, {
        event: 'service.example.health_check.failed',
        service: this.serviceName
      });

      return false;
    }
  }
}
EOF

    echo -e "${GREEN}✅ Created Service layer logging example${NC}"
}

# Create examples
create_react_component_example "AuthGuard" "AuthGuard"
create_firebase_function_example
create_service_layer_example

echo ""
echo -e "${BLUE}📊 Logging Best Practices Summary:${NC}"
echo ""
echo -e "${GREEN}🎯 Frontend React Components:${NC}"
echo "  • Component lifecycle (mount/unmount) - DEBUG level"
echo "  • User interactions (clicks, form submissions) - INFO level"
echo "  • Validation failures - WARNING level"
echo "  • API call errors - ERROR level"
echo "  • Critical React errors - CRITICAL level"
echo ""
echo -e "${GREEN}⚡ Backend Firebase Functions:${NC}"
echo "  • Function entry/exit - INFO level"
echo "  • Input validation - WARNING for failures"
echo "  • Database operations - INFO level"
echo "  • Processing steps - DEBUG level"
echo "  • Security violations - CRITICAL level"
echo ""
echo -e "${GREEN}🔧 Service Layer:${NC}"
echo "  • Method entry/exit - INFO level"
echo "  • Internal processing - DEBUG level"
echo "  • Validation errors - WARNING level"
echo "  • Business logic failures - ERROR level"
echo "  • System health issues - CRITICAL level"
echo ""
echo -e "${GREEN}📋 Standard Event Naming Convention:${NC}"
echo "  Format: domain.component.action[.result]"
echo "  Examples:"
echo "    • file.upload.file_accepted"
echo "    • meeting.book.calendar_invite_created"
echo "    • service.cv.validation_failed"
echo "    • auth.guard.unauthorized_access"
echo ""
echo -e "${GREEN}🔐 Security & Privacy:${NC}"
echo "  • Never log sensitive data (passwords, tokens, PII)"
echo "  • Use boolean flags (hasData: !!data) instead of actual values"
echo "  • Log security violations as CRITICAL level"
echo "  • Include userId for auditing (when available)"
echo ""
echo -e "${YELLOW}📁 Generated Examples Available:${NC}"
echo "  • /tmp/AuthGuard_logging_example.tsx"
echo "  • /tmp/firebase_function_logging_example.ts"
echo "  • /tmp/service_layer_logging_example.ts"
echo ""
echo -e "${GREEN}✅ CVPlus Logging Integration Guidance Complete!${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "  1. Review the generated examples"
echo "  2. Apply similar patterns to your components"
echo "  3. Use the @cvplus/logging package consistently"
echo "  4. Monitor logs through the Analytics Dashboard"
echo "  5. Adjust log levels based on production needs"