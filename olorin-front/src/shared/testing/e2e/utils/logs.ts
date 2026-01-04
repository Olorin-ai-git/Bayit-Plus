import { TestLogger } from '../../testing/utils/test-logger';
import { getInvestigationLogs } from './api';
import { ParsedInvestigationLogs, InvestigationLogs } from './types';
import { parseLogs, validateLogSequence, correlateLogsWithFrontend } from './log-parser';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Configuration for log fetching strategy
 */
interface LogFetchConfig {
  method: 'http' | 'shell' | 'both';
  cmd?: string;
  logger?: TestLogger;
  timeoutMs?: number;
}

/**
 * Execute a shell command to fetch logs
 * Safely replaces {investigationId} placeholder to prevent injection
 */
async function executeLogFetchCommand(
  cmd: string,
  investigationId: string,
  logger?: TestLogger,
  timeoutMs: number = 10000
): Promise<string> {
  logger?.debug('Executing shell command for logs', { investigationId });

  if (!cmd.includes('{investigationId}')) {
    throw new Error(
      'LOG_FETCH_CMD must contain {investigationId} placeholder for safe substitution'
    );
  }

  // Validate investigation ID format BEFORE substitution (security measure)
  const idPattern = /^[a-zA-Z0-9_-]{1,64}$/;
  if (!idPattern.test(investigationId)) {
    throw new Error(
      `Invalid investigation ID format. Must be 1-64 alphanumeric, dash, or underscore characters. Got: ${investigationId}`
    );
  }

  const finalCmd = cmd.replace('{investigationId}', investigationId);

  try {
    const { stdout, stderr } = await execAsync(finalCmd, {
      timeout: timeoutMs,
      maxBuffer: 10 * 1024 * 1024
    });

    if (stderr) {
      logger?.warn('Shell command stderr', { stderr: stderr.substring(0, 500) });
    }

    logger?.debug('Shell command executed successfully', {
      outputSize: stdout.length,
    });
    return stdout;
  } catch (error) {
    const errorMsg = String(error);
    logger?.error('Shell command execution failed', {
      cmd: cmd.substring(0, 100),
      error: errorMsg.substring(0, 200),
    });
    throw new Error(`Failed to fetch logs via shell: ${errorMsg}`);
  }
}

export class E2ETestLogger extends TestLogger {
  constructor(verboseMode: boolean = false) {
    super(verboseMode);
  }

  async captureBackendLogs(
    backendBaseUrl: string,
    investigationId: string,
    config?: LogFetchConfig
  ): Promise<ParsedInvestigationLogs> {
    const logConfig = config || { method: 'http' };
    this.debug('Capturing backend logs', {
      investigationId,
      backendBaseUrl,
      method: logConfig.method,
    });

    let rawLogs: InvestigationLogs | null = null;
    let fetchError: Error | null = null;

    // Try HTTP first if method is 'http' or 'both'
    if (logConfig.method === 'http' || logConfig.method === 'both') {
      try {
        rawLogs = await getInvestigationLogs(
          { backendBaseUrl },
          investigationId,
          { logger: this }
        );
      } catch (error) {
        fetchError = error as Error;
        if (logConfig.method === 'http') {
          throw fetchError;
        }
        this.warn('HTTP log fetch failed, attempting shell fallback', {
          error: String(error).substring(0, 100),
        });
      }
    }

    // Try shell if method is 'shell' or 'both' (and HTTP failed)
    if (!rawLogs && (logConfig.method === 'shell' || logConfig.method === 'both')) {
      if (!logConfig.cmd) {
        throw new Error('PLAYWRIGHT_LOG_FETCH_CMD must be specified for shell log fetching');
      }

      try {
        const shellOutput = await executeLogFetchCommand(
          logConfig.cmd,
          investigationId,
          this,
          logConfig.timeoutMs || 10000
        );

        try {
          rawLogs = JSON.parse(shellOutput);
        } catch (parseError) {
          this.warn('Failed to parse shell output as JSON, treating as raw logs', {
            outputSize: shellOutput.length,
          });
          rawLogs = { logs: shellOutput.split('\n') } as InvestigationLogs;
        }
      } catch (error) {
        if (logConfig.method === 'shell') {
          throw error;
        }
        this.error('Both HTTP and shell log fetch failed', {
          error: String(error).substring(0, 100),
        });
        throw new Error('Failed to fetch logs via HTTP or shell');
      }
    }

    if (!rawLogs) {
      throw new Error('Failed to fetch logs from any available source');
    }

    const parsed = parseLogs(rawLogs);
    this.success('Backend logs captured and parsed', {
      investigationId,
      llmCount: parsed.llmInteractions.length,
      toolCount: parsed.toolExecutions.length,
      decisionCount: parsed.agentDecisions.length,
      errorCount: parsed.errors.length,
    });

    return parsed;
  }


  async validateBackendLogSequence(logs: ParsedInvestigationLogs): Promise<{
    valid: boolean;
    violations: string[];
  }> {
    const result = validateLogSequence(logs.rawLogs);
    if (result.valid) {
      this.success('Backend log sequence valid', { totalEvents: logs.rawLogs.logs?.length });
    } else {
      this.warn('Backend log sequence violations', { violations: result.violations });
    }
    return result;
  }

  correlateLogsWithFrontend(
    frontendEntries: Array<{ timestamp: string; message: string }>,
    backendLogs: ParsedInvestigationLogs,
    investigationId: string
  ): { matched: number; unmatched: { source: string; count: number }[] } {
    const result = correlateLogsWithFrontend(frontendEntries, backendLogs.rawLogs, investigationId);
    this.debug('Frontend-backend correlation complete', {
      investigationId,
      matched: result.matched,
    });
    return result;
  }

  generateFullReport(): {
    frontend: Array<{ timestamp: string; level: string; message: string }>;
    backend: InvestigationLogs | null;
    summary: {
      totalFrontendEvents: number;
      totalBackendEvents: number;
      testDuration?: string;
    };
  } {
    const entries = this.getEntries();
    const frontend = entries.map((e) => ({
      timestamp: e.timestamp,
      level: e.level,
      message: e.message,
    }));

    return {
      frontend,
      backend: null,
      summary: {
        totalFrontendEvents: frontend.length,
        totalBackendEvents: 0,
      },
    };
  }
}
