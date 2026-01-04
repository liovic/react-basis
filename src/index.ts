// src/index.ts

import * as ReactNamespace from 'react';
import * as ReactDOMNamespace from 'react-dom';

import { 
  history, currentTickBatch, config, configureBasis, 
  registerVariable, unregisterVariable, recordUpdate, 
  printBasisHealthReport, beginEffectTracking, endEffectTracking, __testEngine__ 
} from './engine';

import { BasisProvider, useBasisConfig } from './context';

import { 
  useState, useReducer, useMemo, useCallback, useEffect, 
  useLayoutEffect, useRef, createContext, useContext, useId, 
  useDebugValue, useImperativeHandle, useInsertionEffect, 
  useSyncExternalStore, useTransition, useDeferredValue, __test__, 
  use,
  useOptimistic,
  useActionState
} from './hooks';

// 1. BASIS EXPORTS
export { 
  history, currentTickBatch, config, configureBasis, 
  registerVariable, unregisterVariable, recordUpdate, 
  printBasisHealthReport, beginEffectTracking, endEffectTracking, 
  __testEngine__, BasisProvider, useBasisConfig, __test__ 
};

// 2. WRAPPED & REACT 19 HOOKS EXPORTS
export { 
  useState, useReducer, useMemo, useCallback, useEffect, 
  useLayoutEffect, useRef, createContext, useContext, useId, 
  useDebugValue, useImperativeHandle, useInsertionEffect, 
  useSyncExternalStore, useTransition, useDeferredValue, use, useOptimistic, useActionState 
};

export const Children = ReactNamespace.Children;
export const Component = ReactNamespace.Component;
export const Fragment = ReactNamespace.Fragment;
export const Profiler = ReactNamespace.Profiler;
export const PureComponent = ReactNamespace.PureComponent;
export const StrictMode = ReactNamespace.StrictMode;
export const Suspense = ReactNamespace.Suspense;
export const cloneElement = ReactNamespace.cloneElement;
export const createRef = ReactNamespace.createRef;
export const forwardRef = ReactNamespace.forwardRef;
export const isValidElement = ReactNamespace.isValidElement;
export const lazy = ReactNamespace.lazy;
export const memo = ReactNamespace.memo;
export const startTransition = ReactNamespace.startTransition;
export const version = ReactNamespace.version;

// 4. REACT DOM PROXY
const RD: any = ReactDOMNamespace;
export const createPortal = RD.createPortal;
export const flushSync = RD.flushSync;

// 5. NAMESPACE & DEFAULT
export { ReactNamespace as React };
export default ReactNamespace;

// 6. TYPES (TypeScript-only)
export type {
  ReactNode, ReactElement, ReactPortal, FC, ComponentType,
  ComponentProps, ComponentPropsWithoutRef, ComponentPropsWithRef,
  ElementType, JSX, CSSProperties, Ref, RefObject, MutableRefObject,
  Dispatch, SetStateAction, Reducer, ChangeEvent, FormEvent,
  MouseEvent, KeyboardEvent, FocusEvent, PointerEvent, TouchEvent,
  DragEvent, SVGProps, InputHTMLAttributes, ButtonHTMLAttributes,
  AnchorHTMLAttributes, HTMLAttributes, HTMLProps, DetailedHTMLProps,
  PropsWithChildren, Attributes, Key, EffectCallback, DependencyList
} from 'react';