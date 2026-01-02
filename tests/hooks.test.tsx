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
  useRef,
  useCallback,
  useLayoutEffect,
  useTransition,
  useDeferredValue
} from '../src/hooks';
import { BasisProvider } from '../src/context';

describe('Hooks Deep Coverage', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => <BasisProvider>{children}</BasisProvider>;

  beforeEach(() => {
    __test__.history.clear();
    vi.useFakeTimers();
  });

  it('useState: tracks value and cleans up', () => {
    const { result, unmount } = renderHook(() => useState(0, 'c'), { wrapper });
    act(() => result.current[1](5));
    expect(result.current[0]).toBe(5);
    unmount();
    expect(__test__.history.has('c')).toBe(false);
  });

  it('useState: handles anonymous state', () => {
    renderHook(() => useState(0), { wrapper });
    expect(__test__.history.has('anonymous_state')).toBe(true);
  });

  it('useMemo: logs, memoizes and handles undefined deps', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => { });
    const { result } = renderHook(() => useMemo(() => 42, undefined, 'm'), { wrapper });

    expect(result.current).toBe(42);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('Valid Projection'), expect.any(String));
    spy.mockRestore();
  });

  it('useEffect: tracks causality and handles undefined deps', () => {
    const spy = vi.spyOn(console, 'groupCollapsed').mockImplementation(() => { });
    renderHook(() => {
      const [, s] = useState(0, 't');
      useEffect(() => { s(1); }, undefined, 'e');
    }, { wrapper });

    expect(spy).toHaveBeenCalledWith(expect.stringContaining('BASIS | CAUSALITY'), expect.any(String));
    spy.mockRestore();
  });

  describe('useReducer: complex argument patterns', () => {
    it('handles standard initialization (2 args + label)', () => {
      const reducer = (s: number) => s + 1;
      const { result } = renderHook(() => useReducer(reducer, 0, 'standard_label'), { wrapper });

      act(() => result.current[1]({}));
      expect(result.current[0]).toBe(1);
      expect(__test__.history.has('standard_label')).toBe(true);
    });

    it('handles lazy initialization (3 args + label)', () => {
      const reducer = (s: number) => s + 1;
      const initFn = (arg: number) => arg + 10;
      const { result } = renderHook(() => useReducer(reducer, 0, initFn, 'lazy_label'), { wrapper });

      expect(result.current[0]).toBe(10);
      act(() => result.current[1]({}));
      expect(result.current[0]).toBe(11);
      expect(__test__.history.has('lazy_label')).toBe(true);
    });

    it('handles anonymous reducer', () => {
      renderHook(() => useReducer((s: any) => s, 0), { wrapper });
      expect(__test__.history.has('anonymous_reducer')).toBe(true);
    });
  });

  it('createContext & useContext: work correctly with labels', () => {
    const Ctx = createContext("default", "ContextLabel");
    expect((Ctx as any)._basis_label).toBe("ContextLabel");

    const wrap = ({ children }: any) => <Ctx.Provider value="provided">{children}</Ctx.Provider>;
    const { result } = renderHook(() => useContext(Ctx), { wrapper: wrap });
    expect(result.current).toBe("provided");
  });

  it('useContext: works without provider', () => {
    const Ctx = createContext("default");
    const { result } = renderHook(() => useContext(Ctx), { wrapper });
    expect(result.current).toBe("default");
  });

  it('useRef: returns a stable ref object', () => {
    const { result } = renderHook(() => useRef(10));
    expect(result.current.current).toBe(10);
  });

  it('useCallback: logs and maintains stability', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { result } = renderHook(() => useCallback(() => "hello", [], "test_cb"), { wrapper });
    
    expect(result.current()).toBe("hello");
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('Stable Callback'), expect.any(String));
    spy.mockRestore();
  });

  it('useLayoutEffect: tracks causality correctly', () => {
    const spy = vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {});
    renderHook(() => {
      const [, s] = useState(0, 'state_var');
      useLayoutEffect(() => { s(1); }, [], 'layout_effect');
    }, { wrapper });

    expect(spy).toHaveBeenCalledWith(expect.stringContaining('BASIS | CAUSALITY'), expect.any(String));
    spy.mockRestore();
  });

  it('useTransition: logs when transition starts', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { result } = renderHook(() => useTransition("trans_label"), { wrapper });
    
    act(() => {
      result.current[1](() => {});
    });

    expect(spy).toHaveBeenCalledWith(expect.stringContaining('Transition Started'), expect.any(String));
    spy.mockRestore();
  });

  it('useDeferredValue: logs when value is deferred', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { rerender } = renderHook(({ val }) => useDeferredValue(val, "deferred_label"), {
      wrapper,
      initialProps: { val: 1 }
    });

    rerender({ val: 2 });

    expect(spy).toHaveBeenCalledWith(expect.stringContaining('Value Deferred'), expect.any(String));
    spy.mockRestore();
  });
});