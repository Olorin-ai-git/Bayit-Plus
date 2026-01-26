/**
 * Deploy Command - Platform Deployment
 */

import { Command } from 'commander';
import { spawn } from 'child_process';
import path from 'path';
import { logger } from '../utils/logger.js';

export function registerDeployCommand(program: Command): void {
  const deploy = program
    .command('deploy')
    .description('Deploy Bayit+ platforms to staging or production');

  deploy
    .command('staging')
    .description('Deploy to staging environment')
    .action(async () => {
      logger.info('Deploying to staging...');
      await runDeployScript('deploy-staging.sh');
    });

  deploy
    .command('production')
    .description('Deploy to production environment')
    .action(async () => {
      logger.info('Deploying to production...');
      await runDeployScript('deploy-all-platforms.sh');
    });

  deploy
    .command('phase <phaseNumber>')
    .description('Deploy specific phase (0, 1, 2, etc.)')
    .action(async (phaseNumber: string) => {
      logger.info(`Deploying phase ${phaseNumber}...`);
      await runDeployScript('deploy-phase.sh', [phaseNumber]);
    });

  // Default deploy action - show help
  deploy.action(() => {
    logger.info('Available deployment commands:');
    console.log('  deploy staging           Deploy to staging environment');
    console.log('  deploy production        Deploy to production environment');
    console.log('  deploy phase <number>    Deploy specific phase');
    console.log('');
    console.log('Examples:');
    console.log('  olorin bayit deploy staging');
    console.log('  olorin bayit deploy production');
    console.log('  olorin bayit deploy phase 1');
  });
}

async function runDeployScript(scriptName: string, args: string[] = []): Promise<void> {
  const projectRoot = path.resolve(process.cwd(), '../..');
  const scriptPath = path.join(projectRoot, 'scripts', 'deployment', scriptName);

  return new Promise((resolve, reject) => {
    const child = spawn('bash', [scriptPath, ...args], {
      stdio: 'inherit',
      cwd: projectRoot,
    });

    child.on('error', (error) => {
      logger.error('Failed to execute deployment script', { error });
      reject(error);
    });

    child.on('close', (code) => {
      if (code === 0) {
        logger.success('Deployment completed');
        resolve();
      } else {
        logger.error(`Deployment failed with code ${code}`);
        reject(new Error(`Deployment failed with code ${code}`));
      }
    });
  });
}
