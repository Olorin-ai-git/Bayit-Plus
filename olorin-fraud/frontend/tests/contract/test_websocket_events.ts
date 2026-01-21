/**
 * Contract Test: WebSocket Events
 *
 * Tests specific WebSocket event types and their payload structures.
 * This test verifies the contract between frontend and backend for real-time event communication.
 *
 * Expected to FAIL initially (TDD approach) until backend implementation is complete.
 */

import WebSocket from 'ws';
import {
  InvestigationUpdatedEvent,
  StepStartedEvent,
  StepCompletedEvent,
  AgentResponseEvent,
  CommentAddedEvent,
  EvidenceAddedEvent,
  RiskScoreUpdatedEvent
} from '@manual-investigation/types';

const WS_BASE_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8090';

describe('Contract Test: WebSocket Events', () => {
  let ws: WebSocket;
  const testInvestigationId = 'inv_12345';

  beforeEach((done) => {
    ws = new WebSocket(`${WS_BASE_URL}/ws/investigation`);

    ws.on('open', () => {
      // Subscribe to investigation updates
      const subscribeMessage = {
        type: 'subscribe',
        channel: 'investigation_updates',
        investigationId: testInvestigationId,
        timestamp: new Date().toISOString()
      };
      ws.send(JSON.stringify(subscribeMessage));
      done();
    });

    ws.on('error', (error) => {
      console.warn('WebSocket setup failing as expected (TDD approach):', error.message);
      done();
    });
  });

  afterEach((done) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
      ws.on('close', () => done());
    } else {
      done();
    }
  });

  describe('Investigation Update Events', () => {
    it('should receive investigation_updated event with correct structure', (done) => {
      try {
        // Simulate triggering an investigation update (would normally come from backend)
        const triggerUpdate = {
          type: 'trigger_investigation_update',
          investigationId: testInvestigationId,
          updateData: {
            title: 'Updated Investigation Title',
            priority: 'critical'
          },
          timestamp: new Date().toISOString()
        };

        ws.send(JSON.stringify(triggerUpdate));

        ws.on('message', (data) => {
          try {
            const event = JSON.parse(data.toString()) as InvestigationUpdatedEvent;

            if (event.type === 'investigation_updated') {
              // Validate event structure
              expect(event).toHaveProperty('type', 'investigation_updated');
              expect(event).toHaveProperty('investigationId', testInvestigationId);
              expect(event).toHaveProperty('timestamp');
              expect(event).toHaveProperty('data');

              // Validate investigation data
              expect(event.data).toHaveProperty('id');
              expect(event.data).toHaveProperty('title');
              expect(event.data).toHaveProperty('status');
              expect(event.data).toHaveProperty('updatedAt');

              // Validate data types
              expect(typeof event.investigationId).toBe('string');
              expect(typeof event.data.id).toBe('string');
              expect(new Date(event.timestamp)).toBeInstanceOf(Date);
              expect(new Date(event.data.updatedAt)).toBeInstanceOf(Date);

              done();
            }
          } catch (parseError) {
            done(new Error(`Invalid investigation_updated event: ${parseError}`));
          }
        });

      } catch (error) {
        done(new Error(`Failed to test investigation_updated event: ${error}`));
      }
    });
  });

  describe('Step Events', () => {
    it('should receive step_started event with correct structure', (done) => {
      try {
        const triggerStepStart = {
          type: 'trigger_step_start',
          investigationId: testInvestigationId,
          stepData: {
            type: 'device_analysis',
            parameters: { deviceId: 'dev_123' }
          },
          timestamp: new Date().toISOString()
        };

        ws.send(JSON.stringify(triggerStepStart));

        ws.on('message', (data) => {
          try {
            const event = JSON.parse(data.toString()) as StepStartedEvent;

            if (event.type === 'step_started') {
              // Validate event structure
              expect(event).toHaveProperty('type', 'step_started');
              expect(event).toHaveProperty('investigationId', testInvestigationId);
              expect(event).toHaveProperty('stepId');
              expect(event).toHaveProperty('timestamp');
              expect(event).toHaveProperty('data');

              // Validate step data
              expect(event.data).toHaveProperty('id');
              expect(event.data).toHaveProperty('investigationId', testInvestigationId);
              expect(event.data).toHaveProperty('type');
              expect(event.data).toHaveProperty('status', 'running');
              expect(event.data).toHaveProperty('startedAt');

              // Validate data types
              expect(typeof event.stepId).toBe('string');
              expect(typeof event.data.type).toBe('string');
              expect(new Date(event.data.startedAt)).toBeInstanceOf(Date);

              done();
            }
          } catch (parseError) {
            done(new Error(`Invalid step_started event: ${parseError}`));
          }
        });

      } catch (error) {
        done(new Error(`Failed to test step_started event: ${error}`));
      }
    });

    it('should receive step_completed event with correct structure', (done) => {
      try {
        const triggerStepComplete = {
          type: 'trigger_step_complete',
          investigationId: testInvestigationId,
          stepId: 'step_device_001',
          result: {
            riskScore: 0.75,
            findings: ['Unusual device fingerprint', 'New device location']
          },
          timestamp: new Date().toISOString()
        };

        ws.send(JSON.stringify(triggerStepComplete));

        ws.on('message', (data) => {
          try {
            const event = JSON.parse(data.toString()) as StepCompletedEvent;

            if (event.type === 'step_completed') {
              // Validate event structure
              expect(event).toHaveProperty('type', 'step_completed');
              expect(event).toHaveProperty('investigationId', testInvestigationId);
              expect(event).toHaveProperty('stepId');
              expect(event).toHaveProperty('timestamp');
              expect(event).toHaveProperty('data');

              // Validate step completion data
              expect(event.data).toHaveProperty('id');
              expect(event.data).toHaveProperty('status', 'completed');
              expect(event.data).toHaveProperty('completedAt');
              expect(event.data).toHaveProperty('result');

              // Validate result data
              expect(event.data.result).toBeDefined();
              expect(typeof event.data.result).toBe('object');

              // Validate timestamps
              expect(new Date(event.data.completedAt)).toBeInstanceOf(Date);

              done();
            }
          } catch (parseError) {
            done(new Error(`Invalid step_completed event: ${parseError}`));
          }
        });

      } catch (error) {
        done(new Error(`Failed to test step_completed event: ${error}`));
      }
    });
  });

  describe('Agent Response Events', () => {
    it('should receive agent_response event with correct structure', (done) => {
      try {
        const triggerAgentResponse = {
          type: 'trigger_agent_response',
          investigationId: testInvestigationId,
          stepId: 'step_network_001',
          agentData: {
            agentType: 'network_analysis',
            status: 'completed',
            response: {
              riskScore: 0.82,
              findings: ['VPN detected', 'Unusual geolocation']
            }
          },
          timestamp: new Date().toISOString()
        };

        ws.send(JSON.stringify(triggerAgentResponse));

        ws.on('message', (data) => {
          try {
            const event = JSON.parse(data.toString()) as AgentResponseEvent;

            if (event.type === 'agent_response') {
              // Validate event structure
              expect(event).toHaveProperty('type', 'agent_response');
              expect(event).toHaveProperty('investigationId', testInvestigationId);
              expect(event).toHaveProperty('stepId');
              expect(event).toHaveProperty('agentResponseId');
              expect(event).toHaveProperty('timestamp');
              expect(event).toHaveProperty('data');

              // Validate agent response data
              expect(event.data).toHaveProperty('id');
              expect(event.data).toHaveProperty('stepId');
              expect(event.data).toHaveProperty('agentType');
              expect(event.data).toHaveProperty('status');
              expect(event.data).toHaveProperty('createdAt');

              // Validate optional response data
              if (event.data.response) {
                expect(typeof event.data.response).toBe('object');
              }

              if (event.data.error) {
                expect(typeof event.data.error).toBe('string');
              }

              done();
            }
          } catch (parseError) {
            done(new Error(`Invalid agent_response event: ${parseError}`));
          }
        });

      } catch (error) {
        done(new Error(`Failed to test agent_response event: ${error}`));
      }
    });
  });

  describe('Comment Events', () => {
    it('should receive comment_added event with correct structure', (done) => {
      try {
        const triggerCommentAdd = {
          type: 'trigger_comment_add',
          investigationId: testInvestigationId,
          commentData: {
            userId: 'user_analyst_001',
            content: 'This investigation shows clear signs of account takeover',
            type: 'analysis'
          },
          timestamp: new Date().toISOString()
        };

        ws.send(JSON.stringify(triggerCommentAdd));

        ws.on('message', (data) => {
          try {
            const event = JSON.parse(data.toString()) as CommentAddedEvent;

            if (event.type === 'comment_added') {
              // Validate event structure
              expect(event).toHaveProperty('type', 'comment_added');
              expect(event).toHaveProperty('investigationId', testInvestigationId);
              expect(event).toHaveProperty('commentId');
              expect(event).toHaveProperty('timestamp');
              expect(event).toHaveProperty('data');

              // Validate comment data
              expect(event.data).toHaveProperty('id');
              expect(event.data).toHaveProperty('investigationId', testInvestigationId);
              expect(event.data).toHaveProperty('userId');
              expect(event.data).toHaveProperty('content');
              expect(event.data).toHaveProperty('createdAt');

              // Validate data types
              expect(typeof event.commentId).toBe('string');
              expect(typeof event.data.content).toBe('string');
              expect(event.data.content.length).toBeGreaterThan(0);
              expect(new Date(event.data.createdAt)).toBeInstanceOf(Date);

              done();
            }
          } catch (parseError) {
            done(new Error(`Invalid comment_added event: ${parseError}`));
          }
        });

      } catch (error) {
        done(new Error(`Failed to test comment_added event: ${error}`));
      }
    });
  });

  describe('Evidence Events', () => {
    it('should receive evidence_added event with correct structure', (done) => {
      try {
        const triggerEvidenceAdd = {
          type: 'trigger_evidence_add',
          investigationId: testInvestigationId,
          evidenceData: {
            type: 'device_fingerprint',
            source: 'device_analysis_agent',
            data: {
              fingerprint: 'fp_abc123',
              riskScore: 0.9,
              anomalies: ['screen_resolution_mismatch']
            }
          },
          timestamp: new Date().toISOString()
        };

        ws.send(JSON.stringify(triggerEvidenceAdd));

        ws.on('message', (data) => {
          try {
            const event = JSON.parse(data.toString()) as EvidenceAddedEvent;

            if (event.type === 'evidence_added') {
              // Validate event structure
              expect(event).toHaveProperty('type', 'evidence_added');
              expect(event).toHaveProperty('investigationId', testInvestigationId);
              expect(event).toHaveProperty('evidenceId');
              expect(event).toHaveProperty('timestamp');
              expect(event).toHaveProperty('data');

              // Validate evidence data
              expect(event.data).toHaveProperty('id');
              expect(event.data).toHaveProperty('investigationId', testInvestigationId);
              expect(event.data).toHaveProperty('type');
              expect(event.data).toHaveProperty('source');
              expect(event.data).toHaveProperty('data');
              expect(event.data).toHaveProperty('createdAt');

              // Validate data types
              expect(typeof event.evidenceId).toBe('string');
              expect(typeof event.data.type).toBe('string');
              expect(typeof event.data.source).toBe('string');
              expect(typeof event.data.data).toBe('object');
              expect(new Date(event.data.createdAt)).toBeInstanceOf(Date);

              done();
            }
          } catch (parseError) {
            done(new Error(`Invalid evidence_added event: ${parseError}`));
          }
        });

      } catch (error) {
        done(new Error(`Failed to test evidence_added event: ${error}`));
      }
    });
  });

  describe('Risk Score Events', () => {
    it('should receive risk_score_updated event with correct structure', (done) => {
      try {
        const triggerRiskUpdate = {
          type: 'trigger_risk_update',
          investigationId: testInvestigationId,
          riskData: {
            newRiskScore: 0.85,
            previousRiskScore: 0.65,
            updateReason: 'New high-risk evidence discovered',
            contributingFactors: ['device_anomaly', 'location_impossible_travel']
          },
          timestamp: new Date().toISOString()
        };

        ws.send(JSON.stringify(triggerRiskUpdate));

        ws.on('message', (data) => {
          try {
            const event = JSON.parse(data.toString()) as RiskScoreUpdatedEvent;

            if (event.type === 'risk_score_updated') {
              // Validate event structure
              expect(event).toHaveProperty('type', 'risk_score_updated');
              expect(event).toHaveProperty('investigationId', testInvestigationId);
              expect(event).toHaveProperty('timestamp');
              expect(event).toHaveProperty('data');

              // Validate risk score data
              expect(event.data).toHaveProperty('investigationId', testInvestigationId);
              expect(event.data).toHaveProperty('newRiskScore');
              expect(event.data).toHaveProperty('previousRiskScore');
              expect(event.data).toHaveProperty('updatedAt');

              // Validate risk score values
              expect(typeof event.data.newRiskScore).toBe('number');
              expect(event.data.newRiskScore).toBeGreaterThanOrEqual(0);
              expect(event.data.newRiskScore).toBeLessThanOrEqual(1);

              if (event.data.previousRiskScore !== null) {
                expect(typeof event.data.previousRiskScore).toBe('number');
                expect(event.data.previousRiskScore).toBeGreaterThanOrEqual(0);
                expect(event.data.previousRiskScore).toBeLessThanOrEqual(1);
              }

              // Validate optional fields
              if (event.data.updateReason) {
                expect(typeof event.data.updateReason).toBe('string');
              }

              if (event.data.contributingFactors) {
                expect(Array.isArray(event.data.contributingFactors)).toBe(true);
              }

              expect(new Date(event.data.updatedAt)).toBeInstanceOf(Date);

              done();
            }
          } catch (parseError) {
            done(new Error(`Invalid risk_score_updated event: ${parseError}`));
          }
        });

      } catch (error) {
        done(new Error(`Failed to test risk_score_updated event: ${error}`));
      }
    });
  });

  describe('Error Events', () => {
    it('should receive error event for failed operations', (done) => {
      try {
        const triggerError = {
          type: 'trigger_operation_error',
          investigationId: testInvestigationId,
          operation: 'step_execution',
          errorData: {
            stepId: 'step_invalid_001',
            errorType: 'agent_timeout',
            message: 'Network analysis agent timed out after 30 seconds'
          },
          timestamp: new Date().toISOString()
        };

        ws.send(JSON.stringify(triggerError));

        ws.on('message', (data) => {
          try {
            const event = JSON.parse(data.toString());

            if (event.type === 'operation_error') {
              // Validate error event structure
              expect(event).toHaveProperty('type', 'operation_error');
              expect(event).toHaveProperty('investigationId', testInvestigationId);
              expect(event).toHaveProperty('timestamp');
              expect(event).toHaveProperty('error');

              // Validate error data
              expect(event.error).toHaveProperty('operation');
              expect(event.error).toHaveProperty('message');
              expect(event.error).toHaveProperty('errorType');

              // Validate data types
              expect(typeof event.error.operation).toBe('string');
              expect(typeof event.error.message).toBe('string');
              expect(typeof event.error.errorType).toBe('string');

              // Optional fields validation
              if (event.error.stepId) {
                expect(typeof event.error.stepId).toBe('string');
              }

              if (event.error.details) {
                expect(typeof event.error.details).toBe('object');
              }

              done();
            }
          } catch (parseError) {
            done(new Error(`Invalid operation_error event: ${parseError}`));
          }
        });

      } catch (error) {
        done(new Error(`Failed to test operation_error event: ${error}`));
      }
    });
  });

  describe('Event Ordering and Consistency', () => {
    it('should maintain chronological order of events', (done) => {
      const receivedEvents: any[] = [];
      let eventCount = 0;
      const expectedEvents = 3;

      try {
        // Send multiple events in sequence
        const events = [
          {
            type: 'trigger_step_start',
            investigationId: testInvestigationId,
            stepData: { type: 'device_analysis' },
            timestamp: new Date(Date.now() + 1000).toISOString()
          },
          {
            type: 'trigger_agent_response',
            investigationId: testInvestigationId,
            stepId: 'step_device_001',
            agentData: { agentType: 'device', status: 'completed' },
            timestamp: new Date(Date.now() + 2000).toISOString()
          },
          {
            type: 'trigger_step_complete',
            investigationId: testInvestigationId,
            stepId: 'step_device_001',
            result: { riskScore: 0.7 },
            timestamp: new Date(Date.now() + 3000).toISOString()
          }
        ];

        events.forEach((event, index) => {
          setTimeout(() => {
            ws.send(JSON.stringify(event));
          }, index * 100);
        });

        ws.on('message', (data) => {
          try {
            const event = JSON.parse(data.toString());

            if (['step_started', 'agent_response', 'step_completed'].includes(event.type)) {
              receivedEvents.push(event);
              eventCount++;

              if (eventCount === expectedEvents) {
                // Verify chronological order
                for (let i = 1; i < receivedEvents.length; i++) {
                  const prevTimestamp = new Date(receivedEvents[i - 1].timestamp).getTime();
                  const currTimestamp = new Date(receivedEvents[i].timestamp).getTime();
                  expect(currTimestamp).toBeGreaterThanOrEqual(prevTimestamp);
                }

                done();
              }
            }
          } catch (parseError) {
            done(new Error(`Event ordering test failed: ${parseError}`));
          }
        });

        // Timeout after 10 seconds
        setTimeout(() => {
          done(new Error(`Only received ${eventCount}/${expectedEvents} events`));
        }, 10000);

      } catch (error) {
        done(new Error(`Failed to test event ordering: ${error}`));
      }
    });
  });
});