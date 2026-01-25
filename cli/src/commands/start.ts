/**
 * Start Command - Start platform services
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { PlatformRegistry } from '../registry/platform-registry.js';
import { BayitPlatform } from '../platforms/bayit.js';
import { logger } from '../utils/logger.js';

/**
 * Start services for Bayit+ platform
 */
async function startBayitServices(
  services: string[],
  options: { verbose?: boolean }
): Promise<void> {
  const spinner = ora('Starting Bayit+ services...').start();

  try {
    const allServices = BayitPlatform.getServices();
    const servicesToStart = services.length > 0
      ? services
      : Object.keys(allServices);

    spinner.text = `Starting ${servicesToStart.length} service(s)...`;

    for (const serviceName of servicesToStart) {
      spinner.text = `Starting ${serviceName}...`;

      try {
        await BayitPlatform.startService(serviceName, options);
        spinner.succeed(chalk.green(`✓ ${serviceName} started`));
        spinner.start();
      } catch (error) {
        spinner.fail(chalk.red(`✗ ${serviceName} failed`));
        logger.error(`Failed to start ${serviceName}`, { error });
        spinner.start();
      }
    }

    spinner.succeed(chalk.green('All services started successfully'));
  } catch (error) {
    spinner.fail(chalk.red('Failed to start services'));
    throw error;
  }
}

/**
 * Start command handler
 */
async function handleStart(
  platform: string,
  services: string[],
  options: {
    all?: boolean;
    verbose?: boolean;
    json?: boolean;
  }
): Promise<void> {
  try {
    const registry = new PlatformRegistry();

    // Detect platform if not specified
    if (!platform || platform === 'bayit') {
      platform = registry.detectPlatform();
    }

    logger.info('Starting platform', { platform, services });

    // Start based on platform
    if (platform === 'bayit') {
      await startBayitServices(services, options);
    } else {
      logger.error(`Platform ${platform} not yet supported`);
      logger.info('Currently supported platforms: bayit');
      process.exit(1);
    }

    if (options.json) {
      console.log(
        JSON.stringify({
          platform,
          services: services.length > 0 ? services : 'all',
          status: 'started',
        }, null, 2)
      );
    }
  } catch (error) {
    logger.error('Failed to start services', { error });
    process.exit(1);
  }
}

/**
 * Register start command
 */
export function registerStartCommand(program: Command): void {
  program
    .command('start [platform] [services...]')
    .description('Start development servers for specified platform')
    .option('-a, --all', 'Start all platforms')
    .option('-v, --verbose', 'Verbose output')
    .option('--json', 'Output in JSON format')
    .action(handleStart);
}
