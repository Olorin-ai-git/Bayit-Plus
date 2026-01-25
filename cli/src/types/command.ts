/**
 * Type definitions for .claude commands
 */

export interface CommandManifest {
  name: string;
  description: string;
  script: string;
  documentation?: string;
  platform?: string[];
  args?: string[];
}

export interface CommandsConfig {
  commands: Record<string, {
    description: string;
    script: string;
    documentation?: string;
    platform?: string[];
  }>;
}
