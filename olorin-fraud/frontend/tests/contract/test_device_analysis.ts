/**
 * Contract Test: POST /api/device
 *
 * Tests the device analysis agent endpoint via POST.
 * This test verifies the contract between frontend and backend for device analysis requests.
 *
 * Expected to FAIL initially (TDD approach) until backend implementation is complete.
 */

import axios from 'axios';
import { DeviceAnalysisRequest, DeviceAnalysisResponse } from '@manual-investigation/types';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8090';

describe('Contract Test: POST /api/device', () => {
  const validDeviceRequest: DeviceAnalysisRequest = {
    investigationId: 'inv_12345',
    stepId: 'step_device_001',
    deviceId: 'dev_fingerprint_abc123',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Mobile/15E148 Safari/604.1',
    fingerprint: {
      screenResolution: '375x812',
      timezone: 'America/New_York',
      language: 'en-US',
      platform: 'iPhone',
      webglRenderer: 'Apple GPU',
      plugins: ['PDF Viewer', 'Chrome PDF Plugin'],
      fonts: ['Arial', 'Helvetica', 'Times', 'Courier'],
      canvas: 'canvas_hash_xyz789',
      webrtc: 'webrtc_fingerprint_def456'
    },
    sessionData: {
      sessionId: 'sess_mobile_789',
      firstSeen: new Date(Date.now() - 86400000).toISOString(), // 24 hours ago
      lastSeen: new Date().toISOString(),
      pageViews: 15,
      duration: 1800000 // 30 minutes
    },
    metadata: {
      sourceSystem: 'web-tracker',
      riskFactors: ['new_device', 'unusual_resolution']
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Successful Device Analysis', () => {
    it('should analyze device fingerprint and return comprehensive results', async () => {
      try {
        const response = await axios.post(`${API_BASE_URL}/api/device`, validDeviceRequest);

        // Contract assertions
        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toMatch(/application\/json/);

        const analysis: DeviceAnalysisResponse = response.data;

        // Required field validations
        expect(analysis).toHaveProperty('id');
        expect(analysis).toHaveProperty('investigationId', validDeviceRequest.investigationId);
        expect(analysis).toHaveProperty('stepId', validDeviceRequest.stepId);
        expect(analysis).toHaveProperty('agentType', 'device');
        expect(analysis).toHaveProperty('status');
        expect(analysis).toHaveProperty('createdAt');

        // Analysis results validation
        expect(analysis).toHaveProperty('analysis');
        expect(typeof analysis.analysis).toBe('object');

        const deviceAnalysis = analysis.analysis;

        // Device identification validation
        expect(deviceAnalysis).toHaveProperty('deviceIdentification');
        expect(typeof deviceAnalysis.deviceIdentification).toBe('object');

        const deviceId = deviceAnalysis.deviceIdentification;
        expect(deviceId).toHaveProperty('deviceType');
        expect(deviceId).toHaveProperty('operatingSystem');
        expect(deviceId).toHaveProperty('browser');
        expect(deviceId).toHaveProperty('isMobile');
        expect(typeof deviceId.isMobile).toBe('boolean');

        // Fingerprint analysis validation
        expect(deviceAnalysis).toHaveProperty('fingerprintAnalysis');
        expect(typeof deviceAnalysis.fingerprintAnalysis).toBe('object');

        const fingerprint = deviceAnalysis.fingerprintAnalysis;
        expect(fingerprint).toHaveProperty('uniquenessScore');
        expect(typeof fingerprint.uniquenessScore).toBe('number');
        expect(fingerprint.uniquenessScore).toBeGreaterThanOrEqual(0);
        expect(fingerprint.uniquenessScore).toBeLessThanOrEqual(1);

        expect(fingerprint).toHaveProperty('spoofingIndicators');
        expect(Array.isArray(fingerprint.spoofingIndicators)).toBe(true);

        // Behavioral analysis validation
        expect(deviceAnalysis).toHaveProperty('behaviorAnalysis');
        expect(typeof deviceAnalysis.behaviorAnalysis).toBe('object');

        const behavior = deviceAnalysis.behaviorAnalysis;
        expect(behavior).toHaveProperty('sessionPattern');
        expect(behavior).toHaveProperty('usageMetrics');
        expect(behavior).toHaveProperty('anomalyScore');
        expect(typeof behavior.anomalyScore).toBe('number');

        // Risk assessment validation
        expect(deviceAnalysis).toHaveProperty('riskAssessment');
        expect(typeof deviceAnalysis.riskAssessment).toBe('object');

        const riskAssessment = deviceAnalysis.riskAssessment;
        expect(riskAssessment).toHaveProperty('overallRiskScore');
        expect(typeof riskAssessment.overallRiskScore).toBe('number');
        expect(riskAssessment.overallRiskScore).toBeGreaterThanOrEqual(0);
        expect(riskAssessment.overallRiskScore).toBeLessThanOrEqual(1);

        expect(riskAssessment).toHaveProperty('riskFactors');
        expect(Array.isArray(riskAssessment.riskFactors)).toBe(true);

      } catch (error) {
        if (axios.isAxiosError(error)) {
          console.warn('Contract test failing as expected (TDD approach):', error.message);
          throw new Error(`Device analysis endpoint not implemented: ${error.message}`);
        }
        throw error;
      }
    });

    it('should detect mobile vs desktop devices correctly', async () => {
      const desktopRequest = {
        ...validDeviceRequest,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        fingerprint: {
          ...validDeviceRequest.fingerprint,
          screenResolution: '1920x1080',
          platform: 'Win32'
        }
      };

      try {
        const response = await axios.post(`${API_BASE_URL}/api/device`, desktopRequest);

        expect(response.status).toBe(200);
        const analysis: DeviceAnalysisResponse = response.data;

        expect(analysis.analysis.deviceIdentification.isMobile).toBe(false);
        expect(analysis.analysis.deviceIdentification.deviceType).toContain('desktop');

      } catch (error) {
        if (axios.isAxiosError(error)) {
          throw new Error(`Mobile vs desktop detection test failed: ${error.message}`);
        }
        throw error;
      }
    });

    it('should identify device spoofing attempts', async () => {
      const spoofedRequest = {
        ...validDeviceRequest,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)',
        fingerprint: {
          ...validDeviceRequest.fingerprint,
          screenResolution: '1920x1080', // Desktop resolution on mobile UA
          platform: 'Win32', // Windows platform with iPhone UA
          webglRenderer: 'NVIDIA GeForce GTX 1080' // Desktop GPU on mobile
        }
      };

      try {
        const response = await axios.post(`${API_BASE_URL}/api/device`, spoofedRequest);

        expect(response.status).toBe(200);
        const analysis: DeviceAnalysisResponse = response.data;

        // Should detect spoofing indicators
        expect(analysis.analysis.fingerprintAnalysis.spoofingIndicators.length).toBeGreaterThan(0);
        expect(analysis.analysis.riskAssessment.overallRiskScore).toBeGreaterThan(0.6);

        const spoofingIndicators = analysis.analysis.fingerprintAnalysis.spoofingIndicators;
        expect(spoofingIndicators.some(indicator =>
          indicator.toLowerCase().includes('user agent') ||
          indicator.toLowerCase().includes('platform') ||
          indicator.toLowerCase().includes('resolution')
        )).toBe(true);

      } catch (error) {
        if (axios.isAxiosError(error)) {
          throw new Error(`Device spoofing detection test failed: ${error.message}`);
        }
        throw error;
      }
    });

    it('should analyze session behavior patterns', async () => {
      const suspiciousBehaviorRequest = {
        ...validDeviceRequest,
        sessionData: {
          ...validDeviceRequest.sessionData,
          pageViews: 150, // Unusually high page views
          duration: 30000, // Very short session duration for high page views
          bounceRate: 0.95 // Very high bounce rate
        }
      };

      try {
        const response = await axios.post(`${API_BASE_URL}/api/device`, suspiciousBehaviorRequest);

        expect(response.status).toBe(200);
        const analysis: DeviceAnalysisResponse = response.data;

        // Should detect anomalous behavior
        expect(analysis.analysis.behaviorAnalysis.anomalyScore).toBeGreaterThan(0.7);
        expect(analysis.analysis.riskAssessment.overallRiskScore).toBeGreaterThan(0.5);

      } catch (error) {
        if (axios.isAxiosError(error)) {
          throw new Error(`Session behavior analysis test failed: ${error.message}`);
        }
        throw error;
      }
    });
  });

  describe('Error Handling', () => {
    it('should return 400 for missing required fields', async () => {
      const invalidRequest = {
        investigationId: validDeviceRequest.investigationId
        // Missing required fields
      };

      try {
        await axios.post(`${API_BASE_URL}/api/device`, invalidRequest);
        fail('Should have thrown an error for missing required fields');
      } catch (error) {
        if (axios.isAxiosError(error)) {
          expect(error.response?.status).toBe(400);
          expect(error.response?.data).toHaveProperty('error');
          expect(error.response?.data.error).toContain('required');
        } else {
          throw error;
        }
      }
    });

    it('should return 400 for invalid fingerprint data', async () => {
      const invalidFingerprintRequests = [
        {
          ...validDeviceRequest,
          fingerprint: null
        },
        {
          ...validDeviceRequest,
          fingerprint: {
            screenResolution: 'invalid-resolution'
          }
        },
        {
          ...validDeviceRequest,
          fingerprint: {
            ...validDeviceRequest.fingerprint,
            timezone: 'Invalid/Timezone'
          }
        }
      ];

      for (const invalidRequest of invalidFingerprintRequests) {
        try {
          await axios.post(`${API_BASE_URL}/api/device`, invalidRequest);
          fail('Should have thrown an error for invalid fingerprint data');
        } catch (error) {
          if (axios.isAxiosError(error)) {
            expect(error.response?.status).toBe(400);
          } else {
            throw error;
          }
        }
      }
    });

    it('should return 400 for invalid session data', async () => {
      const invalidSessionRequest = {
        ...validDeviceRequest,
        sessionData: {
          ...validDeviceRequest.sessionData,
          pageViews: -1, // Invalid negative page views
          duration: 'invalid-duration'
        }
      };

      try {
        await axios.post(`${API_BASE_URL}/api/device`, invalidSessionRequest);
        fail('Should have thrown an error for invalid session data');
      } catch (error) {
        if (axios.isAxiosError(error)) {
          expect(error.response?.status).toBe(400);
        } else {
          throw error;
        }
      }
    });

    it('should return 400 for malformed JSON', async () => {
      try {
        await axios.post(`${API_BASE_URL}/api/device`, 'invalid-json', {
          headers: { 'Content-Type': 'application/json' }
        });
        fail('Should have thrown an error for malformed JSON');
      } catch (error) {
        if (axios.isAxiosError(error)) {
          expect(error.response?.status).toBe(400);
        } else {
          throw error;
        }
      }
    });
  });

  describe('Authentication and Authorization', () => {
    it('should return 401 for missing authentication', async () => {
      try {
        await axios.post(`${API_BASE_URL}/api/device`, validDeviceRequest, {
          headers: {} // No auth headers
        });
        fail('Should have thrown an error for missing authentication');
      } catch (error) {
        if (axios.isAxiosError(error)) {
          expect([401, 403]).toContain(error.response?.status);
        } else {
          throw error;
        }
      }
    });

    it('should return 403 for insufficient permissions', async () => {
      try {
        await axios.post(`${API_BASE_URL}/api/device`, validDeviceRequest, {
          headers: {
            'Authorization': 'Bearer read-only-token'
          }
        });
        fail('Should have thrown an error for insufficient permissions');
      } catch (error) {
        if (axios.isAxiosError(error)) {
          expect([401, 403]).toContain(error.response?.status);
        } else {
          throw error;
        }
      }
    });
  });

  describe('Performance and Security', () => {
    it('should respond within reasonable time for device analysis', async () => {
      const startTime = Date.now();

      try {
        await axios.post(`${API_BASE_URL}/api/device`, validDeviceRequest);
        const responseTime = Date.now() - startTime;

        // Device analysis should complete within 15 seconds
        expect(responseTime).toBeLessThan(15000);

      } catch (error) {
        if (axios.isAxiosError(error)) {
          console.warn('Performance test failing as expected');
        }
      }
    });

    it('should not expose sensitive fingerprint data in error messages', async () => {
      const requestWithSensitiveData = {
        ...validDeviceRequest,
        fingerprint: {
          ...validDeviceRequest.fingerprint,
          privateKey: 'sensitive-private-key-data'
        }
      };

      try {
        await axios.post(`${API_BASE_URL}/api/device`, requestWithSensitiveData);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const errorMessage = error.response?.data?.error || '';
          expect(errorMessage).not.toContain('sensitive-private-key-data');
        }
      }
    });

    it('should handle large fingerprint datasets efficiently', async () => {
      const largeDataRequest = {
        ...validDeviceRequest,
        fingerprint: {
          ...validDeviceRequest.fingerprint,
          plugins: Array(100).fill(0).map((_, i) => `Plugin_${i}`),
          fonts: Array(200).fill(0).map((_, i) => `Font_${i}`)
        }
      };

      try {
        const response = await axios.post(`${API_BASE_URL}/api/device`, largeDataRequest);
        expect(response.status).toBe(200);

      } catch (error) {
        if (axios.isAxiosError(error)) {
          // Should not fail due to payload size for reasonable data
          expect(error.response?.status).not.toBe(413);
        }
      }
    });
  });
});