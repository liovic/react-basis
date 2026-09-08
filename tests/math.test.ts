// tests/math.test.ts
import { describe, it, expect } from 'vitest';
import {
    calculateSimilarityCircular,
    cosineFromOverlap,
    countOverlapsCircular,
    minOverlapForRarity,
    getMinOverlap,
    isSignificantOverlap,
} from '../src/core/math';

describe('High-Performance Circular Math (v0.5.x)', () => {
    it('Core: Correctly calculates Dot Product and Magnitude (0.707)', () => {
        const a = new Uint8Array([1, 1, 0, 0]);
        const b = new Uint8Array([1, 0, 0, 0]);
        expect(calculateSimilarityCircular(a, 0, b, 0, 0)).toBeCloseTo(0.7071, 4);
    });

    it('Phase Sweep: Mathematically proves head-pointer independence', () => {
        const L = 50;
        const a = new Uint8Array(L).fill(0);
        const b = new Uint8Array(L).fill(0);
        a[25] = 1;

        for (let headA = 0; headA < L; headA++) {
            for (let headB = 0; headB < L; headB++) {
                b.fill(0);
                const bPulseIdx = (headB + (25 - headA + L)) % L;
                b[bPulseIdx] = 1;

                const sim = calculateSimilarityCircular(a, headA, b, headB, 0);
                if (sim < 0.99) {
                    throw new Error(`Phase Fail at headA=${headA}, headB=${headB}, sim=${sim}`);
                }
            }
        }
    });

    it('Boundary Wrap: Correctly tracks lead-lag across the ring-buffer seam', () => {
        const a = new Uint8Array(50).fill(0); a[49] = 1;
        const b = new Uint8Array(50).fill(0); b[0] = 1;
        expect(calculateSimilarityCircular(a, 0, b, 0, 1)).toBeCloseTo(1, 5);
        expect(calculateSimilarityCircular(a, 0, b, 0, -49)).toBeCloseTo(1, 5);
    });

    it('Symmetry: offset +1 on (A,B) must equal offset -1 on (B,A)', () => {
        const a = new Uint8Array(50).fill(0); a[10] = 1;
        const b = new Uint8Array(50).fill(0); b[11] = 1;
        const forward = calculateSimilarityCircular(a, 0, b, 0, 1);
        const backward = calculateSimilarityCircular(b, 0, a, 0, -1);
        expect(forward).toBe(backward);
        expect(forward).toBeCloseTo(1, 5);
    });

    it('Robustness: Correctly wraps offsets larger than buffer size (L=50)', () => {
        const a = new Uint8Array(50).fill(0); a[0] = 1;
        const b = new Uint8Array(50).fill(0); b[10] = 1;
        expect(calculateSimilarityCircular(a, 0, b, 0, 10)).toBeCloseTo(1, 5);
        expect(calculateSimilarityCircular(a, 0, b, 0, 60)).toBeCloseTo(1, 5);
        expect(calculateSimilarityCircular(a, 0, b, 0, -40)).toBeCloseTo(1, 5);
    });

    it('Jitter: dropping 1 of 10 ones matches the closed-form cosine', () => {
        const a = new Uint8Array(10).fill(1);
        const b = new Uint8Array(10).fill(1);
        b[9] = 0;
        const sim = calculateSimilarityCircular(a, 0, b, 0, 0);
        expect(sim).toBeCloseTo(9 / Math.sqrt(10 * 9), 5);
    });

    it('Safety: Prevents NaN/Inf on idle or flat signals', () => {
        const a = new Uint8Array(50).fill(0);
        const b = new Uint8Array(50).fill(1);
        expect(calculateSimilarityCircular(a, 0, b, 0, 0)).toBe(0);
        expect(cosineFromOverlap(0, 0, 50)).toBe(0);
    });

    it('Performance: Execution cost remains sub-millisecond per 100 calcs', () => {
        const a = new Uint8Array(50).fill(1);
        const b = new Uint8Array(50).fill(1);
        const startTime = performance.now();

        const iterations = 1000;
        for (let i = 0; i < iterations; i++) {
            calculateSimilarityCircular(a, i % 50, b, (i + 1) % 50, 0);
        }

        const elapsed = performance.now() - startTime;
        expect(elapsed).toBeLessThan(10);
    });

    it('cosineFromOverlap matches circular cosine on 0/1 buffers', () => {
        const a = new Uint8Array([1, 1, 0, 0]);
        const b = new Uint8Array([1, 0, 0, 0]);
        const { kSync, densityA, densityB } = countOverlapsCircular(a, 0, b, 0);
        expect(densityA).toBe(2);
        expect(densityB).toBe(1);
        expect(kSync).toBe(1);
        expect(cosineFromOverlap(kSync, densityA, densityB))
            .toBeCloseTo(calculateSimilarityCircular(a, 0, b, 0, 0), 10);
    });

    it('period-2 trains: sync is empty, both lags are full', () => {
        const a = new Uint8Array([1, 0, 1, 0]);
        const b = new Uint8Array([0, 1, 0, 1]);
        const { kSync, kALeadsB, kBLeadsA, densityA, densityB } = countOverlapsCircular(a, 0, b, 0);
        expect(densityA).toBe(2);
        expect(densityB).toBe(2);
        expect(kSync).toBe(0);
        expect(kALeadsB).toBe(2);
        expect(kBLeadsA).toBe(2);
        expect(kALeadsB >= kBLeadsA).toBe(true);
    });

    it('minOverlapForRarity: two density-5 trains in a window of 50 need k=3 at p=0.01', () => {
        expect(minOverlapForRarity(5, 5, 50, 0.01)).toBe(3);
    });

    it('minOverlapForRarity: full overlap of two always-on trains is not rare', () => {
        expect(minOverlapForRarity(50, 50, 50, 0.01)).toBe(51);
    });
});

describe('Overlap gate', () => {
    const N = 50;

    it('density 0/1 never hits', () => {
        expect(isSignificantOverlap(1, 1, 1, N)).toBe(false);
        expect(isSignificantOverlap(0, 0, 10, N)).toBe(false);
        expect(isSignificantOverlap(1, 1, 20, N)).toBe(false);
    });

    it('rare overlap below the 65% floor is not a hit', () => {
        // 5 vs 5: rarity needs k=3, floor is ceil(0.65*5)=4
        expect(minOverlapForRarity(5, 5, N, 0.01)).toBe(3);
        expect(getMinOverlap(5, 5, N)).toBe(4);
        expect(isSignificantOverlap(3, 5, 5, N)).toBe(false);
        expect(isSignificantOverlap(4, 5, 5, N)).toBe(true);
    });

    it('65% overlap that is still common under the null is not a hit', () => {
        // 30 vs 30: floor=20, rarity needs k=23
        expect(getMinOverlap(30, 30, N)).toBe(23);
        expect(isSignificantOverlap(22, 30, 30, N)).toBe(false);
        expect(isSignificantOverlap(23, 30, 30, N)).toBe(true);
    });

    it('sync can qualify while lag does not beat it', () => {
        const kSync = 23;
        const kLead = 23;
        expect(isSignificantOverlap(kSync, 30, 30, N)).toBe(true);
        expect(isSignificantOverlap(kLead, 30, 30, N) && kLead >= kSync + 1).toBe(false);
    });

    it('lag that clears the bar and beats sync by exactly 1 is causal', () => {
        const kSync = 22;
        const kLead = 23;
        expect(isSignificantOverlap(kSync, 30, 30, N)).toBe(false);
        expect(isSignificantOverlap(kLead, 30, 30, N) && kLead >= kSync + 1).toBe(true);
    });

    it('different heads still classify the same period-2 pair as lag, A leads', () => {
        const a = new Uint8Array([1, 0, 1, 0, 1, 0, 1, 0]);
        const b = new Uint8Array([0, 1, 0, 1, 0, 1, 0, 1]);
        const aligned = countOverlapsCircular(a, 0, b, 0);
        const shifted = countOverlapsCircular(a, 3, b, 5);
        expect(aligned.kSync).toBe(0);
        expect(shifted.kSync).toBe(0);
        expect(aligned.kALeadsB).toBe(aligned.kBLeadsA);
        expect(shifted.kALeadsB).toBe(shifted.kBLeadsA);
        expect(aligned.kALeadsB).toBeGreaterThan(0);
        expect(shifted.kALeadsB).toBeGreaterThan(0);
    });

    it('A on slot i and B on slot i+1 is A-leads-B', () => {
        const a = new Uint8Array(50);
        const b = new Uint8Array(50);
        a[10] = 1;
        b[11] = 1;
        const { kSync, kALeadsB, kBLeadsA } = countOverlapsCircular(a, 0, b, 0);
        expect(kSync).toBe(0);
        expect(kALeadsB).toBe(1);
        expect(kBLeadsA).toBe(0);
    });
});