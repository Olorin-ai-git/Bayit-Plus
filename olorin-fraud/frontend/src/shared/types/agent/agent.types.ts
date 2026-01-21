/**
 * Agent Types
 * SINGLE SOURCE OF TRUTH for AI agent-related types
 */

import type { BaseEntity } from '../core/base.types';

export type ExecutionStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface PerformanceData {
  cpuUsage: number;
  memoryUsage: number;
  networkLatency: number;
  throughput: number;
  errorCount: number;
  warningCount: number;
}

export interface AgentMetrics extends BaseEntity {
  agentId: string;
  agentType: string;
  executionCount: number;
  averageExecutionTime: number;
  successRate: number;
  errorRate: number;
  lastExecution?: Date;
  performanceData: PerformanceData;
}

export interface AgentExecution extends BaseEntity {
  agentId: string;
  investigationId?: string;
  status: ExecutionStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  input: any;
  output?: any;
  error?: string;
}
