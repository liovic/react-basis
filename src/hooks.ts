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
  Dispatch
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
  CSSProperties
} from 'react';

export function useState<T>(initialValue: T, label?: string): [T, (val: T | ((p: T) => T)) => void] {
  const [val, setVal] = reactUseState(initialValue);
  const effectiveLabel = label || 'anonymous_state';

  reactUseEffect(() => {
    registerVariable(effectiveLabel);
    return () => unregisterVariable(effectiveLabel);
  }, [effectiveLabel]);

  const setter = useCallback((newValue: any) => {
    if (recordUpdate(effectiveLabel)) {
      setVal(newValue);
    }
  }, [effectiveLabel]);

  return [val, setter];
}

export function useMemo<T>(factory: () => T, deps: any[], label?: string): T {
  const effectiveLabel = label || 'anonymous_projection';
  
  reactUseEffect(() => {
    if ((window as any)._basis_debug !== false) {
      console.log(`%c [Basis] Valid Projection: "${effectiveLabel}" `, "color: #2ecc71; font-weight: bold;");
    }
  }, [effectiveLabel]);

  return reactUseMemo(factory, deps);
}

export function useEffect(effect: () => void | (() => void), deps?: any[], label?: string) {
  const effectiveLabel = label || 'anonymous_effect';

  reactUseEffect(() => {
    beginEffectTracking(effectiveLabel);
    const cleanup = effect();
    endEffectTracking();
    return cleanup;
  }, deps);
}

export function useReducer<S, A>(
  reducer: Reducer<S, A>,
  initialState: S,
  label?: string
): [S, Dispatch<A>] {
  const [state, dispatch] = reactUseReducer(reducer, initialState);
  const effectiveLabel = label || 'anonymous_reducer';

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
  registerVariable: engine.registerVariable,
  unregisterVariable: engine.unregisterVariable,
  recordUpdate: engine.recordUpdate,
  beginEffectTracking: engine.beginEffectTracking,
  endEffectTracking: engine.endEffectTracking,
  history: (engine as any).history,
  currentTickBatch: (engine as any).currentTickBatch
};