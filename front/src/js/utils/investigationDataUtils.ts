import { InvestigationStepId, LogLevel } from '../types/RiskAssessment';
import { formatTimestamp } from './investigation';

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
    // Support both new format (splunk_locations + llm_thoughts) and legacy format (locations + location_risk_assessment)
    const hasNewFormat =
      response.splunk_locations &&
      Array.isArray(response.splunk_locations) &&
      response.llm_thoughts;
    const hasLegacyFormat =
      response.locations &&
      Array.isArray(response.locations) &&
      response.location_risk_assessment;

    if (!hasNewFormat && !hasLegacyFormat) {
      await addLog(
        `${agentName} Agent: Invalid location data format`,
        LogLevel.ERROR,
      );
      await addLog(
        `${agentName} Agent: Expected splunk_locations array and llm_thoughts (new format) or locations array and location_risk_assessment (legacy format) in response`,
        LogLevel.ERROR,
      );
      return false;
    }
  } else if (stepId === InvestigationStepId.NETWORK) {
    if (!response.network_risk_assessment) {
      await addLog(
        `${agentName} Agent: Missing network risk assessment data`,
        LogLevel.ERROR,
      );
      return false;
    }
  } else if (stepId === InvestigationStepId.DEVICE) {
    if (
      !response.risk_assessment &&
      !response.device_risk_assessment &&
      !response.device_signal_risk_assessment
    ) {
      await addLog(
        `${agentName} Agent: Missing device risk assessment data`,
        LogLevel.ERROR,
      );
      return false;
    }
  } else if (stepId === InvestigationStepId.LOG) {
    if (!response.risk_assessment) {
      await addLog(
        `${agentName} Agent: Missing log risk assessment data`,
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
 * @returns {any} Processed network agent details
 */
export function processNetworkData(response: any) {
  let riskAssessment = null;
  if (response?.network_risk_assessment) {
    const nra = response.network_risk_assessment;
    riskAssessment = {
      risk_level: nra.risk_level,
      risk_factors: nra.risk_factors || [],
      anomaly_details: nra.anomaly_details || [],
      confidence: nra.confidence,
      summary: nra.summary,
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
  return {
    ...response,
    current_network: response?.current_network
      ? {
          ...response.current_network,
          timestamp: formatTimestamp(response.current_network.timestamp),
        }
      : null,
    network_history: response?.network_history?.map((history: any) => ({
      ...history,
      timestamp: formatTimestamp(history.timestamp),
    })),
    risk_assessment: riskAssessment,
    network_risk_assessment: response?.network_risk_assessment
      ? {
          ...response.network_risk_assessment,
          timestamp: formatTimestamp(
            response.network_risk_assessment.timestamp,
          ),
        }
      : null,
  };
}

/**
 * Processes device agent response data.
 * @param {any} response - The device agent response object
 * @returns {any} Processed device agent details
 */
export function processDeviceData(response: any) {
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
    // New format fields
    raw_splunk_results: processedRawSplunkResults,
    extracted_device_signals: processedExtractedDeviceSignals,
    device_signal_risk_assessment: deviceSignalRiskAssessment,
    // Legacy format fields for backward compatibility
    current_device: response?.current_device
      ? {
          ...response.current_device,
          timestamp: formatTimestamp(response.current_device.timestamp),
        }
      : null,
    device_history: response?.device_history?.map((history: any) => ({
      ...history,
      timestamp: formatTimestamp(history.timestamp),
    })),
    risk_assessment: riskAssessment,
    device_risk_assessment: response?.device_risk_assessment
      ? {
          ...response.device_risk_assessment,
          timestamp: formatTimestamp(response.device_risk_assessment.timestamp),
        }
      : null,
    // Common fields
    di_bb: diBB,
    // Additional fields from new format
    user_id: response?.user_id,
    timestamp: response?.timestamp ? formatTimestamp(response.timestamp) : null,
    di_tool_warning: response?.di_tool_warning,
    llm_thoughts: response?.llm_thoughts,
  };
}

/**
 * Processes log agent response data.
 * @param {any} response - The log agent response object
 * @returns {any} Processed log agent details
 */
export function processLogData(response: any) {
  let riskAssessment = null;
  if (response?.risk_assessment) {
    riskAssessment = {
      ...response.risk_assessment,
      timestamp: formatTimestamp(response.risk_assessment.timestamp),
    };
  } else if (response?.log_risk_assessment) {
    riskAssessment = {
      ...response.log_risk_assessment,
      timestamp: formatTimestamp(response.log_risk_assessment.timestamp),
    };
  }
  let logRiskAssessment = null;
  if (response?.log_risk_assessment) {
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
  return {
    ...response,
    behavior_patterns: response
      ? {
          ...response.behavior_patterns,
          login_times: response.behavior_patterns?.login_times?.map(
            (time: string | number | Date) => formatTimestamp(time),
          ),
          usual_locations: response.behavior_patterns?.usual_locations,
          common_devices: response.behavior_patterns?.common_devices,
        }
      : null,
    anomalies: response?.anomalies?.map((anomaly: any) => ({
      ...anomaly,
      timestamp: formatTimestamp(anomaly.timestamp),
    })),
    risk_assessment: riskAssessment,
    log_risk_assessment: logRiskAssessment,
  };
}

/**
 * Processes location agent response data.
 * @param {any} response - The location agent response object
 * @returns {any} Processed location agent details
 */
export async function processLocationData(response: any) {
  let riskAssessment = null;
  if (response?.llm_thoughts) {
    riskAssessment = {
      ...response.llm_thoughts,
      timestamp: response.timestamp
        ? formatTimestamp(response.timestamp)
        : undefined,
    };
  }
  const details: any = {
    ...response,
    risk_assessment: riskAssessment,
    splunk_locations: response?.splunk_locations || [],
    oii_locations: response?.oii_locations || [],
    vector_search_results: response?.vector_search_results || null,
  };
  return details;
}

// Note: processLocationData is async and requires addLog and geocodeAddress, so it should be imported and passed in from the main page.
