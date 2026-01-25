/**
 * Platform Registry - Platform detection and management
 *
 * 3-Tier Detection Strategy:
 * 1. Environment variable (OLORIN_PLATFORM)
 * 2. Platform manifest file (platform.json, bayit.platform.json, etc.)
 * 3. Platform markers (specific files/directories that identify platform)
 */

import { join } from 'path';
import { existsSync, readFileSync } from 'fs';
import { execSync } from 'child_process';
import { logger } from '../utils/logger.js';
import type { PlatformManifest, PlatformInfo } from '../types/platform.js';

export class PlatformRegistry {
  private gitRoot: string | null = null;
  private platformCache: Map<string, PlatformInfo> = new Map();

  constructor() {
    this.gitRoot = this.findGitRoot();
  }

  /**
   * Find git repository root (CWD-independent)
   */
  private findGitRoot(): string | null {
    try {
      const root = execSync('git rev-parse --show-toplevel', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
      }).trim();
      return root;
    } catch (error) {
      logger.warn('Not in a git repository');
      return null;
    }
  }

  /**
   * Detect current platform using 3-tier strategy
   */
  detectPlatform(): string {
    // 1. Check environment variable override
    if (process.env.OLORIN_PLATFORM) {
      logger.debug('Platform from env var', {
        platform: process.env.OLORIN_PLATFORM,
      });
      return process.env.OLORIN_PLATFORM;
    }

    if (!this.gitRoot) {
      throw new Error('Cannot detect platform: not in a git repository');
    }

    // 2. Check for platform manifest file
    const manifestPlatform = this.detectFromManifest();
    if (manifestPlatform) {
      logger.debug('Platform from manifest', { platform: manifestPlatform });
      return manifestPlatform;
    }

    // 3. Check for platform markers
    const markerPlatform = this.detectFromMarkers();
    if (markerPlatform) {
      logger.debug('Platform from markers', { platform: markerPlatform });
      return markerPlatform;
    }

    throw new Error(
      'Cannot detect platform. Use --platform flag or set OLORIN_PLATFORM env var.'
    );
  }

  /**
   * Detect platform from manifest file
   */
  private detectFromManifest(): string | null {
    if (!this.gitRoot) return null;

    // Check for platform-specific manifest files
    const manifestFiles = [
      'bayit.platform.json',
      'cvplus.platform.json',
      'fraud.platform.json',
      'portals.platform.json',
      'platform.json',
    ];

    for (const manifestFile of manifestFiles) {
      const manifestPath = join(this.gitRoot, manifestFile);
      if (existsSync(manifestPath)) {
        try {
          const manifest = JSON.parse(
            readFileSync(manifestPath, 'utf-8')
          ) as PlatformManifest;
          return manifest.platform;
        } catch (error) {
          logger.warn(`Failed to parse manifest: ${manifestPath}`, { error });
        }
      }
    }

    return null;
  }

  /**
   * Detect platform from marker files/directories
   */
  private detectFromMarkers(): string | null {
    if (!this.gitRoot) return null;

    // Bayit+ markers
    if (
      existsSync(join(this.gitRoot, 'backend/pyproject.toml')) &&
      existsSync(join(this.gitRoot, 'mobile-app/package.json'))
    ) {
      return 'bayit';
    }

    // CV Plus markers
    if (
      existsSync(join(this.gitRoot, 'cvplus-backend')) &&
      existsSync(join(this.gitRoot, 'cvplus-web'))
    ) {
      return 'cvplus';
    }

    // Fraud Detection markers
    if (
      existsSync(join(this.gitRoot, 'fraud-backend')) &&
      existsSync(join(this.gitRoot, 'fraud-web'))
    ) {
      return 'fraud';
    }

    return null;
  }

  /**
   * Get platform information
   */
  getPlatform(platformName: string): PlatformInfo {
    // Check cache
    if (this.platformCache.has(platformName)) {
      return this.platformCache.get(platformName)!;
    }

    if (!this.gitRoot) {
      throw new Error('Not in a git repository');
    }

    // Load platform manifest
    const manifestPath = join(
      this.gitRoot,
      `${platformName}.platform.json`
    );

    if (!existsSync(manifestPath)) {
      throw new Error(
        `Platform manifest not found: ${manifestPath}\n\n` +
        `Expected file: ${platformName}.platform.json\n` +
        `Run: olorin init ${platformName}`
      );
    }

    try {
      const manifest = JSON.parse(
        readFileSync(manifestPath, 'utf-8')
      ) as PlatformManifest;

      const platformInfo: PlatformInfo = {
        name: platformName,
        rootDir: this.gitRoot,
        manifest,
        available: this.isPlatformAvailable(manifest),
      };

      // Cache platform info
      this.platformCache.set(platformName, platformInfo);

      return platformInfo;
    } catch (error) {
      throw new Error(
        `Failed to load platform manifest: ${manifestPath}\n${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Check if platform is available (all required services exist)
   */
  private isPlatformAvailable(manifest: PlatformManifest): boolean {
    if (!this.gitRoot) return false;

    // Check if at least one service directory exists
    for (const workspace of manifest.workspaces) {
      const workspacePath = join(this.gitRoot, workspace);
      if (existsSync(workspacePath)) {
        return true;
      }
    }

    return false;
  }

  /**
   * List all available platforms
   */
  listPlatforms(): string[] {
    if (!this.gitRoot) return [];

    const platforms: string[] = [];

    // Check for platform manifest files
    const manifestFiles = [
      'bayit.platform.json',
      'cvplus.platform.json',
      'fraud.platform.json',
      'portals.platform.json',
    ];

    for (const manifestFile of manifestFiles) {
      const manifestPath = join(this.gitRoot, manifestFile);
      if (existsSync(manifestPath)) {
        try {
          const manifest = JSON.parse(
            readFileSync(manifestPath, 'utf-8')
          ) as PlatformManifest;
          platforms.push(manifest.platform);
        } catch (error) {
          logger.warn(`Failed to parse manifest: ${manifestPath}`);
        }
      }
    }

    return platforms;
  }

  /**
   * Validate platform name
   */
  hasPlatform(platformName: string): boolean {
    if (!this.gitRoot) return false;

    const manifestPath = join(
      this.gitRoot,
      `${platformName}.platform.json`
    );

    return existsSync(manifestPath);
  }
}
