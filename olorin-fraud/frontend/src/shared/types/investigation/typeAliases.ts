/**
 * Type Aliases for Investigation
 * Feature: 007-progress-wizard-page
 *
 * Convenient type aliases for common investigation types.
 */

export type AgentType = 'device' | 'location' | 'logs' | 'network' | 'labels' | 'risk';
export type ToolStatus = 'queued' | 'running' | 'completed' | 'failed' | 'skipped';
export type AgentStatusType = 'pending' | 'running' | 'completed' | 'failed';
export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';
