// tests/hooks.test.tsx

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useState, useMemo, useEffect, useReducer, createContext, useContext, __test__ } from '../src/hooks';
import { BasisProvider } from '../src/context';

describe('Hooks Deep Coverage', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => <BasisProvider>{children}</BasisProvider>;

  beforeEach(() => {
    __test__.history.clear();
    vi.useFakeTimers();
  });

  it('useState tracks value and cleans up', () => {
    const { result, unmount } = renderHook(() => useState(0, 'c'), { wrapper });
    act(() => result.current[1](5));
    expect(result.current[0]).toBe(5);
    unmount();
    expect(__test__.history.has('c')).toBe(false);
  });

  it('useMemo logs and memoizes', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    renderHook(() => useMemo(() => 1, [], 'm'), { wrapper });
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('Valid Projection'), expect.any(String));
    spy.mockRestore();
  });

  it('useReducer works and tracks', () => {
    const { result } = renderHook(() => useReducer((s: any) => s + 1, 0, 'r'), { wrapper });
    act(() => result.current[1]({}));
    expect(result.current[0]).toBe(1);
  });

  it('useEffect tracks causality', () => {
    const spy = vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {});
    renderHook(() => {
      const [, s] = useState(0, 't');
      useEffect(() => { s(1); }, [], 'e');
    }, { wrapper });
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('CAUSAL LINK'), expect.any(String));
    spy.mockRestore();
  });

  it('Context hooks work correctly', () => {
    const Ctx = createContext("d", "L");
    const wrap = ({ children }: any) => <Ctx.Provider value="v">{children}</Ctx.Provider>;
    const { result } = renderHook(() => useContext(Ctx), { wrapper: wrap });
    expect(result.current).toBe("v");
  });
});