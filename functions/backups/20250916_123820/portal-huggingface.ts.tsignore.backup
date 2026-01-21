// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts/**
 * Portal HuggingFace Deployment Types
 * 
 * HuggingFace Spaces deployment configuration types for portal hosting.
 * Extracted from portal.ts to maintain <200 line compliance.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

/**
 * HuggingFace Spaces deployment configuration
 * Contains all settings for deploying to HuggingFace Spaces
 */
export interface HuggingFaceSpaceConfig {
  /** Generated space name */
  spaceName: string;
  
  /** Space visibility setting */
  visibility: HuggingFaceVisibility;
  
  /** SDK type for the space */
  sdk: HuggingFaceSDK;
  
  /** Hardware configuration */
  hardware: HuggingFaceHardware;
  
  /** Space template to use */
  template: string;
  
  /** Repository configuration */
  repository: RepositoryConfig;
  
  /** Environment variables */
  environmentVariables: Record<string, string>;
  
  /** Deployment metadata */
  deployment: DeploymentMetadata;
}

/**
 * HuggingFace visibility options
 */
export enum HuggingFaceVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private'
}

/**
 * HuggingFace SDK options
 */
export enum HuggingFaceSDK {
  GRADIO = 'gradio',
  STREAMLIT = 'streamlit',
  DOCKER = 'docker',
  STATIC = 'static'
}

/**
 * HuggingFace hardware options
 */
export enum HuggingFaceHardware {
  CPU_BASIC = 'cpu-basic',
  CPU_UPGRADE = 'cpu-upgrade',
  GPU_BASIC = 'gpu-basic',
  GPU_UPGRADE = 'gpu-upgrade'
}

/**
 * Repository configuration for HuggingFace deployment
 */
export interface RepositoryConfig {
  /** Repository name */
  name: string;
  
  /** Repository description */
  description: string;
  
  /** Git configuration */
  git: {
    branch: string;
    commitMessage: string;
  };
  
  /** File structure */
  files: RepositoryFile[];
  
  /** Build configuration */
  build: BuildConfig;
}

/**
 * Repository file structure
 */
export interface RepositoryFile {
  /** File path */
  path: string;
  
  /** File content or reference */
  content: string | Buffer;
  
  /** File type */
  type: FileType;
  
  /** Whether file is required */
  required: boolean;
}

/**
 * File types
 */
export enum FileType {
  JAVASCRIPT = 'javascript',
  TYPESCRIPT = 'typescript',
  HTML = 'html',
  CSS = 'css',
  JSON = 'json',
  MARKDOWN = 'markdown',
  IMAGE = 'image',
  BINARY = 'binary',
  CONFIG = 'config'
}

/**
 * Build configuration for deployment
 */
export interface BuildConfig {
  /** Build command */
  command: string;
  
  /** Build directory */
  outputDir: string;
  
  /** Environment variables */
  env: Record<string, string>;
  
  /** Dependencies */
  dependencies: BuildDependency[];
  
  /** Build steps */
  steps: BuildStep[];
}

/**
 * Build dependency definition
 */
export interface BuildDependency {
  /** Package name */
  name: string;
  
  /** Package version */
  version: string;
  
  /** Dependency type */
  type: 'npm' | 'pip' | 'apt' | 'system';
  
  /** Whether dependency is required */
  required: boolean;
}

/**
 * Build step definition
 */
export interface BuildStep {
  /** Step name */
  name: string;
  
  /** Command to execute */
  command: string;
  
  /** Working directory */
  workingDir?: string;
  
  /** Environment variables for this step */
  env?: Record<string, string>;
  
  /** Whether step is required */
  required: boolean;
}

/**
 * Deployment metadata
 */
export interface DeploymentMetadata {
  /** Deployment ID */
  deploymentId: string;
  
  /** Deployment timestamp */
  deployedAt: Date;
  
  /** Deployment status */
  status: DeploymentStatus;
  
  /** Build logs */
  buildLogs: string[];
  
  /** Deployment URL */
  url?: string;
  
  /** Error information */
  error?: DeploymentError;
  
  /** Resource usage */
  resources: ResourceUsage;
}

/**
 * Deployment status
 */
export enum DeploymentStatus {
  PENDING = 'pending',
  BUILDING = 'building',
  DEPLOYING = 'deploying',
  RUNNING = 'running',
  FAILED = 'failed',
  STOPPED = 'stopped'
}

/**
 * Deployment error information
 */
export interface DeploymentError {
  /** Error code */
  code: string;
  
  /** Error message */
  message: string;
  
  /** Error details */
  details: any;
  
  /** Timestamp */
  timestamp: Date;
}

/**
 * Resource usage tracking
 */
export interface ResourceUsage {
  /** CPU usage percentage */
  cpu: number;
  
  /** Memory usage in MB */
  memory: number;
  
  /** Storage usage in MB */
  storage: number;
  
  /** Network bandwidth in MB */
  bandwidth: number;
  
  /** Request count */
  requests: number;
}