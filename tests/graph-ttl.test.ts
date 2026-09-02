import { describe, it, expect, beforeEach } from 'vitest';
import {
    instance,
    configureBasis,
    recordUpdate,
    recordEdge,
} from '../src/engine';

describe('Event graph TTL (pruneGraph)', () => {
    beforeEach(() => {
        instance.history.clear();
        instance.graph.clear();
        instance.violationMap.clear();
        instance.redundantLabels.clear();
        instance.loopCounters.clear();
        instance.pausedVariables.clear();
        instance.currentTickBatch.clear();
        instance.currentEffectSource = null;
        instance.lastStateUpdate = null;
        instance.lastCleanup = 0;
        configureBasis({ debug: true });
    });

    const eventKey = (ts: number, salt = 'aaaaa') => `Event_Tick_${ts}_${salt}`;

    it('drops Event_Tick_ sources older than EVENT_TTL and keeps fresh ones', () => {
        const now = Date.now();
        const stale = eventKey(now - 20_000, 'stale');
        const fresh = eventKey(now, 'fresh');

        instance.graph.set(stale, new Map([['Row.tsx -> isOpen', 1]]));
        instance.graph.set(fresh, new Map([['Row.tsx -> isOpen', 1]]));
        instance.graph.set('Modal.tsx -> effect', new Map([['Row.tsx -> isOpen', 2]]));

        recordUpdate('Row.tsx -> isOpen');

        expect(instance.graph.has(stale)).toBe(false);
        expect(instance.graph.has(fresh)).toBe(true);
        expect(instance.graph.has('Modal.tsx -> effect')).toBe(true);
    });

    it('does not prune an event that is still inside the 10s window', () => {
        const almostExpired = eventKey(Date.now() - 9_000, 'alive');
        instance.graph.set(almostExpired, new Map([['A', 1]]));

        recordUpdate('A');

        expect(instance.graph.has(almostExpired)).toBe(true);
    });

    it('never deletes a non-event source, even if the key contains numbers', () => {
        const notAnEvent = 'effect_L12_1738492000000';
        instance.graph.set(notAnEvent, new Map([['A', 1]]));

        recordUpdate('A');

        expect(instance.graph.has(notAnEvent)).toBe(true);
    });

    it('does not prune when debug is off', () => {
        configureBasis({ debug: false });
        const stale = eventKey(Date.now() - 20_000, 'stale');
        instance.graph.set(stale, new Map([['A', 1]]));

        recordUpdate('A');

        expect(instance.graph.has(stale)).toBe(true);
    });
});