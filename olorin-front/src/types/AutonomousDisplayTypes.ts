// TypeScript interfaces for Combined Autonomous Investigation Display components

export interface AgentNodeData {
  id: string;
  name: string;
  type: 'network' | 'device' | 'location' | 'logs' | 'risk' | 'orchestrator';
  position: { x: number; y: number };
  status: 'idle' | 'active' | 'completed' | 'error';
  confidence?: number;
  lastUpdate?: string;
}

export interface ConnectionData {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  status: 'idle' | 'active' | 'completed';
  dataFlow?: boolean;
}

export interface GraphNodeData {
  id: string;
  name: string;
  type: 'start' | 'agent' | 'decision' | 'result';
  position: { x: number; y: number };
  status: 'idle' | 'active' | 'completed' | 'error';
  icon?: string;
  phase?: string;
}

export interface GraphEdgeData {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  status: 'idle' | 'active' | 'completed';
  progress?: number;
}

export interface TerminalLogEntry {
  id: string;
  timestamp: string;
  type: 'prompt' | 'success' | 'warning' | 'error' | 'info';
  message: string;
  agent?: string;
  delay?: number;
}

export interface InvestigationFlowData {
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
  currentPhase?: string;
  progress?: number;
}

export interface GraphInteraction {
  type: 'node_click' | 'edge_click' | 'node_hover' | 'edge_hover';
  nodeId?: string;
  edgeId?: string;
  data?: any;
}

export interface AnimationConfig {
  duration: number;
  easing: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out';
  loop?: boolean;
  delay?: number;
}

export interface NeuralNetworkFlowProps {
  agents: AgentNodeData[];
  connections: ConnectionData[];
  onNodeClick?: (nodeId: string, nodeData: AgentNodeData) => void;
  onConnectionClick?: (connectionId: string, connectionData: ConnectionData) => void;
  animationSpeed?: 'slow' | 'normal' | 'fast';
  className?: string;
}

export interface InteractiveGraphProps {
  investigationFlow: InvestigationFlowData;
  onGraphInteraction?: (interaction: GraphInteraction) => void;
  layout?: 'standard' | 'compact' | 'expanded';
  showProgress?: boolean;
  className?: string;
}

export interface CommandTerminalProps {
  logs: TerminalLogEntry[];
  typewriterSpeed?: number;
  maxLines?: number;
  autoScroll?: boolean;
  onTerminalCommand?: (command: string) => void;
  className?: string;
}

export interface CombinedDisplayProps {
  investigationId: string;
  isActive: boolean;
  agents: AgentNodeData[];
  connections: ConnectionData[];
  investigationFlow: InvestigationFlowData;
  logs: TerminalLogEntry[];
  onComponentInteraction?: (component: string, data: any) => void;
  className?: string;
}

export interface NeuralNodeProps {
  node: AgentNodeData;
  onClick?: (nodeId: string, nodeData: AgentNodeData) => void;
  className?: string;
}

export interface NeuralConnectionProps {
  connection: ConnectionData;
  fromNode: AgentNodeData;
  toNode: AgentNodeData;
  onClick?: (connectionId: string, connectionData: ConnectionData) => void;
  className?: string;
}

export interface GraphNodeProps {
  node: GraphNodeData;
  onClick?: (nodeId: string, nodeData: GraphNodeData) => void;
  onHover?: (nodeId: string, nodeData: GraphNodeData) => void;
  className?: string;
}

export interface GraphEdgeProps {
  edge: GraphEdgeData;
  fromNode: GraphNodeData;
  toNode: GraphNodeData;
  onClick?: (edgeId: string, edgeData: GraphEdgeData) => void;
  className?: string;
}

export interface TerminalLineProps {
  log: TerminalLogEntry;
  typewriterEffect?: boolean;
  typewriterSpeed?: number;
  className?: string;
}

export interface TypewriterEffectProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
  className?: string;
}

// Animation and State Management Types
export interface AnimationState {
  isAnimating: boolean;
  currentPhase: string;
  activeNodes: string[];
  activeConnections: string[];
}

export interface DisplayState {
  investigationId: string;
  isActive: boolean;
  currentPhase: string;
  progress: number;
  animationState: AnimationState;
  logs: TerminalLogEntry[];
}

export type AnimationSpeed = 'slow' | 'normal' | 'fast';
export type NodeStatus = 'idle' | 'active' | 'completed' | 'error';
export type EdgeStatus = 'idle' | 'active' | 'completed';
export type LogType = 'prompt' | 'success' | 'warning' | 'error' | 'info';