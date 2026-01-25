/**
 * Type definitions for platform management
 */

export interface ServiceConfig {
  type: string;
  runtime?: string;
  port?: string | number;
  command?: string;
  healthCheck?: string;
  dependsOn?: string[];
}

export interface PlatformManifest {
  platform: string;
  version: string;
  workspaces: string[];
  services: Record<string, ServiceConfig>;
  infrastructure?: {
    database?: string;
    cache?: string;
    storage?: string;
  };
}

export interface PlatformInfo {
  name: string;
  rootDir: string;
  manifest: PlatformManifest;
  available: boolean;
}
