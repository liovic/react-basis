// src/core/ranker.ts

import { calculateSpectralInfluence } from './graph';
import { RingBufferMetadata, SignalRole, RankedIssue, ViolationDetail } from './types';
import { parseLabel } from './label';

export const identifyTopIssues = (
  graph: Map<string, Map<string, number>>,
  history: Map<string, RingBufferMetadata>,
  redundantLabels: Set<string>,
  violationMap: Map<string, ViolationDetail[]>
): RankedIssue[] => {
  const results: RankedIssue[] = [];

  const influence = calculateSpectralInfluence(graph);

  const isEffect = (label: string) =>
    label.includes('effect_L') ||
    label.includes('useLayoutEffect') ||
    label.includes('useInsertionEffect');

  const isEvent = (label: string) => label.startsWith('Event_Tick_');

  // --- EVENT AGGREGATION MAP ---
  const eventSignatures = new Map<string, { count: number, score: number, targets: string[] }>();

  // 1. FILTER & PROCESS DRIVERS
  const drivers = Array.from(graph.entries())
    .filter(([label, targets]) => {
      if (targets.size === 0) return false;

      // AGGREGATE EVENTS
      if (isEvent(label)) {
        const validTargets = Array.from(targets.keys()).filter(t => {
          const meta = history.get(t);
          return meta && meta.role !== SignalRole.CONTEXT;
        });

        if (validTargets.length > 1) {
          const signature = validTargets.sort().join('|');
          const existing = eventSignatures.get(signature);
          if (existing) {
            existing.count++;
            existing.score = Math.max(existing.score, influence.get(label) || 0);
          } else {
            eventSignatures.set(signature, {
              count: 1,
              score: influence.get(label) || 0,
              targets: validTargets
            });
          }
        }
        return false;
      }

      // STANDARD NODE FILTERING
      const meta = history.get(label);
      if (meta?.role === SignalRole.CONTEXT) return false;
      if (meta?.role === SignalRole.PROJECTION) return false;

      const score = influence.get(label) || 0;
      if (isEffect(label) && targets.size > 0) return true;
      if (targets.size < 2 && score < 0.05) return false;

      return true;
    })
    .sort((a, b) => {
      const scoreA = influence.get(a[0]) || 0;
      const scoreB = influence.get(b[0]) || 0;
      return scoreB - scoreA;
    });

  // 2. INJECT AGGREGATED EVENTS (Top Priority)
  const sortedEvents = Array.from(eventSignatures.entries())
    .sort((a, b) => b[1].targets.length - a[1].targets.length);

  sortedEvents.slice(0, 2).forEach(([sig, data]) => {
    // Borrow the filename from the first target
    const primaryVictim = parseLabel(data.targets[0]);

    // We construct a label that looks like "File.tsx -> Interaction Name"
    // This tricks the Logger into printing the correct file location.
    const smartLabel = `${primaryVictim.file} -> Global Event (${primaryVictim.name})`;

    results.push({
      label: smartLabel,
      metric: 'influence',
      score: 1.0,
      reason: `Global Sync Event: An external trigger is updating ${data.targets.length} roots simultaneously. Occurred ${data.count} times.`,
      violations: data.targets.map(t => ({
        type: 'causal_leak',
        target: t
      }))
    });
  });

  // 3. GENERATE STANDARD ISSUES
  drivers.slice(0, 3 - results.length).forEach(([label, targets]) => {
    const targetNames = Array.from(targets.keys());

    if (isEffect(label)) {
      results.push({
        label,
        metric: 'influence',
        score: influence.get(label) || 0,
        reason: `Side-Effect Driver: Hook writes to state during render.`,
        violations: targetNames.map(t => ({ type: 'causal_leak', target: t }))
      });
      return;
    }

    results.push({
      label,
      metric: 'influence',
      score: influence.get(label) || targets.size,
      reason: `Sync Driver: Acts as a "Prime Mover" for ${targets.size} downstream signals.`,
      violations: targetNames.map(t => ({ type: 'causal_leak', target: t }))
    });
  });

  // 4. DENSITY FALLBACK
  if (results.length === 0) {
    const sortedDensity = Array.from(history.entries())
      .filter(([label, meta]) =>
        meta.role === SignalRole.LOCAL &&
        !redundantLabels.has(label) &&
        meta.density > 25
      )
      .sort((a, b) => b[1].density - a[1].density);

    sortedDensity.slice(0, 3).forEach(([label, meta]) => {
      results.push({
        label,
        metric: 'density',
        score: meta.density,
        reason: `High Frequency: potential main-thread saturation.`,
        violations: []
      });
    });
  }

  return results;
};