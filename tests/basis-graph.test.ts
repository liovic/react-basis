// tests/basis-graph.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { instance, configureBasis, registerVariable, recordUpdate, recordEdge, __testEngine__ } from '../src/engine';
import { SignalRole } from '../src/core/types';
import { INSTANCE_SEP } from '../src/core/constants';

describe('getBasisGraph() JSON export', () => {
  beforeEach(() => {
    instance.history.clear();
    instance.graph.clear();
    instance.violationMap.clear();
    instance.redundantLabels.clear();
    configureBasis({ debug: true });
  });

  it('returns an empty graph when nothing has been recorded', () => {
    const graph = __testEngine__.getBasisGraph();
    expect(graph.nodes).toEqual([]);
    expect(graph.edges).toEqual([]);
    expect(graph.eventGroups).toEqual([]);
    expect(graph.bufferWindowSize).toBeGreaterThan(0);
    expect(graph.eventTtlMs).toBeGreaterThan(0);
  });

  it('serializes a real state edge (registered variable) with its metadata', () => {
    registerVariable('Comp.tsx -> value', { role: SignalRole.LOCAL });
    recordEdge('SourceVar', 'Comp.tsx -> value');

    const graph = __testEngine__.getBasisGraph();

    const targetNode = graph.nodes.find(n => n.id === 'Comp.tsx -> value');
    expect(targetNode).toBeDefined();
    expect(targetNode!.name).toBe('value');
    expect(targetNode!.file).toBe('Comp.tsx');
    expect(targetNode!.role).toBe(SignalRole.LOCAL);

    const edge = graph.edges.find(e => e.source === 'SourceVar' && e.target === 'Comp.tsx -> value');
    expect(edge).toBeDefined();
    expect(edge!.weight).toBe(1);
  });

  it('marks a virtual Event_Tick_ source node with role "event" and null density', () => {
    recordEdge('Event_Tick_123_abcde', 'Comp.tsx -> a');
    const graph = __testEngine__.getBasisGraph();

    const eventNode = graph.nodes.find(n => n.id === 'Event_Tick_123_abcde');
    expect(eventNode).toBeDefined();
    expect(eventNode!.role).toBe('event');
    expect(eventNode!.density).toBeNull();
  });

  it('marks a babel-labeled effect source node with role "effect" and null density, not "local"', () => {
    registerVariable('Comp.tsx -> fahrenheit:5', { role: SignalRole.LOCAL });
    // Effects never call registerVariable (see hooks.ts) - only appear as
    // an unregistered graph edge source, exactly like this.
    recordEdge('Comp.tsx -> effect_L7:7', 'Comp.tsx -> fahrenheit:5');

    const graph = __testEngine__.getBasisGraph();
    const effectNode = graph.nodes.find(n => n.id === 'Comp.tsx -> effect_L7:7');
    expect(effectNode).toBeDefined();
    expect(effectNode!.role).toBe('effect');
    expect(effectNode!.density).toBeNull();
  });

  it('marks the un-transformed hooks.ts effect fallback labels as role "effect" too', () => {
    registerVariable('Comp.tsx -> value', { role: SignalRole.LOCAL });
    recordEdge('Comp.tsx -> anonymous_effect', 'Comp.tsx -> value');
    recordEdge('Comp.tsx -> anonymous_layout_effect', 'Comp.tsx -> value');

    const graph = __testEngine__.getBasisGraph();
    expect(graph.nodes.find(n => n.id === 'Comp.tsx -> anonymous_effect')!.role).toBe('effect');
    expect(graph.nodes.find(n => n.id === 'Comp.tsx -> anonymous_layout_effect')!.role).toBe('effect');
  });

  it('accumulates edge weight across repeated recordEdge calls, matching recordUpdate behavior', () => {
    registerVariable('Comp.tsx -> a', { role: SignalRole.LOCAL });
    recordEdge('Source', 'Comp.tsx -> a');
    recordEdge('Source', 'Comp.tsx -> a');
    recordEdge('Source', 'Comp.tsx -> a');

    const graph = __testEngine__.getBasisGraph();
    const edge = graph.edges.find(e => e.source === 'Source' && e.target === 'Comp.tsx -> a');
    expect(edge!.weight).toBe(3);
  });

  it('flags a node as redundant when it is in instance.redundantLabels', () => {
    registerVariable('Comp.tsx -> dupe', { role: SignalRole.LOCAL });
    recordEdge('Source', 'Comp.tsx -> dupe');
    instance.redundantLabels.add('Comp.tsx -> dupe');

    const graph = __testEngine__.getBasisGraph();
    const node = graph.nodes.find(n => n.id === 'Comp.tsx -> dupe');
    expect(node!.redundant).toBe(true);
  });

  it('printBasisGraph() does not throw with real recorded data', () => {
    registerVariable('Comp.tsx -> a', { role: SignalRole.LOCAL });
    recordEdge('Event_Tick_1_x', 'Comp.tsx -> a');
    expect(() => __testEngine__.printBasisGraph()).not.toThrow();
  });

  it('printBasisGraph() does not leak console.log style strings as literal text for a redundant-flagged edge', () => {
    registerVariable('Comp.tsx -> dupe', { role: SignalRole.LOCAL });
    recordEdge('Source', 'Comp.tsx -> dupe');
    instance.redundantLabels.add('Comp.tsx -> dupe');

    const logSpy = vi.spyOn(console, 'log');
    __testEngine__.printBasisGraph();

    const lines = logSpy.mock.calls.map(call => String(call[0]));
    const edgeLine = lines.find(l => l.includes('dupe'));
    expect(edgeLine).toBeDefined();
    const placeholderCount = (edgeLine!.match(/%c/g) || []).length;
    const call = logSpy.mock.calls.find(c => String(c[0]) === edgeLine)!;
    expect(call.length - 1).toBe(placeholderCount);

    logSpy.mockRestore();
  });

  it('printBasisGraph() is a no-op when debug is off (verified via spy, not just not-throwing)', () => {
    configureBasis({ debug: false });
    registerVariable('Comp.tsx -> a', { role: SignalRole.LOCAL });
    recordEdge('Source', 'Comp.tsx -> a');

    const groupSpy = vi.spyOn(console, 'group');
    const logSpy = vi.spyOn(console, 'log');

    __testEngine__.printBasisGraph();

    expect(groupSpy).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();

    groupSpy.mockRestore();
    logSpy.mockRestore();
  });

  it('eventGroups collapses two Event_Tick_ sources with identical fan-out into one group', () => {
    registerVariable('Comp.tsx -> a', { role: SignalRole.LOCAL });
    registerVariable('Comp.tsx -> b', { role: SignalRole.LOCAL });

    recordEdge('Event_Tick_1_aaaaa', 'Comp.tsx -> a');
    recordEdge('Event_Tick_1_aaaaa', 'Comp.tsx -> b');
    recordEdge('Event_Tick_2_bbbbb', 'Comp.tsx -> a');
    recordEdge('Event_Tick_2_bbbbb', 'Comp.tsx -> b');

    const graph = __testEngine__.getBasisGraph();
    expect(graph.eventGroups.length).toBe(1);
    expect(graph.eventGroups[0].occurrences).toBe(2);
    expect(graph.eventGroups[0].sourceIds.sort()).toEqual(['Event_Tick_1_aaaaa', 'Event_Tick_2_bbbbb']);
    expect(graph.eventGroups[0].edges.length).toBe(2);

    // The raw nodes/edges arrays remain the full, ungrouped ground truth -
    // eventGroups is additive, not a replacement.
    expect(graph.edges.length).toBe(4);
  });

  it('eventGroups does NOT merge two Event_Tick_ sources with genuinely different fan-out', () => {
    registerVariable('Comp.tsx -> a', { role: SignalRole.LOCAL });
    registerVariable('Comp.tsx -> b', { role: SignalRole.LOCAL });

    recordEdge('Event_Tick_1_aaaaa', 'Comp.tsx -> a');
    recordEdge('Event_Tick_1_aaaaa', 'Comp.tsx -> b');
    recordEdge('Event_Tick_2_bbbbb', 'Comp.tsx -> a'); // only one target, different shape

    const graph = __testEngine__.getBasisGraph();
    expect(graph.eventGroups.length).toBe(2);
  });

  it('marks an unregistered, non-effect-shaped graph source as role "unknown" (not LOCAL) with null density', () => {
    registerVariable('Comp.tsx -> value', { role: SignalRole.LOCAL });
    recordEdge('SourceVar', 'Comp.tsx -> value');

    const graph = __testEngine__.getBasisGraph();
    const sourceNode = graph.nodes.find(n => n.id === 'SourceVar');
    expect(sourceNode).toBeDefined();
    expect(sourceNode!.role).toBe('unknown');
    expect(sourceNode!.density).toBeNull();
  });

  it('eventGroups never merges non-event sources, even with identical fan-out', () => {
    registerVariable('Comp.tsx -> a', { role: SignalRole.LOCAL });
    recordEdge('SourceOne', 'Comp.tsx -> a');
    recordEdge('SourceTwo', 'Comp.tsx -> a');

    const graph = __testEngine__.getBasisGraph();
    expect(graph.eventGroups.length).toBe(0);
  });

  it('is attached to window when the module loads', () => {
    expect(typeof (window as any).getBasisGraph).toBe('function');
    expect(typeof (window as any).printBasisGraph).toBe('function');
  });

  it('strips the instance suffix when deriving file/name, but keeps the full id', () => {
    const id = `Comp.tsx -> value${INSTANCE_SEP}_r_3_`;
    registerVariable(id, { role: SignalRole.LOCAL });
    recordEdge('Source', id);

    const graph = __testEngine__.getBasisGraph();
    const node = graph.nodes.find(n => n.id === id);
    expect(node).toBeDefined();
    expect(node!.file).toBe('Comp.tsx');
    expect(node!.name).toBe('value');
    expect(node!.id).toBe(id);
  });

  it('renders a role: "unknown" source without throwing', () => {
    registerVariable('Comp.tsx -> a', { role: SignalRole.LOCAL });
    recordEdge('MysterySource', 'Comp.tsx -> a');
    expect(() => __testEngine__.printBasisGraph()).not.toThrow();
  });

  it('console output orders two equal-fan-out event groups by occurrences, matching the data layer', () => {
    registerVariable('Comp.tsx -> a', { role: SignalRole.LOCAL });
    registerVariable('Comp.tsx -> b', { role: SignalRole.LOCAL });
    registerVariable('Comp.tsx -> c', { role: SignalRole.LOCAL });

    // Group A: 2 targets, seen once.
    recordEdge('Event_Tick_1_a', 'Comp.tsx -> a');
    recordEdge('Event_Tick_1_a', 'Comp.tsx -> b');

    // Group B: also 2 targets (different pair, so it won't merge with A),
    // but seen three times - should sort ahead of A despite equal fan-out.
    recordEdge('Event_Tick_2_b', 'Comp.tsx -> b');
    recordEdge('Event_Tick_2_b', 'Comp.tsx -> c');
    recordEdge('Event_Tick_3_c', 'Comp.tsx -> b');
    recordEdge('Event_Tick_3_c', 'Comp.tsx -> c');
    recordEdge('Event_Tick_4_d', 'Comp.tsx -> b');
    recordEdge('Event_Tick_4_d', 'Comp.tsx -> c');

    const graph = __testEngine__.getBasisGraph();
    const groupA = graph.eventGroups.find(g => g.occurrences === 1)!;
    const groupB = graph.eventGroups.find(g => g.occurrences === 3)!;
    expect(groupA).toBeDefined();
    expect(groupB).toBeDefined();
    expect(groupA.edges.length).toBe(groupB.edges.length); // equal fan-out

    const logSpy = vi.spyOn(console, 'groupCollapsed');
    __testEngine__.printBasisGraph();
    const titles = logSpy.mock.calls.map(c => String(c[0]));
    const idxB = titles.findIndex(t => t.includes('×3'));
    const idxA = titles.findIndex(t => t.includes('Event') && !t.includes('×3') && !t.includes('×1'));
    // Group B (×3) should render before the un-suffixed, single-occurrence
    // group A, matching the data layer's tie-break on occurrences.
    expect(idxB).toBeLessThan(idxA === -1 ? titles.length : idxA);
    logSpy.mockRestore();
  });
});