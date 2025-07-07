import { useState, useCallback, useRef, useEffect } from 'react';
import {
  AutonomousInvestigationClient,
  InvestigationEventHandler,
  InvestigationPhaseData,
  InvestigationStatusData,
  InvestigationErrorData,
} from '../services/AutonomousInvestigationClient';
import { LogLevel, LogEntry } from '../types/RiskAssessment';
import { isDemoModeActive } from '../utils/urlParams';

export interface AutonomousInvestigationState {
  isRunning: boolean;
  isPaused: boolean;
  investigationId: string | null;
  currentPhase: string | null;
  progress: number;
  results: Record<string, any>;
  error: string | null;
  executionMode: 'parallel' | 'sequential';
}

export interface AutonomousInvestigationControls {
  startInvestigation: (
    entityId: string,
    entityType: 'user_id' | 'device_id',
    parallel?: boolean,
  ) => Promise<void>;
  pauseInvestigation: () => void;
  resumeInvestigation: () => void;
  cancelInvestigation: () => void;
  stopInvestigation: () => void;
  setExecutionMode: (mode: 'parallel' | 'sequential') => void;
}

export interface UseAutonomousInvestigationOptions {
  onLog?: (message: string, level: LogLevel) => void;
  onComplete?: (results: Record<string, any>) => void;
  onPhaseUpdate?: (phase: string, progress: number, message: string) => void;
  onError?: (error: string) => void;
}

export function useAutonomousInvestigation(
  options: UseAutonomousInvestigationOptions = {},
): [AutonomousInvestigationState, AutonomousInvestigationControls] {
  const [state, setState] = useState<AutonomousInvestigationState>({
    isRunning: false,
    isPaused: false,
    investigationId: null,
    currentPhase: null,
    progress: 0,
    results: {},
    error: null,
    executionMode: 'parallel',
  });

  const clientRef = useRef<AutonomousInvestigationClient | null>(null);

  // Initialize client
  useEffect(() => {
    clientRef.current = new AutonomousInvestigationClient({
      parallel: state.executionMode === 'parallel',
    });
  }, [state.executionMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (clientRef.current) {
        clientRef.current.stopInvestigation();
      }
    };
  }, []);

  const updateState = useCallback(
    (updates: Partial<AutonomousInvestigationState>) => {
      setState((prev) => ({ ...prev, ...updates }));
    },
    [],
  );

  const startInvestigation = useCallback(
    async (
      entityId: string,
      entityType: 'user_id' | 'device_id' = 'user_id',
      parallel: boolean = true,
    ) => {
      if (!clientRef.current) {
        return;
      }

      try {
        // Reset state
        updateState({
          isRunning: false,
          isPaused: false,
          investigationId: null,
          currentPhase: 'initialization',
          progress: 0,
          results: {},
          error: null,
          executionMode: parallel ? 'parallel' : 'sequential',
        });

        // Update client execution mode
        clientRef.current = new AutonomousInvestigationClient({
          parallel,
        });

        const eventHandlers: InvestigationEventHandler = {
          onPhaseUpdate: (data: InvestigationPhaseData) => {
            updateState({
              currentPhase: data.phase,
              progress: data.progress,
              error: null,
            });

            // Store results
            if (data.agent_response) {
              setState((prev) => ({
                ...prev,
                results: { ...prev.results, [data.phase]: data.agent_response },
              }));
            }

            options.onPhaseUpdate?.(data.phase, data.progress, data.message);
          },

          onStatusUpdate: (data: InvestigationStatusData) => {
            const isPaused = data.status === 'PAUSED';
            const isRunning = data.status === 'IN_PROGRESS';

            updateState({
              isPaused,
              isRunning: isRunning || state.isRunning,
              currentPhase: data.current_phase || state.currentPhase,
              progress: data.progress || state.progress,
            });
          },

          onError: (data: InvestigationErrorData) => {
            const errorMsg = `${data.message} (${data.error_code})`;
            updateState({
              error: errorMsg,
              isRunning: false,
            });
            options.onError?.(errorMsg);
          },

          onComplete: (results: Record<string, any>) => {
            updateState({
              isRunning: false,
              isPaused: false,
              currentPhase: 'completed',
              progress: 1.0,
              results,
            });
            options.onComplete?.(results);
          },

          onCancelled: () => {
            updateState({
              isRunning: false,
              isPaused: false,
              currentPhase: 'cancelled',
              error: 'Investigation was cancelled',
            });
          },

          onLog: options.onLog,
        };

        // Start the investigation
        const investigationId = await clientRef.current.startInvestigation(
          entityId,
          entityType,
          eventHandlers,
        );

        updateState({
          isRunning: true,
          investigationId,
          currentPhase: 'initialization',
        });
      } catch (error) {
        const errorMsg =
          error instanceof Error
            ? error.message
            : 'Failed to start investigation';
        updateState({
          error: errorMsg,
          isRunning: false,
        });
        options.onError?.(errorMsg);
      }
    },
    [options, updateState, state.isRunning, state.currentPhase, state.progress],
  );

  const pauseInvestigation = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.pauseInvestigation();
      updateState({ isPaused: true });
    }
  }, [updateState]);

  const resumeInvestigation = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.resumeInvestigation();
      updateState({ isPaused: false });
    }
  }, [updateState]);

  const cancelInvestigation = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.cancelInvestigation();
      updateState({
        isRunning: false,
        isPaused: false,
        currentPhase: 'cancelled',
      });
    }
  }, [updateState]);

  const stopInvestigation = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.stopInvestigation();
      updateState({
        isRunning: false,
        isPaused: false,
        investigationId: null,
        currentPhase: null,
        progress: 0,
        error: null,
      });
    }
  }, [updateState]);

  const setExecutionMode = useCallback(
    (mode: 'parallel' | 'sequential') => {
      updateState({ executionMode: mode });
    },
    [updateState],
  );

  const controls: AutonomousInvestigationControls = {
    startInvestigation,
    pauseInvestigation,
    resumeInvestigation,
    cancelInvestigation,
    stopInvestigation,
    setExecutionMode,
  };

  return [state, controls];
}

// Investigation phases with realistic agent activities
interface InvestigationPhase {
  name: string;
  agent: string;
  tools: string[];
  duration: number; // in seconds
  logs: string[];
  llmResponse: string;
  progressStart: number;
  progressEnd: number;
  riskScore: number; // Individual risk score for this phase
  stepId?: string; // Corresponding step ID for updating step state
}

const INVESTIGATION_PHASES: InvestigationPhase[] = [
  {
    name: 'initialization',
    agent: 'Initialization Agent',
    tools: ['investigation_orchestrator', 'entity_validator'],
    duration: 3,
    logs: [
      'Starting autonomous investigation framework...',
      'Validating entity ID and investigation parameters...',
      'Initializing multi-agent coordination system...',
      'Setting up investigation workspace and data pipelines...'
    ],
    llmResponse: 'Investigation framework initialized successfully. Entity validation complete. Multi-agent system ready for coordinated analysis.',
    progressStart: 0,
    progressEnd: 15,
    riskScore: 0,
    stepId: 'initialization'
  },
  {
    name: 'network_analysis',
    agent: 'Network Agent',
    tools: ['ip_geolocation', 'network_topology_analyzer', 'vpn_detector', 'threat_intelligence_api'],
    duration: 5,
    logs: [
      'Analyzing network patterns and IP geolocation data...',
      'Running VPN/Proxy detection algorithms...',
      'Cross-referencing with threat intelligence databases...',
      'Examining network topology and connection patterns...',
      'Calculating network risk indicators and anomaly scores...'
    ],
    llmResponse: 'Network analysis reveals moderate risk indicators. IP geolocation suggests potential geographic inconsistencies. VPN usage detected with medium confidence. Threat intelligence shows no direct matches but flagged suspicious patterns.',
    progressStart: 15,
    progressEnd: 35,
    riskScore: 65,
    stepId: 'network'
  },
  {
    name: 'device_analysis',
    agent: 'Device Agent',
    tools: ['device_fingerprinter', 'browser_analyzer', 'mobile_device_detector', 'hardware_profiler'],
    duration: 4,
    logs: [
      'Extracting device fingerprints and hardware signatures...',
      'Analyzing browser characteristics and user agent patterns...',
      'Detecting mobile vs desktop device indicators...',
      'Profiling hardware capabilities and screen configurations...',
      'Cross-referencing device patterns with known fraud signatures...'
    ],
    llmResponse: 'Device analysis indicates potential device spoofing. Browser fingerprint shows inconsistencies with claimed device type. Hardware profile suggests emulation environment. Risk score elevated due to device anomalies.',
    progressStart: 35,
    progressEnd: 55,
    riskScore: 78,
    stepId: 'device'
  },
  {
    name: 'location_analysis',
    agent: 'Location Agent',
    tools: ['gps_analyzer', 'timezone_validator', 'location_velocity_calculator', 'geofence_checker'],
    duration: 4,
    logs: [
      'Processing GPS coordinates and location accuracy metrics...',
      'Validating timezone consistency with reported locations...',
      'Calculating travel velocity between location points...',
      'Checking geofence violations and restricted area access...',
      'Analyzing location pattern anomalies and impossible travel scenarios...'
    ],
    llmResponse: 'Location analysis reveals concerning patterns. GPS coordinates show impossible travel velocities between sessions. Timezone inconsistencies detected. Multiple geofence violations in high-risk areas. Location-based risk score significantly elevated.',
    progressStart: 55,
    progressEnd: 75,
    riskScore: 82,
    stepId: 'location'
  },
  {
    name: 'log_analysis',
    agent: 'Log Agent',
    tools: ['splunk_connector', 'log_pattern_analyzer', 'anomaly_detector', 'correlation_engine'],
    duration: 4,
    logs: [
      'Querying Splunk for historical activity patterns...',
      'Running pattern recognition on authentication logs...',
      'Detecting behavioral anomalies in session data...',
      'Correlating events across multiple data sources...',
      'Identifying suspicious activity clusters and outliers...'
    ],
    llmResponse: 'Log analysis reveals significant behavioral anomalies. Authentication patterns show unusual timing and frequency. Session data indicates automated or scripted behavior. Event correlation suggests coordinated fraud activity. High-confidence fraud indicators detected.',
    progressStart: 75,
    progressEnd: 90,
    riskScore: 89,
    stepId: 'log'
  },
  {
    name: 'risk_assessment',
    agent: 'Risk Assessment Agent',
    tools: ['ml_risk_model', 'fraud_scoring_engine', 'decision_tree_analyzer', 'ensemble_predictor'],
    duration: 3,
    logs: [
      'Aggregating findings from all investigation agents...',
      'Running machine learning risk models on collected evidence...',
      'Calculating composite fraud scores and confidence intervals...',
      'Generating final risk assessment and recommendations...',
      'Preparing investigation summary and action items...'
    ],
    llmResponse: 'Final risk assessment complete. ML models indicate HIGH FRAUD RISK (score: 87/100). Multiple risk factors detected across network, device, location, and behavioral patterns. Recommended actions: Account suspension, enhanced monitoring, and manual review required.',
    progressStart: 55,
    progressEnd: 60,
    riskScore: 87,
    stepId: 'risk-assessment'
  },
  {
    name: 'transaction_analysis',
    agent: 'Transaction Analysis Agent',
    tools: ['transaction_analysis', 'payment_intelligence', 'merchant_intelligence', 'temporal_analysis'],
    duration: 5,
    logs: [
      'Initializing transaction pattern analysis engine...',
      'Analyzing payment velocity: 47 transactions in last 24 hours detected...',
      'Unusual amount patterns identified: $999.99, $1000.00, $2500.00...',
      'Merchant risk profiling: 3 high-risk merchants flagged...',
      'Transaction timing analysis: Activity spike at 3-4 AM detected...',
      'Cross-referencing with known fraud patterns in database...'
    ],
    llmResponse: 'Transaction analysis reveals critical fraud indicators. Velocity exceeded normal threshold by 340%. Multiple round-amount transactions suggest testing behavior. High-risk merchant categories (cryptocurrency, gift cards) comprise 65% of recent activity. Pattern matches known card-not-present fraud schemes.',
    progressStart: 60,
    progressEnd: 68,
    riskScore: 91,
    stepId: 'transaction-analysis'
  },
  {
    name: 'account_behavior_analysis',
    agent: 'Account Behavior Agent',
    tools: ['account_behavior', 'ato_detection', 'digital_footprint', 'communication_analysis'],
    duration: 4,
    logs: [
      'Retrieving account activity history for behavioral analysis...',
      'Anomaly detected: Login from Russia at 3:45 AM (user typically in US)...',
      'Password changed 3 times in last 48 hours...',
      'Email and phone number updated after suspicious login...',
      '2FA disabled 1 hour before high-value transactions...',
      'Communication pattern shows phishing email interaction...'
    ],
    llmResponse: 'Account takeover confirmed with 94% confidence. Behavioral analysis shows classic ATO pattern: credentials compromised via phishing, security settings modified, followed by rapid fund extraction. Account shows signs of being sold on dark web markets based on access patterns.',
    progressStart: 68,
    progressEnd: 76,
    riskScore: 94,
    stepId: 'account-behavior'
  },
  {
    name: 'fraud_ring_detection',
    agent: 'Graph Analysis Agent',
    tools: ['graph_analysis', 'identity_verification', 'fraud_scoring'],
    duration: 5,
    logs: [
      'Building entity relationship graph from transaction data...',
      'Graph analysis: Entity connected to 23 other accounts...',
      'Shared attributes detected: 5 devices, 12 IP addresses, 3 payment methods...',
      'Centrality score 0.78 indicates key position in network...',
      'Coordinated activity patterns detected across connected accounts...',
      'ML fraud scoring: Network shows 89% probability of organized fraud ring...'
    ],
    llmResponse: 'Sophisticated fraud ring detected involving 23+ accounts. Network analysis reveals hierarchical structure with current entity as mid-level operator. Pattern indicates Eastern European cybercrime syndicate specializing in account takeovers and money mule operations. $2.3M in suspicious transfers traced through network.',
    progressStart: 76,
    progressEnd: 84,
    riskScore: 96,
    stepId: 'fraud-ring'
  },
  {
    name: 'compliance_screening',
    agent: 'Compliance Agent',
    tools: ['sanctions_screening', 'regulatory_reporting', 'case_management'],
    duration: 4,
    logs: [
      'Screening entity against OFAC sanctions list...',
      'Checking EU consolidated sanctions database...',
      'PEP (Politically Exposed Person) database scan in progress...',
      'AML transaction monitoring triggered: Structuring pattern detected...',
      'SAR (Suspicious Activity Report) generation initiated...',
      'Regulatory reporting requirements: FinCEN notification required...'
    ],
    llmResponse: 'Compliance screening reveals critical issues requiring immediate action. Entity shows 87% name match with sanctioned individual (fuzzy matching). Transaction patterns indicate deliberate structuring to avoid CTR thresholds. Mandatory SAR filing required within 24 hours. Case escalated to compliance team.',
    progressStart: 84,
    progressEnd: 92,
    riskScore: 98,
    stepId: 'compliance-screening'
  },
  {
    name: 'final_assessment',
    agent: 'Investigation Orchestrator',
    tools: ['ml_risk_model', 'fraud_scoring_engine', 'decision_tree_analyzer'],
    duration: 3,
    logs: [
      'Aggregating all investigation findings and risk scores...',
      'Calculating weighted fraud risk score across all vectors...',
      'Generating investigation summary and evidence package...',
      'Preparing recommended actions and next steps...',
      'Investigation complete. Final risk score: 95/100'
    ],
    llmResponse: 'CRITICAL FRAUD ALERT: Investigation confirms organized fraud with 95% confidence. Evidence indicates: 1) Account takeover via phishing, 2) Part of larger fraud ring (23+ accounts), 3) $125K in fraudulent transactions, 4) AML violations requiring regulatory filing. IMMEDIATE ACTIONS: Freeze account, file SAR, initiate recovery procedures, refer to law enforcement.',
    progressStart: 92,
    progressEnd: 100,
    riskScore: 95,
    stepId: 'final-assessment'
  }
];

// Simplified hook for the AutonomousInvestigationPanel component
export const useSimpleAutonomousInvestigation = () => {
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const onLogCallbackRef = useRef<((logEntry: LogEntry) => void) | null>(null);
  const onStepUpdateCallbackRef = useRef<((stepId: string, riskScore: number, llmThoughts: string) => void) | null>(null);
  
  // Use refs for simulation state to avoid stale closures
  const simulationStateRef = useRef({
    currentPhaseIndex: 0,
    currentLogIndex: 0,
    currentToolIndex: 0,
    llmResponseSent: false,
    logMessageCount: 0,
    isActive: false
  });
  
  // Use ref for immediate access to total messages
  const totalLogMessagesRef = useRef(0);
  
  // Add refs for proper cleanup and instance management
  const simulationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const investigationIdRef = useRef<string | null>(null);
  const isRunningRef = useRef(false);
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup function to stop any running investigation
  const stopCurrentInvestigation = useCallback(() => {
    console.log('Stopping current investigation...');
    if (simulationTimeoutRef.current) {
      clearTimeout(simulationTimeoutRef.current);
      simulationTimeoutRef.current = null;
    }
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
    simulationStateRef.current.isActive = false;
    isRunningRef.current = false;
    investigationIdRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCurrentInvestigation();
    };
  }, [stopCurrentInvestigation]);

  const updateProgress = useCallback(() => {
    simulationStateRef.current.logMessageCount++;
    if (totalLogMessagesRef.current > 0) {
      const newProgress = Math.min(Math.floor((simulationStateRef.current.logMessageCount / totalLogMessagesRef.current) * 100), 100);
      setProgress(newProgress);
    }
  }, []);

  const simulateNextStep = useCallback(() => {
    console.log('simulateNextStep function called');
    const state = simulationStateRef.current;
    console.log('Current state in simulateNextStep:', state);
    
    if (!state.isActive) {
      console.log('simulateNextStep: not active, returning');
      return;
    }
    
    if (!isRunningRef.current) {
      console.log('simulateNextStep: investigation not running, returning');
      return;
    }

    console.log('simulateNextStep: state is active, proceeding');
    console.log('simulateNextStep called with state:', {
      phaseIndex: state.currentPhaseIndex,
      logIndex: state.currentLogIndex,
      toolIndex: state.currentToolIndex,
      llmResponseSent: state.llmResponseSent
    });

    // Check if investigation is complete
    if (state.currentPhaseIndex >= INVESTIGATION_PHASES.length) {
      console.log('Investigation complete!');
      setProgress(100);
      setStatus('COMPLETED');
      setIsLoading(false);
      state.isActive = false;
      isRunningRef.current = false;
      investigationIdRef.current = null;
      if (onLogCallbackRef.current) {
        onLogCallbackRef.current({
          timestamp: Date.now(),
          message: 'Autonomous investigation completed successfully',
          type: LogLevel.SUCCESS
        });
      }
      return;
    }

    const currentPhase = INVESTIGATION_PHASES[state.currentPhaseIndex];
    console.log('Current phase:', currentPhase.name);

    // Phase 1: Send regular logs
    if (state.currentLogIndex < currentPhase.logs.length) {
      const message = currentPhase.logs[state.currentLogIndex];
      console.log('Sending log message:', message);
      
      simulationTimeoutRef.current = setTimeout(() => {
        if (!state.isActive) {
          console.log('Log timeout: state not active, returning');
          return;
        }
        if (!isRunningRef.current) {
          console.log('Log timeout: investigation not running, returning');
          return;
        }
        console.log('Log timeout: about to call onLogCallback');
        if (onLogCallbackRef.current) {
          console.log('Log timeout: calling onLogCallback with message:', message);
          onLogCallbackRef.current({
            timestamp: Date.now(),
            message: `${currentPhase.agent}: ${message}`,
            type: LogLevel.INFO
          });
        } else {
          console.error('Log timeout: onLogCallback is null/undefined!');
        }
        updateProgress();
        state.currentLogIndex++;
        simulateNextStep();
      }, 3500); // Increased from 1500ms to 3500ms to match animation delay
      return;
    }

    // Phase 2: Send tool logs
    if (state.currentToolIndex < currentPhase.tools.length) {
      const tool = currentPhase.tools[state.currentToolIndex];
      console.log('Sending tool message:', tool);
      
      simulationTimeoutRef.current = setTimeout(() => {
        if (!state.isActive) {
          console.log('Tool timeout: state not active, returning');
          return;
        }
        if (!isRunningRef.current) {
          console.log('Tool timeout: investigation not running, returning');
          return;
        }
        console.log('Tool timeout: about to call onLogCallback');
        if (onLogCallbackRef.current) {
          console.log('Tool timeout: calling onLogCallback with tool:', tool);
          onLogCallbackRef.current({
            timestamp: Date.now(),
            message: `${currentPhase.agent}: Using tool: ${tool}`,
            type: LogLevel.INFO
          });
        } else {
          console.error('Tool timeout: onLogCallback is null/undefined!');
        }
        updateProgress();
        state.currentToolIndex++;
        simulateNextStep();
      }, 3200); // Increased from 1200ms to 3200ms to match animation delay
      return;
    }

    // Phase 3: Send LLM response (only if not sent yet)
    if (!state.llmResponseSent) {
      console.log('Sending LLM response for phase:', currentPhase.name);
      
      simulationTimeoutRef.current = setTimeout(() => {
        if (!state.isActive) {
          console.log('LLM timeout: state not active, returning');
          return;
        }
        if (!isRunningRef.current) {
          console.log('LLM timeout: investigation not running, returning');
          return;
        }
        console.log('LLM timeout: about to call onLogCallback for LLM response');
        if (onLogCallbackRef.current) {
          console.log('LLM timeout: calling onLogCallback with LLM response');
          onLogCallbackRef.current({
            timestamp: Date.now(),
            message: `${currentPhase.agent}: <strong>LLM Analysis:</strong> ${currentPhase.llmResponse}`,
            type: LogLevel.INFO
          });
        } else {
          console.error('LLM timeout: onLogCallback is null/undefined!');
        }
        updateProgress();
        if (onLogCallbackRef.current) {
          onLogCallbackRef.current({
            timestamp: Date.now(),
            message: `${currentPhase.agent}: Phase complete - Risk indicators identified`,
            type: LogLevel.SUCCESS
          });
        }
        updateProgress();
        
        // Update step with risk data if callback provided and phase has stepId
        if (currentPhase.stepId && onStepUpdateCallbackRef.current) {
          console.log('Updating step with risk data:', currentPhase.stepId, currentPhase.riskScore);
          onStepUpdateCallbackRef.current(currentPhase.stepId, currentPhase.riskScore, currentPhase.llmResponse);
        }
        
        // Move to next phase
        state.currentPhaseIndex++;
        state.currentLogIndex = 0;
        state.currentToolIndex = 0;
        state.llmResponseSent = false;
        
        // Start next phase if available
        if (state.currentPhaseIndex < INVESTIGATION_PHASES.length) {
          const nextPhase = INVESTIGATION_PHASES[state.currentPhaseIndex];
          if (onLogCallbackRef.current) {
            onLogCallbackRef.current({
              timestamp: Date.now(),
              message: `Starting ${nextPhase.name} phase...`,
              type: LogLevel.INFO
            });
          }
          updateProgress();
          console.log('Starting next phase:', nextPhase.name);
        }
        
        simulateNextStep();
      }, 2500); // Increased from 1000ms to 2500ms to match animation delay
      
      state.llmResponseSent = true;
      return;
    }

    console.error('Simulation reached unexpected state:', state);
    console.log('Investigation flags:', { 
      isActive: state.isActive, 
      isRunning: isRunningRef.current, 
      investigationId: investigationIdRef.current,
      onLogCallback: !!onLogCallbackRef.current 
    });
  }, [updateProgress]);

  const startInvestigation = async (
    entityId: string,
    entityType: string,
    investigationId: string,
    onLog?: (logEntry: LogEntry) => void,
    onStepUpdate?: (stepId: string, riskScore: number, llmThoughts: string) => void
  ) => {
    console.log('Starting investigation with demo mode check...');
    
    // Guard against multiple investigations
    if (isRunningRef.current) {
      console.log('Investigation already running, stopping current one first');
      stopCurrentInvestigation();
      // Wait a bit for cleanup to complete
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Guard against same investigation ID
    if (investigationIdRef.current === investigationId) {
      console.log('Investigation with same ID already running, ignoring');
      return;
    }
    
    // Stop any previous investigation
    stopCurrentInvestigation();
    
    // Set flags
    isRunningRef.current = true;
    investigationIdRef.current = investigationId;
    
    // Reset all state
    setIsLoading(true);
    setError(null);
    setStatus('IN_PROGRESS');
    setProgress(0);
    console.log('Setting onLogCallback:', onLog);
    onLogCallbackRef.current = onLog || null;
    onStepUpdateCallbackRef.current = onStepUpdate || null;
    
    // Reset simulation state
    simulationStateRef.current = {
      currentPhaseIndex: 0,
      currentLogIndex: 0,
      currentToolIndex: 0,
      llmResponseSent: false,
      logMessageCount: 0,
      isActive: false
    };

    const isDemo = isDemoModeActive();
    console.log('Demo mode active:', isDemo);

    if (isDemo) {
      // Calculate total log messages for progress calculation
      const totalMessages = INVESTIGATION_PHASES.reduce((total, phase) => {
        return total + phase.logs.length + phase.tools.length + 2; // +2 for LLM response and phase complete
      }, 3); // +3 for initial logs
      
      totalLogMessagesRef.current = totalMessages;
      console.log('Total messages calculated:', totalMessages);

      // Start the autonomous investigation
      if (onLog) {
        onLog({
          timestamp: Date.now(),
          message: 'Autonomous investigation framework initializing...',
          type: LogLevel.INFO
        });
      }
      updateProgress();
      if (onLog) {
        onLog({
          timestamp: Date.now(),
          message: `Target entity: ${entityType} ${entityId}`,
          type: LogLevel.INFO
        });
      }
      updateProgress();
      if (onLog) {
        onLog({
          timestamp: Date.now(),
          message: 'Multi-agent investigation system ready',
          type: LogLevel.INFO
        });
      }
      updateProgress();
      
      // Start first phase
      if (INVESTIGATION_PHASES.length > 0) {
        const firstPhase = INVESTIGATION_PHASES[0];
        if (onLog) {
          onLog({
            timestamp: Date.now(),
            message: `Starting ${firstPhase.name} phase...`,
            type: LogLevel.INFO
          });
        }
        updateProgress();
        
        console.log('About to activate simulation in 3 seconds...');
        console.log('Current simulation state before activation:', simulationStateRef.current);
        // Start investigation after initial delay
        simulationTimeoutRef.current = setTimeout(() => {
          if (!isRunningRef.current) return; // Check if still running
          console.log('Activating simulation now!');
          console.log('Setting isActive to true');
          simulationStateRef.current.isActive = true;
          console.log('Current simulation state after activation:', simulationStateRef.current);
          console.log('About to call simulateNextStep');
          simulateNextStep();
        }, 3000); // Increased from 2000ms to 3000ms to match animation delay
      }
    } else {
      // Non-demo mode: Simple progress investigation
      if (onLog) {
        onLog({
          timestamp: Date.now(),
          message: 'Starting autonomous investigation...',
          type: LogLevel.INFO
        });
      }
      if (onLog) {
        onLog({
          timestamp: Date.now(),
          message: 'Investigation system initializing...',
          type: LogLevel.INFO
        });
      }
      
      intervalIdRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            if (intervalIdRef.current) {
              clearInterval(intervalIdRef.current);
              intervalIdRef.current = null;
            }
            setStatus('COMPLETED');
            setIsLoading(false);
            isRunningRef.current = false;
            investigationIdRef.current = null;
            if (onLog) {
              onLog({
                timestamp: Date.now(),
                message: 'Autonomous investigation completed',
                type: LogLevel.SUCCESS
              });
            }
            return 100;
          }
          return prev + 10;
        });
      }, 500);
    }

    return Promise.resolve();
  };

  const checkStatus = async (investigationId: string) => {
    // Simulate status check
    return Promise.resolve();
  };

  // Debug function to check investigation state
  const debugState = useCallback(() => {
    console.log('=== INVESTIGATION DEBUG STATE ===');
    console.log('Status:', status);
    console.log('Is Loading:', isLoading);
    console.log('Progress:', progress);
    console.log('Error:', error);
    console.log('Simulation State:', simulationStateRef.current);
    console.log('Investigation ID:', investigationIdRef.current);
    console.log('Is Running:', isRunningRef.current);
    console.log('OnLog Callback:', !!onLogCallbackRef.current);
    console.log('Total Messages:', totalLogMessagesRef.current);
    console.log('Simulation Timeout:', !!simulationTimeoutRef.current);
    console.log('================================');
  }, [status, isLoading, progress, error]);

  // Expose debug function to window for manual debugging
  useEffect(() => {
    (window as any).debugInvestigation = debugState;
    return () => {
      delete (window as any).debugInvestigation;
    };
  }, [debugState]);

  return {
    startInvestigation,
    checkStatus,
    status,
    isLoading,
    error,
    progress,
    debugState,
  };
};
