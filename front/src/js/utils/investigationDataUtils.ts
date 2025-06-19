import { InvestigationStepId, LogLevel } from '../types/RiskAssessment';
import { formatTimestamp } from './investigation';
import {
  NetworkAnalysisResponse,
  DeviceAnalysisResponse,
  LocationAnalysisResponse,
  LogsAnalysisResponse,
  RiskAssessmentResponse,
  OiiResponse,
  DeviceChronosResponse,
  LocationRiskAnalysisResponse,
  InvestigationResponse,
  CommentResponse,
} from '../types/ApiResponses';
import { CommentMessage } from '../components/CommentWindow';

/**
 * Validates the response data for a specific step.
 * @param {InvestigationStepId} stepId - The ID of the step
 * @param {any} response - The response data to validate
 * @param {(msg: string, type?: LogLevel) => Promise<void>} addLog - Async log function
 * @returns {Promise<boolean>} Whether the response is valid
 */
export async function validateResponse(
  stepId: InvestigationStepId,
  response: any,
  addLog: (_msg: string, _type?: LogLevel) => Promise<void>,
): Promise<boolean> {
  const agentName = stepId.charAt(0).toUpperCase() + stepId.slice(1);
  if (!response) {
    await addLog(`${agentName} Agent: Invalid response data`, LogLevel.ERROR);
    await addLog(
      `${agentName} Agent: Received an error or invalid response. Unable to display Agent Data`,
      LogLevel.ERROR,
    );
    return false;
  }

  if (stepId === InvestigationStepId.LOCATION) {
    // Support both new format (splunk_locations + llm_thoughts) and API documented format
    const hasNewFormat =
      response.splunk_locations &&
      Array.isArray(response.splunk_locations) &&
      response.llm_thoughts;
    const hasLegacyFormat =
      response.locations &&
      Array.isArray(response.locations) &&
      response.location_risk_assessment;
    const hasActualLocationFormat =
      response.location_risk_assessment &&
      (response.device_locations || response.vector_search_results);
    const hasApiDocumentedFormat =
      response.overall_location_risk_assessment ||
      response.oii_location_info ||
      response.business_location_info ||
      response.phone_location_info ||
      response.device_analysis_results;

    if (
      !hasNewFormat &&
      !hasLegacyFormat &&
      !hasActualLocationFormat &&
      !hasApiDocumentedFormat
    ) {
      await addLog(
        `${agentName} Agent: Invalid location data format`,
        LogLevel.ERROR,
      );
      await addLog(
        `${agentName} Agent: Expected splunk_locations array and llm_thoughts (new format), locations array and location_risk_assessment (legacy format), location_risk_assessment with device_locations (actual API format), or API documented format with overall_location_risk_assessment in response`,
        LogLevel.ERROR,
      );
      return false;
    }
  } else if (stepId === InvestigationStepId.NETWORK) {
    if (!response.network_risk_assessment && !response.risk_assessment) {
      await addLog(
        `${agentName} Agent: Missing network risk assessment data`,
        LogLevel.ERROR,
      );
      await addLog(
        `${agentName} Agent: Expected network_risk_assessment (API documented format) or risk_assessment (legacy format) in response`,
        LogLevel.ERROR,
      );
      return false;
    }
  } else if (stepId === InvestigationStepId.DEVICE) {
    if (
      !response.device_risk_assessment &&
      !response.device_signal_risk_assessment &&
      !response.device_llm_assessment &&
      !response.risk_assessment
    ) {
      await addLog(
        `${agentName} Agent: Missing device risk assessment data`,
        LogLevel.ERROR,
      );
      await addLog(
        `${agentName} Agent: Expected device_risk_assessment (API documented format), device_llm_assessment (actual API format), device_signal_risk_assessment (new format), or risk_assessment (legacy format) in response`,
        LogLevel.ERROR,
      );
      return false;
    }
  } else if (stepId === InvestigationStepId.LOG) {
    if (!response.logs_risk_assessment && !response.risk_assessment) {
      await addLog(
        `${agentName} Agent: Missing log risk assessment data`,
        LogLevel.ERROR,
      );
      await addLog(
        `${agentName} Agent: Expected logs_risk_assessment (API documented format) or risk_assessment (legacy format) in response`,
        LogLevel.ERROR,
      );
      return false;
    }
  } else {
    await addLog(`${agentName} Agent: Unknown step type`, LogLevel.ERROR);
    return false;
  }

  return true;
}

/**
 * Processes network agent response data.
 * @param {any} response - The network agent response object
 * @returns {Partial<NetworkAnalysisResponse>} Processed network agent details
 */
export function processNetworkData(
  response: any,
): Partial<NetworkAnalysisResponse> {
  let riskAssessment = null;
  if (response?.network_risk_assessment) {
    const nra = response.network_risk_assessment;
    riskAssessment = {
      risk_level: nra.risk_level,
      risk_factors: nra.risk_factors || [],
      anomaly_details: nra.anomaly_details || [],
      confidence: nra.confidence,
      summary: nra.summary,
      thoughts: nra.thoughts,
      timestamp: formatTimestamp(nra.timestamp),
    };
  } else if (response?.risk_assessment) {
    const ra = response.risk_assessment;
    riskAssessment = {
      risk_level: ra.risk_level,
      risk_factors: ra.risk_factors || [],
      anomaly_details: ra.anomaly_details || [],
      confidence: ra.confidence,
      summary: ra.summary,
      timestamp: formatTimestamp(ra.timestamp),
    };
  }
  const parsedChronos = response?.chronos_data?.entities
    ? response.chronos_data.entities.map((entity: any) => ({
        eventType: entity.eventType,
        eventTimestamp: entity.eventTimestamp,
        origin: entity.origin,
        ...(entity.data || {}),
      }))
    : null;

  return {
    ...response,
    // API documented format fields
    user_id: response?.user_id,
    raw_splunk_results_count: response?.raw_splunk_results_count,
    extracted_network_signals:
      response?.extracted_network_signals?.map((signal: any) => ({
        ...signal,
        timestamp: signal.timestamp
          ? formatTimestamp(signal.timestamp)
          : signal.timestamp,
      })) || [],
    network_risk_assessment: response?.network_risk_assessment
      ? {
          ...response.network_risk_assessment,
          timestamp: formatTimestamp(
            response.network_risk_assessment.timestamp,
          ),
        }
      : null,
    // Legacy format fields for backward compatibility
    current_network: response?.current_network
      ? {
          ...response.current_network,
          timestamp: formatTimestamp(response.current_network.timestamp),
        }
      : null,
    network_history:
      response?.network_history?.map((history: any) => ({
        ...history,
        timestamp: formatTimestamp(history.timestamp),
      })) || [],
    risk_assessment: riskAssessment,
    // Common fields
    chronos_data: response?.chronos_data || null,
    parsed_chronos: parsedChronos,
    llm_thoughts: response?.llm_thoughts,
    // Add new optional fields if they exist
    ...(response.investigationId && {
      investigationId: response.investigationId,
    }),
    ...(response.userId && { userId: response.userId }),
  };
}

/**
 * Processes device agent response data.
 * @param {any} response - The device agent response object
 * @returns {Partial<DeviceAnalysisResponse>} Processed device agent details
 */
export function processDeviceData(
  response: any,
): Partial<DeviceAnalysisResponse> {
  let riskAssessment = null;
  if (response?.device_signal_risk_assessment) {
    riskAssessment = {
      ...response.device_signal_risk_assessment,
      timestamp: formatTimestamp(
        response.device_signal_risk_assessment.timestamp,
      ),
    };
  } else if (response?.device_risk_assessment) {
    riskAssessment = {
      ...response.device_risk_assessment,
      timestamp: formatTimestamp(response.device_risk_assessment.timestamp),
    };
  } else if (response?.device_llm_assessment) {
    riskAssessment = {
      ...response.device_llm_assessment,
      timestamp: formatTimestamp(response.device_llm_assessment.timestamp),
    };
  } else if (response?.risk_assessment) {
    riskAssessment = {
      ...response.risk_assessment,
      timestamp: formatTimestamp(response.risk_assessment.timestamp),
    };
  }

  let deviceSignalRiskAssessment = null;
  if (response?.device_signal_risk_assessment) {
    deviceSignalRiskAssessment = {
      ...response.device_signal_risk_assessment,
      timestamp: formatTimestamp(
        response.device_signal_risk_assessment.timestamp,
      ),
    };
  } else if (response?.device_risk_assessment) {
    deviceSignalRiskAssessment = {
      ...response.device_risk_assessment,
      timestamp: formatTimestamp(response.device_risk_assessment.timestamp),
    };
  } else if (response?.device_llm_assessment) {
    deviceSignalRiskAssessment = {
      ...response.device_llm_assessment,
      timestamp: formatTimestamp(response.device_llm_assessment.timestamp),
    };
  }

  // Process raw splunk results with timestamp formatting
  const processedRawSplunkResults =
    response?.raw_splunk_results?.map((result: any) => ({
      ...result,
      _time: result._time ? formatTimestamp(result._time) : result._time,
    })) || [];

  // Process extracted device signals with timestamp formatting
  const processedExtractedDeviceSignals =
    response?.extracted_device_signals?.map((signal: any) => ({
      ...signal,
      _time: signal._time ? formatTimestamp(signal._time) : signal._time,
    })) || [];

  const parsedChronos = response?.chronos_data?.entities
    ? response.chronos_data.entities.map((entity: any) => ({
        eventType: entity.eventType,
        eventTimestamp: entity.eventTimestamp,
        origin: entity.origin,
        ...(entity.data || {}),
      }))
    : null;

  // DI BB integration
  let diBB = null;
  if (response?.di_bb) {
    let parsedData = null;
    if (typeof response.di_bb.data === 'string') {
      try {
        parsedData = JSON.parse(response.di_bb.data);
      } catch {
        parsedData = { raw: response.di_bb.data };
      }
    } else if (
      typeof response.di_bb.data === 'object' &&
      response.di_bb.data !== null
    ) {
      parsedData = response.di_bb.data;
    } else {
      parsedData = {};
    }
    diBB = {
      ...response.di_bb,
      parsedData,
    };
  }

  return {
    ...response,
    // API documented format fields
    entity_id: response?.entity_id,
    entity_type: response?.entity_type,
    raw_splunk_results_count: response?.raw_splunk_results_count,
    extracted_device_signals: processedExtractedDeviceSignals,
    device_risk_assessment: response?.device_risk_assessment
      ? {
          ...response.device_risk_assessment,
          timestamp: formatTimestamp(response.device_risk_assessment.timestamp),
        }
      : null,
    chronos_entities: response?.chronos_entities || [],
    // New format fields
    raw_splunk_results: processedRawSplunkResults,
    device_signal_risk_assessment: deviceSignalRiskAssessment,
    // Legacy format fields for backward compatibility
    current_device: response?.current_device
      ? {
          ...response.current_device,
          timestamp: formatTimestamp(response.current_device.timestamp),
        }
      : null,
    device_history:
      response?.device_history?.map((history: any) => ({
        ...history,
        timestamp: formatTimestamp(history.timestamp),
      })) || [],
    risk_assessment: riskAssessment,
    // Common fields
    chronos_data: response?.chronos_data || null,
    parsed_chronos: parsedChronos,
    di_bb: diBB,
    // Additional fields from new format
    user_id: response?.user_id,
    timestamp: response?.timestamp ? formatTimestamp(response.timestamp) : null,
    chronos_warning: response?.chronos_warning,
    di_tool_warning: response?.di_tool_warning,
    llm_thoughts: response?.llm_thoughts,
  };
}

/**
 * Processes log agent response data.
 * @param {any} response - The log agent response object
 * @returns {Partial<LogsAnalysisResponse>} Processed log agent details
 */
export function processLogData(response: any): Partial<LogsAnalysisResponse> {
  let riskAssessment = null;
  // Prioritize logs_risk_assessment (API documented format) over risk_assessment (legacy)
  if (response?.logs_risk_assessment) {
    riskAssessment = {
      ...response.logs_risk_assessment,
      timestamp: formatTimestamp(response.logs_risk_assessment.timestamp),
    };
  } else if (response?.log_risk_assessment) {
    // Legacy format from mock data
    riskAssessment = {
      ...response.log_risk_assessment,
      timestamp: formatTimestamp(response.log_risk_assessment.timestamp),
    };
  } else if (response?.risk_assessment) {
    // Legacy format
    riskAssessment = {
      ...response.risk_assessment,
      timestamp: formatTimestamp(response.risk_assessment.timestamp),
    };
  }

  let logRiskAssessment = null;
  if (response?.logs_risk_assessment) {
    logRiskAssessment = {
      ...response.logs_risk_assessment,
      timestamp: formatTimestamp(response.logs_risk_assessment.timestamp),
    };
  } else if (response?.log_risk_assessment) {
    logRiskAssessment = {
      ...response.log_risk_assessment,
      timestamp: formatTimestamp(response.log_risk_assessment.timestamp),
    };
  } else if (response?.risk_assessment) {
    logRiskAssessment = {
      ...response.risk_assessment,
      timestamp: formatTimestamp(response.risk_assessment.timestamp),
    };
  }
  const parsedChronos = response?.chronos_data?.entities
    ? response.chronos_data.entities.map((entity: any) => ({
        eventType: entity.eventType,
        eventTimestamp: entity.eventTimestamp,
        origin: entity.origin,
        ...(entity.data || {}),
      }))
    : null;
  return {
    ...response,
    // Process extracted log signals from API documented format
    extracted_log_signals:
      response?.extracted_log_signals?.map((signal: any) => ({
        ...signal,
        timestamp: signal.timestamp
          ? formatTimestamp(signal.timestamp)
          : signal.timestamp,
      })) || [],
    // Handle legacy behavior patterns
    behavior_patterns: response?.behavior_patterns
      ? {
          ...response.behavior_patterns,
          login_times: response.behavior_patterns?.login_times?.map(
            (time: string | number | Date) => formatTimestamp(time),
          ),
          usual_locations: response.behavior_patterns?.usual_locations,
          common_devices: response.behavior_patterns?.common_devices,
        }
      : null,
    // Handle legacy anomalies
    anomalies:
      response?.anomalies?.map((anomaly: any) => ({
        ...anomaly,
        timestamp: formatTimestamp(anomaly.timestamp),
      })) || [],
    // Risk assessment fields
    risk_assessment: riskAssessment,
    logs_risk_assessment: response?.logs_risk_assessment
      ? {
          ...response.logs_risk_assessment,
          timestamp: formatTimestamp(response.logs_risk_assessment.timestamp),
        }
      : null,
    log_risk_assessment: logRiskAssessment,
    // Other fields
    chronos_entities: response?.chronos_entities || [],
    chronos_data: response?.chronos_data || null,
    parsed_chronos: parsedChronos,
    entity_id: response?.entity_id,
    entity_type: response?.entity_type,
    raw_splunk_results_count: response?.raw_splunk_results_count,
  };
}

/**
 * Processes location agent response data.
 * @param {any} response - The location agent response object
 * @returns {any} Processed location agent details
 */
export async function processLocationData(response: any) {
  let riskAssessment = null;

  // Handle different response formats
  if (response?.llm_thoughts) {
    // New format with llm_thoughts
    riskAssessment = {
      ...response.llm_thoughts,
      timestamp: response.llm_thoughts.timestamp
        ? formatTimestamp(response.llm_thoughts.timestamp)
        : response.timestamp
        ? formatTimestamp(response.timestamp)
        : undefined,
    };
  } else if (response?.location_risk_assessment) {
    // Current API format with location_risk_assessment
    riskAssessment = {
      ...response.location_risk_assessment,
      timestamp: response.location_risk_assessment.timestamp
        ? formatTimestamp(response.location_risk_assessment.timestamp)
        : response.timestamp
        ? formatTimestamp(response.timestamp)
        : undefined,
    };
  } else if (response?.overall_location_risk_assessment) {
    // API documented format
    riskAssessment = {
      ...response.overall_location_risk_assessment,
      timestamp: response.overall_location_risk_assessment.timestamp
        ? formatTimestamp(response.overall_location_risk_assessment.timestamp)
        : response.timestamp
        ? formatTimestamp(response.timestamp)
        : undefined,
    };
  }

  return {
    ...response,
    risk_assessment: riskAssessment,
    // Handle different location data formats
    splunk_locations: response?.splunk_locations || [],
    locations: response?.locations || [],
    oii_location_info: response?.oii_location_info || null,
    business_location_info: response?.business_location_info || null,
    phone_location_info: response?.phone_location_info || null,
    device_analysis_results: response?.device_analysis_results || null,
    overall_location_risk_assessment:
      response?.overall_location_risk_assessment || null,
    // Legacy fields
    oii_locations: response?.oii_locations || [],
    vector_search_results: response?.vector_search_results || null,
    timestamp: response?.timestamp ? formatTimestamp(response.timestamp) : null,
  };
}

/**
 * Processes Comment API response data and converts to UI format.
 * @param {any} response - The comment response object or array
 * @returns {CommentMessage[]} Processed comment details in UI format (always array)
 */
export function processCommentData(response: any): CommentMessage[] {
  if (Array.isArray(response)) {
    return response.map((comment: any) => ({
      sender: comment.sender || '',
      text: comment.text || '',
      timestamp: comment.timestamp || Date.now(),
      investigationId: comment.investigation_id || '',
      entityId: comment.entity_id || '',
      entityType: comment.entity_type || 'user_id',
    }));
  }
  // For single comment, return as array
  return [
    {
      sender: response?.sender || '',
      text: response?.text || '',
      timestamp: response?.timestamp || Date.now(),
      investigationId: response?.investigation_id || '',
      entityId: response?.entity_id || '',
      entityType: response?.entity_type || 'user_id',
    },
  ];
}

/**
 * Processes Investigation Management API response data.
 * @param {any} response - The investigation response object or array
 * @returns {InvestigationResponse | InvestigationResponse[]} Processed investigation details
 */
export function processInvestigationData(
  response: any,
): InvestigationResponse | InvestigationResponse[] {
  if (Array.isArray(response)) {
    return response.map((investigation: any) => ({
      ...investigation,
      created_at: investigation.created_at
        ? formatTimestamp(investigation.created_at)
        : null,
      updated_at: investigation.updated_at
        ? formatTimestamp(investigation.updated_at)
        : null,
    }));
  }
  return {
    ...response,
    created_at: response?.created_at
      ? formatTimestamp(response.created_at)
      : null,
    updated_at: response?.updated_at
      ? formatTimestamp(response.updated_at)
      : null,
  };
}

/**
 * Processes OII (Online Identity Information) response data.
 * @param {any} response - The OII response object
 * @returns {Partial<OiiResponse>} Processed OII details
 */
export function processOiiData(response: any): Partial<OiiResponse> {
  return {
    ...response,
    user_id: response?.user_id,
    profile_data:
      {
        ...response?.profile_data,
        last_login: response?.profile_data?.last_login
          ? formatTimestamp(response.profile_data.last_login)
          : null,
      } || {},
    location_info: response?.location_info
      ? {
          ...response.location_info,
          last_updated: response.location_info.last_updated
            ? formatTimestamp(response.location_info.last_updated)
            : null,
        }
      : null,
    risk_indicators: response?.risk_indicators || {},
    timestamp: response?.timestamp ? formatTimestamp(response.timestamp) : null,
  };
}

/**
 * Processes Risk Assessment API response data.
 * @param {any} response - The risk assessment response object
 * @returns {Partial<RiskAssessmentResponse>} Processed risk assessment details
 */
export function processRiskAssessmentData(
  response: any,
): Partial<RiskAssessmentResponse> {
  return {
    ...response,
    user_id: response?.user_id,
    investigation_id: response?.investigation_id,
    overall_risk_score: response?.overall_risk_score,
    risk_breakdown: response?.risk_breakdown || {},
    domain_assessments: response?.domain_assessments || {},
    overall_risk_factors: response?.overall_risk_factors || [],
    confidence: response?.confidence,
    summary: response?.summary,
    recommendation: response?.recommendation,
    thoughts: response?.thoughts,
    timestamp: response?.timestamp ? formatTimestamp(response.timestamp) : null,
  };
}

/**
 * Processes Device Chronos API response data.
 * @param {any} response - The device chronos response object
 * @returns {Partial<DeviceChronosResponse>} Processed device chronos details
 */
export function processDeviceChronosData(
  response: any,
): Partial<DeviceChronosResponse> {
  return {
    ...response,
    results:
      response?.results?.map((result: any) => ({
        ...result,
        ts: result.ts ? formatTimestamp(result.ts) : result.ts,
      })) || [],
    total_count: response?.total_count,
    query_metadata: response?.query_metadata || {},
  };
}

/**
 * Processes Location Risk Analysis API response data (consolidated format).
 * @param {any} response - The location risk analysis response object
 * @returns {Partial<LocationRiskAnalysisResponse>} Processed location risk analysis details
 */
export function processLocationRiskAnalysisData(
  response: any,
): Partial<LocationRiskAnalysisResponse> {
  return {
    ...response,
    entity_id: response?.entity_id,
    entity_type: response?.entity_type,
    user_id: response?.user_id,
    oii_location_info: response?.oii_location_info || null,
    business_location_info: response?.business_location_info || null,
    phone_location_info: response?.phone_location_info || null,
    device_analysis_results: response?.device_analysis_results
      ? {
          ...response.device_analysis_results,
          device_risk_assessment: response.device_analysis_results
            .device_risk_assessment
            ? {
                ...response.device_analysis_results.device_risk_assessment,
                timestamp: formatTimestamp(
                  response.device_analysis_results.device_risk_assessment
                    .timestamp,
                ),
              }
            : null,
        }
      : null,
    overall_location_risk_assessment: response?.overall_location_risk_assessment
      ? {
          ...response.overall_location_risk_assessment,
          timestamp: formatTimestamp(
            response.overall_location_risk_assessment.timestamp,
          ),
        }
      : null,
    timestamp: response?.timestamp ? formatTimestamp(response.timestamp) : null,
  };
}

// Note: processLocationData is async and requires addLog and geocodeAddress, so it should be imported and passed in from the main page.
