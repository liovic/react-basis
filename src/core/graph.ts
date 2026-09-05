// src/core/graph.ts

import { BasisGraphNode, BasisGraphEdge, BasisEventGroup } from './types';

export const calculateSpectralInfluence = (
  graph: Map<string, Map<string, number>>,
  maxIterations = 20,
  tolerance = 0.001
) => {
  const nodes = Array.from(new Set([...graph.keys(), ...Array.from(graph.values()).flatMap(m => [...m.keys()])]));
  if (nodes.length === 0) return new Map<string, number>();

  let scores = new Map<string, number>();
  // Initialize: Every node starts with equal weight
  nodes.forEach(n => scores.set(n, 1 / nodes.length));

  for (let i = 0; i < maxIterations; i++) {
    const nextScores = new Map<string, number>();
    let totalWeight = 0;

    nodes.forEach(source => {
      let influence = 0;
      const outgoing = graph.get(source);

      if (outgoing) {
        outgoing.forEach((weight, target) => {
          // Rule: Source is important if it triggers targets that are active/important
          // We skip self-loops (source === target) to prevent artificial inflation
          if (source !== target) {
            influence += (scores.get(target) || 0) * weight;
          }
        });
      }
      // Every node has a "Base" existence weight to prevent sinks from reaching 0
      nextScores.set(source, influence + 0.01);
      totalWeight += (influence + 0.01);
    });

    // Normalize
    let delta = 0;
    nextScores.forEach((val, key) => {
      const normalized = val / totalWeight;
      const diff = normalized - (scores.get(key) || 0);
      delta += diff * diff;
      nextScores.set(key, normalized);
    });

    scores = nextScores;
    if (Math.sqrt(delta) < tolerance) break;
  }

  return scores;
};

export const groupEventSources = (
  nodes: BasisGraphNode[],
  edges: BasisGraphEdge[]
): BasisEventGroup[] => {
  const outgoing = new Map<string, BasisGraphEdge[]>();
  edges.forEach(e => {
    if (!outgoing.has(e.source)) outgoing.set(e.source, []);
    outgoing.get(e.source)!.push(e);
  });

  const eventSourceIds = nodes.filter(n => n.role === 'event').map(n => n.id);

  const signatureOf = (sourceEdges: BasisGraphEdge[]) =>
    sourceEdges
      .map(e => `${e.target}@${e.weight}`)
      .sort()
      .join('|');

  const buckets = new Map<string, string[]>();
  eventSourceIds.forEach(id => {
    const sig = signatureOf(outgoing.get(id) || []);
    if (!buckets.has(sig)) buckets.set(sig, []);
    buckets.get(sig)!.push(id);
  });

  const groups: BasisEventGroup[] = Array.from(buckets.values()).map(sourceIds => ({
    sourceIds,
    occurrences: sourceIds.length,
    edges: (outgoing.get(sourceIds[0]) || []).slice()
  }));

  return groups.sort((a, b) => (b.edges.length - a.edges.length) || (b.occurrences - a.occurrences));
};