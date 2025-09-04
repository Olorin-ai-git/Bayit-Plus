# WebSocket Integration Guide: Autonomous Mode

## Overview

This guide explains how to integrate with the OLORIN investigation platform's autonomous mode WebSocket API. Autonomous mode provides real-time updates throughout the fraud investigation process via WebSocket messages.

## Quick Start

### 1. Start Autonomous Investigation

```javascript
// Start autonomous investigation
const response = await fetch('/v1/agent/start/{entity_id}', {
  method: 'POST',
  headers: {
    'Authorization': 'Olorin_APIKey olorin_apikey=your_api_key,olorin_apikey_version=1.0',
    'Content-Type': 'application/json',
    'olorin_experience_id': 'your_experience_id',
    'olorin_originating_assetalias': 'your_asset_alias'
  },
  body: new URLSearchParams({
    entity_type: 'user_id', // or 'device_id'
    autonomous_mode: 'true',
    websocket_updates: 'true',
    parallel: 'true', // or 'false' for sequential
    investigation_id: 'your_investigation_id' // optional, will be generated if not provided
  })
});

const result = await response.json();
const investigationData = JSON.parse(result.agentOutput.plainText);
const investigationId = investigationData.investigation_id;
```

### 2. Connect to WebSocket

```javascript
const ws = new WebSocket(`ws://localhost:8090/ws/${investigationId}?parallel=${parallel}`);

ws.onopen = function(event) {
    console.log('WebSocket connection established');
};

ws.onmessage = function(event) {
    const message = JSON.parse(event.data);
    handleWebSocketMessage(message);
};

ws.onclose = function(event) {
    console.log('WebSocket connection closed');
};

ws.onerror = function(error) {
    console.error('WebSocket error:', error);
};
```

## Message Types and Structure

All WebSocket messages follow this base structure:

```typescript
interface BaseWebSocketMessage {
  type: string;
  message: string;
  timestamp: number;
  [key: string]: any; // Additional fields based on message type
}
```

### Investigation Lifecycle Messages

#### 1. Investigation Started
```json
{
  "type": "investigation_started",
  "message": "Starting autonomous investigation for user_id 4621097846089147992",
  "timestamp": 1640995200.123,
  "entity_id": "4621097846089147992",
  "entity_type": "user_id",
  "parallel_mode": true,
  "total_agents": 5
}
```

#### 2. Agent Started
```json
{
  "type": "agent_started", 
  "message": "Agent Device started autonomous investigation",
  "timestamp": 1640995201.456,
  "agent_name": "Device",
  "entity_id": "4621097846089147992",
  "entity_type": "user_id"
}
```

#### 3. Agent Progress
```json
{
  "type": "agent_thinking",
  "message": "Agent Device making autonomous investigation decisions", 
  "timestamp": 1640995202.789,
  "agent_name": "Device",
  "stage": "decision_making"
}
```

#### 4. Tool Execution
```json
{
  "type": "tool_execution",
  "message": "Agent Device executing tool: identity_info_tool",
  "timestamp": 1640995203.012,
  "agent_name": "Device", 
  "tool_name": "identity_info_tool",
  "tool_input": {
    "user_id": "4621097846089147992"
  }
}
```

#### 5. Agent Risk Assessment
```json
{
  "type": "agent_risk_assessment",
  "message": "Agent Device completed risk assessment",
  "timestamp": 1640995204.345,
  "agent_name": "Device",
  "risk_score": 0.0,
  "confidence": 0.0,
  "summary": "No device-related risk factors identified",
  "thoughts": "Analysis of device data shows normal usage patterns"
}
```

#### 6. Agent Completed
```json
{
  "type": "agent_completed",
  "message": "Agent Device completed autonomous investigation", 
  "timestamp": 1640995205.678,
  "agent_name": "Device",
  "success": true,
  "execution_time": 12.5,
  "tools_used": 2,
  "errors": 0
}
```

#### 7. Investigation Progress
```json
{
  "type": "investigation_progress",
  "message": "Agent Device completed (1/5)",
  "timestamp": 1640995206.901,
  "completed_agents": 1,
  "total_agents": 5,
  "progress_percentage": 20.0,
  "current_agent": "Location"
}
```

#### 8. Investigation Completed
```json
{
  "type": "investigation_completed", 
  "message": "Autonomous investigation completed for user_id 4621097846089147992",
  "timestamp": 1640995300.234,
  "isCompletion": true,
  "summary": {
    "overall_risk_score": 0.02,
    "successful_agents": 5,
    "total_agents": 5,
    "execution_time": 25.25,
    "parallel_mode": true
  }
}
```

### Error Messages

#### Investigation Error
```json
{
  "type": "error",
  "message": "Agent Network encountered an error",
  "timestamp": 1640995250.567,
  "agent_name": "Network",
  "error": "Connection timeout to external service",
  "error_code": "TIMEOUT_ERROR"
}
```

## Frontend Implementation Examples

### React Hook Implementation

```typescript
import { useState, useEffect, useRef } from 'react';

interface WebSocketMessage {
  type: string;
  message: string;
  timestamp: number;
  [key: string]: any;
}

interface InvestigationProgress {
  completedAgents: number;
  totalAgents: number;
  progressPercentage: number;
  currentAgent?: string;
  isCompleted: boolean;
  overallRiskScore?: number;
}

export const useAutonomousInvestigation = (investigationId: string, parallel: boolean = true) => {
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const [progress, setProgress] = useState<InvestigationProgress>({
    completedAgents: 0,
    totalAgents: 5,
    progressPercentage: 0,
    isCompleted: false
  });
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!investigationId) return;

    const wsUrl = `ws://localhost:8090/ws/${investigationId}?parallel=${parallel}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      setConnectionStatus('connected');
    };

    ws.onmessage = (event) => {
      const message: WebSocketMessage = JSON.parse(event.data);
      
      setMessages(prev => [...prev, message]);
      
      // Update progress based on message type
      switch (message.type) {
        case 'investigation_progress':
          setProgress(prev => ({
            ...prev,
            completedAgents: message.completed_agents || prev.completedAgents,
            totalAgents: message.total_agents || prev.totalAgents,
            progressPercentage: message.progress_percentage || prev.progressPercentage,
            currentAgent: message.current_agent
          }));
          break;
          
        case 'investigation_completed':
          setProgress(prev => ({
            ...prev,
            isCompleted: true,
            progressPercentage: 100,
            overallRiskScore: message.summary?.overall_risk_score
          }));
          break;
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setConnectionStatus('disconnected');
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnectionStatus('error');
    };

    return () => {
      ws.close();
    };
  }, [investigationId, parallel]);

  return {
    messages,
    progress,
    connectionStatus,
    disconnect: () => wsRef.current?.close()
  };
};
```

## Message Processing Best Practices

### 1. Message Filtering and Categorization

```typescript
const categorizeMessages = (messages: WebSocketMessage[]) => {
  return {
    lifecycle: messages.filter(m => ['investigation_started', 'investigation_completed'].includes(m.type)),
    agentProgress: messages.filter(m => ['agent_started', 'agent_completed', 'agent_thinking'].includes(m.type)),
    toolExecution: messages.filter(m => m.type === 'tool_execution'),
    riskAssessment: messages.filter(m => m.type === 'agent_risk_assessment'),
    errors: messages.filter(m => m.type === 'error'),
    progress: messages.filter(m => m.type === 'investigation_progress')
  };
};
```

### 2. Real-time Progress Calculation

```typescript
const calculateProgress = (messages: WebSocketMessage[]): InvestigationProgress => {
  const completedMessage = messages.find(m => m.type === 'investigation_completed');
  if (completedMessage) {
    return {
      completedAgents: completedMessage.summary?.successful_agents || 0,
      totalAgents: completedMessage.summary?.total_agents || 5,
      progressPercentage: 100,
      isCompleted: true,
      overallRiskScore: completedMessage.summary?.overall_risk_score,
      executionTime: completedMessage.summary?.execution_time
    };
  }

  const progressMessages = messages.filter(m => m.type === 'investigation_progress');
  const latestProgress = progressMessages[progressMessages.length - 1];
  
  return {
    completedAgents: latestProgress?.completed_agents || 0,
    totalAgents: latestProgress?.total_agents || 5,
    progressPercentage: latestProgress?.progress_percentage || 0,
    currentAgent: latestProgress?.current_agent,
    isCompleted: false
  };
};
```

### 3. Agent Status Tracking

```typescript
interface AgentStatus {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  startTime?: number;
  endTime?: number;
  riskScore?: number;
  toolsUsed?: number;
  errors?: number;
}

const trackAgentStatus = (messages: WebSocketMessage[]): AgentStatus[] => {
  const agents = ['Device', 'Location', 'Network', 'Logs', 'Risk_Assessment'];
  
  return agents.map(agentName => {
    const startedMsg = messages.find(m => m.type === 'agent_started' && m.agent_name === agentName);
    const completedMsg = messages.find(m => m.type === 'agent_completed' && m.agent_name === agentName);
    const riskMsg = messages.find(m => m.type === 'agent_risk_assessment' && m.agent_name === agentName);
    const errorMsg = messages.find(m => m.type === 'error' && m.agent_name === agentName);

    let status: AgentStatus['status'] = 'pending';
    if (errorMsg) status = 'error';
    else if (completedMsg) status = 'completed';
    else if (startedMsg) status = 'running';

    return {
      name: agentName,
      status,
      startTime: startedMsg?.timestamp,
      endTime: completedMsg?.timestamp,
      riskScore: riskMsg?.risk_score,
      toolsUsed: completedMsg?.tools_used,
      errors: completedMsg?.errors || (errorMsg ? 1 : 0)
    };
  });
};
```

## UI Component Examples

### Progress Bar Component

```tsx
import React from 'react';

interface ProgressBarProps {
  progress: InvestigationProgress;
  agentStatuses: AgentStatus[];
}

export const InvestigationProgressBar: React.FC<ProgressBarProps> = ({ 
  progress, 
  agentStatuses 
}) => {
  return (
    <div className="investigation-progress">
      <div className="progress-header">
        <h3>Investigation Progress</h3>
        <span>{progress.completedAgents}/{progress.totalAgents} Agents Completed</span>
      </div>
      
      <div className="progress-bar">
        <div 
          className="progress-fill"
          style={{ width: `${progress.progressPercentage}%` }}
        />
      </div>
      
      <div className="agent-statuses">
        {agentStatuses.map(agent => (
          <div 
            key={agent.name} 
            className={`agent-status agent-status--${agent.status}`}
          >
            <span className="agent-name">{agent.name}</span>
            <span className="agent-indicator" />
            {agent.status === 'completed' && agent.riskScore !== undefined && (
              <span className="risk-score">Risk: {agent.riskScore.toFixed(2)}</span>
            )}
          </div>
        ))}
      </div>
      
      {progress.currentAgent && !progress.isCompleted && (
        <div className="current-agent">
          Currently processing: <strong>{progress.currentAgent}</strong>
        </div>
      )}
      
      {progress.isCompleted && (
        <div className="completion-summary">
          <h4>Investigation Complete!</h4>
          <p>Overall Risk Score: <strong>{progress.overallRiskScore?.toFixed(3)}</strong></p>
          {progress.executionTime && (
            <p>Execution Time: <strong>{progress.executionTime.toFixed(1)}s</strong></p>
          )}
        </div>
      )}
    </div>
  );
};
```

## Error Handling

### Connection Management

```typescript
class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  connect(investigationId: string, parallel: boolean = true) {
    const wsUrl = `ws://localhost:8090/ws/${investigationId}?parallel=${parallel}`;
    
    try {
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
      };
      
      this.ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        this.handleReconnect(investigationId, parallel);
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  }

  private handleReconnect(investigationId: string, parallel: boolean) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect(investigationId, parallel);
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
```

## TypeScript Definitions

```typescript
// Message Types
export type WebSocketMessageType = 
  | 'investigation_started'
  | 'agent_started'
  | 'agent_thinking'
  | 'tool_execution'
  | 'agent_risk_assessment'
  | 'agent_completed'
  | 'investigation_progress'
  | 'investigation_completed'
  | 'error';

// Base Message Interface
export interface WebSocketMessage {
  type: WebSocketMessageType;
  message: string;
  timestamp: number;
}

// Specific Message Interfaces
export interface InvestigationStartedMessage extends WebSocketMessage {
  type: 'investigation_started';
  entity_id: string;
  entity_type: 'user_id' | 'device_id';
  parallel_mode: boolean;
  total_agents: number;
}

export interface AgentStartedMessage extends WebSocketMessage {
  type: 'agent_started';
  agent_name: string;
  entity_id: string;
  entity_type: 'user_id' | 'device_id';
}

export interface AgentCompletedMessage extends WebSocketMessage {
  type: 'agent_completed';
  agent_name: string;
  success: boolean;
  execution_time: number;
  tools_used: number;
  errors: number;
}

export interface InvestigationCompletedMessage extends WebSocketMessage {
  type: 'investigation_completed';
  isCompletion: true;
  summary: {
    overall_risk_score: number;
    successful_agents: number;
    total_agents: number;
    execution_time: number;
    parallel_mode: boolean;
  };
}

export interface ErrorMessage extends WebSocketMessage {
  type: 'error';
  agent_name?: string;
  error: string;
  error_code?: string;
}
```

This guide provides comprehensive coverage of WebSocket integration for autonomous mode. For additional support or questions, please refer to the API documentation or contact the development team.
