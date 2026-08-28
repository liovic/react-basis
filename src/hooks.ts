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
} from 'react';

import {
  registerVariable,
  unregisterVariable,
  recordUpdate,
  beginEffectTracking,
  endEffectTracking,
  history as engineHistory
} from './engine';
import { SignalRole } from './core/types';
import { INSTANCE_SEP } from './core/constants';

// --- Internal Type Helpers ---

let anonCount = 0;
const getFallbackLabel = (type: string) => `anon_${type}_${anonCount++}`;

const reactUseId = (React as unknown as { useId?: () => string }).useId;
let legacyInstanceCounter = 0;

const useInstanceId = (): string => {
  const [legacyId] = reactUseState(() =>
    typeof reactUseId === 'function' ? '' : `legacy_${legacyInstanceCounter++}`
  );
  return typeof reactUseId === 'function' ? reactUseId() : legacyId;
};

const withInstance = (label: string, instanceId: string) =>
  `${label}${INSTANCE_SEP}${instanceId}`;

/**
 * Standard React Reducer type inference helpers.
 */
type GetReducerState<R extends React.Reducer<any, any>> = R extends React.Reducer<infer S, any> ? S : never;
type GetReducerAction<R extends React.Reducer<any, any>> = R extends React.Reducer<any, infer A> ? A : never;

interface BasisContext<T> extends React.Context<T> {
  _basis_label?: string;
}

/**
 * React 19 Type Definitions for strictness.
 */
interface React19Extended {
  useOptimistic<S, P>(passthrough: S, reducer?: (state: S, payload: P) => S): [S, (payload: P) => void];
  useActionState<State, Payload>(
    action: (state: State, payload: Payload) => Promise<State> | State,
    initialState: State,
    permalink?: string
  ): [state: State, dispatch: (payload: Payload) => void, isPending: boolean];
  use<T>(usable: React.Usable<T>): T;
}

const React19 = React as unknown as React19Extended;

// --- useState ---

export function useState<S>(
  initialState: S | (() => S),
  label?: string
): [S, React.Dispatch<React.SetStateAction<S>>] {
  const [val, setVal] = reactUseState(initialState);
  const effectiveLabel = reactUseRef(label || getFallbackLabel('state')).current;
  const instanceId = useInstanceId();
  const storageKey = withInstance(effectiveLabel, instanceId);

  reactUseEffect(() => {
    registerVariable(storageKey, { role: SignalRole.LOCAL });
    return () => { unregisterVariable(storageKey); };
  }, [storageKey]);

  const setter = reactUseCallback((value: React.SetStateAction<S>) => {
    if (recordUpdate(storageKey)) {
      setVal(value);
    }
  }, [storageKey]);

  return [val, setter];
}

// --- useReducer ---

/**
 * PUBLIC OVERLOAD: Lazy initialization
 */
export function useReducer<R extends React.Reducer<any, any>, I>(
  reducer: R,
  initializerArg: I,
  initializer: (arg: I) => GetReducerState<R>,
  label?: string
): [GetReducerState<R>, React.Dispatch<GetReducerAction<R>>];

/**
 * PUBLIC OVERLOAD: Direct initialization
 */
export function useReducer<R extends React.Reducer<any, any>>(
  reducer: R,
  initialState: GetReducerState<R>,
  initializer?: undefined,
  label?: string
): [GetReducerState<R>, React.Dispatch<GetReducerAction<R>>];

/**
 * FINAL IMPLEMENTATION
 */
export function useReducer<R extends React.Reducer<any, any>, I>(
  reducer: R,
  initialArg: I | GetReducerState<R>,
  init?: ((arg: I) => GetReducerState<R>) | string,
  label?: string
): [GetReducerState<R>, React.Dispatch<GetReducerAction<R>>] {
  const isLazy = typeof init === 'function';

  // v0.5.x Label Extraction: prioritize 4th arg, fallback to 3rd if string (Babel behavior)
  const providedLabel = label || (typeof init === 'string' ? init : undefined);
  const effectiveLabel = reactUseRef(providedLabel || getFallbackLabel('reducer')).current;
  const instanceId = useInstanceId();
  const storageKey = withInstance(effectiveLabel, instanceId);

  const [state, dispatch] = isLazy
    ? reactUseReducer(reducer, initialArg as I, init as (arg: I) => GetReducerState<R>)
    : reactUseReducer(reducer, initialArg as GetReducerState<R>);

  reactUseEffect(() => {
    registerVariable(storageKey, { role: SignalRole.LOCAL });
    return () => { unregisterVariable(storageKey); };
  }, [storageKey]);

  const basisDispatch = reactUseCallback((action: GetReducerAction<R>) => {
    if (recordUpdate(storageKey)) {
      dispatch(action);
    }
  }, [storageKey, dispatch]);

  return [state, basisDispatch];
}

// --- Context ---

export function createContext<T>(defaultValue: T, label?: string): React.Context<T> {
  const context = reactCreateContext(defaultValue) as BasisContext<T>;
  const effectiveLabel = label || getFallbackLabel('context');

  // Use non-enumerable property to store the Basis label
  Object.defineProperty(context, '_basis_label', {
    value: effectiveLabel,
    writable: false,
    enumerable: false
  });

  return context;
}

export function useContext<T>(context: React.Context<T>): T {
  const val = reactUseContext(context);
  const label = (context as BasisContext<T>)._basis_label;

  reactUseLayoutEffect(() => {
    if (label) {
      registerVariable(label, { role: SignalRole.CONTEXT });
      recordUpdate(label);
    }
  }, [val, label]);

  return val;
}

// --- Projections ---

export function useMemo<T>(factory: () => T, deps: React.DependencyList | undefined, label?: string): T {
  const effectiveLabel = reactUseRef(label || getFallbackLabel('proj')).current;
  const instanceId = useInstanceId();
  const storageKey = withInstance(effectiveLabel, instanceId);
  reactUseEffect(() => {
    registerVariable(storageKey, { role: SignalRole.PROJECTION });
    return () => { unregisterVariable(storageKey); };
  }, [storageKey]);
  return reactUseMemo(factory, deps || []);
}

export function useCallback<T extends (...args: unknown[]) => unknown>(callback: T, deps: React.DependencyList, label?: string): T {
  const effectiveLabel = reactUseRef(label || getFallbackLabel('cb')).current;
  const instanceId = useInstanceId();
  const storageKey = withInstance(effectiveLabel, instanceId);
  reactUseEffect(() => {
    registerVariable(storageKey, { role: SignalRole.PROJECTION });
    return () => { unregisterVariable(storageKey); };
  }, [storageKey]);
  return reactUseCallback(callback, deps);
}

// --- Effects ---

export function useEffect(effect: React.EffectCallback, deps?: React.DependencyList, label?: string): void {
  const effectiveLabel = label || 'anonymous_effect';
  const instanceId = useInstanceId();
  const storageKey = withInstance(effectiveLabel, instanceId);
  reactUseEffect(() => {
    beginEffectTracking(storageKey);
    const destructor = effect();
    endEffectTracking();
    return typeof destructor === 'function' ? destructor : undefined;
  }, deps);
}

export function useLayoutEffect(effect: React.EffectCallback, deps?: React.DependencyList, label?: string): void {
  const effectiveLabel = label || 'anonymous_layout_effect';
  const instanceId = useInstanceId();
  const storageKey = withInstance(effectiveLabel, instanceId);
  reactUseLayoutEffect(() => {
    beginEffectTracking(storageKey);
    const destructor = effect();
    endEffectTracking();
    return typeof destructor === 'function' ? destructor : undefined;
  }, deps);
}

// --- React 19 ---

export function useOptimistic<S, P>(
  passthrough: S,
  reducer?: (state: S, payload: P) => S,
  label?: string
): [S, (payload: P) => void] {
  const effectiveLabel = reactUseRef(label || getFallbackLabel('optimistic')).current;
  const instanceId = useInstanceId();
  const storageKey = withInstance(effectiveLabel, instanceId);
  reactUseEffect(() => {
    registerVariable(storageKey, { role: SignalRole.LOCAL });
    return () => { unregisterVariable(storageKey); };
  }, [storageKey]);

  const [state, reactAddOptimistic] = React19.useOptimistic(passthrough, reducer);

  const addOptimistic = reactUseCallback((payload: P) => {
    if (recordUpdate(storageKey)) {
      reactAddOptimistic(payload);
    }
  }, [storageKey, reactAddOptimistic]);

  return [state, addOptimistic];
}

export function useActionState<State, Payload>(
  action: (state: State, payload: Payload) => Promise<State> | State,
  initialState: State,
  permalink?: string,
  label?: string
): [state: State, dispatch: (payload: Payload) => void, isPending: boolean] {

  const isLabelArg = typeof permalink === 'string' && label === undefined;
  const effectiveLabel = reactUseRef(isLabelArg ? (permalink as string) : (label || getFallbackLabel('action_state'))).current;
  const actualPermalink = isLabelArg ? undefined : permalink;
  const instanceId = useInstanceId();
  const storageKey = withInstance(effectiveLabel, instanceId);

  const [state, reactDispatch, isPending] = React19.useActionState(action, initialState, actualPermalink);

  reactUseEffect(() => {
    registerVariable(storageKey, { role: SignalRole.LOCAL });
    return () => { unregisterVariable(storageKey); };
  }, [storageKey]);

  const basisDispatch = reactUseCallback((payload: Payload) => {
    if (recordUpdate(storageKey)) {
      reactDispatch(payload);
    }
  }, [storageKey, reactDispatch]);

  return [state, basisDispatch, isPending];
}

// --- Direct Exports ---
export const useRef = reactUseRef;
export const useId = React.useId;
export const useDebugValue = React.useDebugValue;
export const useImperativeHandle = React.useImperativeHandle;
export const useInsertionEffect = React.useInsertionEffect;
export const useSyncExternalStore = reactUseSyncExternalStore;
export const useTransition = reactUseTransition;
export const useDeferredValue = reactUseDeferredValue;
export const use = React19.use;

export const __test__ = {
  registerVariable,
  history: engineHistory,
  unregisterVariable,
  recordUpdate,
  beginEffectTracking,
  endEffectTracking
};