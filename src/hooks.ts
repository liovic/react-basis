// src/hooks.ts
import * as React from 'react';
import {
  useState as reactUseState,
  useEffect as reactUseEffect,
  useMemo as reactUseMemo,
  useReducer as reactUseReducer,
  useContext as reactUseContext,
  useSyncExternalStore as reactUseSyncExternalStore, 
  createContext as reactCreateContext,
  useRef as reactUseRef,
  useLayoutEffect as reactUseLayoutEffect,
  useCallback as reactUseCallback,
  useTransition as reactUseTransition,
  useDeferredValue as reactUseDeferredValue,
  use as reactUse,
  useOptimistic as reactUseOptimistic,
  useActionState as reactUseActionState
} from 'react';

import { registerVariable, unregisterVariable, recordUpdate, beginEffectTracking, endEffectTracking, config } from './engine';
import * as engine from './engine';

type GetReducerState<R extends React.Reducer<any, any>> = R extends React.Reducer<infer S, any> ? S : never;
type GetReducerAction<R extends React.Reducer<any, any>> = R extends React.Reducer<any, infer A> ? A : never;

export function useState<S>(initialState: S | (() => S), label?: string): [S, React.Dispatch<React.SetStateAction<S>>] {
  const [val, setVal] = reactUseState(initialState);
  const effectiveLabel = label || 'anonymous_state';
  reactUseEffect(() => { registerVariable(effectiveLabel); return () => unregisterVariable(effectiveLabel); }, [effectiveLabel]);
  const setter = reactUseCallback((newValue: any) => { if (recordUpdate(effectiveLabel)) setVal(newValue); }, [effectiveLabel, setVal]);
  return [val, setter];
}

export function useRef<T>(initialValue: T): React.RefObject<T>;
export function useRef<T>(initialValue: T | null): React.RefObject<T>;
export function useRef<T = undefined>(): React.MutableRefObject<T | undefined>;
export function useRef<T>(initialValue?: T, _label?: string): any { return reactUseRef(initialValue); }

export function useReducer<R extends React.Reducer<any, any>, I>(reducer: R, initialArg: I, init?: any, label?: string): [GetReducerState<R>, React.Dispatch<GetReducerAction<R>>] {
  const effectiveLabel = typeof init === 'string' ? init : (label || 'anonymous_reducer');
  const reactInit = typeof init === 'function' ? init : undefined;
  const [state, dispatch] = reactUseReducer(reducer, initialArg, reactInit);
  reactUseEffect(() => { registerVariable(effectiveLabel); return () => unregisterVariable(effectiveLabel); }, [effectiveLabel]);
  const basisDispatch = reactUseCallback((action: any) => { if (recordUpdate(effectiveLabel)) dispatch(action); }, [effectiveLabel, dispatch]);
  return [state, basisDispatch] as any;
}

export function useMemo<T>(factory: () => T, deps: React.DependencyList | undefined, label?: string): T {
  const effectiveLabel = label || 'anonymous_projection';
  reactUseEffect(() => { if (config.debug) console.log(`%c [Basis] Valid Projection: "${effectiveLabel}" `, "color: #2ecc71; font-weight: bold;"); }, [effectiveLabel]);
  return reactUseMemo(factory, deps || []);
}

export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: React.DependencyList, label?: string): T {
  const effectiveLabel = label || 'anonymous_callback';
  reactUseEffect(() => { if (config.debug) console.log(`%c [Basis] Stable Callback: "${effectiveLabel}" `, "color: #2ecc71; font-weight: bold;"); }, [effectiveLabel]);
  return reactUseCallback(callback, deps);
}

export function useEffect(effect: React.EffectCallback, deps?: React.DependencyList, label?: string) {
  const effectiveLabel = label || 'anonymous_effect';
  reactUseEffect(() => { beginEffectTracking(effectiveLabel); const cleanup = effect(); endEffectTracking(); return cleanup; }, deps);
}

export function useLayoutEffect(effect: React.EffectCallback, deps?: React.DependencyList, label?: string) {
  const effectiveLabel = label || 'anonymous_layout_effect';
  reactUseLayoutEffect(() => { beginEffectTracking(effectiveLabel); const cleanup = effect(); endEffectTracking(); return cleanup; }, deps);
}

export function useTransition(_label?: string): [boolean, (callback: () => void) => void] {
  const [isPending, startTransition] = reactUseTransition();
  const effectiveLabel = _label || 'anonymous_transition';
  const basisStartTransition = (callback: () => void) => {
    if (config.debug) console.log(`%c [Basis] Transition Started: "${effectiveLabel}" `, "color: #e67e22; font-weight: bold;");
    startTransition(callback);
  };
  return [isPending, basisStartTransition];
}

export function useDeferredValue<T>(value: T, initialValueOrLabel?: T | string, label?: string): T {
  const isLabelAsSecondArg = typeof initialValueOrLabel === 'string' && label === undefined;
  const actualInitialValue = isLabelAsSecondArg ? undefined : initialValueOrLabel as T;
  const effectiveLabel = isLabelAsSecondArg ? (initialValueOrLabel as string) : (label || 'anonymous_deferred');
  const deferredValue = reactUseDeferredValue(value, actualInitialValue);
  reactUseEffect(() => { if (config.debug && value !== deferredValue) console.log(`%c [Basis] Value Deferred: "${effectiveLabel}" `, "color: #e67e22; font-weight: bold;"); }, [value, deferredValue, effectiveLabel]);
  return deferredValue;
}

export function createContext<T>(defaultValue: T, label?: string): React.Context<T> {
  const context = reactCreateContext(defaultValue);
  if (label) (context as any)._basis_label = label;
  return context;
}

export const useContext = reactUseContext;
export const useId = (label?: string) => React.useId();
export const useDebugValue = React.useDebugValue;
export const useImperativeHandle = React.useImperativeHandle;
export const useInsertionEffect = React.useInsertionEffect;
export const useSyncExternalStore = (reactUseSyncExternalStore as any);

export function use<T>(usable: React.Usable<T>): T {
  return reactUse(usable);
}

export function useOptimistic<S, P>(
  passthrough: S,
  reducer?: (state: S, payload: P) => S,
  label?: string
): [S, (payload: P) => void] {
  const effectiveLabel = label || 'anonymous_optimistic';
  
  reactUseEffect(() => {
    registerVariable(effectiveLabel);
    return () => unregisterVariable(effectiveLabel);
  }, [effectiveLabel]);

  const [state, reactAddOptimistic] = (React as any).useOptimistic(passthrough, reducer) as [S, (p: P) => void];

  const addOptimistic = reactUseCallback((payload: P) => {
    if (recordUpdate(effectiveLabel)) {
      reactAddOptimistic(payload);
    }
  }, [effectiveLabel, reactAddOptimistic]);

  return [state, addOptimistic];
}

export function useActionState<State, Payload>(
  action: (state: State, payload: Payload) => Promise<State> | State,
  initialState: State,
  permalink?: string,
  label?: string
): [state: State, dispatch: (payload: Payload) => void, isPending: boolean] {
  
  const isLabelAsThirdArg = typeof permalink === 'string' && label === undefined;
  const actualPermalink = isLabelAsThirdArg ? undefined : permalink;
  const effectiveLabel = isLabelAsThirdArg ? (permalink as string) : (label || 'anonymous_action_state');

  const [state, reactDispatch, isPending] = (React as any).useActionState(
    action, 
    initialState, 
    actualPermalink
  ) as [State, (p: Payload) => void, boolean];

  reactUseEffect(() => {
    registerVariable(effectiveLabel);
    return () => unregisterVariable(effectiveLabel);
  }, [effectiveLabel]);

  const basisDispatch = reactUseCallback((payload: Payload) => {
    if (recordUpdate(effectiveLabel)) {
      reactDispatch(payload);
    }
  }, [effectiveLabel, reactDispatch]);

  return [state, basisDispatch, isPending];
}

export const __test__ = { registerVariable, unregisterVariable, recordUpdate, beginEffectTracking, endEffectTracking, history: (engine as any).history, currentTickBatch: (engine as any).currentTickBatch };