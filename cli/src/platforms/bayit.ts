/**
 * Bayit+ Platform Adapter
 *
 * Provides platform-specific functionality for Bayit+ Media platform
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../utils/logger.js';
import type { ServiceConfig } from '../types/platform.js';

const execAsync = promisify(exec);

export class BayitPlatform {
  /**
   * Get platform services
   */
  static getServices(): Record<string, ServiceConfig> {
    return {
      backend: {
        type: 'python',
        runtime: 'poetry',
        port: process.env.BACKEND_PORT || 8090,
        command: 'poetry run uvicorn app.main:app --reload',
        healthCheck: `http://localhost:${process.env.BACKEND_PORT || 8090}/health`,
      },
      web: {
        type: 'vite-react',
        port: process.env.WEB_PORT || 3200,
        command: 'turbo run dev --filter=@olorin/bayit-web',
        healthCheck: `http://localhost:${process.env.WEB_PORT || 3200}`,
      },
      mobile: {
        type: 'react-native',
        port: 8081,
        command: 'turbo run dev --filter=BayitPlusMobile',
        dependsOn: ['backend'],
      },
      tvos: {
        type: 'react-native-tvos',
        port: 8082,
        command: 'turbo run dev --filter=BayitPlusTVOS',
        dependsOn: ['backend'],
      },
      'tv-app': {
        type: 'react-native-tv',
        port: 8083,
        command: 'turbo run dev --filter=BayitPlusTV',
        dependsOn: ['backend'],
      },
      partner: {
        type: 'react',
        port: process.env.PARTNER_PORT || 3500,
        command: 'turbo run dev --filter=bayit-plus-partner-portal',
        healthCheck: `http://localhost:${process.env.PARTNER_PORT || 3500}`,
        dependsOn: ['backend'],
      },
    };
  }

  /**
   * Start a specific service
   */
  static async startService(
    serviceName: string,
    options: { verbose?: boolean } = {}
  ): Promise<void> {
    const services = this.getServices();
    const service = services[serviceName];

    if (!service) {
      throw new Error(
        `Unknown service: ${serviceName}\n` +
        `Available services: ${Object.keys(services).join(', ')}`
      );
    }

    logger.info(`Starting ${serviceName}...`, { service });

    try {
      const { stdout, stderr } = await execAsync(service.command!, {
        cwd: process.cwd(),
        env: {
          ...process.env,
          FORCE_COLOR: '1',
        },
      });

      if (options.verbose && stdout) {
        logger.debug(stdout);
      }

      if (stderr) {
        logger.warn(stderr);
      }

      logger.info(`${serviceName} started successfully`);
    } catch (error) {
      logger.error(`Failed to start ${serviceName}`, { error });
      throw error;
    }
  }

  /**
   * Stop a specific service
   */
  static async stopService(serviceName: string): Promise<void> {
    const services = this.getServices();
    const service = services[serviceName];

    if (!service) {
      throw new Error(`Unknown service: ${serviceName}`);
    }

    logger.info(`Stopping ${serviceName}...`);

    try {
      // Kill processes by port
      if (service.port) {
        await execAsync(`lsof -ti:${service.port} | xargs kill -9 || true`);
      }

      logger.info(`${serviceName} stopped successfully`);
    } catch (error) {
      logger.error(`Failed to stop ${serviceName}`, { error });
      throw error;
    }
  }

  /**
   * Check service health
   */
  static async checkServiceHealth(serviceName: string): Promise<boolean> {
    const services = this.getServices();
    const service = services[serviceName];

    if (!service || !service.healthCheck) {
      return false;
    }

    try {
      await execAsync(`curl -s -o /dev/null -w "%{http_code}" ${service.healthCheck}`);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get service status
   */
  static async getServiceStatus(
    serviceName: string
  ): Promise<'running' | 'stopped'> {
    const services = this.getServices();
    const service = services[serviceName];

    if (!service || !service.port) {
      return 'stopped';
    }

    try {
      const { stdout } = await execAsync(
        `lsof -ti:${service.port}`
      );

      return stdout.trim() ? 'running' : 'stopped';
    } catch (error) {
      return 'stopped';
    }
  }
}
