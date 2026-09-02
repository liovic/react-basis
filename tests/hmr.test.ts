// tests/hmr.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('HMR module-reload survival', () => {
    beforeEach(() => {
        delete (globalThis as any)[Symbol.for('__basis_engine_instance__')];
        vi.resetModules();
    });

    it('reuses the same engine instance object across a simulated module reload', async () => {
        const engineA = await import('../src/engine');
        engineA.registerVariable('pre_reload_var');
        expect(engineA.history.has('pre_reload_var')).toBe(true);

        vi.resetModules();
        const engineB = await import('../src/engine');

        expect(engineB.instance).toBe(engineA.instance);
        expect(engineB.history.has('pre_reload_var')).toBe(true);
    });

    it('does not let a component that unmounted before reload keep polluting the report after reload', async () => {
        const engineA = await import('../src/engine');
        engineA.configureBasis({ debug: true });
        engineA.registerVariable('ghost_component_var');
        engineA.recordEdge('Event_Tick_1', 'ghost_component_var');
        engineA.unregisterVariable('ghost_component_var');

        vi.resetModules();
        const engineB = await import('../src/engine');

        const stillReferenced = Array.from(engineB.instance.graph.values())
            .some(targets => targets.has('ghost_component_var'));
        expect(stillReferenced).toBe(false);
    });
});