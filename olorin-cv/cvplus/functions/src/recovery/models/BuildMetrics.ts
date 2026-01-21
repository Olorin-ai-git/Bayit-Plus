/**
 * BuildMetrics Model - T035
 * CVPlus Level 2 Recovery System
  */

export interface BuildMetrics {
  buildId: string;
  moduleId: string;
  status: BuildStatus;
  startTime: string;
  endTime?: string;
  duration?: number;
  buildConfig: BuildConfiguration;
  compilation: CompilationMetrics;
  bundle?: BundleMetrics;
  dependencies: DependencyMetrics;
  performance: PerformanceMetrics;
  artifacts: BuildArtifact[];
  errors: BuildError[];
  warnings: BuildWarning[];
  logs: string[];
  environment: BuildEnvironment;
}

export type BuildStatus =
  | 'pending'
  | 'running'
  | 'success'
  | 'failed'
  | 'cancelled'
  | 'timeout';

export interface BuildConfiguration {
  target: 'development' | 'production' | 'test';
  clean: boolean;
  skipTests: boolean;
  sourceMaps: boolean;
  minify: boolean;
  treeShaking: boolean;
  bundler: 'tsup' | 'webpack' | 'rollup' | 'esbuild';
  outputFormat: 'esm' | 'cjs' | 'umd' | 'iife';
  typescript: TypeScriptConfig;
}

export interface TypeScriptConfig {
  version: string;
  strict: boolean;
  target: string;
  module: string;
  lib: string[];
  declaration: boolean;
  sourceMap: boolean;
}

export interface CompilationMetrics {
  typeCheckTime: number;
  emitTime: number;
  filesProcessed: number;
  filesWithErrors: number;
  filesWithWarnings: number;
  linesOfCode: number;
  typeErrors: number;
  syntaxErrors: number;
}

export interface BundleMetrics {
  totalSize: number;
  gzipSize: number;
  brotliSize?: number;
  chunks: BundleChunk[];
  treeshakingEfficiency: number;
  duplicateModules: string[];
  unusedExports: string[];
}

export interface BundleChunk {
  name: string;
  size: number;
  modules: string[];
  dependencies: string[];
  async: boolean;
}

export interface DependencyMetrics {
  total: number;
  resolved: number;
  failed: number;
  cached: number;
  external: number;
  bundled: number;
  resolutionTime: number;
  installTime?: number;
}

export interface PerformanceMetrics {
  memoryUsage: MemoryUsage;
  cpuUsage: number;
  diskIO: DiskIOMetrics;
  networkIO: NetworkIOMetrics;
  parallelization: ParallelizationMetrics;
}

export interface MemoryUsage {
  peak: number;
  average: number;
  initial: number;
  final: number;
  heapUsed: number;
  heapTotal: number;
}

export interface DiskIOMetrics {
  reads: number;
  writes: number;
  bytesRead: number;
  bytesWritten: number;
  cacheHits: number;
  cacheMisses: number;
}

export interface NetworkIOMetrics {
  requests: number;
  bytesDownloaded: number;
  bytesUploaded: number;
  averageLatency: number;
  failures: number;
}

export interface ParallelizationMetrics {
  workers: number;
  tasksParallel: number;
  tasksSequential: number;
  efficiency: number;
  loadBalance: number;
}

export interface BuildArtifact {
  path: string;
  type: 'js' | 'css' | 'dts' | 'map' | 'json' | 'html' | 'other';
  size: number;
  hash: string;
  compressed?: boolean;
  sourceMaps?: boolean;
}

export interface BuildError {
  id: string;
  severity: 'error' | 'fatal';
  message: string;
  file?: string;
  line?: number;
  column?: number;
  code?: string;
  category: 'typescript' | 'bundler' | 'dependency' | 'configuration' | 'system';
  fixable: boolean;
  suggestion?: string;
}

export interface BuildWarning {
  id: string;
  message: string;
  file?: string;
  line?: number;
  column?: number;
  code?: string;
  category: 'performance' | 'deprecation' | 'compatibility' | 'style';
  ignorable: boolean;
}

export interface BuildEnvironment {
  nodeVersion: string;
  npmVersion: string;
  platform: string;
  arch: string;
  ci: boolean;
  memory: number;
  cpu: number;
  diskSpace: number;
  environmentVariables: Record<string, string>;
}

export interface BuildComparison {
  previous?: BuildMetrics;
  current: BuildMetrics;
  improvements: BuildImprovement[];
  regressions: BuildRegression[];
  summary: ComparisonSummary;
}

export interface BuildImprovement {
  metric: string;
  previousValue: number;
  currentValue: number;
  improvementPercent: number;
  description: string;
}

export interface BuildRegression {
  metric: string;
  previousValue: number;
  currentValue: number;
  regressionPercent: number;
  description: string;
  severity: 'critical' | 'major' | 'minor';
}

export interface ComparisonSummary {
  overallTrend: 'improved' | 'unchanged' | 'regressed';
  performanceScore: number;
  qualityScore: number;
  sizeScore: number;
  recommendation: string;
}

export function createBuildMetrics(moduleId: string, buildId?: string): BuildMetrics {
  return {
    buildId: buildId || `build-${Date.now()}`,
    moduleId,
    status: 'pending',
    startTime: new Date().toISOString(),
    buildConfig: {
      target: 'development',
      clean: false,
      skipTests: false,
      sourceMaps: true,
      minify: false,
      treeShaking: false,
      bundler: 'tsup',
      outputFormat: 'esm',
      typescript: {
        version: '5.0.0',
        strict: true,
        target: 'ES2020',
        module: 'ESNext',
        lib: ['ES2020'],
        declaration: true,
        sourceMap: true
      }
    },
    compilation: {
      typeCheckTime: 0,
      emitTime: 0,
      filesProcessed: 0,
      filesWithErrors: 0,
      filesWithWarnings: 0,
      linesOfCode: 0,
      typeErrors: 0,
      syntaxErrors: 0
    },
    dependencies: {
      total: 0,
      resolved: 0,
      failed: 0,
      cached: 0,
      external: 0,
      bundled: 0,
      resolutionTime: 0
    },
    performance: {
      memoryUsage: {
        peak: 0,
        average: 0,
        initial: 0,
        final: 0,
        heapUsed: 0,
        heapTotal: 0
      },
      cpuUsage: 0,
      diskIO: {
        reads: 0,
        writes: 0,
        bytesRead: 0,
        bytesWritten: 0,
        cacheHits: 0,
        cacheMisses: 0
      },
      networkIO: {
        requests: 0,
        bytesDownloaded: 0,
        bytesUploaded: 0,
        averageLatency: 0,
        failures: 0
      },
      parallelization: {
        workers: 1,
        tasksParallel: 0,
        tasksSequential: 0,
        efficiency: 0,
        loadBalance: 0
      }
    },
    artifacts: [],
    errors: [],
    warnings: [],
    logs: [],
    environment: {
      nodeVersion: process.version,
      npmVersion: '9.0.0',
      platform: process.platform,
      arch: process.arch,
      ci: false,
      memory: 0,
      cpu: 0,
      diskSpace: 0,
      environmentVariables: {}
    }
  };
}