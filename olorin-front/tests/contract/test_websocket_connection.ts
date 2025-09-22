/**
 * Contract Test: WebSocket Connection
 *
 * Tests the WebSocket connection establishment and basic communication.
 * This test verifies the contract between frontend and backend for real-time communication.
 *
 * Expected to FAIL initially (TDD approach) until backend implementation is complete.
 */

import WebSocket from 'ws';

const WS_BASE_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8090';

describe('Contract Test: WebSocket Connection', () => {
  let ws: WebSocket;

  afterEach((done) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
      ws.on('close', () => done());
    } else {
      done();
    }
  });

  describe('Connection Establishment', () => {
    it('should establish WebSocket connection successfully', (done) => {
      try {
        ws = new WebSocket(`${WS_BASE_URL}/ws/investigation`);

        ws.on('open', () => {
          expect(ws.readyState).toBe(WebSocket.OPEN);
          done();
        });

        ws.on('error', (error) => {
          console.warn('WebSocket connection test failing as expected (TDD approach):', error.message);
          expect(error).toBeDefined();
          done(new Error(`WebSocket connection not implemented: ${error.message}`));
        });

        // Timeout after 5 seconds
        setTimeout(() => {
          if (ws.readyState !== WebSocket.OPEN) {
            done(new Error('WebSocket connection timeout'));
          }
        }, 5000);

      } catch (error) {
        done(new Error(`Failed to create WebSocket connection: ${error}`));
      }
    });

    it('should receive welcome message upon connection', (done) => {
      try {
        ws = new WebSocket(`${WS_BASE_URL}/ws/investigation`);

        ws.on('open', () => {
          // Expect welcome message within 2 seconds
          setTimeout(() => {
            done(new Error('No welcome message received'));
          }, 2000);
        });

        ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());

            // Validate welcome message structure
            expect(message).toHaveProperty('type', 'connection_established');
            expect(message).toHaveProperty('timestamp');
            expect(message).toHaveProperty('connectionId');
            expect(message).toHaveProperty('serverVersion');

            // Validate data types
            expect(typeof message.connectionId).toBe('string');
            expect(typeof message.serverVersion).toBe('string');
            expect(new Date(message.timestamp)).toBeInstanceOf(Date);

            done();
          } catch (parseError) {
            done(new Error(`Invalid welcome message format: ${parseError}`));
          }
        });

        ws.on('error', (error) => {
          done(new Error(`WebSocket error: ${error.message}`));
        });

      } catch (error) {
        done(new Error(`Failed to test welcome message: ${error}`));
      }
    });

    it('should support authentication via query parameters', (done) => {
      try {
        const authToken = 'test_jwt_token_123';
        ws = new WebSocket(`${WS_BASE_URL}/ws/investigation?token=${authToken}`);

        ws.on('open', () => {
          // Connection should be established with auth
          expect(ws.readyState).toBe(WebSocket.OPEN);
          done();
        });

        ws.on('error', (error) => {
          // Could fail due to auth validation or missing implementation
          console.warn('WebSocket auth test failing as expected');
          done(new Error(`WebSocket authentication test failed: ${error.message}`));
        });

      } catch (error) {
        done(new Error(`Failed to test WebSocket authentication: ${error}`));
      }
    });

    it('should reject connection with invalid authentication', (done) => {
      try {
        ws = new WebSocket(`${WS_BASE_URL}/ws/investigation?token=invalid_token`);

        ws.on('open', () => {
          done(new Error('Connection should have been rejected for invalid token'));
        });

        ws.on('error', (error) => {
          // Should fail for invalid authentication
          expect(error).toBeDefined();
          done();
        });

        ws.on('close', (code) => {
          // Should close with unauthorized code
          expect([1008, 1011]).toContain(code); // Policy violation or internal error
          done();
        });

        // Timeout after 3 seconds
        setTimeout(() => {
          done(new Error('Expected connection rejection timeout'));
        }, 3000);

      } catch (error) {
        done(new Error(`Failed to test invalid authentication: ${error}`));
      }
    });
  });

  describe('Basic Communication', () => {
    it('should send and receive ping/pong messages', (done) => {
      try {
        ws = new WebSocket(`${WS_BASE_URL}/ws/investigation`);

        ws.on('open', () => {
          // Send ping message
          const pingMessage = {
            type: 'ping',
            timestamp: new Date().toISOString(),
            data: { test: 'ping' }
          };

          ws.send(JSON.stringify(pingMessage));
        });

        ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());

            if (message.type === 'pong') {
              // Validate pong response
              expect(message).toHaveProperty('type', 'pong');
              expect(message).toHaveProperty('timestamp');
              expect(message).toHaveProperty('data');

              // Should echo back the ping data
              expect(message.data).toEqual({ test: 'ping' });
              done();
            }
          } catch (parseError) {
            done(new Error(`Invalid pong message format: ${parseError}`));
          }
        });

        ws.on('error', (error) => {
          done(new Error(`WebSocket ping/pong test failed: ${error.message}`));
        });

      } catch (error) {
        done(new Error(`Failed to test ping/pong: ${error}`));
      }
    });

    it('should handle subscription to investigation updates', (done) => {
      try {
        ws = new WebSocket(`${WS_BASE_URL}/ws/investigation`);

        ws.on('open', () => {
          // Subscribe to investigation updates
          const subscribeMessage = {
            type: 'subscribe',
            channel: 'investigation_updates',
            investigationId: 'inv_12345',
            timestamp: new Date().toISOString()
          };

          ws.send(JSON.stringify(subscribeMessage));
        });

        ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());

            if (message.type === 'subscription_confirmed') {
              // Validate subscription confirmation
              expect(message).toHaveProperty('type', 'subscription_confirmed');
              expect(message).toHaveProperty('channel', 'investigation_updates');
              expect(message).toHaveProperty('investigationId', 'inv_12345');
              expect(message).toHaveProperty('subscriptionId');

              expect(typeof message.subscriptionId).toBe('string');
              done();
            }
          } catch (parseError) {
            done(new Error(`Invalid subscription confirmation: ${parseError}`));
          }
        });

        ws.on('error', (error) => {
          done(new Error(`WebSocket subscription test failed: ${error.message}`));
        });

      } catch (error) {
        done(new Error(`Failed to test subscription: ${error}`));
      }
    });

    it('should handle unsubscription from channels', (done) => {
      try {
        ws = new WebSocket(`${WS_BASE_URL}/ws/investigation`);
        let subscriptionId: string;

        ws.on('open', () => {
          // First subscribe
          const subscribeMessage = {
            type: 'subscribe',
            channel: 'investigation_updates',
            investigationId: 'inv_12345',
            timestamp: new Date().toISOString()
          };

          ws.send(JSON.stringify(subscribeMessage));
        });

        ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());

            if (message.type === 'subscription_confirmed') {
              subscriptionId = message.subscriptionId;

              // Now unsubscribe
              const unsubscribeMessage = {
                type: 'unsubscribe',
                subscriptionId: subscriptionId,
                timestamp: new Date().toISOString()
              };

              ws.send(JSON.stringify(unsubscribeMessage));

            } else if (message.type === 'unsubscription_confirmed') {
              // Validate unsubscription confirmation
              expect(message).toHaveProperty('type', 'unsubscription_confirmed');
              expect(message).toHaveProperty('subscriptionId', subscriptionId);
              done();
            }
          } catch (parseError) {
            done(new Error(`Invalid unsubscription message: ${parseError}`));
          }
        });

        ws.on('error', (error) => {
          done(new Error(`WebSocket unsubscription test failed: ${error.message}`));
        });

      } catch (error) {
        done(new Error(`Failed to test unsubscription: ${error}`));
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON messages gracefully', (done) => {
      try {
        ws = new WebSocket(`${WS_BASE_URL}/ws/investigation`);

        ws.on('open', () => {
          // Send malformed JSON
          ws.send('invalid-json-message');
        });

        ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());

            if (message.type === 'error') {
              // Should receive error message for malformed JSON
              expect(message).toHaveProperty('type', 'error');
              expect(message).toHaveProperty('error');
              expect(message.error).toContain('invalid');
              done();
            }
          } catch (parseError) {
            done(new Error(`Invalid error message format: ${parseError}`));
          }
        });

        ws.on('error', (error) => {
          done(new Error(`WebSocket malformed JSON test failed: ${error.message}`));
        });

        // Timeout after 3 seconds
        setTimeout(() => {
          done(new Error('No error response received for malformed JSON'));
        }, 3000);

      } catch (error) {
        done(new Error(`Failed to test malformed JSON handling: ${error}`));
      }
    });

    it('should handle unknown message types', (done) => {
      try {
        ws = new WebSocket(`${WS_BASE_URL}/ws/investigation`);

        ws.on('open', () => {
          // Send unknown message type
          const unknownMessage = {
            type: 'unknown_message_type',
            data: { test: 'data' },
            timestamp: new Date().toISOString()
          };

          ws.send(JSON.stringify(unknownMessage));
        });

        ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());

            if (message.type === 'error') {
              // Should receive error for unknown message type
              expect(message).toHaveProperty('type', 'error');
              expect(message).toHaveProperty('error');
              expect(message.error.toLowerCase()).toContain('unknown');
              done();
            }
          } catch (parseError) {
            done(new Error(`Invalid error response: ${parseError}`));
          }
        });

        ws.on('error', (error) => {
          done(new Error(`WebSocket unknown message test failed: ${error.message}`));
        });

        // Timeout after 3 seconds
        setTimeout(() => {
          done(new Error('No error response for unknown message type'));
        }, 3000);

      } catch (error) {
        done(new Error(`Failed to test unknown message handling: ${error}`));
      }
    });

    it('should handle subscription to non-existent investigation', (done) => {
      try {
        ws = new WebSocket(`${WS_BASE_URL}/ws/investigation`);

        ws.on('open', () => {
          // Subscribe to non-existent investigation
          const subscribeMessage = {
            type: 'subscribe',
            channel: 'investigation_updates',
            investigationId: 'inv_nonexistent',
            timestamp: new Date().toISOString()
          };

          ws.send(JSON.stringify(subscribeMessage));
        });

        ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());

            if (message.type === 'subscription_error') {
              // Should receive subscription error
              expect(message).toHaveProperty('type', 'subscription_error');
              expect(message).toHaveProperty('error');
              expect(message).toHaveProperty('investigationId', 'inv_nonexistent');
              done();
            }
          } catch (parseError) {
            done(new Error(`Invalid subscription error: ${parseError}`));
          }
        });

        ws.on('error', (error) => {
          done(new Error(`WebSocket non-existent investigation test failed: ${error.message}`));
        });

        // Timeout after 3 seconds
        setTimeout(() => {
          done(new Error('No subscription error for non-existent investigation'));
        }, 3000);

      } catch (error) {
        done(new Error(`Failed to test non-existent investigation: ${error}`));
      }
    });
  });

  describe('Connection Management', () => {
    it('should handle connection close gracefully', (done) => {
      try {
        ws = new WebSocket(`${WS_BASE_URL}/ws/investigation`);

        ws.on('open', () => {
          // Close connection from client side
          ws.close(1000, 'Normal closure');
        });

        ws.on('close', (code, reason) => {
          expect(code).toBe(1000);
          expect(reason.toString()).toBe('Normal closure');
          done();
        });

        ws.on('error', (error) => {
          done(new Error(`WebSocket close test failed: ${error.message}`));
        });

      } catch (error) {
        done(new Error(`Failed to test connection close: ${error}`));
      }
    });

    it('should handle server-initiated connection close', (done) => {
      try {
        ws = new WebSocket(`${WS_BASE_URL}/ws/investigation`);

        ws.on('open', () => {
          // Send a message that might trigger server close (invalid permissions)
          const invalidMessage = {
            type: 'subscribe',
            channel: 'admin_only_channel',
            timestamp: new Date().toISOString()
          };

          ws.send(JSON.stringify(invalidMessage));
        });

        ws.on('close', (code, reason) => {
          // Server should close with appropriate code
          expect([1008, 1011]).toContain(code); // Policy violation or internal error
          done();
        });

        ws.on('error', (error) => {
          // Error is also acceptable for this test
          done();
        });

        // Timeout after 5 seconds
        setTimeout(() => {
          done(new Error('Server should have closed connection'));
        }, 5000);

      } catch (error) {
        done(new Error(`Failed to test server-initiated close: ${error}`));
      }
    });

    it('should handle connection heartbeat/keepalive', (done) => {
      try {
        ws = new WebSocket(`${WS_BASE_URL}/ws/investigation`);
        let heartbeatReceived = false;

        ws.on('open', () => {
          // Listen for heartbeat messages
          setTimeout(() => {
            if (!heartbeatReceived) {
              done(new Error('No heartbeat message received'));
            }
          }, 10000); // Wait 10 seconds for heartbeat
        });

        ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());

            if (message.type === 'heartbeat' || message.type === 'ping') {
              heartbeatReceived = true;
              done();
            }
          } catch (parseError) {
            // Ignore parse errors for other messages
          }
        });

        ws.on('error', (error) => {
          done(new Error(`WebSocket heartbeat test failed: ${error.message}`));
        });

      } catch (error) {
        done(new Error(`Failed to test heartbeat: ${error}`));
      }
    });
  });
});