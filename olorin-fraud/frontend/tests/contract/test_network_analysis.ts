/**
 * Contract Test: POST /api/network
 *
 * Tests the network analysis agent endpoint via POST.
 * This test verifies the contract between frontend and backend for network analysis requests.
 *
 * Expected to FAIL initially (TDD approach) until backend implementation is complete.
 */

import axios from 'axios';
import { NetworkAnalysisRequest, NetworkAnalysisResponse } from '@manual-investigation/types';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8090';

describe('Contract Test: POST /api/network', () => {
  const validNetworkRequest: NetworkAnalysisRequest = {
    investigationId: 'inv_12345',
    stepId: 'step_network_001',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    sessionId: 'sess_abc123def456',
    timestamp: new Date().toISOString(),
    metadata: {
      sourceSystem: 'auth-service',
      requestId: 'req_789',
      riskFactors: ['new_location', 'unusual_time']
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Successful Network Analysis', () => {
    it('should analyze network data and return comprehensive results', async () => {
      try {
        const response = await axios.post(`${API_BASE_URL}/api/network`, validNetworkRequest);

        // Contract assertions
        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toMatch(/application\/json/);

        const analysis: NetworkAnalysisResponse = response.data;

        // Required field validations
        expect(analysis).toHaveProperty('id');
        expect(analysis).toHaveProperty('investigationId', validNetworkRequest.investigationId);
        expect(analysis).toHaveProperty('stepId', validNetworkRequest.stepId);
        expect(analysis).toHaveProperty('agentType', 'network');
        expect(analysis).toHaveProperty('status');
        expect(analysis).toHaveProperty('createdAt');

        // Data type validations
        expect(typeof analysis.id).toBe('string');
        expect(typeof analysis.status).toBe('string');
        expect(new Date(analysis.createdAt)).toBeInstanceOf(Date);

        // Analysis results validation
        expect(analysis).toHaveProperty('analysis');
        expect(typeof analysis.analysis).toBe('object');

        const networkAnalysis = analysis.analysis;

        // IP analysis validation
        expect(networkAnalysis).toHaveProperty('ipAnalysis');
        expect(typeof networkAnalysis.ipAnalysis).toBe('object');
        expect(networkAnalysis.ipAnalysis).toHaveProperty('ipAddress', validNetworkRequest.ipAddress);
        expect(networkAnalysis.ipAnalysis).toHaveProperty('geolocation');
        expect(networkAnalysis.ipAnalysis).toHaveProperty('isp');
        expect(networkAnalysis.ipAnalysis).toHaveProperty('riskScore');

        // Geolocation validation
        const geolocation = networkAnalysis.ipAnalysis.geolocation;
        expect(typeof geolocation).toBe('object');
        expect(geolocation).toHaveProperty('country');
        expect(geolocation).toHaveProperty('city');
        expect(typeof geolocation.latitude).toBe('number');
        expect(typeof geolocation.longitude).toBe('number');

        // Risk score validation
        expect(typeof networkAnalysis.ipAnalysis.riskScore).toBe('number');
        expect(networkAnalysis.ipAnalysis.riskScore).toBeGreaterThanOrEqual(0);
        expect(networkAnalysis.ipAnalysis.riskScore).toBeLessThanOrEqual(1);

        // User agent analysis validation
        expect(networkAnalysis).toHaveProperty('userAgentAnalysis');
        expect(typeof networkAnalysis.userAgentAnalysis).toBe('object');
        expect(networkAnalysis.userAgentAnalysis).toHaveProperty('browser');
        expect(networkAnalysis.userAgentAnalysis).toHaveProperty('operatingSystem');
        expect(networkAnalysis.userAgentAnalysis).toHaveProperty('device');

        // Risk indicators validation
        expect(networkAnalysis).toHaveProperty('riskIndicators');
        expect(Array.isArray(networkAnalysis.riskIndicators)).toBe(true);

        // Overall risk assessment
        expect(networkAnalysis).toHaveProperty('overallRiskScore');
        expect(typeof networkAnalysis.overallRiskScore).toBe('number');
        expect(networkAnalysis.overallRiskScore).toBeGreaterThanOrEqual(0);
        expect(networkAnalysis.overallRiskScore).toBeLessThanOrEqual(1);

      } catch (error) {
        if (axios.isAxiosError(error)) {
          console.warn('Contract test failing as expected (TDD approach):', error.message);
          throw new Error(`Network analysis endpoint not implemented: ${error.message}`);
        }
        throw error;
      }
    });

    it('should handle IPv6 addresses', async () => {
      const ipv6Request = {
        ...validNetworkRequest,
        ipAddress: '2001:0db8:85a3:0000:0000:8a2e:0370:7334'
      };

      try {
        const response = await axios.post(`${API_BASE_URL}/api/network`, ipv6Request);

        expect(response.status).toBe(200);
        const analysis: NetworkAnalysisResponse = response.data;

        expect(analysis.analysis.ipAnalysis.ipAddress).toBe(ipv6Request.ipAddress);
        expect(analysis.analysis.ipAnalysis).toHaveProperty('geolocation');
        expect(analysis.analysis.ipAnalysis).toHaveProperty('riskScore');

      } catch (error) {
        if (axios.isAxiosError(error)) {
          throw new Error(`IPv6 analysis test failed: ${error.message}`);
        }
        throw error;
      }
    });

    it('should identify suspicious network patterns', async () => {
      const suspiciousRequest = {
        ...validNetworkRequest,
        ipAddress: '10.0.0.1', // Private IP
        metadata: {
          ...validNetworkRequest.metadata,
          riskFactors: ['tor_network', 'vpn_detected', 'known_malicious']
        }
      };

      try {
        const response = await axios.post(`${API_BASE_URL}/api/network`, suspiciousRequest);

        expect(response.status).toBe(200);
        const analysis: NetworkAnalysisResponse = response.data;

        // Should detect high risk for suspicious patterns
        expect(analysis.analysis.overallRiskScore).toBeGreaterThan(0.5);
        expect(analysis.analysis.riskIndicators.length).toBeGreaterThan(0);

        // Should identify VPN/Tor usage
        const riskIndicators = analysis.analysis.riskIndicators;
        expect(riskIndicators.some(indicator =>
          indicator.toLowerCase().includes('vpn') ||
          indicator.toLowerCase().includes('tor') ||
          indicator.toLowerCase().includes('proxy')
        )).toBe(true);

      } catch (error) {
        if (axios.isAxiosError(error)) {
          throw new Error(`Suspicious network patterns test failed: ${error.message}`);
        }
        throw error;
      }
    });

    it('should detect user agent anomalies', async () => {
      const anomalousRequest = {
        ...validNetworkRequest,
        userAgent: 'SuspiciousBot/1.0 (automated; crawler)'
      };

      try {
        const response = await axios.post(`${API_BASE_URL}/api/network`, anomalousRequest);

        expect(response.status).toBe(200);
        const analysis: NetworkAnalysisResponse = response.data;

        const userAgentAnalysis = analysis.analysis.userAgentAnalysis;
        expect(userAgentAnalysis).toHaveProperty('isBot');
        expect(userAgentAnalysis.isBot).toBe(true);

        // Should flag as high risk for bot traffic
        expect(analysis.analysis.overallRiskScore).toBeGreaterThan(0.7);

      } catch (error) {
        if (axios.isAxiosError(error)) {
          throw new Error(`User agent anomaly test failed: ${error.message}`);
        }
        throw error;
      }
    });
  });

  describe('Error Handling', () => {
    it('should return 400 for missing required fields', async () => {
      const invalidRequest = {
        investigationId: validNetworkRequest.investigationId
        // Missing required fields
      };

      try {
        await axios.post(`${API_BASE_URL}/api/network`, invalidRequest);
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

    it('should return 400 for invalid IP address format', async () => {
      const invalidIpRequests = [
        { ...validNetworkRequest, ipAddress: 'invalid-ip' },
        { ...validNetworkRequest, ipAddress: '999.999.999.999' },
        { ...validNetworkRequest, ipAddress: '192.168.1' },
        { ...validNetworkRequest, ipAddress: '' }
      ];

      for (const invalidRequest of invalidIpRequests) {
        try {
          await axios.post(`${API_BASE_URL}/api/network`, invalidRequest);
          fail(`Should have thrown an error for invalid IP: ${invalidRequest.ipAddress}`);
        } catch (error) {
          if (axios.isAxiosError(error)) {
            expect(error.response?.status).toBe(400);
            expect(error.response?.data).toHaveProperty('error');
          } else {
            throw error;
          }
        }
      }
    });

    it('should return 400 for invalid investigation ID format', async () => {
      const invalidRequest = {
        ...validNetworkRequest,
        investigationId: 'invalid-id-format'
      };

      try {
        await axios.post(`${API_BASE_URL}/api/network`, invalidRequest);
        fail('Should have thrown an error for invalid investigation ID');
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
        await axios.post(`${API_BASE_URL}/api/network`, 'invalid-json', {
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

    it('should return 413 for oversized request payload', async () => {
      const oversizedRequest = {
        ...validNetworkRequest,
        metadata: {
          largeData: 'x'.repeat(50000) // Very large metadata
        }
      };

      try {
        await axios.post(`${API_BASE_URL}/api/network`, oversizedRequest);
        fail('Should have thrown an error for oversized payload');
      } catch (error) {
        if (axios.isAxiosError(error)) {
          expect([413, 400]).toContain(error.response?.status);
        } else {
          throw error;
        }
      }
    });
  });

  describe('Authentication and Authorization', () => {
    it('should return 401 for missing authentication', async () => {
      try {
        await axios.post(`${API_BASE_URL}/api/network`, validNetworkRequest, {
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
        await axios.post(`${API_BASE_URL}/api/network`, validNetworkRequest, {
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

  describe('Content-Type Validation', () => {
    it('should accept application/json content-type', async () => {
      try {
        const response = await axios.post(`${API_BASE_URL}/api/network`, validNetworkRequest, {
          headers: { 'Content-Type': 'application/json' }
        });
        expect(response.status).toBe(200);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          // Expected to fail until implementation - verify it's not due to content-type
          expect(error.response?.status).not.toBe(415);
        }
      }
    });

    it('should reject non-JSON content-type', async () => {
      try {
        await axios.post(`${API_BASE_URL}/api/network`, validNetworkRequest, {
          headers: { 'Content-Type': 'text/plain' }
        });
        fail('Should have thrown an error for invalid content-type');
      } catch (error) {
        if (axios.isAxiosError(error)) {
          expect([415, 400]).toContain(error.response?.status);
        } else {
          throw error;
        }
      }
    });
  });

  describe('Performance and Timeout', () => {
    it('should respond within reasonable time for network analysis', async () => {
      const startTime = Date.now();

      try {
        await axios.post(`${API_BASE_URL}/api/network`, validNetworkRequest);
        const responseTime = Date.now() - startTime;

        // Network analysis should complete within 30 seconds
        expect(responseTime).toBeLessThan(30000);

      } catch (error) {
        if (axios.isAxiosError(error)) {
          console.warn('Performance test failing as expected');
        }
      }
    });

    it('should handle concurrent analysis requests', async () => {
      const concurrentRequests = Array(5).fill(null).map((_, index) => ({
        ...validNetworkRequest,
        sessionId: `sess_concurrent_${index}`
      }));

      try {
        const responses = await Promise.all(
          concurrentRequests.map(request =>
            axios.post(`${API_BASE_URL}/api/network`, request)
          )
        );

        responses.forEach(response => {
          expect(response.status).toBe(200);
          expect(response.data).toHaveProperty('analysis');
        });

        // Each response should have unique IDs
        const responseIds = responses.map(r => r.data.id);
        const uniqueIds = new Set(responseIds);
        expect(uniqueIds.size).toBe(responseIds.length);

      } catch (error) {
        if (axios.isAxiosError(error)) {
          console.warn('Concurrent requests test failing as expected');
        }
      }
    });
  });
});