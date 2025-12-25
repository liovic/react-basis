// tests/math.test.ts

import { describe, it, expect } from 'vitest';
import { calculateCosineSimilarity } from '../src/core/math';

describe('calculateCosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    const a = [1, 0, 1];
    const b = [1, 0, 1];
    expect(calculateCosineSimilarity(a, b)).toBeCloseTo(1);
  });

  it('returns 0 for orthogonal vectors', () => {
    const a = [1, 0];
    const b = [0, 1];
    expect(calculateCosineSimilarity(a, b)).toBeCloseTo(0);
  });

  it('handles zero vectors gracefully', () => {
    const a = [0, 0, 0];
    const b = [0, 0, 0];
    expect(calculateCosineSimilarity(a, b)).toBe(0);
  });
});
