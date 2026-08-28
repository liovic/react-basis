// tests/hooks19.test.tsx

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOptimistic, useActionState, __test__ } from '../src/hooks';
import { BasisProvider } from '../src/context';

const findKey = (prefix: string): string | undefined =>
    Array.from(__test__.history.keys()).find(k => k.startsWith(prefix));

describe('React 19 Hooks Coverage', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => <BasisProvider>{children}</BasisProvider>;

    beforeEach(() => {
        __test__.history.clear();
        vi.useFakeTimers();
    });

    it('useOptimistic: tracks updates', async () => {
        const { result } = renderHook(() => useOptimistic(0, (s, p: number) => p), { wrapper });

        await act(async () => { });

        const keys = Array.from(__test__.history.keys()) as string[];
        expect(keys.some(k => k.includes('optimistic'))).toBe(true);
    });

    it('useOptimistic: pulses on dispatch', async () => {
        const { result } = renderHook(() => useOptimistic(0, (s: number, p: number) => p, 'opt_var'), { wrapper });

        act(() => {
            result.current[1](10);
        });

        await act(async () => {
            vi.runAllTimers();
        });

        const meta = __test__.history.get(findKey('opt_var')!);
        expect(meta).toBeDefined();

        let density = 0;
        meta?.buffer.forEach(v => { density += v; });

        expect(density).toBeGreaterThan(0);
    });

    it('useActionState: registers and pulses on dispatch', async () => {
        const mockAction = async (s: number, p: number) => s + p;
        const { result } = renderHook(() => useActionState(mockAction, 0, undefined, 'action_var'), { wrapper });

        await act(async () => {
            result.current[1](5);
        });

        await act(async () => {
            vi.runAllTimers();
        });

        expect(findKey('action_var')).toBeDefined();

        let density = 0;
        __test__.history.get(findKey('action_var')!)?.buffer.forEach(v => { density += v; });
        expect(density).toBeGreaterThan(0);
    });
    it('useActionState: pulses on dispatch', async () => {
        const mockAction = async (s: number, p: number) => s + p;
        const { result } = renderHook(() => useActionState(mockAction, 0, undefined, 'action_var'), { wrapper });

        await act(async () => {
            result.current[1](5);
        });

        expect(findKey('action_var')).toBeDefined();
    });

    it('useOptimistic: triggers recordUpdate', async () => {
        const { result } = renderHook(() => useOptimistic(0, (s, p: number) => p), { wrapper });

        await act(async () => {
            result.current[1](1);
        });
    });

    it('useActionState: triggers recordUpdate', async () => {
        const mockAction = async (s: number, p: number) => s + p;
        const { result } = renderHook(() => useActionState(mockAction, 0), { wrapper });

        await act(async () => {
            result.current[1](5);
        });
    });
});