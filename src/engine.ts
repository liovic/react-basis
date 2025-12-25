// src/engine.ts

import * as UI from './core/logger';
import { calculateCosineSimilarity } from './core/math';
import { 
  WINDOW_SIZE, 
  SIMILARITY_THRESHOLD, 
  LOOP_THRESHOLD, 
  LOOP_WINDOW_MS, 
  ANALYSIS_INTERVAL 
} from './core/constants';

export const history = new Map<string, number[]>();
export const currentTickBatch = new Set<string>();
let updateLog: { label: string; ts: number }[] = [];
let currentEffectSource: string | null = null; 
let tick = 0;
let isBatching = false;

UI.displayBootLog(WINDOW_SIZE);

const analyzeBasis = () => {
  const entries = Array.from(history.entries());
  if (entries.length < 2) return;

  entries.forEach(([labelA, vecA], i) => {
    entries.slice(i + 1).forEach(([labelB, vecB]) => {
      const sim = calculateCosineSimilarity(vecA, vecB);
      
      if (sim > SIMILARITY_THRESHOLD) {
        UI.displayRedundancyAlert(labelA, labelB, sim, history.size);
      }
    });
  });
};

export const printBasisHealthReport = (threshold = 0.5) => {
  UI.displayHealthReport(history, calculateCosineSimilarity, threshold);
};

export const beginEffectTracking = (label: string) => { currentEffectSource = label; };
export const endEffectTracking = () => { currentEffectSource = null; };

export const registerVariable = (label: string) => {
  if (!history.has(label)) {
    history.set(label, new Array(WINDOW_SIZE).fill(0));
  }
};

export const unregisterVariable = (label: string) => {
  history.delete(label);
};

export const recordUpdate = (label: string): boolean => {
  const now = Date.now();

  updateLog.push({ label, ts: now });
  updateLog = updateLog.filter(e => now - e.ts < LOOP_WINDOW_MS);
  if (updateLog.filter(e => e.label === label).length > LOOP_THRESHOLD) {
    UI.displayInfiniteLoop(label);
    return false;
  }

  if (currentEffectSource && currentEffectSource !== label) {
    UI.displayCausalHint(label, currentEffectSource);
  }

  currentTickBatch.add(label);

  if (!isBatching) {
    isBatching = true;
    setTimeout(() => {
      tick++;
      history.forEach((vec, l) => {
        vec.shift();
        vec.push(currentTickBatch.has(l) ? 1 : 0);
      });

      currentTickBatch.clear();
      isBatching = false;
      
      if (tick % ANALYSIS_INTERVAL === 0) {
        analyzeBasis();
      }
    }, 20);
  }

  return true;
};

if (typeof window !== 'undefined') {
  (window as any).printBasisReport = printBasisHealthReport;
}

export const __testEngine__ = {
  history,
  currentTickBatch,
  registerVariable,
  recordUpdate,
  printBasisHealthReport,
  beginEffectTracking,
  endEffectTracking,
};