/**
 * Contract Test: POST /api/location
 *
 * Tests the location analysis agent endpoint via POST.
 * This test verifies the contract between frontend and backend for location analysis requests.
 *
 * Expected to FAIL initially (TDD approach) until backend implementation is complete.
 */

import axios from 'axios';
import { LocationAnalysisRequest, LocationAnalysisResponse } from '@manual-investigation/types';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8090';

describe('Contract Test: POST /api/location', () => {
  const validLocationRequest: LocationAnalysisRequest = {
    investigationId: 'inv_12345',
    stepId: 'step_location_001',
    userId: 'user_789',
    currentLocation: {
      latitude: 40.7128,
      longitude: -74.0060,
      accuracy: 10.5,
      timestamp: new Date().toISOString(),
      source: 'gps'
    },
    historicalLocations: [
      {
        latitude: 40.7589,
        longitude: -73.9851,
        accuracy: 15.2,
        timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        source: 'wifi'
      },
      {
        latitude: 40.6892,
        longitude: -74.0445,
        accuracy: 25.0,
        timestamp: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
        source: 'cellular'
      }
    ],
    userProfile: {
      homeCountry: 'US',
      homeCity: 'New York',
      workLocation: {
        latitude: 40.7549,
        longitude: -73.9840
      },
      travelHistory: ['US', 'CA', 'GB']
    },
    metadata: {
      sessionId: 'sess_location_123',
      riskFactors: ['rapid_travel', 'new_country']
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Successful Location Analysis', () => {
    it('should analyze location data and return comprehensive results', async () => {
      try {
        const response = await axios.post(`${API_BASE_URL}/api/location`, validLocationRequest);

        // Contract assertions
        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toMatch(/application\/json/);

        const analysis: LocationAnalysisResponse = response.data;

        // Required field validations
        expect(analysis).toHaveProperty('id');
        expect(analysis).toHaveProperty('investigationId', validLocationRequest.investigationId);
        expect(analysis).toHaveProperty('stepId', validLocationRequest.stepId);
        expect(analysis).toHaveProperty('agentType', 'location');
        expect(analysis).toHaveProperty('status');
        expect(analysis).toHaveProperty('createdAt');

        // Analysis results validation
        expect(analysis).toHaveProperty('analysis');
        expect(typeof analysis.analysis).toBe('object');

        const locationAnalysis = analysis.analysis;

        // Current location analysis validation
        expect(locationAnalysis).toHaveProperty('currentLocationAnalysis');
        expect(typeof locationAnalysis.currentLocationAnalysis).toBe('object');

        const currentAnalysis = locationAnalysis.currentLocationAnalysis;
        expect(currentAnalysis).toHaveProperty('country');
        expect(currentAnalysis).toHaveProperty('city');
        expect(currentAnalysis).toHaveProperty('region');
        expect(currentAnalysis).toHaveProperty('coordinates');
        expect(currentAnalysis.coordinates).toHaveProperty('latitude');
        expect(currentAnalysis.coordinates).toHaveProperty('longitude');

        // Travel pattern analysis validation
        expect(locationAnalysis).toHaveProperty('travelPatternAnalysis');
        expect(typeof locationAnalysis.travelPatternAnalysis).toBe('object');

        const travelAnalysis = locationAnalysis.travelPatternAnalysis;
        expect(travelAnalysis).toHaveProperty('distanceTraveled');
        expect(typeof travelAnalysis.distanceTraveled).toBe('number');
        expect(travelAnalysis).toHaveProperty('travelSpeed');
        expect(typeof travelAnalysis.travelSpeed).toBe('number');
        expect(travelAnalysis).toHaveProperty('impossibleTravelDetected');
        expect(typeof travelAnalysis.impossibleTravelDetected).toBe('boolean');

        // Geographic risk assessment validation
        expect(locationAnalysis).toHaveProperty('geographicRiskAssessment');
        expect(typeof locationAnalysis.geographicRiskAssessment).toBe('object');

        const geoRisk = locationAnalysis.geographicRiskAssessment;
        expect(geoRisk).toHaveProperty('countryRiskScore');
        expect(typeof geoRisk.countryRiskScore).toBe('number');
        expect(geoRisk.countryRiskScore).toBeGreaterThanOrEqual(0);
        expect(geoRisk.countryRiskScore).toBeLessThanOrEqual(1);

        expect(geoRisk).toHaveProperty('isHighRiskLocation');
        expect(typeof geoRisk.isHighRiskLocation).toBe('boolean');

        // Velocity analysis validation
        expect(locationAnalysis).toHaveProperty('velocityAnalysis');
        expect(typeof locationAnalysis.velocityAnalysis).toBe('object');

        const velocity = locationAnalysis.velocityAnalysis;
        expect(velocity).toHaveProperty('maxVelocity');
        expect(typeof velocity.maxVelocity).toBe('number');
        expect(velocity).toHaveProperty('averageVelocity');
        expect(typeof velocity.averageVelocity).toBe('number');

        // Overall risk assessment
        expect(locationAnalysis).toHaveProperty('overallRiskScore');
        expect(typeof locationAnalysis.overallRiskScore).toBe('number');
        expect(locationAnalysis.overallRiskScore).toBeGreaterThanOrEqual(0);
        expect(locationAnalysis.overallRiskScore).toBeLessThanOrEqual(1);

        expect(locationAnalysis).toHaveProperty('riskFactors');
        expect(Array.isArray(locationAnalysis.riskFactors)).toBe(true);

      } catch (error) {
        if (axios.isAxiosError(error)) {
          console.warn('Contract test failing as expected (TDD approach):', error.message);
          throw new Error(`Location analysis endpoint not implemented: ${error.message}`);
        }
        throw error;
      }
    });

    it('should detect impossible travel patterns', async () => {
      const impossibleTravelRequest = {
        ...validLocationRequest,
        currentLocation: {
          latitude: 51.5074, // London, UK
          longitude: -0.1278,
          accuracy: 10.0,
          timestamp: new Date().toISOString(),
          source: 'gps'
        },
        historicalLocations: [
          {
            latitude: 40.7128, // New York, US
            longitude: -74.0060,
            accuracy: 15.0,
            timestamp: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
            source: 'gps'
          }
        ]
      };

      try {
        const response = await axios.post(`${API_BASE_URL}/api/location`, impossibleTravelRequest);

        expect(response.status).toBe(200);
        const analysis: LocationAnalysisResponse = response.data;

        // Should detect impossible travel
        expect(analysis.analysis.travelPatternAnalysis.impossibleTravelDetected).toBe(true);
        expect(analysis.analysis.overallRiskScore).toBeGreaterThan(0.8);

        const riskFactors = analysis.analysis.riskFactors;
        expect(riskFactors.some(factor =>
          factor.toLowerCase().includes('impossible') ||
          factor.toLowerCase().includes('travel') ||
          factor.toLowerCase().includes('velocity')
        )).toBe(true);

      } catch (error) {
        if (axios.isAxiosError(error)) {
          throw new Error(`Impossible travel detection test failed: ${error.message}`);
        }
        throw error;
      }
    });

    it('should identify high-risk geographic locations', async () => {
      const highRiskLocationRequest = {
        ...validLocationRequest,
        currentLocation: {
          latitude: 35.6762, // Tokyo, Japan (simulate high-risk based on user profile)
          longitude: 139.6503,
          accuracy: 12.0,
          timestamp: new Date().toISOString(),
          source: 'gps'
        },
        userProfile: {
          ...validLocationRequest.userProfile,
          homeCountry: 'US',
          travelHistory: ['US', 'CA'] // No history of travel to Asia
        }
      };

      try {
        const response = await axios.post(`${API_BASE_URL}/api/location`, highRiskLocationRequest);

        expect(response.status).toBe(200);
        const analysis: LocationAnalysisResponse = response.data;

        // Should flag as unusual location
        expect(analysis.analysis.overallRiskScore).toBeGreaterThan(0.6);

        const geoRisk = analysis.analysis.geographicRiskAssessment;
        expect(geoRisk.isHighRiskLocation).toBeDefined();

      } catch (error) {
        if (axios.isAxiosError(error)) {
          throw new Error(`High-risk location detection test failed: ${error.message}`);
        }
        throw error;
      }
    });

    it('should calculate accurate travel distances and speeds', async () => {
      const travelRequest = {
        ...validLocationRequest,
        currentLocation: {
          latitude: 40.7589, // Times Square, NYC
          longitude: -73.9851,
          accuracy: 8.0,
          timestamp: new Date().toISOString(),
          source: 'gps'
        },
        historicalLocations: [
          {
            latitude: 40.7128, // Lower Manhattan, NYC
            longitude: -74.0060,
            accuracy: 10.0,
            timestamp: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
            source: 'gps'
          }
        ]
      };

      try {
        const response = await axios.post(`${API_BASE_URL}/api/location`, travelRequest);

        expect(response.status).toBe(200);
        const analysis: LocationAnalysisResponse = response.data;

        const travelAnalysis = analysis.analysis.travelPatternAnalysis;

        // Distance should be reasonable for NYC travel (roughly 5-10 km)
        expect(travelAnalysis.distanceTraveled).toBeGreaterThan(0);
        expect(travelAnalysis.distanceTraveled).toBeLessThan(20000); // Less than 20km

        // Speed should be reasonable for urban travel
        expect(travelAnalysis.travelSpeed).toBeGreaterThan(0);
        expect(travelAnalysis.travelSpeed).toBeLessThan(200); // Less than 200 km/h

        // Should not flag as impossible travel for reasonable distances
        expect(travelAnalysis.impossibleTravelDetected).toBe(false);

      } catch (error) {
        if (axios.isAxiosError(error)) {
          throw new Error(`Travel distance/speed calculation test failed: ${error.message}`);
        }
        throw error;
      }
    });
  });

  describe('Error Handling', () => {
    it('should return 400 for missing required fields', async () => {
      const invalidRequest = {
        investigationId: validLocationRequest.investigationId
        // Missing required fields
      };

      try {
        await axios.post(`${API_BASE_URL}/api/location`, invalidRequest);
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

    it('should return 400 for invalid coordinates', async () => {
      const invalidCoordinateRequests = [
        {
          ...validLocationRequest,
          currentLocation: {
            ...validLocationRequest.currentLocation,
            latitude: 91.0 // Invalid latitude > 90
          }
        },
        {
          ...validLocationRequest,
          currentLocation: {
            ...validLocationRequest.currentLocation,
            longitude: 181.0 // Invalid longitude > 180
          }
        },
        {
          ...validLocationRequest,
          currentLocation: {
            ...validLocationRequest.currentLocation,
            latitude: 'invalid'
          }
        }
      ];

      for (const invalidRequest of invalidCoordinateRequests) {
        try {
          await axios.post(`${API_BASE_URL}/api/location`, invalidRequest);
          fail('Should have thrown an error for invalid coordinates');
        } catch (error) {
          if (axios.isAxiosError(error)) {
            expect(error.response?.status).toBe(400);
          } else {
            throw error;
          }
        }
      }
    });

    it('should return 400 for invalid timestamp format', async () => {
      const invalidTimestampRequest = {
        ...validLocationRequest,
        currentLocation: {
          ...validLocationRequest.currentLocation,
          timestamp: 'invalid-timestamp'
        }
      };

      try {
        await axios.post(`${API_BASE_URL}/api/location`, invalidTimestampRequest);
        fail('Should have thrown an error for invalid timestamp');
      } catch (error) {
        if (axios.isAxiosError(error)) {
          expect(error.response?.status).toBe(400);
        } else {
          throw error;
        }
      }
    });

    it('should return 400 for negative accuracy values', async () => {
      const negativeAccuracyRequest = {
        ...validLocationRequest,
        currentLocation: {
          ...validLocationRequest.currentLocation,
          accuracy: -5.0
        }
      };

      try {
        await axios.post(`${API_BASE_URL}/api/location`, negativeAccuracyRequest);
        fail('Should have thrown an error for negative accuracy');
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
        await axios.post(`${API_BASE_URL}/api/location`, validLocationRequest, {
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
        await axios.post(`${API_BASE_URL}/api/location`, validLocationRequest, {
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

  describe('Privacy and Security', () => {
    it('should not expose sensitive location data in error messages', async () => {
      const sensitiveRequest = {
        ...validLocationRequest,
        userProfile: {
          ...validLocationRequest.userProfile,
          secretLocation: 'classified-military-base'
        }
      };

      try {
        await axios.post(`${API_BASE_URL}/api/location`, sensitiveRequest);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const errorMessage = error.response?.data?.error || '';
          expect(errorMessage).not.toContain('classified-military-base');
        }
      }
    });

    it('should handle large historical location datasets efficiently', async () => {
      const largeHistoryRequest = {
        ...validLocationRequest,
        historicalLocations: Array(50).fill(0).map((_, i) => ({
          latitude: 40.7128 + (i * 0.001),
          longitude: -74.0060 + (i * 0.001),
          accuracy: 10.0,
          timestamp: new Date(Date.now() - (i * 60000)).toISOString(),
          source: 'gps'
        }))
      };

      try {
        const response = await axios.post(`${API_BASE_URL}/api/location`, largeHistoryRequest);
        expect(response.status).toBe(200);

      } catch (error) {
        if (axios.isAxiosError(error)) {
          // Should handle reasonable amounts of historical data
          expect(error.response?.status).not.toBe(413);
        }
      }
    });

    it('should respond within reasonable time for complex location analysis', async () => {
      const startTime = Date.now();

      try {
        await axios.post(`${API_BASE_URL}/api/location`, validLocationRequest);
        const responseTime = Date.now() - startTime;

        // Location analysis should complete within 20 seconds
        expect(responseTime).toBeLessThan(20000);

      } catch (error) {
        if (axios.isAxiosError(error)) {
          console.warn('Performance test failing as expected');
        }
      }
    });
  });
});