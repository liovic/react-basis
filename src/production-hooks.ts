// src/production-hooks.ts

import * as React from 'react';
import type { FC, ReactNode, DependencyList, EffectCallback } from 'react';

interface React19Extended {
    useOptimistic?<S, P>(passthrough: S, reducer?: (state: S, payload: P) => S): [S, (payload: P) => void];
    useActionState?<State, Payload>(
        action: (state: State, payload: Payload) => Promise<State> | State,
        initialState: State,
        permalink?: string
    ): [state: State, dispatch: (payload: Payload) => void, isPending: boolean];
    use?<T>(usable: React.Usable<T>): T;
}

const React19 = React as unknown as React19Extended;

export const BasisProvider: FC<{
    children: ReactNode;
    debug?: boolean;
    showHUD?: boolean;
}> = ({ children }) => {
    return React.createElement(React.Fragment, null, children);
};

export const useState = <T>(initialState: T | (() => T), _label?: string) =>
    React.useState(initialState);

export function useReducer(reducer: any, initialArg: any, init?: any, _label?: string) {
    return typeof init === 'function'
        ? React.useReducer(reducer, initialArg, init)
        : React.useReducer(reducer, initialArg);
}

export const createContext = <T>(defaultValue: T, _label?: string) =>
    React.createContext(defaultValue);

export const useContext = React.useContext;

export const useEffect = (effect: EffectCallback, deps?: DependencyList, _label?: string) =>
    React.useEffect(effect, deps as DependencyList);

export const useLayoutEffect = (effect: EffectCallback, deps?: DependencyList, _label?: string) =>
    React.useLayoutEffect(effect, deps as DependencyList);

export const useInsertionEffect = React.useInsertionEffect;

export const useMemo = <T>(factory: () => T, deps?: DependencyList, _label?: string) =>
    React.useMemo(factory, deps as DependencyList);

export const useCallback = <T extends (...args: any[]) => any>(callback: T, deps?: DependencyList, _label?: string) =>
    React.useCallback(callback, deps as DependencyList);

export const useRef = <T>(initialValue: T, _label?: string) =>
    React.useRef(initialValue);

export const useTransition = (_label?: string) => React.useTransition();
export const useDeferredValue = <T>(value: T, _label?: string) => React.useDeferredValue(value);

export const useOptimistic = <S, P>(passthrough: S, reducer?: (state: S, payload: P) => S, _label?: string) =>
    React19.useOptimistic!(passthrough, reducer as (state: S, action: P) => S);

export const useActionState = <State, Payload>(
    action: (state: State, payload: Payload) => Promise<State> | State,
    initialState: State,
    permalink?: string,
    _label?: string
) => {
    const actualPermalink = typeof permalink === 'string' && _label === undefined ? undefined : permalink;
    return React19.useActionState!(action, initialState, actualPermalink);
};

export const use = React19.use!;

export const useId = (_label?: string) => React.useId();
export const useDebugValue = React.useDebugValue;
export const useImperativeHandle = React.useImperativeHandle;
export const useSyncExternalStore = React.useSyncExternalStore;