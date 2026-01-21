import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import TestSetup, { TestEnvironment } from '../TestSetup';

describe('End-to-End User Flow Integration', () => {
  let testSetup: TestSetup;
  let testEnv: TestEnvironment;

  beforeEach(async () => {
    testSetup = TestSetup.getInstance();
    testEnv = await testSetup.setupTestEnvironment();
  });

  afterEach(() => {
    testSetup.cleanupTestEnvironment();
  });

  describe('Investigation workflow', () => {
    it('should complete full investigation flow across services', async () => {
      // Step 1: User authentication (Shell service)
      const userSession = {
        userId: 'user123',
        token: 'jwt-token-123',
        permissions: ['read', 'write', 'investigate'],
        timestamp: new Date().toISOString()
      };

      testEnv.eventBus.emit('auth:login', userSession, 'shell');

      // Step 2: Create new investigation (Investigation service)
      testEnv.services.investigation.onMessage('create-investigation', async (data) => {
        return {
          investigationId: 'INV-001',
          status: 'created',
          assignedTo: data.userId,
          createdAt: new Date().toISOString()
        };
      });

      const investigation = await testEnv.services.shell.sendMessage(
        'investigation',
        'create-investigation',
        { userId: userSession.userId, type: 'fraud', priority: 'high' }
      );

      expect(investigation.investigationId).toBe('INV-001');

      // Step 3: Analyze data with AI agents (Agent Analytics service)
      testEnv.services.agentAnalytics.onMessage('run-analysis', async (data) => {
        return {
          analysisId: 'ANA-001',
          investigationId: data.investigationId,
          agents: ['device', 'location', 'network'],
          status: 'completed',
          findings: {
            riskScore: 0.85,
            patterns: ['suspicious_device', 'unusual_location'],
            recommendations: ['block_transaction', 'manual_review']
          }
        };
      });

      const analysis = await testEnv.services.investigation.sendMessage(
        'agentAnalytics',
        'run-analysis',
        { investigationId: investigation.investigationId }
      );

      expect(analysis.findings.riskScore).toBe(0.85);

      // Step 4: Generate visualization (Visualization service)
      testEnv.services.visualization.onMessage('create-risk-chart', async (data) => {
        return {
          chartId: 'CHART-001',
          type: 'risk-network',
          data: {
            nodes: [
              { id: 'user', type: 'user', risk: data.riskScore },
              { id: 'device', type: 'device', risk: 0.9 },
              { id: 'location', type: 'location', risk: 0.7 }
            ],
            edges: [
              { source: 'user', target: 'device', weight: 0.8 },
              { source: 'user', target: 'location', weight: 0.6 }
            ]
          },
          config: { width: 800, height: 600 }
        };
      });

      const chart = await testEnv.services.investigation.sendMessage(
        'visualization',
        'create-risk-chart',
        {
          investigationId: investigation.investigationId,
          riskScore: analysis.findings.riskScore
        }
      );

      expect(chart.chartId).toBe('CHART-001');
      expect(chart.data.nodes).toHaveLength(3);

      // Step 5: Generate investigation report (Reporting service)
      testEnv.services.reporting.onMessage('generate-report', async (data) => {
        return {
          reportId: 'RPT-001',
          investigationId: data.investigationId,
          format: 'pdf',
          status: 'generated',
          url: '/reports/RPT-001.pdf',
          size: '2.4MB'
        };
      });

      const report = await testEnv.services.investigation.sendMessage(
        'reporting',
        'generate-report',
        {
          investigationId: investigation.investigationId,
          analysis: analysis,
          chart: chart
        }
      );

      expect(report.reportId).toBe('RPT-001');
      expect(report.status).toBe('generated');

      // Verify complete workflow events
      testSetup.assertEventEmitted('auth:login', userSession);
    });

    it('should handle investigation workflow with service failures', async () => {
      // Start investigation workflow
      const investigationData = {
        investigationId: 'INV-002',
        userId: 'user456',
        type: 'fraud'
      };

      // Step 1: Investigation service works
      testEnv.services.investigation.onMessage('create-investigation', async (data) => {
        return { investigationId: 'INV-002', status: 'created' };
      });

      const investigation = await testEnv.services.shell.sendMessage(
        'investigation',
        'create-investigation',
        investigationData
      );

      expect(investigation.investigationId).toBe('INV-002');

      // Step 2: Agent Analytics service fails
      testSetup.simulateServiceError('agentAnalytics', 'AI service temporarily unavailable');

      await testSetup.waitForEvent('service:error');

      // Step 3: Investigation should handle gracefully with fallback
      try {
        await testEnv.services.investigation.sendMessage(
          'agentAnalytics',
          'run-analysis',
          { investigationId: 'INV-002' }
        );
      } catch (error) {
        expect(error.message).toContain('timeout');
      }

      // Step 4: Continue with manual analysis (fallback)
      testEnv.services.investigation.onMessage('manual-analysis', async (data) => {
        return {
          analysisId: 'MAN-002',
          investigationId: data.investigationId,
          type: 'manual',
          findings: { riskScore: 0.5, confidence: 'medium' }
        };
      });

      const fallbackAnalysis = await testEnv.services.shell.sendMessage(
        'investigation',
        'manual-analysis',
        { investigationId: 'INV-002' }
      );

      expect(fallbackAnalysis.type).toBe('manual');
      expect(fallbackAnalysis.findings.riskScore).toBe(0.5);
    });
  });

  describe('Knowledge base workflow', () => {
    it('should complete RAG intelligence query flow', async () => {
      // Step 1: Index knowledge documents (RAG Intelligence service)
      testEnv.services.ragIntelligence.onMessage('index-documents', async (data) => {
        return {
          indexId: 'IDX-001',
          documentsIndexed: data.documents.length,
          status: 'completed',
          timestamp: new Date().toISOString()
        };
      });

      const indexResult = await testEnv.services.shell.sendMessage(
        'ragIntelligence',
        'index-documents',
        {
          documents: [
            { id: 'doc1', content: 'Fraud pattern documentation' },
            { id: 'doc2', content: 'Investigation procedures' }
          ]
        }
      );

      expect(indexResult.documentsIndexed).toBe(2);

      // Step 2: Query knowledge base
      testEnv.services.ragIntelligence.onMessage('query-knowledge', async (data) => {
        return {
          queryId: 'QRY-001',
          question: data.question,
          relevantDocs: [
            { id: 'doc1', relevance: 0.9, excerpt: 'Common fraud patterns include...' },
            { id: 'doc2', relevance: 0.7, excerpt: 'Investigation steps are...' }
          ],
          answer: 'Based on the documentation, fraud patterns typically involve...',
          confidence: 0.85
        };
      });

      const queryResult = await testEnv.services.investigation.sendMessage(
        'ragIntelligence',
        'query-knowledge',
        { question: 'What are common fraud patterns?' }
      );

      expect(queryResult.relevantDocs).toHaveLength(2);
      expect(queryResult.confidence).toBe(0.85);

      // Step 3: Generate contextual insights
      testEnv.services.ragIntelligence.onMessage('generate-insights', async (data) => {
        return {
          insightId: 'INS-001',
          investigationId: data.investigationId,
          insights: [
            'Similar pattern detected in case INV-123',
            'Recommend checking transaction history',
            'Consider geographic analysis'
          ],
          confidence: 0.9
        };
      });

      const insights = await testEnv.services.investigation.sendMessage(
        'ragIntelligence',
        'generate-insights',
        {
          investigationId: 'INV-001',
          context: queryResult.answer
        }
      );

      expect(insights.insights).toHaveLength(3);
      expect(insights.confidence).toBe(0.9);
    });
  });

  describe('Collaborative workflow', () => {
    it('should support multi-user collaboration', async () => {
      const user1 = { id: 'user1', name: 'Investigator 1', role: 'analyst' };
      const user2 = { id: 'user2', name: 'Investigator 2', role: 'supervisor' };

      // User 1 creates investigation
      testEnv.services.investigation.onMessage('create-investigation', async (data) => {
        return {
          investigationId: 'INV-COLLAB',
          createdBy: data.userId,
          collaborators: [data.userId],
          status: 'active'
        };
      });

      const investigation = await testEnv.services.shell.sendMessage(
        'investigation',
        'create-investigation',
        { userId: user1.id, type: 'fraud' }
      );

      // User 1 adds User 2 as collaborator
      testEnv.services.investigation.onMessage('add-collaborator', async (data) => {
        return {
          investigationId: data.investigationId,
          collaboratorAdded: data.collaboratorId,
          permissions: data.permissions
        };
      });

      const collaboration = await testEnv.services.shell.sendMessage(
        'investigation',
        'add-collaborator',
        {
          investigationId: investigation.investigationId,
          collaboratorId: user2.id,
          permissions: ['read', 'comment', 'approve']
        }
      );

      expect(collaboration.collaboratorAdded).toBe(user2.id);

      // User 2 adds comments
      testEnv.services.investigation.onMessage('add-comment', async (data) => {
        return {
          commentId: 'COM-001',
          investigationId: data.investigationId,
          userId: data.userId,
          comment: data.comment,
          timestamp: new Date().toISOString()
        };
      });

      const comment = await testEnv.services.shell.sendMessage(
        'investigation',
        'add-comment',
        {
          investigationId: investigation.investigationId,
          userId: user2.id,
          comment: 'This pattern looks suspicious, recommend escalation'
        }
      );

      expect(comment.userId).toBe(user2.id);

      // Real-time notification to User 1
      testEnv.eventBus.emit('collaboration:comment', {
        investigationId: investigation.investigationId,
        commentId: comment.commentId,
        fromUser: user2,
        toUser: user1
      }, 'investigation');

      testSetup.assertEventEmitted('collaboration:comment');
    });

    it('should synchronize state across user sessions', async () => {
      const sharedState = {
        investigationId: 'INV-SHARED',
        currentView: 'analysis',
        filters: { dateRange: '7d', riskLevel: 'high' },
        selectedItems: ['item1', 'item2'],
        timestamp: new Date().toISOString()
      };

      // User 1 updates investigation state
      testEnv.eventBus.emit('state:update', {
        type: 'investigation',
        state: sharedState,
        userId: 'user1'
      }, 'investigation');

      // Simulate state synchronization to other users
      let receivedUpdates: any[] = [];

      testEnv.services.shell.onMessage('state-sync', (data) => {
        receivedUpdates.push(data);
      });

      // Broadcast state update
      testEnv.services.investigation.broadcast('state-sync', sharedState);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(receivedUpdates).toHaveLength(1);
      expect(receivedUpdates[0]).toEqual(sharedState);
    });
  });

  describe('Data flow integration', () => {
    it('should handle complex data pipeline', async () => {
      // Data ingestion flow
      const rawData = {
        transactions: [
          { id: 'txn1', amount: 1000, device: 'dev1', location: 'loc1' },
          { id: 'txn2', amount: 500, device: 'dev2', location: 'loc2' }
        ],
        devices: [
          { id: 'dev1', fingerprint: 'fp1', trustScore: 0.3 },
          { id: 'dev2', fingerprint: 'fp2', trustScore: 0.8 }
        ]
      };

      // Step 1: Data preprocessing
      testEnv.services.investigation.onMessage('preprocess-data', async (data) => {
        return {
          processedData: {
            normalizedTransactions: data.transactions.map(t => ({
              ...t,
              normalizedAmount: t.amount / 1000
            })),
            enrichedDevices: data.devices.map(d => ({
              ...d,
              riskCategory: d.trustScore < 0.5 ? 'high' : 'low'
            }))
          },
          status: 'completed'
        };
      });

      const preprocessed = await testEnv.services.shell.sendMessage(
        'investigation',
        'preprocess-data',
        rawData
      );

      // Step 2: AI analysis
      testEnv.services.agentAnalytics.onMessage('analyze-patterns', async (data) => {
        return {
          patterns: [
            { type: 'device_velocity', severity: 'high', confidence: 0.9 },
            { type: 'amount_anomaly', severity: 'medium', confidence: 0.7 }
          ],
          overallRisk: 0.8
        };
      });

      const patterns = await testEnv.services.investigation.sendMessage(
        'agentAnalytics',
        'analyze-patterns',
        preprocessed.processedData
      );

      // Step 3: Generate visualization
      testEnv.services.visualization.onMessage('create-flow-diagram', async (data) => {
        return {
          diagram: {
            type: 'sankey',
            nodes: data.patterns.map(p => ({ id: p.type, value: p.confidence })),
            flows: [{ source: 'data', target: 'analysis', value: data.overallRisk }]
          }
        };
      });

      const visualization = await testEnv.services.investigation.sendMessage(
        'visualization',
        'create-flow-diagram',
        patterns
      );

      expect(visualization.diagram.type).toBe('sankey');
      expect(patterns.overallRisk).toBe(0.8);
    });
  });
});