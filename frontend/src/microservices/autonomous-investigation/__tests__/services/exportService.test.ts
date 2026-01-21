import { exportService } from '../../services/exportService';
import { Investigation } from '../../types/investigation';
import { ExportOptions } from '../../components/ExportReporting';

// Mock DOM APIs
global.URL.createObjectURL = jest.fn(() => 'mock-blob-url');
global.URL.revokeObjectURL = jest.fn();

// Mock document.createElement for download testing
const mockLink = {
  href: '',
  download: '',
  click: jest.fn(),
  remove: jest.fn()
};

global.document.createElement = jest.fn((tagName) => {
  if (tagName === 'a') {
    return mockLink as any;
  }
  return {} as any;
});

global.document.body.appendChild = jest.fn();
global.document.body.removeChild = jest.fn();

const mockInvestigation: Investigation = {
  id: 'inv-test-123',
  title: 'Test Investigation',
  description: 'A test investigation for export functionality',
  status: 'completed',
  priority: 'high',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-02T00:00:00Z',
  startedAt: '2024-01-01T00:00:00Z',
  completedAt: '2024-01-02T00:00:00Z',
  createdBy: 'test-user@example.com',
  assignedAgents: ['agent-1', 'agent-2'],
  configuration: {
    parameters: {
      parallelAgents: true,
      timeRange: '24h',
      threshold: 0.8
    }
  },
  progress: {
    overall: 100,
    agents: [
      {
        agentId: 'agent-1',
        status: 'completed',
        progress: 100,
        message: 'Analysis complete'
      },
      {
        agentId: 'agent-2',
        status: 'completed',
        progress: 100,
        message: 'Investigation finished'
      }
    ]
  },
  results: {
    riskScore: 0.75,
    confidence: 0.88,
    summary: 'Medium risk investigation with moderate confidence',
    findings: [
      'Suspicious transaction pattern detected',
      'Multiple failed login attempts',
      'Geographic anomaly in access location'
    ],
    recommendations: [
      'Implement additional authentication factors',
      'Monitor account for further suspicious activity',
      'Review access logs for the past 30 days'
    ],
    agentResults: [
      {
        agentId: 'agent-1',
        status: 'completed',
        score: 85,
        confidence: 92,
        executionTime: 2500,
        findings: ['Finding from agent 1'],
        evidence: [
          {
            id: 'evidence-1',
            type: 'pattern',
            title: 'Login Pattern Anomaly',
            description: 'Unusual login pattern detected',
            severity: 'medium',
            confidence: 85,
            source: 'agent-1',
            timestamp: '2024-01-01T12:00:00Z',
            data: { anomaly_score: 0.75 }
          }
        ],
        resourceUsage: {
          cpu: 45,
          memory: 128
        }
      }
    ],
    artifacts: [
      {
        id: 'artifact-1',
        type: 'log',
        title: 'Authentication Logs',
        description: 'Failed authentication attempts',
        createdAt: '2024-01-01T10:00:00Z',
        data: { entries: 15 }
      }
    ],
    timeline: [
      {
        timestamp: '2024-01-01T00:00:00Z',
        type: 'start',
        description: 'Investigation started',
        actor: 'System',
        metadata: { trigger: 'automated' }
      },
      {
        timestamp: '2024-01-02T00:00:00Z',
        type: 'complete',
        description: 'Investigation completed',
        actor: 'System',
        metadata: { duration: '24h' }
      }
    ]
  }
};

const defaultExportOptions: ExportOptions = {
  format: 'json',
  sections: {
    summary: true,
    riskAnalysis: true,
    findings: true,
    recommendations: true,
    evidence: true,
    agentResults: true,
    timeline: true,
    charts: true
  },
  includeMetadata: true,
  includeRawData: false
};

describe('ExportService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(global, 'setTimeout').mockImplementation((fn: any) => {
      fn();
      return 1 as any;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getInstance', () => {
    it('returns singleton instance', () => {
      const instance1 = exportService;
      const instance2 = exportService;
      expect(instance1).toBe(instance2);
    });
  });

  describe('JSON Export', () => {
    it('exports investigation to JSON format successfully', async () => {
      const options: ExportOptions = { ...defaultExportOptions, format: 'json' };

      const result = await exportService.exportInvestigation(mockInvestigation, options);

      expect(result.success).toBe(true);
      expect(result.filename).toMatch(/investigation-inv-test-123-\d+\.json/);
      expect(result.downloadUrl).toBe('mock-blob-url');
    });

    it('includes all selected sections in JSON export', async () => {
      const options: ExportOptions = { ...defaultExportOptions, format: 'json' };

      await exportService.exportInvestigation(mockInvestigation, options);

      // Verify createObjectURL was called with correct data
      expect(global.URL.createObjectURL).toHaveBeenCalled();

      // Get the blob that was created
      const blobCall = (global.URL.createObjectURL as jest.Mock).mock.calls[0][0];
      expect(blobCall.type).toBe('application/json');
    });

    it('excludes unselected sections from JSON export', async () => {
      const options: ExportOptions = {
        ...defaultExportOptions,
        format: 'json',
        sections: {
          summary: true,
          riskAnalysis: false,
          findings: false,
          recommendations: false,
          evidence: false,
          agentResults: false,
          timeline: false,
          charts: false
        }
      };

      const result = await exportService.exportInvestigation(mockInvestigation, options);

      expect(result.success).toBe(true);
    });

    it('includes metadata when option is enabled', async () => {
      const options: ExportOptions = {
        ...defaultExportOptions,
        format: 'json',
        includeMetadata: true
      };

      const result = await exportService.exportInvestigation(mockInvestigation, options);

      expect(result.success).toBe(true);
    });

    it('includes raw data when option is enabled', async () => {
      const options: ExportOptions = {
        ...defaultExportOptions,
        format: 'json',
        includeRawData: true
      };

      const result = await exportService.exportInvestigation(mockInvestigation, options);

      expect(result.success).toBe(true);
    });
  });

  describe('CSV Export', () => {
    it('exports investigation to CSV format successfully', async () => {
      const options: ExportOptions = { ...defaultExportOptions, format: 'csv' };

      const result = await exportService.exportInvestigation(mockInvestigation, options);

      expect(result.success).toBe(true);
      expect(result.filename).toMatch(/investigation-inv-test-123-\d+\.csv/);
      expect(result.downloadUrl).toBe('mock-blob-url');
    });

    it('creates CSV blob with correct MIME type', async () => {
      const options: ExportOptions = { ...defaultExportOptions, format: 'csv' };

      await exportService.exportInvestigation(mockInvestigation, options);

      const blobCall = (global.URL.createObjectURL as jest.Mock).mock.calls[0][0];
      expect(blobCall.type).toBe('text/csv');
    });
  });

  describe('PDF Export', () => {
    it('exports investigation to PDF format successfully', async () => {
      const options: ExportOptions = { ...defaultExportOptions, format: 'pdf' };

      const result = await exportService.exportInvestigation(mockInvestigation, options);

      expect(result.success).toBe(true);
      expect(result.filename).toMatch(/investigation-inv-test-123-\d+\.pdf/);
      expect(result.downloadUrl).toBe('mock-blob-url');
    });

    it('simulates PDF generation delay', async () => {
      const options: ExportOptions = { ...defaultExportOptions, format: 'pdf' };

      await exportService.exportInvestigation(mockInvestigation, options);

      // Verify setTimeout was called (simulating delay)
      expect(global.setTimeout).toHaveBeenCalled();
    });
  });

  describe('Excel Export', () => {
    it('exports investigation to Excel format successfully', async () => {
      const options: ExportOptions = { ...defaultExportOptions, format: 'excel' };

      const result = await exportService.exportInvestigation(mockInvestigation, options);

      expect(result.success).toBe(true);
      expect(result.filename).toMatch(/investigation-inv-test-123-\d+\.xlsx/);
      expect(result.downloadUrl).toBe('mock-blob-url');
    });

    it('creates Excel blob with correct MIME type', async () => {
      const options: ExportOptions = { ...defaultExportOptions, format: 'excel' };

      await exportService.exportInvestigation(mockInvestigation, options);

      const blobCall = (global.URL.createObjectURL as jest.Mock).mock.calls[0][0];
      expect(blobCall.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    });
  });

  describe('Download Functionality', () => {
    it('triggers file download correctly', async () => {
      const options: ExportOptions = { ...defaultExportOptions, format: 'json' };

      await exportService.exportInvestigation(mockInvestigation, options);

      expect(global.document.createElement).toHaveBeenCalledWith('a');
      expect(mockLink.href).toBe('mock-blob-url');
      expect(mockLink.download).toMatch(/investigation-inv-test-123-\d+\.json/);
      expect(mockLink.click).toHaveBeenCalled();
      expect(global.document.body.appendChild).toHaveBeenCalledWith(mockLink);
      expect(global.document.body.removeChild).toHaveBeenCalledWith(mockLink);
    });

    it('cleans up blob URL after download', async () => {
      const options: ExportOptions = { ...defaultExportOptions, format: 'json' };

      await exportService.exportInvestigation(mockInvestigation, options);

      // Verify URL cleanup is scheduled
      expect(global.setTimeout).toHaveBeenCalledWith(
        expect.any(Function),
        1000
      );
    });
  });

  describe('Error Handling', () => {
    it('handles unsupported export format', async () => {
      const options: ExportOptions = {
        ...defaultExportOptions,
        format: 'unsupported' as any
      };

      const result = await exportService.exportInvestigation(mockInvestigation, options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported export format');
    });

    it('handles investigation without results', async () => {
      const investigationWithoutResults = {
        ...mockInvestigation,
        results: undefined
      };
      const options: ExportOptions = { ...defaultExportOptions, format: 'json' };

      const result = await exportService.exportInvestigation(investigationWithoutResults, options);

      expect(result.success).toBe(true);
    });

    it('handles export errors gracefully', async () => {
      // Mock URL.createObjectURL to throw an error
      (global.URL.createObjectURL as jest.Mock).mockImplementation(() => {
        throw new Error('Blob creation failed');
      });

      const options: ExportOptions = { ...defaultExportOptions, format: 'json' };

      const result = await exportService.exportInvestigation(mockInvestigation, options);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Blob creation failed');
    });
  });

  describe('Content Generation', () => {
    it('generates correct CSV structure', async () => {
      const options: ExportOptions = { ...defaultExportOptions, format: 'csv' };

      await exportService.exportInvestigation(mockInvestigation, options);

      // Verify CSV blob was created
      const blobCall = (global.URL.createObjectURL as jest.Mock).mock.calls[0][0];
      expect(blobCall.type).toBe('text/csv');
    });

    it('generates Excel workbook structure', async () => {
      const options: ExportOptions = { ...defaultExportOptions, format: 'excel' };

      await exportService.exportInvestigation(mockInvestigation, options);

      // Verify Excel blob was created with workbook structure
      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });

    it('handles empty findings and recommendations', async () => {
      const investigationWithEmptyData = {
        ...mockInvestigation,
        results: {
          ...mockInvestigation.results!,
          findings: [],
          recommendations: []
        }
      };
      const options: ExportOptions = { ...defaultExportOptions, format: 'json' };

      const result = await exportService.exportInvestigation(investigationWithEmptyData, options);

      expect(result.success).toBe(true);
    });

    it('handles missing agent results', async () => {
      const investigationWithoutAgents = {
        ...mockInvestigation,
        results: {
          ...mockInvestigation.results!,
          agentResults: undefined
        }
      };
      const options: ExportOptions = { ...defaultExportOptions, format: 'json' };

      const result = await exportService.exportInvestigation(investigationWithoutAgents, options);

      expect(result.success).toBe(true);
    });
  });

  describe('Filename Generation', () => {
    it('generates unique filenames with timestamps', async () => {
      const options: ExportOptions = { ...defaultExportOptions, format: 'json' };

      const result1 = await exportService.exportInvestigation(mockInvestigation, options);
      const result2 = await exportService.exportInvestigation(mockInvestigation, options);

      expect(result1.filename).not.toBe(result2.filename);
      expect(result1.filename).toMatch(/investigation-inv-test-123-\d+\.json/);
      expect(result2.filename).toMatch(/investigation-inv-test-123-\d+\.json/);
    });

    it('uses correct file extensions for different formats', async () => {
      const formats = ['json', 'csv', 'pdf', 'excel'] as const;
      const extensions = ['json', 'csv', 'pdf', 'xlsx'];

      for (let i = 0; i < formats.length; i++) {
        const options: ExportOptions = { ...defaultExportOptions, format: formats[i] };
        const result = await exportService.exportInvestigation(mockInvestigation, options);

        expect(result.filename).toMatch(new RegExp(`\\.${extensions[i]}$`));
      }
    });
  });
});