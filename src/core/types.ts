// src/core/types.ts

export enum SignalRole {
  LOCAL = 'local',
  CONTEXT = 'context',
  PROJECTION = 'proj',
  STORE = 'store',
}

export interface StateOptions { 
  label?: string; 
  suppressAll?: boolean; 
  role?: SignalRole; 
}

export interface RingBufferMetadata { 
  buffer: Uint8Array; 
  head: number; 
  density: number; 
  options: StateOptions;
  role: SignalRole; 
}

export interface Entry {
  label: string;
  meta: RingBufferMetadata;
  isVolatile: boolean;
}

export interface ViolationDetail {
  type: 'causal_leak' | 'context_mirror' | 'duplicate_state';
  target: string;
  similarity?: number;
}

export interface RankedIssue {
  label: string;
  metric: 'influence' | 'density' | 'redundancy';
  score: number;
  reason: string;
  violations: ViolationDetail[]; 
}

export interface PerformanceMetrics { 
  lastAnalysisTimeMs: number; 
  comparisonCount: number; 
  lastAnalysisTimestamp: number;
  systemEntropy: number; 
}

export interface BasisGraphNode {
  id: string;
  name: string;
  file: string;
  role: SignalRole | 'event' | 'effect' | 'unknown';
  density: number | null;
  redundant: boolean;
}

export interface BasisGraphEdge {
  source: string;
  target: string;
  weight: number;
}

export interface BasisEventGroup {
  sourceIds: string[];
  occurrences: number;
  edges: BasisGraphEdge[];
}

export interface BasisGraphJSON {
  generatedAt: number;
  bufferWindowSize: number;
  eventTtlMs: number;
  nodes: BasisGraphNode[];
  edges: BasisGraphEdge[];
  eventGroups: BasisEventGroup[];
}

export interface BasisEngineState {
  config: { debug: boolean };
  history: Map<string, RingBufferMetadata>;
  currentTickBatch: Set<string>;
  redundantLabels: Set<string>;
  booted: boolean;
  tick: number;
  isBatching: boolean;
  currentEffectSource: string | null;
  lastStateUpdate: string | null;
  pausedVariables: Set<string>;
  metrics: PerformanceMetrics;
  alertCount: number;
  loopCounters: Map<string, number>;
  lastCleanup: number;
  graph: Map<string, Map<string, number>>; 
  violationMap: Map<string, ViolationDetail[]>;
}