/**
 * Configuration utilities for Olorin CLI
 *
 * Resolves .claude directory path with fallbacks:
 * 1. CLAUDE_DIR environment variable
 * 2. Read from ~/.claude/subagents.json (agentPath)
 * 3. Default to ~/.claude
 */

import { homedir } from 'os';
import { join, dirname } from 'path';
import { existsSync, readFileSync } from 'fs';

/**
 * Resolve .claude directory path
 *
 * Priority:
 * 1. CLAUDE_DIR env var
 * 2. Extract from subagents.json
 * 3. Default ~/.claude
 */
export function resolveClaudeDir(): string {
  // 1. Try environment variable
  if (process.env.CLAUDE_DIR) {
    const path = process.env.CLAUDE_DIR;
    if (existsSync(path)) {
      return path;
    }
    console.warn(`CLAUDE_DIR=${path} does not exist, trying fallbacks...`);
  }

  // 2. Try reading from subagents.json
  const home = homedir();
  const subagentsPath = join(home, '.claude', 'subagents.json');

  if (existsSync(subagentsPath)) {
    try {
      const content = readFileSync(subagentsPath, 'utf-8');
      const config = JSON.parse(content);

      if (config.agentPath) {
        // agentPath points to agents directory, extract .claude root
        const claudeDir = dirname(config.agentPath);
        if (existsSync(claudeDir)) {
          return claudeDir;
        }
      }
    } catch (error) {
      console.warn('Failed to parse subagents.json, using default');
    }
  }

  // 3. Fall back to default
  const defaultPath = join(home, '.claude');

  if (!existsSync(defaultPath)) {
    throw new Error(`
❌ .claude directory not found

Expected locations:
1. ${process.env.CLAUDE_DIR || 'CLAUDE_DIR not set'}
2. ${subagentsPath}
3. ${defaultPath}

💡 Solutions:
- Set CLAUDE_DIR environment variable: export CLAUDE_DIR=/path/to/.claude
- Ensure ~/.claude directory exists
- Check .claude directory permissions

For more info: npm run olorin -- --help
    `.trim());
  }

  return defaultPath;
}

/**
 * Get platform configuration
 */
export interface PlatformConfig {
  platform: string;
  rootDir: string;
  services: Record<string, any>;
}

/**
 * Load platform manifest
 */
export function loadPlatformManifest(manifestPath: string): PlatformConfig {
  if (!existsSync(manifestPath)) {
    throw new Error(`Platform manifest not found: ${manifestPath}`);
  }

  try {
    const content = readFileSync(manifestPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to parse platform manifest: ${manifestPath}`);
  }
}

/**
 * Get current platform name
 *
 * Priority:
 * 1. OLORIN_PLATFORM env var
 * 2. Detect from platform.json files
 * 3. Default to 'bayit'
 */
export function getCurrentPlatform(): string {
  return process.env.OLORIN_PLATFORM || 'bayit';
}
