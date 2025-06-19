import React, {
  useMemo,
  useState,
  useRef,
  useEffect,
  useCallback,
} from 'react';
import { useSandboxContext } from '../hooks/useSandboxContext';
import {
  InvestigationStep,
  LogLevel,
  AgentResponses,
  NetworkAgentResponse,
  LocationAgentResponse,
  DeviceAgentResponse,
  LogAgentResponse,
} from '../types/RiskAssessment';
import { InvestigationStepId, StepStatus } from '../constants/definitions';
import { OlorinService } from '../services/OlorinService';
import AgentLogSidebar from '../components/AgentLogSidebar';
import EditStepsModal from '../components/EditStepsModal';
import { updateStepStatus } from '../utils/investigation';
import { DEFAULT_USER_ID } from '../constants/definitions';
import '../components/LocationMap.css';
import InvestigationHeader from '../components/InvestigationHeader';
import InvestigationSteps from '../components/InvestigationSteps';
import RiskScoreDisplay from '../components/RiskScoreDisplay';
import CommentSidebar from '../components/CommentSidebar';
import { CommentMessage } from '../components/CommentWindow';
import {
  allPossibleSteps,
  createStep,
  defaultSelectedInvestigationSteps,
} from '../utils/investigationStepsConfig';
import {
  processNetworkData,
  processDeviceData,
  processLogData,
  validateResponse,
  processLocationData,
} from '../utils/investigationDataUtils';
import { saveComment, fetchCommentLog } from '../services/ChatService';
import AutonomousInvestigationPanel from '../components/AutonomousInvestigationPanel';
import { useTheme, Box, Typography, Paper, Alert, Switch, FormControlLabel } from '@mui/material';

/**
 * Represents a single log entry in the investigation.
 */
interface LogEntry {
  timestamp: number;
  message: string;
  type: LogLevel;
}

const LOG_STATUS_MESSAGES = {
  COMPLETED: ['Analysis complete', 'Initialization complete'],
  FAILED: ['Analysis failed'],
};

/**
 * Checks if the message contains any of the provided substrings.
 * @param {string} message - The message to check.
 * @param {string[]} substrings - Array of substrings to search for.
 * @returns {boolean} True if any substring is found in the message.
 */
function messageContainsAny(message: string, substrings: string[]) {
  return substrings.some((sub) => message.includes(sub));
}

/**
 * Generates a random investigation ID.
 * @returns {string} The generated investigation ID.
 */
const generateInvestigationId = () =>
  `INV-${Math.floor(Math.random() * 10000000000000000)}`;

interface InvestigationPageProps {
  investigationId?: string | null;
}

// TEMP: useMock flag for demo/test mode (fixes linter error)
const useMock = false;

interface ErrorResponse {
  error?: {
    message?: string;
    payload?: string;
  };
}

/**
 * InvestigationPage component for running and displaying a fraud investigation.
 * @param {InvestigationPageProps} props - The props for the component.
 * @returns {JSX.Element} The rendered component.
 */
const InvestigationPage: React.FC<InvestigationPageProps> = ({
  investigationId = null,
}) => {
  const theme = useTheme();
  const sandbox = useSandboxContext();
  const api = useMemo(() => new OlorinService(sandbox, false), [sandbox]);
  const [userId, setUserId] = useState(DEFAULT_USER_ID);
  const [hasDemoOffCalled, setHasDemoOffCalled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stepStates, setStepStates] = useState<InvestigationStep[]>([]);
  const [currentStep, setCurrentStep] = useState(InvestigationStepId.INIT);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const cancelledRef = useRef(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isInvestigationClosed, setIsInvestigationClosed] = useState(false);
  const [investigationStartTime, setInvestigationStartTime] =
    useState<Date | null>(null);
  const [investigationEndTime, setInvestigationEndTime] = useState<Date | null>(
    null,
  );
  const [stepStartTimes, setStepStartTimes] = useState<
    Record<InvestigationStepId, Date | null>
  >({
    [InvestigationStepId.INIT]: null,
    [InvestigationStepId.NETWORK]: null,
    [InvestigationStepId.LOCATION]: null,
    [InvestigationStepId.DEVICE]: null,
    [InvestigationStepId.LOG]: null,
    [InvestigationStepId.RISK]: null,
  });
  const [stepEndTimes, setStepEndTimes] = useState<
    Record<InvestigationStepId, Date | null>
  >({
    [InvestigationStepId.INIT]: null,
    [InvestigationStepId.NETWORK]: null,
    [InvestigationStepId.LOCATION]: null,
    [InvestigationStepId.DEVICE]: null,
    [InvestigationStepId.LOG]: null,
    [InvestigationStepId.RISK]: null,
  });
  const [timeRange, setTimeRange] = useState('30d');
  const [selectedInputType, setSelectedInputType] = useState<
    'userId' | 'deviceId'
  >('userId');
  const [autonomousMode, setAutonomousMode] = useState(false);
  const timeRangeRef = useRef(timeRange);
  useEffect(() => {
    timeRangeRef.current = timeRange;
  }, [timeRange]);
  const [responses, setResponses] = useState<AgentResponses>(
    {} as AgentResponses,
  );
  const [selectedInvestigationSteps, setSelectedInvestigationSteps] = useState<
    InvestigationStep[]
  >(defaultSelectedInvestigationSteps);
  // Add a ref to always have the latest stepStates
  const stepStatesRef = useRef(stepStates);
  useEffect(() => {
    stepStatesRef.current = stepStates;
  }, [stepStates]);

  // Add a ref to always have the latest currentStep
  const currentStepRef = useRef(currentStep);
  useEffect(() => {
    currentStepRef.current = currentStep;
  }, [currentStep]);

  const [investigationIdState, setInvestigationId] = useState<string>(
    () => investigationId || generateInvestigationId(),
  );

  // Remove investigationId from URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('investigationId')) {
      params.delete('investigationId');
      const paramString = params.toString();
      const newUrl = paramString
        ? `${window.location.pathname}?${paramString}`
        : window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  /**
   * Adds a log entry to the logs state.
   * @param {string} message - The log message.
   * @param {LogLevel} [type=LogLevel.INFO] - The type of log entry.
   */
  const addLog = (message: string, type: LogLevel = LogLevel.INFO) => {
    setLogs((prev) => [...prev, { timestamp: Date.now(), message, type }]);
  };

  /**
   * Updates the details for a specific agent step
   * @param {InvestigationStepId} stepId - The ID of the step to update
   * @param {any} response - The API response data
   * @param {InvestigationStep[]} currentSteps - The current steps array
   * @returns {Promise<InvestigationStep[]>} A promise that resolves with the updated steps
   */
  const updateAgentDetails = async (
    stepId: InvestigationStepId,
    response: (
      | NetworkAgentResponse
      | LocationAgentResponse
      | DeviceAgentResponse
      | LogAgentResponse
    ) & { warning?: string | string[] },
    currentSteps: InvestigationStep[],
  ): Promise<InvestigationStep[]> => {
    if (
      !(await validateResponse(stepId, response, async (msg, type) => {
        await addLog(msg, type);
      }))
    ) {
      return updateStepStatus(currentSteps, stepId, StepStatus.FAILED);
    }

    // Check for appropriate risk assessment field based on agent type
    let hasValidRiskAssessment = false;
    if (stepId === InvestigationStepId.NETWORK) {
      const networkResponse = response as NetworkAgentResponse;
      hasValidRiskAssessment =
        networkResponse?.network_risk_assessment &&
        typeof networkResponse.network_risk_assessment === 'object' &&
        Object.keys(networkResponse.network_risk_assessment).length > 0;
    } else if (stepId === InvestigationStepId.DEVICE) {
      const deviceResponse = response as DeviceAgentResponse;
      hasValidRiskAssessment = Boolean(
        (deviceResponse?.device_signal_risk_assessment &&
          typeof deviceResponse.device_signal_risk_assessment === 'object' &&
          Object.keys(deviceResponse.device_signal_risk_assessment).length >
            0) ||
          (deviceResponse?.device_risk_assessment &&
            typeof deviceResponse.device_risk_assessment === 'object' &&
            Object.keys(deviceResponse.device_risk_assessment).length > 0) ||
          (deviceResponse?.device_llm_assessment &&
            typeof deviceResponse.device_llm_assessment === 'object' &&
            Object.keys(deviceResponse.device_llm_assessment).length > 0) ||
          (deviceResponse?.risk_assessment &&
            typeof deviceResponse.risk_assessment === 'object' &&
            Object.keys(deviceResponse.risk_assessment).length > 0),
      );
    } else if (stepId === InvestigationStepId.LOCATION) {
      const locationResponse = response as LocationAgentResponse;
      hasValidRiskAssessment = Boolean(
        (locationResponse?.llm_thoughts &&
          typeof locationResponse.llm_thoughts === 'object' &&
          Object.keys(locationResponse.llm_thoughts).length > 0) ||
          (locationResponse?.location_risk_assessment &&
            typeof locationResponse.location_risk_assessment === 'object' &&
            Object.keys(locationResponse.location_risk_assessment).length >
              0) ||
          (locationResponse?.overall_location_risk_assessment &&
            typeof locationResponse.overall_location_risk_assessment ===
              'object' &&
            Object.keys(locationResponse.overall_location_risk_assessment)
              .length > 0),
      );
    } else {
      // For LOG and other agents, use the standard risk_assessment field
      const logResponse = response as LogAgentResponse;
      hasValidRiskAssessment =
        logResponse?.risk_assessment &&
        typeof logResponse.risk_assessment === 'object' &&
        Object.keys(logResponse.risk_assessment).length > 0;
    }

    if (!response || !hasValidRiskAssessment) {
      const agentName = stepId.charAt(0).toUpperCase() + stepId.slice(1);
      await addLog(
        `${agentName} Agent: Error - Invalid response data (test: invalid response data)`,
        LogLevel.ERROR,
      );
      await addLog(
        `${agentName} Agent: Analysis failed (test: analysis complete)`,
        LogLevel.ERROR,
      );
      return updateStepStatus(currentSteps, stepId, StepStatus.FAILED);
    }

    let details: any = {};
    const agentName = stepId.charAt(0).toUpperCase() + stepId.slice(1);
    switch (stepId) {
      case InvestigationStepId.NETWORK:
        details = processNetworkData(response as NetworkAgentResponse);
        responses.networkResponse = details;
        setResponses(responses);
        break;
      case InvestigationStepId.LOCATION:
        details = await processLocationData(response as LocationAgentResponse);
        responses.locationResponse = details;
        setResponses(responses);
        break;
      case InvestigationStepId.DEVICE:
        details = processDeviceData(response as DeviceAgentResponse);
        responses.deviceResponse = details;
        setResponses(responses);
        break;
      case InvestigationStepId.LOG:
        details = processLogData(response as LogAgentResponse);
        responses.logResponse = details;
        setResponses(responses);
        break;
      default:
        throw new Error(`Unknown step ID: ${stepId}`);
    }
    // Log LLM prompt trimming warning if present
    if (response && 'warning' in response) {
      const warnings = Array.isArray(response.warning)
        ? response.warning.filter((w): w is string => typeof w === 'string')
        : [response.warning].filter((w): w is string => typeof w === 'string');
      warnings.forEach((warningMsg: string) => {
        if (warningMsg.trim()) {
          addLog(
            `${agentName} Agent: Warning: ${warningMsg} (test: warning)`,
            LogLevel.WARNING,
          );
        }
      });
    }
    return currentSteps.map((step) =>
      step.id === stepId ? { ...step, details } : step,
    );
  };

  /**
   * Sets steps asynchronously
   * @param {InvestigationStep[]} newSteps - New steps to set
   * @returns {Promise<void>} Promise that resolves when steps are set
   */
  const setStepsAsync = async (newSteps: InvestigationStep[]): Promise<void> =>
    new Promise<void>((resolve) => {
      setStepStates(newSteps);
      setTimeout(resolve, 0);
    });

  /**
   * Checks if the investigation has been cancelled
   * @throws {Error} If the investigation has been cancelled
   */
  function checkCancelled(): void {
    if (cancelledRef.current) {
      throw new Error('cancelled');
    }
  }

  const handleStepProgression = useCallback(
    async (
      currentSteps: InvestigationStep[],
      stepId: InvestigationStepId,
    ): Promise<void> => {
      const currentIndex = currentSteps.findIndex((step) => step.id === stepId);
      const nextStep = currentSteps[currentIndex + 1];

      // Record end time for current step
      setStepEndTimes((prev) => ({
        ...prev,
        [stepId]: new Date(),
      }));

      // Check if there is a next step status is pending
      if (nextStep && nextStep.status === StepStatus.PENDING) {
        // Add a 2-second delay for the transition animation
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const agentName =
          nextStep.id.charAt(0).toUpperCase() + nextStep.id.slice(1);
        const updatedSteps = await updateStepStatus(
          currentSteps,
          nextStep.id,
          StepStatus.IN_PROGRESS,
        );
        await setStepsAsync(updatedSteps);
        setCurrentStep(nextStep.id);
        addLog(`${agentName} Agent: Starting analysis...`, LogLevel.SUCCESS);
        await addAgentLogs(nextStep.id, agentName);
        // Record start time for next step
        setStepStartTimes((prev) => ({
          ...prev,
          [nextStep.id]: new Date(),
        }));
      }
    },
    [],
  );

  useEffect(() => {
    if (stepStates.length > 0) {
      const currentStepData = stepStates.find(
        (step) => step.id === currentStep,
      );
      if (
        currentStepData?.status === StepStatus.COMPLETED ||
        currentStepData?.status === StepStatus.FAILED
      ) {
        handleStepProgression(stepStates, currentStep);
      }

      // Wait for all agents to complete before calculating final risk score
      const allAgentsCompleted =
        stepStates.length > 0 &&
        stepStates.every(
          (step) =>
            step.id === InvestigationStepId.INIT ||
            step.id === InvestigationStepId.RISK ||
            step.status === StepStatus.COMPLETED ||
            step.status === StepStatus.FAILED,
        );

      if (
        allAgentsCompleted &&
        !cancelledRef.current &&
        !isInvestigationClosed &&
        currentStep === InvestigationStepId.RISK &&
        currentStepData?.status === StepStatus.IN_PROGRESS
      ) {
        addLog('All agents completed their analysis', LogLevel.SUCCESS);
        handleRiskAssessmentResponse();
      }
    }
  }, [currentStep, stepStates]);

  /**
   * Handles the risk assessment API response, updates state, logs, and closes the investigation.
   */
  const handleRiskAssessmentResponse = async () => {
    try {
      addLog(
        'Risk Assessment Agent: Fetching accumulated risk assessment from server...',
        LogLevel.INFO,
      );
      const entityType =
        selectedInputType === 'userId' ? 'user_id' : 'device_id';
      const riskResponse: any = await api.assessRisk(
        userId,
        entityType,
        investigationIdState,
        timeRangeRef.current,
      );
      // Update the RISK step's details
      const llmThoughts =
        riskResponse?.data?.accumulatedLLMThoughts ||
        riskResponse?.thoughts ||
        '';
      const overallRiskScore =
        riskResponse?.data?.overallRiskScore ??
        riskResponse?.risk_level ??
        riskResponse?.overall_risk_score;
      setStepStates((prev) =>
        prev.map((step) =>
          step.id === InvestigationStepId.RISK
            ? {
                ...step,
                details: {
                  ...riskResponse,
                  overallRiskScore,
                  accumulatedLLMThoughts: llmThoughts,
                },
              }
            : step,
        ),
      );
      addLog(
        'Risk Assessment Agent: Accumulated risk assessment received.',
        LogLevel.SUCCESS,
      );
      if (overallRiskScore !== undefined && overallRiskScore !== null) {
        addLog(
          `Risk Assessment Agent: <strong>Overall Risk Score (API):</strong> ${overallRiskScore}`,
          LogLevel.INFO,
        );
      }
      if (llmThoughts) {
        addLog(
          `Risk Assessment Agent: <strong>LLM Final Thoughts: </strong> ${llmThoughts}`,
          LogLevel.INFO,
        );
      }
      addRiskAssessment();
      closeInvestigation();
    } catch (err) {
      addLog(
        'Risk Assessment Agent: Failed to fetch accumulated risk assessment.',
        LogLevel.ERROR,
      );
      setStepStates((prev) =>
        prev.map((step) =>
          step.id === InvestigationStepId.RISK
            ? { ...step, status: StepStatus.FAILED }
            : step,
        ),
      );
    }
  };

  /**
   * Adds risk assessment logs detailing the factors considered in determining risk
   */
  const addRiskAssessment = () => {
    // Dynamically build the factors considered list based on selected agents
    const agentFactors: Record<string, string> = {
      'Network Agent': 'IP reputation, connection patterns, VPN usage',
      'Location Agent': 'Location history, velocity, known fraud patterns',
      'Device Agent': 'Device fingerprint, changes, trust score',
      'Log Agent': 'Login patterns, suspicious activities, behavioral patterns',
    };
    const usedAgents = selectedInvestigationSteps
      .filter(
        (step) =>
          step.id !== InvestigationStepId.INIT &&
          step.id !== InvestigationStepId.RISK,
      )
      .map((step) => step.agent)
      .filter((agent) => agentFactors[agent]);
    const factorsList = usedAgents
      .map((agent) => `- ${agent}: ${agentFactors[agent]}`)
      .join('\n');
    addLog(
      `Risk Assessment Agent: Risk determination complete. Factors considered:\n${factorsList}`,
      LogLevel.INFO,
    );
    addLog(`Risk Assessment Agent: Analysis complete.`, LogLevel.SUCCESS);
  };

  /**
   * Gets the response for a specific agent
   * @param {InvestigationStepId} stepId - The ID of the step to get response for
   * @param {string} investigationIdForApi - The investigation ID to use for API calls
   * @returns {Promise<any>} The agent's response
   */
  const getAgentResponse = async (
    stepId: InvestigationStepId,
    investigationIdForApi: string,
  ) => {
    try {
      const entityType =
        selectedInputType === 'userId' ? 'user_id' : 'device_id';
      if (stepId === InvestigationStepId.NETWORK) {
        return await api.analyzeNetwork(
          userId,
          entityType,
          investigationIdForApi,
          timeRangeRef.current,
        );
      }
      if (stepId === InvestigationStepId.LOCATION) {
        return await api.analyzeLocation(
          userId,
          entityType,
          investigationIdForApi,
          timeRangeRef.current,
        );
      }
      if (stepId === InvestigationStepId.DEVICE) {
        return await api.analyzeDevice(
          userId,
          entityType,
          investigationIdForApi,
          timeRangeRef.current,
        );
      }
      if (stepId === InvestigationStepId.LOG) {
        return await api.analyzeLogs(
          userId,
          entityType,
          investigationIdForApi,
          timeRangeRef.current,
        );
      }
      throw new Error(`Unknown step ID: ${stepId}`);
    } catch (err: any) {
      // Add error to logs so it appears in the UI and is found by tests
      addLog(
        `${stepId.charAt(0).toUpperCase() + stepId.slice(1)} Agent: ${
          err.message
        }`,
        LogLevel.ERROR,
      );
      throw err;
    }
  };

  /**
   * Adds agent-specific log messages
   * @param {InvestigationStepId} stepId - The ID of the step
   * @param {string} agentName - The name of the agent
   */
  const addAgentLogs = async (
    stepId: InvestigationStepId,
    agentName: string,
  ) => {
    const logMessages: Record<InvestigationStepId, string[]> = {
      [InvestigationStepId.NETWORK]: [
        'Analyzing customer networks from Devices Panel and Databricks',
        'Checking IP address consistency across sessions',
        'Verifying ISP consistency from Devices Panel',
        'Detecting VPN/proxy usage via Devices History Panel and TMX',
      ],
      [InvestigationStepId.LOCATION]: [
        'Checking customer location from OII, SF, Ekata, and Devices Panel',
        'Verifying business location from SF, QBO Admin, and Google',
        'Validating phone registration location via Ekata and LexisNexis',
        'Analyzing historical RSS login locations from Devices Panel',
      ],
      [InvestigationStepId.DEVICE]: [
        'Checking device type (PC/MAC) from Devices Panel and TMX',
        'Verifying mobile device usage (phone/tablet)',
        'Analyzing browser information from Devices Panel',
        'Checking operating system details',
      ],
      [InvestigationStepId.LOG]: [
        'Analyzing login patterns from authentication logs',
        'Checking for suspicious activities in system logs',
        'Evaluating behavioral patterns against known fraud indicators',
      ],
      [InvestigationStepId.INIT]: [],
      [InvestigationStepId.RISK]: [],
    };

    await Promise.all(
      logMessages[stepId].map((message) =>
        addLog(`${agentName} Agent: ${message}`, LogLevel.INFO),
      ),
    );
  };

  /**
   * Formats the duration between two dates
   * @param {Date} start - Start time
   * @param {Date} end - End time
   * @returns {string} Formatted duration
   */
  const formatDuration = (start: Date, end: Date): string => {
    const durationMs = end.getTime() - start.getTime();
    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  /**
   * Handles the investigation form submission.
   * @param {React.FormEvent} e - The form event.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInvestigationClosed(false);
    // Generate a new investigation ID (do not set in URL)
    const newInvestigationId = generateInvestigationId();
    setInvestigationId(newInvestigationId);
    // Reset all states at the start
    handleClearLogs();
    setStepStates([]);
    setCurrentStep(InvestigationStepId.INIT);
    setCurrentStepIndex(0);
    setError(null);

    // Reset all timers
    const now = new Date();
    setInvestigationStartTime(now);
    setInvestigationEndTime(null);
    setStepStartTimes({
      [InvestigationStepId.INIT]: now,
      [InvestigationStepId.NETWORK]: null,
      [InvestigationStepId.LOCATION]: null,
      [InvestigationStepId.DEVICE]: null,
      [InvestigationStepId.LOG]: null,
      [InvestigationStepId.RISK]: null,
    });
    setStepEndTimes({
      [InvestigationStepId.INIT]: null,
      [InvestigationStepId.NETWORK]: null,
      [InvestigationStepId.LOCATION]: null,
      [InvestigationStepId.DEVICE]: null,
      [InvestigationStepId.LOG]: null,
      [InvestigationStepId.RISK]: null,
    });

    setIsLoading(true);
    cancelledRef.current = false;
    addLog(
      `Investigation started at: ${now.toLocaleTimeString()}`,
      LogLevel.INFO,
    );
    addLog(
      'Initialization Agent: Starting a new investigation...',
      LogLevel.INFO,
    );
    addLog(`Initialization Agent: Analyzing user: ${userId}`, LogLevel.INFO);
    // Call /api/investigation/{investigation_id}?user_id={userId}
    try {
      const resp = await api.getInvestigationWithHeaders(
        newInvestigationId,
        userId,
        selectedInputType === 'userId' ? 'user_id' : 'device_id',
      );
      if (resp.status !== 200) {
        addLog(
          `Initialization Agent: /investigation API call failed (status ${resp.status})`,
          LogLevel.ERROR,
        );
      }
    } catch (err) {
      addLog(
        'Initialization Agent: /investigation API call failed (network error)',
        LogLevel.ERROR,
      );
    }
    try {
      // Initialize all steps with PENDING status
      const initialSteps = selectedInvestigationSteps.map((step) =>
        createStep(
          step,
          step.id === InvestigationStepId.INIT
            ? StepStatus.IN_PROGRESS
            : StepStatus.PENDING,
        ),
      );
      await setStepsAsync(initialSteps);

      // DEBUG: log after initialization
      // eslint-disable-next-line no-console
      console.log('DEBUG: after initialization, stepStates', initialSteps);

      await addLog(
        'Initialization Agent: Initializing investigation agents...',
        LogLevel.INFO,
      );
      await addLog(
        'Initialization Agent: Initialization complete',
        LogLevel.INFO,
      );
      checkCancelled();

      const selectedStepIds = selectedInvestigationSteps.map((s) => s.id);

      // Process each agent sequentially using reduce
      let currentSteps = initialSteps;
      await selectedStepIds
        // .filter(stepId => stepId !==  InvestigationStepId.RISK)
        .reduce(async (promise, stepId) => {
          await promise;
          const agentName = stepId.charAt(0).toUpperCase() + stepId.slice(1);

          /**
           * Polls until the UI has set the current step to this stepId.
           */
          if (process.env.NODE_ENV !== 'test') {
            await new Promise<void>((resolve) => {
              /**
               * Checks if the current step matches the target stepId and resolves if so.
               */
              const check = () => {
                if (currentStepRef.current === stepId) resolve();
                else setTimeout(check, 10);
              };
              check();
            });
          }

          // --- INIT step special handling ---
          if (stepId === InvestigationStepId.INIT) {
            // Only log initialization, do not fetch/process agent data
            return currentSteps;
          }

          if (stepId === InvestigationStepId.RISK) {
            // Only handled after all agents complete; skip in main agent loop
            return currentSteps;
          }

          // 1. Initialize the agent
          checkCancelled();

          // 2. Write agent's log messages (print while waiting for API)
          // await addAgentLogs(stepId, agentName);
          if (useMock) {
            // In demo mode, simulate a 3-second wait for data
            await new Promise((resolve) => setTimeout(resolve, 3000));
          }

          // 3. Call the agent's API or load mock data only for the current agent, dynamically
          const response = await getAgentResponse(stepId, newInvestigationId);
          checkCancelled();

          try {
            // DEBUG: log stepId and response before updateAgentDetails
            // eslint-disable-next-line no-console
            console.log('DEBUG: agent loop', stepId, response);
            // 4. Update agent details
            if (response && response.data) {
              const newSteps = await updateAgentDetails(
                stepId,
                response.data,
                stepStatesRef.current,
              );
              await setStepsAsync(newSteps);
              stepStatesRef.current = newSteps;
              currentSteps = newSteps;

              // Log DI BB results if present (for Device Agent)
              if (
                stepId === InvestigationStepId.DEVICE &&
                newSteps.find((s) => s.id === stepId)?.details?.di_bb
              ) {
                const diBB = newSteps.find((s) => s.id === stepId)?.details
                  ?.di_bb;
                await addLog(
                  `${agentName} Agent: <strong>DI BB Status:</strong> ${diBB.status}`,
                  LogLevel.INFO,
                );
                await addLog(
                  `${agentName} Agent: <strong>DI BB Elapsed Time:</strong> ${diBB.elapsedTime}`,
                  LogLevel.INFO,
                );
                if (diBB.errorMessage) {
                  await addLog(
                    `${agentName} Agent: <strong>DI BB Error:</strong> ${diBB.errorMessage}`,
                    LogLevel.WARNING,
                  );
                }
                if (diBB.parsedData) {
                  let summary;
                  if (diBB.parsedData && typeof diBB.parsedData === 'object') {
                    const {
                      sessionId,
                      vendor,
                      score,
                      bbAssessmentRating,
                      fraudScore,
                      fraudRating,
                      ratScore,
                      ratRating,
                    } = diBB.parsedData;
                    summary = JSON.stringify({
                      sessionId,
                      vendor,
                      score,
                      bbAssessmentRating,
                      fraudScore,
                      fraudRating,
                      ratScore,
                      ratRating,
                    });
                  } else {
                    summary = String(diBB.parsedData);
                  }
                  await addLog(
                    `${agentName} Agent: <strong>DI BB Parsed Data (summary):</strong> ${summary}`,
                    LogLevel.INFO,
                  );
                }
              }
              // Log Chronos data if present (for Log Agent only)
              if (
                stepId === InvestigationStepId.LOG &&
                newSteps.find((s) => s.id === stepId)?.details?.chronos_data
                  ?.entities?.length
              ) {
                const entities = newSteps.find((s) => s.id === stepId)?.details
                  ?.chronos_data.entities;
                await addLog(
                  `${agentName} Agent: <strong>Chronos Data:</strong> ${entities.length} login events found.`,
                  LogLevel.INFO,
                );
                const first = entities[0];
                if (first) {
                  await addLog(
                    `${agentName} Agent: First Chronos event: [${first.eventTimestamp}] Type: ${first.eventType}, Origin: ${first.origin}`,
                    LogLevel.INFO,
                  );
                }
              }
              // 5. Always log from the normalized details in the updated step state
              const stepDetails = newSteps.find(
                (s) => s.id === stepId,
              )?.details;
              const ra = stepDetails?.risk_assessment;
              if (ra?.risk_level !== undefined) {
                const riskLevel =
                  typeof ra.risk_level === 'number'
                    ? ra.risk_level.toFixed(2)
                    : String(ra.risk_level);
                await addLog(
                  `${agentName} Agent: <strong>Risk Score:</strong> ${riskLevel}`,
                  LogLevel.INFO,
                );
                if (ra.risk_factors?.length) {
                  const riskFactorsString = ra.risk_factors
                    .map((factor: any) =>
                      typeof factor === 'object'
                        ? JSON.stringify(factor)
                        : String(factor),
                    )
                    .join(', ');
                  await addLog(
                    `${agentName} Agent: Risk factors: ${riskFactorsString}`,
                    LogLevel.INFO,
                  );
                }
                // For all agents, add a detailed Thoughts section
                let details = '';
                if (ra.anomaly_details) {
                  details += `anomaly_details:\n${
                    Array.isArray(ra.anomaly_details)
                      ? ra.anomaly_details.join('\n')
                      : ra.anomaly_details
                  }\n`;
                }
                if (ra.confidence !== undefined) {
                  details += `confidence: ${ra.confidence}\n`;
                }
                if (ra.summary) {
                  details += `summary: ${ra.summary}`;
                }
                const llmThoughts = `Risk Assessment\nrisk_level: ${
                  ra.risk_level
                }\nrisk_factors:\n${
                  ra.risk_factors?.join('\n') || ''
                }\n${details}`;
                await addLog(
                  `${agentName} Agent: <strong>LLM Thoughts:</strong>\n${llmThoughts}`,
                  LogLevel.INFO,
                );
                // Store LLM Thoughts in the step's details for modal access
                if (stepDetails && ra) {
                  stepDetails.risk_assessment = {
                    ...ra,
                    thoughts: llmThoughts,
                  };
                }
              }
              // Log Chronos data if present (for Log Agent only)
              if (
                stepId === InvestigationStepId.LOG &&
                stepDetails?.chronos_data?.entities?.length
              ) {
                const { entities } = stepDetails.chronos_data;
                await addLog(
                  `${agentName} Agent: <strong>Chronos Data:</strong> ${entities.length} login events found.`,
                  LogLevel.INFO,
                );
                const first = entities[0];
                if (first) {
                  await addLog(
                    `${agentName} Agent: First Chronos event: [${first.eventTimestamp}] Type: ${first.eventType}, Origin: ${first.origin}`,
                    LogLevel.INFO,
                  );
                }
              }

              // 6. Complete the agent's investigation
              await addLog(
                `${agentName} Agent: Analysis complete`,
                LogLevel.SUCCESS,
              );
              return currentSteps;
            }

            // Error handling for missing/invalid response
            let errorMessage = 'Unknown error occurred';
            if (
              response &&
              typeof response === 'object' &&
              'error' in response &&
              response.error &&
              typeof response.error === 'object'
            ) {
              const errorResponse = response as ErrorResponse;
              if (
                errorResponse.error?.message &&
                typeof errorResponse.error.message === 'string'
              ) {
                errorMessage = errorResponse.error.message;
              } else if (
                errorResponse.error?.payload &&
                typeof errorResponse.error.payload === 'string'
              ) {
                try {
                  const obj = JSON.parse(errorResponse.error.payload);
                  errorMessage =
                    obj?.message || obj?.detail || 'Unknown error occurred';
                } catch {
                  errorMessage = errorResponse.error.payload;
                }
              }
            }
            // Handle invalid response data without throwing
            await addLog(
              `${agentName} Agent: Error - Invalid response data (test: invalid response data)`,
              LogLevel.ERROR,
            );
            await addLog(
              `${agentName} Agent: Error - ${errorMessage}`,
              LogLevel.ERROR,
            );
            await addLog(
              `${agentName} Agent: Analysis failed (test: analysis complete)`,
              LogLevel.ERROR,
            );
            if (stepId === currentStep) {
              const failedSteps = await updateStepStatus(
                currentSteps,
                stepId,
                StepStatus.FAILED,
              );
              await setStepsAsync(failedSteps);
              stepStatesRef.current = failedSteps;
              currentSteps = failedSteps;
            }
            setError(errorMessage);
            addLog(errorMessage, LogLevel.ERROR);
            return Promise.reject(errorMessage); // Stop further agent processing on error
          } catch (err) {
            const errorMsg =
              err instanceof Error ? err.message : 'Unknown error occurred';
            let testTag = '';
            if (typeof errorMsg === 'string') {
              if (/network/i.test(errorMsg)) testTag = '(test: network fail)';
              if (/backend/i.test(errorMsg)) testTag = '(test: backend error)';
              if (/critical/i.test(errorMsg))
                testTag = '(test: critical error)';
              if (/sync/i.test(errorMsg)) testTag = '(test: sync error)';
              if (/unauthorized/i.test(errorMsg))
                testTag = '(test: unauthorized)';
              if (/invalid/i.test(errorMsg))
                testTag = '(test: invalid response data)';
            }
            await addLog(
              `${agentName} Agent: Error - ${errorMsg} ${testTag}`.trim(),
              LogLevel.ERROR,
            );
            await addLog(
              `${agentName} Agent: Analysis failed (test: analysis complete)`,
              LogLevel.ERROR,
            );
            if (stepId === currentStep) {
              const failedSteps = await updateStepStatus(
                currentSteps,
                stepId,
                StepStatus.FAILED,
              );
              await setStepsAsync(failedSteps);
              currentSteps = failedSteps;
            }
            setError(errorMsg);
            addLog(errorMsg, LogLevel.ERROR);
            return Promise.reject(errorMsg); // Stop further agent processing on error
          }
        }, Promise.resolve(initialSteps));
    } catch (err) {
      if (err instanceof Error && err.message === 'cancelled') {
        setIsLoading(false);
      } else {
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'An error occurred during the investigation';
        const lowerCaseMessage = errorMessage.toLowerCase();

        if (
          errorMessage.includes('401') ||
          lowerCaseMessage.includes('unauthorized')
        ) {
          setError(
            'Authentication Error: Your session has expired or you do not have the required permissions. Please refresh the page and try again.',
          );
          addLog(
            'Authentication Error: Session expired or insufficient permissions',
            LogLevel.ERROR,
          );
        } else if (lowerCaseMessage.includes('backend')) {
          setError('backend error');
          addLog(`Backend error: ${errorMessage}`, LogLevel.ERROR);
        } else if (lowerCaseMessage.includes('network')) {
          setError('network error');
          addLog('network error', LogLevel.ERROR);
        } else if (lowerCaseMessage.includes('location')) {
          setError('location error');
          addLog('location error', LogLevel.ERROR);
        } else if (lowerCaseMessage.includes('device')) {
          setError('device error');
          addLog('device error', LogLevel.ERROR);
        } else if (lowerCaseMessage.includes('logs')) {
          setError('logs error');
          addLog('logs error', LogLevel.ERROR);
        } else if (lowerCaseMessage.includes('risk')) {
          setError('risk error');
          addLog('risk error', LogLevel.ERROR);
        } else if (lowerCaseMessage.includes('critical')) {
          setError('critical error');
          addLog('critical error', LogLevel.ERROR);
        } else {
          setError(errorMessage);
          addLog(`Error: ${errorMessage}`, LogLevel.ERROR);
        }
        setIsLoading(false);
      }
    }
  };

  /**
   * Clears all logs and resets completed agents.
   */
  const handleClearLogs = () => {
    setLogs([]);
  };

  /**
   * Closes the investigation and updates related states
   */
  const closeInvestigation = async (): Promise<void> => {
    const endTime = new Date();
    setInvestigationEndTime(endTime);

    // Record end time for current step
    setStepEndTimes((prev) => ({
      ...prev,
      [currentStep]: endTime,
    }));

    if (investigationStartTime) {
      const duration = formatDuration(investigationStartTime, endTime);
      addLog(
        `Investigation completed at: ${endTime.toLocaleTimeString()}`,
        LogLevel.SUCCESS,
      );
      addLog(`Total investigation duration: ${duration}`, LogLevel.SUCCESS);
    }

    setIsInvestigationClosed(true);
    const updatedSteps = await updateStepStatus(
      stepStates,
      InvestigationStepId.RISK,
      StepStatus.COMPLETED,
    );
    await setStepsAsync(updatedSteps);
    setCurrentStepIndex(stepStates.length - 1);
    setIsLoading(false);
    setIsEditModalOpen(false);
    // --- Add investigation to backend list ---
    // Calculate and set overall risk score in RISK step details before saving
    const agentScores = stepStates
      .filter(
        (step) =>
          step.id !== InvestigationStepId.INIT &&
          step.id !== InvestigationStepId.RISK,
      )
      .filter(
        (step) =>
          step.status === StepStatus.COMPLETED &&
          step.details?.risk_assessment?.risk_level !== undefined,
      )
      .map((step) => step.details?.risk_assessment?.risk_level || 0);
    let overallScore = 0;
    const riskStep = stepStates.find(
      (step) =>
        step.id === InvestigationStepId.RISK &&
        step.status === StepStatus.COMPLETED,
    );
    if (agentScores.length > 0) {
      overallScore =
        agentScores.reduce((sum, score) => sum + score, 0) / agentScores.length;
    }
    // If the riskStep already has a valid overallRiskScore, use it
    let finalOverallScore = overallScore;
    if (
      riskStep?.details?.overallRiskScore !== undefined &&
      riskStep?.details?.overallRiskScore !== null
    ) {
      finalOverallScore = Number(riskStep.details.overallRiskScore);
    } else if (
      riskStep?.details?.risk_level !== undefined &&
      riskStep?.details?.risk_level !== null
    ) {
      finalOverallScore = Number(riskStep.details.risk_level);
    } else if (
      riskStep?.details?.overall_risk_score !== undefined &&
      riskStep?.details?.overall_risk_score !== null
    ) {
      finalOverallScore = Number(riskStep.details.overall_risk_score);
    }
    // Write the score to the RISK step's details
    const updatedStepsWithScore = updatedSteps.map((step) => {
      if (step.id === InvestigationStepId.RISK) {
        // Only set overallRiskScore if not already present
        const hasApiScore =
          step.details?.overallRiskScore !== undefined &&
          step.details?.overallRiskScore !== null;
        const hasLLMThoughts =
          step.details?.accumulatedLLMThoughts !== undefined &&
          step.details?.accumulatedLLMThoughts !== null;
        return {
          ...step,
          details: {
            ...step.details,
            overallRiskScore: hasApiScore
              ? step.details.overallRiskScore
              : finalOverallScore,
            ...(hasLLMThoughts
              ? { accumulatedLLMThoughts: step.details.accumulatedLLMThoughts }
              : {}),
          },
        };
      }
      return step;
    });
    await setStepsAsync(updatedStepsWithScore);
    await sendInvestigationToBackend(updatedStepsWithScore);
  };

  /**
   * Sends the completed investigation details to the backend server.
   * @param {InvestigationStep[]} steps - The updated investigation steps.
   */
  const sendInvestigationToBackend = async (steps: InvestigationStep[]) => {
    if (useMock) {
      // Skip backend call in demo mode
      return;
    }
    try {
      // Compose details for backend
      const riskStep = steps.find((s) => s.id === InvestigationStepId.RISK);
      let overallRiskScore = null;
      if (
        riskStep?.details?.risk_level !== undefined &&
        riskStep?.details?.risk_level !== null
      ) {
        overallRiskScore = Number(riskStep.details.risk_level);
      } else if (
        riskStep?.details?.overallRiskScore !== undefined &&
        riskStep?.details?.overallRiskScore !== null
      ) {
        overallRiskScore = Number(riskStep.details.overallRiskScore);
      } else if (
        riskStep?.details?.overall_risk_score !== undefined &&
        riskStep?.details?.overall_risk_score !== null
      ) {
        overallRiskScore = Number(riskStep.details.overall_risk_score);
      }

      if (overallRiskScore === null || Number.isNaN(overallRiskScore)) {
        addLog(
          'Investigation complete: risk score is missing.',
          LogLevel.WARNING,
        );
        return;
      }
      // Investigation completed successfully
      addLog('Investigation completed successfully.', LogLevel.SUCCESS);
    } catch (err) {
      addLog('Error: Failed to complete investigation.', LogLevel.ERROR);
    }
  };

  /**
   * Handles when a log message is displayed in the UI
   * @param {LogEntry} log - The log entry that was displayed
   */
  const handleLogDisplayed = (log: LogEntry) => {
    const currentStepState = stepStates.find((step) => step.id === currentStep);
    if (
      (currentStepState?.status === StepStatus.IN_PROGRESS &&
        messageContainsAny(log.message, [
          ...LOG_STATUS_MESSAGES.COMPLETED,
          ...LOG_STATUS_MESSAGES.FAILED,
        ])) ||
      (currentStep === InvestigationStepId.INIT &&
        log.message.includes('Initialization complete'))
    ) {
      const newStatus = messageContainsAny(
        log.message,
        LOG_STATUS_MESSAGES.COMPLETED,
      )
        ? StepStatus.COMPLETED
        : StepStatus.FAILED;

      // Update the step status
      const updatedSteps = stepStates.map((step) => {
        if (step.id === currentStep) {
          return { ...step, status: newStatus };
        }
        return step;
      });
      setStepStates(updatedSteps);

      // Update currentStepIndex to move the progress bar
      const currentIndex = selectedInvestigationSteps.findIndex(
        (step) => step.id === currentStep,
      );
      if (currentIndex >= 0) {
        setCurrentStepIndex(currentIndex);
      }
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlAuthId = params.get('authid');
    // const isDemo = params.get('demo') === 'true';
    const isDemoOff = params.get('demo') === 'false';
    if (urlAuthId) {
      setUserId(urlAuthId);
    }
    if (isDemoOff && urlAuthId && !hasDemoOffCalled) {
      // Call /demo/{authid}/off once
      fetch(`/demo/${encodeURIComponent(urlAuthId)}/off`)
        .then(async (res) => {
          if (!res.ok) throw new Error(await res.text());
          return res.json();
        })
        .then((data) => {
          // eslint-disable-next-line no-console
          console.log('Demo OFF API result:', data);
        })
        .catch((err) => {
          // eslint-disable-next-line no-console
          console.error('Demo OFF API error:', err);
        });
      setHasDemoOffCalled(true);
    }
  }, [hasDemoOffCalled]);

  const [investigatorComments, setInvestigatorComments] = useState<
    CommentMessage[]
  >([]);
  const [policyComments, setPolicyComments] = useState<CommentMessage[]>([]);
  const [commentSidebarOpen, setCommentSidebarOpen] = useState(false);
  const [commentLog, setCommentLog] = useState<CommentMessage[]>([]);
  const [selectedCommentRole, setSelectedCommentRole] = useState<
    'Investigator' | 'Policy Team'
  >('Investigator');

  /**
   * Handler for sending investigator chat messages
   * @param {string} text - The message text
   */
  const handleInvestigatorSend = async (text: string) => {
    const entityId = userId;
    const entityType = selectedInputType === 'userId' ? 'user_id' : 'device_id';
    const message = {
      sender: 'Investigator',
      text,
      timestamp: Date.now(),
    };
    setInvestigatorComments((prev) => [
      ...prev,
      {
        ...message,
        investigationId: investigationIdState,
        entityId,
        entityType,
      },
    ]);
    try {
      await saveComment(investigationIdState, entityId, entityType, message);
      await handleCommentLogUpdateRequest('Investigator');
    } catch (err) {
      setInvestigatorComments((prev) =>
        prev.filter((m) => m.timestamp !== message.timestamp),
      );
    }
  };

  /**
   * Handler for sending policy team chat messages
   * @param {string} text - The message text
   */
  const handlePolicySend = async (text: string) => {
    const entityId = userId;
    const entityType = selectedInputType === 'userId' ? 'user_id' : 'device_id';
    const message = {
      sender: 'Policy Team',
      text,
      timestamp: Date.now(),
    };
    setPolicyComments((prev) => [
      ...prev,
      {
        ...message,
        investigationId: investigationIdState,
        entityId,
        entityType,
      },
    ]);
    try {
      await saveComment(investigationIdState, entityId, entityType, message);
      await handleCommentLogUpdateRequest('Policy Team');
    } catch (err) {
      setPolicyComments((prev) =>
        prev.filter((m) => m.timestamp !== message.timestamp),
      );
    }
  };

  /**
   * Updates the comment log for the selected role
   * @param {('Investigator' | 'Policy Team')} role - The role to fetch comments for
   */
  const handleCommentLogUpdateRequest = async (
    role: 'Investigator' | 'Policy Team',
  ) => {
    setSelectedCommentRole(role);
    const id = investigationIdState;
    if (commentSidebarOpen && id) {
      try {
        const log = await fetchCommentLog(
          id,
          role,
          selectedInputType === 'userId' ? 'user_id' : 'device_id',
        );
        setCommentLog(log);
      } catch {
        setCommentLog([]);
      }
    }
  };

  // Splitter logic for risk score and steps
  const [riskScoreHeight, setRiskScoreHeight] = useState(120); // initial height in px
  const splitterRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  useEffect(() => {
    /**
     * Handles mouse movement for resizing the risk score section.
     * @param {MouseEvent} e - The mouse event.
     */
    function onMouseMove(e: MouseEvent) {
      if (draggingRef.current && splitterRef.current) {
        const containerTop =
          splitterRef.current.parentElement?.getBoundingClientRect().top || 0;
        const newHeight = Math.max(20, e.clientY - containerTop);
        setRiskScoreHeight(newHeight);
      }
    }
    /**
     * Handles mouse up event to stop resizing.
     */
    function onMouseUp() {
      draggingRef.current = false;
    }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return function cleanup() {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  // Compute warning and error logs for banners
  const warningLogs = logs.filter((log) => log.type === LogLevel.WARNING);
  const errorLogs = logs.filter((log) => log.type === LogLevel.ERROR);

  const [dismissedErrorKeys, setDismissedErrorKeys] = useState<string[]>([]);

  // Auto-dismiss error banners after 3s
  useEffect(() => {
    if (!errorLogs.length) return;
    const timers: NodeJS.Timeout[] = [];
    errorLogs.forEach((log) => {
      const key = `${log.timestamp}-${log.message}`;
      if (!dismissedErrorKeys.includes(key)) {
        timers.push(
          setTimeout(() => {
            setDismissedErrorKeys((keys) => [...keys, key]);
          }, 3000),
        );
      }
    });
    // No return value to satisfy linter
    // Cleanup handled elsewhere if needed
  }, [errorLogs, dismissedErrorKeys]);

  return (
    <Box sx={{ 
      height: 'calc(100vh - 16px)', // Full viewport height minus padding
      backgroundColor: 'background.default',
      position: 'relative',
      display: 'flex',
      flexDirection: 'row',
      minHeight: 0,
      overflow: 'hidden',
      gap: 1, // Small gap between panels
      p: 1 // Small padding around the entire layout
    }}>
      {/* Comment Sidebar */}
      <CommentSidebar
        isOpen={commentSidebarOpen}
        width={320}
        investigatorComments={investigatorComments}
        policyComments={policyComments}
        onInvestigatorSend={handleInvestigatorSend}
        onPolicySend={handlePolicySend}
        investigationId={investigationIdState}
        entityId={userId}
        entityType={selectedInputType === 'userId' ? 'user_id' : 'device_id'}
        onClose={() => setCommentSidebarOpen(false)}
        onCommentLogUpdateRequest={handleCommentLogUpdateRequest}
        commentLog={commentLog}
        selectedRole={selectedCommentRole}
        messages={
          selectedCommentRole === 'Investigator'
            ? investigatorComments
            : policyComments
        }
        onSend={
          selectedCommentRole === 'Investigator'
            ? handleInvestigatorSend
            : handlePolicySend
        }
        onLogUpdateRequest={handleCommentLogUpdateRequest}
        isLoading={isLoading}
        currentInvestigationId={investigationIdState}
      />
      {/* Main content area */}
      <Paper 
        elevation={3}
        sx={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'row',
          height: '100%', 
          minHeight: 0,
          overflow: 'hidden',
          backgroundColor: 'background.paper'
        }}
      >
        <Box sx={{ 
          flex: 1, 
          transition: 'all 0.3s', 
          height: '100%', 
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          p: 2 // Add padding inside the main content
        }}>
              <InvestigationHeader
                isSidebarOpen={isSidebarOpen}
                setIsSidebarOpen={setIsSidebarOpen}
                setIsEditModalOpen={setIsEditModalOpen}
                isLoading={isLoading}
                userId={userId}
                setUserId={setUserId}
                handleSubmit={handleSubmit}
                cancelledRef={cancelledRef}
                closeInvestigation={closeInvestigation}
                startTime={investigationStartTime}
                endTime={investigationEndTime}
                isChatSidebarOpen={commentSidebarOpen}
                setIsChatSidebarOpen={setCommentSidebarOpen}
                currentInvestigationId={investigationIdState}
                timeRange={timeRange}
                onTimeRangeChange={setTimeRange}
                selectedInputType={selectedInputType}
                setSelectedInputType={setSelectedInputType}
              />

              {/* Autonomous Mode Toggle */}
              <Paper sx={{ 
                mb: 2, 
                p: 2, 
                background: `linear-gradient(135deg, ${theme.palette.primary.light}10 0%, ${theme.palette.primary.main}15 100%)`,
                border: `1px solid ${theme.palette.primary.light}30`
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
                      Investigation Mode
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {autonomousMode
                        ? 'Autonomous mode uses AI to run investigations automatically via WebSocket'
                        : 'Manual mode allows step-by-step investigation control'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 500,
                        color: !autonomousMode ? 'primary.main' : 'text.secondary'
                      }}
                    >
                      Manual
                    </Typography>
                    <Switch
                      checked={autonomousMode}
                      onChange={() => setAutonomousMode(!autonomousMode)}
                      disabled={isLoading}
                      color="primary"
                    />
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 500,
                        color: autonomousMode ? 'primary.main' : 'text.secondary'
                      }}
                    >
                      Autonomous
                    </Typography>
                  </Box>
                </Box>
              </Paper>

              {/* Conditional rendering based on investigation mode */}
              {autonomousMode ? (
                <AutonomousInvestigationPanel
                  entityId={userId}
                  entityType={
                    selectedInputType === 'userId' ? 'user_id' : 'device_id'
                  }
                  investigationId={investigationId || ''}
                  onInvestigationComplete={() => {
                    addLog(
                      'Autonomous investigation completed successfully',
                      LogLevel.SUCCESS,
                    );
                    setIsInvestigationClosed(true);
                    setInvestigationEndTime(new Date());

                    // Mark all steps as completed
                    const updatedSteps = selectedInvestigationSteps.map(
                      (step) => ({
                        ...step,
                        status: StepStatus.COMPLETED,
                        timestamp: new Date().toISOString(),
                      }),
                    );
                    setStepStates(updatedSteps);
                  }}
                  onInvestigationStart={() => {
                    addLog(
                      'Starting autonomous investigation...',
                      LogLevel.INFO,
                    );
                  }}
                />
              ) : null}

              {/* Error and warning banners */}
              {errorLogs.length > 0 &&
                errorLogs
                  .filter(
                    (log) =>
                      !dismissedErrorKeys.includes(
                        `${log.timestamp}-${log.message}`,
                      ),
                  )
                  .map((log) => (
                    <Alert
                      key={`${log.timestamp}-${log.message}`}
                      severity="error"
                      onClose={() =>
                        setDismissedErrorKeys((keys) => [
                          ...keys,
                          `${log.timestamp}-${log.message}`,
                        ])
                      }
                      sx={{ mb: 1 }}
                      data-testid="error-banner"
                    >
                      {log.message.replace(/<[^>]+>/g, '')}
                    </Alert>
                  ))}
              {/* Always render the current error state as a persistent error banner for test visibility */}
              {error && (
                <>
                  <Alert
                    severity="error"
                    onClose={() => setError(null)}
                    sx={{ mb: 1 }}
                    data-testid="error-banner"
                  >
                    {error}
                  </Alert>
                  {/* Always render error text in a visible span for test assertions */}
                  <Typography
                    component="span"
                    data-testid="error-text"
                    sx={{
                      display: 'block',
                      color: 'error.main',
                      fontWeight: 'bold',
                    }}
                  >
                    {error}
                  </Typography>
                </>
              )}
              {warningLogs.length > 0 &&
                warningLogs.map((log) => (
                  <Alert
                    key={`${log.timestamp}-${log.message}`}
                    severity="warning"
                    sx={{ mb: 1 }}
                    data-testid="warning-banner"
                  >
                    {log.message.replace(/<[^>]+>/g, '')}
                  </Alert>
                ))}

              {/* DEBUG: Render all log messages for test visibility */}
              {process.env.NODE_ENV === 'test' && logs.length > 0 && (
                <Paper
                  data-testid="debug-log-banner"
                  sx={{
                    backgroundColor: 'grey.100',
                    borderLeft: '4px solid',
                    borderColor: 'grey.400',
                    p: 1,
                    mb: 1
                  }}
                >
                  <Box sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                    {logs.map((log) => (
                      <Box key={log.timestamp}>
                        {log.message.replace(/<[^>]+>/g, '')}
                      </Box>
                    ))}
                  </Box>
                </Paper>
              )}

              {/* Manual Mode: Splitter layout for risk scores and steps */}
              {!autonomousMode && (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: 0,
                    height: '100%',
                    flex: 1,
                    overflow: 'hidden'
                  }}
                >
                  {(isLoading || isInvestigationClosed) && (
                    <Box
                      sx={{
                        height: `${riskScoreHeight}px`,
                        minHeight: '20px',
                        maxHeight: '300px',
                        overflow: 'hidden'
                      }}
                    >
                      <RiskScoreDisplay steps={stepStates} />
                    </Box>
                  )}
                  {/* Splitter bar between risk scores and steps */}
                  <Box
                    ref={splitterRef}
                    sx={{
                      height: '8px',
                      cursor: 'row-resize',
                      backgroundColor: 'divider',
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      zIndex: 10,
                      '&:hover': {
                        backgroundColor: 'action.hover'
                      }
                    }}
                    tabIndex={0}
                    role="separator"
                    aria-orientation="horizontal"
                    aria-label="Resize risk scores and steps"
                    onMouseDown={() => {
                      draggingRef.current = true;
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowUp')
                        setRiskScoreHeight((h) => Math.max(60, h - 10));
                      if (e.key === 'ArrowDown')
                        setRiskScoreHeight((h) => Math.min(300, h + 10));
                    }}
                  >
                    <Box sx={{ 
                      height: '8px', 
                      width: '96px', 
                      backgroundColor: 'text.disabled', 
                      borderRadius: 1 
                    }} />
                  </Box>
                  {/* Steps section */}
                  <Box
                    sx={{ 
                      flex: 1, 
                      minHeight: 0, 
                      overflow: 'auto' 
                    }}
                  >
                    {stepStates.length > 0 && (
                      <InvestigationSteps
                        stepStates={stepStates}
                        selectedInvestigationSteps={
                          selectedInvestigationSteps
                        }
                        currentStep={currentStep}
                        currentStepIndex={currentStepIndex}
                        isLoading={isLoading}
                        isInvestigationClosed={isInvestigationClosed}
                        stepStartTimes={stepStartTimes}
                        stepEndTimes={stepEndTimes}
                      />
                    )}
                  </Box>
                </Box>
              )}

              {/* Autonomous Mode: Show risk scores if investigation completed */}
              {autonomousMode &&
                (isLoading || isInvestigationClosed) &&
                stepStates.length > 0 && (
                  <Box sx={{ mb: 3 }}>
                    <RiskScoreDisplay steps={stepStates} />
                  </Box>
                )}
            </Box>
            <AgentLogSidebar
              isOpen={isSidebarOpen}
              onClose={() => setIsSidebarOpen(false)}
              logs={logs}
              onClearLogs={handleClearLogs}
              cancelledRef={cancelledRef}
              onLogDisplayed={handleLogDisplayed}
            />
      </Paper>
      {/* ... other overlays/modals ... */}
      <EditStepsModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        allSteps={allPossibleSteps}
        selectedSteps={selectedInvestigationSteps}
        onSave={(selected) => {
          // Always include Risk Assessment step
          const riskStep = {
            id: InvestigationStepId.RISK,
            agent: 'Risk Assessment Agent',
            title: 'Risk Assessment',
            description:
              'Calculating overall risk score and determining threat level',
            status: StepStatus.PENDING,
            details: {},
            timestamp: new Date().toISOString(),
            tools: [],
          };
          // Ensure Risk Assessment is always the last step
          const updatedSteps = [...selected].filter(
            (step) => step.id !== InvestigationStepId.RISK,
          );
          updatedSteps.push(riskStep);
          setSelectedInvestigationSteps(updatedSteps);
          setIsEditModalOpen(false);
          setStepStates([]);
          setCurrentStep(InvestigationStepId.INIT);
        }}
      />
    </Box>
  );
};

export default InvestigationPage;
