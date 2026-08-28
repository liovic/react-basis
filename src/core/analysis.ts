// src/core/analysis.ts

import * as UI from './logger';
import { calculateSimilarityCircular } from './math';
import { SIMILARITY_THRESHOLD } from './constants';
import { SignalRole, Entry, ViolationDetail } from './types';
import { isSameField } from './label';

interface Similarities {
  sync: number;
  bA: number;
  aB: number;
  max: number;
}

const CAUSAL_MARGIN = 0.05;

// --- NOISE REDUCTION ---
// Check if a node is directly driven by a Virtual Event.
const isEventDriven = (label: string, graph: Map<string, Map<string, number>>): boolean => {
  for (const [parent, targets] of graph.entries()) {
    if (parent.startsWith('Event_Tick_') && targets.has(label)) {
      return true;
    }
  }
  return false;
};

const calculateAllSimilarities = (entryA: Entry, entryB: Entry): Similarities => {
  const sync = calculateSimilarityCircular(
    entryA.meta.buffer,
    entryA.meta.head,
    entryB.meta.buffer,
    entryB.meta.head,
    0
  );

  const bA = calculateSimilarityCircular(
    entryA.meta.buffer,
    entryA.meta.head,
    entryB.meta.buffer,
    entryB.meta.head,
    1
  );

  const aB = calculateSimilarityCircular(
    entryA.meta.buffer,
    entryA.meta.head,
    entryB.meta.buffer,
    entryB.meta.head,
    -1
  );

  return { sync, bA, aB, max: Math.max(sync, bA, aB) };
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
  if (entryA.meta.density < 2 || entryB.meta.density < 2) return;

  if (roleA === SignalRole.LOCAL && isGlobalSource(roleB)) {
    redundantSet.add(entryA.label);
    pushViolation(violationMap, entryB.label, { type: 'context_mirror', target: entryA.label, similarity: similarities.max });
    UI.displayRedundancyAlert(entryA.label, entryA.meta, entryB.label, entryB.meta, similarities.max);
  }
  else if (isGlobalSource(roleA) && roleB === SignalRole.LOCAL) {
    redundantSet.add(entryB.label);
    pushViolation(violationMap, entryA.label, { type: 'context_mirror', target: entryB.label, similarity: similarities.max });
    UI.displayRedundancyAlert(entryB.label, entryB.meta, entryA.label, entryA.meta, similarities.max);
  }
  else if (roleA === SignalRole.LOCAL && roleB === SignalRole.LOCAL) {
    redundantSet.add(entryA.label);
    redundantSet.add(entryB.label);
    pushViolation(violationMap, entryA.label, { type: 'duplicate_state', target: entryB.label, similarity: similarities.max });
    pushViolation(violationMap, entryB.label, { type: 'duplicate_state', target: entryA.label, similarity: similarities.max });
    UI.displayRedundancyAlert(entryA.label, entryA.meta, entryB.label, entryB.meta, similarities.max);
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

  if (similarities.max - similarities.sync < CAUSAL_MARGIN) return;

  const addLeak = (source: string, target: string) => {
    if (isEventDriven(target, graph)) return;

    if (!violationMap.has(source)) {
      violationMap.set(source, []);
    }
    violationMap.get(source)!.push({ type: 'causal_leak', target });
    
    const sourceEntry = source === entryA.label ? entryA : entryB;
    const targetEntry = source === entryA.label ? entryB : entryA;
    UI.displayCausalHint(target, targetEntry.meta, source, sourceEntry.meta);
  };

  // bA High = A[t] matches B[t+1]. A happens before B.
  // Source: A, Target: B
  if (similarities.bA === similarities.max) {
    addLeak(entryA.label, entryB.label);
  }
  // aB High = A[t+1] matches B[t]. B happens before A.
  // Source: B, Target: A
  else if (similarities.aB === similarities.max) {
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
  let compCount = 0;
  const violationMap = new Map<string, ViolationDetail[]>();

  for (const entryA of dirtyEntries) {
    for (const entryB of allEntries) {
      if (shouldSkipComparison(entryA, entryB, dirtyLabels)) continue;

      compCount++;
      const similarities = calculateAllSimilarities(entryA, entryB);

      if (similarities.max > SIMILARITY_THRESHOLD) {
        detectRedundancy(entryA, entryB, similarities, redundantSet, violationMap);
        detectCausalLeak(entryA, entryB, similarities, violationMap, graph);
      }
    }
  }

  return { compCount, violationMap };
};