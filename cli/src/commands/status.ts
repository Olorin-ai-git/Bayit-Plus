/**
 * Status Command - Check service status
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { PlatformRegistry } from '../registry/platform-registry.js';
import { BayitPlatform } from '../platforms/bayit.js';
import { logger } from '../utils/logger.js';

interface ServiceStatus {
  name: string;
  status: 'running' | 'stopped';
  port?: number | string;
  healthy?: boolean;
}

/**
 * Get status for Bayit+ services
 */
async function getBayitServicesStatus(): Promise<ServiceStatus[]> {
  const allServices = BayitPlatform.getServices();
  const statuses: ServiceStatus[] = [];

  for (const [name, config] of Object.entries(allServices)) {
    const status = await BayitPlatform.getServiceStatus(name);
    const healthy = status === 'running'
      ? await BayitPlatform.checkServiceHealth(name)
      : false;

    statuses.push({
      name,
      status,
      port: config.port,
      healthy,
    });
  }

  return statuses;
}

/**
 * Format status table for display
 */
function formatStatusTable(statuses: ServiceStatus[]): string {
  const lines: string[] = [];

  lines.push(chalk.bold.cyan('\nService Status\n'));
  lines.push(chalk.gray('─'.repeat(80)));

  for (const service of statuses) {
    const statusIcon = service.status === 'running'
      ? chalk.green('●')
      : chalk.red('○');

    const healthIcon = service.healthy
      ? chalk.green('✓')
      : chalk.gray('–');

    const nameCol = service.name.padEnd(15);
    const statusCol = service.status.padEnd(10);
    const portCol = service.port ? String(service.port).padEnd(6) : '–'.padEnd(6);

    lines.push(
      `  ${statusIcon} ${chalk.white(nameCol)} ${chalk.cyan(statusCol)} ${chalk.gray(portCol)} ${healthIcon}`
    );
  }

  lines.push(chalk.gray('\n' + '─'.repeat(80)));

  const runningCount = statuses.filter(s => s.status === 'running').length;
  const healthyCount = statuses.filter(s => s.healthy).length;

  lines.push(
    chalk.bold(
      `\nRunning: ${chalk.green(runningCount)}/${statuses.length}  ` +
      `Healthy: ${chalk.green(healthyCount)}/${runningCount || 0}`
    )
  );

  return lines.join('\n');
}

/**
 * Status command handler
 */
async function handleStatus(
  platform: string,
  options: {
    json?: boolean;
  }
): Promise<void> {
  try {
    const registry = new PlatformRegistry();

    // Detect platform if not specified
    if (!platform) {
      try {
        platform = registry.detectPlatform();
      } catch (error) {
        logger.warn('Failed to auto-detect platform, using bayit as default');
        platform = 'bayit';
      }
    }

    logger.debug('Checking platform status', { platform });

    // Get status based on platform
    let statuses: ServiceStatus[] = [];

    if (platform === 'bayit') {
      statuses = await getBayitServicesStatus();
    } else {
      logger.error(`Platform ${platform} not yet supported`);
      logger.info('Currently supported platforms: bayit');
      process.exit(1);
    }

    // Output format
    if (options.json) {
      console.log(JSON.stringify({ platform, services: statuses }, null, 2));
    } else {
      console.log(formatStatusTable(statuses));
    }
  } catch (error) {
    logger.error('Failed to check status', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
}

/**
 * Register status command
 */
export function registerStatusCommand(program: Command): void {
  program
    .command('status [platform]')
    .description('Check status of platform services')
    .option('--json', 'Output in JSON format')
    .action(handleStatus);
}
