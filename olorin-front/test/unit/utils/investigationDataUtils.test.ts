import {
  validateResponse,
  processNetworkData,
  processDeviceData,
  processLogData,
  processLocationData,
} from '../../../src/js/utils/investigationDataUtils';
import {
  InvestigationStepId,
  LogLevel,
} from '../../../src/js/types/RiskAssessment';

describe('investigationDataUtils', () => {
  describe('validateResponse', () => {
    const addLog = jest.fn(async () => {});
    afterEach(() => addLog.mockClear());

    it('returns false and logs errors for null response', async () => {
      const result = await validateResponse(
        InvestigationStepId.LOCATION,
        null,
        addLog,
      );
      expect(result).toBe(false);
      expect(addLog).toHaveBeenCalled();
    });

    it('returns false for LOCATION with missing locations', async () => {
      const result = await validateResponse(
        InvestigationStepId.LOCATION,
        { location_risk_assessment: {} },
        addLog,
      );
      expect(result).toBe(false);
      expect(addLog).toHaveBeenCalled();
    });

    it('returns true for valid LOCATION', async () => {
      const response = { locations: [{}], location_risk_assessment: {} };
      const result = await validateResponse(
        InvestigationStepId.LOCATION,
        response,
        addLog,
      );
      expect(result).toBe(true);
    });

    it('returns false for NETWORK with missing network_risk_assessment', async () => {
      const result = await validateResponse(
        InvestigationStepId.NETWORK,
        {},
        addLog,
      );
      expect(result).toBe(false);
    });

    it('returns true for valid NETWORK', async () => {
      const response = { network_risk_assessment: {} };
      const result = await validateResponse(
        InvestigationStepId.NETWORK,
        response,
        addLog,
      );
      expect(result).toBe(true);
    });

    it('returns false for DEVICE with missing risk assessments', async () => {
      const result = await validateResponse(
        InvestigationStepId.DEVICE,
        {},
        addLog,
      );
      expect(result).toBe(false);
    });

    it('returns true for valid DEVICE', async () => {
      const response = { device_risk_assessment: {} };
      const result = await validateResponse(
        InvestigationStepId.DEVICE,
        response,
        addLog,
      );
      expect(result).toBe(true);
    });

    it('returns false for LOG with missing risk_assessment', async () => {
      const result = await validateResponse(
        InvestigationStepId.LOG,
        {},
        addLog,
      );
      expect(result).toBe(false);
    });

    it('returns true for valid LOG', async () => {
      const response = { risk_assessment: {} };
      const result = await validateResponse(
        InvestigationStepId.LOG,
        response,
        addLog,
      );
      expect(result).toBe(true);
    });

    it('returns false for unknown step', async () => {
      const result = await validateResponse('unknown' as any, {}, addLog);
      expect(result).toBe(false);
    });
  });

  describe('processNetworkData', () => {
    it('processes network_risk_assessment and formats timestamps', () => {
      const response = {
        network_risk_assessment: {
          risk_level: 1,
          timestamp: '2020-01-01T00:00:00Z',
        },
        current_network: { timestamp: '2020-01-01T00:00:00Z' },
        network_history: [{ timestamp: '2020-01-01T00:00:00Z' }],
        chronos_data: {
          entities: [
            {
              eventType: 'foo',
              eventTimestamp: '2020-01-01T00:00:00Z',
              origin: 'bar',
              data: { x: 1 },
            },
          ],
        },
      };
      const result = processNetworkData(response);
      expect(result.risk_assessment).toBeDefined();
      expect(result.current_network.timestamp).toBeDefined();
      expect(result.network_history[0].timestamp).toBeDefined();
      expect(result.parsed_chronos[0].eventType).toBe('foo');
    });
  });

  describe('processDeviceData', () => {
    it('processes device_signal_risk_assessment and parses di_bb', () => {
      const response = {
        device_signal_risk_assessment: { timestamp: '2020-01-01T00:00:00Z' },
        di_bb: { data: '{"foo":1}' },
        current_device: { timestamp: '2020-01-01T00:00:00Z' },
        device_history: [{ timestamp: '2020-01-01T00:00:00Z' }],
        chronos_data: {
          entities: [
            {
              eventType: 'foo',
              eventTimestamp: '2020-01-01T00:00:00Z',
              origin: 'bar',
              data: { x: 1 },
            },
          ],
        },
      };
      const result = processDeviceData(response);
      expect(result.risk_assessment).toBeDefined();
      expect(result.di_bb.parsedData.foo).toBe(1);
      expect(result.current_device.timestamp).toBeDefined();
      expect(result.device_history[0].timestamp).toBeDefined();
      expect(result.parsed_chronos[0].eventType).toBe('foo');
    });
  });

  describe('processLogData', () => {
    it('processes risk_assessment and formats anomalies', () => {
      const response = {
        risk_assessment: { timestamp: '2020-01-01T00:00:00Z' },
        behavior_patterns: { login_times: ['2020-01-01T00:00:00Z'] },
        anomalies: [{ timestamp: '2020-01-01T00:00:00Z' }],
        chronos_data: {
          entities: [
            {
              eventType: 'foo',
              eventTimestamp: '2020-01-01T00:00:00Z',
              origin: 'bar',
              data: { x: 1 },
            },
          ],
        },
      };
      const result = processLogData(response);
      expect(result.risk_assessment).toBeDefined();
      expect(result.behavior_patterns.login_times[0]).toBeDefined();
      expect(result.anomalies[0].timestamp).toBeDefined();
      expect(result.parsed_chronos[0].eventType).toBe('foo');
    });
  });

  describe('processLocationData', () => {
    it('processes llm_thoughts and splunk_locations', async () => {
      const response = {
        llm_thoughts: { summary: 'summary', timestamp: '2020-01-01T00:00:00Z' },
        splunk_locations: [{ city: 'Test City' }],
        oii_locations: [{ city: 'OII City' }],
        vector_search_results: [{ id: 1 }],
        timestamp: '2020-01-01T00:00:00Z',
      };
      const result = await processLocationData(response);
      expect(result.risk_assessment).toBeDefined();
      expect(result.splunk_locations[0].city).toBe('Test City');
      expect(result.oii_locations[0].city).toBe('OII City');
      expect(result.vector_search_results[0].id).toBe(1);
    });
    it('handles missing llm_thoughts and locations', async () => {
      const response = {};
      const result = await processLocationData(response);
      expect(result.risk_assessment).toBeNull();
      expect(result.splunk_locations).toEqual([]);
      expect(result.oii_locations).toEqual([]);
      expect(result.vector_search_results).toBeNull();
    });
  });

  describe('processDeviceData edge cases', () => {
    it('handles missing device_signal_risk_assessment and device_risk_assessment', () => {
      const response = {};
      const result = processDeviceData(response);
      expect(result.risk_assessment).toBeNull();
      expect(result.device_signal_risk_assessment).toBeNull();
    });
    it('handles malformed di_bb data', () => {
      const response = { di_bb: { data: '{notjson}' } };
      const result = processDeviceData(response);
      expect(result.di_bb.parsedData).toHaveProperty('raw');
    });
  });

  describe('processLogData edge cases', () => {
    it('handles missing risk_assessment and log_risk_assessment', () => {
      const response = {};
      const result = processLogData(response);
      expect(result.risk_assessment).toBeNull();
      expect(result.log_risk_assessment).toBeNull();
    });
    it('handles missing behavior_patterns and anomalies', () => {
      const response = {
        risk_assessment: { timestamp: '2020-01-01T00:00:00Z' },
      };
      const result = processLogData(response);
      expect(result.behavior_patterns).toEqual({
        login_times: undefined,
        usual_locations: undefined,
        common_devices: undefined,
      });
      expect(result.anomalies).toBeUndefined();
    });
  });
});
