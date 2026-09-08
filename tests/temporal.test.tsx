// tests/temporal.test.tsx

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { __testEngine__, beginEffectTracking, endEffectTracking } from '../src/engine';
import * as UI from '../src/core/logger';

const { registerVariable, recordUpdate, history, configureBasis, instance } = __testEngine__;

describe('Temporal Lead-Lag Logic (v0.6.x)', () => {
    let rafQueue: Function[];

    const flushFrame = async () => {
        rafQueue.splice(0).forEach(cb => cb(performance.now()));
        await vi.runAllTimersAsync();
    };

    beforeEach(() => {
        configureBasis({ debug: true });
        history.clear();
        instance.graph.clear();
        instance.violationMap.clear();
        instance.tick = 0;
        instance.currentEffectSource = null;
        instance.lastStateUpdate = null;

        rafQueue = [];
        vi.useFakeTimers();
        vi.stubGlobal('requestAnimationFrame', (cb: Function) => {
            rafQueue.push(cb);
            return rafQueue.length;
        });
        vi.stubGlobal('requestIdleCallback', (cb: Function) => cb({
            timeRemaining: () => 10,
            didTimeout: false
        }));
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('identifies Redundancy when updates are simultaneous', async () => {
        const spy = vi.spyOn(UI, 'displayRedundancyAlert');
        registerVariable('a');
        registerVariable('b');

        for (let i = 0; i < 5; i++) {
            recordUpdate('a');
            recordUpdate('b');
            await flushFrame();
        }

        expect(spy).toHaveBeenCalledWith(
            'a', expect.any(Object),
            'b', expect.any(Object),
            expect.any(Number)
        );
    });

    it('identifies Sync Leak when B follows A', async () => {
        registerVariable('source_A');
        registerVariable('target_B');

        // A on frame T, B on frame T+1. B must be effect-attributed
        // so detectCausalLeak does not treat it as Event_Tick-driven.
        for (let i = 0; i < 20; i++) {
            recordUpdate('source_A');
            await flushFrame();

            beginEffectTracking('source_A');
            recordUpdate('target_B');
            endEffectTracking();
            await flushFrame();
        }

        const leaks = instance.violationMap.get('source_A') || [];
        expect(leaks).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    type: 'causal_leak',
                    target: 'target_B',
                }),
            ])
        );
    });
});