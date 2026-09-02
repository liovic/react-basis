// src/engine.ts

import * as UI from './core/logger';
import { detectSubspaceOverlap } from './core/analysis';
import {
  SignalRole,
  StateOptions,
  RingBufferMetadata,
  BasisEngineState,
  Entry,
  ViolationDetail
} from './core/types';
import {
  WINDOW_SIZE,
  LOOP_THRESHOLD,
  VOLATILITY_THRESHOLD
} from './core/constants';

// --- Static Internal State ---

const BASIS_INSTANCE_KEY = Symbol.for('__basis_engine_instance__');

const GRAPH_CLEANUP_INTERVAL = 5000; // Run every 5 seconds
const EVENT_TTL = 10000; // Keep events for 10 seconds

const NULL_SIGNAL: RingBufferMetadata = {
  role: SignalRole.PROJECTION,
  buffer: new Uint8Array(0),
  head: 0,
  density: 0,
  options: {}
};

// --- v0.6.0 EVENT TOPOLOGY ---
let activeEventId: string | null = null;
let activeEventTimer: any = null;

// Garbage Collect old Event Nodes
const pruneGraph = () => {
  const now = Date.now();

  // Only checking the keys (Source Nodes)
  for (const source of instance.graph.keys()) {
    if (source.startsWith('Event_Tick_')) {
      // Extract timestamp from "Event_Tick_1738492..."
      const parts = source.split('_');
      const timestamp = parseInt(parts[2], 10);

      if (now - timestamp > EVENT_TTL) {
        instance.graph.delete(source);
      }
    }
  }
};

const getEventId = () => {
  if (!activeEventId) {
    activeEventId = `Event_Tick_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    requestAnimationFrame(() => {
      activeEventId = null;
    });
  }
  return activeEventId;
};

// GLOBAL SINGLETON HMR BRIDGE
const getGlobalInstance = (): BasisEngineState => {
  const root = globalThis as any;
  if (!root[BASIS_INSTANCE_KEY]) {
    root[BASIS_INSTANCE_KEY] = {
      config: { debug: false },
      history: new Map<string, RingBufferMetadata>(),
      currentTickBatch: new Set<string>(),
      redundantLabels: new Set<string>(),
      booted: false,
      tick: 0,
      isBatching: false,
      currentEffectSource: null,
      lastStateUpdate: null,
      pausedVariables: new Set<string>(),
      graph: new Map<string, Map<string, number>>(),
      violationMap: new Map<string, ViolationDetail[]>(),
      metrics: {
        lastAnalysisTimeMs: 0,
        comparisonCount: 0,
        lastAnalysisTimestamp: 0,
        systemEntropy: 0
      },
      alertCount: 0,
      loopCounters: new Map<string, number>(),
      lastCleanup: Date.now()
    };
  }
  return root[BASIS_INSTANCE_KEY];
};

export const instance = getGlobalInstance();

export const config = instance.config;
export const history = instance.history;
export const redundantLabels = instance.redundantLabels;
export const currentTickBatch = instance.currentTickBatch;

let currentTickRegistry: Record<string, boolean> = {};
const dirtyLabels = new Set<string>();

// TEMPORAL ENTROPY
const calculateTickEntropy = (tickIdx: number) => {
  let activeCount = 0;
  const total = instance.history.size;
  if (total === 0) return 1;

  instance.history.forEach((meta: RingBufferMetadata) => {
    if (meta.buffer[tickIdx] === 1) activeCount++;
  });
  return 1 - (activeCount / total);
};

export const recordEdge = (source: string, target: string) => {
  if (!source || !target || source === target) return;
  if (!instance.graph.has(source)) {
    instance.graph.set(source, new Map());
  }
  const targets = instance.graph.get(source)!;
  targets.set(target, (targets.get(target) || 0) + 1);
};

export const analyzeBasis = () => {
  if (!instance.config.debug || dirtyLabels.size === 0) {
    return;
  }

  const scheduler = (globalThis as any).requestIdleCallback || ((cb: any) => setTimeout(cb, 1));
  const snapshot = new Set(dirtyLabels);
  dirtyLabels.clear();

  scheduler(() => {
    const analysisStart = performance.now();
    const allEntries: Entry[] = [];
    const dirtyEntries: Entry[] = [];

    instance.history.forEach((meta: RingBufferMetadata, label: string) => {
      if (meta.options.suppressAll || meta.density === 0) return;

      const entry: Entry = {
        label, meta,
        isVolatile: meta.density > VOLATILITY_THRESHOLD
      };

      allEntries.push(entry);
      if (snapshot.has(label)) {
        dirtyEntries.push(entry);
      }
    });

    if (dirtyEntries.length === 0 || allEntries.length < 2) return;

    const nextRedundant = new Set<string>();
    instance.redundantLabels.forEach((l: string) => {
      if (!snapshot.has(l)) {
        nextRedundant.add(l);
      }
    });

    const { compCount, violationMap } = detectSubspaceOverlap(
      dirtyEntries,
      allEntries,
      nextRedundant,
      snapshot,
      instance.graph
    );

    instance.redundantLabels.clear();
    nextRedundant.forEach((l: string) => {
      instance.redundantLabels.add(l);
    });

    violationMap.forEach((newList, label) => {
      const existing = instance.violationMap.get(label) || [];
      newList.forEach(detail => {
        const alreadyExists = existing.some(
          v => v.type === detail.type && v.target === detail.target
        );
        if (!alreadyExists) {
          existing.push(detail);
        }
      });
      instance.violationMap.set(label, existing);
    });

    if (instance.violationMap.size > 500) {
      const keys = Array.from(instance.violationMap.keys()).slice(0, 200);
      keys.forEach(k => instance.violationMap.delete(k));
    }

    instance.metrics.lastAnalysisTimeMs = performance.now() - analysisStart;
    instance.metrics.comparisonCount = compCount;
    instance.metrics.lastAnalysisTimestamp = Date.now();
  });
};

const processHeartbeat = () => {
  instance.tick++;

  instance.history.forEach((meta: RingBufferMetadata, label: string) => {
    const oldValue = meta.buffer[meta.head];
    const newValue = instance.currentTickBatch.has(label) ? 1 : 0;

    meta.buffer[meta.head] = newValue;
    if (oldValue !== newValue) {
      meta.density += (newValue - oldValue);
    }

    meta.head = (meta.head + 1) % WINDOW_SIZE;
  });

  const lastHead = (instance.history.size > 0) ? (instance.tick % WINDOW_SIZE) : 0;
  instance.metrics.systemEntropy = calculateTickEntropy(lastHead);

  instance.currentTickBatch.clear();
  currentTickRegistry = {};
  instance.isBatching = false;
  instance.lastStateUpdate = null;

  if (dirtyLabels.size > 0) {
    analyzeBasis();
  }
};

// INTERCEPTION LAYER
export const recordUpdate = (label: string): boolean => {
  if (!instance.config.debug) return true;
  if (instance.pausedVariables.has(label)) return false;

  const now = Date.now();
  if (now - instance.lastCleanup > 1000) {
    instance.loopCounters.clear();
    instance.lastCleanup = now;

    pruneGraph();
  }

  const count = (instance.loopCounters.get(label) || 0) + 1;
  instance.loopCounters.set(label, count);

  if (count > LOOP_THRESHOLD) {
    UI.displayViolentBreaker(label, count, LOOP_THRESHOLD);
    instance.pausedVariables.add(label);
    return false;
  }

  const meta = instance.history.get(label);

  // --- CAUSAL RESOLUTION ---
  let edgeSource: string | null = null;

  // PRIORITY 1: Explicit Effect Driver
  // If we are inside an effect, it IS the cause.
  if (instance.currentEffectSource) {
    edgeSource = instance.currentEffectSource;
  }
  // PRIORITY 2: The Event Horizon (Siblings)
  // We removed the synchronous state-to-state link here.
  // If A and B update in the same event handler, they are siblings (Event -> A, Event -> B).
  // They are NOT a dependency chain (A -> B).
  else {
    edgeSource = getEventId();
  }

  // Record graph edge
  if (edgeSource && edgeSource !== label) {
    recordEdge(edgeSource, label);

    // Hinting Logic (only for non-events)
    if (instance.currentEffectSource && instance.currentEffectSource !== label) {

      const sourceMeta = instance.history.get(instance.currentEffectSource) || NULL_SIGNAL;

      // Volatility Guard
      if (meta && sourceMeta && meta.density < VOLATILITY_THRESHOLD && sourceMeta.density < VOLATILITY_THRESHOLD) {
        UI.displayCausalHint(label, meta, instance.currentEffectSource, sourceMeta);
      }
    }
  }

  // Source Tracking
  // We still track this for future features, but we don't use it for 
  // immediate causal attribution anymore to prevent sibling-glomming.
  if (meta && meta.role === SignalRole.LOCAL && !instance.currentEffectSource) {
    instance.lastStateUpdate = label;
  }

  if (currentTickRegistry[label]) return true;

  currentTickRegistry[label] = true;
  instance.currentTickBatch.add(label);
  dirtyLabels.add(label);

  if (!instance.isBatching) {
    instance.isBatching = true;
    requestAnimationFrame(processHeartbeat);
  }

  return true;
};

// --- LIFECYCLE API ---

export const configureBasis = (c: any) => {
  Object.assign(instance.config, c);
  if (instance.config.debug && !instance.booted) {
    UI.displayBootLog(WINDOW_SIZE);
    instance.booted = true;
  }
};

export const registerVariable = (l: string, o: StateOptions = {}) => {
  if (o.suppressAll) return;

  if (!instance.history.has(l)) {
    instance.history.set(l, {
      buffer: new Uint8Array(WINDOW_SIZE),
      head: 0,
      density: 0,
      options: o,
      role: o.role || SignalRole.LOCAL
    });
  }
};

export const unregisterVariable = (l: string) => {
  instance.history.delete(l);
  instance.loopCounters.delete(l);
  instance.pausedVariables.delete(l);
  instance.redundantLabels.delete(l);

  instance.graph.delete(l);
  instance.graph.forEach((targets) => targets.delete(l));

  instance.violationMap.delete(l);
  instance.violationMap.forEach((list) => {
    const idx = list.findIndex((v) => v.target === l);
    if (idx !== -1) list.splice(idx, 1);
  });
};

export const beginEffectTracking = (l: string) => {
  if (instance.config.debug) instance.currentEffectSource = l;
};

export const endEffectTracking = () => {
  instance.currentEffectSource = null;
};

export const printBasisHealthReport = (threshold = 0.5) => {
  if (!instance.config.debug) return;
  UI.displayHealthReport(instance.history, threshold, instance.violationMap);
};

export const getBasisMetrics = () => ({
  engine: 'v0.6.x',
  hooks: instance.history.size,
  analysis_ms: instance.metrics.lastAnalysisTimeMs.toFixed(3),
  entropy: instance.metrics.systemEntropy.toFixed(3)
});

if (typeof window !== 'undefined') {
  (window as any).printBasisReport = printBasisHealthReport;
  (window as any).getBasisMetrics = getBasisMetrics;
}

export const __testEngine__ = {
  instance,
  history,
  configureBasis,
  registerVariable,
  unregisterVariable,
  recordUpdate,
  printBasisHealthReport,
  analyzeBasis,
  beginEffectTracking,
  endEffectTracking
};
