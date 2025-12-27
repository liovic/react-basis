// src/hooks.ts

import { 
  useState as reactUseState, 
  useEffect as reactUseEffect, 
  useMemo as reactUseMemo, 
  useReducer as reactUseReducer,
  useContext as reactUseContext,
  createContext as reactCreateContext,
  useCallback 
} from 'react';

import type { 
  Reducer, 
  Context,
  Dispatch,
  SetStateAction,
  DependencyList,
  EffectCallback
} from 'react';

import { 
  registerVariable, 
  unregisterVariable, 
  recordUpdate, 
  beginEffectTracking, 
  endEffectTracking 
} from './engine';

import * as engine from './engine';

export type { 
  ReactNode, 
  FC, 
  PropsWithChildren, 
  Context, 
  ReactElement,
  Dispatch,
  SetStateAction,
  Reducer,
  CSSProperties,
  EffectCallback,
  DependencyList
} from 'react';

export function useState<T>(initialValue: T, label?: string): [T, Dispatch<SetStateAction<T>>] {
  const [val, setVal] = reactUseState(initialValue);
  const effectiveLabel = label || 'anonymous_state';

  reactUseEffect(() => {
    registerVariable(effectiveLabel);
    return () => unregisterVariable(effectiveLabel);
  }, [effectiveLabel]);

  const setter = useCallback((newValue: SetStateAction<T>) => {
    if (recordUpdate(effectiveLabel)) {
      setVal(newValue);
    }
  }, [effectiveLabel]);

  return [val, setter];
}

export function useMemo<T>(factory: () => T, depsOrLabel?: DependencyList | string, label?: string): T {
  const isLabelAsSecondArg = typeof depsOrLabel === 'string';
  
  const actualDeps = isLabelAsSecondArg ? undefined : (depsOrLabel as DependencyList);
  const effectiveLabel = isLabelAsSecondArg ? (depsOrLabel as string) : (label || 'anonymous_projection');
  
  reactUseEffect(() => {
    if ((window as any)._basis_debug !== false) {
      console.log(`%c [Basis] Valid Projection: "${effectiveLabel}" `, "color: #2ecc71; font-weight: bold;");
    }
  }, [effectiveLabel]);

  return reactUseMemo(factory, actualDeps || []);
}

export function useEffect(effect: EffectCallback, depsOrLabel?: DependencyList | string, label?: string) {
  const isLabelAsSecondArg = typeof depsOrLabel === 'string';
  
  const actualDeps = isLabelAsSecondArg ? undefined : (depsOrLabel as DependencyList);
  const effectiveLabel = isLabelAsSecondArg ? (depsOrLabel as string) : (label || 'anonymous_effect');

  reactUseEffect(() => {
    beginEffectTracking(effectiveLabel);
    const cleanup = effect();
    endEffectTracking();
    return cleanup;
  }, actualDeps);
}

export function useReducer<S, A, I>(
  reducer: Reducer<S, A>,
  initialArg: I & S,
  init?: any,
  label?: string
): [S, Dispatch<A>] {

  const effectiveLabel = typeof init === 'string' ? init : (label || 'anonymous_reducer');

  const reactInit = typeof init === 'function' ? init : undefined;

  const [state, dispatch] = reactUseReducer(reducer, initialArg, reactInit);

  reactUseEffect(() => {
    registerVariable(effectiveLabel);
    return () => unregisterVariable(effectiveLabel);
  }, [effectiveLabel]);

  const basisDispatch = useCallback((action: A) => {
    if (recordUpdate(effectiveLabel)) {
      dispatch(action);
    }
  }, [effectiveLabel]);

  return [state, basisDispatch];
}

export function createContext<T>(defaultValue: T, label?: string): Context<T> {
  const context = reactCreateContext(defaultValue);
  if (label) {
    (context as any)._basis_label = label;
  }
  return context;
}

export function useContext<T>(context: Context<T>): T {
  return reactUseContext(context);
}

export const __test__ = {
  registerVariable,
  unregisterVariable,
  recordUpdate,
  beginEffectTracking,
  endEffectTracking,
  history: (engine as any).history,
  currentTickBatch: (engine as any).currentTickBatch
};