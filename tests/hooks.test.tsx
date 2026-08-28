// tests/hooks.test.tsx

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
    useState,
    useMemo,
    useEffect,
    useReducer,
    createContext,
    useContext,
    __test__,
    useCallback,
    useTransition,
    useDeferredValue,
    useId,
    useSyncExternalStore,
    useInsertionEffect,
    useActionState
} from '../src/hooks';
import { BasisProvider } from '../src/context';
import * as UI from '../src/core/logger';

const findKey = (prefix: string): string | undefined =>
    Array.from(__test__.history.keys()).find(k => k.startsWith(prefix));

describe('Hooks Deep Coverage (v0.6.x Graph Era)', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
        <BasisProvider debug={true}>{children}</BasisProvider>
    );

    beforeEach(() => {
        // Reset the engine state before every test to ensure isolation
        __test__.history.clear();

        // Ensure Effect Tracking is reset so previous tests don't bleed into next ones
        __test__.endEffectTracking();

        vi.useFakeTimers();
        vi.clearAllMocks();
    });

    it('useState: tracks value and cleans up', () => {
        const { result, unmount } = renderHook(() => useState(0, 'test_state'), { wrapper });

        act(() => {
            result.current[1](5);
        });

        expect(result.current[0]).toBe(5);
        expect(findKey('test_state')).toBeDefined();

        unmount();
        expect(findKey('test_state')).toBeUndefined();
    });

    it('useState: handles anonymous state fallback', () => {
        renderHook(() => useState(0), { wrapper });
        const keys = Array.from(__test__.history.keys());
        // Should generate "anon_state_0" or similar
        expect(keys.some(k => k.startsWith('anon_state_'))).toBe(true);
    });

    it('useMemo: registers as PROJECTION role', () => {
        renderHook(() => useMemo(() => 42, [], 'test_proj'), { wrapper });

        const meta = __test__.history.get(findKey('test_proj')!);
        expect(meta).toBeDefined();
        expect(meta?.role).toBe('proj');
    });

    it('useEffect: tracks causality (Side-Effect Driver)', () => {
        // Mock the UI to verify the engine identified the causal link
        const spy = vi.spyOn(UI, 'displayCausalHint').mockImplementation(() => { });

        renderHook(() => {
            const [, s] = useState(0, 'target');

            // This effect will be registered as the "Source" in the graph
            useEffect(() => {
                s(1); // Triggering state inside effect
            }, [], 'source_effect');
        }, { wrapper });

        // The engine should detect that 'source_effect' is currently active 
        // when 'target' updates.
        expect(spy).toHaveBeenCalledWith(
            expect.stringContaining('target'),
            expect.any(Object),
            expect.stringContaining('source_effect'),
            expect.any(Object)
        );
        spy.mockRestore();
    });

    describe('useReducer: initialization patterns', () => {
        it('handles standard initialization', () => {
            const reducer = (s: number) => s + 1;
            const { result } = renderHook(() => useReducer(reducer, 10, undefined, 'reducer_label'), { wrapper });

            act(() => {
                result.current[1]({});
            });
            expect(result.current[0]).toBe(11);
            expect(findKey('reducer_label')).toBeDefined();
        });

        it('handles lazy initialization', () => {
            const reducer = (s: number) => s + 1;
            const initFn = (arg: number) => arg + 100;
            const { result } = renderHook(() => useReducer(reducer, 0, initFn, 'lazy_label'), { wrapper });

            expect(result.current[0]).toBe(100);
            expect(findKey('lazy_label')).toBeDefined();
        });
    });

    it('createContext & useContext: registers labels and tracks subspace', () => {
        const Ctx = createContext("default", "AuthContext");
        // Verify implementation detail: internal label storage
        expect((Ctx as any)._basis_label).toBe("AuthContext");

        const wrap = ({ children }: any) => <Ctx.Provider value="active">{children}</Ctx.Provider>;

        // Render hook inside the provider
        const { result } = renderHook(() => useContext(Ctx), { wrapper: wrap });

        expect(result.current).toBe("active");

        // Verify engine registration
        expect(__test__.history.has('AuthContext')).toBe(true);
        expect(__test__.history.get('AuthContext')?.role).toBe('context');
    });

    it('useCallback: registers as PROJECTION', () => {
        const { result } = renderHook(() => useCallback(() => "hello", [], "test_cb"), { wrapper });

        expect(result.current()).toBe("hello");
        expect(__test__.history.get(findKey('test_cb')!)?.role).toBe('proj');
    });

    it('useTransition: returns standard transition tuple', () => {
        const { result } = renderHook(() => useTransition(), { wrapper });
        expect(result.current[0]).toBe(false); // isPending
        expect(typeof result.current[1]).toBe('function'); // startTransition
    });

    it('useDeferredValue: returns standard value', () => {
        const { result } = renderHook(() => useDeferredValue("test"), { wrapper });
        expect(result.current).toBe("test");
    });

    it('useId: returns a valid react id', () => {
        const { result } = renderHook(() => useId(), { wrapper });
        expect(typeof result.current).toBe('string');
    });

    it('useSyncExternalStore: subscribes correctly', () => {
        const subscribe = vi.fn(() => () => { });
        const getSnapshot = () => "data";
        const { result } = renderHook(() => useSyncExternalStore(subscribe, getSnapshot), { wrapper });

        expect(result.current).toBe("data");
        expect(subscribe).toHaveBeenCalled();
    });

    it('useInsertionEffect: executes', () => {
        const effect = vi.fn();
        renderHook(() => useInsertionEffect(effect), { wrapper });
        expect(effect).toHaveBeenCalled();
    });

    it('useActionState: handles label as third argument (Babel style)', async () => {
        // React 19 hook test
        const mockAction = async (s: number) => s + 1;

        // We pass the label as the 3rd arg (permalink in standard React, label in Basis overload)
        const { result } = renderHook(() => useActionState(mockAction, 0, 'babel_label'), { wrapper });

        expect(findKey('babel_label')).toBeDefined();
    });
});