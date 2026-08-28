// src/core/label.ts

import { INSTANCE_SEP } from './constants';

export const stripInstance = (label: string): string => {
  const idx = label.indexOf(INSTANCE_SEP);
  return idx === -1 ? label : label.slice(0, idx);
};

export const parseLabel = (label: string) => {
  const base = stripInstance(label);
  const parts = base.split(' -> ');
  return { file: parts[0] || "Unknown", name: parts[1] || base };
};

export const isSameField = (labelA: string, labelB: string): boolean =>
  stripInstance(labelA) === stripInstance(labelB);