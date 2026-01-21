/**
 * DependencyInfo Model - T034
 * CVPlus Level 2 Recovery System
  */

export interface DependencyInfo {
  dependencyId: string;
  name: string;
  version: string;
  type: DependencyType;
  status: DependencyStatus;
  source: DependencySource;
  moduleId: string;
  required: boolean;
  resolved: boolean;
  installedVersion?: string;
  requiredVersion: string;
  conflicts: DependencyConflict[];
  security: SecurityInfo;
  metadata: DependencyMetadata;
}

export type DependencyType =
  | 'production'
  | 'development'
  | 'peer'
  | 'optional'
  | 'bundled';

export type DependencyStatus =
  | 'resolved'
  | 'missing'
  | 'version-mismatch'
  | 'circular'
  | 'incompatible'
  | 'deprecated'
  | 'vulnerable';

export type DependencySource =
  | 'npm'
  | 'local'
  | 'git'
  | 'file'
  | 'workspace';

export interface DependencyConflict {
  conflictId: string;
  type: 'version' | 'peer' | 'circular' | 'incompatible';
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  affectedModules: string[];
  resolution?: string;
}

export interface SecurityInfo {
  vulnerabilities: SecurityVulnerability[];
  auditScore: number;
  lastAuditDate: string;
  trusted: boolean;
}

export interface SecurityVulnerability {
  id: string;
  severity: 'critical' | 'high' | 'moderate' | 'low';
  title: string;
  description: string;
  affectedVersions: string;
  patchedVersions?: string;
  cwe?: string[];
  cvss?: number;
}

export interface DependencyMetadata {
  size: number;
  license: string;
  repository?: string;
  homepage?: string;
  maintainers: string[];
  lastUpdate: string;
  downloadCount?: number;
  dependents: number;
}

export interface DependencyGraph {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  rootModules: string[];
  circularDependencies: CircularDependency[];
}

export interface DependencyNode {
  nodeId: string;
  moduleId: string;
  dependencies: string[];
  level: number;
  critical: boolean;
}

export interface DependencyEdge {
  from: string;
  to: string;
  type: DependencyType;
  weight: number;
}

export interface CircularDependency {
  cycle: string[];
  severity: 'critical' | 'warning';
  impact: string[];
}

export function createDependencyInfo(
  name: string,
  version: string,
  moduleId: string,
  type: DependencyType = 'production'
): DependencyInfo {
  return {
    dependencyId: `${moduleId}:${name}`,
    name,
    version,
    type,
    status: 'resolved',
    source: 'npm',
    moduleId,
    required: true,
    resolved: true,
    requiredVersion: version,
    conflicts: [],
    security: {
      vulnerabilities: [],
      auditScore: 100,
      lastAuditDate: new Date().toISOString(),
      trusted: true
    },
    metadata: {
      size: 0,
      license: 'Unknown',
      maintainers: [],
      lastUpdate: new Date().toISOString(),
      dependents: 0
    }
  };
}