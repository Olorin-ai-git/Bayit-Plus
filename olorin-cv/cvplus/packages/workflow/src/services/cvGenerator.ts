export { CVGenerator } from '@cvplus/processing';

// If direct import doesn't work in the build, provide a simplified interface
import { FileGenerationResult } from '@cvplus/core';

export interface CVGeneratorInterface {
  saveGeneratedFiles(
    jobId: string,
    userId: string,
    htmlContent: string
  ): Promise<FileGenerationResult>;
  
  deleteGeneratedFiles(userId: string, jobId: string): Promise<void>;
}

// Fallback implementation if import fails
export class WorkflowCVGenerator implements CVGeneratorInterface {
  async saveGeneratedFiles(
    jobId: string,
    userId: string,
    htmlContent: string
  ): Promise<FileGenerationResult> {
    // This is a placeholder implementation
    // In production, this should delegate to the actual CVGenerator
    logger.warn('Using fallback CVGenerator implementation');
    return {
      htmlUrl: `https://storage.googleapis.com/cvplus/generated/${userId}/${jobId}/cv.html`,
      pdfUrl: `https://storage.googleapis.com/cvplus/generated/${userId}/${jobId}/cv.pdf`,
      docxUrl: `https://storage.googleapis.com/cvplus/generated/${userId}/${jobId}/cv.docx`,
    };
  }

  async deleteGeneratedFiles(userId: string, jobId: string): Promise<void> {
    // Placeholder implementation
    logger.warn('Using fallback CVGenerator implementation for delete');
  }
}