import { Investigation } from '../types/investigation';
import { ExportOptions } from '../components/ExportReporting';

export interface ExportResult {
  success: boolean;
  filename: string;
  downloadUrl?: string;
  error?: string;
}

export class ExportService {
  private static instance: ExportService;

  public static getInstance(): ExportService {
    if (!ExportService.instance) {
      ExportService.instance = new ExportService();
    }
    return ExportService.instance;
  }

  async exportInvestigation(
    investigation: Investigation,
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      switch (options.format) {
        case 'pdf':
          return this.exportToPDF(investigation, options);
        case 'csv':
          return this.exportToCSV(investigation, options);
        case 'json':
          return this.exportToJSON(investigation, options);
        case 'excel':
          return this.exportToExcel(investigation, options);
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }
    } catch (error) {
      console.error('Export failed:', error);
      return {
        success: false,
        filename: '',
        error: error instanceof Error ? error.message : 'Export failed'
      };
    }
  }

  private async exportToPDF(
    investigation: Investigation,
    options: ExportOptions
  ): Promise<ExportResult> {
    // Create PDF content structure
    const pdfContent = this.generatePDFContent(investigation, options);

    // In a real implementation, you would use a PDF library like jsPDF or PDFKit
    // For now, we'll simulate the export
    const filename = `investigation-${investigation.id}-${Date.now()}.pdf`;

    // Simulate PDF generation delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // In a real implementation, you would generate the actual PDF blob
    const mockPdfBlob = new Blob([JSON.stringify(pdfContent, null, 2)], {
      type: 'application/pdf'
    });

    const downloadUrl = URL.createObjectURL(mockPdfBlob);

    // Trigger download
    this.downloadFile(downloadUrl, filename);

    return {
      success: true,
      filename,
      downloadUrl
    };
  }

  private async exportToCSV(
    investigation: Investigation,
    options: ExportOptions
  ): Promise<ExportResult> {
    const csvData = this.generateCSVContent(investigation, options);
    const filename = `investigation-${investigation.id}-${Date.now()}.csv`;

    const csvBlob = new Blob([csvData], { type: 'text/csv' });
    const downloadUrl = URL.createObjectURL(csvBlob);

    this.downloadFile(downloadUrl, filename);

    return {
      success: true,
      filename,
      downloadUrl
    };
  }

  private async exportToJSON(
    investigation: Investigation,
    options: ExportOptions
  ): Promise<ExportResult> {
    const jsonData = this.generateJSONContent(investigation, options);
    const filename = `investigation-${investigation.id}-${Date.now()}.json`;

    const jsonBlob = new Blob([JSON.stringify(jsonData, null, 2)], {
      type: 'application/json'
    });
    const downloadUrl = URL.createObjectURL(jsonBlob);

    this.downloadFile(downloadUrl, filename);

    return {
      success: true,
      filename,
      downloadUrl
    };
  }

  private async exportToExcel(
    investigation: Investigation,
    options: ExportOptions
  ): Promise<ExportResult> {
    // In a real implementation, you would use a library like SheetJS or ExcelJS
    const excelData = this.generateExcelContent(investigation, options);
    const filename = `investigation-${investigation.id}-${Date.now()}.xlsx`;

    // Simulate Excel generation
    await new Promise(resolve => setTimeout(resolve, 1500));

    const mockExcelBlob = new Blob([JSON.stringify(excelData, null, 2)], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const downloadUrl = URL.createObjectURL(mockExcelBlob);
    this.downloadFile(downloadUrl, filename);

    return {
      success: true,
      filename,
      downloadUrl
    };
  }

  private generatePDFContent(investigation: Investigation, options: ExportOptions) {
    const content: any = {
      title: `Investigation Report: ${investigation.title}`,
      metadata: {
        investigationId: investigation.id,
        generatedAt: new Date().toISOString(),
        status: investigation.status,
        priority: investigation.priority
      }
    };

    if (options.sections.summary && investigation.results) {
      content.summary = {
        riskScore: investigation.results.riskScore,
        confidence: investigation.results.confidence,
        summary: investigation.results.summary
      };
    }

    if (options.sections.findings && investigation.results) {
      content.findings = investigation.results.findings;
    }

    if (options.sections.recommendations && investigation.results) {
      content.recommendations = investigation.results.recommendations;
    }

    if (options.sections.evidence && investigation.results?.artifacts) {
      content.evidence = investigation.results.artifacts;
    }

    if (options.sections.agentResults && investigation.results?.agentResults) {
      content.agentResults = investigation.results.agentResults;
    }

    if (options.sections.timeline && investigation.results?.timeline) {
      content.timeline = investigation.results.timeline;
    }

    if (options.includeMetadata) {
      content.metadata = {
        ...content.metadata,
        createdAt: investigation.createdAt,
        updatedAt: investigation.updatedAt,
        createdBy: investigation.createdBy,
        assignedAgents: investigation.assignedAgents,
        configuration: investigation.configuration
      };
    }

    return content;
  }

  private generateCSVContent(investigation: Investigation, options: ExportOptions): string {
    const rows: string[] = [];

    // Header
    rows.push('Section,Field,Value');

    // Basic info
    rows.push(`Basic,Investigation ID,${investigation.id}`);
    rows.push(`Basic,Title,"${investigation.title}"`);
    rows.push(`Basic,Status,${investigation.status}`);
    rows.push(`Basic,Priority,${investigation.priority}`);

    if (!investigation.results) {
      return rows.join('\n');
    }

    if (options.sections.summary) {
      rows.push(`Summary,Risk Score,${investigation.results.riskScore}`);
      rows.push(`Summary,Confidence,${investigation.results.confidence}`);
      rows.push(`Summary,Description,"${investigation.results.summary}"`);
    }

    if (options.sections.findings) {
      investigation.results.findings.forEach((finding, index) => {
        rows.push(`Findings,Finding ${index + 1},"${finding}"`);
      });
    }

    if (options.sections.recommendations) {
      investigation.results.recommendations.forEach((rec, index) => {
        rows.push(`Recommendations,Recommendation ${index + 1},"${rec}"`);
      });
    }

    if (options.sections.agentResults && investigation.results.agentResults) {
      investigation.results.agentResults.forEach(agent => {
        rows.push(`Agents,${agent.agentId} Status,${agent.status}`);
        rows.push(`Agents,${agent.agentId} Score,${agent.score}`);
        rows.push(`Agents,${agent.agentId} Confidence,${agent.confidence}`);
        rows.push(`Agents,${agent.agentId} Execution Time,${agent.executionTime}`);
      });
    }

    return rows.join('\n');
  }

  private generateJSONContent(investigation: Investigation, options: ExportOptions) {
    const data: any = {
      investigationId: investigation.id,
      title: investigation.title,
      status: investigation.status,
      priority: investigation.priority,
      exportedAt: new Date().toISOString(),
      exportOptions: options
    };

    if (!investigation.results) {
      return data;
    }

    if (options.sections.summary) {
      data.summary = {
        riskScore: investigation.results.riskScore,
        confidence: investigation.results.confidence,
        description: investigation.results.summary
      };
    }

    if (options.sections.findings) {
      data.findings = investigation.results.findings;
    }

    if (options.sections.recommendations) {
      data.recommendations = investigation.results.recommendations;
    }

    if (options.sections.evidence && investigation.results.artifacts) {
      data.evidence = investigation.results.artifacts;
    }

    if (options.sections.agentResults && investigation.results.agentResults) {
      data.agentResults = investigation.results.agentResults;
    }

    if (options.sections.timeline && investigation.results.timeline) {
      data.timeline = investigation.results.timeline;
    }

    if (options.includeMetadata) {
      data.metadata = {
        createdAt: investigation.createdAt,
        updatedAt: investigation.updatedAt,
        createdBy: investigation.createdBy,
        assignedAgents: investigation.assignedAgents,
        configuration: investigation.configuration,
        progress: investigation.progress
      };
    }

    if (options.includeRawData) {
      data.rawData = investigation;
    }

    return data;
  }

  private generateExcelContent(investigation: Investigation, options: ExportOptions) {
    // Structure data for Excel workbook with multiple sheets
    const workbook = {
      sheets: [] as any[]
    };

    // Summary sheet
    if (options.sections.summary && investigation.results) {
      workbook.sheets.push({
        name: 'Summary',
        data: [
          ['Field', 'Value'],
          ['Investigation ID', investigation.id],
          ['Title', investigation.title],
          ['Status', investigation.status],
          ['Priority', investigation.priority],
          ['Risk Score', investigation.results.riskScore],
          ['Confidence', investigation.results.confidence],
          ['Summary', investigation.results.summary]
        ]
      });
    }

    // Findings sheet
    if (options.sections.findings && investigation.results) {
      workbook.sheets.push({
        name: 'Findings',
        data: [
          ['Index', 'Finding'],
          ...investigation.results.findings.map((finding, index) => [index + 1, finding])
        ]
      });
    }

    // Recommendations sheet
    if (options.sections.recommendations && investigation.results) {
      workbook.sheets.push({
        name: 'Recommendations',
        data: [
          ['Index', 'Recommendation'],
          ...investigation.results.recommendations.map((rec, index) => [index + 1, rec])
        ]
      });
    }

    // Agent Results sheet
    if (options.sections.agentResults && investigation.results?.agentResults) {
      workbook.sheets.push({
        name: 'Agent Results',
        data: [
          ['Agent ID', 'Status', 'Score', 'Confidence', 'Execution Time', 'Findings Count'],
          ...investigation.results.agentResults.map(agent => [
            agent.agentId,
            agent.status,
            agent.score,
            agent.confidence,
            agent.executionTime,
            agent.findings.length
          ])
        ]
      });
    }

    return workbook;
  }

  private downloadFile(url: string, filename: string) {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the URL object after a delay
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

export const exportService = ExportService.getInstance();