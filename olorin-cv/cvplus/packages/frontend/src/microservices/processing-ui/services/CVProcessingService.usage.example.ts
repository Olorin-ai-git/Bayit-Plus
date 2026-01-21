/**
 * CVProcessingService Usage Examples (T071)
 *
 * Comprehensive examples demonstrating how to use the enhanced CV Processing Service
 * for various CV processing workflows and operations.
 *
 * @version 1.0.0 - T071 Usage Examples
 * @author Gil Klainert
  */

import {
  CVProcessingService,
  cvProcessingService,
  ProcessingFeature,
  ProcessingPriority,
  ExportFormat,
  ProcessingJobStatus,
  ProcessingEventType
} from './CVProcessingService';

/**
 * Example 1: Basic CV Upload and Processing
  */
export async function basicCVProcessing(file: File) {
  try {
    logger.info('Starting basic CV processing...');

    // Configure upload options
    const uploadOptions = {
      features: [
        ProcessingFeature.ANALYSIS,
        ProcessingFeature.ENHANCEMENT,
        ProcessingFeature.ATS_OPTIMIZATION
      ],
      jobDescription: 'Software Engineer position at tech startup',
      templateId: 'modern-tech',
      priority: ProcessingPriority.NORMAL,
      onProgress: (progress: number, stage: string) => {
        logger.info(`${stage}: ${progress.toFixed(1)}%`);
      }
    };

    // Upload and start processing
    const result = await cvProcessingService.uploadCV(file, uploadOptions);

    if (!result.success) {
      throw new Error(result.error);
    }

    logger.info(`Processing started with job ID: ${result.jobId}`);
    logger.info(`Estimated processing time: ${result.estimatedTime}ms`);

    // Monitor processing status
    const finalStatus = await monitorProcessingStatus(result.jobId);

    // Get results when complete
    if (finalStatus.status === ProcessingJobStatus.COMPLETED) {
      const results = await cvProcessingService.getProcessingResults(result.jobId);
      logger.info('Processing completed successfully:', results);
      return results;
    } else {
      throw new Error(`Processing failed: ${finalStatus.error}`);
    }

  } catch (error) {
    logger.error('CV processing failed:', error);
    throw error;
  }
}

/**
 * Example 2: Advanced Processing with Real-time Updates
  */
export async function advancedProcessingWithRealTime(file: File) {
  try {
    logger.info('Starting advanced CV processing with real-time updates...');

    // Configure comprehensive processing
    const uploadOptions = {
      features: [
        ProcessingFeature.ANALYSIS,
        ProcessingFeature.ENHANCEMENT,
        ProcessingFeature.ATS_OPTIMIZATION,
        ProcessingFeature.PERSONALITY_INSIGHTS,
        ProcessingFeature.MULTIMEDIA,
        ProcessingFeature.TEMPLATES,
        ProcessingFeature.EXPORTS
      ],
      jobDescription: 'Senior Product Manager role at Fortune 500 company',
      templateId: 'executive-professional',
      priority: ProcessingPriority.HIGH,
      metadata: {
        targetIndustry: 'Technology',
        experienceLevel: 'Senior',
        location: 'Remote'
      }
    };

    // Start processing
    const result = await cvProcessingService.uploadCV(file, uploadOptions);
    if (!result.success) {
      throw new Error(result.error);
    }

    // Subscribe to real-time updates
    const eventSource = cvProcessingService.subscribeToUpdates(result.jobId);

    // Handle real-time events
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      logger.info('Status update:', data);

      // Handle different event types
      switch (data.type) {
        case ProcessingEventType.UPLOAD_PROGRESS:
          logger.info(`Upload: ${data.progress}%`);
          break;
        case ProcessingEventType.PROCESSING_PROGRESS:
          logger.info(`Processing: ${data.progress}% - ${data.currentStage}`);
          break;
        case ProcessingEventType.STAGE_COMPLETED:
          logger.info(`Completed stage: ${data.stage}`);
          break;
        case ProcessingEventType.PROCESSING_COMPLETED:
          logger.info('Processing completed!');
          handleProcessingComplete(result.jobId);
          break;
        case ProcessingEventType.JOB_FAILED:
          logger.error('Processing failed:', data.error);
          break;
      }
    };

    eventSource.onerror = (error) => {
      logger.error('Real-time connection error:', error);
    };

    return result.jobId;

  } catch (error) {
    logger.error('Advanced processing failed:', error);
    throw error;
  }
}

/**
 * Example 3: Template Management and Application
  */
export async function templateManagementExample(jobId: string) {
  try {
    logger.info('Demonstrating template management...');

    // Get available templates
    const templates = await cvProcessingService.getTemplates();
    logger.info(`Available templates: ${templates.length}`);

    // Filter templates by category
    const modernTemplates = templates.filter(t => t.category === 'modern');
    const professionalTemplates = templates.filter(t => t.category === 'professional');

    logger.info(`Modern templates: ${modernTemplates.length}`);
    logger.info(`Professional templates: ${professionalTemplates.length}`);

    // Apply a specific template
    const selectedTemplate = modernTemplates.find(t => t.name === 'Tech Innovator');
    if (selectedTemplate) {
      logger.info(`Applying template: ${selectedTemplate.name}`);
      const updatedCVData = await cvProcessingService.applyTemplate(jobId, selectedTemplate.id);
      logger.info('Template applied successfully:', updatedCVData);
    }

    return templates;

  } catch (error) {
    logger.error('Template management failed:', error);
    throw error;
  }
}

/**
 * Example 4: Multiple Format Exports
  */
export async function multipleFormatExports(jobId: string) {
  try {
    logger.info('Exporting CV in multiple formats...');

    const formats = [
      ExportFormat.PDF,
      ExportFormat.DOCX,
      ExportFormat.HTML,
      ExportFormat.MARKDOWN
    ];

    // Export in parallel
    const exportPromises = formats.map(format =>
      cvProcessingService.exportCV(jobId, format)
    );

    const exportResults = await Promise.allSettled(exportPromises);

    const successfulExports = [];
    const failedExports = [];

    exportResults.forEach((result, index) => {
      const format = formats[index];
      if (result.status === 'fulfilled') {
        successfulExports.push({
          format,
          result: result.value
        });
        logger.info(`${format} export successful: ${result.value.url}`);
      } else {
        failedExports.push({
          format,
          error: result.reason
        });
        logger.error(`${format} export failed:`, result.reason);
      }
    });

    logger.info(`Successful exports: ${successfulExports.length}`);
    logger.info(`Failed exports: ${failedExports.length}`);

    return {
      successful: successfulExports,
      failed: failedExports
    };

  } catch (error) {
    logger.error('Multiple format export failed:', error);
    throw error;
  }
}

/**
 * Example 5: Batch Processing Multiple CVs
  */
export async function batchProcessingExample(files: File[]) {
  try {
    logger.info(`Starting batch processing of ${files.length} CVs...`);

    const batchOptions = {
      features: [ProcessingFeature.ANALYSIS, ProcessingFeature.ATS_OPTIMIZATION],
      priority: ProcessingPriority.LOW, // Use low priority for batch operations
      templateId: 'standard-professional'
    };

    // Process files with staggered timing to avoid overwhelming the system
    const processPromises = files.map((file, index) => {
      return new Promise(resolve => {
        setTimeout(async () => {
          try {
            const result = await cvProcessingService.uploadCV(file, batchOptions);
            resolve({ file: file.name, result });
          } catch (error) {
            resolve({ file: file.name, error });
          }
        }, index * 1000); // 1 second delay between each upload
      });
    });

    const batchResults = await Promise.all(processPromises);

    // Monitor all jobs
    const activeJobs = [];
    for (const result of batchResults) {
      if ((result as any).result?.success) {
        activeJobs.push((result as any).result.jobId);
      }
    }

    logger.info(`Successfully started ${activeJobs.length} processing jobs`);

    // Monitor completion of all jobs
    const completionPromises = activeJobs.map(jobId =>
      monitorProcessingStatus(jobId)
    );

    const completionResults = await Promise.allSettled(completionPromises);

    const summary = {
      total: files.length,
      successful: completionResults.filter(r => r.status === 'fulfilled').length,
      failed: completionResults.filter(r => r.status === 'rejected').length
    };

    logger.info('Batch processing summary:', summary);
    return summary;

  } catch (error) {
    logger.error('Batch processing failed:', error);
    throw error;
  }
}

/**
 * Example 6: Error Handling and Recovery
  */
export async function errorHandlingExample(file: File) {
  try {
    logger.info('Demonstrating error handling and recovery...');

    const uploadOptions = {
      features: [ProcessingFeature.ANALYSIS],
      priority: ProcessingPriority.NORMAL
    };

    // Try processing with automatic retry on failure
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        attempts++;
        logger.info(`Processing attempt ${attempts}/${maxAttempts}`);

        const result = await cvProcessingService.uploadCV(file, uploadOptions);

        if (result.success) {
          logger.info('Processing succeeded on attempt', attempts);
          return await monitorProcessingStatus(result.jobId);
        } else {
          throw new Error(result.error);
        }

      } catch (error) {
        logger.warn(`Attempt ${attempts} failed:`, error);

        if (attempts === maxAttempts) {
          logger.error('All attempts failed, giving up');
          throw error;
        }

        // Exponential backoff
        const delay = Math.pow(2, attempts) * 1000;
        logger.info(`Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

  } catch (error) {
    logger.error('Error handling example failed:', error);
    throw error;
  }
}

/**
 * Example 7: Performance Monitoring and Statistics
  */
export async function performanceMonitoringExample() {
  try {
    logger.info('Getting performance statistics...');

    // Get current processing statistics
    const stats = cvProcessingService.getProcessingStats();
    logger.info('Processing Statistics:', {
      totalJobs: stats.totalJobs,
      successRate: `${stats.successRate.toFixed(1)}%`,
      activeJobs: stats.activeJobs,
      cacheHitRate: `${stats.cacheHitRate.toFixed(1)}%`,
      queueLength: stats.queueLength
    });

    // Get active jobs details
    const activeJobs = cvProcessingService.getActiveJobs();
    logger.info(`Active jobs: ${activeJobs.length}`);

    activeJobs.forEach(job => {
      logger.info(`Job ${job.id}:`, {
        status: job.status,
        progress: `${job.progress}%`,
        stage: job.currentStage,
        retryCount: job.retryCount,
        duration: Date.now() - job.createdAt.getTime()
      });
    });

    return {
      stats,
      activeJobs: activeJobs.map(job => ({
        id: job.id,
        status: job.status,
        progress: job.progress
      }))
    };

  } catch (error) {
    logger.error('Performance monitoring failed:', error);
    throw error;
  }
}

/**
 * Example 8: Service Lifecycle Management
  */
export async function serviceLifecycleExample() {
  try {
    logger.info('Demonstrating service lifecycle management...');

    // Get service instance
    const service = CVProcessingService.getInstance();

    // Clear caches for fresh start
    logger.info('Clearing all caches...');
    service.clearCaches();

    // Clean up completed jobs
    logger.info('Cleaning up completed jobs...');
    const activeJobs = service.getActiveJobs();
    const completedJobs = activeJobs.filter(job =>
      [ProcessingJobStatus.COMPLETED, ProcessingJobStatus.FAILED, ProcessingJobStatus.CANCELLED].includes(job.status)
    );

    completedJobs.forEach(job => {
      logger.info(`Removing completed job: ${job.id}`);
      service.removeJob(job.id);
    });

    logger.info(`Cleaned up ${completedJobs.length} completed jobs`);

    // Show current service state
    const finalStats = service.getProcessingStats();
    logger.info('Service state after cleanup:', finalStats);

    return finalStats;

  } catch (error) {
    logger.error('Service lifecycle management failed:', error);
    throw error;
  }
}

/**
 * Helper function to monitor processing status until completion
  */
async function monitorProcessingStatus(jobId: string, pollInterval: number = 2000) {
  logger.info(`Monitoring job ${jobId}...`);

  while (true) {
    try {
      const status = await cvProcessingService.getProcessingStatus(jobId);

      logger.info(`Job ${jobId}: ${status.status} - ${status.progress}%`);

      if (status.status === ProcessingJobStatus.COMPLETED ||
          status.status === ProcessingJobStatus.FAILED ||
          status.status === ProcessingJobStatus.CANCELLED) {
        return status;
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));

    } catch (error) {
      logger.error(`Error monitoring job ${jobId}:`, error);
      throw error;
    }
  }
}

/**
 * Helper function to handle processing completion
  */
async function handleProcessingComplete(jobId: string) {
  try {
    logger.info(`Handling completion for job ${jobId}`);

    // Get final results
    const results = await cvProcessingService.getProcessingResults(jobId);
    logger.info('Final results:', results);

    // Get analysis results
    const analysis = await cvProcessingService.getAnalysisResults(jobId);
    logger.info('Analysis results:', analysis);

    // Unsubscribe from updates
    cvProcessingService.unsubscribeFromUpdates(jobId);

    return { results, analysis };

  } catch (error) {
    logger.error('Error handling completion:', error);
    throw error;
  }
}

/**
 * Usage in React Component Example
  */
export const CVProcessingReactExample = `
import React, { useState, useEffect } from 'react';
import { cvProcessingService, ProcessingJobStatus, ProcessingFeature } from '@cvplus/cv-processing';

export const CVUploadComponent = () => {
  const [file, setFile] = useState<File | null>(null);
  const [jobId, setJobId] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [results, setResults] = useState<any>(null);

  const handleFileUpload = async (selectedFile: File) => {
    setFile(selectedFile);

    try {
      const uploadOptions = {
        features: [
          ProcessingFeature.ANALYSIS,
          ProcessingFeature.ATS_OPTIMIZATION
        ],
        priority: 'normal' as const,
        onProgress: (progress: number, stage: string) => {
          setProgress(progress);
          setStatus(\`\${stage}: \${progress.toFixed(1)}%\`);
        }
      };

      const result = await cvProcessingService.uploadCV(selectedFile, uploadOptions);

      if (result.success) {
        setJobId(result.jobId);
        setStatus('Processing started...');

        // Subscribe to real-time updates
        const eventSource = cvProcessingService.subscribeToUpdates(result.jobId);
        eventSource.onmessage = (event) => {
          const data = JSON.parse(event.data);
          setStatus(data.status);
          setProgress(data.progress);

          if (data.status === ProcessingJobStatus.COMPLETED) {
            handleJobComplete(result.jobId);
          }
        };
      } else {
        setStatus(\`Error: \${result.error}\`);
      }

    } catch (error) {
      setStatus(\`Error: \${error.message}\`);
    }
  };

  const handleJobComplete = async (jobId: string) => {
    try {
      const results = await cvProcessingService.getProcessingResults(jobId);
      setResults(results);
      setStatus('Processing completed!');
      cvProcessingService.unsubscribeFromUpdates(jobId);
    } catch (error) {
      setStatus(\`Error retrieving results: \${error.message}\`);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept=".pdf,.docx,.doc,.txt"
        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
      />

      {status && <div>Status: {status}</div>}
      {progress > 0 && (
        <div>
          <progress value={progress} max={100} />
          <span>{progress.toFixed(1)}%</span>
        </div>
      )}

      {results && (
        <div>
          <h3>Results:</h3>
          <pre>{JSON.stringify(results, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};
`;

export default {
  basicCVProcessing,
  advancedProcessingWithRealTime,
  templateManagementExample,
  multipleFormatExports,
  batchProcessingExample,
  errorHandlingExample,
  performanceMonitoringExample,
  serviceLifecycleExample
};