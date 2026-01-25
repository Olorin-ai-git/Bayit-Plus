/**
 * Stop Command - Stop platform services
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { PlatformRegistry } from '../registry/platform-registry.js';
import { BayitPlatform } from '../platforms/bayit.js';
import { logger } from '../utils/logger.js';

/**
 * Stop services for Bayit+ platform
 */
async function stopBayitServices(
  services: string[]
): Promise<void> {
  const spinner = ora('Stopping Bayit+ services...').start();

  try {
    const allServices = BayitPlatform.getServices();
    const servicesToStop = services.length > 0
      ? services
      : Object.keys(allServices);

    spinner.text = `Stopping ${servicesToStop.length} service(s)...`;

    for (const serviceName of servicesToStop) {
      spinner.text = `Stopping ${serviceName}...`;

      try {
        await BayitPlatform.stopService(serviceName);
        spinner.succeed(chalk.green(`✓ ${serviceName} stopped`));
        spinner.start();
      } catch (error) {
        spinner.fail(chalk.red(`✗ ${serviceName} failed to stop`));
        logger.error(`Failed to stop ${serviceName}`, { error });
        spinner.start();
      }
    }

    spinner.succeed(chalk.green('All services stopped successfully'));
  } catch (error) {
    spinner.fail(chalk.red('Failed to stop services'));
    throw error;
  }
}

/**
 * Stop command handler
 */
async function handleStop(
  platform: string,
  services: string[],
  options: {
    all?: boolean;
    json?: boolean;
  }
): Promise<void> {
  try {
    const registry = new PlatformRegistry();

    // Detect platform if not specified
    if (!platform || platform === 'bayit') {
      platform = registry.detectPlatform();
    }

    logger.info('Stopping platform', { platform, services });

    // Stop based on platform
    if (platform === 'bayit') {
      await stopBayitServices(services);
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
          status: 'stopped',
        }, null, 2)
      );
    }
  } catch (error) {
    logger.error('Failed to stop services', { error });
    process.exit(1);
  }
}

/**
 * Register stop command
 */
export function registerStopCommand(program: Command): void {
  program
    .command('stop [platform] [services...]')
    .description('Stop running services for specified platform')
    .option('-a, --all', 'Stop all platforms')
    .option('--json', 'Output in JSON format')
    .action(handleStop);
}
