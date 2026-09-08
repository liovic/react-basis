// src/core/analysis.ts

import * as UI from './logger';
import { countOverlapsCircular, cosineFromOverlap, isSignificantOverlap } from './math';
import { SignalRole, Entry, ViolationDetail } from './types';
import { isSameField } from './label';

interface Similarities {
  sync: number;
  bA: number;
  aB: number;
  max: number;
  kSync: number;
  kALeadsB: number;
  kBLeadsA: number;
  densityA: number;
  densityB: number;
  significantSync: boolean;
  significantLead: boolean;
}

const isEventDriven = (label: string, graph: Map<string, Map<string, number>>): boolean => {
  for (const [parent, targets] of graph.entries()) {
    if (parent.startsWith('Event_Tick_') && targets.has(label)) {
      return true;
    }
  }
  return false;
};

const calculateAllSimilarities = (entryA: Entry, entryB: Entry): Similarities => {
  const { kSync, kALeadsB, kBLeadsA, densityA, densityB } = countOverlapsCircular(
    entryA.meta.buffer, entryA.meta.head,
    entryB.meta.buffer, entryB.meta.head
  );

  const sync = cosineFromOverlap(kSync, densityA, densityB);
  const bA = cosineFromOverlap(kALeadsB, densityA, densityB);
  const aB = cosineFromOverlap(kBLeadsA, densityA, densityB);
  const max = Math.max(sync, bA, aB);

  const windowSize = entryA.meta.buffer.length;
  const significantSync = isSignificantOverlap(kSync, densityA, densityB, windowSize);

  const kLead = Math.max(kALeadsB, kBLeadsA);
  const significantLead =
    isSignificantOverlap(kLead, densityA, densityB, windowSize) &&
    kLead >= kSync + 1;

  return {
    sync, bA, aB, max,
    kSync, kALeadsB, kBLeadsA,
    densityA, densityB,
    significantSync,
    significantLead,
  };
};

const shouldSkipComparison = (
  entryA: Entry,
  entryB: Entry,
  dirtyLabels: Set<string>
): boolean => {
  if (entryA.label === entryB.label) return true;
  if (isSameField(entryA.label, entryB.label)) return true;
  if (dirtyLabels.has(entryB.label) && entryA.label > entryB.label) return true;
  return false;
};

const pushViolation = (
  map: Map<string, ViolationDetail[]>,
  source: string,
  detail: ViolationDetail
) => {
  if (!map.has(source)) {
    map.set(source, []);
  }
  const list = map.get(source)!;
  const exists = list.some(
    v => v.type === detail.type && v.target === detail.target
  );
  if (!exists) {
    list.push(detail);
  }
};

const isGlobalSource = (role: SignalRole): boolean =>
  role === SignalRole.CONTEXT || role === SignalRole.STORE;

const detectRedundancy = (
  entryA: Entry,
  entryB: Entry,
  similarities: Similarities,
  redundantSet: Set<string>,
  violationMap: Map<string, ViolationDetail[]>
): void => {
  const roleA = entryA.meta.role;
  const roleB = entryB.meta.role;

  if (isGlobalSource(roleA) && isGlobalSource(roleB)) return;
  if (similarities.densityA < 2 || similarities.densityB < 2) return;

  const score = similarities.sync;

  if (roleA === SignalRole.LOCAL && isGlobalSource(roleB)) {
    redundantSet.add(entryA.label);
    pushViolation(violationMap, entryB.label, { type: 'context_mirror', target: entryA.label, similarity: score });
    UI.displayRedundancyAlert(entryA.label, entryA.meta, entryB.label, entryB.meta, score);
  } else if (isGlobalSource(roleA) && roleB === SignalRole.LOCAL) {
    redundantSet.add(entryB.label);
    pushViolation(violationMap, entryA.label, { type: 'context_mirror', target: entryB.label, similarity: score });
    UI.displayRedundancyAlert(entryB.label, entryB.meta, entryA.label, entryA.meta, score);
  } else if (roleA === SignalRole.LOCAL && roleB === SignalRole.LOCAL) {
    redundantSet.add(entryA.label);
    redundantSet.add(entryB.label);
    pushViolation(violationMap, entryA.label, { type: 'duplicate_state', target: entryB.label, similarity: score });
    pushViolation(violationMap, entryB.label, { type: 'duplicate_state', target: entryA.label, similarity: score });
    UI.displayRedundancyAlert(entryA.label, entryA.meta, entryB.label, entryB.meta, score);
  }
};

const detectCausalLeak = (
  entryA: Entry,
  entryB: Entry,
  similarities: Similarities,
  violationMap: Map<string, ViolationDetail[]>,
  graph: Map<string, Map<string, number>>
): void => {
  if (entryA.isVolatile || entryB.isVolatile) return;

  const addLeak = (source: string, target: string) => {
    if (isEventDriven(target, graph)) return;

    pushViolation(violationMap, source, { type: 'causal_leak', target });

    const sourceEntry = source === entryA.label ? entryA : entryB;
    const targetEntry = source === entryA.label ? entryB : entryA;
    UI.displayCausalHint(target, targetEntry.meta, source, sourceEntry.meta);
  };

  // Period-2 trains have equal lags. Still a lag vs sync; keep A→B like the old max check.
  if (similarities.kALeadsB >= similarities.kBLeadsA) {
    addLeak(entryA.label, entryB.label);
  } else {
    addLeak(entryB.label, entryA.label);
  }
};

export const detectSubspaceOverlap = (
  dirtyEntries: Entry[],
  allEntries: Entry[],
  redundantSet: Set<string>,
  dirtyLabels: Set<string>,
  graph: Map<string, Map<string, number>>
): { compCount: number; violationMap: Map<string, ViolationDetail[]> } => {
  const violationMap = new Map<string, ViolationDetail[]>();

  let compCount = 0;
  for (const entryA of dirtyEntries) {
    for (const entryB of allEntries) {
      if (shouldSkipComparison(entryA, entryB, dirtyLabels)) continue;

      compCount++;
      const similarities = calculateAllSimilarities(entryA, entryB);

      if (similarities.significantSync) {
        detectRedundancy(entryA, entryB, similarities, redundantSet, violationMap);
      }
      if (similarities.significantLead) {
        detectCausalLeak(entryA, entryB, similarities, violationMap, graph);
      }
    }
  }

  return { compCount, violationMap };
};