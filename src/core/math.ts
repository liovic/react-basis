// src/core/math.ts

import { PAIR_RARITY_TARGET, RELATIVE_OVERLAP_FLOOR } from './constants';

export const calculateSimilarityCircular = (
  bufferA: Uint8Array,
  headA: number,
  bufferB: Uint8Array,
  headB: number,
  offset: number
): number => {
  const L = bufferA.length;
  let dot = 0, magA = 0, magB = 0;

  const baseOffset = ((headB - headA + offset) % L + L) % L;

  for (let i = 0; i < L; i++) {
    const valA = bufferA[i];
    let iB = i + baseOffset;
    if (iB >= L) iB -= L;
    const valB = bufferB[iB];

    dot += valA * valB;
    magA += valA * valA;
    magB += valB * valB;
  }

  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
};

const choose = (n: number, k: number): number => {
  if (k < 0 || k > n) return 0;
  k = Math.min(k, n - k);
  let result = 1;
  for (let i = 0; i < k; i++) {
    result = (result * (n - i)) / (i + 1);
  }
  return result;
};

const hypergeomPMF = (k: number, n1: number, m1: number, N: number): number => {
  const total = choose(N, n1);
  if (total === 0) return 0;
  return (choose(m1, k) * choose(N - m1, n1 - k)) / total;
};

const hypergeomUpperTailP = (kStart: number, n1: number, m1: number, N: number): number => {
  const kMax = Math.min(n1, m1);
  let p = 0;
  for (let k = Math.max(0, kStart); k <= kMax; k++) {
    p += hypergeomPMF(k, n1, m1, N);
  }
  return p;
};

export const minOverlapForRarity = (
  n1: number, m1: number, N: number, targetP: number
): number => {
  const kMax = Math.min(n1, m1);
  for (let k = 0; k <= kMax; k++) {
    if (hypergeomUpperTailP(k, n1, m1, N) <= targetP) return k;
  }
  return kMax + 1;
};

const overlapThresholdCache = new Map<string, number>();

export const getMinOverlap = (
  densityA: number,
  densityB: number,
  windowSize: number
): number => {
  const lo = Math.min(densityA, densityB) | 0;
  const hi = Math.max(densityA, densityB) | 0;
  const key = `${lo}_${hi}_${windowSize}`;
  let cached = overlapThresholdCache.get(key);
  if (cached === undefined) {
    const rare = minOverlapForRarity(lo, hi, windowSize, PAIR_RARITY_TARGET);
    const floor = Math.ceil(RELATIVE_OVERLAP_FLOOR * lo);
    cached = Math.max(rare, floor);
    overlapThresholdCache.set(key, cached);
  }
  return cached;
};

export const isSignificantOverlap = (
  overlap: number,
  densityA: number,
  densityB: number,
  windowSize: number
): boolean => {
  if (densityA < 2 || densityB < 2) return false;
  return overlap >= getMinOverlap(densityA, densityB, windowSize);
};

export interface CircularOverlaps {
  kSync: number;
  kALeadsB: number;
  kBLeadsA: number;
  densityA: number;
  densityB: number;
}

export const countOverlapsCircular = (
  bufferA: Uint8Array,
  headA: number,
  bufferB: Uint8Array,
  headB: number
): CircularOverlaps => {
  const L = bufferA.length;

  const offSync = ((headB - headA) % L + L) % L;
  const offALeadsB = ((headB - headA + 1) % L + L) % L;
  const offBLeadsA = ((headB - headA - 1) % L + L) % L;

  let kSync = 0;
  let kALeadsB = 0;
  let kBLeadsA = 0;
  let densityA = 0;
  let densityB = 0;

  for (let i = 0; i < L; i++) {
    const a = bufferA[i] ? 1 : 0;
    const b = bufferB[i] ? 1 : 0;
    densityA += a;
    densityB += b;

    let iSync = i + offSync;
    if (iSync >= L) iSync -= L;
    let iALeadsB = i + offALeadsB;
    if (iALeadsB >= L) iALeadsB -= L;
    let iBLeadsA = i + offBLeadsA;
    if (iBLeadsA >= L) iBLeadsA -= L;

    if (a && bufferB[iSync]) kSync++;
    if (a && bufferB[iALeadsB]) kALeadsB++;
    if (a && bufferB[iBLeadsA]) kBLeadsA++;
  }

  return { kSync, kALeadsB, kBLeadsA, densityA, densityB };
};

export const cosineFromOverlap = (overlap: number, densityA: number, densityB: number): number => {
  if (densityA <= 0 || densityB <= 0) return 0;
  return overlap / Math.sqrt(densityA * densityB);
};