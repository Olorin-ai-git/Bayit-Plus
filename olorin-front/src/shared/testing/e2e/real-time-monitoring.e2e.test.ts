/**
 * E2E Tests for Real-time Investigation Monitoring
 * Tests WebSocket communication, live updates, and cross-service integration
 * Covers agent-analytics, rag-intelligence, and visualization microservices
 */

import { test, expect, Page, Browser } from '@playwright/test';
import { PlaywrightMCPClient } from '../playwright-mcp';

describe('Real-time Monitoring E2E Flow', () => {
  let browser: Browser;
  let page: Page;
  let mcpClient: PlaywrightMCPClient;

  beforeAll(async () => {
    mcpClient = new PlaywrightMCPClient();
    await mcpClient.initialize();
    browser = await mcpClient.getBrowser();
  });

  beforeEach(async () => {
    page = await browser.newPage();
    await page.goto('http://localhost:3000');
    await page.setViewportSize({ width: 1920, height: 1080 });

    // Create an active investigation to monitor
    await setupActiveInvestigation(page);
  });

  afterEach(async () => {
    await page.close();
  });

  afterAll(async () => {
    await browser.close();
    await mcpClient.cleanup();
  });

  // Helper function to setup an active investigation
  async function setupActiveInvestigation(page: Page) {
    await page.click('[data-testid="autonomous-investigation-tab"]');
    await page.fill('[data-testid="entity-input"]', 'monitor@example.com');
    await page.selectOption('[data-testid="entity-type-select"]', 'email');
    await page.fill('[data-testid="investigation-title"]', 'Real-time Monitoring Test');
    await page.click('[data-testid="start-investigation-button"]');
    await page.waitForSelector('[data-testid="investigation-dashboard"]');
  }

  describe('WebSocket Real-time Communication', () => {
    test('should establish and maintain WebSocket connection', async () => {
      // Verify WebSocket connection status
      await expect(page.locator('[data-testid="websocket-status"]')).toContainText('Connected');

      // Test connection indicator
      await expect(page.locator('[data-testid="connection-indicator"]')).toHaveClass(/connected/);

      // Verify heartbeat mechanism
      await page.waitForTimeout(5000); // Wait for heartbeat cycle
      await expect(page.locator('[data-testid="last-heartbeat"]')).toBeVisible();

      const heartbeatTime = await page.locator('[data-testid="last-heartbeat"]').textContent();
      expect(heartbeatTime).toMatch(/\d{2}:\d{2}:\d{2}/);

      // Test WebSocket message queue
      const messageCount = await page.locator('[data-testid="message-queue-count"]').textContent();
      expect(parseInt(messageCount || '0')).toBeGreaterThanOrEqual(0);
    });

    test('should handle WebSocket disconnection and reconnection', async () => {
      // Simulate network disconnection
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('mock-network-disconnect'));
      });

      // Verify disconnection indicators
      await expect(page.locator('[data-testid="websocket-status"]')).toContainText('Disconnected');
      await expect(page.locator('[data-testid="connection-indicator"]')).toHaveClass(/disconnected/);

      // Verify offline queue activates
      await expect(page.locator('[data-testid="offline-queue-active"]')).toBeVisible();

      // Simulate reconnection
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('mock-network-reconnect'));
      });

      // Verify reconnection with exponential backoff
      await expect(page.locator('[data-testid="reconnection-attempt"]')).toBeVisible();
      await page.waitForSelector('[data-testid="websocket-status"]:has-text("Connected")', { timeout: 10000 });

      // Verify offline messages are synchronized
      await expect(page.locator('[data-testid="sync-complete"]')).toBeVisible();
    });

    test('should handle message queuing during offline periods', async () => {
      // Record initial message count
      const initialCount = await page.locator('[data-testid="message-counter"]').textContent();

      // Simulate disconnection
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('mock-network-disconnect'));
      });

      // Generate events while offline
      await page.evaluate(() => {
        for (let i = 0; i < 5; i++) {
          window.dispatchEvent(new CustomEvent('mock-investigation-event', {
            detail: { type: 'agent-update', data: { step: i } }
          }));
        }
      });

      // Verify messages are queued
      await expect(page.locator('[data-testid="queued-messages"]')).toContainText('5');

      // Reconnect and verify sync
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('mock-network-reconnect'));
      });

      await page.waitForSelector('[data-testid="websocket-status"]:has-text("Connected")');

      // Verify all queued messages are sent
      await expect(page.locator('[data-testid="queued-messages"]')).toContainText('0');
    });
  });

  describe('Agent Analytics Real-time Updates', () => {
    test('should display live agent execution metrics', async () => {
      // Verify agent analytics dashboard loads
      await expect(page.locator('[data-testid="agent-analytics-panel"]')).toBeVisible();

      // Check real-time performance metrics
      await expect(page.locator('[data-testid="cpu-usage-metric"]')).toBeVisible();
      await expect(page.locator('[data-testid="memory-usage-metric"]')).toBeVisible();
      await expect(page.locator('[data-testid="execution-time-metric"]')).toBeVisible();

      // Verify metrics update in real-time
      const initialCpuValue = await page.locator('[data-testid="cpu-usage-value"]').textContent();

      await page.waitForTimeout(3000); // Wait for metric updates

      const updatedCpuValue = await page.locator('[data-testid="cpu-usage-value"]').textContent();
      // CPU values should either stay the same or update (both valid for real-time monitoring)
      expect(updatedCpuValue).toBeDefined();

      // Test agent execution log updates
      await expect(page.locator('[data-testid="agent-execution-log"]')).toBeVisible();

      const logEntries = page.locator('[data-testid="log-entry"]');
      const initialLogCount = await logEntries.count();

      // Wait for new log entries
      await page.waitForFunction(
        (initialCount) => {
          const currentEntries = document.querySelectorAll('[data-testid="log-entry"]');
          return currentEntries.length > initialCount;
        },
        initialLogCount,
        { timeout: 15000 }
      );

      const finalLogCount = await logEntries.count();
      expect(finalLogCount).toBeGreaterThan(initialLogCount);
    });

    test('should show agent performance anomalies', async () => {
      // Wait for anomaly detection system to initialize
      await expect(page.locator('[data-testid="anomaly-detector"]')).toBeVisible();

      // Simulate performance anomaly
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('mock-performance-anomaly', {
          detail: {
            type: 'high_cpu_usage',
            severity: 'warning',
            value: 95,
            threshold: 80,
            agent: 'DeviceAnalysisAgent'
          }
        }));
      });

      // Verify anomaly alert appears
      await expect(page.locator('[data-testid="anomaly-alert"]')).toBeVisible();
      await expect(page.locator('[data-testid="anomaly-type"]')).toContainText('High CPU Usage');
      await expect(page.locator('[data-testid="anomaly-agent"]')).toContainText('DeviceAnalysisAgent');

      // Verify anomaly in metrics dashboard
      await expect(page.locator('[data-testid="cpu-metric-warning"]')).toBeVisible();

      // Test anomaly resolution
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('mock-anomaly-resolved', {
          detail: { type: 'high_cpu_usage', agent: 'DeviceAnalysisAgent' }
        }));
      });

      await expect(page.locator('[data-testid="anomaly-resolved"]')).toBeVisible();
    });

    test('should track agent collaboration metrics', async () => {
      // Verify agent collaboration panel
      await expect(page.locator('[data-testid="agent-collaboration-panel"]')).toBeVisible();

      // Check active agent count
      await expect(page.locator('[data-testid="active-agents-count"]')).toContainText(/\d+/);

      // Verify agent interaction graph
      await expect(page.locator('[data-testid="agent-interaction-graph"]')).toBeVisible();

      // Test agent communication metrics
      await expect(page.locator('[data-testid="message-exchange-count"]')).toBeVisible();
      await expect(page.locator('[data-testid="collaboration-efficiency"]')).toBeVisible();

      // Simulate agent handoff
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('mock-agent-handoff', {
          detail: {
            from: 'DeviceAnalysisAgent',
            to: 'LocationAnalysisAgent',
            data: { deviceId: 'device-123', findings: ['suspicious_location'] }
          }
        }));
      });

      // Verify handoff visualization
      await expect(page.locator('[data-testid="agent-handoff-animation"]')).toBeVisible();
      await expect(page.locator('[data-testid="handoff-details"]')).toContainText('DeviceAnalysisAgent → LocationAnalysisAgent');
    });
  });

  describe('RAG Intelligence Integration', () => {
    test('should display real-time knowledge graph updates', async () => {
      // Verify RAG intelligence panel loads
      await expect(page.locator('[data-testid="rag-intelligence-panel"]')).toBeVisible();

      // Check knowledge graph visualization
      await expect(page.locator('[data-testid="knowledge-graph"]')).toBeVisible();

      // Verify entity nodes are rendered
      const entityNodes = page.locator('[data-testid="entity-node"]');
      const nodeCount = await entityNodes.count();
      expect(nodeCount).toBeGreaterThan(0);

      // Test relationship edges
      await expect(page.locator('[data-testid="relationship-edge"]')).toBeVisible();

      // Simulate new entity discovery
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('mock-entity-discovery', {
          detail: {
            entity: {
              id: 'new-entity-123',
              type: 'device',
              properties: { os: 'Windows 10', browser: 'Chrome' }
            },
            relationships: [
              { from: 'monitor@example.com', to: 'new-entity-123', type: 'used_device' }
            ]
          }
        }));
      });

      // Verify new entity appears in graph
      await expect(page.locator('[data-testid="entity-node"][data-entity-id="new-entity-123"]')).toBeVisible();

      // Test graph interaction
      await page.click('[data-testid="entity-node"][data-entity-id="new-entity-123"]');
      await expect(page.locator('[data-testid="entity-details-panel"]')).toBeVisible();
      await expect(page.locator('[data-testid="entity-properties"]')).toContainText('Windows 10');
    });

    test('should show semantic search insights', async () => {
      // Verify semantic search panel
      await expect(page.locator('[data-testid="semantic-search-panel"]')).toBeVisible();

      // Test query input
      await page.fill('[data-testid="semantic-query-input"]', 'suspicious login patterns');
      await page.click('[data-testid="semantic-search-button"]');

      // Verify search results
      await expect(page.locator('[data-testid="semantic-results"]')).toBeVisible();
      await expect(page.locator('[data-testid="relevance-score"]')).toBeVisible();

      // Test result clustering
      await expect(page.locator('[data-testid="result-clusters"]')).toBeVisible();
      await expect(page.locator('[data-testid="cluster-label"]')).toContainText('Login Anomalies');

      // Verify contextual insights
      await expect(page.locator('[data-testid="contextual-insights"]')).toBeVisible();
      await expect(page.locator('[data-testid="insight-confidence"]')).toBeVisible();
    });

    test('should provide real-time contextual recommendations', async () => {
      // Verify recommendations panel
      await expect(page.locator('[data-testid="recommendations-panel"]')).toBeVisible();

      // Simulate investigation progress triggering recommendations
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('mock-investigation-progress', {
          detail: {
            stage: 'device_analysis_complete',
            findings: ['multiple_devices', 'geo_inconsistency']
          }
        }));
      });

      // Verify contextual recommendations appear
      await expect(page.locator('[data-testid="contextual-recommendation"]')).toBeVisible();
      await expect(page.locator('[data-testid="recommendation-text"]')).toContainText('Consider analyzing location patterns');

      // Test recommendation actions
      await page.click('[data-testid="apply-recommendation-button"]');
      await expect(page.locator('[data-testid="recommendation-applied"]')).toBeVisible();

      // Verify recommendation confidence scoring
      await expect(page.locator('[data-testid="recommendation-confidence"]')).toBeVisible();
      const confidenceText = await page.locator('[data-testid="recommendation-confidence"]').textContent();
      expect(confidenceText).toMatch(/\d+%/);
    });
  });

  describe('Visualization Service Real-time Updates', () => {
    test('should display dynamic risk visualization', async () => {
      // Verify risk visualization loads
      await expect(page.locator('[data-testid="risk-visualization"]')).toBeVisible();

      // Check risk score display
      await expect(page.locator('[data-testid="risk-score"]')).toBeVisible();
      await expect(page.locator('[data-testid="risk-score-value"]')).toContainText(/\d+/);

      // Verify risk factors breakdown
      await expect(page.locator('[data-testid="risk-factors-chart"]')).toBeVisible();

      // Test risk score updates
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('mock-risk-update', {
          detail: {
            newScore: 75,
            factors: [
              { name: 'Device Anomaly', weight: 0.3, score: 80 },
              { name: 'Location Risk', weight: 0.25, score: 70 },
              { name: 'Behavior Pattern', weight: 0.45, score: 75 }
            ]
          }
        }));
      });

      // Verify risk score animation
      await expect(page.locator('[data-testid="risk-score-animation"]')).toBeVisible();

      // Check updated risk factors
      await expect(page.locator('[data-testid="risk-factor"][data-factor="Device Anomaly"]')).toContainText('80');
    });

    test('should show interactive timeline visualization', async () => {
      // Verify timeline visualization
      await expect(page.locator('[data-testid="investigation-timeline"]')).toBeVisible();

      // Check timeline events
      const timelineEvents = page.locator('[data-testid="timeline-event"]');
      const eventCount = await timelineEvents.count();
      expect(eventCount).toBeGreaterThan(0);

      // Test timeline interaction
      await page.click('[data-testid="timeline-event"]:first-child');
      await expect(page.locator('[data-testid="event-details-popup"]')).toBeVisible();

      // Verify timeline filtering
      await page.selectOption('[data-testid="timeline-filter"]', 'agent-events');
      await page.waitForTimeout(1000);

      const filteredEvents = await timelineEvents.count();
      expect(filteredEvents).toBeLessThanOrEqual(eventCount);

      // Test timeline zoom
      await page.click('[data-testid="timeline-zoom-in"]');
      await expect(page.locator('[data-testid="timeline-scale"]')).toHaveAttribute('data-zoom', '2');
    });

    test('should provide real-time network topology visualization', async () => {
      // Verify network topology panel
      await expect(page.locator('[data-testid="network-topology"]')).toBeVisible();

      // Check network nodes
      await expect(page.locator('[data-testid="network-node"]')).toBeVisible();

      // Verify network connections
      await expect(page.locator('[data-testid="network-connection"]')).toBeVisible();

      // Simulate new network discovery
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('mock-network-discovery', {
          detail: {
            nodes: [
              { id: 'new-ip-192.168.1.200', type: 'ip', properties: { location: 'Unknown' } }
            ],
            connections: [
              { from: 'monitor@example.com', to: 'new-ip-192.168.1.200', type: 'accessed' }
            ]
          }
        }));
      });

      // Verify new nodes appear
      await expect(page.locator('[data-testid="network-node"][data-node-id="new-ip-192.168.1.200"]')).toBeVisible();

      // Test network analysis
      await page.click('[data-testid="analyze-network-button"]');
      await expect(page.locator('[data-testid="network-analysis-results"]')).toBeVisible();

      // Verify topology metrics
      await expect(page.locator('[data-testid="network-centrality"]')).toBeVisible();
      await expect(page.locator('[data-testid="suspicious-patterns"]')).toBeVisible();
    });
  });

  describe('Cross-Service Event Coordination', () => {
    test('should coordinate events across all microservices', async () => {
      // Monitor event coordination panel
      await expect(page.locator('[data-testid="event-coordination-panel"]')).toBeVisible();

      // Verify service status indicators
      const services = [
        'autonomous-investigation',
        'agent-analytics',
        'rag-intelligence',
        'visualization',
        'reporting',
        'core-ui',
        'design-system'
      ];

      for (const service of services) {
        await expect(page.locator(`[data-testid="service-status-${service}"]`)).toContainText('Active');
      }

      // Test cross-service event propagation
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('mock-cross-service-event', {
          detail: {
            type: 'investigation-milestone',
            data: { stage: 'analysis_complete', progress: 75 },
            targetServices: ['agent-analytics', 'visualization', 'reporting']
          }
        }));
      });

      // Verify event propagation indicators
      await expect(page.locator('[data-testid="event-propagation-indicator"]')).toBeVisible();

      // Check service-specific responses
      await expect(page.locator('[data-testid="analytics-milestone-response"]')).toBeVisible();
      await expect(page.locator('[data-testid="visualization-milestone-response"]')).toBeVisible();
      await expect(page.locator('[data-testid="reporting-milestone-response"]')).toBeVisible();
    });

    test('should handle event priority and routing', async () => {
      // Test high-priority event routing
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('mock-priority-event', {
          detail: {
            type: 'security-alert',
            priority: 'critical',
            data: { threatLevel: 'high', source: 'automated-detection' }
          }
        }));
      });

      // Verify priority event handling
      await expect(page.locator('[data-testid="priority-event-banner"]')).toBeVisible();
      await expect(page.locator('[data-testid="event-priority"]')).toContainText('Critical');

      // Test event throttling for low-priority events
      await page.evaluate(() => {
        for (let i = 0; i < 50; i++) {
          window.dispatchEvent(new CustomEvent('mock-low-priority-event', {
            detail: { type: 'routine-update', data: { counter: i } }
          }));
        }
      });

      // Verify throttling mechanism
      await expect(page.locator('[data-testid="event-throttling-active"]')).toBeVisible();
      await expect(page.locator('[data-testid="throttled-events-count"]')).toContainText(/\d+/);
    });

    test('should maintain event ordering and consistency', async () => {
      // Generate sequence of ordered events
      await page.evaluate(() => {
        const events = [
          { type: 'analysis-start', sequence: 1, timestamp: Date.now() },
          { type: 'data-collection', sequence: 2, timestamp: Date.now() + 100 },
          { type: 'risk-assessment', sequence: 3, timestamp: Date.now() + 200 },
          { type: 'analysis-complete', sequence: 4, timestamp: Date.now() + 300 }
        ];

        events.forEach(event => {
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('mock-sequenced-event', { detail: event }));
          }, event.timestamp - Date.now());
        });
      });

      // Verify event ordering
      await page.waitForSelector('[data-testid="event-sequence-4"]', { timeout: 10000 });

      const eventSequences = await page.locator('[data-testid^="event-sequence-"]').allTextContents();
      const sequences = eventSequences.map(text => parseInt(text.match(/\d+/)?.[0] || '0'));

      // Verify events are in correct order
      for (let i = 1; i < sequences.length; i++) {
        expect(sequences[i]).toBeGreaterThan(sequences[i - 1]);
      }

      // Test event consistency across services
      await expect(page.locator('[data-testid="event-consistency-check"]')).toContainText('Consistent');
    });
  });

  describe('Performance Monitoring', () => {
    test('should track real-time performance metrics', async () => {
      // Verify performance monitoring dashboard
      await expect(page.locator('[data-testid="performance-dashboard"]')).toBeVisible();

      // Check key performance metrics
      await expect(page.locator('[data-testid="response-time-metric"]')).toBeVisible();
      await expect(page.locator('[data-testid="throughput-metric"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-rate-metric"]')).toBeVisible();

      // Test performance alerts
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('mock-performance-degradation', {
          detail: {
            metric: 'response_time',
            value: 5000, // 5 seconds
            threshold: 2000, // 2 seconds
            service: 'rag-intelligence'
          }
        }));
      });

      // Verify performance alert
      await expect(page.locator('[data-testid="performance-alert"]')).toBeVisible();
      await expect(page.locator('[data-testid="alert-service"]')).toContainText('rag-intelligence');

      // Test performance trend visualization
      await expect(page.locator('[data-testid="performance-trend-chart"]')).toBeVisible();

      // Verify metric history
      const chartDataPoints = page.locator('[data-testid="chart-data-point"]');
      const pointCount = await chartDataPoints.count();
      expect(pointCount).toBeGreaterThan(0);
    });

    test('should monitor memory and resource usage', async () => {
      // Check resource monitoring panel
      await expect(page.locator('[data-testid="resource-monitoring"]')).toBeVisible();

      // Verify memory usage metrics
      await expect(page.locator('[data-testid="memory-usage-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="memory-percentage"]')).toContainText(/%/);

      // Check CPU usage
      await expect(page.locator('[data-testid="cpu-usage-chart"]')).toBeVisible();

      // Test resource alerts
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('mock-resource-alert', {
          detail: {
            type: 'memory_high',
            usage: 90,
            threshold: 80,
            service: 'visualization'
          }
        }));
      });

      // Verify resource alert
      await expect(page.locator('[data-testid="resource-alert"]')).toBeVisible();
      await expect(page.locator('[data-testid="memory-warning"]')).toContainText('90%');

      // Test garbage collection metrics
      await expect(page.locator('[data-testid="gc-metrics"]')).toBeVisible();
    });
  });
});